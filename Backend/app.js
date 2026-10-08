import express from "express";
import cors from "cors";
import crypto from "crypto";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| ROUTES
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| CONTROLLERS
|--------------------------------------------------------------------------
*/

import {
  handleRazorpayWebhook,
} from "./controllers/paymentController.js";

/*
|--------------------------------------------------------------------------
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

import authMiddleware from "./middleware/authMiddleware.js";
import allowRoles from "./middleware/roleMiddleware.js";

/*
|--------------------------------------------------------------------------
| APP
|--------------------------------------------------------------------------
*/

const app = express();

/*
|--------------------------------------------------------------------------
| ENVIRONMENT
|--------------------------------------------------------------------------
*/

const NODE_ENV = String(
  process.env.NODE_ENV || "development"
)
  .trim()
  .toLowerCase();

const isProduction = NODE_ENV === "production";

/*
|--------------------------------------------------------------------------
| BASIC EXPRESS SECURITY
|--------------------------------------------------------------------------
*/

app.disable("x-powered-by");

/*
|--------------------------------------------------------------------------
| TRUST PROXY
|--------------------------------------------------------------------------
|
| Required when running behind Render/proxy.
|
|--------------------------------------------------------------------------
*/

const trustProxyValue =
  process.env.TRUST_PROXY;

if (trustProxyValue === "true") {
  app.set("trust proxy", true);
} else if (trustProxyValue === "false") {
  app.set("trust proxy", false);
} else if (
  trustProxyValue !== undefined
) {
  const parsedTrustProxy = Number(
    trustProxyValue
  );

  if (Number.isFinite(parsedTrustProxy)) {
    app.set(
      "trust proxy",
      parsedTrustProxy
    );
  } else {
    app.set(
      "trust proxy",
      isProduction ? 1 : 0
    );
  }
} else {
  app.set(
    "trust proxy",
    isProduction ? 1 : 0
  );
}

/*
|--------------------------------------------------------------------------
| SECURITY HEADERS
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  })
);

/*
|--------------------------------------------------------------------------
| RESPONSE COMPRESSION
|--------------------------------------------------------------------------
|
| Compress larger JSON responses such as:
|
| - dashboard
| - ledger
| - reports
| - sales history
|
|--------------------------------------------------------------------------
*/

app.use(
  compression({
    threshold: 1024,
    level: 6,
  })
);

/*
|--------------------------------------------------------------------------
| REQUEST ID
|--------------------------------------------------------------------------
|
| Helps trace errors and slow requests in Render logs.
|
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
  const requestId = crypto.randomUUID();

  req.requestId = requestId;

  res.setHeader(
    "X-Request-ID",
    requestId
  );

  next();
});

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const normalizeOrigin = (origin) => {
  if (typeof origin !== "string") {
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

const allowedOrigins = isProduction
  ? [...new Set(environmentOrigins)]
  : [
      ...new Set([
        ...developmentOrigins,
        ...environmentOrigins,
      ]),
    ];

if (
  isProduction &&
  allowedOrigins.length === 0
) {
  throw new Error(
    "CLIENT_URL must be configured in production."
  );
}

if (!isProduction) {
  console.log(
    "CORS ALLOWED ORIGINS:",
    allowedOrigins
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      /*
       * Requests without Origin are allowed.
       *
       * Examples:
       * - Postman
       * - server-to-server
       * - health checks
       * - webhook requests
       */
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin =
        normalizeOrigin(origin);

      if (
        allowedOrigins.includes(
          normalizedOrigin
        )
      ) {
        return callback(null, true);
      }

      if (!isProduction) {
        console.warn(
          "CORS BLOCKED:",
          normalizedOrigin
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
      "X-Request-ID",
    ],

    optionsSuccessStatus: 204,
  })
);

/*
|--------------------------------------------------------------------------
| RAZORPAY WEBHOOK
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Razorpay signature verification requires
| the ORIGINAL RAW request body.
|
| Therefore this route MUST be registered
| BEFORE express.json().
|
|--------------------------------------------------------------------------
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
|--------------------------------------------------------------------------
| BODY PARSERS
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| API RATE LIMITER
|--------------------------------------------------------------------------
*/

