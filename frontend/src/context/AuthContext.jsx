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
    let isMounted = true;

    const loadUser = async () => {
      /*
       * Authentication is intentionally stored
       * in sessionStorage.
       *
       * Each browser tab/window has its own
       * authentication session.
       */

      const token =
        sessionStorage.getItem(
          "token"
        );

      if (!token) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }

        return;
      }

      /*
       * Restore cached user immediately.
       *
       * This improves page-refresh UX while
       * /auth/me validates the session below.
       */

      try {
        const cachedUser =
          sessionStorage.getItem(
            "user"
          );

        if (cachedUser) {
          const parsedUser =
            JSON.parse(
              cachedUser
            );

          if (
            parsedUser &&
            typeof parsedUser ===
              "object"
          ) {
            if (isMounted) {
              setUser(
                parsedUser
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "CACHED USER ERROR:",
          error.message
        );

        sessionStorage.removeItem(
          "user"
        );
      }

      /*
       * Validate the token and retrieve
       * authoritative user information
       * from the backend.
       */

      try {
        const response =
          await api.get(
            "/auth/me"
          );

        const currentUser =
          response.data?.user ||
          response.data;

        if (!currentUser) {
          throw new Error(
            "User information was not returned"
          );
        }

        if (!isMounted) {
          return;
        }

        setUser(
          currentUser
        );

        sessionStorage.setItem(
          "user",
          JSON.stringify(
            currentUser
          )
        );
      } catch (error) {
        console.error(
          "AUTH LOAD ERROR:",
          error.response?.data
            ?.message ||
            error.message ||
            error
        );

        /*
         * Invalid/expired token,
         * inactive account, or unavailable
         * authenticated session.
         *
         * Clear only this tab's session.
         */

        sessionStorage.removeItem(
          "token"
        );

        sessionStorage.removeItem(
          "user"
        );

        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  /* =====================================================
     LOGIN
  ===================================================== */

  const login = async (
    email,
    password
  ) => {
    try {
      const normalizedEmail =
        String(email || "")
          .trim()
          .toLowerCase();

      if (!normalizedEmail) {
        throw new Error(
          "Email is required"
        );
      }

      if (
        normalizedEmail.length >
        254
      ) {
        throw new Error(
          "Email address is too long"
        );
      }

      if (!password) {
        throw new Error(
          "Password is required"
        );
      }

      if (
        String(password).length >
        128
      ) {
        throw new Error(
          "Password is too long"
        );
      }

      const response =
        await api.post(
          "/auth/login",
          {
            email:
              normalizedEmail,
            password,
          }
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
       * Store authentication only
       * in the current browser tab.
       */

      sessionStorage.setItem(
        "token",
        token
      );

      sessionStorage.setItem(
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
        user: loggedInUser,
      };
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error.response?.data
          ?.message ||
          error.message ||
          error
      );

      /*
       * Clear only this tab's
       * authentication session.
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

      throw new Error(
        message
      );
    }
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = () => {
    /*
     * AuthContext is the single owner
     * of authentication state.
     */

    sessionStorage.removeItem(
      "token"
    );

    sessionStorage.removeItem(
      "user"
    );

    /*
     * Password-reset request is also
     * session-specific.
     */

    sessionStorage.removeItem(
      "passwordResetRequestId"
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