// Shared types mirroring the CiteGuard backend acceptance schema + dashboard API.

export type ClaimLabel =
  | "supported"
  | "unsupported"
  | "contradicted"
  | "not_enough_info";

export type SourceType = "url" | "text";

export interface SourceInput {
  type: SourceType;
  value: string;
}

export interface VerifyInput {
  content: string;
  sources: SourceInput[];
  options: { allowWebCrossCheck: boolean };
}

export interface VerdictClaim {
  text: string;
  label: ClaimLabel;
  confidence: number;
  evidence: string | null;
  sourceIndex: number;
}

export interface Verdict {
  schemaVersion: string;
  trustScore: number;
  claims: VerdictClaim[];
  flagged: string[];
  summary: string;
}

export interface VerifyResponse {
  verdictId: string | null;
  jobId: string | null;
  verdict: Verdict;
  proof?: { resultHash: string };
  latencyMs?: number;
}

// Stored verdict document (from GET /api/verdicts/:id).
export interface StoredVerdict extends Verdict {
  _id: string;
  jobId?: string;
  resultHash?: string;
  createdAt?: string;
}

export interface Order {
  capOrderId: string;
  buyerWallet?: string;
  counterpartyAgentId?: string;
  status: "locked" | "delivering" | "cleared" | "disputed" | "rejected" | "expired";
  priceUsdc?: number;
  earnedUsdc?: number;
  selfTrade?: boolean;
  jobId?: string;
  proofRef?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Metrics {
  uniqueCounterparties: number;
  uniqueBuyers: number;
  selfTradeRatio: number;
  totalCleared: number;
  totalEarnedUsdc: number;
  currentPts: number;
  eligibility?: { counterpartiesMet: boolean; buyersMet: boolean };
}
