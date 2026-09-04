import {
  useContext,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  AuthContext,
} from "../../context/AuthContext";

import api from "../../services/api";

import LoginTankerAnimation
  from "../../components/LoginTankerAnimation";

import "./Login.css";

/* =====================================================
   LOGIN
===================================================== */

const Login = () => {
  const navigate = useNavigate();

  const auth =
    useContext(AuthContext);

  if (!auth) {
    throw new Error(
      "Login must be used inside AuthProvider"
    );
  }

  const { login } = auth;

  /* =====================================================
     FORM
  ===================================================== */

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /* =====================================================
     TANKER
  ===================================================== */

  const [showTanker, setShowTanker] =
    useState(false);

  const [pumpName, setPumpName] =
    useState("MyPump");

  /* =====================================================
     LOAD PUMP NAME
  ===================================================== */

  const loadPumpName = async () => {
    try {
      const response =
        await api.get(
          "/settings/pump"
        );

      const settings =
        response.data?.pump ||
        response.data?.settings ||
        response.data;

      const name =
        settings?.pumpName ||
        settings?.name ||
        settings?.stationName ||
        "";

      return name
        ? String(name)
        : "MyPump";
    } catch (error) {
      console.error(
        "LOAD LOGIN PUMP NAME ERROR:",
        error
      );

      return "MyPump";
    }
  };

  /* =====================================================
     LOGIN
  ===================================================== */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error(
        "Enter your email"
      );
      return;
    }

    if (!password) {
      toast.error(
        "Enter your password"
      );
      return;
    }

    try {
      setLoading(true);

      const result =
        await login(
          cleanEmail,
          password
        );

      const loggedInUser =
        result?.user;

      console.log(
        "LOGGED IN USER:",
        loggedInUser
      );

      if (!loggedInUser) {
        throw new Error(
          "User information was not returned"
        );
      }

      /* ===============================================
         SUPER ADMIN
      =============================================== */

      if (
        loggedInUser.role ===
        "superadmin"
      ) {
        setPumpName(
          "MyPump Super Admin"
        );

        toast.success(
          "Super Admin login successful"
        );

        setShowTanker(true);

        setTimeout(() => {
          navigate(
            "/superadmin",
            {
              replace: true,
            }
          );
        }, 4300);

        return;
      }

      /* ===============================================
         CLIENT
      =============================================== */

      const currentPumpName =
        await loadPumpName();

      setPumpName(
        currentPumpName
      );

      toast.success(
        "Login successful"
      );

      setShowTanker(true);

      setTimeout(() => {
        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      }, 4300);
    } catch (error) {
      console.error(
        "LOGIN PAGE ERROR:",
        error
      );

      toast.error(
        error.response?.data
          ?.message ||
          error.message ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <>
      <div className="login-page">

        <div className="login-card">

          <div className="login-header">

            <h1>
              MyPump
            </h1>

            <p>
              Petrol Pump Management System
            </p>

          </div>

          <form
            onSubmit={
              handleSubmit
            }
          >

            {/* EMAIL */}

            <div className="form-group">

              <label>
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="Enter your email"
                autoComplete="email"
                disabled={
                  loading ||
                  showTanker
                }
                required
              />

            </div>

            {/* PASSWORD */}

            <div className="form-group">

              <label>
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={
                  loading ||
                  showTanker
                }
                required
              />

            </div>

            {/* LOGIN */}

            <button
              type="submit"
              className="primary-button"
              disabled={
                loading ||
                showTanker
              }
              style={{
                width: "100%",
              }}
            >
              {loading
                ? "Signing in..."
                : "Login"}
            </button>

          </form>

          {/* ===========================================
              CREATE ACCOUNT
          =========================================== */}

          <div className="login-register">

            <span>
              Don't have an account?
            </span>

            <Link
              to="/register"
              className="register-link"
            >
              Create Account
            </Link>

          </div>

          {/* ===========================================
              SUPER ADMIN
          =========================================== */}

          <div className="login-admin-note">

            <span>
              Super Admin access is restricted
              to authorized administrators.
            </span>

          </div>

        </div>

      </div>

      <LoginTankerAnimation
        show={showTanker}
        pumpName={pumpName}
      />
    </>
  );
};

export default Login;