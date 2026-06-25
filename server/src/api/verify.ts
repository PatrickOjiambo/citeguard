import express from "express";
import rateLimit from "express-rate-limit";

import { Verdict, VerificationJob } from "../models/index.js";
import { VerifyInput } from "../schema/acceptance.js";
import { runVerification } from "../services/pipeline.js";

const router = express.Router();

// Basic rate limiting to protect DeepSeek cost / prevent abuse.
const verifyLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many verification requests, please slow down." },
});

/** POST /api/verify — public verification (humans + frontend). */
router.post("/", verifyLimiter, async (req, res, next) => {
  try {
    const parsed = VerifyInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid request body", issues: parsed.error.issues });
      return;
    }
    const result = await runVerification(parsed.data, { source: "public" });
    res.json({
      verdictId: result.verdictId,
      jobId: result.jobId,
      verdict: result.verdict,
      proof: result.proof,
      latencyMs: result.latencyMs,
    });
  }
  catch (err) {
    next(err);
  }
});

/** GET /api/verdicts/:id — fetch a stored verdict for the report page. */
export const verdictsRouter = express.Router();
verdictsRouter.get("/:id", async (req, res, next) => {
  try {
    const verdict = await Verdict.findById(req.params.id).lean().catch(() => null);
    if (!verdict) {
      res.status(404).json({ message: "Verdict not found" });
      return;
    }
    res.json(verdict);
  }
  catch (err) {
    next(err);
  }
});

/** GET /api/jobs/:id — job detail incl. execution log (debug/audit). */
export const jobsRouter = express.Router();
jobsRouter.get("/:id", async (req, res, next) => {
  try {
    const job = await VerificationJob.findById(req.params.id).lean().catch(() => null);
    if (!job) {
      res.status(404).json({ message: "Job not found" });
      return;
    }
    res.json(job);
  }
  catch (err) {
    next(err);
  }
});

export default router;
