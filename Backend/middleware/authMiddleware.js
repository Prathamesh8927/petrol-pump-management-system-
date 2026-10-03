import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Pump from "../models/Pump.js";

/* =====================================================
   AUTHENTICATION MIDDLEWARE

   SECURITY RULES:

   1. JWT must be valid.
   2. JWT algorithm is restricted to HS256.
   3. JWT must contain a valid user ID.
   4. JWT tokenVersion must match the database.
   5. User is always loaded from MongoDB.
   6. Current database role is trusted.
   7. Current database pumpId is trusted.
   8. JWT pumpId is NEVER trusted.
   9. Inactive users are blocked.
   10. Non-superadmin users must have pumpId.
   11. Associated pump must exist and be active.
   12. Superadmin does not require pumpId.
   13. Sensitive authentication errors are not exposed.
===================================================== */

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      typeof authHeader !== "string" ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "NO_TOKEN",
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing",
        code: "NO_TOKEN",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (
      typeof secret !== "string" ||
      secret.trim().length < 32
    ) {
      console.error(
        "AUTH MIDDLEWARE: JWT_SECRET is missing or too weak"
      );

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
        code: "AUTH_CONFIG_ERROR",
      });
    }

    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });

    const userId = decoded?.userId || decoded?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    const jwtTokenVersion = Number(decoded?.tokenVersion);

    if (!Number.isInteger(jwtTokenVersion) || jwtTokenVersion < 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    const user = await User.findById(userId).select(
      "_id name email role pumpId active tokenVersion"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (user.active !== true) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    const currentTokenVersion = Number(user.tokenVersion || 0);

    if (jwtTokenVersion !== currentTokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "TOKEN_REVOKED",
      });
    }

    const role = String(user.role || "")
      .trim()
      .toLowerCase();

    const allowedRoles = [
      "superadmin",
      "owner",
      "manager",
      "staff",
      "employee",
    ];

    if (!allowedRoles.includes(role)) {
      console.error(
        `AUTH SECURITY: Invalid role "${user.role}" for user ${user._id}`
      );

      return res.status(403).json({
        success: false,
        message: "Invalid account role",
        code: "INVALID_ROLE",
      });
    }

    if (role === "superadmin") {
      req.user = user;
      return next();
    }

    if (!user.pumpId) {
      console.error(
        `AUTH SECURITY: User ${user._id} has no pumpId`
      );

      return res.status(403).json({
        success: false,
        message:
          "Your account is not correctly configured. Please contact Super Admin.",
        code: "ACCOUNT_CONFIGURATION_ERROR",
      });
    }

    const pump = await Pump.findOne({
      _id: user.pumpId,
      active: true,
    }).select("_id active");

    if (!pump) {
      console.error(
        `AUTH SECURITY: User ${user._id} belongs to missing/inactive pump ${user.pumpId}`
      );

      return res.status(403).json({
        success: false,
        message:
          "Your petrol pump account is inactive or unavailable. Please contact Super Admin.",
        code: "PUMP_INACTIVE",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      console.log("AUTH MIDDLEWARE: Token expired");

      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    if (
      error?.name === "JsonWebTokenError" ||
      error?.name === "NotBeforeError"
    ) {
      console.log("AUTH MIDDLEWARE: Invalid token");

      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    if (error?.name === "CastError") {
      console.error(
        "AUTH MIDDLEWARE: Invalid user ID"
      );

      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    console.error(
      "AUTH MIDDLEWARE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Authentication error",
      code: "AUTH_ERROR",
    });
  }
};

export default authMiddleware;