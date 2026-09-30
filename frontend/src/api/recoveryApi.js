import axios from "axios";

/* =====================================================
   API BASE URL
===================================================== */

/*
 * Uses the same Vite API configuration as the main app.
 *
 * Local:
 * VITE_API_URL=http://localhost:8080/api
 *
 * Production:
 * VITE_API_URL=https://your-backend.onrender.com/api
 */

const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api";

/*
 * Prevent accidental:
 *
 * /api/api/recovery
 *
 * while still supporting:
 *
 * VITE_API_URL=http://localhost:8080
 */

const API_BASE_URL =
  RAW_API_URL.replace(/\/+$/, "").replace(
    /\/api$/i,
    ""
  );

/* =====================================================
   AXIOS INSTANCE
===================================================== */

const recoveryApi = axios.create({
  baseURL: `${API_BASE_URL}/api/recovery`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* =====================================================
   AUTH TOKEN
===================================================== */

/*
 * IMPORTANT:
 *
 * The main application stores the JWT in
 * sessionStorage.
 *
 * Recovery API MUST use the same storage.
 *
 * Do NOT use localStorage here.
 */

const TOKEN_KEY = "token";

const getAuthToken = () => {
  try {
    return sessionStorage.getItem(
      TOKEN_KEY
    );
  } catch (error) {
    console.error(
      "Recovery API: Unable to read authentication token:",
      error
    );

    return null;
  }
};

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */

recoveryApi.interceptors.request.use(
  (config) => {
    const token =
      getAuthToken();

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/* =====================================================
   RESPONSE INTERCEPTOR
===================================================== */

/*
 * Keep authentication handling consistent with the
 * rest of the application.
 */

recoveryApi.interceptors.response.use(
  (response) => response,

  (error) => {
    if (
      error?.response?.status === 401
    ) {
      /*
       * Do not automatically clear the token here.
       *
       * The main application's authentication flow
       * should handle logout/session expiry.
       */
      console.warn(
        "Recovery API: Authentication expired or unauthorized."
      );
    }

    return Promise.reject(error);
  }
);

/* =====================================================
   ERROR HANDLER
===================================================== */

const handleApiError = (error) => {
  const response =
    error?.response;

  if (response) {
    const message =
      response.data?.message ||
      response.data?.error ||
      "Recovery request failed.";

    const customError =
      new Error(message);

    customError.status =
      response.status;

    customError.data =
      response.data;

    return customError;
  }

  if (error?.request) {
    return new Error(
      "Unable to connect to the server. Please check your internet connection."
    );
  }

  return error instanceof Error
    ? error
    : new Error(
        "An unexpected error occurred."
      );
};

/* =====================================================
   GET DELETED DATA
===================================================== */

/*
 * GET /api/recovery
 *
 * Supported:
 *
 * page
 * limit
 * originalCollection
 *
 * Example:
 *
 * getDeletedData({
 *   page: 1,
 *   limit: 20,
 *   originalCollection: "LedgerCustomer"
 * })
 */

export const getDeletedData =
  async (params = {}) => {
    try {
      const response =
        await recoveryApi.get(
          "/",
          {
            params,
          }
        );

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  };

/* =====================================================
   GET ONE DELETED RECORD
===================================================== */

/*
 * GET /api/recovery/:id
 */

export const getDeletedDataById =
  async (id) => {
    if (!id) {
      throw new Error(
        "Deleted record ID is required."
      );
    }

    try {
      const response =
        await recoveryApi.get(
          `/${encodeURIComponent(id)}`
        );

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  };

/* =====================================================
   RESTORE ONE RECORD
===================================================== */

/*
 * POST /api/recovery/:id/restore
 */

export const restoreDeletedData =
  async (id) => {
    if (!id) {
      throw new Error(
        "Deleted record ID is required."
      );
    }

    try {
      const response =
        await recoveryApi.post(
          `/${encodeURIComponent(id)}/restore`
        );

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  };

/* =====================================================
   RESTORE GROUP
===================================================== */

/*
 * POST /api/recovery/group/:groupId/restore
 */

export const restoreDeletedGroup =
  async (groupId) => {
    if (!groupId) {
      throw new Error(
        "Deletion group ID is required."
      );
    }

    try {
      const response =
        await recoveryApi.post(
          `/group/${encodeURIComponent(
            groupId
          )}/restore`
        );

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  };

/* =====================================================
   PERMANENT DELETE
===================================================== */

/*
 * DELETE /api/recovery/:id
 *
 * Permanently removes only the recovery copy.
 *
 * This action cannot be undone through the
 * application.
 */

export const permanentlyDeleteDeletedData =
  async (id) => {
    if (!id) {
      throw new Error(
        "Deleted record ID is required."
      );
    }

    try {
      const response =
        await recoveryApi.delete(
          `/${encodeURIComponent(id)}`
        );

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  };

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default recoveryApi;