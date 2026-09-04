import express from "express";

import {
  login,
  register,
  getMe,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Login
router.post("/login", login);

// Public registration request
router.post("/register", register);

// Logged-in user
router.get("/me", authMiddleware, getMe);

export default router;