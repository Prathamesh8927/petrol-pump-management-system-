import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  addExpense,
  getExpenses,
  deleteExpense,

  addEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  payEmployeeSalary,
} from "../controllers/expenseController.js";

const router =
  express.Router();

router.use(
  authMiddleware
);

/* ===============================
   EMPLOYEES

   Keep before /:id routes.
================================ */

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

/* ===============================
   EXPENSES
================================ */

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

export default router;