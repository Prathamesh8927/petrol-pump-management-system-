import api from "./api";

/* =====================================================
   PUMP SETTINGS
===================================================== */

export const getPumpSettings =
  async () => {
    const response =
      await api.get(
        "/settings/pump"
      );

    return response.data;
  };

export const updatePumpSettings =
  async (data) => {
    const response =
      await api.put(
        "/settings/pump",
        data
      );

    return response.data;
  };

/* =====================================================
   FUEL SETTINGS
===================================================== */

export const getFuelSettings =
  async () => {
    const response =
      await api.get(
        "/settings/fuel"
      );

    return response.data;
  };

export const updateFuelSettings =
  async (data) => {
    const petrolPrice =
      Number(
        data.petrolPrice
      );

    const dieselPrice =
      Number(
        data.dieselPrice
      );

    const response =
      await api.put(
        "/settings/fuel",
        {
          petrolPrice,
          dieselPrice,
        }
      );

    return response.data;
  };

/* =====================================================
   USER MANAGEMENT
===================================================== */

export const getPumpUsers =
  async () => {
    const response =
      await api.get(
        "/settings/users"
      );

    return response.data;
  };

export const addPumpUser =
  async (data) => {
    const response =
      await api.post(
        "/settings/users",
        data
      );

    return response.data;
  };

export const updatePumpUser =
  async (
    userId,
    data
  ) => {
    if (!userId) {
      throw new Error(
        "User ID is required"
      );
    }

    const response =
      await api.put(
        `/settings/users/${userId}`,
        data
      );

    return response.data;
  };

export const deletePumpUser =
  async (userId) => {
    if (!userId) {
      throw new Error(
        "User ID is required"
      );
    }

    const response =
      await api.delete(
        `/settings/users/${userId}`
      );

    return response.data;
  };

/* =====================================================
   COMPATIBILITY EXPORTS
===================================================== */

export const getUsers =
  getPumpUsers;

export const addUser =
  addPumpUser;

export const updateUser =
  updatePumpUser;

export const deleteUser =
  deletePumpUser;