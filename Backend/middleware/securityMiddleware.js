import helmet from "helmet";
import rateLimit from "express-rate-limit";

/* =====================================================
   GLOBAL API RATE LIMIT
===================================================== */

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 1000,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },
});

/* =====================================================
   LOGIN RATE LIMIT
===================================================== */

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 10,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many login attempts. Please try again later.",
  },
});

/* =====================================================
   SECURITY HEADERS
===================================================== */

export const securityHeaders =
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  });