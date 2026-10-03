import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

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

import {
  handleRazorpayWebhook,
} from "./controllers/paymentController.js";

import authMiddleware from "./middleware/authMiddleware.js";
import allowRoles from "./middleware/roleMiddleware.js";

/* =====================================================
   LOAD ENVIRONMENT VARIABLES
===================================================== */

dotenv.config();

/* =====================================================
   ENVIRONMENT
===================================================== */

const NODE_ENV = String(
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
  if (typeof origin !== "string") {
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
const environmentOrigins = process.env.CLIENT_URL
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
    ? [...new Set(environmentOrigins)]
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

/*
 * Do not expose Express implementation details.
 */
app.disable("x-powered-by");

/* =====================================================
   TRUST PROXY
===================================================== */

const trustProxyValue =
  process.env.TRUST_PROXY;

if (trustProxyValue === "true") {
  app.set("trust proxy", true);
} else if (trustProxyValue === "false") {
  app.set("trust proxy", false);
} else if (
  trustProxyValue !== undefined
) {
  const parsedTrustProxy =
    Number(trustProxyValue);

  if (
    Number.isFinite(parsedTrustProxy)
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
   SECURITY HEADERS
===================================================== */

/*
 * Helmet adds standard security headers such as:
 *
 * - Content-Security-Policy
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - X-Frame-Options
 * - Cross-Origin-Opener-Policy
 * - Strict-Transport-Security in production
 *
 * This backend is an API and does not serve the React
 * frontend itself, so the default Helmet API protection
 * is appropriate.
 */
app.use(
  helmet({
    hsts:
      NODE_ENV === "production"
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
  })
);

/* =====================================================
   REQUEST ID
===================================================== */

/*
 * Every request gets a unique identifier.
 *
 * This helps correlate:
 * - security events
 * - server errors
 * - payment issues
 * - production logs
 *
 * The client receives the ID through X-Request-ID.
 */
app.use(
  (req, res, next) => {
    const incomingRequestId =
      typeof req.headers["x-request-id"] ===
      "string"
        ? req.headers["x-request-id"].trim()
        : "";

    /*
     * Do not blindly trust an arbitrary client-provided
     * request ID as the canonical ID.
     *
     * Generate our own cryptographically random ID.
     */
    const requestId =
      crypto.randomUUID();

    req.requestId =
      requestId;

    res.setHeader(
      "X-Request-ID",
      requestId
    );

    /*
     * Keep the incoming ID out of the canonical
     * security/logging identifier.
     *
     * This check simply prevents an unused variable
     * warning while making it explicit that the
     * incoming value is not trusted.
     */
    void incomingRequestId;

    next();
  }
);

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
       *
       * - Postman
       * - server-to-server
       * - health checks
       * - Razorpay/webhook infrastructure
       *
       * CORS is a browser security mechanism and is
       * NOT an authentication mechanism.
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
      "X-Request-ID",
    ],

    optionsSuccessStatus: 204,
  })
);

/* =====================================================
   BODY PARSERS
===================================================== */

/*
 * IMPORTANT:
 *
 * Razorpay webhook signatures require the exact raw
 * request body.
 *
 * Therefore this route MUST remain before
 * express.json().
 */
app.post(
  "/api/payments/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb",
  }),
  handleRazorpayWebhook
);

/*
 * Normal JSON API requests.
 */
app.use(
  express.json({
    limit: "1mb",
  })
);

/*
 * URL-encoded requests.
 *
 * Kept for backward compatibility with the existing
 * application.
 */
app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

/* =====================================================
   GLOBAL API RATE LIMITER
===================================================== */

/*
 * General API protection.
 *
 * This is intentionally separate from the dedicated
 * loginRateLimiter.
 *
 * 300 requests / 15 minutes / IP gives normal users
 * enough room for:
 *
 * - dashboard requests
 * - report requests
 * - normal CRUD operations
 * - employee payment polling
 *
 * while providing protection against basic API abuse.
 *
 * The Razorpay webhook is mounted before this limiter,
 * so provider webhooks are NOT blocked by this policy.
 */
const apiRateLimiter = rateLimit({
  windowMs:
    Number.parseInt(
      process.env.API_RATE_LIMIT_WINDOW_MS ||
        String(15 * 60 * 1000),
      10
    ),

  limit:
    Math.max(
      Number.parseInt(
        process.env.API_RATE_LIMIT_MAX_REQUESTS ||
          "300",
        10
      ),
      1
    ),

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    success: false,
    code: "TOO_MANY_REQUESTS",
    message:
      "Too many requests. Please try again later.",
  },

  handler: (
    req,
    res,
    next,
    options
  ) => {
    const retryAfter =
      Math.ceil(
        options.windowMs /
          1000
      );

    res.setHeader(
      "Retry-After",
      String(retryAfter)
    );

    console.warn(
      "API RATE LIMIT EXCEEDED:",
      {
        requestId:
          req.requestId,
        method:
          req.method,
        path:
          req.path,
        ip:
          req.ip,
      }
    );

    return res.status(429).json({
      success: false,
      code: "TOO_MANY_REQUESTS",
      message:
        "Too many requests. Please try again later.",
      retryAfter,
    });
  },

  skip: (req) => {
    /*
     * Health checks should remain lightweight and
     * available to monitoring infrastructure.
     *
     * Authentication is still required for all
     * protected business APIs.
     */
    return req.path === "/health";
  },
});

