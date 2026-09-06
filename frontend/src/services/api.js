import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL?.trim();

if (!API_URL) {
  throw new Error(
    "VITE_API_URL is not configured. Please add it to the Vercel environment variables."
  );
}

const BASE_URL =
  API_URL.replace(/\/+$/, "");

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/* =====================================================
   AUTH TOKEN
===================================================== */

api.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("token");

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) =>
    Promise.reject(error)
);

/* =====================================================
   AUTH ERROR
===================================================== */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401
    ) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
    }

    return Promise.reject(error);
  }
);

export default api;