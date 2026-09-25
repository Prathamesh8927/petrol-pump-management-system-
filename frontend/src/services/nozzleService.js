import api from "./api";

/* =====================================================
   GET NOZZLES
===================================================== */

export const getNozzles = async () => {
  const response = await api.get("/nozzles");

  return response?.data ?? response;
};

/* =====================================================
   ADD NOZZLE
===================================================== */

export const addNozzle = async (payload) => {
  const response = await api.post(
    "/nozzles",
    payload
  );

  return response?.data ?? response;
};

/* =====================================================
   UPDATE NOZZLE
===================================================== */

export const updateNozzle = async (
  nozzleId,
  payload
) => {
  const response = await api.put(
    `/nozzles/${nozzleId}`,
    payload
  );

  return response?.data ?? response;
};

/* =====================================================
   DELETE NOZZLE
===================================================== */

export const deleteNozzle = async (
  nozzleId
) => {
  const response = await api.delete(
    `/nozzles/${nozzleId}`
  );

  return response?.data ?? response;
};

/* =====================================================
   ADD NOZZLE READING
===================================================== */

export const addNozzleReading = async (
  payload
) => {
  const response = await api.post(
    "/nozzles/readings",
    payload
  );

  return response?.data ?? response;
};

/* =====================================================
   GET NOZZLE READING HISTORY
 *
 * Server-side pagination + filtering.
 *
 * Example:
 *
 * getNozzleReadings({
 *   page: 1,
 *   limit: 50,
 *   date: "2026-09-25",
 *   shift: "morning",
 *   staffId: "...",
 *   nozzleId: "...",
 *   paymentMethod: "cash"
 * });
===================================================== */

export const getNozzleReadings = async ({
  page = 1,
  limit = 50,
  date = "",
  shift = "",
  staffId = "",
  nozzleId = "",
  paymentMethod = "",
} = {}) => {
  const params = {
    page,
    limit,
  };

  if (date) {
    params.date = date;
  }

  if (shift) {
    params.shift = shift;
  }

  if (staffId) {
    params.staffId = staffId;
  }

  if (nozzleId) {
    params.nozzleId = nozzleId;
  }

  if (paymentMethod) {
    params.paymentMethod = paymentMethod;
  }

  const response = await api.get(
    "/nozzles/readings",
    {
      params,
    }
  );

  return response?.data ?? response;
};