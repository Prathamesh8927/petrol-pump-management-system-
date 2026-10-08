import {
  Navigate,
  useLocation,
} from "react-router-dom";

import { useContext } from "react";

import {
  AuthContext,
} from "../context/AuthContext";

const ProtectedRoute = ({
  children,
  allowedRoles = ["owner", "manager", "staff"],
}) => {
  const {
    user,
    loading,
  } = useContext(AuthContext);

  const location = useLocation();

  const userRole = String(
    user?.role || ""
  ).trim().toLowerCase();

  const normalizedAllowedRoles = Array.isArray(
    allowedRoles
  )
    ? allowedRoles.map((role) =>
        String(role || "")
          .trim()
          .toLowerCase()
      )
    : [];

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
    const currentPath =
      location.pathname +
      location.search +
      location.hash;

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: currentPath,
        }}
      />
    );
  }

  /* =====================================================
     SUPER ADMIN

     Superadmin uses a completely separate
     application and layout.
  ===================================================== */

  if (userRole === "superadmin") {
    return (
      <Navigate
        to="/superadmin"
        replace
      />
    );
  }

  /* =====================================================
     ROLE AUTHORIZATION
  ===================================================== */

  if (
    !normalizedAllowedRoles.includes(userRole)
  ) {
    const employeeRoles = [
      "staff",
      "employee",
    ];

    return (
      <Navigate
        to={
          employeeRoles.includes(userRole)
            ? "/employee/payment"
            : "/dashboard"
        }
        replace
      />
    );
  }

  /* =====================================================
     PUMP VALIDATION

     Every normal pump account must have
     a pumpId.

     Backend authentication and RBAC remain
     the actual security boundary.
  ===================================================== */

  if (!user.pumpId) {
    const handleBackToLogin = () => {
      try {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
      } catch (error) {
        console.error(
          "Unable to clear authentication session:",
          error
        );
      }

      window.location.replace("/login");
    };

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
          textAlign: "center",
          color: "#475569",
          backgroundColor: "#f8fafc",
        }}
        role="alert"
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "20px",
              lineHeight: 1.4,
            }}
          >
            Pump information unavailable
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            This account is not assigned to
            a petrol pump. Please contact the
            administrator.
          </p>

          <button
            type="button"
            onClick={handleBackToLogin}
            style={{
              marginTop: "20px",
              padding: "10px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#0f172a",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     AUTHORIZED NORMAL USER
  ===================================================== */

  return children;
};

export default ProtectedRoute;