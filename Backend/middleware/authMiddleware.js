import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    /* =====================================
       CHECK TOKEN EXISTS
    ===================================== */

    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
        code: "NO_TOKEN",
      });
    }

    const token =
      authHeader.split(" ")[1];

    /* =====================================
       VERIFY TOKEN
    ===================================== */

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    /* =====================================
       GET USER
    ===================================== */

    const user =
      await User.findById(
        decoded.userId
      ).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User account not found",
        code:
          "USER_NOT_FOUND",
      });
    }

    /*
      Old users may not contain
      active field.

      Therefore only block when
      it is explicitly false.
    */

    if (
      user.active === false
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive",
        code:
          "ACCOUNT_INACTIVE",
      });
    }

    /* =====================================
       ATTACH USER
    ===================================== */

    req.user = user;

    /*
      Fallback for older database
      records/token structure.
    */

    if (
      !req.user.pumpId &&
      decoded.pumpId
    ) {
      req.user.pumpId =
        decoded.pumpId;
    }

    next();
  } catch (error) {
    /* =====================================
       TOKEN EXPIRED
    ===================================== */

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
        code:
          "TOKEN_EXPIRED",
      });
    }

    /* =====================================
       INVALID TOKEN
    ===================================== */

    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      console.log(
        "AUTH MIDDLEWARE: Invalid token"
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
        code:
          "INVALID_TOKEN",
      });
    }

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