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
import passwordResetRoutes from "./routes/passwordResetRoutes.js";

/* =====================================================
   ENVIRONMENT
===================================================== */

dotenv.config();

/* =====================================================
   SECURITY CONFIGURATION
===================================================== */

const JWT_SECRET =
  process.env.JWT_SECRET;

if (
  !JWT_SECRET ||
  JWT_SECRET.trim().length < 32
) {
  console.error(
    "===================================================="
  );

  console.error(
    "FATAL ERROR: JWT_SECRET is missing or too weak."
  );

  console.error(
    "JWT_SECRET must contain at least 32 characters."
  );

  console.error(
    "===================================================="
  );

  process.exit(1);
}

/* =====================================================
   APP
===================================================== */

const app =
  express();

/* =====================================================
   CORS
===================================================== */

const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const environmentOrigins =
  process.env.CLIENT_URL
    ? process.env.CLIENT_URL
        .split(",")
        .map((origin) =>
          origin.trim()
        )
        .filter(Boolean)
    : [];

const allowedOrigins = [
  ...new Set([
    ...defaultOrigins,
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
       * Allow requests without Origin
       * such as Postman/server-to-server.
       */

      if (!origin) {
        return callback(
          null,
          true
        );
      }

      if (
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
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
  fuelRoutes
);

/* =====================================================
   SALES
===================================================== */

app.use(
  "/api/sales",
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
  nozzleRoutes
);

app.use(
  "/api/nozzle",
  nozzleRoutes
);

/* =====================================================
   EXPENSES
===================================================== */

app.use(
  "/api/expenses",
  expenseRoutes
);

/* =====================================================
   LEDGER
===================================================== */

app.use(
  "/api/ledger",
  ledgerRoutes
);

/* =====================================================
   REPORTS
===================================================== */

app.use(
  "/api/reports",
  reportRoutes
);

/* =====================================================
   SETTINGS
===================================================== */

app.use(
  "/api/settings",
  settingsRoutes
);

/* =====================================================
   DASHBOARD
===================================================== */

app.use(
  "/api/dashboard",
  dashboardRoutes
);

/* =====================================================
   DAILY CLOSING
===================================================== */

app.use(
  "/api/daily-closing",
  dailyClosingRoutes
);

/* =====================================================
   AUDIT
===================================================== */

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
   404
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
        message:
          "Request origin is not allowed.",
      });
    }

    /* -----------------------------------------------
       JSON BODY ERROR
    ------------------------------------------------ */

    if (
      error.type ===
      "entity.parse.failed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid JSON request.",
      });
    }

    /* -----------------------------------------------
       GENERAL ERROR
    ------------------------------------------------ */

    return res.status(500).json({
      success: false,
      message:
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
          "JWT security: ENABLED"
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