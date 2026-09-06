import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* =====================================================
   AUTHENTICATION MIDDLEWARE

   SECURITY RULES:

   1. JWT must be valid.
   2. User is always loaded from MongoDB.
   3. Current database role is trusted.
   4. Current database pumpId is trusted.
   5. JWT pumpId is NEVER trusted.
   6. Inactive users are blocked.
   7. Client users must have pumpId.
   8. Superadmin does not require pumpId.
===================================================== */

const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    /* =================================================
       AUTHORIZATION HEADER
    ================================================= */

    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "NO_TOKEN",
      });
    }

    /* =================================================
       EXTRACT TOKEN
    ================================================= */

    const token =
      authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication token missing",
        code: "NO_TOKEN",
      });
    }

    /* =================================================
       JWT SECRET
    ================================================= */

    const secret =
      process.env.JWT_SECRET;

    if (
      !secret ||
      secret.trim().length < 32
    ) {
      console.error(
        "AUTH MIDDLEWARE: JWT_SECRET is missing or too weak"
      );

      return res.status(500).json({
        success: false,
        message:
          "Authentication configuration error",
        code: "AUTH_CONFIG_ERROR",
      });
    }

    /* =================================================
       VERIFY JWT
    ================================================= */

    const decoded = jwt.verify(
      token,
      secret,
      {
        algorithms: ["HS256"],
      }
    );

    /* =================================================
       USER ID
       
       New tokens:
       decoded.userId

       Older tokens:
       decoded.id

       pumpId is intentionally ignored.
    ================================================= */

    const userId =
      decoded.userId ||
      decoded.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    /* =================================================
       LOAD CURRENT USER
       
       IMPORTANT:
       Role, pumpId and active status come from MongoDB.
    ================================================= */

    const user =
      await User.findById(userId)
        .select(
          "_id name email role pumpId active"
        );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User account not found",
        code: "USER_NOT_FOUND",
      });
    }

    /* =================================================
       ACCOUNT STATUS
    ================================================= */

    if (user.active !== true) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    /* =================================================
       NORMALIZE ROLE
    ================================================= */

    const role = String(
      user.role || ""
    )
      .trim()
      .toLowerCase();

    /* =================================================
       ROLE VALIDATION
    ================================================= */

    const allowedRoles = [
      "superadmin",
      "owner",
      "manager",
      "staff",
    ];

    if (!allowedRoles.includes(role)) {
      console.error(
        `AUTH SECURITY: Invalid role "${user.role}" for user ${user._id}`
      );

      return res.status(403).json({
        success: false,
        message:
          "Invalid account role",
        code: "INVALID_ROLE",
      });
    }

    /* =================================================
       CLIENT PUMP VALIDATION
    ================================================= */

    if (
      role !== "superadmin" &&
      !user.pumpId
    ) {
      console.error(
        `AUTH SECURITY: Client user ${user._id} has no pumpId`
      );

      return res.status(403).json({
        success: false,
        message:
          "Your account is not correctly configured. Please contact Super Admin.",
        code:
          "ACCOUNT_CONFIGURATION_ERROR",
      });
    }

    /* =================================================
       ATTACH USER
    ================================================= */

    req.user = user;

    /* =================================================
       CONTINUE
    ================================================= */

    return next();
  } catch (error) {
    /* =================================================
       TOKEN EXPIRED
    ================================================= */

    if (
      error.name ===
      "TokenExpiredError"
    ) {
      console.log(
        "AUTH MIDDLEWARE: Token expired"
      );

      return res.status(401).json({
        success: false,
        message:
          "Session expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    /* =================================================
       INVALID TOKEN
    ================================================= */

    if (
      error.name ===
        "JsonWebTokenError" ||
      error.name ===
        "NotBeforeError"
    ) {
      console.log(
        "AUTH MIDDLEWARE: Invalid token"
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    /* =================================================
       INVALID USER ID
    ================================================= */

    if (
      error.name ===
      "CastError"
    ) {
      console.error(
        "AUTH MIDDLEWARE: Invalid user ID"
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    /* =================================================
       OTHER ERROR
    ================================================= */

    console.error(
      "AUTH MIDDLEWARE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Authentication error",
      code: "AUTH_ERROR",
    });
  }
};

export default authMiddleware;