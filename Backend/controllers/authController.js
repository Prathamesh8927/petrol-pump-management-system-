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
    typeof secret !== "string" ||
    secret.trim().length < 32
  ) {
    throw new Error(
      "JWT_SECRET is missing or too weak. JWT_SECRET must contain at least 32 characters."
    );
  }

  return secret;
};

/* =====================================================
   JWT EXPIRATION CONFIGURATION
===================================================== */

const getJwtExpiration = () => {
  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (
    typeof expiresIn !== "string" ||
    !expiresIn.trim()
  ) {
    return "7d";
  }

  return expiresIn.trim();
};

/* =====================================================
   EMAIL VALIDATION
===================================================== */

const isValidEmail = (email) => {
  if (typeof email !== "string") {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (
    !normalizedEmail ||
    normalizedEmail.length > 254
  ) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(normalizedEmail);
};

/* =====================================================
   PASSWORD CONFIGURATION
===================================================== */

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

/* =====================================================
   DUMMY BCRYPT HASH

   Used when an account does not exist so that login
   attempts do not return significantly faster simply
   because the email address is unknown.

   This hash is intentionally static and is NOT a real
   user's password.
===================================================== */

const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.Vk7pM8v8e4KxRjJ9L4m4x6q5Kx1uJ2a";

/* =====================================================
   GENERATE JWT

   IMPORTANT:
   JWT intentionally does NOT contain:

   - role
   - pumpId
   - permissions
   - employeeId

   These values must always come from the database.

   tokenVersion is included only for server-side
   session revocation.

   When User.tokenVersion changes, all older tokens
   become invalid.
===================================================== */

const generateToken = (userId, tokenVersion = 0) => {
  const normalizedTokenVersion = Number.isInteger(
    Number(tokenVersion)
  )
    ? Number(tokenVersion)
    : 0;

  return jwt.sign(
    {
      userId: userId.toString(),
      tokenVersion: normalizedTokenVersion,
    },
    getJwtSecret(),
    {
      expiresIn: getJwtExpiration(),
      algorithm: "HS256",
    }
  );
};

/* =====================================================
   LOGIN
===================================================== */

export const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body || {};

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
        message: "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    /* -----------------------------------------------
       EMAIL VALIDATION
    ------------------------------------------------ */

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    /* -----------------------------------------------
       PASSWORD LENGTH PROTECTION

       Prevents unnecessarily expensive bcrypt
       operations on extremely large input.
    ------------------------------------------------ */

    if (password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    /* -----------------------------------------------
       FIND USER

       Password has select:false in User.js.
       Therefore +password is mandatory.

       Pump status is loaded for validation.
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
      /*
       * Perform a dummy bcrypt comparison for normal
       * nonexistent accounts.
       *
       * This makes the common "unknown email" path
       * computationally closer to the real password
       * verification path.
       */
      await bcrypt.compare(
        password,
        DUMMY_PASSWORD_HASH
      );

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
        message: "Invalid email or password.",
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
      "employee",
    ];

    if (!allowedRoles.includes(role)) {
      console.error(
        `AUTH SECURITY: Invalid role "${user.role}" for user ${user._id}`
      );

      return res.status(403).json({
        success: false,
        code: "INVALID_ROLE",
        message: "Invalid account role.",
      });
    }

    /* -----------------------------------------------
       PUMP VALIDATION

       Superadmin does not require a pump.

       All other users MUST have a pumpId.
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
        code: "ACCOUNT_CONFIGURATION_ERROR",
        message:
          "Your account is not correctly configured. Please contact Super Admin.",
      });
    }

    /* -----------------------------------------------
       PASSWORD HASH VALIDATION
    ------------------------------------------------ */

    if (
      typeof user.password !== "string" ||
      !user.password
    ) {
      console.error(
        `AUTH SECURITY: User ${user._id} has no password hash`
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    /* -----------------------------------------------
       PASSWORD VALIDATION
    ------------------------------------------------ */

    const passwordMatched =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    /* -----------------------------------------------
       PUMP STATUS

       Non-superadmin users cannot log into an
       inactive pump.
    ------------------------------------------------ */

    if (
      role !== "superadmin" &&
      user.pumpId?.active !== true
    ) {
      return res.status(403).json({
        success: false,
        code: "PUMP_DISABLED",
        message:
          "This petrol pump account is currently disabled. Please contact Super Admin.",
      });
    }

    /* -----------------------------------------------
       TOKEN VERSION

       tokenVersion was added for server-side session
       revocation.

       Older users created before this field existed
       are safely treated as version 0.
    ------------------------------------------------ */

    const tokenVersion =
      Number.isInteger(Number(user.tokenVersion)) &&
      Number(user.tokenVersion) >= 0
        ? Number(user.tokenVersion)
        : 0;

    /* -----------------------------------------------
       GENERATE TOKEN

       JWT contains:

       - userId
       - tokenVersion

       JWT does NOT contain role/pumpId.
    ------------------------------------------------ */

    const token =
      generateToken(
        user._id,
        tokenVersion
      );

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
        employeeId:
          user.employeeId || null,
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

    /* -----------------------------------------------
       JWT CONFIGURATION ERROR
    ------------------------------------------------ */

    if (
      error?.message?.includes(
        "JWT_SECRET"
      )
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Authentication configuration error.",
        code: "AUTH_CONFIG_ERROR",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Login failed.",
      code: "LOGIN_ERROR",
    });
  }
};

