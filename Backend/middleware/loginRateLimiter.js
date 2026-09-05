import crypto from "crypto";

/* =====================================================
   LOGIN / REGISTRATION RATE LIMITER

   Security:
   1. Limits repeated attempts.
   2. Uses IP + normalized email.
   3. Does not trust a raw X-Forwarded-For header.
   4. Supports configurable limits through environment
      variables.
   5. Automatically removes expired records.
   6. Returns proper HTTP 429 + Retry-After.
   7. Keeps sensitive email data out of the Map key logs.
   
   NOTE:
   This is suitable for a single backend instance.
   For multiple backend instances, use a shared store
   such as Redis.
===================================================== */

/* =====================================================
   CONFIGURATION
===================================================== */

const WINDOW_MS = Math.max(
  Number.parseInt(
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS ||
      String(15 * 60 * 1000),
    10
  ),
  60 * 1000
);

const MAX_ATTEMPTS = Math.max(
  Number.parseInt(
    process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS ||
      "10",
    10
  ),
  1
);

/* =====================================================
   IN-MEMORY STORE
===================================================== */

const attempts = new Map();

/* =====================================================
   NORMALIZE EMAIL
===================================================== */

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    return "unknown";
  }

  return email
    .trim()
    .toLowerCase()
    .slice(0, 254);
};

/* =====================================================
   GET CLIENT IP

   req.ip is preferred.

   X-Forwarded-For is only used as a fallback.
   Your production Express server should configure
   "trust proxy" correctly when behind a reverse proxy.
===================================================== */

const getClientIp = (req) => {
  const ip =
    typeof req.ip === "string"
      ? req.ip.trim()
      : "";

  if (ip) {
    return ip;
  }

  const forwarded =
    req.headers["x-forwarded-for"];

  if (
    typeof forwarded === "string" &&
    forwarded.trim()
  ) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return (
    req.socket?.remoteAddress ||
    "unknown"
  );
};

/* =====================================================
   CREATE SAFE STORE KEY

   The email itself is hashed so that sensitive
   login identifiers are not retained directly
   in the in-memory key.
===================================================== */

const createKey = (
  ip,
  email
) => {
  const normalizedValue =
    `${ip}:${email}`;

  return crypto
    .createHash("sha256")
    .update(normalizedValue)
    .digest("hex");
};

/* =====================================================
   CLEAN EXPIRED RECORDS

   Cleanup is intentionally limited so a very large
   Map does not have to be scanned on every request.
===================================================== */

const cleanup = () => {
  const now = Date.now();

  for (const [
    key,
    record,
  ] of attempts.entries()) {
    if (
      now - record.firstAttempt >=
      WINDOW_MS
    ) {
      attempts.delete(key);
    }
  }
};

/* =====================================================
   RATE LIMITER
===================================================== */

const loginRateLimiter = (
  req,
  res,
  next
) => {
  try {
    cleanup();

    const ip =
      getClientIp(req);

    const email =
      normalizeEmail(
        req.body?.email
      );

    const key =
      createKey(
        ip,
        email
      );

    const now =
      Date.now();

    let record =
      attempts.get(key);

    /* ===============================================
       CREATE NEW WINDOW
    =============================================== */

    if (!record) {
      record = {
        count: 0,
        firstAttempt: now,
      };
    }

    /* ===============================================
       RESET EXPIRED WINDOW
    =============================================== */

    if (
      now - record.firstAttempt >=
      WINDOW_MS
    ) {
      record = {
        count: 0,
        firstAttempt: now,
      };
    }

    /* ===============================================
       INCREMENT ATTEMPT
    =============================================== */

    record.count += 1;

    attempts.set(
      key,
      record
    );

    /* ===============================================
       RATE LIMIT EXCEEDED
    =============================================== */

    if (
      record.count >
      MAX_ATTEMPTS
    ) {
      const elapsed =
        now -
        record.firstAttempt;

      const remainingMs =
        Math.max(
          WINDOW_MS -
            elapsed,
          0
        );

      const retryAfter =
        Math.max(
          Math.ceil(
            remainingMs / 1000
          ),
          1
        );

      res.set(
        "Retry-After",
        String(retryAfter)
      );

      return res.status(429).json({
        success: false,

        code:
          "TOO_MANY_LOGIN_ATTEMPTS",

        message:
          "Too many login attempts. Please try again later.",

        retryAfter,
      });
    }

    /* ===============================================
       CONTINUE
    =============================================== */

    return next();
  } catch (error) {
    console.error(
      "LOGIN RATE LIMITER ERROR:",
      error
    );

    /*
     * Fail closed for security.
     *
     * If the rate limiter itself fails, do not
     * silently bypass authentication protection.
     */

    return res.status(503).json({
      success: false,

      code:
        "RATE_LIMITER_UNAVAILABLE",

      message:
        "Authentication service temporarily unavailable. Please try again later.",
    });
  }
};

export default loginRateLimiter;