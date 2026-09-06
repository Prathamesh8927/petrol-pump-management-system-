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

/* =====================================================
   LOAD ENVIRONMENT VARIABLES
===================================================== */

dotenv.config();

/* =====================================================
   ENVIRONMENT
===================================================== */

const NODE_ENV = process.env.NODE_ENV || "development";

const PORT = Number(process.env.PORT) || 8080;

const JWT_SECRET = process.env.JWT_SECRET;

/* =====================================================
   SECURITY CONFIGURATION
===================================================== */

if (!JWT_SECRET || JWT_SECRET.trim().length < 32) {
  console.error("====================================================");
  console.error("FATAL ERROR: JWT_SECRET is missing or too weak.");
  console.error("JWT_SECRET must contain at least 32 characters.");
  console.error("====================================================");

  process.exit(1);
}

/* =====================================================
   CORS CONFIGURATION
===================================================== */

/*
 * Local development origins.
 *
 * IMPORTANT:
 * Never put frontend JavaScript code inside this array.
 */

const developmentOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

/*
 * Production origins are supplied from Render environment
 * variable:
 *
 * CLIENT_URL=https://shivshambho.in,https://www.shivshambho.in
 *
 * We also remove trailing "/" so:
 *
 * https://example.com/
 *
 * becomes:
 *
 * https://example.com
 */

const environmentOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL
      .split(",")
      .map((origin) => origin.trim().replace(/\/+$/, ""))
      .filter(Boolean)
  : [];

/*
 * Production must have CLIENT_URL configured.
 */

if (
  NODE_ENV === "production" &&
  environmentOrigins.length === 0
) {
  console.error("====================================================");
  console.error("FATAL ERROR: CLIENT_URL is missing in production.");
  console.error(
    "Set CLIENT_URL to your production frontend URL(s)."
  );
  console.error(
    "Example: https://shivshambho.in,https://www.shivshambho.in"
  );
  console.error("====================================================");

  process.exit(1);
}

const allowedOrigins =
  NODE_ENV === "production"
    ? [...new Set(environmentOrigins)]
    : [
        ...new Set([
          ...developmentOrigins,
          ...environmentOrigins,
        ]),
      ];

console.log("CORS ALLOWED ORIGINS:", allowedOrigins);

/* =====================================================
   APP
===================================================== */

const app = express();

/* =====================================================
   TRUST PROXY
===================================================== */

const trustProxyValue = process.env.TRUST_PROXY;

if (trustProxyValue === "true") {
  app.set("trust proxy", true);
} else if (trustProxyValue === "false") {
  app.set("trust proxy", false);
} else if (trustProxyValue !== undefined) {
  const parsedTrustProxy = Number(trustProxyValue);

  if (Number.isFinite(parsedTrustProxy)) {
    app.set("trust proxy", parsedTrustProxy);
  } else {
    console.warn(
      "Invalid TRUST_PROXY value. Using environment default."
    );

    app.set(
      "trust proxy",
      NODE_ENV === "production" ? 1 : 0
    );
  }
} else {
  app.set(
    "trust proxy",
    NODE_ENV === "production" ? 1 : 0
  );
}

/* =====================================================
   CORS
===================================================== */

