import api from "./api";

/* =====================================================
   SUMMARY
===================================================== */

export const getSuperAdminSummary =
  async () => {
    const response = await api.get(
      "/superadmin/summary"
    );

    return response.data;
  };

/* =====================================================
   CLIENTS
===================================================== */

export const getClients = async () => {
  const response = await api.get(
    "/superadmin/clients"
  );

  return response.data;
};

export const getClientById = async (
  id
) => {
  if (!id) {
    throw new Error(
      "Client ID is required."
    );
  }

  const response = await api.get(
    `/superadmin/clients/${encodeURIComponent(
      id
    )}`
  );

  return response.data;
};

export const addClient = async (
  data
) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Client data is required."
    );
  }

  const response = await api.post(
    "/superadmin/clients",
    data
  );

  return response.data;
};

export const updateClient = async (
  id,
  data
) => {
  if (!id) {
    throw new Error(
      "Client ID is required."
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "Client update data is required."
    );
  }

  const response = await api.put(
    `/superadmin/clients/${encodeURIComponent(
      id
    )}`,
    data
  );

  return response.data;
};

export const updateClientStatus =
  async (
    id,
    status
  ) => {
    if (!id) {
      throw new Error(
        "Client ID is required."
      );
    }

    if (!status) {
      throw new Error(
        "Client status is required."
      );
    }

    const response = await api.patch(
      `/superadmin/clients/${encodeURIComponent(
        id
      )}/status`,
      {
        status,
      }
    );

    return response.data;
  };

export const deleteClient = async (
  id
) => {
  if (!id) {
    throw new Error(
      "Client ID is required."
    );
  }

  const response = await api.delete(
    `/superadmin/clients/${encodeURIComponent(
      id
    )}`
  );

  return response.data;
};

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  getSuperAdminSummary,

  getClients,
  getClientById,
  addClient,
  updateClient,
  updateClientStatus,
  deleteClient,
};