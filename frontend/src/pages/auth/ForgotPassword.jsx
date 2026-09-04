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
  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [requestId, setRequestId] =
    useState(
      localStorage.getItem(
        "passwordResetRequestId"
      ) || ""
    );

  const [status, setStatus] =
    useState("");

  /* ======================================================
     CREATE REQUEST
  ====================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const cleanEmail =
        email.trim().toLowerCase();

      if (!cleanEmail) {
        toast.error(
          "Enter your registered email."
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
          response.data;

        if (data.requestId) {
          localStorage.setItem(
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
          error.response?.data
            ?.message ||
            "Unable to submit request."
        );
      } finally {
        setLoading(false);
      }
    };

  /* ======================================================
     CHECK STATUS
  ====================================================== */

  const checkStatus =
    async () => {
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

        setStatus(
          request.status
        );

        if (
          request.status ===
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
          request.status ===
          "rejected"
        ) {
          toast.error(
            request.rejectionReason ||
              "Your request was rejected."
          );

          return;
        }

        if (
          request.status ===
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
          error.response?.data
            ?.message ||
            error.message ||
            "Unable to check request status."
        );
      } finally {
        setLoading(false);
      }
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
        >

          <div className="form-group">

            <label>
              Registered Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="Enter your registered email"
              autoComplete="email"
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
                  : "#fef3c7",
            }}
          >
            Status:{" "}
            <strong>
              {status
                .toUpperCase()}
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