import api from "./api";

/* =====================================================
   PUMP SETTINGS
===================================================== */

export const getPumpSettings = async () => {
  const response = await api.get(
    "/settings/pump"
  );

  return response.data;
};

export const updatePumpSettings = async (
  data
) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Pump settings data is required."
    );
  }

  const response = await api.put(
    "/settings/pump",
    data
  );

  return response.data;
};

/* =====================================================
   FUEL SETTINGS
===================================================== */

export const getFuelSettings = async () => {
  const response = await api.get(
    "/settings/fuel"
  );

  return response.data;
};

export const updateFuelSettings = async (
  data
) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "Fuel settings data is required."
    );
  }

  const petrolPrice = Number(
    data.petrolPrice
  );

  const dieselPrice = Number(
    data.dieselPrice
  );

  if (
    !Number.isFinite(petrolPrice) ||
    petrolPrice < 0
  ) {
    throw new Error(
      "Petrol price must be a valid number."
    );
  }

  if (
    !Number.isFinite(dieselPrice) ||
    dieselPrice < 0
  ) {
    throw new Error(
      "Diesel price must be a valid number."
    );
  }

  const response = await api.put(
    "/settings/fuel",
    {
      petrolPrice,
      dieselPrice,
    }
  );

  return response.data;
};

/* =====================================================
   PAYMENT SETTINGS
===================================================== */

export const getPaymentSettings =
  async () => {
    const response = await api.get(
      "/settings/payment"
    );

    return response.data;
  };

export const updatePaymentSettings =
  async (data) => {
    if (!data || typeof data !== "object") {
      throw new Error(
        "Payment settings data is required."
      );
    }

    const response = await api.put(
      "/settings/payment",
      data
    );

    return response.data;
  };

/* =====================================================
   BANK ACCOUNT SETTINGS
===================================================== */

export const getBankAccountSettings =
  async () => {
    const response = await api.get(
      "/settings/bank"
    );

    return response.data;
  };

export const updateBankAccountSettings =
  async (data) => {
    if (!data || typeof data !== "object") {
      throw new Error(
        "Bank account settings data is required."
      );
    }

    const response = await api.put(
      "/settings/bank",
      data
    );

    return response.data;
  };

/* =====================================================
   USER MANAGEMENT
===================================================== */

export const getPumpUsers = async () => {
  const response = await api.get(
    "/settings/users"
  );

  return response.data;
};

export const addPumpUser = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "User data is required."
    );
  }

  const response = await api.post(
    "/settings/users",
    data
  );

  return response.data;
};

export const updatePumpUser = async (
  userId,
  data
) => {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "User update data is required."
    );
  }

  const response = await api.put(
    `/settings/users/${encodeURIComponent(
      userId
    )}`,
    data
  );

  return response.data;
};

export const deletePumpUser = async (
  userId
) => {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const response = await api.delete(
    `/settings/users/${encodeURIComponent(
      userId
    )}`
  );

  return response.data;
};

/* =====================================================
   COMPATIBILITY EXPORTS
===================================================== */

export const getUsers = getPumpUsers;
export const addUser = addPumpUser;
export const updateUser = updatePumpUser;
export const deleteUser = deletePumpUser;

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  getPumpSettings,
  updatePumpSettings,

  getFuelSettings,
  updateFuelSettings,

  getPaymentSettings,
  updatePaymentSettings,

  getBankAccountSettings,
  updateBankAccountSettings,

  getPumpUsers,
  addPumpUser,
  updatePumpUser,
  deletePumpUser,

  getUsers,
  addUser,
  updateUser,
  deleteUser,
};