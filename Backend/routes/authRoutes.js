import express from "express";

import {
  login,
  register,
  getMe,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import loginRateLimiter from "../middleware/loginRateLimiter.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| POST /login
|--------------------------------------------------------------------------
| Public login endpoint.
| Rate limiter protects against brute-force attempts.
*/
router.post(
  "/login",
  loginRateLimiter,
  login
);

/*
|--------------------------------------------------------------------------
| POST /register
|--------------------------------------------------------------------------
| Public registration endpoint.
| The same rate limiter prevents registration abuse.
*/
router.post(
  "/register",
  loginRateLimiter,
  register
);

/*
|--------------------------------------------------------------------------
| GET /me
|--------------------------------------------------------------------------
| Returns the currently authenticated user.
*/
router.get(
  "/me",
  authMiddleware,
  getMe
);

export default router;