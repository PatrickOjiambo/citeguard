import { ownWallets } from "../env.js";
import { BuyerWallet, Counterparty, Order } from "../models/index.js";

/**
 * Counterparty / buyer diversity + self-trade tracking. Backs the hackathon
 * reward-eligibility flags (>=3 unique counterparties, >=5 unique buyers).
 */

export function isSelfTrade(buyerWallet?: string): boolean {
  if (!buyerWallet)
    return false;
  return ownWallets.has(buyerWallet.toLowerCase());
}

/** Record a buyer + counterparty when a new CAP order is seen. Idempotent-safe. */
export async function recordCounterparties(
  counterpartyAgentId?: string,
  buyerWallet?: string,
): Promise<void> {
  if (counterpartyAgentId) {
    await Counterparty.updateOne(
      { agentId: counterpartyAgentId },
      { $setOnInsert: { firstSeen: new Date() }, $inc: { orderCount: 1 } },
      { upsert: true },
    );
  }
  if (buyerWallet) {
    await BuyerWallet.updateOne(
      { wallet: buyerWallet.toLowerCase() },
      { $setOnInsert: { firstSeen: new Date() }, $inc: { orderCount: 1 } },
      { upsert: true },
    );
  }
}

export type Metrics = {
  uniqueCounterparties: number;
  uniqueBuyers: number;
  selfTradeRatio: number;
  totalCleared: number;
  totalEarnedUsdc: number;
  currentPts: number;
  eligibility: { counterpartiesMet: boolean; buyersMet: boolean };
};

export async function computeMetrics(): Promise<Metrics> {
  const [uniqueCounterparties, uniqueBuyers, clearedOrders, selfTradeCount, totalOrders] = await Promise.all([
    Counterparty.countDocuments(),
    BuyerWallet.countDocuments(),
    Order.find({ status: "cleared" }).select("earnedUsdc").lean(),
    Order.countDocuments({ selfTrade: true }),
    Order.countDocuments(),
  ]);

  const totalCleared = clearedOrders.length;
  const totalEarnedUsdc = clearedOrders.reduce((sum, o) => sum + (o.earnedUsdc ?? 0), 0);
  const selfTradeRatio = totalOrders > 0 ? selfTradeCount / totalOrders : 0;

  // PTS surfaced from the SDK when available; approximated by cleared count here.
  // CAP-SDK: no PTS getter is exposed in @croo-network/sdk v0.2.1.
  const currentPts = totalCleared;

  return {
    uniqueCounterparties,
    uniqueBuyers,
    selfTradeRatio,
    totalCleared,
    totalEarnedUsdc,
    currentPts,
    eligibility: {
      counterpartiesMet: uniqueCounterparties >= 3,
      buyersMet: uniqueBuyers >= 5,
    },
  };
}
