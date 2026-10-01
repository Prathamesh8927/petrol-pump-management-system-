import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

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
import recoveryRoutes from "./routes/recoveryRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { handleRazorpayWebhook } from "./controllers/paymentController.js";
import authMiddleware from "./middleware/authMiddleware.js";
import allowRoles from "./middleware/roleMiddleware.js";

/* =====================================================
   LOAD ENVIRONMENT VARIABLES
===================================================== */

dotenv.config();

/* =====================================================
   ENVIRONMENT
===================================================== */

const NODE_ENV =
  String(
    process.env.NODE_ENV || "development"
  )
    .trim()
    .toLowerCase();

const PORT =
  Number(process.env.PORT) || 8080;

const JWT_SECRET =
  process.env.JWT_SECRET;

/* =====================================================
   ENVIRONMENT VALIDATION
===================================================== */

if (
  typeof JWT_SECRET !== "string" ||
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
   CORS CONFIGURATION
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

/*
 * Local development origins.
 */
const developmentOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

/*
 * Production origins are supplied through:
 *
 * CLIENT_URL=https://shivshambho.in,https://www.shivshambho.in
 */
const environmentOrigins =
  process.env.CLIENT_URL
    ? process.env.CLIENT_URL
        .split(",")
        .map(normalizeOrigin)
        .filter(Boolean)
    : [];

/*
 * Production must have CLIENT_URL.
 */
if (
  NODE_ENV === "production" &&
  environmentOrigins.length === 0
) {
  console.error(
    "===================================================="
  );

  console.error(
    "FATAL ERROR: CLIENT_URL is missing in production."
  );

  console.error(
    "Set CLIENT_URL to your production frontend URL(s)."
  );

  console.error(
    "Example: https://shivshambho.in,https://www.shivshambho.in"
  );

  console.error(
    "===================================================="
  );

  process.exit(1);
}

const allowedOrigins =
  NODE_ENV === "production"
    ? [
        ...new Set(
          environmentOrigins
        ),
      ]
    : [
        ...new Set([
          ...developmentOrigins,
          ...environmentOrigins,
        ]),
      ];

console.log(
  "CORS ALLOWED ORIGINS:",
  allowedOrigins
);

/* =====================================================
   APP
===================================================== */

const app = express();

const adminOnly = [
  authMiddleware,
  allowRoles("owner", "manager"),
];

/* =====================================================
   TRUST PROXY
===================================================== */

const trustProxyValue =
  process.env.TRUST_PROXY;

if (
  trustProxyValue === "true"
) {
  app.set("trust proxy", true);
} else if (
  trustProxyValue === "false"
) {
  app.set("trust proxy", false);
} else if (
  trustProxyValue !== undefined
) {
  const parsedTrustProxy =
    Number(trustProxyValue);

  if (
    Number.isFinite(
      parsedTrustProxy
    )
  ) {
    app.set(
      "trust proxy",
      parsedTrustProxy
    );
  } else {
    console.warn(
      "Invalid TRUST_PROXY value. Using environment default."
    );

    app.set(
      "trust proxy",
      NODE_ENV === "production"
        ? 1
        : 0
    );
  }
} else {
  app.set(
    "trust proxy",
    NODE_ENV === "production"
      ? 1
      : 0
  );
}

/* =====================================================
   CORS
===================================================== */

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      /*
       * Requests without Origin:
       * - Postman
       * - server-to-server
       * - health checks
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

      console.warn(
        "CORS BLOCKED ORIGIN:",
        normalizedOrigin
      );

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

/* Razorpay signatures require the exact raw request body. */
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
   REQUEST LOGGER
===================================================== */

app.use(
  (req, res, next) => {
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl}`
    );

    next();
  }
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
      environment: NODE_ENV,
    });
  }
);

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (req, res) => {
    const dbState =
      mongoose.connection.readyState;

    const databaseConnected =
      dbState === 1;

    const status =
      databaseConnected
        ? "healthy"
        : "degraded";

    return res
      .status(
        databaseConnected
          ? 200
          : 503
      )
      .json({
        success:
          databaseConnected,

        status,

        server:
          "running",

        database:
          databaseConnected
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

/* =====================================================
   PAYMENTS
===================================================== */

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
      "SERVER ERROR:",
      error
    );

    /* -----------------------------------------------
       CORS ERROR
    ------------------------------------------------ */

    if (
      error.message ===
      "CORS origin not allowed"
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
       PAYLOAD TOO LARGE
    ------------------------------------------------ */

    if (
      error.type ===
      "entity.too.large"
    ) {
      return res.status(413).json({
        success: false,
        message:
          "Request payload is too large.",
      });
    }

    /* -----------------------------------------------
       MONGOOSE VALIDATION ERROR
    ------------------------------------------------ */

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request data.",
      });
    }

    /* -----------------------------------------------
       MONGOOSE CAST ERROR
    ------------------------------------------------ */

    if (
      error.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request data.",
      });
    }

    /* -----------------------------------------------
       DUPLICATE KEY ERROR
    ------------------------------------------------ */

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "A record with the provided information already exists.",
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
   HTTP SERVER
===================================================== */

let server = null;
let isShuttingDown = false;

/* =====================================================
   START SERVER
===================================================== */

const startServer =
  async () => {
    try {
      await connectDB();

      server =
        app.listen(
          PORT,
          () => {
            console.log(
              "===================================="
            );

            console.log(
              `MyPump Backend running on port ${PORT}`
            );

            console.log(
              `Environment: ${NODE_ENV}`
            );

            console.log(
              "MongoDB: CONNECTED"
            );

            console.log(
              "JWT security: ENABLED"
            );

            console.log(
              "CORS: CONFIGURED"
            );

            console.log(
              "Health: /api/health"
            );

            console.log(
              "Recovery: /api/recovery"
            );

            console.log(
              "===================================="
            );
          }
        );

      /*
       * Prevent idle HTTP connections from
       * remaining open indefinitely during shutdown.
       */
      server.keepAliveTimeout =
        65000;

      server.headersTimeout =
        66000;
    } catch (error) {
      console.error(
        "Database connection failed:",
        error
      );

      process.exit(1);
    }
  };

/* =====================================================
   PROCESS ERROR HANDLING
===================================================== */

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "UNHANDLED REJECTION:",
      reason
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "UNCAUGHT EXCEPTION:",
      error
    );

    process.exit(1);
  }
);

/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

const gracefulShutdown =
  async (signal) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    console.log(
      `${signal} received. Shutting down gracefully...`
    );

    try {
      /*
       * Stop accepting new HTTP requests first.
       */
      if (server) {
        await new Promise(
          (resolve) => {
            server.close(
              () => {
                console.log(
                  "HTTP server closed."
                );

                resolve();
              }
            );
          }
        );
      }

      /*
       * Close MongoDB connection.
       */
      if (
        mongoose.connection
          .readyState !== 0
      ) {
        await mongoose.connection.close();

        console.log(
          "MongoDB connection closed."
        );
      }

      process.exit(0);
    } catch (error) {
      console.error(
        "Error during shutdown:",
        error
      );

      process.exit(1);
    }
  };

process.on(
  "SIGTERM",
  () =>
    gracefulShutdown(
      "SIGTERM"
    )
);

process.on(
  "SIGINT",
  () =>
    gracefulShutdown(
      "SIGINT"
    )
);

/* =====================================================
   START
===================================================== */

startServer();