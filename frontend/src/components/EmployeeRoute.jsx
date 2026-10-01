import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

const EmployeeRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div className="employee-loading">Loading...</div>;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!["staff", "employee"].includes(String(user.role || "").toLowerCase())) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default EmployeeRoute;
