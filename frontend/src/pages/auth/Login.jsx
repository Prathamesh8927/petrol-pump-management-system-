import {
  useContext,
  useEffect,
  useRef,
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

import logo from "../../assets/logo.png";

import "./Login.css";

/* =====================================================
   LOGIN
===================================================== */

const Login = () => {
  const navigate =
    useNavigate();

  const auth =
    useContext(AuthContext);

  if (!auth) {
    throw new Error(
      "Login must be used inside AuthProvider"
    );
  }

  const {
    login,
  } = auth;

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
    useState("ShivShambho");

  /* =====================================================
     NAVIGATION TIMER
  ===================================================== */

  const navigationTimerRef =
    useRef(null);

  /* =====================================================
     CLEANUP
  ===================================================== */

  useEffect(() => {
    return () => {
      if (
        navigationTimerRef.current
      ) {
        clearTimeout(
          navigationTimerRef.current
        );

        navigationTimerRef.current =
          null;
      }
    };
  }, []);

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
        ? String(name).trim()
        : "ShivShambho";
    } catch (error) {
      console.error(
        "LOAD LOGIN PUMP NAME ERROR:",
        error.response?.data
          ?.message ||
          error.message ||
          "Unable to load pump name."
      );

      return "ShivShambho";
    }
  };

  /* =====================================================
     LOGIN
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        loading ||
        showTanker
      ) {
        return;
      }

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      /* =================================================
         VALIDATION
      ================================================= */

      if (!cleanEmail) {
        toast.error(
          "Enter your email."
        );
        return;
      }

      if (
        cleanEmail.length >
        254
      ) {
        toast.error(
          "Email address is too long."
        );
        return;
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(
          cleanEmail
        )
      ) {
        toast.error(
          "Enter a valid email address."
        );
        return;
      }

      if (!password) {
        toast.error(
          "Enter your password."
        );
        return;
      }

      if (
        password.length >
        128
      ) {
        toast.error(
          "Password is too long."
        );
        return;
      }

      try {
        setLoading(true);

        /* =================================================
           LOGIN
        ================================================= */

        const result =
          await login(
            cleanEmail,
            password
          );

        const loggedInUser =
          result?.user;

        if (!loggedInUser) {
          throw new Error(
            "User information was not returned."
          );
        }

        /* =================================================
           SUPER ADMIN
        ================================================= */

        if (
          loggedInUser.role ===
          "superadmin"
        ) {
          setPumpName(
            "ShivShambho Super Admin"
          );

          toast.success(
            "Super Admin login successful."
          );

          setShowTanker(true);

          if (
            navigationTimerRef.current
          ) {
            clearTimeout(
              navigationTimerRef.current
            );
          }

          navigationTimerRef.current =
            setTimeout(() => {
              navigate(
                "/superadmin",
                {
                  replace: true,
                }
              );

              navigationTimerRef.current =
                null;
            }, 4300);

          return;
        }

        /* =================================================
           NORMAL PUMP USERS
        ================================================= */

        if (
          !loggedInUser.pumpId
        ) {
          throw new Error(
            "This account is not assigned to a petrol pump."
          );
        }

        const currentPumpName =
          ["staff", "employee"].includes(loggedInUser.role)
            ? "ShivShambho"
            : await loadPumpName();

        setPumpName(
          currentPumpName
        );

        toast.success(
          "Login successful."
        );

        setShowTanker(true);

        if (
          navigationTimerRef.current
        ) {
          clearTimeout(
            navigationTimerRef.current
          );
        }

        navigationTimerRef.current =
          setTimeout(() => {
            navigate(
              ["staff", "employee"].includes(loggedInUser.role)
                ? "/employee/payment"
                : "/dashboard",
              {
                replace: true,
              }
            );

            navigationTimerRef.current =
              null;
          }, 4300);

      } catch (error) {
        console.error(
          "LOGIN PAGE ERROR:",
          error.response?.data
            ?.message ||
            error.message ||
            error
        );

        /* =================================================
           BACKEND ERROR DATA
        ================================================= */

        const errorData =
          error?.response?.data;

        const errorCode =
          errorData?.code;

        /* =================================================
           REGISTRATION PENDING
        ================================================= */

        if (
          errorCode ===
          "REGISTRATION_PENDING"
        ) {
          toast.error(
            "Your registration is waiting for Super Admin approval."
          );

          return;
        }

        /* =================================================
           REGISTRATION REJECTED
        ================================================= */

        if (
          errorCode ===
          "REGISTRATION_REJECTED"
        ) {
          toast.error(
            errorData?.message ||
              "Your registration request was rejected."
          );

          return;
        }

        /* =================================================
           ACCOUNT DISABLED
        ================================================= */

        if (
          errorCode ===
          "ACCOUNT_DISABLED"
        ) {
          toast.error(
            "Your account is currently disabled. Contact the Super Admin."
          );

          return;
        }

        /* =================================================
           GENERAL LOGIN ERROR
        ================================================= */

        toast.error(
          errorData?.message ||
            error.message ||
            "Login failed."
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

          {/* ===========================================
              HEADER
          =========================================== */}

          <div className="login-header">

            <img
              src={logo}
              alt="ShivShambho Logo"
              className="login-logo"
            />

            <h1>
              SHIVSHAMBHO
            </h1>

            <p>
              Petrol Pump Management System
            </p>

          </div>

          {/* ===========================================
              LOGIN FORM
          =========================================== */}

          <form
            onSubmit={
              handleSubmit
            }
            noValidate
          >

            {/* EMAIL */}

            <div className="form-group">

              <label
                htmlFor="login-email"
              >
                Email
              </label>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="Enter your email"
                autoComplete="email"
                maxLength={254}
                disabled={
                  loading ||
                  showTanker
                }
                required
              />

            </div>

            {/* PASSWORD */}

            <div className="form-group">

              <label
                htmlFor="login-password"
              >
                Password
              </label>

              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                maxLength={128}
                disabled={
                  loading ||
                  showTanker
                }
                required
              />

            </div>

            {/* FORGOT PASSWORD */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                marginBottom:
                  "14px",
              }}
            >
              <Link
                to="/forgot-password"
                className="register-link"
                style={{
                  fontSize:
                    "14px",
                  textDecoration:
                    "none",
                }}
              >
                Forgot Password?
              </Link>
            </div>

            {/* LOGIN BUTTON */}

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

        </div>

      </div>

      {/* ===============================================
          TANKER ANIMATION
      =============================================== */}

      <LoginTankerAnimation
        show={showTanker}
        pumpName={pumpName}
      />

    </>
  );
};

export default Login;