import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getDailySales,
  getSalesHistory,
  getPaymentSummary,
} from "../controllers/salesController.js";

const router =
  express.Router();

router.use(
  authMiddleware
);

router.get(
  "/daily",
  getDailySales
);

router.get(
  "/history",
  getSalesHistory
);

router.get(
  "/payment-summary",
  getPaymentSummary
);

export default router;