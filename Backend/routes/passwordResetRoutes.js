import express from "express";

import {
  createPasswordResetRequest,
  getPasswordResetStatus,
  resetPassword,
} from "../controllers/passwordResetController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PASSWORD RESET
|--------------------------------------------------------------------------
|
| These endpoints are intentionally public.
|
| Security must be enforced by the controller using
| secure, one-time reset tokens.
|
|--------------------------------------------------------------------------
*/

// POST /api/password-reset/request
router.post(
  "/request",
  createPasswordResetRequest
);

// GET /api/password-reset/status/:token
router.get(
  "/status/:token",
  getPasswordResetStatus
);

// POST /api/password-reset/reset/:token
router.post(
  "/reset/:token",
  resetPassword
);

export default router;