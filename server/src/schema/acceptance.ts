import { z } from "zod/v4";

/**
 * The CAP acceptance schema — the public input/output contract for the
 * `output-citation-verification` capability. This Zod schema is the single
 * source of truth: both the CAP delivery and the public HTTP endpoint return
 * exactly the `VerdictOutput` shape, and it is validated before every delivery.
 */

export const SCHEMA_VERSION = "1.0";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export const SourceInput = z.object({
  type: z.enum(["url", "text"]),
  value: z.string().min(1),
});
export type SourceInput = z.infer<typeof SourceInput>;

export const VerifyInput = z.object({
  content: z.string().min(1).max(50000),
  sources: z.array(SourceInput).min(1).max(20),
  options: z
    .object({
      allowWebCrossCheck: z.boolean().default(false),
    })
    .default({ allowWebCrossCheck: false }),
});
export type VerifyInput = z.infer<typeof VerifyInput>;

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export const ClaimLabel = z.enum([
  "supported",
  "unsupported",
  "contradicted",
  "not_enough_info",
]);
export type ClaimLabel = z.infer<typeof ClaimLabel>;

export const VerdictClaim = z.object({
  text: z.string(),
  label: ClaimLabel,
  confidence: z.number().min(0).max(1),
  evidence: z.string().nullable(),
  sourceIndex: z.number().int().min(0),
});
export type VerdictClaim = z.infer<typeof VerdictClaim>;

export const VerdictOutput = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  trustScore: z.number().min(0).max(100),
  claims: z.array(VerdictClaim),
  flagged: z.array(z.string()),
  summary: z.string(),
});
export type VerdictOutput = z.infer<typeof VerdictOutput>;

/**
 * A guaranteed-valid fallback verdict. Used whenever grounding is impossible
 * (e.g. all source URLs are dead) so a delivery never fails the acceptance
 * schema and turns into a dispute.
 */
export function notEnoughInfoVerdict(
  reason: string,
  claims: { text: string }[] = [],
): VerdictOutput {
  return {
    schemaVersion: SCHEMA_VERSION,
    trustScore: 0,
    claims: claims.map(c => ({
      text: c.text,
      label: "not_enough_info" as const,
      confidence: 0,
      evidence: null,
      sourceIndex: 0,
    })),
    flagged: claims.map(c => c.text),
    summary: reason.slice(0, 280),
  };
}
