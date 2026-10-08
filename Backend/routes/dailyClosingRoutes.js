import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

import {
  getDailyClosing,
  closeDay,
  reopenDay,
} from "../controllers/dailyClosingController.js";

const router = express.Router();

// All daily-closing operations require authentication.
router.use(authMiddleware);

// View daily closing status/details.
router.get("/", getDailyClosing);

// Only owner and manager can close the day.
router.post(
  "/close",
  allowRoles("owner", "manager"),
  closeDay
);

// Only owner can reopen a closed day.
router.patch(
  "/:id/reopen",
  allowRoles("owner"),
  reopenDay
);

export default router;