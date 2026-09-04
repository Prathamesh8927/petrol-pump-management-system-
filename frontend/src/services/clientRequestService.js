import api from "./api";

export const createClientRequest = async (data) => {
  const response = await api.post("/client-requests", data);
  return response.data;
};

export const getClientRequests = async () => {
  const response = await api.get("/client-requests");
  return response.data;
};

export const approveClientRequest = async (id) => {
  const response = await api.patch(
    `/client-requests/${id}/approve`
  );

  return response.data;
};

export const rejectClientRequest = async (id, reason = "") => {
  const response = await api.patch(
    `/client-requests/${id}/reject`,
    { reason }
  );

  return response.data;
};