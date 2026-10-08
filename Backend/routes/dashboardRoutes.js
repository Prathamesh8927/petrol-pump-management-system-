import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getDashboardSummary,
} from "../controllers/dashboardController.js";

const router = express.Router();

// Dashboard requires authentication.
router.use(authMiddleware);

// GET /api/dashboard/summary
router.get(
  "/summary",
  getDashboardSummary
);

export default router;