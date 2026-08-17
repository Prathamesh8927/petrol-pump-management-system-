import api from "./api";

export const getDailyReport =
  async (date) => {
    const response =
      await api.get(
        "/reports/daily",
        {
          params: {
            date,
          },
        }
      );

    return response.data;
  };

export const getWeeklyReport =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/reports/weekly",
        {
          params,
        }
      );

    return response.data;
  };

export const getMonthlyReport =
  async (
    month,
    year
  ) => {
    const response =
      await api.get(
        "/reports/monthly",
        {
          params: {
            month,
            year,
          },
        }
      );

    return response.data;
  };

export const getCustomReport =
  async (
    from,
    to
  ) => {
    const response =
      await api.get(
        "/reports/custom",
        {
          params: {
            from,
            to,
          },
        }
      );

    return response.data;
  };