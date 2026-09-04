import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    /* =================================================
       CHECK AUTHORIZATION HEADER
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
        message: "Authentication token missing",
        code: "NO_TOKEN",
      });
    }

    /* =================================================
       VERIFY TOKEN
    ================================================= */

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    /* =================================================
       GET USER ID

       New tokens use userId.
       id is kept as fallback for older tokens.
    ================================================= */

    const userId =
      decoded.userId ||
      decoded.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    /* =================================================
       FIND USER
    ================================================= */

    const user =
      await User.findById(userId)
        .select("-password");

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

    if (user.active === false) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    /* =================================================
       ATTACH USER
    ================================================= */

    req.user = user;

    /* =================================================
       OPTIONAL TOKEN FALLBACK

       Keeps compatibility with old tokens
       containing pumpId.
    ================================================= */

    if (
      !req.user.pumpId &&
      decoded.pumpId
    ) {
      req.user.pumpId =
        decoded.pumpId;
    }

    /* =================================================
       CONTINUE
    ================================================= */

    next();
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
    });
  }
};

export default authMiddleware;