const apiWindowMs =
  Number.parseInt(
    process.env.API_RATE_LIMIT_WINDOW_MS ||
      String(15 * 60 * 1000),
    10
  );

const apiMaxRequests = Math.max(
  Number.parseInt(
    process.env.API_RATE_LIMIT_MAX_REQUESTS ||
      "300",
    10
  ),
  1
);

const apiRateLimiter =
  rateLimit({
    windowMs:
      Number.isFinite(apiWindowMs) &&
      apiWindowMs > 0
        ? apiWindowMs
        : 15 * 60 * 1000,

    limit: apiMaxRequests,

    standardHeaders: "draft-8",

    legacyHeaders: false,

    message: {
      success: false,
      code: "TOO_MANY_REQUESTS",
      message:
        "Too many requests. Please try again later.",
    },

    handler: (req, res, next, options) => {
      const retryAfter = Math.ceil(
        options.windowMs / 1000
      );

      if (!isProduction) {
        console.warn(
          "API RATE LIMIT EXCEEDED:",
          {
            requestId:
              req.requestId,
            method: req.method,
            path: req.path,
            ip: req.ip,
          }
        );
      }

      res.setHeader(
        "Retry-After",
        String(retryAfter)
      );

      return res.status(429).json({
        success: false,
        code: "TOO_MANY_REQUESTS",
        message:
          "Too many requests. Please try again later.",
        retryAfter,
        requestId:
          req.requestId,
      });
    },

    skip: (req) => {
      return req.path === "/health";
    },
  });

app.use(
  "/api",
  apiRateLimiter
);

/*
|--------------------------------------------------------------------------
| REQUEST LOGGER
|--------------------------------------------------------------------------
|
| Disabled in production unless explicitly enabled.
|
| Set:
|
| ENABLE_REQUEST_LOGS=true
|
|--------------------------------------------------------------------------
*/

const enableRequestLogs =
  process.env.ENABLE_REQUEST_LOGS ===
  "true";

if (
  !isProduction ||
  enableRequestLogs
) {
  app.use((req, res, next) => {
    const start =
      process.hrtime.bigint();

    res.on("finish", () => {
      const end =
        process.hrtime.bigint();

      const durationMs =
        Number(end - start) /
        1_000_000;

      console.log(
        `${new Date().toISOString()} ` +
          `${req.method} ` +
          `${req.path} ` +
          `${res.statusCode} ` +
          `${durationMs.toFixed(1)}ms ` +
          `requestId=${req.requestId}`
      );
    });

    next();
  });
}

/*
|--------------------------------------------------------------------------
| BASIC API ROUTE
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Petrol Pump Management API is running",
    requestId:
      req.requestId,
  });
});

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
|
| Kept lightweight so Render can check the application.
|
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",
  (req, res) => {
    const dbState =
      mongoose.connection.readyState;

    const databaseConnected =
      dbState === 1;

    return res
      .status(
        databaseConnected
          ? 200
          : 503
      )
      .json({
        success:
          databaseConnected,

        status:
          databaseConnected
            ? "healthy"
            : "degraded",

        server: "running",

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

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
|
| Login/register remain public.
| /me is protected inside authRoutes.
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

/*
|--------------------------------------------------------------------------
| ADMIN ROLE PROTECTION
|--------------------------------------------------------------------------
|
| Existing behavior preserved:
|
| owner
| manager
|
| The individual route files still contain their
| authentication middleware, so we do not remove
| authentication here and risk changing behavior.
|
|--------------------------------------------------------------------------
*/

const adminOnly = [
  authMiddleware,
  allowRoles(
    "owner",
    "manager"
  ),
];

/*
|--------------------------------------------------------------------------
| FUEL
|--------------------------------------------------------------------------
*/

app.use(
  "/api/fuel",
  ...adminOnly,
  fuelRoutes
);

/*
|--------------------------------------------------------------------------
| SALES
|--------------------------------------------------------------------------
*/

app.use(
  "/api/sales",
  ...adminOnly,
  salesRoutes
);

/*
|--------------------------------------------------------------------------
| SUPER ADMIN
|--------------------------------------------------------------------------
*/

