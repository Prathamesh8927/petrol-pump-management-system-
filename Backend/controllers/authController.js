import jwt from "jsonwebtoken";
import User from "../models/User.js";
import RegistrationRequest from "../models/RegistrationRequest.js";

/* ======================================================
   GENERATE JWT
====================================================== */

const generateToken = (userId) => {
  return jwt.sign(
    {
      userId: userId.toString(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/* ======================================================
   LOGIN
====================================================== */

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).populate(
      "pumpId",
      "pumpName ownerName phone email active"
    );

    /* -----------------------------------------------
       USER NOT FOUND
    ------------------------------------------------ */

    if (!user) {
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

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* -----------------------------------------------
       ACCOUNT STATUS
    ------------------------------------------------ */

    if (user.active === false) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message:
          "Your account is currently disabled. Please contact Super Admin.",
      });
    }

    /* -----------------------------------------------
       PASSWORD
    ------------------------------------------------ */

    const passwordMatched =
      await user.matchPassword(password);

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* -----------------------------------------------
       TOKEN
    ------------------------------------------------ */

    const token = generateToken(user._id);

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
        role: user.role,
        pumpId: user.pumpId,
        active: user.active,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

/* ======================================================
   REGISTER
   PUBLIC REGISTRATION REQUEST
====================================================== */

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
    } = req.body;

    /* -----------------------------------------------
       VALIDATION
    ------------------------------------------------ */

    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !pumpName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password, phone and pump name are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 6 characters.",
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
        code: "REGISTRATION_PENDING",
        message:
          "A registration request for this email is already pending approval.",
      });
    }

    /* -----------------------------------------------
       CREATE REGISTRATION REQUEST
       
       IMPORTANT:
       RegistrationRequest schema uses ownerName,
       NOT name.
    ------------------------------------------------ */

    const request =
      await RegistrationRequest.create({
        ownerName: name.trim(),

        email: normalizedEmail,

        password,

        phone: phone.trim(),

        pumpName: pumpName.trim(),

        companyName:
          companyName?.trim() || "",

        dealerCode:
          dealerCode?.trim() || "",

        gstin:
          gstin?.trim() || "",

        address:
          address?.trim() || "",

        city:
          city?.trim() || "",

        state:
          state?.trim() || "",

        pincode:
          pincode?.trim() || "",

        plan:
          plan?.trim() || "standard",

        status: "pending",
      });

    /* -----------------------------------------------
       SUCCESS
    ------------------------------------------------ */

    return res.status(201).json({
      success: true,

      message:
        "Registration submitted successfully. Please wait for Super Admin approval.",

      requestId: request._id,

      status: request.status,
    });
  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    /* -----------------------------------------------
       MONGOOSE VALIDATION ERROR
    ------------------------------------------------ */

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          Object.values(error.errors)
            .map(
              (item) => item.message
            )
            .join(", "),
      });
    }

    /* -----------------------------------------------
       DUPLICATE
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

/* ======================================================
   GET CURRENT USER
====================================================== */

export const getMe = async (req, res) => {
  try {
    const userId =
      req.user?._id ||
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
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
        message: "User not found",
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
        "Unable to load user",
    });
  }
};