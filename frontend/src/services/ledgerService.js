import api from "./api";

/* =====================================================
   CUSTOMERS
===================================================== */

/**
 * Get all ledger customers for the
 * currently authenticated pump.
 *
 * pumpId is intentionally NOT accepted
 * from the frontend.
 *
 * The backend derives the authorized
 * pump from the JWT.
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
  if (!data || typeof data !== "object") {
    throw new Error(
      "Customer data is required."
    );
  }

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
  if (!id) {
    throw new Error(
      "Customer ID is required."
    );
  }

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
  if (!id) {
    throw new Error(
      "Customer ID is required."
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "Customer update data is required."
    );
  }

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
 * Backend moves the customer into
 * recovery storage according to the
 * configured retention period.
 */
export const deleteLedgerCustomer = async (
  id
) => {
  if (!id) {
    throw new Error(
      "Customer ID is required."
    );
  }

  const response = await api.delete(
    `/ledger/customers/${encodeURIComponent(
      id
    )}`
  );

  return response.data;
};

/* =====================================================
   PURCHASES
===================================================== */

/**
 * Add a fuel purchase / credit entry
 * to a customer's ledger.
 */
export const addCustomerPurchase = async (
  customerId,
  data
) => {
  if (!customerId) {
    throw new Error(
      "Customer ID is required."
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "Purchase data is required."
    );
  }

  const response = await api.post(
    `/ledger/customers/${encodeURIComponent(
      customerId
    )}/purchases`,
    data
  );

  return response.data;
};

/**
 * Compatibility function.
 *
 * Older CustomerLedger components may call:
 *
 * addCustomerLedgerEntry(customerId, data)
 *
 * Internally this uses the existing
 * purchase endpoint.
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
   HISTORY
===================================================== */

/**
 * Get complete ledger history
 * for a specific customer.
 */
export const getCustomerLedgerHistory =
  async (customerId) => {
    if (!customerId) {
      throw new Error(
        "Customer ID is required."
      );
    }

    const response = await api.get(
      `/ledger/customers/${encodeURIComponent(
        customerId
      )}/history`
    );

    return response.data;
  };

/* =====================================================
   PAYMENTS
===================================================== */

/**
 * Add a customer ledger payment.
 *
 * Frontend contract:
 *
 * {
 *   customerId,
 *   paymentAmount,
 *   entryDate,
 *   note
 * }
 *
 * Backend contract:
 *
 * {
 *   customerId,
 *   amount,
 *   entryDate,
 *   note
 * }
 *
 * This service converts paymentAmount
 * to amount before sending the request.
 */
export const addLedgerPayment = async (
  data
) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Payment data is required."
    );
  }

  if (!data.customerId) {
    throw new Error(
      "Customer ID is required."
    );
  }

  const paymentAmount = Number(
    data.paymentAmount ??
      data.amount
  );

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  const response = await api.post(
    "/ledger/payment",
    {
      customerId:
        data.customerId,

      /*
       * IMPORTANT:
       * Backend expects `amount`,
       * not `paymentAmount`.
       */
      amount: paymentAmount,

      entryDate:
        data.entryDate,

      note:
        typeof data.note === "string"
          ? data.note.trim()
          : "",
    }
  );

  return response.data;
};

/**
 * Compatibility function used by
 * CustomerLedger.jsx.
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
 *
 * customerId is injected into the
 * request body automatically.
 */
export const addCustomerPayment = async (
  customerId,
  data
) => {
  if (!customerId) {
    throw new Error(
      "Customer ID is required."
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "Payment data is required."
    );
  }

  return addLedgerPayment({
    ...data,
    customerId,
  });
};

/* =====================================================
   PENDING CREDIT
===================================================== */

/**
 * Get all pending customer credit.
 */
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
 *
 * Backend determines the current
 * authenticated pump and business date.
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

  getPendingCredit,
  getTotalPendingCredit,
  getTodayCreditSales,
};