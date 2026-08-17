import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useContext,
} from "react";

import {
  AuthContext,
} from "../context/AuthContext";

const ProtectedRoute = ({
  children,
}) => {
  const {
    user,
    loading,
  } =
    useContext(
      AuthContext
    );

  const location =
    useLocation();

  /* =====================================================
     AUTH LOADING
  ===================================================== */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          color: "#64748b",
        }}
      >
        Loading...
      </div>
    );
  }

  /* =====================================================
     NOT LOGGED IN
  ===================================================== */

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  /* =====================================================
     SUPER ADMIN

     Superadmin should use its own
     /superadmin application.
  ===================================================== */

  if (
    user.role ===
    "superadmin"
  ) {
    return (
      <Navigate
        to="/superadmin"
        replace
      />
    );
  }

  /* =====================================================
     NORMAL PUMP USERS
  ===================================================== */

  if (!user.pumpId) {
    return (
      <div
        style={{
          padding: "40px",

          textAlign:
            "center",
        }}
      >
        Pump information not assigned
        to this account.
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;