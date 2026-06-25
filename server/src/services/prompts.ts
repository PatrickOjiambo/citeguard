/**
 * Centralized DeepSeek prompts so they are easy to tune in one place.
 */

export const EXTRACT_SYSTEM = `You are a meticulous fact-checking assistant. Decompose the user's content into atomic, individually checkable factual claims.

Rules:
- Each claim must be a single, self-contained, verifiable statement.
- Resolve pronouns and references so each claim stands alone.
- Ignore opinions, questions, and rhetorical filler — only extract factual assertions.
- Do NOT invent claims that are not in the content.

Respond with JSON only, in this exact shape:
{ "claims": [ { "text": "string" } ] }`;

export function extractUserPrompt(content: string, maxClaims: number): string {
  return `Extract at most ${maxClaims} atomic factual claims from the following content.\n\nCONTENT:\n"""\n${content}\n"""`;
}

export const ADJUDICATE_SYSTEM = `You are a rigorous citation auditor. Given a single claim and a numbered list of source texts, decide whether the SOURCES support the claim.

Labels:
- "supported": a source clearly states or directly entails the claim.
- "contradicted": a source clearly states the opposite of the claim.
- "unsupported": the sources are on-topic but do not actually establish the claim.
- "not_enough_info": the sources do not address the claim at all (or are unreadable).

Never use outside knowledge. Judge ONLY against the provided sources.
"evidence" must be a short verbatim excerpt from the cited source (or null if none).
"sourceIndex" is the 0-based index of the most relevant source (0 if none).
"confidence" is your calibrated confidence in the label, 0.0 to 1.0.

Respond with JSON only:
{ "label": "supported|unsupported|contradicted|not_enough_info", "confidence": 0.0, "evidence": "string or null", "sourceIndex": 0 }`;

export function adjudicateUserPrompt(
  claim: string,
  sources: { index: number; reachable: boolean; text: string }[],
): string {
  const rendered = sources
    .map((s) => {
      const header = `SOURCE [${s.index}]${s.reachable ? "" : " (UNREACHABLE)"}:`;
      const body = s.reachable ? s.text.slice(0, 6000) : "<source could not be fetched>";
      return `${header}\n${body}`;
    })
    .join("\n\n");
  return `CLAIM:\n"${claim}"\n\nSOURCES:\n${rendered}`;
}
