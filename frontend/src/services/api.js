import axios from "axios";

/* =====================================================
   API CONFIGURATION
===================================================== */

const API_URL = import.meta.env.VITE_API_URL?.trim();

if (!API_URL) {
  throw new Error(
    "VITE_API_URL is not configured. Please add it to the Vercel environment variables."
  );
}

// Remove trailing slash to prevent duplicate "/" in API requests
const BASE_URL = API_URL.replace(/\/+$/, "");

/* =====================================================
   AXIOS INSTANCE
===================================================== */

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* =====================================================
   RESPONSE INTERCEPTOR
===================================================== */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
    }

    return Promise.reject(error);
  }
);

export default api;