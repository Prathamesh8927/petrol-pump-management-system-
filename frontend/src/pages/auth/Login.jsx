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
     SUPER ADMIN ACCOUNT CHECK
     
     This message will ONLY appear when the
     Super Admin email is entered.
  ===================================================== */

  const isSuperAdminEmail =
    email.trim().toLowerCase() ===
    "superadmin@mypump.com";

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

    /* -----------------------------------------------
       VALIDATION
    ------------------------------------------------ */

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

      /* ---------------------------------------------
         LOGIN
      --------------------------------------------- */

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

      /* =============================================
         SUPER ADMIN
      ============================================= */

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

      /* =============================================
         CLIENT / OWNER / MANAGER / STAFF
      ============================================= */

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

      /* =============================================
         BACKEND ERROR CODE HANDLING
      ============================================= */

      const errorData =
        error?.response?.data;

      const errorCode =
        errorData?.code;

      /* ---------------------------------------------
         REGISTRATION PENDING
      --------------------------------------------- */

      if (
        errorCode ===
        "REGISTRATION_PENDING"
      ) {
        toast.error(
          "Your registration is waiting for Super Admin approval."
        );

        return;
      }

      /* ---------------------------------------------
         REGISTRATION REJECTED
      --------------------------------------------- */

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

      /* ---------------------------------------------
         ACCOUNT DISABLED
      --------------------------------------------- */

      if (
        errorCode ===
        "ACCOUNT_DISABLED"
      ) {
        toast.error(
          "Your account is currently disabled. Contact the Super Admin."
        );

        return;
      }

      /* ---------------------------------------------
         INVALID LOGIN / GENERAL ERROR
      --------------------------------------------- */

      toast.error(
        errorData?.message ||
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

          {/* ===========================================
              HEADER
          =========================================== */}

          <div className="login-header">

            <h1>
              MyPump
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
          >

            {/* =========================================
                EMAIL
            ========================================= */}

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


            {/* =========================================
                PASSWORD
            ========================================= */}

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


            {/* =========================================
                FORGOT PASSWORD
            ========================================= */}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "14px",
              }}
            >

              <Link
                to="/forgot-password"
                className="register-link"
                style={{
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                Forgot Password?
              </Link>

            </div>


            {/* =========================================
                LOGIN BUTTON
            ========================================= */}

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
              SUPER ADMIN MESSAGE
              
              ONLY SHOWS FOR:
              superadmin@mypump.com
          =========================================== */}

          {isSuperAdminEmail && (
            <div className="login-admin-note">

              <span>
                Super Admin access is restricted
                to authorized administrators.
              </span>

            </div>
          )}

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