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

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| EMPLOYEE / STAFF PAYMENTS
|--------------------------------------------------------------------------
*/

// POST /api/payments/employee/create
router.post(
  "/employee/create",
  allowRoles("employee", "staff"),
  createEmployeePayment
);

// GET /api/payments/employee/:id/status
router.get(
  "/employee/:id/status",
  allowRoles("employee", "staff"),
  getPaymentStatus
);

// POST /api/payments/employee/:id/cancel
router.post(
  "/employee/:id/cancel",
  allowRoles("employee", "staff"),
  cancelPayment
);

/*
|--------------------------------------------------------------------------
| OWNER / MANAGER PAYMENTS
|--------------------------------------------------------------------------
*/

// POST /api/payments/create
router.post(
  "/create",
  allowRoles("owner", "manager"),
  createPayment
);

// GET /api/payments/:id/status
router.get(
  "/:id/status",
  allowRoles("owner", "manager"),
  getPaymentStatus
);

// POST /api/payments/:id/cancel
router.post(
  "/:id/cancel",
  allowRoles("owner", "manager"),
  cancelPayment
);

export default router;