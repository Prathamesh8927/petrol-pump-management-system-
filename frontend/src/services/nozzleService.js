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
  if (!payload || typeof payload !== "object") {
    throw new Error("Nozzle data is required.");
  }

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
  if (!nozzleId) {
    throw new Error("Nozzle ID is required.");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Nozzle update data is required.");
  }

  const response = await api.put(
    `/nozzles/${encodeURIComponent(nozzleId)}`,
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
  if (!nozzleId) {
    throw new Error("Nozzle ID is required.");
  }

  const response = await api.delete(
    `/nozzles/${encodeURIComponent(nozzleId)}`
  );

  return response?.data ?? response;
};

/* =====================================================
   ADD NOZZLE READING
===================================================== */

export const addNozzleReading = async (
  payload
) => {
  if (!payload || typeof payload !== "object") {
    throw new Error(
      "Nozzle reading data is required."
    );
  }

  const response = await api.post(
    "/nozzles/readings",
    payload
  );

  return response?.data ?? response;
};

/* =====================================================
   UPDATE NOZZLE READING
===================================================== */

export const updateNozzleReading = async (
  readingId,
  payload
) => {
  if (!readingId) {
    throw new Error(
      "Reading ID is required for update."
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new Error(
      "Nozzle reading update data is required."
    );
  }

  const response = await api.put(
    `/nozzles/readings/${encodeURIComponent(
      readingId
    )}`,
    payload
  );

  return response?.data ?? response;
};

/* =====================================================
   GET COMPLETE NOZZLE READING HISTORY

   ReadingHistory uses this function.

   The history flag is intentionally preserved
   for compatibility with the existing backend.
===================================================== */

export const getNozzleReadingHistory =
  async () => {
    const response = await api.get(
      "/nozzles/readings",
      {
        params: {
          history: true,
        },
      }
    );

    return response?.data ?? response;
  };

/* =====================================================
   GET NOZZLE READINGS

   Supports server-side:
   - pagination
   - date
   - shift
   - staff
   - nozzle
   - payment method
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

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  getNozzles,
  addNozzle,
  updateNozzle,
  deleteNozzle,

  addNozzleReading,
  updateNozzleReading,

  getNozzleReadingHistory,
  getNozzleReadings,
};