import api from "./api";

/* =====================================================
   CLIENT REQUESTS
===================================================== */

export const createClientRequest = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Client request data is required."
    );
  }

  const response = await api.post(
    "/client-requests",
    data
  );

  return response.data;
};

export const getClientRequests = async () => {
  const response = await api.get(
    "/client-requests"
  );

  return response.data;
};

export const approveClientRequest = async (id) => {
  if (!id) {
    throw new Error(
      "Client request ID is required."
    );
  }

  const response = await api.patch(
    `/client-requests/${encodeURIComponent(id)}/approve`
  );

  return response.data;
};

export const rejectClientRequest = async (
  id,
  reason = ""
) => {
  if (!id) {
    throw new Error(
      "Client request ID is required."
    );
  }

  const response = await api.patch(
    `/client-requests/${encodeURIComponent(id)}/reject`,
    {
      reason:
        typeof reason === "string"
          ? reason.trim()
          : "",
    }
  );

  return response.data;
};

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  createClientRequest,
  getClientRequests,
  approveClientRequest,
  rejectClientRequest,
};