import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

/* =====================================================
   AUTH CONTEXT
===================================================== */

export const AuthContext =
  createContext(null);

/* =====================================================
   SESSION STORAGE HELPERS
===================================================== */

const getSessionItem = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.error(
      `Unable to read sessionStorage key "${key}":`,
      error
    );

    return null;
  }
};

const setSessionItem = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(
      `Unable to write sessionStorage key "${key}":`,
      error
    );

    return false;
  }
};

const removeSessionItem = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error(
      `Unable to remove sessionStorage key "${key}":`,
      error
    );
  }
};

/* =====================================================
   AUTH PROVIDER
===================================================== */

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
       * This keeps authentication isolated
       * per browser tab/window.
       */

      const token =
        getSessionItem("token");

      if (!token?.trim()) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }

        return;
      }

      /* -----------------------------------------------
         RESTORE CACHED USER
      ------------------------------------------------ */

      const cachedUser =
        getSessionItem("user");

      if (cachedUser) {
        try {
          const parsedUser =
            JSON.parse(cachedUser);

          if (
            parsedUser &&
            typeof parsedUser === "object" &&
            !Array.isArray(parsedUser)
          ) {
            if (isMounted) {
              setUser(parsedUser);
            }
          } else {
            removeSessionItem("user");
          }
        } catch (error) {
          console.error(
            "CACHED USER ERROR:",
            error
          );

          removeSessionItem("user");
        }
      }

      /* -----------------------------------------------
         VALIDATE TOKEN WITH BACKEND
      ------------------------------------------------ */

      try {
        const response =
          await api.get("/auth/me");

        const currentUser =
          response.data?.user ||
          response.data;

        if (
          !currentUser ||
          typeof currentUser !== "object"
        ) {
          throw new Error(
            "User information was not returned."
          );
        }

        if (!isMounted) {
          return;
        }

        /*
         * Backend is authoritative.
         * Replace cached user with current user.
         */
        setUser(currentUser);

        setSessionItem(
          "user",
          JSON.stringify(currentUser)
        );
      } catch (error) {
        /*
         * Do not keep an invalid/expired
         * authentication session.
         */

        if (import.meta.env.DEV) {
          console.error(
            "AUTH LOAD ERROR:",
            error.response?.data?.message ||
              error.message ||
              error
          );
        }

        removeSessionItem("token");
        removeSessionItem("user");

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

  const login = useCallback(
    async (email, password) => {
      try {
        const normalizedEmail =
          String(email || "")
            .trim()
            .toLowerCase();

        /* ---------------------------------------------
           INPUT VALIDATION
        --------------------------------------------- */

        if (!normalizedEmail) {
          throw new Error(
            "Email is required."
          );
        }

        if (normalizedEmail.length > 254) {
          throw new Error(
            "Email address is too long."
          );
        }

        if (!password) {
          throw new Error(
            "Password is required."
          );
        }

        if (String(password).length > 128) {
          throw new Error(
            "Password is too long."
          );
        }

        /* ---------------------------------------------
           LOGIN REQUEST
        --------------------------------------------- */

        const response =
          await api.post(
            "/auth/login",
            {
              email: normalizedEmail,
              password,
            }
          );

        if (
          response.data?.success === false
        ) {
          throw new Error(
            response.data?.message ||
              "Login failed."
          );
        }

        const token =
          response.data?.token;

        const loggedInUser =
          response.data?.user;

        if (!token) {
          throw new Error(
            "Login token was not returned."
          );
        }

        if (
          !loggedInUser ||
          typeof loggedInUser !== "object"
        ) {
          throw new Error(
            "User information was not returned."
          );
        }

        /* ---------------------------------------------
           STORE CURRENT SESSION
        --------------------------------------------- */

        setSessionItem(
          "token",
          token
        );

        setSessionItem(
          "user",
          JSON.stringify(
            loggedInUser
          )
        );

        if (loggedInUser) {
          setUser(loggedInUser);
        }

        return {
          success: true,
          token,
          user: loggedInUser,
        };
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            "LOGIN ERROR:",
            error.response?.data?.message ||
              error.message ||
              error
          );
        }

        /*
         * Login failure must never leave
         * a partially authenticated session.
         */

        removeSessionItem("token");
        removeSessionItem("user");

        setUser(null);

        const message =
          error.response?.data?.message ||
          error.message ||
          "Login failed.";

        throw new Error(message);
      }
    },
    []
  );

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = useCallback(() => {
    /*
     * AuthContext is the single owner
     * of authentication state.
     */

    removeSessionItem("token");
    removeSessionItem("user");

    /*
     * Clear session-specific application
     * state associated with authentication.
     */

    removeSessionItem(
      "passwordResetRequestId"
    );

    removeSessionItem(
      "shivshambho_active_payment"
    );

    removeSessionItem(
      "activePayment"
    );

    setUser(null);
  }, []);

  /* =====================================================
     CONTEXT VALUE
  ===================================================== */

  const contextValue = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(user),
    }),
    [
      user,
      loading,
      login,
      logout,
    ]
  );

  /* =====================================================
     PROVIDER
  ===================================================== */

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
};