import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

import {
  getAuditLogs,
} from "../controllers/auditController.js";

const router = express.Router();

// All audit-log routes require authentication.
router.use(authMiddleware);

// Only owner and manager can access audit logs.
router.get(
  "/",
  allowRoles("owner", "manager"),
  getAuditLogs
);

export default router;