import mongoose, { Schema } from "mongoose";

/**
 * Mongoose models for CiteGuard. Collections: orders, jobs, verdicts,
 * source cache, counterparties, buyer wallets, metrics snapshots.
 */

// ---------------------------------------------------------------------------
// VerificationJob
// ---------------------------------------------------------------------------

const ExecutionStepSchema = new Schema(
  {
    step: { type: String, required: true },
    at: { type: Date, default: Date.now },
    detail: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const JobSourceSchema = new Schema(
  {
    type: { type: String, enum: ["url", "text"], required: true },
    value: { type: String, required: true },
    reachable: { type: Boolean, default: true },
    resolvedText: { type: String, default: "" },
  },
  { _id: false },
);

const VerificationJobSchema = new Schema(
  {
    source: { type: String, enum: ["cap", "public"], required: true },
    capOrderId: { type: String, index: true },
    inputContent: { type: String, required: true },
    inputSources: { type: [JobSourceSchema], default: [] },
    options: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "running", "done", "failed"],
      default: "pending",
      index: true,
    },
    verdictId: { type: Schema.Types.ObjectId, ref: "Verdict" },
    executionLog: { type: [ExecutionStepSchema], default: [] },
    tokenUsage: { type: Schema.Types.Mixed, default: {} },
    latencyMs: { type: Number },
    error: { type: String },
  },
  { timestamps: true },
);

export const VerificationJob = mongoose.model("VerificationJob", VerificationJobSchema);

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

const VerdictClaimSchema = new Schema(
  {
    text: { type: String, required: true },
    label: {
      type: String,
      enum: ["supported", "unsupported", "contradicted", "not_enough_info"],
      required: true,
    },
    confidence: { type: Number, required: true },
    evidence: { type: String, default: null },
    sourceIndex: { type: Number, default: 0 },
  },
  { _id: false },
);

const VerdictSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "VerificationJob", index: true },
    trustScore: { type: Number, required: true },
    claims: { type: [VerdictClaimSchema], default: [] },
    flagged: { type: [String], default: [] },
    summary: { type: String, default: "" },
    schemaVersion: { type: String, required: true },
    resultHash: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export const Verdict = mongoose.model("Verdict", VerdictSchema);

// ---------------------------------------------------------------------------
// Order (CAP)
// ---------------------------------------------------------------------------

const OrderSchema = new Schema(
  {
    capOrderId: { type: String, required: true, unique: true },
    negotiationId: { type: String, index: true },
    buyerWallet: { type: String, index: true },
    counterpartyAgentId: { type: String, index: true },
    status: {
      type: String,
      enum: ["locked", "delivering", "cleared", "disputed", "rejected", "expired"],
      default: "locked",
      index: true,
    },
    priceUsdc: { type: Number },
    paymentToken: { type: String },
    jobId: { type: Schema.Types.ObjectId, ref: "VerificationJob" },
    proofRef: { type: String },
    deliveryId: { type: String },
    earnedUsdc: { type: Number, default: 0 },
    delivered: { type: Boolean, default: false },
    selfTrade: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", OrderSchema);

// ---------------------------------------------------------------------------
// SourceCache
// ---------------------------------------------------------------------------

const SourceCacheSchema = new Schema(
  {
    urlHash: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    fetchedText: { type: String, default: "" },
    reachable: { type: Boolean, default: true },
    fetchedAt: { type: Date, default: Date.now },
    ttl: { type: Number, default: 86400000 },
  },
  { timestamps: true },
);

export const SourceCache = mongoose.model("SourceCache", SourceCacheSchema);

// ---------------------------------------------------------------------------
// Counterparty & BuyerWallet (diversity tracking)
// ---------------------------------------------------------------------------

const CounterpartySchema = new Schema(
  {
    agentId: { type: String, required: true, unique: true },
    firstSeen: { type: Date, default: Date.now },
    orderCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Counterparty = mongoose.model("Counterparty", CounterpartySchema);

const BuyerWalletSchema = new Schema(
  {
    wallet: { type: String, required: true, unique: true },
    firstSeen: { type: Date, default: Date.now },
    orderCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const BuyerWallet = mongoose.model("BuyerWallet", BuyerWalletSchema);

// ---------------------------------------------------------------------------
// MetricsSnapshot
// ---------------------------------------------------------------------------

const MetricsSnapshotSchema = new Schema(
  {
    uniqueCounterparties: { type: Number, default: 0 },
    uniqueBuyers: { type: Number, default: 0 },
    selfTradeRatio: { type: Number, default: 0 },
    totalCleared: { type: Number, default: 0 },
    totalEarnedUsdc: { type: Number, default: 0 },
    currentPts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const MetricsSnapshot = mongoose.model("MetricsSnapshot", MetricsSnapshotSchema);
