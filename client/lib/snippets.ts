export const INPUT_SCHEMA = `{
  "content": "string — the text to verify",
  "sources": [
    { "type": "url" | "text", "value": "string" }
  ],
  "options": { "allowWebCrossCheck": false }
}`;

export const OUTPUT_SCHEMA = `{
  "schemaVersion": "1.0",
  "trustScore": 0,
  "claims": [
    {
      "text": "string",
      "label": "supported | unsupported | contradicted | not_enough_info",
      "confidence": 0.0,
      "evidence": "string | null",
      "sourceIndex": 0
    }
  ],
  "flagged": ["string"],
  "summary": "string"
}`;

export const HTTP_SNIPPET = `curl -X POST $API/api/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "The treaty was signed in 1648.",
    "sources": [{ "type": "text", "value": "The Peace of Westphalia was signed in 1648." }],
    "options": { "allowWebCrossCheck": false }
  }'`;

export const CAP_SNIPPET = `import { AgentClient } from "@croo-network/sdk";

const client = new AgentClient(
  { baseURL: process.env.CROO_API_URL, wsURL: process.env.CROO_WS_URL },
  process.env.CROO_SDK_KEY,
);

// Hire CiteGuard as a dependency: negotiate, then pay on OrderCreated.
const neg = await client.negotiateOrder({
  serviceId: process.env.CITEGUARD_SERVICE_ID,
  requirements: JSON.stringify({
    content: "…",
    sources: [{ type: "url", value: "https://…" }],
    options: { allowWebCrossCheck: false },
  }),
});`;
