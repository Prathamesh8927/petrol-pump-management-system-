import api from "./api";

export const getDailyClosing =
  async (
    date
  ) => {
    const response =
      await api.get(
        "/daily-closing",
        {
          params: {
            date,
          },
        }
      );

    return response.data;
  };

export const closeBusinessDay =
  async (
    data
  ) => {
    const response =
      await api.post(
        "/daily-closing/close",
        data
      );

    return response.data;
  };

export const reopenBusinessDay =
  async (
    id
  ) => {
    const response =
      await api.patch(
        `/daily-closing/${id}/reopen`
      );

    return response.data;
  };