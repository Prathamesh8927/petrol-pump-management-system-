import api from "./api";

/* =====================================================
   DAILY SALES
===================================================== */

export const getDailySales =
  async (date) => {
    const response =
      await api.get(
        "/sales/daily",
        {
          params: date
            ? { date }
            : {},
        }
      );

    return response.data;
  };

/* =====================================================
   SALES HISTORY
===================================================== */

export const getSalesHistory =
  async (
    params = {}
  ) => {
    const response =
      await api.get(
        "/sales/history",
        {
          params,
        }
      );

    return response.data;
  };

/* =====================================================
   PAYMENT SUMMARY
===================================================== */

export const getPaymentSummary =
  async (date) => {
    const response =
      await api.get(
        "/sales/payment-summary",
        {
          params: date
            ? { date }
            : {},
        }
      );

    return response.data;
  };