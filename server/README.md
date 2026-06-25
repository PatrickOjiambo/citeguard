# CiteGuard — Backend

A paid, callable **output & citation verification** agent for the [CROO](https://croo.network)
agent economy. Given a piece of content and the sources it cites, CiteGuard returns a
structured verdict: which claims are supported, unsupported, or contradicted, an overall
trust score (0–100), and a flagged list. It is callable over CAP (settling in USDC on Base)
and over a plain HTTP API.

Reasoning engine: **DeepSeek**. Stack: **Node.js + TypeScript (strict) + Express v5 + Mongoose/MongoDB + Zod**.

## Quick start

```bash
cd server
pnpm install
cp .env.example .env          # fill in DEEPSEEK_API_KEY (+ Mongo if not on localhost)
pnpm dev                      # http://localhost:8080
```

Other scripts: `pnpm build`, `pnpm start`, `pnpm test`, `pnpm typecheck`, `pnpm lint`.

You need a running MongoDB (`MONGODB_URI`, defaults to `mongodb://127.0.0.1:27017/citeguard`)
and a DeepSeek API key. The HTTP API runs standalone; the CAP listener only starts when
`CAP_ENABLED=true`.

## The acceptance schema (input/output contract)

Single source of truth: the Zod schemas in [`src/schema/acceptance.ts`](src/schema/acceptance.ts).
Both the CAP delivery and `POST /api/verify` return exactly the output shape, validated
before every delivery. Fetch it live as JSON Schema at `GET /api/schema`.

**Input**
```json
{
  "content": "string",
  "sources": [{ "type": "url" | "text", "value": "string" }],
  "options": { "allowWebCrossCheck": false }
}
```

**Output**
```json
{
  "schemaVersion": "1.0",
  "trustScore": 0,
  "claims": [
    { "text": "string", "label": "supported|unsupported|contradicted|not_enough_info",
      "confidence": 0.0, "evidence": "string|null", "sourceIndex": 0 }
  ],
  "flagged": ["string"],
  "summary": "string"
}
```

**Trust score** = confidence-weighted proportion of supported claims, on 0–100. Supported
claims add their confidence to both numerator and denominator; contradicted subtract from the
numerator (add to denominator); unsupported add only to the denominator; `not_enough_info` is
neutral. Empty / all-abstain → `0`. See `computeTrustScore` in
[`src/services/pipeline.ts`](src/services/pipeline.ts).

## REST API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/verify` | Run a public verification (rate-limited 10/min). Returns `verdict`, `verdictId`, `jobId`, `proof`. |
| `GET`  | `/api/verdicts/:id` | Stored verdict for the report page. |
| `GET`  | `/api/jobs/:id` | Job detail incl. execution log (audit/debug). |
| `GET`  | `/api/orders` | Recent CAP orders (status, buyer, counterparty, earnings). |
| `GET`  | `/api/metrics` | uniqueCounterparties, uniqueBuyers, selfTradeRatio, totalCleared, totalEarnedUsdc, currentPts + eligibility flags. |
| `GET`  | `/api/schema` | Acceptance schema as JSON Schema. |
| `GET`  | `/health` / `/ready` | Liveness / readiness (DB connected). |

## Verification pipeline

`runVerification(input)` ([`src/services/pipeline.ts`](src/services/pipeline.ts)):

1. **Normalize sources** — fetch URL sources (`sources.ts`, cached by URL hash with TTL);
   unreachable sources are kept and marked.
2. **Extract claims** — DeepSeek decomposes content into atomic claims (capped at `MAX_CLAIMS`).
3. **Adjudicate** — per claim, DeepSeek labels it against the source texts.
4. **Score** — compute `trustScore`, build `flagged[]`.
5. **Validate** — parse through the output Zod schema; on any mismatch repair to a valid shape.
6. **Persist** — write `VerificationJob` + `Verdict` with an execution log.

Output is **always** schema-valid. If no source is readable or grounding is impossible it
returns a valid `not_enough_info` verdict rather than throwing (`notEnoughInfoVerdict`).
DeepSeek calls force JSON, retry once on parse failure, then fall back to a safe default
(`src/services/deepseek.ts`); prompts live in `src/services/prompts.ts`.

## CAP integration — real SDK methods used

Verified against `@croo-network/sdk` **v0.2.1** source + `docs.croo.network`. **The brief's
method names were placeholders; these are the real calls** (see `// CAP-SDK:` notes in code):

- **Registration is NOT in the SDK.** Agent creation, AA-wallet deployment, the SDK-Key, and
  **service/capability registration** (name `output-citation-verification`, price, SLA, the
  acceptance schema) are configured in the **CROO Dashboard**. This backend only listens and
  delivers.
- **Init:** `new AgentClient({ baseURL, wsURL, rpcURL }, sdkKey)`. Auth via `X-SDK-Key`.
- **Listen:** `client.connectWebSocket()` → `EventStream`; subscribe with `stream.on(EventType.*)`.
- **Provider flow** ([`src/services/cap.ts`](src/services/cap.ts)):
  `NegotiationCreated` → validate `negotiation.requirements` against the input schema →
  `acceptNegotiation(id)` (creates the on-chain order) → `OrderPaid` →
  `runVerification` → `deliverOrder(orderId, { deliverableType: Schema, deliverableText })`
  with `{ result, proof }` → `OrderCompleted` (= cleared, record earned USDC).
- **Proof:** `proof.ts` builds a deterministic `sha256` hash of the verdict JSON plus a compact
  execution log and attestation, embedded in the delivery payload.
- **Idempotency:** every step is keyed on `capOrderId` (DB upserts + a `delivered` flag + an
  in-flight guard) so an order is never processed or delivered twice.

> The job input arrives as the negotiation `requirements` JSON string. Buyer wallet =
> `order.requesterWalletAddress`; counterparty = `order.requesterAgentId`.

## Data models

Mongoose collections in [`src/models/index.ts`](src/models/index.ts): `Order`,
`VerificationJob`, `Verdict`, `SourceCache`, `Counterparty`, `BuyerWallet`, `MetricsSnapshot`.

## Testing

```bash
pnpm test
```

`test/pipeline.test.ts` mocks DeepSeek and asserts schema-valid output end-to-end, the trust-score
formula, and the `not_enough_info` path when all source URLs are unreachable. `test/app.test.ts`
covers the HTTP surface.

## License

MIT — see [LICENSE](LICENSE).
