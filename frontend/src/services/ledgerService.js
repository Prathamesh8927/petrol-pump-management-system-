import api from "./api";

/* =====================================================
   CUSTOMERS
===================================================== */

export const getLedgerCustomers =
  async () => {
    const response =
      await api.get(
        "/ledger/customers"
      );

    return response.data;
  };

export const addLedgerCustomer =
  async (data) => {
    const response =
      await api.post(
        "/ledger/customers",
        data
      );

    return response.data;
  };

export const getCustomerLedger =
  async (id) => {
    const response =
      await api.get(
        `/ledger/customers/${id}`
      );

    return response.data;
  };

export const updateLedgerCustomer =
  async (
    id,
    data
  ) => {
    const response =
      await api.patch(
        `/ledger/customers/${id}`,
        data
      );

    return response.data;
  };

export const deleteLedgerCustomer =
  async (id) => {
    const response =
      await api.delete(
        `/ledger/customers/${id}`
      );

    return response.data;
  };

/* =====================================================
   PURCHASES
===================================================== */

export const addCustomerPurchase =
  async (
    customerId,
    data
  ) => {
    const response =
      await api.post(
        `/ledger/customers/${customerId}/purchases`,
        data
      );

    return response.data;
  };

/* =====================================================
   HISTORY
===================================================== */

export const getCustomerLedgerHistory =
  async (
    customerId
  ) => {
    const response =
      await api.get(
        `/ledger/customers/${customerId}/history`
      );

    return response.data;
  };

/* =====================================================
   PAYMENT
===================================================== */

export const addLedgerPayment =
  async (data) => {
    const response =
      await api.post(
        "/ledger/payment",
        data
      );

    return response.data;
  };

/* =====================================================
   PENDING
===================================================== */

export const getPendingCredit =
  async () => {
    const response =
      await api.get(
        "/ledger/pending"
      );

    return response.data;
  };

export const getTotalPendingCredit =
  async () => {
    const response =
      await api.get(
        "/ledger/pending"
      );

    return Number(
      response.data
        ?.totalPending ||
        0
    );
  };

/* =====================================================
   TODAY CREDIT
===================================================== */

export const getTodayCreditSales =
  async () => {
    const response =
      await api.get(
        "/ledger/today-credit"
      );

    return Number(
      response.data
        ?.totalCreditSales ||
        0
    );
  };