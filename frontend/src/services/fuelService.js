import api from "./api";

/* ===============================
   STOCK
================================ */

export const getFuelStock = async () => {
  const response =
    await api.get("/fuel/stock");

  return response.data;
};

export const addFuelStock = async (data) => {
  const response =
    await api.post(
      "/fuel/stock",
      data
    );

  return response.data;
};

export const updateFuelStock = async (
  fuelType,
  data
) => {
  const response =
    await api.patch(
      `/fuel/stock/${fuelType}`,
      data
    );

  return response.data;
};

export const deleteFuelStock = async (
  fuelType
) => {
  const response =
    await api.delete(
      `/fuel/stock/${fuelType}`
    );

  return response.data;
};

/* ===============================
   PURCHASE
================================ */

export const getFuelPurchases = async () => {
  const response =
    await api.get(
      "/fuel/purchases"
    );

  return response.data;
};

export const addFuelPurchase =
  async (data) => {
    const response =
      await api.post(
        "/fuel/purchases",
        data
      );

    return response.data;
  };

/* ===============================
   PRICE
================================ */

export const getFuelPrice = async () => {
  const response =
    await api.get(
      "/fuel/price"
    );

  return response.data;
};

export const updateFuelPrice = async (
  data
) => {
  const response =
    await api.patch(
      "/fuel/price",
      data
    );

  return response.data;
};