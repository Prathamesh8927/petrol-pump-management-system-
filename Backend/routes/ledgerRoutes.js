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

// ======================================================
// AUTHENTICATION
// ======================================================

router.use(authMiddleware);

// ======================================================
// SPECIAL ROUTES
// ======================================================

router.get(
  "/pending",
  getPendingCredit
);

router.get(
  "/today-credit",
  getTodayCreditSales
);

// ======================================================
// PAYMENT
// ======================================================

router.post(
  "/payment",
  addLedgerPayment
);

// ======================================================
// ADVANCE PAYMENT
// ======================================================

router.post(
  "/customers/:customerId/advance",
  addLedgerAdvance
);

// ======================================================
// CUSTOMERS
// ======================================================

router.get(
  "/customers",
  getLedgerCustomers
);

router.post(
  "/customers",
  addLedgerCustomer
);

// ======================================================
// CUSTOMER HISTORY
// ======================================================

router.get(
  "/customers/:customerId/history",
  getCustomerLedgerHistory
);

// ======================================================
// CUSTOMER PURCHASE
// ======================================================

router.post(
  "/customers/:customerId/purchases",
  addCustomerPurchase
);

// ======================================================
// CUSTOMER DETAILS
// ======================================================

router.get(
  "/customers/:id",
  getCustomerLedger
);

router.patch(
  "/customers/:id",
  updateLedgerCustomer
);

router.delete(
  "/customers/:id",
  deleteLedgerCustomer
);

export default router;