app.use(
  cors({
    origin: (origin, callback) => {
      /*
       * Requests without Origin:
       * - Postman
       * - server-to-server
       * - health checks
       */

      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin
        .trim()
        .replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(
        "CORS BLOCKED ORIGIN:",
        normalizedOrigin
      );

      return callback(
        new Error("CORS origin not allowed")
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

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} ${req.method} ${req.originalUrl}`
  );

  next();
});

/* =====================================================
   BASIC ROUTE
===================================================== */

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Petrol Pump Management API is running",
    environment: NODE_ENV,
  });
});

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;

  const databaseConnected = dbState === 1;

  const status = databaseConnected
    ? "healthy"
    : "degraded";

  return res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    status,
    server: "running",
    database: databaseConnected
      ? "connected"
      : "disconnected",
    environment: NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/* =====================================================
   AUTH
===================================================== */

app.use("/api/auth", authRoutes);

/* =====================================================
   FUEL
===================================================== */

app.use("/api/fuel", fuelRoutes);

/* =====================================================
   SALES
===================================================== */

app.use("/api/sales", salesRoutes);

/* =====================================================
   SUPER ADMIN
===================================================== */

app.use("/api/superadmin", superAdminRoutes);

/* =====================================================
   NOZZLES
===================================================== */

app.use("/api/nozzles", nozzleRoutes);

/*
 * Backward compatibility
 */

app.use("/api/nozzle", nozzleRoutes);

/* =====================================================
   EXPENSES
===================================================== */

app.use("/api/expenses", expenseRoutes);

/* =====================================================
   LEDGER
===================================================== */

app.use("/api/ledger", ledgerRoutes);

/* =====================================================
   REPORTS
===================================================== */

app.use("/api/reports", reportRoutes);

/* =====================================================
   SETTINGS
===================================================== */

app.use("/api/settings", settingsRoutes);

/* =====================================================
   DASHBOARD
===================================================== */

app.use("/api/dashboard", dashboardRoutes);

/* =====================================================
   DAILY CLOSING
===================================================== */

app.use("/api/daily-closing", dailyClosingRoutes);

/* =====================================================
   AUDIT
===================================================== */

app.use("/api/audit", auditRoutes);

/* =====================================================
   PASSWORD RESET
===================================================== */

app.use("/api/password-reset", passwordResetRoutes);

/* =====================================================
   404 HANDLER
===================================================== */

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  /* -----------------------------------------------
     CORS ERROR
  ------------------------------------------------ */

  if (error.message === "CORS origin not allowed") {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed.",
    });
  }

  /* -----------------------------------------------
     JSON BODY ERROR
  ------------------------------------------------ */

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request.",
    });
  }

  /* -----------------------------------------------
     PAYLOAD TOO LARGE
  ------------------------------------------------ */

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large.",
    });
  }

  /* -----------------------------------------------
     MONGOOSE VALIDATION ERROR
  ------------------------------------------------ */

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Invalid request data.",
    });
  }

  /* -----------------------------------------------
     MONGOOSE CAST ERROR
  ------------------------------------------------ */

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid request data.",
    });
  }

  /* -----------------------------------------------
     DUPLICATE KEY ERROR
  ------------------------------------------------ */

  if (error.code === 11000) {
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
    message: "Internal server error",
  });
});

/* =====================================================
   START SERVER
===================================================== */

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("====================================");
      console.log(
        `MyPump Backend running on port ${PORT}`
      );
      console.log(`Environment: ${NODE_ENV}`);
      console.log("MongoDB: CONNECTED");
      console.log("JWT security: ENABLED");
      console.log("CORS: CONFIGURED");
      console.log("Health: /api/health");
      console.log("====================================");
    });
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

process.on("unhandledRejection", (reason) => {
  console.error(
    "UNHANDLED REJECTION:",
    reason
  );
});

process.on("uncaughtException", (error) => {
  console.error(
    "UNCAUGHT EXCEPTION:",
    error
  );

  process.exit(1);
});

/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

const gracefulShutdown = async (signal) => {
  console.log(
    `${signal} received. Shutting down gracefully...`
  );

  try {
    await mongoose.connection.close();

    console.log(
      "MongoDB connection closed."
    );

    process.exit(0);
  } catch (error) {
    console.error(
      "Error during shutdown:",
      error
    );

    process.exit(1);
  }
};

process.on("SIGTERM", () =>
  gracefulShutdown("SIGTERM")
);

process.on("SIGINT", () =>
  gracefulShutdown("SIGINT")
);

/* =====================================================
   START
===================================================== */

startServer();