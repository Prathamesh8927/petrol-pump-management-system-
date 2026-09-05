import express from "express";

import {
  createPasswordResetRequest,
  getPasswordResetStatus,
  resetPassword,
} from "../controllers/passwordResetController.js";

const router = express.Router();

/*
  =========================================================
  PUBLIC PASSWORD RECOVERY ROUTES

  IMPORTANT:
  - Request endpoint intentionally remains public.
  - Status/reset endpoints should use a secure token.
  - MongoDB PasswordResetRequest _id must NOT be used
    as a password-reset credential.
  =========================================================
*/

/*
  Create password reset request
*/
router.post(
  "/request",
  createPasswordResetRequest
);

/*
  Check password reset status using a secure token.

  Example:
  GET /api/password-reset/status/:token
*/
router.get(
  "/status/:token",
  getPasswordResetStatus
);

/*
  Complete password reset using a secure one-time token.

  Example:
  POST /api/password-reset/reset/:token
*/
router.post(
  "/reset/:token",
  resetPassword
);

export default router;