import {
  useContext,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  AuthContext,
} from "../context/AuthContext";

const EMPLOYEE_ROLES = [
  "staff",
  "employee",
];

const EmployeeRoute = ({
  children,
}) => {
  const {
    user,
    loading,
  } = useContext(AuthContext);

  const location = useLocation();

  const userRole = String(
    user?.role || ""
  ).trim().toLowerCase();

  /* =====================================================
     AUTH LOADING
  ===================================================== */

  if (loading) {
    return (
      <div
        className="employee-loading"
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
     EMPLOYEE / STAFF AUTHORIZATION
  ===================================================== */

  if (!EMPLOYEE_ROLES.includes(userRole)) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  /* =====================================================
     AUTHORIZED EMPLOYEE
  ===================================================== */

  return children;
};

export default EmployeeRoute;