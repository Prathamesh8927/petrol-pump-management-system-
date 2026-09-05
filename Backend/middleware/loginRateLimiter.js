const attempts = new Map();

/* =====================================================
   CONFIGURATION
===================================================== */

const WINDOW_MS =
  15 * 60 * 1000; // 15 minutes

const MAX_ATTEMPTS = 10;

/* =====================================================
   CLEAN OLD RECORDS
===================================================== */

const cleanup = () => {
  const now = Date.now();

  for (const [
    key,
    record,
  ] of attempts.entries()) {
    if (
      now - record.firstAttempt >
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
  cleanup();

  const ip =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown";

  const email =
    typeof req.body?.email ===
    "string"
      ? req.body.email
          .trim()
          .toLowerCase()
      : "unknown";

  /*
   * Combine IP + email.
   *
   * This prevents one IP from attacking
   * many accounts and also protects a
   * specific account from repeated attempts.
   */

  const key = `${ip}:${email}`;

  const now = Date.now();

  let record =
    attempts.get(key);

  if (!record) {
    record = {
      count: 0,
      firstAttempt: now,
    };
  }

  if (
    now - record.firstAttempt >
    WINDOW_MS
  ) {
    record = {
      count: 0,
      firstAttempt: now,
    };
  }

  record.count += 1;

  attempts.set(
    key,
    record
  );

  if (
    record.count >
    MAX_ATTEMPTS
  ) {
    const retryAfter = Math.ceil(
      (
        WINDOW_MS -
        (now -
          record.firstAttempt)
      ) / 1000
    );

    res.set(
      "Retry-After",
      retryAfter.toString()
    );

    return res.status(429).json({
      success: false,
      code: "TOO_MANY_LOGIN_ATTEMPTS",
      message:
        "Too many login attempts. Please try again later.",
      retryAfter,
    });
  }

  next();
};

export default loginRateLimiter;