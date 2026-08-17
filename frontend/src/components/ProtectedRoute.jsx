import {
  useContext,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import {
  AuthContext,
} from "../context/AuthContext";

const ProtectedRoute = ({
  children,
}) => {
  const auth =
    useContext(
      AuthContext
    );

  if (!auth) {
    return (
      <div>
        Authentication context
        not available.
      </div>
    );
  }

  const {
    user,
    loading,
  } = auth;

  if (loading) {
    return (
      <div
        style={{
          padding: "30px",
          textAlign:
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

  return children;
};

export default ProtectedRoute;