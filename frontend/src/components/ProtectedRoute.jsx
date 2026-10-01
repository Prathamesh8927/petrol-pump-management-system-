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
        state={{
          from:
            location.pathname +
            location.search +
            location.hash,
        }}
      />
    );
  }

  /* =====================================================
     SUPER ADMIN

     Superadmin uses a completely separate
     application and layout.
  ===================================================== */

  if (user.role === "superadmin") {
    return (
      <Navigate
        to="/superadmin"
        replace
      />
    );
  }

  if (!allowedRoles.includes(String(user.role || "").toLowerCase())) {
    return (
      <Navigate
        to={["staff", "employee"].includes(String(user.role || "").toLowerCase()) ? "/employee/payment" : "/dashboard"}
        replace
      />
    );
  }

  /* =====================================================
     NORMAL PUMP USERS

     Every non-superadmin account must belong
     to an active/assigned pump.

     Backend authentication remains the actual
     security boundary.
  ===================================================== */

  if (!user.pumpId) {
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
            onClick={() => {
              sessionStorage.removeItem(
                "token"
              );

              sessionStorage.removeItem(
                "user"
              );

              window.location.replace(
                "/login"
              );
            }}
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