import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";

import connectDB, {
  disconnectDB,
} from "./config/db.js";

/* =====================================================
   LOAD ENVIRONMENT VARIABLES
===================================================== */

/*
 * Load .env BEFORE dynamically importing app.js.
 *
 * This guarantees that environment variables are
 * available when the Express application is created.
 */

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

const validateEnvironment = () => {
  const errors = [];

  /* -------------------------------------------------
     JWT SECRET
  ------------------------------------------------- */

  if (
    typeof JWT_SECRET !== "string" ||
    JWT_SECRET.trim().length < 32
  ) {
    errors.push(
      "JWT_SECRET must contain at least 32 characters."
    );
  }

  /* -------------------------------------------------
     PRODUCTION CLIENT URL
  ------------------------------------------------- */

  if (
    NODE_ENV === "production" &&
    !process.env.CLIENT_URL?.trim()
  ) {
    errors.push(
      "CLIENT_URL must be configured in production."
    );
  }

  /* -------------------------------------------------
     PORT
  ------------------------------------------------- */

  if (
    !Number.isInteger(PORT) ||
    PORT < 1 ||
    PORT > 65535
  ) {
    errors.push(
      "PORT must be a valid number between 1 and 65535."
    );
  }

  /* -------------------------------------------------
     MONGO URI
  ------------------------------------------------- */

  if (
    typeof process.env.MONGO_URI !== "string" ||
    !process.env.MONGO_URI.trim()
  ) {
    errors.push(
      "MONGO_URI is not configured."
    );
  }

  /* -------------------------------------------------
     THROW IF INVALID
  ------------------------------------------------- */

  if (errors.length > 0) {
    console.error(
      "===================================================="
    );

    console.error(
      "FATAL ENVIRONMENT CONFIGURATION ERROR"
    );

    errors.forEach((error) => {
      console.error(`- ${error}`);
    });

    console.error(
      "===================================================="
    );

    process.exit(1);
  }
};

validateEnvironment();

/* =====================================================
   REQUEST ID
===================================================== */

/*
 * Generates a unique ID for startup/shutdown logs.
 *
 * HTTP request IDs are handled inside app.js.
 */

const startupId =
  crypto.randomUUID();

console.log(
  `Server startup ID: ${startupId}`
);

/* =====================================================
   SERVER
===================================================== */

let app = null;
let server = null;
let isShuttingDown = false;

/* =====================================================
   LOAD APP
===================================================== */

/*
 * Dynamic import is intentional.
 *
 * dotenv.config() has already executed before
 * app.js is loaded.
 */

const loadApp = async () => {
  const module =
    await import("./app.js");

  return module.default;
};

/* =====================================================
   START SERVER
===================================================== */

const startServer = async () => {
  try {
    /* -------------------------------------------------
       LOAD EXPRESS APPLICATION
    ------------------------------------------------- */

    app = await loadApp();

    /* -------------------------------------------------
       CONNECT DATABASE
    ------------------------------------------------- */

    await connectDB();

    /* -------------------------------------------------
       START HTTP SERVER
    ------------------------------------------------- */

    server = app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          "=============================================="
        );

        console.log(
          "MyPump Backend Started Successfully"
        );

        console.log(
          "=============================================="
        );

        console.log(
          `Environment       : ${NODE_ENV}`
        );

        console.log(
          `Port              : ${PORT}`
        );

        console.log(
          "MongoDB           : CONNECTED"
        );

        console.log(
          "JWT Security      : ENABLED"
        );

        console.log(
          "Helmet            : ENABLED"
        );

        console.log(
          "Compression       : ENABLED"
        );

        console.log(
          "Rate Limiting     : ENABLED"
        );

        console.log(
          "CORS              : CONFIGURED"
        );

        console.log(
          "Health            : /api/health"
        );

        console.log(
          "Recovery          : /api/recovery"
        );

        console.log(
          "=============================================="
        );
      }
    );

    /* =================================================
       HTTP SERVER SETTINGS
    ================================================= */

    /*
     * Keep-alive timeout.
     *
     * Slightly longer than common proxy/load-balancer
     * keep-alive values.
     */

    server.keepAliveTimeout =
      65000;

    /*
     * Must be greater than keepAliveTimeout.
     */

    server.headersTimeout =
      66000;

    /*
     * Maximum time allowed for an HTTP request.
     *
     * Reports and larger database operations can
     * occasionally take longer than normal CRUD calls.
     */

    server.requestTimeout =
      120000;

    /*
     * Socket timeout.
     */

    server.timeout =
      120000;

  } catch (error) {
    console.error(
      "===================================================="
    );

    console.error(
      "SERVER STARTUP FAILED"
    );

    console.error(
      error?.stack ||
        error?.message ||
        error
    );

    console.error(
      "===================================================="
    );

    process.exit(1);
  }
};

/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

const gracefulShutdown = async (
  signal
) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(
    `${signal} received. Starting graceful shutdown...`
  );

  /*
   * Prevent shutdown from hanging forever.
   */

  const shutdownTimeout =
    setTimeout(() => {
      console.error(
        "Graceful shutdown timeout exceeded."
      );

      process.exit(1);
    }, 15000);

  /*
   * Do not keep the process alive because of
   * this timeout.
   */

  shutdownTimeout.unref();

  try {
    /* -------------------------------------------------
       STOP ACCEPTING NEW HTTP CONNECTIONS
    ------------------------------------------------- */

    if (server) {
      await new Promise(
        (resolve) => {
          server.close(
            (error) => {
              if (error) {
                console.error(
                  "HTTP server close error:",
                  error.message
                );
              } else {
                console.log(
                  "HTTP server closed."
                );
              }

              resolve();
            }
          );
        }
      );

      /*
       * Node.js provides these methods on newer
       * versions. They help release idle connections
       * during shutdown.
       */

      if (
        typeof server.closeIdleConnections ===
        "function"
      ) {
        server.closeIdleConnections();
      }

      if (
        typeof server.closeAllConnections ===
        "function"
      ) {
        server.closeAllConnections();
      }
    }

    /* -------------------------------------------------
       CLOSE MONGODB
    ------------------------------------------------- */

    if (
      mongoose.connection.readyState !== 0
    ) {
      await disconnectDB();
    }

    console.log(
      "Graceful shutdown completed."
    );

    process.exit(0);

  } catch (error) {
    console.error(
      "Error during graceful shutdown:",
      error?.stack ||
        error?.message ||
        error
    );

    process.exit(1);
  }
};

/* =====================================================
   PROCESS ERROR HANDLING
===================================================== */

/*
 * Unhandled promise rejection.
 *
 * Log it so production logs show the actual reason.
 */

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "UNHANDLED PROMISE REJECTION:"
    );

    console.error(
      reason?.stack ||
        reason?.message ||
        reason
    );
  }
);

/*
 * Uncaught exception is considered fatal.
 */

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "UNCAUGHT EXCEPTION:"
    );

    console.error(
      error?.stack ||
        error?.message ||
        error
    );

    process.exit(1);
  }
);

/* =====================================================
   PROCESS SIGNALS
===================================================== */

process.on(
  "SIGTERM",
  () => {
    gracefulShutdown(
      "SIGTERM"
    );
  }
);

process.on(
  "SIGINT",
  () => {
    gracefulShutdown(
      "SIGINT"
    );
  }
);

/* =====================================================
   START APPLICATION
===================================================== */

startServer();