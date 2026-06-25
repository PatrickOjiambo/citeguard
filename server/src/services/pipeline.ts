import type { VerdictClaim, VerifyInput } from "../schema/acceptance.js";
import type { TokenUsage } from "./deepseek.js";
import type { ExecutionStep } from "./proof.js";
import type { ResolvedSource } from "./sources.js";

import { dbReady } from "../db.js";
import { env } from "../env.js";
import { Verdict, VerificationJob } from "../models/index.js";
import {
  notEnoughInfoVerdict,
  SCHEMA_VERSION,

  VerdictOutput,

} from "../schema/acceptance.js";
import { adjudicateClaim, extractClaims } from "./deepseek.js";
import { buildProof, hashVerdict } from "./proof.js";
import { resolveSources } from "./sources.js";

/**
 * Pipeline orchestrator: normalize sources -> extract claims -> adjudicate each
 * claim -> score -> validate against the Zod acceptance schema -> persist ->
 * return a guaranteed schema-valid verdict.
 */

export type RunOptions = {
  source: "cap" | "public";
  capOrderId?: string;
  useReasoner?: boolean;
};

export type RunResult = {
  jobId: string | null;
  verdictId: string | null;
  verdict: VerdictOutput;
  proof: ReturnType<typeof buildProof>;
  latencyMs: number;
  executionLog: ExecutionStep[];
  tokenUsage: TokenUsage;
};

function now(): string {
  return new Date().toISOString();
}

function mergeUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return { prompt: a.prompt + b.prompt, completion: a.completion + b.completion, total: a.total + b.total };
}

/**
 * Trust score = confidence-weighted proportion of supported claims, expressed
 * on 0-100. Each claim contributes its confidence toward the numerator only
 * when supported (contradicted claims subtract, abstentions are neutral) and
 * toward the denominator for any decisive label. Empty / all-abstain -> 0.
 *
 *   numerator   = sum(confidence for supported) - sum(confidence for contradicted)
 *   denominator = sum(confidence for supported|unsupported|contradicted)
 *   trustScore  = clamp(round(100 * numerator / denominator), 0, 100)
 */
export function computeTrustScore(claims: VerdictClaim[]): number {
  let numerator = 0;
  let denominator = 0;
  for (const c of claims) {
    if (c.label === "supported") {
      numerator += c.confidence;
      denominator += c.confidence;
    }
    else if (c.label === "contradicted") {
      numerator -= c.confidence;
      denominator += c.confidence;
    }
    else if (c.label === "unsupported") {
      denominator += c.confidence;
    }
    // not_enough_info is neutral
  }
  if (denominator === 0)
    return 0;
  const score = Math.round((100 * numerator) / denominator);
  return Math.max(0, Math.min(100, score));
}

function summarize(claims: VerdictClaim[], trustScore: number): string {
  const supported = claims.filter(c => c.label === "supported").length;
  const issues = claims.filter(c => c.label === "unsupported" || c.label === "contradicted").length;
  return `Trust score ${trustScore}/100: ${supported}/${claims.length} claims supported by the cited sources, ${issues} unsupported or contradicted.`.slice(0, 280);
}

