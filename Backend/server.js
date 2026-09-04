import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";

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
      // Allow requests such as Postman/server-to-server
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("CORS BLOCKED ORIGIN:", origin);

      return callback(
        new Error(`CORS origin not allowed: ${origin}`)
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =====================================================
   REQUEST LOGGER
===================================================== */

app.use((req, res, next) => {
  console.log(
    `${req.method} ${req.originalUrl}`
  );

  next();
});

/* =====================================================
   BASIC ROUTES
===================================================== */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Petrol Pump Management API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
  });
});

/* =====================================================
   API ROUTES
===================================================== */

app.use("/api/auth", authRoutes);

app.use("/api/fuel", fuelRoutes);

app.use("/api/sales", salesRoutes);

app.use("/api/superadmin", superAdminRoutes);

app.use("/api/nozzles", nozzleRoutes);

app.use("/api/nozzle", nozzleRoutes);

app.use("/api/expenses", expenseRoutes);

app.use("/api/ledger", ledgerRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/settings", settingsRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use(
  "/api/daily-closing",
  dailyClosingRoutes
);

app.use("/api/audit", auditRoutes);

/* =====================================================
   404
===================================================== */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use((error, req, res, next) => {
  console.error(
    "SERVER ERROR:",
    error
  );

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

  res.status(500).json({
    success: false,
    message:
      error.message ||
      "Internal server error",
  });
});

/* =====================================================
   START SERVER
===================================================== */

const PORT =
  process.env.PORT || 8080;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error(
      "Database connection failed:",
      error
    );

    process.exit(1);
  });