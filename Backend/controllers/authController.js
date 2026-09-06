import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import RegistrationRequest from "../models/RegistrationRequest.js";

/* =====================================================
   JWT CONFIGURATION
===================================================== */

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (
    !secret ||
    secret.trim().length < 32
  ) {
    throw new Error(
      "JWT_SECRET is missing or too weak. JWT_SECRET must contain at least 32 characters."
    );
  }

  return secret;
};

/* =====================================================
   GENERATE JWT
===================================================== */

const generateToken = (userId) => {
  return jwt.sign(
    {
      userId: userId.toString(),
    },
    getJwtSecret(),
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        "7d",
      algorithm: "HS256",
    }
  );
};

/* =====================================================
   LOGIN
===================================================== */

export const login = async (
  req,
  res
) => {
  try {
    const {
      email,
      password,
    } = req.body;

    /* -----------------------------------------------
       VALIDATION
    ------------------------------------------------ */

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    /* -----------------------------------------------
       EMAIL VALIDATION
    ------------------------------------------------ */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address.",
      });
    }

    /* -----------------------------------------------
       FIND USER
       
       Password has select:false in User.js.
       Therefore +password is mandatory.
    ------------------------------------------------ */

    const user =
      await User.findOne({
        email: normalizedEmail,
      })
        .select("+password")
        .populate(
          "pumpId",
          "pumpName ownerName phone email active"
        );

    /* -----------------------------------------------
       USER NOT FOUND
    ------------------------------------------------ */

    if (!user) {
      /* ---------------------------------------------
         CHECK PENDING REGISTRATION
      --------------------------------------------- */

      const pendingRequest =
        await RegistrationRequest.findOne({
          email: normalizedEmail,
          status: "pending",
        });

      if (pendingRequest) {
        return res.status(403).json({
          success: false,
          code: "REGISTRATION_PENDING",
          message:
            "Your registration request is waiting for Super Admin approval.",
        });
      }

      /* ---------------------------------------------
         CHECK REJECTED REGISTRATION
      --------------------------------------------- */

      const rejectedRequest =
        await RegistrationRequest.findOne({
          email: normalizedEmail,
          status: "rejected",
        }).sort({
          updatedAt: -1,
        });

      if (rejectedRequest) {
        return res.status(403).json({
          success: false,
          code: "REGISTRATION_REJECTED",
          message:
            rejectedRequest.rejectionReason
              ? `Your registration request was rejected: ${rejectedRequest.rejectionReason}`
              : "Your registration request was rejected by Super Admin.",
        });
      }

      /* ---------------------------------------------
         GENERIC LOGIN ERROR
      --------------------------------------------- */

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* -----------------------------------------------
       ACCOUNT STATUS
    ------------------------------------------------ */

    if (user.active !== true) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message:
          "Your account is currently disabled. Please contact Super Admin.",
      });
    }

    /* -----------------------------------------------
       NORMALIZE ROLE
    ------------------------------------------------ */

    const role =
      String(user.role || "")
        .trim()
        .toLowerCase();

    /* -----------------------------------------------
       VALIDATE ROLE
    ------------------------------------------------ */

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
        code: "INVALID_ROLE",
        message:
          "Invalid account role.",
      });
    }

    /* -----------------------------------------------
       PUMP VALIDATION
    ------------------------------------------------ */

    if (
      role !== "superadmin" &&
      !user.pumpId
    ) {
      console.error(
        `AUTH SECURITY: User ${user._id} has role ${role} but no pumpId`
      );

      return res.status(403).json({
        success: false,
        code:
          "ACCOUNT_CONFIGURATION_ERROR",
        message:
          "Your account is not correctly configured. Please contact Super Admin.",
      });
    }

    /* -----------------------------------------------
       PASSWORD VALIDATION
    ------------------------------------------------ */

    if (!user.password) {
      console.error(
        `AUTH SECURITY: User ${user._id} has no password hash`
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const passwordMatched =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* -----------------------------------------------
       PUMP STATUS
    ------------------------------------------------ */

    if (
      role !== "superadmin" &&
      user.pumpId?.active === false
    ) {
      return res.status(403).json({
        success: false,
        code: "PUMP_DISABLED",
        message:
          "This petrol pump account is currently disabled. Please contact Super Admin.",
      });
    }

    /* -----------------------------------------------
       GENERATE TOKEN
    ------------------------------------------------ */

    const token =
      generateToken(user._id);

    /* -----------------------------------------------
       RESPONSE
    ------------------------------------------------ */

    return res.status(200).json({
      success: true,
      message: "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role,
        pumpId:
          user.pumpId || null,
        active: user.active,
      },
    });
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Login failed.",
    });
  }
};