export async function runVerification(input: VerifyInput, opts: RunOptions): Promise<RunResult> {
  const start = Date.now();
  const executionLog: ExecutionStep[] = [];
  let usage: TokenUsage = { prompt: 0, completion: 0, total: 0 };
  const log = (step: string, detail?: unknown) => executionLog.push({ step, at: now(), detail });

  // Persist a job up front (when DB available) so it is auditable even on failure.
  type JobDoc = Awaited<ReturnType<typeof VerificationJob.create>>[number];
  let jobDoc: JobDoc | null = null;
  let resolvedForPersist: { type: string; value: string; reachable: boolean; resolvedText: string }[] = [];
  if (dbReady()) {
    jobDoc = await VerificationJob.create({
      source: opts.source,
      capOrderId: opts.capOrderId,
      inputContent: input.content,
      inputSources: input.sources.map(s => ({ type: s.type, value: s.value })),
      options: input.options,
      status: "running",
      executionLog: [],
    });
  }

  const finish = async (verdict: VerdictOutput): Promise<RunResult> => {
    const latencyMs = Date.now() - start;
    const proof = buildProof(verdict, executionLog);
    let verdictId: string | null = null;

    if (jobDoc) {
      const verdictDoc = await Verdict.create({
        jobId: jobDoc._id,
        trustScore: verdict.trustScore,
        claims: verdict.claims,
        flagged: verdict.flagged,
        summary: verdict.summary,
        schemaVersion: verdict.schemaVersion,
        resultHash: proof.resultHash,
      });
      verdictId = String(verdictDoc._id);
      jobDoc.status = "done";
      jobDoc.verdictId = verdictDoc._id;
      jobDoc.executionLog = executionLog as never;
      jobDoc.tokenUsage = usage;
      jobDoc.latencyMs = latencyMs;
      jobDoc.inputSources = resolvedForPersist as never;
      await jobDoc.save();
    }

    return {
      jobId: jobDoc ? String(jobDoc._id) : null,
      verdictId,
      verdict,
      proof,
      latencyMs,
      executionLog,
      tokenUsage: usage,
    };
  };

  try {
    // 1. Normalize sources
    log("normalize_sources", { count: input.sources.length });
    const resolved: ResolvedSource[] = await resolveSources(input.sources);
    resolvedForPersist = resolved.map(r => ({
      type: r.type,
      value: r.value,
      reachable: r.reachable,
      resolvedText: r.text.slice(0, 2000),
    }));
    const anyReachable = resolved.some(r => r.reachable && r.text.length > 0);
    if (!anyReachable) {
      log("no_reachable_sources");
      return finish(notEnoughInfoVerdict("None of the provided sources could be read, so no claim could be grounded."));
    }

    // 2. Extract claims
    const { claims: extracted, usage: extractUsage } = await extractClaims(input.content, env.MAX_CLAIMS);
    usage = mergeUsage(usage, extractUsage);
    log("extract_claims", { count: extracted.length });
    if (extracted.length === 0) {
      return finish(notEnoughInfoVerdict("No checkable factual claims were found in the content."));
    }

    // 3. Adjudicate each claim against the sources
    const sourcePayload = resolved.map(r => ({ index: r.index, reachable: r.reachable, text: r.text }));
    const adjudications = await Promise.all(
      extracted.map(c => adjudicateClaim(c.text, sourcePayload, { useReasoner: opts.useReasoner })),
    );
    const claims: VerdictClaim[] = extracted.map((c, i) => {
      const a = adjudications[i].result;
      usage = mergeUsage(usage, adjudications[i].usage);
      return {
        text: c.text,
        label: a.label,
        confidence: a.confidence,
        evidence: a.evidence,
        sourceIndex: a.sourceIndex,
      };
    });
    log("adjudicate_claims", { count: claims.length });

    // 4. Score + flag
    const trustScore = computeTrustScore(claims);
    const flagged = claims.filter(c => c.label !== "supported").map(c => c.text);

    // 5. Assemble + validate (repair to a valid shape, never throw)
    const candidate = {
      schemaVersion: SCHEMA_VERSION,
      trustScore,
      claims,
      flagged,
      summary: summarize(claims, trustScore),
    };
    const parsed = VerdictOutput.safeParse(candidate);
    const verdict = parsed.success
      ? parsed.data
      : notEnoughInfoVerdict("Internal validation failed; returning a safe verdict.", extracted);
    log("validate", { schemaValid: parsed.success });

    return finish(verdict);
  }
  catch (err) {
    log("error", { message: err instanceof Error ? err.message : String(err) });
    if (jobDoc) {
      jobDoc.status = "failed";
      jobDoc.error = err instanceof Error ? err.message : String(err);
      jobDoc.executionLog = executionLog as never;
      await jobDoc.save().catch(() => {});
    }
    // Even on unexpected failure, deliver a valid verdict.
    return finish(notEnoughInfoVerdict("Verification could not be completed; returning a safe verdict."));
  }
}

export { hashVerdict };
