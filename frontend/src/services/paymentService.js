import api from "./api";

/* =====================================================
   CUSTOMER / PUMP PAYMENT
===================================================== */

export const createPayment = async (payload) => {
  if (!payload || typeof payload !== "object") {
    throw new Error(
      "Payment data is required."
    );
  }

  const response = await api.post(
    "/payments/create",
    payload
  );

  return response?.data ?? response;
};

export const getPaymentStatus = async (
  paymentId
) => {
  if (!paymentId) {
    throw new Error(
      "Payment ID is required."
    );
  }

  const response = await api.get(
    `/payments/${encodeURIComponent(
      paymentId
    )}/status`
  );

  return response?.data ?? response;
};

export const cancelPayment = async (
  paymentId
) => {
  if (!paymentId) {
    throw new Error(
      "Payment ID is required."
    );
  }

  const response = await api.post(
    `/payments/${encodeURIComponent(
      paymentId
    )}/cancel`
  );

  return response?.data ?? response;
};

/* =====================================================
   EMPLOYEE PAYMENT
===================================================== */

export const createEmployeePayment = async (
  amount
) => {
  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  const response = await api.post(
    "/payments/employee/create",
    {
      amount: numericAmount,
    }
  );

  return response?.data ?? response;
};

export const getEmployeePaymentStatus =
  async (paymentId) => {
    if (!paymentId) {
      throw new Error(
        "Payment ID is required."
      );
    }

    const response = await api.get(
      `/payments/employee/${encodeURIComponent(
        paymentId
      )}/status`
    );

    return response?.data ?? response;
  };

export const cancelEmployeePayment =
  async (paymentId) => {
    if (!paymentId) {
      throw new Error(
        "Payment ID is required."
      );
    }

    const response = await api.post(
      `/payments/employee/${encodeURIComponent(
        paymentId
      )}/cancel`
    );

    return response?.data ?? response;
  };

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  createPayment,
  getPaymentStatus,
  cancelPayment,

  createEmployeePayment,
  getEmployeePaymentStatus,
  cancelEmployeePayment,
};