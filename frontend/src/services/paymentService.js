import api from "./api";

export const createPayment = async (payload) => {
  const response = await api.post("/payments/create", payload);
  return response?.data ?? response;
};

export const getPaymentStatus = async (paymentId) => {
  const response = await api.get(`/payments/${paymentId}/status`);
  return response?.data ?? response;
};

export const cancelPayment = async (paymentId) => {
  const response = await api.post(`/payments/${paymentId}/cancel`);
  return response?.data ?? response;
};

export const createEmployeePayment = async (amount) => {
  const response = await api.post("/payments/employee/create", {
    amount,
  });
  return response?.data ?? response;
};

export const getEmployeePaymentStatus = async (paymentId) => {
  const response = await api.get(
    `/payments/employee/${paymentId}/status`
  );
  return response?.data ?? response;
};

export const cancelEmployeePayment = async (paymentId) => {
  const response = await api.post(
    `/payments/employee/${paymentId}/cancel`
  );
  return response?.data ?? response;
};
