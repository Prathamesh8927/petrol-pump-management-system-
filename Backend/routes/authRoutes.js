import express from "express";

import {
  login,
  register,
  getMe,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";

import loginRateLimiter from "../middleware/loginRateLimiter.js";

const router =
  express.Router();

/* =====================================================
   LOGIN
===================================================== */

router.post(
  "/login",
  loginRateLimiter,
  login
);

/* =====================================================
   PUBLIC REGISTRATION
===================================================== */

router.post(
  "/register",
  loginRateLimiter,
  register
);

/* =====================================================
   CURRENT USER
===================================================== */

router.get(
  "/me",
  authMiddleware,
  getMe
);

export default router;