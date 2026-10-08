import api from "./api";

/* =====================================================
   FUEL STOCK
===================================================== */

export const getFuelStock = async () => {
  const response = await api.get(
    "/fuel/stock"
  );

  return response.data;
};

export const addFuelStock = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Fuel stock data is required."
    );
  }

  const response = await api.post(
    "/fuel/stock",
    data
  );

  return response.data;
};

export const updateFuelStock = async (
  fuelType,
  data
) => {
  if (!fuelType) {
    throw new Error(
      "Fuel type is required."
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "Fuel stock update data is required."
    );
  }

  const response = await api.patch(
    `/fuel/stock/${encodeURIComponent(
      fuelType
    )}`,
    data
  );

  return response.data;
};

export const deleteFuelStock = async (
  fuelType
) => {
  if (!fuelType) {
    throw new Error(
      "Fuel type is required."
    );
  }

  const response = await api.delete(
    `/fuel/stock/${encodeURIComponent(
      fuelType
    )}`
  );

  return response.data;
};

/* =====================================================
   FUEL PURCHASES
===================================================== */

export const getFuelPurchases = async () => {
  const response = await api.get(
    "/fuel/purchases"
  );

  return response.data;
};

export const addFuelPurchase = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Fuel purchase data is required."
    );
  }

  const response = await api.post(
    "/fuel/purchases",
    data
  );

  return response.data;
};

/* =====================================================
   FUEL PRICE
===================================================== */

export const getFuelPrice = async () => {
  const response = await api.get(
    "/fuel/price"
  );

  return response.data;
};

export const updateFuelPrice = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Fuel price data is required."
    );
  }

  const response = await api.patch(
    "/fuel/price",
    data
  );

  return response.data;
};

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  getFuelStock,
  addFuelStock,
  updateFuelStock,
  deleteFuelStock,

  getFuelPurchases,
  addFuelPurchase,

  getFuelPrice,
  updateFuelPrice,
};