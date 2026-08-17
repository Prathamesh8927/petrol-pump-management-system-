/* =====================================================
   NOT FOUND
===================================================== */

export const notFound = (
  req,
  res
) => {
  return res.status(404).json({
    success: false,

    message: `Route not found: ${req.method} ${req.originalUrl}`,
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

  /* DUPLICATE MONGODB VALUE */

  if (
    error?.code === 11000
  ) {
    return res.status(409).json({
      success: false,

      message:
        "Duplicate record already exists",

      fields:
        error.keyValue || {},
    });
  }

  /* MONGOOSE VALIDATION */

  if (
    error?.name ===
    "ValidationError"
  ) {
    const errors =
      Object.values(
        error.errors || {}
      ).map(
        (item) =>
          item.message
      );

    return res.status(400).json({
      success: false,

      message:
        errors.join(", "),
    });
  }

  /* INVALID OBJECT ID */

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

  /* JWT */

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

  const statusCode =
    error.statusCode ||
    error.status ||
    500;

  return res
    .status(statusCode)
    .json({
      success: false,

      message:
        error.message ||
        "Internal server error",

      ...(process.env.NODE_ENV ===
        "development"
        ? {
            stack:
              error.stack,
          }
        : {}),
    });
};