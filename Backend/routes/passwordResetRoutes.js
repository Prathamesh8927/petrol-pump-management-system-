import express from "express";

import {
  createPasswordResetRequest,
  getPasswordResetStatus,
  resetPassword,
} from "../controllers/passwordResetController.js";

const router = express.Router();

/*
  Public password recovery routes
*/

router.post("/request", createPasswordResetRequest);

router.get("/status/:id", getPasswordResetStatus);

router.post("/reset/:id", resetPassword);

export default router;