/* =====================================================
   REGISTER
===================================================== */

export const register = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      pumpName,
      companyName,
      dealerCode,
      gstin,
      address,
      city,
      state,
      pincode,
      plan,
    } = req.body;

    /* -----------------------------------------------
       BASIC VALIDATION
    ------------------------------------------------ */

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof phone !== "string" ||
      typeof pumpName !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password, phone and pump name are required.",
      });
    }

    const cleanName =
      name.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    const cleanPhone =
      phone.trim();

    const cleanPumpName =
      pumpName.trim();

    if (
      !cleanName ||
      !normalizedEmail ||
      !password ||
      !cleanPhone ||
      !cleanPumpName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password, phone and pump name are required.",
      });
    }

    /* -----------------------------------------------
       PASSWORD VALIDATION
    ------------------------------------------------ */

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 6 characters.",
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        message:
          "Password cannot contain more than 128 characters.",
      });
    }

    /* -----------------------------------------------
       EMAIL VALIDATION
    ------------------------------------------------ */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address.",
      });
    }

    /* -----------------------------------------------
       EXISTING USER
    ------------------------------------------------ */

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: "ACCOUNT_EXISTS",
        message:
          "An account with this email already exists.",
      });
    }

    /* -----------------------------------------------
       EXISTING PENDING REQUEST
    ------------------------------------------------ */

    const existingPending =
      await RegistrationRequest.findOne({
        email: normalizedEmail,
        status: "pending",
      });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        code:
          "REGISTRATION_PENDING",
        message:
          "A registration request for this email is already pending approval.",
      });
    }

    /* -----------------------------------------------
       HASH PASSWORD
       
       RegistrationRequest stores the hash.
    ------------------------------------------------ */

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    /* -----------------------------------------------
       CREATE REGISTRATION REQUEST
    ------------------------------------------------ */

    const request =
      await RegistrationRequest.create({
        ownerName:
          cleanName,

        email:
          normalizedEmail,

        password:
          passwordHash,

        phone:
          cleanPhone,

        pumpName:
          cleanPumpName,

        companyName:
          typeof companyName ===
          "string"
            ? companyName.trim()
            : "",

        dealerCode:
          typeof dealerCode ===
          "string"
            ? dealerCode.trim()
            : "",

        gstin:
          typeof gstin ===
          "string"
            ? gstin
                .trim()
                .toUpperCase()
            : "",

        address:
          typeof address ===
          "string"
            ? address.trim()
            : "",

        city:
          typeof city ===
          "string"
            ? city.trim()
            : "",

        state:
          typeof state ===
          "string"
            ? state.trim()
            : "",

        pincode:
          typeof pincode ===
          "string"
            ? pincode.trim()
            : "",

        plan:
          typeof plan ===
            "string" &&
          plan.trim()
            ? plan.trim()
            : "standard",

        status:
          "pending",
      });

    /* -----------------------------------------------
       RESPONSE
    ------------------------------------------------ */

    return res.status(201).json({
      success: true,
      message:
        "Registration submitted successfully. Please wait for Super Admin approval.",
      requestId:
        request._id,
      status:
        request.status,
    });
  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    /* -----------------------------------------------
       MONGOOSE VALIDATION
    ------------------------------------------------ */

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors
          )
            .map(
              (item) =>
                item.message
            )
            .join(", "),
      });
    }

    /* -----------------------------------------------
       DUPLICATE KEY
    ------------------------------------------------ */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A registration request already exists for this email.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to submit registration request.",
    });
  }
};

/* =====================================================
   GET CURRENT USER
===================================================== */

export const getMe = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?._id ||
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const user =
      await User.findById(userId)
        .select("-password")
        .populate(
          "pumpId",
          "pumpName ownerName phone email active"
        );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found.",
      });
    }

    if (user.active !== true) {
      return res.status(403).json({
        success: false,
        code:
          "ACCOUNT_INACTIVE",
        message:
          "Your account is inactive.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "GET ME ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load user.",
    });
  }
};