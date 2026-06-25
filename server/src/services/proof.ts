import { createHash } from "node:crypto";

import type { VerdictOutput } from "../schema/acceptance.js";

/**
 * Proof builder. Produces a deterministic hash of the verdict JSON plus a
 * compact execution log, used as the CAP delivery proof / attestation.
 */

export type ExecutionStep = { step: string; at: string; detail?: unknown };

/** Stable stringify (sorted keys) so the hash is deterministic. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function hashVerdict(verdict: VerdictOutput): string {
  return `sha256:${createHash("sha256").update(stableStringify(verdict)).digest("hex")}`;
}

export type Proof = {
  resultHash: string;
  schemaVersion: string;
  executionLog: ExecutionStep[];
  attestation: string;
};

export function buildProof(verdict: VerdictOutput, executionLog: ExecutionStep[]): Proof {
  const resultHash = hashVerdict(verdict);
  return {
    resultHash,
    schemaVersion: verdict.schemaVersion,
    // Keep the log compact for on-chain/delivery payloads.
    executionLog: executionLog.map(s => ({ step: s.step, at: s.at })),
    attestation: createHash("sha256")
      .update(`${resultHash}|${executionLog.length}|${verdict.schemaVersion}`)
      .digest("hex"),
  };
}
