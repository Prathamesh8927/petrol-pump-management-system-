
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
 *   VITE_API_URL=http://localhost:8080
 *   VITE_API_URL=http://localhost:8080/
 *   VITE_API_URL=https://your-backend.onrender.com
 *   VITE_API_URL=https://your-backend.onrender.com/api
 */
const normalizedApiUrl =
  configuredApiUrl.replace(/\/+$/, "");

/*
 * Automatically add /api when it is not
 * already included in VITE_API_URL.
 */
const BASE_URL =
  /\/api$/i.test(normalizedApiUrl)
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
   GET AUTH TOKEN
===================================================== */

const getAuthToken = () => {
  try {
    const token =
      sessionStorage.getItem("token");

    if (
      token &&
      token.trim()
    ) {
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
    const token =
      getAuthToken();

    if (!config.headers) {
      config.headers = {};
    }

    /*
     * Attach JWT automatically.
     */
    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    /*
     * Development logging.
     */
    if (import.meta.env.DEV) {
      console.log(
        "[API REQUEST]",
        {
          method:
            config.method?.toUpperCase(),

          url:
            `${config.baseURL || ""}${
              config.url || ""
            }`,

          hasToken:
            Boolean(token),

          hasAuthorizationHeader:
            Boolean(
              config.headers
                .Authorization
            ),
        }
      );
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
    const status =
      error.response?.status;

    console.error(
      "[API ERROR]",
      {
        status,

        url:
          error.config?.url,

        method:
          error.config?.method?.toUpperCase(),

        message:
          error.response?.data
            ?.message ||
          error.message,

        code:
          error.response?.data
            ?.code,
      }
    );

    /*
     * Clear invalid authentication.
     */
    if (status === 401) {
      sessionStorage.removeItem(
        "token"
      );

      sessionStorage.removeItem(
        "user"
      );
    }

    return Promise.reject(error);
  }
);

/* =====================================================
   EXPORT
===================================================== */

export default api;
