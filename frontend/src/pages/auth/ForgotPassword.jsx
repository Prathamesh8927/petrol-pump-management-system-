import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import toast from "react-hot-toast";

import api from "../../services/api";

import "./Login.css";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [requestId, setRequestId] =
    useState(
      sessionStorage.getItem(
        "passwordResetRequestId"
      ) || ""
    );

  const [status, setStatus] =
    useState("");

  /* ======================================================
     CREATE PASSWORD RESET REQUEST
  ====================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error(
        "Enter your registered email."
      );
      return;
    }

    if (cleanEmail.length > 254) {
      toast.error(
        "Email address is too long."
      );
      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      toast.error(
        "Enter a valid email address."
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await api.post(
          "/password-reset/request",
          {
            email: cleanEmail,
          }
        );

      const data =
        response.data || {};

      if (data.requestId) {
        sessionStorage.setItem(
          "passwordResetRequestId",
          data.requestId
        );

        setRequestId(
          data.requestId
        );
      }

      setStatus(
        data.status || "pending"
      );

      toast.success(
        data.message ||
          "Password reset request submitted."
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to submit request."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     CHECK PASSWORD RESET STATUS
  ====================================================== */

  const checkStatus = async () => {
    if (loading) return;

    if (!requestId) {
      toast.error(
        "No password reset request found."
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await api.get(
          `/password-reset/status/${requestId}`
        );

      const request =
        response.data?.request;

      if (!request) {
        throw new Error(
          "Request information unavailable."
        );
      }

      const currentStatus =
        String(
          request.status || ""
        ).toLowerCase();

      setStatus(
        currentStatus
      );

      if (
        currentStatus ===
        "approved"
      ) {
        toast.success(
          "Request approved. You can now set a new password."
        );

        navigate(
          `/reset-password/${requestId}`
        );

        return;
      }

      if (
        currentStatus ===
        "rejected"
      ) {
        toast.error(
          request.rejectionReason ||
            "Your request was rejected."
        );

        return;
      }

      if (
        currentStatus ===
        "completed"
      ) {
        toast.success(
          "This password reset request has already been completed."
        );

        return;
      }

      toast(
        "Your request is still waiting for Super Admin approval."
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Unable to check request status."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     CLEAR SAVED RESET REQUEST
  ====================================================== */

  const clearRequest = () => {
    sessionStorage.removeItem(
      "passwordResetRequestId"
    );

    setRequestId("");
    setStatus("");
    setEmail("");

    toast.success(
      "Saved reset request cleared."
    );
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <h1>
            ShivShambho
          </h1>

          <p>
            Forgot Password
          </p>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          noValidate
        >
          <div className="form-group">

            <label
              htmlFor="forgot-password-email"
            >
              Registered Email
            </label>

            <input
              id="forgot-password-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="Enter your registered email"
              autoComplete="email"
              maxLength={254}
              disabled={loading}
              required
            />

          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
            style={{
              width: "100%",
            }}
          >
            {loading
              ? "Submitting..."
              : "Request Password Change"}
          </button>
        </form>

        {requestId && (
          <div
            style={{
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              className="primary-button"
              onClick={
                checkStatus
              }
              disabled={loading}
              style={{
                width: "100%",
              }}
            >
              {loading
                ? "Checking..."
                : "Check Approval Status"}
            </button>

            <button
              type="button"
              onClick={
                clearRequest
              }
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "10px",
                background: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              Use Another Email
            </button>
          </div>
        )}

        {status && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "8px",
              textAlign: "center",
              background:
                status === "approved"
                  ? "#dcfce7"
                  : status === "rejected"
                  ? "#fee2e2"
                  : status === "completed"
                  ? "#e0f2fe"
                  : "#fef3c7",
            }}
          >
            Status:{" "}
            <strong>
              {status.toUpperCase()}
            </strong>
          </div>
        )}

        <div
          className="login-register"
          style={{
            marginTop: "20px",
          }}
        >
          <Link
            to="/login"
            className="register-link"
          >
            Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;