import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getCustomReport,
} from "../controllers/reportController.js";

const router =
  express.Router();

router.use(
  authMiddleware
);

router.get(
  "/daily",
  getDailyReport
);

router.get(
  "/weekly",
  getWeeklyReport
);

router.get(
  "/monthly",
  getMonthlyReport
);

router.get(
  "/custom",
  getCustomReport
);

export default router;