/*
 * Apply the general limiter to API routes.
 *
 * Razorpay webhook was already handled above.
 */
app.use(
  "/api",
  apiRateLimiter
);

/* =====================================================
   REQUEST LOGGER
===================================================== */

/*
 * Security improvement:
 *
 * Do NOT log req.originalUrl here because it can contain
 * query parameters.
 *
 * Query parameters can accidentally contain:
 * - tokens
 * - identifiers
 * - sensitive filters
 * - future API secrets
 *
 * Log only the path.
 */
app.use(
  (req, res, next) => {
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.path} requestId=${req.requestId}`
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
    /*
     * Do not expose NODE_ENV or deployment details.
     */
    return res.status(200).json({
      success: true,
      message:
        "Petrol Pump Management API is running",
      requestId:
        req.requestId,
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

    /*
     * Keep this endpoint useful for infrastructure
     * monitoring while avoiding unnecessary internal
     * information such as uptime.
     */
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

        timestamp:
          new Date().toISOString(),

        requestId:
          req.requestId,
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

const adminOnly = [
  authMiddleware,
  allowRoles(
    "owner",
    "manager"
  ),
];

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
    /*
     * Do not echo the complete URL because the URL can
     * contain sensitive query parameters.
     */
    return res.status(404).json({
      success: false,
      code:
        "ROUTE_NOT_FOUND",
      message:
        "The requested route was not found.",
      requestId:
        req.requestId,
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
    /*
     * Keep the complete error in server logs, but never
     * expose it directly to clients.
     */
    console.error(
      "SERVER ERROR:",
      {
        requestId:
          req.requestId,
        method:
          req.method,
        path:
          req.path,
        error:
          error,
      }
    );

    /*
     * CORS ERROR
     */
    if (
      error.message ===
      "CORS origin not allowed"
    ) {
      return res.status(403).json({
        success: false,
        code:
          "CORS_ORIGIN_NOT_ALLOWED",
        message:
          "Request origin is not allowed.",
        requestId:
          req.requestId,
      });
    }

    /*
     * JSON BODY ERROR
     */
    if (
      error.type ===
      "entity.parse.failed"
    ) {
      return res.status(400).json({
        success: false,
        code:
          "INVALID_JSON",
        message:
          "Invalid JSON request.",
        requestId:
          req.requestId,
      });
    }

    /*
     * PAYLOAD TOO LARGE
     */
    if (
      error.type ===
      "entity.too.large"
    ) {
      return res.status(413).json({
        success: false,
        code:
          "PAYLOAD_TOO_LARGE",
        message:
          "Request payload is too large.",
        requestId:
          req.requestId,
      });
    }

    /*
     * MONGOOSE VALIDATION ERROR
     */
    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        code:
          "VALIDATION_ERROR",
        message:
          "Invalid request data.",
        requestId:
          req.requestId,
      });
    }

    /*
     * MONGOOSE CAST ERROR
     */
    if (
      error.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        code:
          "INVALID_REQUEST_DATA",
        message:
          "Invalid request data.",
        requestId:
          req.requestId,
      });
    }

    /*
     * DUPLICATE KEY ERROR
     */
    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        code:
          "DUPLICATE_RECORD",
        message:
          "A record with the provided information already exists.",
        requestId:
          req.requestId,
      });
    }

    /*
     * GENERAL ERROR
     */
    return res.status(500).json({
      success: false,
      code:
        "INTERNAL_SERVER_ERROR",
      message:
        "Internal server error",
      requestId:
        req.requestId,
    });
  }
);

/* =====================================================
   HTTP SERVER
===================================================== */

let server = null;

let isShuttingDown =
  false;

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
              "Helmet: ENABLED"
            );

            console.log(
              "API rate limiting: ENABLED"
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
       * Keep-alive protection.
       */
      server.keepAliveTimeout =
        65000;

      server.headersTimeout =
        66000;

      /*
       * Prevent requests from remaining active
       * indefinitely.
       */
      server.requestTimeout =
        120000;

      /*
       * Socket inactivity timeout.
       */
      server.timeout =
        120000;

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

    isShuttingDown =
      true;

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