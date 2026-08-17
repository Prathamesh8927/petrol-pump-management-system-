import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import allowRoles from "../middleware/roleMiddleware.js";

import {
  getAuditLogs,
} from "../controllers/auditController.js";

const router =
  express.Router();

router.use(
  authMiddleware
);

router.get(
  "/",
  allowRoles(
    "owner",
    "manager"
  ),
  getAuditLogs
);

export default router;