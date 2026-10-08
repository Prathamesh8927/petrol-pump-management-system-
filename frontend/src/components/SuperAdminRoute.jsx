import {
  useContext,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import {
  AuthContext,
} from "../context/AuthContext";

const SuperAdminRoute = ({
  children,
}) => {
  const {
    user,
    loading,
  } = useContext(AuthContext);

  const userRole = String(
    user?.role || ""
  ).trim().toLowerCase();

  /* =====================================================
     AUTH LOADING
  ===================================================== */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          boxSizing: "border-box",
          color: "#64748b",
          backgroundColor: "#f8fafc",
          fontSize: "16px",
        }}
        role="status"
        aria-live="polite"
      >
        Loading...
      </div>
    );
  }

  /* =====================================================
     NOT AUTHENTICATED
  ===================================================== */

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /* =====================================================
     SUPER ADMIN AUTHORIZATION
  ===================================================== */

  if (userRole !== "superadmin") {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  /* =====================================================
     AUTHORIZED SUPER ADMIN
  ===================================================== */

  return children;
};

export default SuperAdminRoute;