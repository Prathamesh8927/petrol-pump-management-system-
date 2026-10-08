import api from "./api";

/* =====================================================
   DASHBOARD SUMMARY
===================================================== */

export const getDashboardSummary = async (date) => {
  const params = {};

  if (date) {
    params.date = date;
  }

  const response = await api.get(
    "/dashboard/summary",
    {
      params,
    }
  );

  return response.data;
};

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  getDashboardSummary,
};