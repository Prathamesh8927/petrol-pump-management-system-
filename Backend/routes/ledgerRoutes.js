import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  addLedgerCustomer,
  getLedgerCustomers,
  getCustomerLedger,
  updateLedgerCustomer,
  deleteLedgerCustomer,
  addCustomerPurchase,
  addLedgerPayment,
  addLedgerAdvance,
  getCustomerLedgerHistory,
  getPendingCredit,
  getTodayCreditSales,
} from "../controllers/ledgerController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| SPECIAL / SUMMARY ROUTES
|--------------------------------------------------------------------------
| Keep these before /customers/:id style routes.
|--------------------------------------------------------------------------
*/

// GET /api/ledger/pending
router.get(
  "/pending",
  getPendingCredit
);

// GET /api/ledger/today-credit
router.get(
  "/today-credit",
  getTodayCreditSales
);

/*
|--------------------------------------------------------------------------
| PAYMENTS
|--------------------------------------------------------------------------
*/

// POST /api/ledger/payment
router.post(
  "/payment",
  addLedgerPayment
);

/*
|--------------------------------------------------------------------------
| ADVANCE PAYMENTS
|--------------------------------------------------------------------------
*/

// POST /api/ledger/customers/:customerId/advance
router.post(
  "/customers/:customerId/advance",
  addLedgerAdvance
);

/*
|--------------------------------------------------------------------------
| CUSTOMERS
|--------------------------------------------------------------------------
*/

// GET /api/ledger/customers
router.get(
  "/customers",
  getLedgerCustomers
);

// POST /api/ledger/customers
router.post(
  "/customers",
  addLedgerCustomer
);

/*
|--------------------------------------------------------------------------
| CUSTOMER HISTORY
|--------------------------------------------------------------------------
*/

// GET /api/ledger/customers/:customerId/history
router.get(
  "/customers/:customerId/history",
  getCustomerLedgerHistory
);

/*
|--------------------------------------------------------------------------
| CUSTOMER PURCHASES
|--------------------------------------------------------------------------
*/

// POST /api/ledger/customers/:customerId/purchases
router.post(
  "/customers/:customerId/purchases",
  addCustomerPurchase
);

/*
|--------------------------------------------------------------------------
| CUSTOMER DETAILS
|--------------------------------------------------------------------------
*/

// GET /api/ledger/customers/:id
router.get(
  "/customers/:id",
  getCustomerLedger
);

// PATCH /api/ledger/customers/:id
router.patch(
  "/customers/:id",
  updateLedgerCustomer
);

// DELETE /api/ledger/customers/:id
router.delete(
  "/customers/:id",
  deleteLedgerCustomer
);

export default router;