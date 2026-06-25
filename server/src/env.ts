import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8080),

  // Persistence
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/citeguard"),

  // DeepSeek (OpenAI-compatible)
  DEEPSEEK_API_KEY: z.string().default(""),
  DEEPSEEK_BASE_URL: z.string().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
  DEEPSEEK_REASONER_MODEL: z.string().default("deepseek-reasoner"),

  // CROO / CAP — names follow the real @croo-network/sdk v0.2.1, not the brief's placeholders.
  // Agent creation + service registration happen in the CROO Dashboard, not in code.
  CROO_API_URL: z.string().default("https://api.croo.network"),
  CROO_WS_URL: z.string().default("wss://api.croo.network/ws"),
  CROO_SDK_KEY: z.string().default(""),
  CROO_SERVICE_ID: z.string().default(""),
  BASE_RPC_URL: z.string().default("https://mainnet.base.org"),
  // Enable the CAP order listener. Off by default so the HTTP API can run standalone.
  CAP_ENABLED: z.stringbool().default(false),

  // Capability pricing / contract
  CAPABILITY_PRICE_USDC: z.coerce.number().default(0.5),

  // Our wallets, used by the self-trade guardrail (comma-separated lowercased addresses).
  OWN_WALLETS: z.string().default(""),

  // Frontend
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),

  // Pipeline caps
  MAX_CLAIMS: z.coerce.number().default(40),
  SOURCE_FETCH_TIMEOUT_MS: z.coerce.number().default(10000),
  SOURCE_CACHE_TTL_MS: z.coerce.number().default(86400000), // 24h
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // eslint-disable-next-line node/no-process-env
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", z.treeifyError(parsed.error));
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const ownWallets = new Set(
  env.OWN_WALLETS.split(",").map(w => w.trim().toLowerCase()).filter(Boolean),
);
