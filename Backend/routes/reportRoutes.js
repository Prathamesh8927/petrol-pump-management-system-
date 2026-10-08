import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getCustomReport,
} from "../controllers/reportController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| REPORTS
|--------------------------------------------------------------------------
*/

// GET /api/reports/daily
router.get(
  "/daily",
  getDailyReport
);

// GET /api/reports/weekly
router.get(
  "/weekly",
  getWeeklyReport
);

// GET /api/reports/monthly
router.get(
  "/monthly",
  getMonthlyReport
);

// GET /api/reports/custom
router.get(
  "/custom",
  getCustomReport
);

export default router;