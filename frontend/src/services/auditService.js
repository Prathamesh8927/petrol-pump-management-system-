import api from "./api";

export const getAuditLogs =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/audit",
        {
          params,
        }
      );

    return response.data;
  };