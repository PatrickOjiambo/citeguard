import express from "express";

import { Order } from "../models/index.js";
import { computeMetrics } from "../services/metrics.js";

const router = express.Router();

/** GET /api/orders — recent CAP orders with status, buyer, counterparty, earnings. */
router.get("/orders", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("capOrderId buyerWallet counterpartyAgentId status priceUsdc earnedUsdc selfTrade jobId proofRef createdAt updatedAt")
      .lean();
    res.json({ orders });
  }
  catch (err) {
    next(err);
  }
});

/** GET /api/metrics — dashboard metrics + reward-eligibility flags. */
router.get("/metrics", async (req, res, next) => {
  try {
    res.json(await computeMetrics());
  }
  catch (err) {
    next(err);
  }
});

export default router;