app.use(
  "/api/superadmin",
  superAdminRoutes
);

/*
|--------------------------------------------------------------------------
| NOZZLES
|--------------------------------------------------------------------------
*/

app.use(
  "/api/nozzles",
  ...adminOnly,
  nozzleRoutes
);

/*
 * Backward-compatible endpoint.
 *
 * Existing frontend/API clients can continue using:
 *
 * /api/nozzle
 */
app.use(
  "/api/nozzle",
  ...adminOnly,
  nozzleRoutes
);

/*
|--------------------------------------------------------------------------
| EXPENSES + EMPLOYEES
|--------------------------------------------------------------------------
*/

app.use(
  "/api/expenses",
  ...adminOnly,
  expenseRoutes
);

/*
|--------------------------------------------------------------------------
| LEDGER
|--------------------------------------------------------------------------
*/

app.use(
  "/api/ledger",
  ...adminOnly,
  ledgerRoutes
);

/*
|--------------------------------------------------------------------------
| REPORTS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/reports",
  ...adminOnly,
  reportRoutes
);

/*
|--------------------------------------------------------------------------
| SETTINGS
|--------------------------------------------------------------------------
*/

app.use(
  "/api/settings",
  ...adminOnly,
  settingsRoutes
);

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/

app.use(
  "/api/dashboard",
  ...adminOnly,
  dashboardRoutes
);

/*
|--------------------------------------------------------------------------
| DAILY CLOSING
|--------------------------------------------------------------------------
*/

app.use(
  "/api/daily-closing",
  ...adminOnly,
  dailyClosingRoutes
);

/*
|--------------------------------------------------------------------------
| AUDIT
|--------------------------------------------------------------------------
*/

app.use(
  "/api/audit",
  ...adminOnly,
  auditRoutes
);

/*
|--------------------------------------------------------------------------
| PASSWORD RESET
|--------------------------------------------------------------------------
|
| These routes must remain public because the user
| may not be authenticated when resetting a password.
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/password-reset",
  passwordResetRoutes
);

/*
|--------------------------------------------------------------------------
| RECOVERY
|--------------------------------------------------------------------------
*/

app.use(
  "/api/recovery",
  ...adminOnly,
  recoveryRoutes
);

/*
|--------------------------------------------------------------------------
| PAYMENTS
|--------------------------------------------------------------------------
|
| paymentRoutes handles its own role-based permissions.
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/payments",
  paymentRoutes
);

/*
|--------------------------------------------------------------------------
| 404 HANDLER
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message:
      "The requested route was not found.",
    requestId:
      req.requestId,
  });
});

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(
  (error, req, res, next) => {
    /*
     * Keep detailed errors in development.
     * Avoid exposing internal details in production.
     */
    if (!isProduction) {
      console.error(
        "SERVER ERROR:",
        {
          requestId:
            req.requestId,
          method:
            req.method,
          path:
            req.path,
          error,
        }
      );
    } else {
      console.error(
        "SERVER ERROR:",
        {
          requestId:
            req.requestId,
          method:
            req.method,
          path:
            req.path,
          name:
            error?.name,
          message:
            error?.message,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CORS
    |--------------------------------------------------------------------------
    */

    if (
      error?.message ===
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
    |--------------------------------------------------------------------------
    | INVALID JSON
    |--------------------------------------------------------------------------
    */

    if (
      error?.type ===
      "entity.parse.failed"
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_JSON",
        message:
          "Invalid JSON request.",
        requestId:
          req.requestId,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PAYLOAD TOO LARGE
    |--------------------------------------------------------------------------
    */

    if (
      error?.type ===
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
    |--------------------------------------------------------------------------
    | MONGOOSE VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      error?.name ===
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
    |--------------------------------------------------------------------------
    | MONGOOSE CAST
    |--------------------------------------------------------------------------
    */

    if (
      error?.name ===
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
    |--------------------------------------------------------------------------
    | DUPLICATE KEY
    |--------------------------------------------------------------------------
    */

    if (
      error?.code === 11000
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
    |--------------------------------------------------------------------------
    | DEFAULT ERROR
    |--------------------------------------------------------------------------
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

export default app;