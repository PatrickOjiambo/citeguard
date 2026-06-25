import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VerdictClaim } from "../src/schema/acceptance.js";

import { VerdictOutput } from "../src/schema/acceptance.js";
import { computeTrustScore, runVerification } from "../src/services/pipeline.js";

// Mock DeepSeek so the pipeline runs offline and deterministically.
vi.mock("../src/services/deepseek.js", () => ({
  extractClaims: vi.fn(async () => ({
    claims: [{ text: "The sky is blue." }, { text: "The moon is made of cheese." }],
    usage: { prompt: 0, completion: 0, total: 0 },
  })),
  adjudicateClaim: vi.fn(async (claim: string) => ({
    result: claim.includes("sky")
      ? { label: "supported", confidence: 0.9, evidence: "the sky is blue", sourceIndex: 0 }
      : { label: "unsupported", confidence: 0.8, evidence: null, sourceIndex: 0 },
    usage: { prompt: 0, completion: 0, total: 0 },
  })),
}));

describe("computeTrustScore", () => {
  it("is 0 for an empty / all-abstain set", () => {
    expect(computeTrustScore([])).toBe(0);
    expect(computeTrustScore([
      { text: "x", label: "not_enough_info", confidence: 1, evidence: null, sourceIndex: 0 },
    ] as VerdictClaim[])).toBe(0);
  });

  it("weights supported claims by confidence", () => {
    const claims: VerdictClaim[] = [
      { text: "a", label: "supported", confidence: 1, evidence: null, sourceIndex: 0 },
      { text: "b", label: "unsupported", confidence: 1, evidence: null, sourceIndex: 0 },
    ];
    expect(computeTrustScore(claims)).toBe(50);
  });
});

describe("runVerification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns schema-valid output with text sources", async () => {
    const result = await runVerification(
      {
        content: "The sky is blue. The moon is made of cheese.",
        sources: [{ type: "text", value: "Observations confirm the sky is blue during the day." }],
        options: { allowWebCrossCheck: false },
      },
      { source: "public" },
    );
    expect(VerdictOutput.safeParse(result.verdict).success).toBe(true);
    expect(result.verdict.claims).toHaveLength(2);
    expect(result.verdict.flagged).toContain("The moon is made of cheese.");
    expect(result.proof.resultHash).toMatch(/^sha256:/);
  });

  it("returns a valid not_enough_info verdict when all URL sources are unreachable", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 500 }),
    );
    const result = await runVerification(
      {
        content: "Some content with claims.",
        sources: [{ type: "url", value: "https://example.invalid/dead" }],
        options: { allowWebCrossCheck: false },
      },
      { source: "public" },
    );
    fetchSpy.mockRestore();

    const parsed = VerdictOutput.safeParse(result.verdict);
    expect(parsed.success).toBe(true);
    expect(result.verdict.trustScore).toBe(0);
    expect(result.verdict.summary.toLowerCase()).toContain("source");
  });
});
