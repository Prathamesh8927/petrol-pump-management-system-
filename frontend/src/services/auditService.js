import api from "./api";

/* =====================================================
   AUDIT LOGS
===================================================== */

export const getAuditLogs = async (params = {}) => {
  const response = await api.get("/audit", {
    params,
  });

  return response.data;
};

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  getAuditLogs,
};