import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import toast from "react-hot-toast";

import api from "../../services/api";

import "./Login.css";

const ResetPassword = () => {
  const { requestId } =
    useParams();

  const navigate =
    useNavigate();

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [redirecting, setRedirecting] =
    useState(false);

  /* ======================================================
     VALIDATE REQUEST ID
  ====================================================== */

  useEffect(() => {
    if (!requestId) {
      toast.error(
        "Invalid password reset request."
      );

      navigate("/forgot-password", {
        replace: true,
      });
    }
  }, [
    requestId,
    navigate,
  ]);

  /* ======================================================
     SUBMIT NEW PASSWORD
  ====================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || redirecting) {
      return;
    }

    if (!requestId) {
      toast.error(
        "Invalid password reset request."
      );
      return;
    }

    if (
      password.length < 6
    ) {
      toast.error(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (
      password.length > 128
    ) {
      toast.error(
        "Password cannot contain more than 128 characters."
      );
      return;
    }

    if (
      confirmPassword.length < 6
    ) {
      toast.error(
        "Please confirm your new password."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      toast.error(
        "Passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await api.post(
          `/password-reset/reset/${requestId}`,
          {
            password,
            confirmPassword,
          }
        );

      toast.success(
        response.data?.message ||
          "Password updated successfully."
      );

      sessionStorage.removeItem(
        "passwordResetRequestId"
      );

      setPassword("");
      setConfirmPassword("");
      setRedirecting(true);

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1200);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to update password."
      );
    } finally {
      setLoading(false);
    }
  };

  const isDisabled =
    loading ||
    redirecting;

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-header">

          <h1>
            ShivShambho
          </h1>

          <p>
            Set New Password
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
              htmlFor="new-password"
            >
              New Password
            </label>

            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Enter new password"
              autoComplete="new-password"
              minLength={6}
              maxLength={128}
              disabled={isDisabled}
              required
            />

          </div>

          <div className="form-group">

            <label
              htmlFor="confirm-password"
            >
              Confirm Password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={
                confirmPassword
              }
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Confirm new password"
              autoComplete="new-password"
              minLength={6}
              maxLength={128}
              disabled={isDisabled}
              required
            />

          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={isDisabled}
            style={{
              width: "100%",
            }}
          >
            {redirecting
              ? "Password Updated"
              : loading
              ? "Updating..."
              : "Update Password"}
          </button>

        </form>

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

export default ResetPassword;