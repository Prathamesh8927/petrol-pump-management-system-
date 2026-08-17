import {
  Navigate,
} from "react-router-dom";

import {
  useContext,
} from "react";

import {
  AuthContext,
} from "../context/AuthContext";

const SuperAdminRoute = ({
  children,
}) => {
  const {
    user,
    loading,
  } =
    useContext(
      AuthContext
    );

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    user.role !==
    "superadmin"
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
};

export default SuperAdminRoute;