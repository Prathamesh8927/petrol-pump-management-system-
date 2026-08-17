import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import allowRoles from "../middleware/roleMiddleware.js";

import {
  getDailyClosing,
  closeDay,
  reopenDay,
} from "../controllers/dailyClosingController.js";

const router =
  express.Router();

router.use(
  authMiddleware
);

router.get(
  "/",
  getDailyClosing
);

router.post(
  "/close",
  allowRoles(
    "owner",
    "manager"
  ),
  closeDay
);

router.patch(
  "/:id/reopen",
  allowRoles(
    "owner"
  ),
  reopenDay
);

export default router;