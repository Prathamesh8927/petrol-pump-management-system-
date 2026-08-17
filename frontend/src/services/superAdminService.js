import api from "./api";

/* =====================================================
   SUMMARY
===================================================== */

export const getSuperAdminSummary =
  async () => {
    const response =
      await api.get(
        "/superadmin/summary"
      );

    return response.data;
  };

/* =====================================================
   CLIENTS
===================================================== */

export const getClients =
  async () => {
    const response =
      await api.get(
        "/superadmin/clients"
      );

    return response.data;
  };

export const getClientById =
  async (id) => {
    const response =
      await api.get(
        `/superadmin/clients/${id}`
      );

    return response.data;
  };

export const addClient =
  async (data) => {
    const response =
      await api.post(
        "/superadmin/clients",
        data
      );

    return response.data;
  };

export const updateClient =
  async (
    id,
    data
  ) => {
    const response =
      await api.put(
        `/superadmin/clients/${id}`,
        data
      );

    return response.data;
  };

export const updateClientStatus =
  async (
    id,
    status
  ) => {
    const response =
      await api.patch(
        `/superadmin/clients/${id}/status`,
        {
          status,
        }
      );

    return response.data;
  };

export const deleteClient =
  async (id) => {
    const response =
      await api.delete(
        `/superadmin/clients/${id}`
      );

    return response.data;
  };