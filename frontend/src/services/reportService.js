import api from "./api";

/* =====================================================
   DAILY REPORT
===================================================== */

export const getDailyReport = async (
  date
) => {
  const params = {};

  if (date) {
    params.date = date;
  }

  const response = await api.get(
    "/reports/daily",
    {
      params,
    }
  );

  return response.data;
};

/* =====================================================
   WEEKLY REPORT
===================================================== */

export const getWeeklyReport = async (
  params = {}
) => {
  const response = await api.get(
    "/reports/weekly",
    {
      params,
    }
  );

  return response.data;
};

/* =====================================================
   MONTHLY REPORT
===================================================== */

export const getMonthlyReport = async (
  month,
  year
) => {
  const params = {};

  if (month !== undefined && month !== null) {
    params.month = month;
  }

  if (year !== undefined && year !== null) {
    params.year = year;
  }

  const response = await api.get(
    "/reports/monthly",
    {
      params,
    }
  );

  return response.data;
};

/* =====================================================
   CUSTOM REPORT
===================================================== */

export const getCustomReport = async (
  from,
  to
) => {
  const params = {};

  if (from) {
    params.from = from;
  }

  if (to) {
    params.to = to;
  }

  const response = await api.get(
    "/reports/custom",
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
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getCustomReport,
};