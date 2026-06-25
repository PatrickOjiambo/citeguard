import type { Event, EventStream } from "@croo-network/sdk";

import {
  AgentClient,
  DeliverableType,

  EventType,
} from "@croo-network/sdk";

import { env } from "../env.js";
import { Order } from "../models/index.js";
import { VerdictOutput, VerifyInput } from "../schema/acceptance.js";
import { isSelfTrade, recordCounterparties } from "./metrics.js";
import { runVerification } from "./pipeline.js";

/**
 * CAP integration via @croo-network/sdk v0.2.1.
 *
 * IMPORTANT (verified against the SDK source + docs.croo.network):
 *   - Agent creation, wallet deployment, AND service/capability registration
 *     are done in the CROO Dashboard, NOT in the SDK. The published capability
 *     `output-citation-verification` (price, SLA, acceptance schema) is
 *     configured there; this code only listens for orders and delivers.
 *   - The provider flow is: connectWebSocket -> NegotiationCreated ->
 *     acceptNegotiation -> OrderPaid -> deliverOrder -> OrderCompleted.
 *   - The job input arrives as the negotiation `requirements` JSON string.
 *
 * All steps are idempotent keyed on capOrderId so an order is never processed
 * or delivered twice.
 */

let client: AgentClient | null = null;
let stream: EventStream | null = null;

// In-flight guard so concurrent events for the same order don't double-run.
const inFlight = new Set<string>();

function getClient(): AgentClient {
  if (!client) {
    client = new AgentClient(
      { baseURL: env.CROO_API_URL, wsURL: env.CROO_WS_URL, rpcURL: env.BASE_RPC_URL },
      env.CROO_SDK_KEY,
    );
  }
  return client;
}

function priceToUsdc(price?: string): number {
  // USDC has 6 decimals; the SDK returns base-unit decimal strings.
  if (!price)
    return env.CAPABILITY_PRICE_USDC;
  const n = Number(price);
  if (!Number.isFinite(n))
    return env.CAPABILITY_PRICE_USDC;
  return n > 1000 ? n / 1e6 : n;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/** New negotiation: parse + validate the requested input, then accept (creates the on-chain order). */
async function onNegotiationCreated(e: Event): Promise<void> {
  const negotiationId = e.negotiation_id;
  if (!negotiationId)
    return;
  const c = getClient();
  try {
    const negotiation = await c.getNegotiation(negotiationId);
    // Validate the requested input against the acceptance schema before accepting.
    const parsed = VerifyInput.safeParse(safeJson(negotiation.requirements));
    if (!parsed.success) {
      await c.rejectNegotiation(negotiationId, "requirements do not match the citation-verification acceptance schema");
      return;
    }
    const result = await c.acceptNegotiation(negotiationId);
    const order = result.order;
    const buyerWallet = order.requesterWalletAddress?.toLowerCase();

    // Idempotent upsert of the Order, keyed on capOrderId.
    await Order.updateOne(
      { capOrderId: order.orderId },
      {
        $setOnInsert: {
          capOrderId: order.orderId,
          negotiationId,
          buyerWallet,
          counterpartyAgentId: order.requesterAgentId,
          status: "locked",
          priceUsdc: priceToUsdc(order.price),
          paymentToken: order.paymentToken,
          selfTrade: isSelfTrade(buyerWallet),
        },
      },
      { upsert: true },
    );
    await recordCounterparties(order.requesterAgentId, buyerWallet);
  }
  catch (err) {
    log("error", "onNegotiationCreated", negotiationId, err);
  }
}

/** Order paid: run the verification, build proof, deliver. Idempotent per order. */
async function onOrderPaid(e: Event): Promise<void> {
  const orderId = e.order_id;
  if (!orderId || inFlight.has(orderId))
    return;
  inFlight.add(orderId);
  try {
    const existing = await Order.findOne({ capOrderId: orderId });
    if (existing?.delivered) {
      return; // already delivered — never deliver twice
    }

    const c = getClient();
    const order = existing ?? (await Order.create({
      capOrderId: orderId,
      status: "locked",
    }));

    // Recover the input from the negotiation.
    const negotiationId = order.negotiationId ?? (await c.getOrder(orderId)).negotiationId;
    const negotiation = await c.getNegotiation(negotiationId);
    const parsed = VerifyInput.safeParse(safeJson(negotiation.requirements));
    if (!parsed.success) {
      await c.rejectOrder(orderId, "requirements do not match the acceptance schema");
      order.status = "rejected";
      await order.save();
      return;
    }

    order.status = "delivering";
    await order.save();

    const result = await runVerification(parsed.data, { source: "cap", capOrderId: orderId });

    // Output is guaranteed schema-valid, but assert once more before delivery.
    const valid = VerdictOutput.safeParse(result.verdict);
    const deliverable = valid.success ? valid.data : result.verdict;

    const delivery = await c.deliverOrder(orderId, {
      deliverableType: DeliverableType.Schema,
      deliverableText: JSON.stringify({ result: deliverable, proof: result.proof }),
    });

    order.jobId = result.jobId ? (result.jobId as unknown as typeof order.jobId) : order.jobId;
    order.proofRef = result.proof.resultHash;
    order.deliveryId = delivery.delivery?.deliveryId;
    order.delivered = true;
    await order.save();
  }
  catch (err) {
    log("error", "onOrderPaid", orderId, err);
  }
  finally {
    inFlight.delete(orderId);
  }
}

async function onOrderCompleted(e: Event): Promise<void> {
  const orderId = e.order_id;
  if (!orderId)
    return;
  const order = await Order.findOne({ capOrderId: orderId });
  if (!order || order.status === "cleared")
    return;
  order.status = "cleared";
  order.earnedUsdc = order.priceUsdc ?? env.CAPABILITY_PRICE_USDC;
  await order.save();
  log("info", "order cleared", orderId);
}

async function onOrderFailed(status: "rejected" | "expired", e: Event): Promise<void> {
  const orderId = e.order_id;
  if (!orderId)
    return;
  await Order.updateOne(
    { capOrderId: orderId },
    { status: status === "rejected" ? "disputed" : "expired" },
  );
  log("warn", `order ${status}`, orderId, e.reason);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function startCapListener(): Promise<void> {
  if (!env.CROO_SDK_KEY) {
    log("warn", "CAP_ENABLED but CROO_SDK_KEY is empty; not starting listener");
    return;
  }
  const c = getClient();
  stream = await c.connectWebSocket();
  stream.on(EventType.NegotiationCreated, e => void onNegotiationCreated(e));
  stream.on(EventType.OrderPaid, e => void onOrderPaid(e));
  stream.on(EventType.OrderCompleted, e => void onOrderCompleted(e));
  stream.on(EventType.OrderRejected, e => void onOrderFailed("rejected", e));
  stream.on(EventType.OrderExpired, e => void onOrderFailed("expired", e));
  log("info", "CAP listener connected", env.CROO_WS_URL);
}

export function stopCapListener(): void {
  stream?.close();
  stream = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeJson(raw?: string): unknown {
  if (!raw)
    return undefined;
  try {
    return JSON.parse(raw);
  }
  catch {
    return undefined;
  }
}

/* eslint-disable no-console */
function log(level: "info" | "warn" | "error", ...args: unknown[]): void {
  console[level]("[cap]", ...args);
}
/* eslint-enable no-console */
