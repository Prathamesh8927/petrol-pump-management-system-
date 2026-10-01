import express from "express";
import cors from "cors";

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
import passwordResetRoutes from "./routes/passwordResetRoutes.js";
import recoveryRoutes from "./routes/recoveryRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { handleRazorpayWebhook } from "./controllers/paymentController.js";
import authMiddleware from "./middleware/authMiddleware.js";
import allowRoles from "./middleware/roleMiddleware.js";

/* =====================================================
   APP
===================================================== */

const app = express();

const adminOnly = [
  authMiddleware,
  allowRoles("owner", "manager"),
];

/* =====================================================
   CORS
===================================================== */

const normalizeOrigin = (origin) => {
  if (
    typeof origin !== "string"
  ) {
    return "";
  }

  return origin
    .trim()
    .replace(/\/+$/, "");
};

const developmentOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const environmentOrigins =
  process.env.CLIENT_URL
    ? process.env.CLIENT_URL
        .split(",")
        .map(normalizeOrigin)
        .filter(Boolean)
    : [];

const allowedOrigins = [
  ...new Set([
    ...developmentOrigins,
    ...environmentOrigins,
  ]),
];

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      /*
       * Allow requests without Origin:
       * Postman, server-to-server requests,
       * health checks, etc.
       */
      if (!origin) {
        return callback(
          null,
          true
        );
      }

      const normalizedOrigin =
        normalizeOrigin(origin);

      if (
        allowedOrigins.includes(
          normalizedOrigin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      return callback(
        new Error(
          "CORS origin not allowed"
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

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  handleRazorpayWebhook
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

/* =====================================================
   BASIC ROUTE
===================================================== */

app.get(
  "/",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message:
        "Petrol Pump Management API is running",
    });
  }
);

/* =====================================================
   AUTH
===================================================== */

app.use(
  "/api/auth",
  authRoutes
);

/* =====================================================
   FUEL
===================================================== */

app.use(
  "/api/fuel",
  ...adminOnly,
  fuelRoutes
);

/* =====================================================
   SALES
===================================================== */

app.use(
  "/api/sales",
  ...adminOnly,
  salesRoutes
);

/* =====================================================
   SUPER ADMIN
===================================================== */

app.use(
  "/api/superadmin",
  superAdminRoutes
);

/* =====================================================
   NOZZLES
===================================================== */

app.use(
  "/api/nozzles",
  ...adminOnly,
  nozzleRoutes
);

/*
 * Backward compatibility.
 */
app.use(
  "/api/nozzle",
  ...adminOnly,
  nozzleRoutes
);

/* =====================================================
   EXPENSES
===================================================== */

app.use(
  "/api/expenses",
  ...adminOnly,
  expenseRoutes
);

/* =====================================================
   LEDGER
===================================================== */

app.use(
  "/api/ledger",
  ...adminOnly,
  ledgerRoutes
);

/* =====================================================
   REPORTS
===================================================== */

app.use(
  "/api/reports",
  ...adminOnly,
  reportRoutes
);

/* =====================================================
   SETTINGS
===================================================== */

app.use(
  "/api/settings",
  ...adminOnly,
  settingsRoutes
);

/* =====================================================
   DASHBOARD
===================================================== */

app.use(
  "/api/dashboard",
  ...adminOnly,
  dashboardRoutes
);

/* =====================================================
   DAILY CLOSING
===================================================== */

app.use(
  "/api/daily-closing",
  ...adminOnly,
  dailyClosingRoutes
);

/* =====================================================
   AUDIT
===================================================== */

app.use(
  "/api/audit",
  ...adminOnly,
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
   DELETED DATA RECOVERY
===================================================== */

app.use(
  "/api/recovery",
  ...adminOnly,
  recoveryRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

/* =====================================================
   404 HANDLER
===================================================== */

app.use(
  (req, res) => {
    return res.status(404).json({
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
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "APP ERROR:",
      error
    );

    if (
      error?.message ===
      "CORS origin not allowed"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Request origin is not allowed.",
      });
    }

    if (
      error?.type ===
      "entity.parse.failed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid JSON request.",
      });
    }

    if (
      error?.type ===
      "entity.too.large"
    ) {
      return res.status(413).json({
        success: false,
        message:
          "Request payload is too large.",
      });
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request data.",
      });
    }

    if (
      error?.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request data.",
      });
    }

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A record with the provided information already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
);

export default app;