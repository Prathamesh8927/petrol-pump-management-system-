import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/User.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";

const normalizeEmail = (email = "") => {
  return String(email).trim().toLowerCase();
};

/* =========================================================
   CLIENT
   CREATE PASSWORD RESET REQUEST
========================================================= */

export const createPasswordResetRequest = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email });

    // Do not reveal whether an email exists.
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If the email is registered, a password reset request has been created.",
      });
    }

    // Super Admin does not use client password recovery.
    if (user.role === "superadmin") {
      return res.status(200).json({
        success: true,
        message:
          "If the email is registered, a password reset request has been created.",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "This account is currently disabled.",
        code: "ACCOUNT_DISABLED",
      });
    }

    // Check for an existing pending request.
    const existingPending = await PasswordResetRequest.findOne({
      userId: user._id,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (existingPending) {
      return res.status(200).json({
        success: true,
        message: "A password reset request is already waiting for approval.",
        requestId: existingPending._id,
        status: existingPending.status,
      });
    }

    // Check if there is already an approved request
    // which has not yet been completed.
    const existingApproved = await PasswordResetRequest.findOne({
      userId: user._id,
      status: "approved",
    }).sort({ createdAt: -1 });

    if (existingApproved) {
      return res.status(200).json({
        success: true,
        message: "Your previous password reset request has already been approved.",
        requestId: existingApproved._id,
        status: existingApproved.status,
      });
    }

    const request = await PasswordResetRequest.create({
      userId: user._id,
      email: user.email,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Password reset request sent to Super Admin for approval.",
      requestId: request._id,
      status: request.status,
    });
  } catch (error) {
    console.error("CREATE PASSWORD RESET REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create password reset request.",
      error: error.message,
    });
  }
};

/* =========================================================
   CLIENT
   CHECK PASSWORD RESET STATUS
========================================================= */

export const getPasswordResetStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset request ID.",
      });
    }

    const request = await PasswordResetRequest.findById(id)
      .populate("userId", "name email role active");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Password reset request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      request: {
        id: request._id,
        email: request.email,
        status: request.status,
        rejectionReason: request.rejectionReason || "",
        createdAt: request.createdAt,
        approvedAt: request.approvedAt,
        completedAt: request.completedAt,
      },
    });
  } catch (error) {
    console.error("GET PASSWORD RESET STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check password reset status.",
      error: error.message,
    });
  }
};

/* =========================================================
   CLIENT
   RESET PASSWORD
========================================================= */

export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset request ID.",
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    const request = await PasswordResetRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Password reset request not found.",
      });
    }

    if (request.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "This password reset request is not approved.",
      });
    }

    const user = await User.findById(request.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "This account is disabled.",
      });
    }

    /*
      Hash manually because User model has a pre-save
      bcrypt hook. collection.updateOne prevents the
      password from being hashed twice.
    */
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
        },
      }
    );

    request.status = "completed";
    request.completedAt = new Date();

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password.",
      error: error.message,
    });
  }
};

/* =========================================================
   SUPER ADMIN
   GET PASSWORD RESET REQUESTS
========================================================= */

export const getPasswordResetRequests = async (req, res) => {
  try {
    const { status, search } = req.query;

    const filter = {};

    if (
      status &&
      ["pending", "approved", "rejected", "completed"].includes(status)
    ) {
      filter.status = status;
    }

    if (search && String(search).trim()) {
      const searchText = String(search).trim();

      filter.$or = [
        {
          email: {
            $regex: searchText,
            $options: "i",
          },
        },
      ];
    }

    const requests = await PasswordResetRequest.find(filter)
      .populate("userId", "name email role active pumpId")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("GET PASSWORD RESET REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load password reset requests.",
      error: error.message,
    });
  }
};

/* =========================================================
   SUPER ADMIN
   PENDING COUNT
========================================================= */

export const getPendingPasswordResetCount = async (req, res) => {
  try {
    const count = await PasswordResetRequest.countDocuments({
      status: "pending",
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("GET PASSWORD RESET COUNT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to get password reset request count.",
      error: error.message,
    });
  }
};

/* =========================================================
   SUPER ADMIN
   APPROVE
========================================================= */

export const approvePasswordReset = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset request ID.",
      });
    }

    const request = await PasswordResetRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Password reset request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}.`,
      });
    }

    const user = await User.findById(request.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account no longer exists.",
      });
    }

    if (!user.active) {
      return res.status(400).json({
        success: false,
        message: "This user account is disabled.",
      });
    }

    request.status = "approved";
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();

    request.rejectedBy = null;
    request.rejectedAt = null;
    request.rejectionReason = "";

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Password reset request approved.",
      request,
    });
  } catch (error) {
    console.error("APPROVE PASSWORD RESET ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to approve password reset request.",
      error: error.message,
    });
  }
};

/* =========================================================
   SUPER ADMIN
   REJECT
========================================================= */

export const rejectPasswordReset = async (req, res) => {
  try {
    const { id } = req.params;

    const reason =
      String(req.body?.reason || req.body?.rejectionReason || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid password reset request ID.",
      });
    }

    const request = await PasswordResetRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Password reset request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}.`,
      });
    }

    request.status = "rejected";
    request.rejectedBy = req.user.id;
    request.rejectedAt = new Date();
    request.rejectionReason = reason;

    request.approvedBy = null;
    request.approvedAt = null;

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Password reset request rejected.",
      request,
    });
  } catch (error) {
    console.error("REJECT PASSWORD RESET ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reject password reset request.",
      error: error.message,
    });
  }
};