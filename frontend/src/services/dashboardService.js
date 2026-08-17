import api from "./api";

export const getDashboardSummary =
  async (date) => {
    const response =
      await api.get(
        "/dashboard/summary",
        {
          params: {
            date,
          },
        }
      );

    return response.data;
  };