import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getDailySales,
  getSalesHistory,
  getPaymentSummary,
} from "../controllers/salesController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| SALES
|--------------------------------------------------------------------------
*/

// GET /api/sales/daily
router.get(
  "/daily",
  getDailySales
);

// GET /api/sales/history
router.get(
  "/history",
  getSalesHistory
);

// GET /api/sales/payment-summary
router.get(
  "/payment-summary",
  getPaymentSummary
);

export default router;