/* =====================================================
   REGISTER

   Registration creates a pending request only.

   IMPORTANT:
   User/Pump creation should happen only after
   Super Admin approval.
===================================================== */

export const register = async (req, res) => {
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
    } = req.body || {};

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
       FIELD LENGTH PROTECTION
    ------------------------------------------------ */

    if (cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name is too long.",
      });
    }

    if (cleanPumpName.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Pump name is too long.",
      });
    }

    if (cleanPhone.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Phone number is too long.",
      });
    }

    /* -----------------------------------------------
       PASSWORD VALIDATION

       Production baseline:
       minimum 12 characters.
    ------------------------------------------------ */

    if (
      password.length < MIN_PASSWORD_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    if (
      password.length > MAX_PASSWORD_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Password cannot contain more than ${MAX_PASSWORD_LENGTH} characters.`,
      });
    }

    /* -----------------------------------------------
       EMAIL VALIDATION
    ------------------------------------------------ */

    if (!isValidEmail(normalizedEmail)) {
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
      }).select("_id");

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
      }).select("_id");

    if (existingPending) {
      return res.status(409).json({
        success: false,
        code: "REGISTRATION_PENDING",
        message:
          "A registration request for this email is already pending approval.",
      });
    }

    /* -----------------------------------------------
       HASH PASSWORD

       RegistrationRequest stores the hash.

       Super Admin approval should transfer this
       already-hashed password to the User document
       rather than hashing it again.
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
          typeof companyName === "string"
            ? companyName.trim()
            : "",

        dealerCode:
          typeof dealerCode === "string"
            ? dealerCode.trim()
            : "",

        gstin:
          typeof gstin === "string"
            ? gstin.trim().toUpperCase()
            : "",

        address:
          typeof address === "string"
            ? address.trim()
            : "",

        city:
          typeof city === "string"
            ? city.trim()
            : "",

        state:
          typeof state === "string"
            ? state.trim()
            : "",

        pincode:
          typeof pincode === "string"
            ? pincode.trim()
            : "",

        plan:
          typeof plan === "string" &&
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
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors || {}
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

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        code:
          "REGISTRATION_EXISTS",
        message:
          "A registration request already exists for this email.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to submit registration request.",
      code:
        "REGISTRATION_ERROR",
    });
  }
};

/* =====================================================
   GET CURRENT USER
===================================================== */

export const getMe = async (req, res) => {
  try {
    const userId =
      req.user?._id ||
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
        code:
          "AUTHENTICATION_REQUIRED",
      });
    }

    /* -----------------------------------------------
       LOAD CURRENT USER

       Password is explicitly excluded.
    ------------------------------------------------ */

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
        code:
          "USER_NOT_FOUND",
      });
    }

    /* -----------------------------------------------
       ACCOUNT STATUS
    ------------------------------------------------ */

    if (user.active !== true) {
      return res.status(403).json({
        success: false,
        code:
          "ACCOUNT_INACTIVE",
        message:
          "Your account is inactive.",
      });
    }

    /* -----------------------------------------------
       PUMP STATUS

       authMiddleware already checks this for normal
       authenticated requests, but keeping this check
       here protects the endpoint if middleware usage
       changes later.
    ------------------------------------------------ */

    const role =
      String(user.role || "")
        .trim()
        .toLowerCase();

    if (
      role !== "superadmin" &&
      user.pumpId?.active !== true
    ) {
      return res.status(403).json({
        success: false,
        code:
          "PUMP_DISABLED",
        message:
          "This petrol pump account is currently disabled.",
      });
    }

    /* -----------------------------------------------
       RESPONSE
    ------------------------------------------------ */

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
      code:
        "GET_ME_ERROR",
    });
  }
};