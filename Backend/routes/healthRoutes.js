import express from "express";

import {
  getHealth,
} from "../controllers/healthController.js";

const router =
  express.Router();

/* =====================================================
   HEALTH CHECK
===================================================== */

router.get(
  "/",
  getHealth
);

export default router;