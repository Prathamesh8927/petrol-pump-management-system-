import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

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

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

/* =====================================================
   BODY PARSER
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
   ROOT
===================================================== */

app.get(
  "/",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message:
        "MyPump API is running",
    });
  }
);

/* =====================================================
   HEALTH
===================================================== */

app.get(
  "/api/health",
  (req, res) => {
    return res.status(200).json({
      success: true,

      application:
        "MyPump",

      status:
        "healthy",

      database:
        mongoose.connection
          .readyState === 1
          ? "connected"
          : "disconnected",

      uptime:
        Math.floor(
          process.uptime()
        ),

      timestamp:
        new Date().toISOString(),
    });
  }
);

/* =====================================================
   API ROUTES
===================================================== */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/fuel",
  fuelRoutes
);

app.use(
  "/api/sales",
  salesRoutes
);

/* =====================================================
   NOZZLE

   /api/nozzles = FINAL
   /api/nozzle  = compatibility
===================================================== */

app.use(
  "/api/nozzles",
  nozzleRoutes
);

app.use(
  "/api/nozzle",
  nozzleRoutes
);

app.use(
  "/api/expenses",
  expenseRoutes
);

app.use(
  "/api/ledger",
  ledgerRoutes
);

app.use(
  "/api/reports",
  reportRoutes
);

app.use(
  "/api/settings",
  settingsRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/daily-closing",
  dailyClosingRoutes
);

app.use(
  "/api/audit",
  auditRoutes
);

/* =====================================================
   404
===================================================== */

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,

      message:
        "Route not found",

      method:
        req.method,

      path:
        req.originalUrl,
    });
  }
);

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "SERVER ERROR:",
      error
    );

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
  process.env.PORT ||
  8080;

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