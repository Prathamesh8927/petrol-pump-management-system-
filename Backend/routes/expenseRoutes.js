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

const router = express.Router();

// All expense and employee operations require authentication.
router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| EMPLOYEES
|--------------------------------------------------------------------------
| These routes are declared before /:id expense routes.
*/

// GET /api/expenses/employees
router.get(
  "/employees",
  getEmployees
);

// POST /api/expenses/employees
router.post(
  "/employees",
  addEmployee
);

// PATCH /api/expenses/employees/:id
router.patch(
  "/employees/:id",
  updateEmployee
);

// DELETE /api/expenses/employees/:id
router.delete(
  "/employees/:id",
  deleteEmployee
);

// POST /api/expenses/employees/:id/pay-salary
router.post(
  "/employees/:id/pay-salary",
  payEmployeeSalary
);

/*
|--------------------------------------------------------------------------
| EXPENSES
|--------------------------------------------------------------------------
*/

// GET /api/expenses
router.get(
  "/",
  getExpenses
);

// POST /api/expenses
router.post(
  "/",
  addExpense
);

// DELETE /api/expenses/:id
router.delete(
  "/:id",
  deleteExpense
);

export default router;