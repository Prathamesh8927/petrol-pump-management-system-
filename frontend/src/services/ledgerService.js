import api from "./api";

/* =====================================================
   HELPERS
===================================================== */

const requireId = (id, label = "ID") => {
  if (!id) {
    throw new Error(`${label} is required.`);
  }
};

const requireObject = (data, label) => {
  if (!data || typeof data !== "object") {
    throw new Error(`${label} is required.`);
  }
};

/* =====================================================
   CUSTOMERS
===================================================== */

/**
 * Get all ledger customers for the
 * currently authenticated pump.
 *
 * pumpId is NOT accepted from the frontend.
 * Backend derives the authorized pump from JWT.
 */
export const getLedgerCustomers = async () => {
  const response = await api.get(
    "/ledger/customers"
  );

  return response.data;
};

/**
 * Add a new ledger customer.
 */
export const addLedgerCustomer = async (
  data
) => {
  requireObject(
    data,
    "Customer data"
  );

  const response = await api.post(
    "/ledger/customers",
    data
  );

  return response.data;
};

/**
 * Get a single customer ledger.
 */
export const getCustomerLedger = async (
  id
) => {
  requireId(
    id,
    "Customer ID"
  );

  const response = await api.get(
    `/ledger/customers/${encodeURIComponent(
      id
    )}`
  );

  return response.data;
};

/**
 * Update a ledger customer.
 */
export const updateLedgerCustomer = async (
  id,
  data
) => {
  requireId(
    id,
    "Customer ID"
  );

  requireObject(
    data,
    "Customer update data"
  );

  const response = await api.patch(
    `/ledger/customers/${encodeURIComponent(
      id
    )}`,
    data
  );

  return response.data;
};

/**
 * Delete a ledger customer.
 *
 * Backend handles recovery/retention.
 */
export const deleteLedgerCustomer = async (
  id
) => {
  requireId(
    id,
    "Customer ID"
  );

  const response = await api.delete(
    `/ledger/customers/${encodeURIComponent(
      id
    )}`
  );

  return response.data;
};

/* =====================================================
   CUSTOMER PURCHASES
===================================================== */

/**
 * Add a purchase / credit entry.
 */
export const addCustomerPurchase = async (
  customerId,
  data
) => {
  requireId(
    customerId,
    "Customer ID"
  );

  requireObject(
    data,
    "Purchase data"
  );

  const response = await api.post(
    `/ledger/customers/${encodeURIComponent(
      customerId
    )}/purchases`,
    data
  );

  return response.data;
};

/**
 * Backward-compatible alias.
 *
 * Older CustomerLedger components may call:
 *
 * addCustomerLedgerEntry(customerId, data)
 */
export const addCustomerLedgerEntry = async (
  customerId,
  data
) => {
  return addCustomerPurchase(
    customerId,
    data
  );
};

/* =====================================================
   CUSTOMER HISTORY
===================================================== */

export const getCustomerLedgerHistory =
  async (customerId) => {
    requireId(
      customerId,
      "Customer ID"
    );

    const response = await api.get(
      `/ledger/customers/${encodeURIComponent(
        customerId
      )}/history`
    );

    return response.data;
  };

/* =====================================================
   LEDGER PAYMENT
===================================================== */

/**
 * Add a customer ledger payment.
 *
 * Frontend may provide either:
 *
 * {
 *   customerId,
 *   paymentAmount,
 *   entryDate,
 *   note
 * }
 *
 * or:
 *
 * {
 *   customerId,
 *   amount,
 *   entryDate,
 *   note
 * }
 *
 * Backend receives `amount`.
 */
export const addLedgerPayment = async (
  data
) => {
  requireObject(
    data,
    "Payment data"
  );

  requireId(
    data.customerId,
    "Customer ID"
  );

  const paymentAmount = Number(
    data.paymentAmount ?? data.amount
  );

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  const payload = {
    customerId: data.customerId,

    amount: paymentAmount,

    entryDate:
      data.entryDate || undefined,

    note:
      typeof data.note === "string"
        ? data.note.trim()
        : "",
  };

  const response = await api.post(
    "/ledger/payment",
    payload
  );

  return response.data;
};

/**
 * Backward-compatible payment function.
 *
 * Usage:
 *
 * addCustomerPayment(
 *   customerId,
 *   {
 *     paymentAmount,
 *     entryDate,
 *     note
 *   }
 * )
 */
export const addCustomerPayment = async (
  customerId,
  data
) => {
  requireId(
    customerId,
    "Customer ID"
  );

  requireObject(
    data,
    "Payment data"
  );

  return addLedgerPayment({
    ...data,
    customerId,
  });
};

/* =====================================================
   ADVANCE PAYMENT
===================================================== */

/**
 * Add advance payment to a customer.
 *
 * Example:
 * Customer pays ₹30,000 advance.
 *
 * Later purchases:
 * ₹2,000
 * ₹3,000
 * ₹5,000
 *
 * Backend handles deduction according
 * to the ledger advance-payment logic.
 */
export const addCustomerAdvance = async (
  customerId,
  data
) => {
  requireId(
    customerId,
    "Customer ID"
  );

  requireObject(
    data,
    "Advance payment data"
  );

  const amount = Number(
    data.amount ??
      data.paymentAmount
  );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Advance amount must be greater than zero."
    );
  }

  const response = await api.post(
    `/ledger/customers/${encodeURIComponent(
      customerId
    )}/advance`,
    {
      ...data,
      amount,
    }
  );

  return response.data;
};

/* =====================================================
   PENDING CREDIT
===================================================== */

export const getPendingCredit = async () => {
  const response = await api.get(
    "/ledger/pending"
  );

  return response.data;
};

/**
 * Get total pending credit amount.
 *
 * Always returns a safe number.
 */
export const getTotalPendingCredit =
  async () => {
    const response = await api.get(
      "/ledger/pending"
    );

    const total = Number(
      response.data?.totalPending
    );

    return Number.isFinite(total)
      ? total
      : 0;
  };

/* =====================================================
   TODAY CREDIT
===================================================== */

/**
 * Get today's credit sales.
 */
export const getTodayCreditSales =
  async () => {
    const response = await api.get(
      "/ledger/today-credit"
    );

    const total = Number(
      response.data?.totalCreditSales
    );

    return Number.isFinite(total)
      ? total
      : 0;
  };

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  getLedgerCustomers,
  addLedgerCustomer,
  getCustomerLedger,
  updateLedgerCustomer,
  deleteLedgerCustomer,

  addCustomerPurchase,
  addCustomerLedgerEntry,

  getCustomerLedgerHistory,

  addLedgerPayment,
  addCustomerPayment,
  addCustomerAdvance,

  getPendingCredit,
  getTotalPendingCredit,
  getTodayCreditSales,
};