import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

import superAdminRoutes from "./routes/superAdminRoutes.js";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import fuelRoutes from "./routes/fuelRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import nozzleRoutes from "./routes/nozzleRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import dailyClosingRoutes from "./routes/dailyClosingRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";

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
    origin: function (origin, callback) {
      // Allow requests without an Origin header
      // such as Postman or server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS: Origin ${origin} not allowed`)
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
   BODY PARSER
===================================================== */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* =====================================================
   REQUEST LOGGER
===================================================== */

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} | ${req.method} ${req.originalUrl}`
  );

  next();
});

/* =====================================================
   ROOT
===================================================== */

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "MyPump API is running",
  });
});

/* =====================================================
   HEALTH
===================================================== */

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,

    application: "MyPump",

    status: "healthy",

    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",

    uptime: Math.floor(process.uptime()),

    timestamp: new Date().toISOString(),
  });
});

/* =====================================================
   API ROUTES
===================================================== */

/* ================= AUTH ================= */

app.use(
  "/api/auth",
  authRoutes
);

/* ================= FUEL ================= */

app.use(
  "/api/fuel",
  fuelRoutes
);

/* ================= SALES ================= */

app.use(
  "/api/sales",
  salesRoutes
);

/* ================= SUPERADMIN ================= */

app.use(
  "/api/superadmin",
  superAdminRoutes
);

/* =====================================================
   NOZZLE

   /api/nozzles = FINAL
   /api/nozzle  = COMPATIBILITY
===================================================== */

app.use(
  "/api/nozzles",
  nozzleRoutes
);

app.use(
  "/api/nozzle",
  nozzleRoutes
);

/* ================= EXPENSES ================= */

app.use(
  "/api/expenses",
  expenseRoutes
);

/* ================= LEDGER ================= */

app.use(
  "/api/ledger",
  ledgerRoutes
);

/* ================= REPORTS ================= */

app.use(
  "/api/reports",
  reportRoutes
);

/* ================= SETTINGS ================= */

app.use(
  "/api/settings",
  settingsRoutes
);

/* ================= DASHBOARD ================= */

app.use(
  "/api/dashboard",
  dashboardRoutes
);

/* ================= DAILY CLOSING ================= */

app.use(
  "/api/daily-closing",
  dailyClosingRoutes
);

/* ================= AUDIT ================= */

app.use(
  "/api/audit",
  auditRoutes
);

/* =====================================================
   404 HANDLER
===================================================== */

app.use((req, res) => {
  return res.status(404).json({
    success: false,

    message: "Route not found",

    method: req.method,

    path: req.originalUrl,
  });
});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use(
  (error, req, res, next) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    /*
     * Handle CORS errors cleanly
     */
    if (
      error.message &&
      error.message.startsWith("CORS:")
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(
      error.status || 500
    ).json({
      success: false,

      message:
        error.message ||
        "Internal server error",
    });
  }
);

/* =====================================================
   SERVER
===================================================== */

const PORT =
  process.env.PORT || 8080;

connectDB()
  .then(() => {
    app.listen(
      PORT,
      () => {
        console.log(
          `MyPump server running on http://localhost:${PORT}`
        );

        console.log(
          `Health check: http://localhost:${PORT}/api/health`
        );
      }
    );
  })
  .catch((error) => {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  });