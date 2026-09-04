import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";

/* =====================================================
   ROUTES
===================================================== */

import authRoutes from "./routes/authRoutes.js";
import fuelRoutes from "./routes/fuelRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import nozzleRoutes from "./routes/nozzleRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import dailyClosingRoutes from "./routes/dailyClosingRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";

/* =====================================================
   PASSWORD RECOVERY
===================================================== */

import passwordResetRoutes
  from "./routes/passwordResetRoutes.js";


dotenv.config();

const app = express();


/* =====================================================
   CORS
===================================================== */

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {

      // Allow requests without an Origin header
      // such as Postman or server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log(
        "CORS BLOCKED ORIGIN:",
        origin
      );

      return callback(
        new Error(
          `CORS origin not allowed: ${origin}`
        )
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    optionsSuccessStatus: 204,
  })
);


/* =====================================================
   BODY PARSERS
===================================================== */

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true,
  })
);


/* =====================================================
   REQUEST LOGGER
===================================================== */

app.use(
  (req, res, next) => {

    console.log(
      `${req.method} ${req.originalUrl}`
    );

    next();
  }
);


/* =====================================================
   BASIC ROUTES
===================================================== */

app.get(
  "/",
  (req, res) => {

    res.status(200).json({
      success: true,
      message:
        "Petrol Pump Management API is running",
    });

  }
);


app.get(
  "/api/health",
  (req, res) => {

    res.status(200).json({
      success: true,
      message:
        "Backend is healthy",
    });

  }
);


/* =====================================================
   API ROUTES
===================================================== */

/* ---------------- AUTH ---------------- */

app.use(
  "/api/auth",
  authRoutes
);


/* ---------------- FUEL ---------------- */

app.use(
  "/api/fuel",
  fuelRoutes
);


/* ---------------- SALES ---------------- */

app.use(
  "/api/sales",
  salesRoutes
);


/* ---------------- SUPER ADMIN ---------------- */

app.use(
  "/api/superadmin",
  superAdminRoutes
);


/* ---------------- NOZZLES ---------------- */

app.use(
  "/api/nozzles",
  nozzleRoutes
);

app.use(
  "/api/nozzle",
  nozzleRoutes
);


/* ---------------- EXPENSES ---------------- */

app.use(
  "/api/expenses",
  expenseRoutes
);


/* ---------------- LEDGER ---------------- */

app.use(
  "/api/ledger",
  ledgerRoutes
);


/* ---------------- REPORTS ---------------- */

app.use(
  "/api/reports",
  reportRoutes
);


/* ---------------- SETTINGS ---------------- */

app.use(
  "/api/settings",
  settingsRoutes
);


/* ---------------- DASHBOARD ---------------- */

app.use(
  "/api/dashboard",
  dashboardRoutes
);


/* ---------------- DAILY CLOSING ---------------- */

app.use(
  "/api/daily-closing",
  dailyClosingRoutes
);


/* ---------------- AUDIT ---------------- */

app.use(
  "/api/audit",
  auditRoutes
);


/* =====================================================
   PASSWORD RESET
===================================================== */

app.use(
  "/api/password-reset",
  passwordResetRoutes
);


/* =====================================================
   404 HANDLER
===================================================== */

app.use(
  (req, res) => {

    res.status(404).json({
      success: false,
      message:
        `Route not found: ${req.method} ${req.originalUrl}`,
    });

  }
);


/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use(
  (error, req, res, next) => {

    console.error(
      "SERVER ERROR:",
      error
    );

    /* -----------------------------------------------
       CORS ERROR
    ------------------------------------------------ */

    if (
      error.message?.startsWith(
        "CORS origin not allowed"
      )
    ) {

      return res.status(403).json({
        success: false,
        message: error.message,
      });

    }


    /* -----------------------------------------------
       GENERAL SERVER ERROR
    ------------------------------------------------ */

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal server error",
    });

  }
);


/* =====================================================
   START SERVER
===================================================== */

const PORT =
  process.env.PORT || 8080;


connectDB()
  .then(() => {

    app.listen(
      PORT,
      () => {

        console.log(
          "===================================="
        );

        console.log(
          `Server running on http://localhost:${PORT}`
        );

        console.log(
          "===================================="
        );

      }
    );

  })
  .catch((error) => {

    console.error(
      "Database connection failed:",
      error
    );

    process.exit(1);

  });