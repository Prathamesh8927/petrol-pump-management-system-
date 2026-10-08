import express from "express";

import {
  getHealth,
} from "../controllers/healthController.js";

const router = express.Router();

// Public health check.
// Used by Render/deployment monitoring and uptime checks.
router.get(
  "/",
  getHealth
);

export default router;