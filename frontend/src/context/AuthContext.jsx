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
  const [
    user,
    setUser,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* =====================================================
     LOAD CURRENT USER
  ===================================================== */

  useEffect(() => {
    const loadUser =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "token"
            );

          if (!token) {
            setUser(null);
            return;
          }

          const response =
            await api.get(
              "/auth/me"
            );

          const currentUser =
            response.data?.user ||
            response.data;

          if (!currentUser) {
            throw new Error(
              "User not found"
            );
          }

          setUser(
            currentUser
          );

          localStorage.setItem(
            "user",
            JSON.stringify(
              currentUser
            )
          );
        } catch (error) {
          console.error(
            "AUTH LOAD ERROR:",
            error
          );

          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
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
            email:
              String(
                email
              )
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
          response.data
            ?.message ||
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

      localStorage.setItem(
        "token",
        token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          loggedInUser
        )
      );

      setUser(
        loggedInUser
      );

      return {
        success: true,
        token,
        user:
          loggedInUser,
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

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      setUser(null);

      const message =
        error.response?.data
          ?.message ||
        error.message ||
        "Login failed";

      throw new Error(
        message
      );
    }
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = () => {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
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