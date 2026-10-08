import axios from "axios";

/* =====================================================
   API BASE URL
===================================================== */

const configuredApiUrl =
  import.meta.env.VITE_API_URL?.trim();

if (!configuredApiUrl) {
  throw new Error(
    "VITE_API_URL is missing. Set it in your frontend .env file."
  );
}

/*
 * Remove trailing slashes.
 *
 * Supported:
 *
 * VITE_API_URL=http://localhost:8080
 * VITE_API_URL=http://localhost:8080/
 * VITE_API_URL=https://your-backend.onrender.com
 * VITE_API_URL=https://your-backend.onrender.com/api
 */
const normalizedApiUrl =
  configuredApiUrl.replace(/\/+$/, "");

/*
 * Automatically add /api when it is
 * not already included.
 */
const BASE_URL = /\/api$/i.test(normalizedApiUrl)
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

/* =====================================================
   AXIOS INSTANCE
===================================================== */

const api = axios.create({
  baseURL: BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },

  timeout: 30000,
});

/* =====================================================
   AUTH TOKEN
===================================================== */

const getAuthToken = () => {
  try {
    const token = sessionStorage.getItem("token");

    if (typeof token === "string" && token.trim()) {
      return token.trim();
    }

    return null;
  } catch (error) {
    console.error(
      "Unable to read authentication token:",
      error
    );

    return null;
  }
};

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();

    /*
     * AxiosHeaders is normally available here,
     * but this also keeps compatibility with plain
     * header objects.
     */
    if (!config.headers) {
      config.headers = {};
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    /* -----------------------------------------------
       Development logging only
    ------------------------------------------------ */

    if (import.meta.env.DEV) {
      console.log("[API REQUEST]", {
        method: config.method?.toUpperCase(),
        url: `${config.baseURL || ""}${config.url || ""}`,
        hasToken: Boolean(token),
        hasAuthorizationHeader: Boolean(
          config.headers?.Authorization
        ),
      });
    }

    return config;
  },
  (error) => {
    console.error(
      "[API REQUEST ERROR]",
      error
    );

    return Promise.reject(error);
  }
);

/* =====================================================
   RESPONSE INTERCEPTOR
===================================================== */

api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(
        "[API RESPONSE]",
        response.status,
        response.config?.url
      );
    }

    return response;
  },

  (error) => {
    const status = error.response?.status;

    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong.";

    if (import.meta.env.DEV) {
      console.error("[API ERROR]", {
        status,
        url: error.config?.url,
        method:
          error.config?.method?.toUpperCase(),
        message: errorMessage,
        code: error.response?.data?.code,
      });
    }

    /*
     * Clear invalid authentication.
     *
     * Do not redirect here because routing belongs
     * to AuthContext / ProtectedRoute.
     */
    if (status === 401) {
      try {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
      } catch (storageError) {
        console.error(
          "Unable to clear authentication:",
          storageError
        );
      }
    }

    return Promise.reject(error);
  }
);

/* =====================================================
   EXPORT
===================================================== */

export default api;