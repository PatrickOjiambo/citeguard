import express from "express";

import { dbReady } from "../db.js";

const router = express.Router();

/** GET /health — liveness. */
router.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

/** GET /ready — readiness (DB connected). */
router.get("/ready", (req, res) => {
  const ready = dbReady();
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", db: ready });
});

export default router;
