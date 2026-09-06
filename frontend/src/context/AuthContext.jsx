import {
  createContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

export const AuthContext =
  createContext(null);

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  /* =====================================================
     LOAD CURRENT USER
  ===================================================== */

  useEffect(() => {
    const loadUser = async () => {
      try {
        /*
         * sessionStorage is intentionally used here.
         *
         * Each browser tab/window gets its own authentication
         * session, allowing multiple accounts to work at the
         * same time.
         */

        const token =
          sessionStorage.getItem("token");

        if (!token) {
          setUser(null);
          return;
        }

        const response =
          await api.get("/auth/me");

        const currentUser =
          response.data?.user ||
          response.data;

        if (!currentUser) {
          throw new Error(
            "User not found"
          );
        }

        setUser(currentUser);

        sessionStorage.setItem(
          "user",
          JSON.stringify(currentUser)
        );
      } catch (error) {
        console.error(
          "AUTH LOAD ERROR:",
          error
        );

        sessionStorage.removeItem(
          "token"
        );

        sessionStorage.removeItem(
          "user"
        );

        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  /* =====================================================
     LOGIN
  ===================================================== */

  const login = async (
    email,
    password
  ) => {
    try {
      console.log(
        "LOGIN REQUEST:",
        email
      );

      const response =
        await api.post(
          "/auth/login",
          {
            email: String(email)
              .trim()
              .toLowerCase(),

            password,
          }
        );

      console.log(
        "LOGIN RESPONSE:",
        response.data
      );

      if (
        response.data?.success ===
        false
      ) {
        throw new Error(
          response.data?.message ||
            "Login failed"
        );
      }

      const token =
        response.data?.token;

      const loggedInUser =
        response.data?.user;

      if (!token) {
        throw new Error(
          "Login token was not returned"
        );
      }

      if (!loggedInUser) {
        throw new Error(
          "User information was not returned"
        );
      }

      /*
       * IMPORTANT:
       * Store authentication only in this tab.
       */

      sessionStorage.setItem(
        "token",
        token
      );

      sessionStorage.setItem(
        "user",
        JSON.stringify(loggedInUser)
      );

      setUser(loggedInUser);

      return {
        success: true,
        token,
        user: loggedInUser,
      };
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      console.error(
        "LOGIN STATUS:",
        error.response?.status
      );

      console.error(
        "LOGIN SERVER RESPONSE:",
        error.response?.data
      );

      /*
       * Clear only THIS TAB'S session.
       *
       * Other tabs/accounts remain logged in.
       */

      sessionStorage.removeItem(
        "token"
      );

      sessionStorage.removeItem(
        "user"
      );

      setUser(null);

      const message =
        error.response?.data
          ?.message ||
        error.message ||
        "Login failed";

      throw new Error(message);
    }
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = () => {
    /*
     * Remove authentication only from
     * the current browser tab.
     */

    sessionStorage.removeItem(
      "token"
    );

    sessionStorage.removeItem(
      "user"
    );

    setUser(null);
  };

  /* =====================================================
     CONTEXT
  ===================================================== */

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,

        isAuthenticated:
          Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};