import {
  useContext,
  useState,
} from "react";

import {
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
  const navigate =
    useNavigate();

  const auth =
    useContext(
      AuthContext
    );

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

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  /* =====================================================
     TANKER
  ===================================================== */

  const [
    showTanker,
    setShowTanker,
  ] = useState(false);

  const [
    pumpName,
    setPumpName,
  ] = useState("MyPump");

  /* =====================================================
     LOAD PUMP NAME
  ===================================================== */

  const loadPumpName =
    async () => {
      try {
        const response =
          await api.get(
            "/settings/pump"
          );

        console.log(
          "LOGIN PUMP SETTINGS:",
          response.data
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

        if (name) {
          return String(name);
        }

        return "MyPump";
      } catch (error) {
        console.error(
          "LOAD LOGIN PUMP NAME ERROR:",
          error
        );

        /*
          Pump settings failure must
          NOT stop successful login.
        */

        return "MyPump";
      }
    };

  /* =====================================================
     LOGIN
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

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

        /* ===============================================
           AUTHENTICATE
        =============================================== */

        await login(
          cleanEmail,
          password
        );

        /* ===============================================
           GET PUMP NAME
        =============================================== */

        const currentPumpName =
          await loadPumpName();

        setPumpName(
          currentPumpName
        );

        toast.success(
          "Login successful"
        );

        /* ===============================================
           START ANIMATION
        =============================================== */

        setShowTanker(
          true
        );

        /* ===============================================
           REDIRECT AFTER ANIMATION
        =============================================== */

        setTimeout(
          () => {
            navigate(
              "/dashboard",
              {
                replace: true,
              }
            );
          },
          4300
        );
      } catch (error) {
        console.error(
          "LOGIN PAGE ERROR:",
          error
        );

        console.error(
          "LOGIN SERVER RESPONSE:",
          error.response?.data
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

      {/* ===============================================
          LOGIN FORM
      =============================================== */}

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
                    event.target
                      .value
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
                value={
                  password
                }
                onChange={(event) =>
                  setPassword(
                    event.target
                      .value
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

        </div>

      </div>

      {/* ===============================================
          TANKER ANIMATION
      =============================================== */}

      <LoginTankerAnimation
        show={
          showTanker
        }
        pumpName={
          pumpName
        }
      />

    </>
  );
};

export default Login;