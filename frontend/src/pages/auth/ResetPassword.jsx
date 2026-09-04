import {
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
  const {
    requestId,
  } = useParams();

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

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        password.length < 6
      ) {
        toast.error(
          "Password must contain at least 6 characters."
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

        localStorage.removeItem(
          "passwordResetRequestId"
        );

        setTimeout(() => {
          navigate(
            "/login",
            {
              replace: true,
            }
          );
        }, 1200);
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to update password."
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
            MyPump
          </h1>

          <p>
            Set New Password
          </p>

        </div>

        <form
          onSubmit={
            handleSubmit
          }
        >

          <div className="form-group">

            <label>
              New Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Enter new password"
              autoComplete="new-password"
              disabled={loading}
              required
            />

          </div>

          <div className="form-group">

            <label>
              Confirm Password
            </label>

            <input
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