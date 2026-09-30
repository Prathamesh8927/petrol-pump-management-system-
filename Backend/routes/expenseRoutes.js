import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  addExpense,
  getExpenses,
  deleteExpense,

  // Employees
  addEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  payEmployeeSalary,
} from "../controllers/expenseController.js";

const router =
  express.Router();

/* =====================================================
   AUTHENTICATION
===================================================== */

router.use(
  authMiddleware
);

/* =====================================================
   EMPLOYEES
===================================================== */

/*
 * Keep employee routes before /:id
 * expense routes.
 */

router.get(
  "/employees",
  getEmployees
);

router.post(
  "/employees",
  addEmployee
);

router.patch(
  "/employees/:id",
  updateEmployee
);

router.delete(
  "/employees/:id",
  deleteEmployee
);

router.post(
  "/employees/:id/pay-salary",
  payEmployeeSalary
);

/* =====================================================
   EXPENSES
===================================================== */

router.get(
  "/",
  getExpenses
);

router.post(
  "/",
  addExpense
);

router.delete(
  "/:id",
  deleteExpense
);

/* =====================================================
   EXPORT
===================================================== */

export default router;