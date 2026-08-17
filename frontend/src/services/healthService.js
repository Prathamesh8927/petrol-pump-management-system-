import api from "./api";

/* =========================================
   HEALTH CHECK
========================================= */

export const getHealth =
  async () => {
    const response =
      await api.get(
        "/health"
      );

    return response.data;
  };