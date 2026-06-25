import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { z } from "zod/v4";

import dashboard from "./api/dashboard.js";
import health from "./api/health.js";
import verify, { jobsRouter, verdictsRouter } from "./api/verify.js";
import { env } from "./env.js";
import * as middlewares from "./middlewares.js";
import { SCHEMA_VERSION, VerdictOutput, VerifyInput } from "./schema/acceptance.js";

const app = express();

app.use(morgan(env.NODE_ENV === "test" ? "tiny" : "dev"));
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN === "*" ? true : env.FRONTEND_ORIGIN.split(",") }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "CiteGuard",
    description: "Output & citation verification agent for the CROO economy.",
    capability: "output-citation-verification",
    schemaVersion: SCHEMA_VERSION,
    priceUsdc: env.CAPABILITY_PRICE_USDC,
  });
});

// Health / readiness
app.use("/", health);

// Public acceptance schema (input/output contract) as JSON Schema.
app.get("/api/schema", (req, res) => {
  res.json({
    capability: "output-citation-verification",
    schemaVersion: SCHEMA_VERSION,
    input: z.toJSONSchema(VerifyInput),
    output: z.toJSONSchema(VerdictOutput),
  });
});

// API
app.use("/api/verify", verify);
app.use("/api/verdicts", verdictsRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api", dashboard);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
