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
  const response = await api.post("/nozzles", payload);

  return response?.data ?? response;
};

/* =====================================================
   UPDATE NOZZLE
===================================================== */

export const updateNozzle = async (nozzleId, payload) => {
  const response = await api.put(
    `/nozzles/${nozzleId}`,
    payload
  );

  return response?.data ?? response;
};

/* =====================================================
   DELETE NOZZLE
===================================================== */

export const deleteNozzle = async (nozzleId) => {
  const response = await api.delete(
    `/nozzles/${nozzleId}`
  );

  return response?.data ?? response;
};

/* =====================================================
   ADD NOZZLE READING
===================================================== */

export const addNozzleReading = async (payload) => {
  const response = await api.post(
    "/nozzles/readings",
    payload
  );

  return response?.data ?? response;
};

/* =====================================================
   GET COMPLETE NOZZLE READING HISTORY

   IMPORTANT
   -----------------------------------------------------
   ReadingHistory must use this function.

   It intentionally does NOT send:
   - page
   - limit
   - date
   - shift
   - staffId
   - nozzleId
   - paymentMethod

   The ReadingHistory page receives the complete
   collection and performs filtering on the frontend.

   This is the same architecture used by
   FuelPurchaseHistory.
===================================================== */

export const getNozzleReadingHistory = async () => {
  const response = await api.get("/nozzles/readings", {
    params: {
      history: true,
    },
  });

  return response?.data ?? response;
};

/* =====================================================
   GET NOZZLE READINGS

   Existing server-side API.

   DO NOT USE THIS FROM ReadingHistory.

   Keep it for screens that specifically require
   server-side filtering/pagination.
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