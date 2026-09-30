/* =====================================================
   NOT FOUND
===================================================== */

export const notFound = (
  req,
  res
) => {
  return res.status(404).json({
    success: false,

    message:
      `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

export const errorHandler = (
  error,
  req,
  res,
  next
) => {
  console.error(
    "GLOBAL ERROR:",
    error
  );

  /* ===================================================
     ALREADY SENT RESPONSE
  =================================================== */

  if (res.headersSent) {
    return next(error);
  }

  /* ===================================================
     CORS ERROR
  =================================================== */

  if (
    error?.message ===
    "CORS origin not allowed"
  ) {
    return res.status(403).json({
      success: false,

      message:
        "Request origin is not allowed.",
    });
  }

  /* ===================================================
     INVALID JSON
  =================================================== */

  if (
    error?.type ===
    "entity.parse.failed"
  ) {
    return res.status(400).json({
      success: false,

      message:
        "Invalid JSON request.",
    });
  }

  /* ===================================================
     PAYLOAD TOO LARGE
  =================================================== */

  if (
    error?.type ===
    "entity.too.large"
  ) {
    return res.status(413).json({
      success: false,

      message:
        "Request payload is too large.",
    });
  }

  /* ===================================================
     DUPLICATE MONGODB VALUE
  =================================================== */

  if (
    error?.code === 11000
  ) {
    const duplicateFields =
      error?.keyValue &&
      typeof error.keyValue ===
        "object"
        ? Object.keys(
            error.keyValue
          )
        : [];

    return res.status(409).json({
      success: false,

      message:
        "Duplicate record already exists",

      /*
       * Return field names, but don't expose
       * potentially sensitive duplicate values.
       */
      fields:
        duplicateFields,
    });
  }

  /* ===================================================
     MONGOOSE VALIDATION
  =================================================== */

  if (
    error?.name ===
    "ValidationError"
  ) {
    const errors =
      Object.values(
        error.errors || {}
      )
        .map(
          (item) =>
            item?.message
        )
        .filter(Boolean);

    return res.status(400).json({
      success: false,

      message:
        errors.length > 0
          ? errors.join(", ")
          : "Invalid request data.",
    });
  }

  /* ===================================================
     INVALID OBJECT ID
  =================================================== */

  if (
    error?.name ===
    "CastError"
  ) {
    return res.status(400).json({
      success: false,

      message:
        "Invalid record ID",
    });
  }

  /* ===================================================
     JWT
  =================================================== */

  if (
    error?.name ===
    "JsonWebTokenError"
  ) {
    return res.status(401).json({
      success: false,

      message:
        "Invalid authentication token",
    });
  }

  if (
    error?.name ===
    "TokenExpiredError"
  ) {
    return res.status(401).json({
      success: false,

      message:
        "Session expired. Please login again.",
    });
  }

  if (
    error?.name ===
    "NotBeforeError"
  ) {
    return res.status(401).json({
      success: false,

      message:
        "Authentication token is not active.",
    });
  }

  /* ===================================================
     STATUS CODE
  =================================================== */

  const requestedStatus =
    Number(
      error?.statusCode ||
        error?.status
    );

  const statusCode =
    Number.isInteger(
      requestedStatus
    ) &&
    requestedStatus >= 400 &&
    requestedStatus <= 599
      ? requestedStatus
      : 500;

  /* ===================================================
     PRODUCTION RESPONSE
  =================================================== */

  if (
    process.env.NODE_ENV !==
    "development"
  ) {
    return res.status(
      statusCode
    ).json({
      success: false,

      message:
        statusCode >= 500
          ? "Internal server error"
          : (
              error?.message ||
              "Request failed"
            ),
    });
  }

  /* ===================================================
     DEVELOPMENT RESPONSE
  =================================================== */

  return res.status(
    statusCode
  ).json({
    success: false,

    message:
      error?.message ||
      "Internal server error",

    stack:
      error?.stack,
  });
};