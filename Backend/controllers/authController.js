import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import RegistrationRequest from "../models/RegistrationRequest.js";

/* =====================================================
   CONSTANTS
===================================================== */

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

const BCRYPT_SALT_ROUNDS = 12;

const DEFAULT_JWT_EXPIRATION = "7d";

const ALLOWED_ROLES = new Set([
  "superadmin",
  "owner",
  "manager",
  "staff",
  "employee",
]);

/*
 * Used when an account does not exist.
 *
 * This prevents the nonexistent-email path from being
 * dramatically cheaper than the password verification
 * path.
 */
const DUMMY_PASSWORD_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.Vk7pM8v8e4KxRjJ9L4m4x6q5Kx1uJ2a";

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

const getJwtExpiration = () => {
  const expiresIn =
    process.env.JWT_EXPIRES_IN;

  if (
    typeof expiresIn !== "string" ||
    !expiresIn.trim()
  ) {
    return DEFAULT_JWT_EXPIRATION;
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

  const normalizedEmail =
    email.trim().toLowerCase();

  if (
    !normalizedEmail ||
    normalizedEmail.length > 254
  ) {
    return false;
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(
    normalizedEmail
  );
};

/* =====================================================
   JWT GENERATION
===================================================== */

/*
 * JWT intentionally contains only:
 *
 * - userId
 * - tokenVersion
 *
 * Role, pumpId and permissions are always loaded from
 * the database by authentication middleware.
 */
const generateToken = (
  userId,
  tokenVersion = 0
) => {
  const numericVersion =
    Number(tokenVersion);

  const normalizedTokenVersion =
    Number.isInteger(
      numericVersion
    ) &&
    numericVersion >= 0
      ? numericVersion
      : 0;

  return jwt.sign(
    {
      userId: userId.toString(),
      tokenVersion:
        normalizedTokenVersion,
    },
    getJwtSecret(),
    {
      expiresIn:
        getJwtExpiration(),

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
    } = req.body || {};

    /* =====================================
       BASIC VALIDATION
    ===================================== */

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

    /* =====================================
       EMAIL VALIDATION
    ===================================== */

    if (
      !isValidEmail(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address.",
      });
    }

    /* =====================================
       PASSWORD LENGTH PROTECTION
    ===================================== */

    if (
      password.length >
      MAX_PASSWORD_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* =====================================
       LOAD USER
    ===================================== */

    /*
     * User.password has select:false.
     * Therefore +password is required.
     *
     * Only the pump fields needed by login
     * are populated.
     */
    const user =
      await User.findOne({
        email: normalizedEmail,
      })
        .select(
          "+password name email role employeeId pumpId active tokenVersion"
        )
        .populate(
          "pumpId",
          "pumpName ownerName phone email active"
        )
        .lean();

    /* =====================================
       USER NOT FOUND
    ===================================== */

    if (!user) {
      /*
       * Dummy bcrypt comparison for timing
       * resistance.
       */
      await bcrypt.compare(
        password,
        DUMMY_PASSWORD_HASH
      );

      /*
       * Check pending/rejected registration
       * requests in parallel.
       */
      const [
        pendingRequest,
        rejectedRequest,
      ] = await Promise.all([
        RegistrationRequest.findOne({
          email:
            normalizedEmail,

          status: "pending",
        })
          .select("_id")
          .lean(),

        RegistrationRequest.findOne({
          email:
            normalizedEmail,

          status: "rejected",
        })
          .select(
            "rejectionReason updatedAt"
          )
          .sort({
            updatedAt: -1,
          })
          .lean(),
      ]);

      /* ===================================
         PENDING REGISTRATION
      =================================== */

      if (pendingRequest) {
        return res.status(403).json({
          success: false,

          code:
            "REGISTRATION_PENDING",

          message:
            "Your registration request is waiting for Super Admin approval.",
        });
      }

      /* ===================================
         REJECTED REGISTRATION
      =================================== */

      if (rejectedRequest) {
        const reason =
          rejectedRequest.rejectionReason;

        return res.status(403).json({
          success: false,

          code:
            "REGISTRATION_REJECTED",

          message: reason
            ? `Your registration request was rejected: ${reason}`
            : "Your registration request was rejected by Super Admin.",
        });
      }

      /* ===================================
         GENERIC LOGIN ERROR
      =================================== */

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* =====================================
       ACCOUNT STATUS
    ===================================== */

    if (user.active !== true) {
      return res.status(403).json({
        success: false,

        code:
          "ACCOUNT_DISABLED",

        message:
          "Your account is currently disabled. Please contact Super Admin.",
      });
    }

    /* =====================================
       ROLE
    ===================================== */

    const role =
      String(user.role || "")
        .trim()
        .toLowerCase();

    if (
      !ALLOWED_ROLES.has(role)
    ) {
      console.error(
        `AUTH SECURITY: Invalid role "${user.role}" for user ${user._id}`
      );

      return res.status(403).json({
        success: false,

        code:
          "INVALID_ROLE",

        message:
          "Invalid account role.",
      });
    }

    /* =====================================
       PUMP VALIDATION
    ===================================== */

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

    /* =====================================
       PASSWORD HASH VALIDATION
    ===================================== */

    if (
      typeof user.password !==
        "string" ||
      !user.password
    ) {
      console.error(
        `AUTH SECURITY: User ${user._id} has no password hash`
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /* =====================================
       PASSWORD CHECK
    ===================================== */

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

    /* =====================================
       PUMP STATUS
    ===================================== */

    if (
      role !== "superadmin" &&
      user.pumpId?.active !== true
    ) {
      return res.status(403).json({
        success: false,

        code:
          "PUMP_DISABLED",

        message:
          "This petrol pump account is currently disabled. Please contact Super Admin.",
      });
    }

    /* =====================================
       TOKEN VERSION
    ===================================== */

    const numericTokenVersion =
      Number(user.tokenVersion);

    const tokenVersion =
      Number.isInteger(
        numericTokenVersion
      ) &&
      numericTokenVersion >= 0
        ? numericTokenVersion
        : 0;

    /* =====================================
       GENERATE TOKEN
    ===================================== */

    const token =
      generateToken(
        user._id,
        tokenVersion
      );

    /* =====================================
       RESPONSE
    ===================================== */

    return res.status(200).json({
      success: true,

      message:
        "Login successful",

      token,

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        role,

        employeeId:
          user.employeeId ||
          null,

        pumpId:
          user.pumpId ||
          null,

        active:
          user.active,
      },
    });
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    /* =====================================
       JWT CONFIGURATION ERROR
    ===================================== */

    if (
      error?.message?.includes(
        "JWT_SECRET"
      )
    ) {
      return res.status(500).json({
        success: false,

        message:
          "Authentication configuration error.",

        code:
          "AUTH_CONFIG_ERROR",
      });
    }

    return res.status(500).json({
      success: false,

      message:
        "Login failed.",

      code:
        "LOGIN_ERROR",
    });
  }
};

/* =====================================================
   REGISTER
===================================================== */

/*
 * Registration only creates a pending
 * RegistrationRequest.
 *
 * Pump/User creation happens after
 * Super Admin approval.
 */
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
    } = req.body || {};

    /* =====================================
       REQUIRED FIELDS
    ===================================== */

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

    /* =====================================
       FIELD LENGTH PROTECTION
    ===================================== */

    if (
      cleanName.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name is too long.",
      });
    }

    if (
      cleanPumpName.length > 200
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Pump name is too long.",
      });
    }

    if (
      cleanPhone.length > 30
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is too long.",
      });
    }

    /* =====================================
       PASSWORD VALIDATION
    ===================================== */

    if (
      password.length <
      MIN_PASSWORD_LENGTH
    ) {
      return res.status(400).json({
        success: false,

        message:
          `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    if (
      password.length >
      MAX_PASSWORD_LENGTH
    ) {
      return res.status(400).json({
        success: false,

        message:
          `Password cannot contain more than ${MAX_PASSWORD_LENGTH} characters.`,
      });
    }

    /* =====================================
       EMAIL VALIDATION
    ===================================== */

    if (
      !isValidEmail(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Please enter a valid email address.",
      });
    }

    /* =====================================
       EXISTING USER + PENDING REQUEST
    ===================================== */

    /*
     * These two lookups are independent,
     * so execute them together.
     */
    const [
      existingUser,
      existingPending,
    ] = await Promise.all([
      User.findOne({
        email:
          normalizedEmail,
      })
        .select("_id")
        .lean(),

      RegistrationRequest.findOne({
        email:
          normalizedEmail,

        status: "pending",
      })
        .select("_id")
        .lean(),
    ]);

    /* =====================================
       EXISTING USER
    ===================================== */

    if (existingUser) {
      return res.status(409).json({
        success: false,

        code:
          "ACCOUNT_EXISTS",

        message:
          "An account with this email already exists.",
      });
    }

    /* =====================================
       EXISTING PENDING REQUEST
    ===================================== */

    if (existingPending) {
      return res.status(409).json({
        success: false,

        code:
          "REGISTRATION_PENDING",

        message:
          "A registration request for this email is already pending approval.",
      });
    }

    /* =====================================
       PASSWORD HASH
    ===================================== */

    const passwordHash =
      await bcrypt.hash(
        password,
        BCRYPT_SALT_ROUNDS
      );

    /* =====================================
       CREATE REQUEST
    ===================================== */

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
            ? plan
                .trim()
                .toLowerCase()
            : "standard",

        status:
          "pending",
      });

    /* =====================================
       RESPONSE
    ===================================== */

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

    /* =====================================
       MONGOOSE VALIDATION
    ===================================== */

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

    /* =====================================
       DUPLICATE KEY
    ===================================== */

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

        code:
          "AUTHENTICATION_REQUIRED",
      });
    }

    /* =====================================
       LOAD USER
    ===================================== */

    /*
     * Explicit projection prevents password,
     * tokenVersion and other internal fields
     * from being returned.
     */
    const user =
      await User.findById(userId)
        .select(
          "name email role employeeId pumpId active"
        )
        .populate(
          "pumpId",
          "pumpName ownerName phone email active"
        )
        .lean();

    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          "User not found.",

        code:
          "USER_NOT_FOUND",
      });
    }

    /* =====================================
       ACCOUNT STATUS
    ===================================== */

    if (
      user.active !== true
    ) {
      return res.status(403).json({
        success: false,

        code:
          "ACCOUNT_INACTIVE",

        message:
          "Your account is inactive.",
      });
    }

    /* =====================================
       PUMP STATUS
    ===================================== */

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

    /* =====================================
       RESPONSE
    ===================================== */

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