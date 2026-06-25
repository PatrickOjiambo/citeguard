import OpenAI from "openai";
import { z } from "zod/v4";

import { env } from "../env.js";
import { ClaimLabel } from "../schema/acceptance.js";
import {
  ADJUDICATE_SYSTEM,
  adjudicateUserPrompt,
  EXTRACT_SYSTEM,
  extractUserPrompt,
} from "./prompts.js";

/**
 * DeepSeek reasoning service. Uses the OpenAI-compatible client pointed at the
 * DeepSeek API. Forces JSON output, validates with Zod, retries once on parse
 * failure, then falls back to a safe default. Token usage is reported back to
 * the caller for cost tracking.
 */

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      // Allow an empty key at import time; calls fail clearly only when actually invoked.
      apiKey: env.DEEPSEEK_API_KEY || "missing-deepseek-api-key",
      baseURL: env.DEEPSEEK_BASE_URL,
    });
  }
  return _client;
}

export type TokenUsage = { prompt: number; completion: number; total: number };

function emptyUsage(): TokenUsage {
  return { prompt: 0, completion: 0, total: 0 };
}

function addUsage(a: TokenUsage, u?: OpenAI.CompletionUsage | null): TokenUsage {
  if (!u)
    return a;
  return {
    prompt: a.prompt + (u.prompt_tokens ?? 0),
    completion: a.completion + (u.completion_tokens ?? 0),
    total: a.total + (u.total_tokens ?? 0),
  };
}

async function jsonCompletion(
  system: string,
  user: string,
  opts: { model?: string; stricterRetry?: boolean } = {},
): Promise<{ raw: string; usage: TokenUsage }> {
  const model = opts.model ?? env.DEEPSEEK_MODEL;
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  if (opts.stricterRetry) {
    messages.push({
      role: "system",
      content: "Your previous reply was not valid JSON. Reply with ONLY the JSON object, no prose, no markdown fences.",
    });
  }
  const res = await client().chat.completions.create({
    model,
    messages,
    temperature: 0,
    response_format: { type: "json_object" },
  });
  return {
    raw: res.choices[0]?.message?.content ?? "",
    usage: addUsage(emptyUsage(), res.usage),
  };
}

function parseJson(raw: string): unknown {
  // Tolerate accidental markdown fences.
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// Claim extraction
// ---------------------------------------------------------------------------

const ExtractResult = z.object({
  claims: z.array(z.object({ text: z.string().min(1) })),
});

export async function extractClaims(
  content: string,
  maxClaims: number,
): Promise<{ claims: { text: string }[]; usage: TokenUsage }> {
  const user = extractUserPrompt(content, maxClaims);
  let usage = emptyUsage();

  for (let attempt = 0; attempt < 2; attempt++) {
    const { raw, usage: u } = await jsonCompletion(EXTRACT_SYSTEM, user, {
      stricterRetry: attempt > 0,
    });
    usage = addUsage(usage, { total_tokens: u.total, prompt_tokens: u.prompt, completion_tokens: u.completion });
    try {
      const parsed = ExtractResult.parse(parseJson(raw));
      return { claims: parsed.claims.slice(0, maxClaims), usage };
    }
    catch {
      // retry once, then fall through
    }
  }
  // Safe fallback: treat the whole content as a single claim.
  return { claims: [{ text: content.slice(0, 500) }], usage };
}

// ---------------------------------------------------------------------------
// Adjudication
// ---------------------------------------------------------------------------

const AdjudicateResult = z.object({
  label: ClaimLabel,
  confidence: z.number().min(0).max(1),
  evidence: z.string().nullable().catch(null),
  sourceIndex: z.number().int().min(0).catch(0),
});
export type Adjudication = z.infer<typeof AdjudicateResult>;

export async function adjudicateClaim(
  claim: string,
  sources: { index: number; reachable: boolean; text: string }[],
  opts: { useReasoner?: boolean } = {},
): Promise<{ result: Adjudication; usage: TokenUsage }> {
  const user = adjudicateUserPrompt(claim, sources);
  const model = opts.useReasoner ? env.DEEPSEEK_REASONER_MODEL : env.DEEPSEEK_MODEL;
  let usage = emptyUsage();

  for (let attempt = 0; attempt < 2; attempt++) {
    const { raw, usage: u } = await jsonCompletion(ADJUDICATE_SYSTEM, user, {
      model,
      stricterRetry: attempt > 0,
    });
    usage = addUsage(usage, { total_tokens: u.total, prompt_tokens: u.prompt, completion_tokens: u.completion });
    try {
      const result = AdjudicateResult.parse(parseJson(raw));
      const maxIndex = Math.max(0, sources.length - 1);
      result.sourceIndex = Math.min(result.sourceIndex, maxIndex);
      return { result, usage };
    }
    catch {
      // retry once
    }
  }
  // Safe default: abstain rather than fabricate support.
  return {
    result: { label: "not_enough_info", confidence: 0, evidence: null, sourceIndex: 0 },
    usage,
  };
}
