import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Pump from "../models/Pump.js";

/* =====================================================
   AUTHENTICATION MIDDLEWARE

   SECURITY RULES:

   1. JWT must be valid.
   2. JWT algorithm is restricted to HS256.
   3. JWT must contain a valid user ID.
   4. User is always loaded from MongoDB.
   5. Current database role is trusted.
   6. Current database pumpId is trusted.
   7. JWT pumpId is NEVER trusted.
   8. Inactive users are blocked.
   9. Non-superadmin users must have pumpId.
   10. Associated pump must exist and be active.
   11. Superadmin does not require pumpId.
   12. Sensitive authentication errors are not exposed.
===================================================== */

const authMiddleware = async (req, res, next) => {
  try {
    /* =================================================
       AUTHORIZATION HEADER
    ================================================= */

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

    /* =================================================
       EXTRACT TOKEN
    ================================================= */

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing",
        code: "NO_TOKEN",
      });
    }

    /* =================================================
       JWT SECRET
    ================================================= */

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

    /* =================================================
       VERIFY JWT

       IMPORTANT:
       Only user identity is taken from JWT.

       Role and pumpId are ALWAYS loaded from
       the current MongoDB User document.
    ================================================= */

    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });

    /* =================================================
       USER ID

       Supported:
       - New tokens: userId
       - Legacy tokens: id

       JWT pumpId is intentionally ignored.
    ================================================= */

    const userId = decoded?.userId || decoded?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    /* =================================================
       LOAD CURRENT USER

       IMPORTANT:
       Role, pumpId and active status come from MongoDB.
    ================================================= */

    const user = await User.findById(userId).select(
      "_id name email role pumpId active"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found",
        code: "USER_NOT_FOUND",
      });
    }

    /* =================================================
       ACCOUNT STATUS
    ================================================= */

    if (user.active !== true) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    /* =================================================
       NORMALIZE ROLE
    ================================================= */

    const role = String(user.role || "")
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
        message: "Invalid account role",
        code: "INVALID_ROLE",
      });
    }

    /* =================================================
       SUPERADMIN

       Superadmin is not associated with a pump.
    ================================================= */

    if (role === "superadmin") {
      req.user = user;

      return next();
    }

    /* =================================================
       NORMAL USER PUMP VALIDATION
    ================================================= */

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

    /* =================================================
       VERIFY ASSOCIATED PUMP

       IMPORTANT:
       A valid user account must also belong to an
       existing and active pump.

       This prevents access when:
       - pump was deleted
       - pump was deactivated
       - user still exists in database
    ================================================= */

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

    /* =================================================
       ATTACH USER

       req.user contains the CURRENT database state.

       Never attach role/pumpId from JWT.
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

    if (error?.name === "TokenExpiredError") {
      console.log("AUTH MIDDLEWARE: Token expired");

      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    /* =================================================
       INVALID TOKEN
    ================================================= */

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

    /* =================================================
       INVALID USER ID
    ================================================= */

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

    /* =================================================
       DATABASE / OTHER AUTH ERROR

       Do not expose internal database errors,
       stack traces or implementation details.
    ================================================= */

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