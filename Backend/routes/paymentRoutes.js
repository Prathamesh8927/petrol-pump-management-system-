import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";
import {
  createPayment,
  createEmployeePayment,
  getPaymentStatus,
  cancelPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/employee/create",
  allowRoles("employee", "staff"),
  createEmployeePayment
);

router.get(
  "/employee/:id/status",
  allowRoles("employee", "staff"),
  getPaymentStatus
);

router.post(
  "/employee/:id/cancel",
  allowRoles("employee", "staff"),
  cancelPayment
);

router.post("/create", allowRoles("owner", "manager"), createPayment);
router.get("/:id/status", allowRoles("owner", "manager"), getPaymentStatus);
router.post("/:id/cancel", allowRoles("owner", "manager"), cancelPayment);

export default router;
