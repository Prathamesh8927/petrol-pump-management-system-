import api from "./api";

/* =====================================================
   CUSTOMERS
===================================================== */

/**
 * Get all ledger customers for the current pump.
 */
export const getLedgerCustomers = async () => {
  const response = await api.get("/ledger/customers");

  return response.data;
};

/**
 * Add a new ledger customer.
 */
export const addLedgerCustomer = async (data) => {
  const response = await api.post(
    "/ledger/customers",
    data
  );

  return response.data;
};

/**
 * Get a single customer.
 */
export const getCustomerLedger = async (id) => {
  const response = await api.get(
    `/ledger/customers/${id}`
  );

  return response.data;
};

/**
 * Update customer.
 */
export const updateLedgerCustomer = async (
  id,
  data
) => {
  const response = await api.patch(
    `/ledger/customers/${id}`,
    data
  );

  return response.data;
};

/**
 * Delete customer.
 */
export const deleteLedgerCustomer = async (id) => {
  const response = await api.delete(
    `/ledger/customers/${id}`
  );

  return response.data;
};


/* =====================================================
   PURCHASES
===================================================== */

/**
 * Add a fuel purchase to customer ledger.
 *
 * Existing service name.
 */
export const addCustomerPurchase = async (
  customerId,
  data
) => {
  const response = await api.post(
    `/ledger/customers/${customerId}/purchases`,
    data
  );

  return response.data;
};


/**
 * Compatibility function used by CustomerLedger.jsx.
 *
 * CustomerLedger.jsx calls:
 *
 * addCustomerLedgerEntry(customerId, data)
 *
 * Internally this uses the existing purchase API.
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
 * Get complete ledger history for a customer.
 */
export const getCustomerLedgerHistory = async (
  customerId
) => {
  const response = await api.get(
    `/ledger/customers/${customerId}/history`
  );

  return response.data;
};


/* =====================================================
   PAYMENTS
===================================================== */

/**
 * Existing payment function.
 *
 * Can be used directly when customerId is already
 * included inside the request data.
 */
export const addLedgerPayment = async (data) => {
  const response = await api.post(
    "/ledger/payment",
    data
  );

  return response.data;
};


/**
 * Compatibility function used by CustomerLedger.jsx.
 *
 * CustomerLedger.jsx calls:
 *
 * addCustomerPayment(customerId, data)
 *
 * The backend payment endpoint expects customerId
 * as part of the request body.
 */
export const addCustomerPayment = async (
  customerId,
  data
) => {
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
 */
export const getTotalPendingCredit = async () => {
  const response = await api.get(
    "/ledger/pending"
  );

  return Number(
    response.data?.totalPending || 0
  );
};


/* =====================================================
   TODAY CREDIT
===================================================== */

/**
 * Get today's credit sales.
 */
export const getTodayCreditSales = async () => {
  const response = await api.get(
    "/ledger/today-credit"
  );

  return Number(
    response.data?.totalCreditSales || 0
  );
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