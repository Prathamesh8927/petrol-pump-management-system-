import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";

import User from "../models/User.js";
import PasswordResetRequest from "../models/PasswordResetRequest.js";

/* =========================================================
   CONSTANTS
========================================================= */

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_MINUTES = Math.min(
  60,
  Math.max(
    5,
    Number.parseInt(
      process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || "15",
      10
    ) || 15
  )
);

const RESET_TOKEN_EXPIRY_MS =
  RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000;

/* =========================================================
   HELPERS
========================================================= */

const normalizeEmail = (email = "") => {
  return String(email).trim().toLowerCase();
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const escapeRegex = (value = "") => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const getUserIdFromRequest = (req) => {
  return req.user?._id || req.user?.id || null;
};

const generateResetToken = () => {
  return crypto
    .randomBytes(RESET_TOKEN_BYTES)
    .toString("hex");
};

const hashResetToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
};

const getResetTokenExpiry = () => {
  return new Date(
    Date.now() + RESET_TOKEN_EXPIRY_MS
  );
};

const isValidResetToken = (token) => {
  return (
    typeof token === "string" &&
    /^[a-fA-F0-9]{64}$/.test(token)
  );
};

const isExpired = (date) => {
  return !date || new Date(date).getTime() <= Date.now();
};

const getSafeErrorMessage = (error) => {
  if (error?.code === 11000) {
    return "A conflicting password reset request already exists.";
  }

  return "An unexpected server error occurred.";
};

/* =========================================================
   CLIENT
   CREATE PASSWORD RESET REQUEST
========================================================= */

export const createPasswordResetRequest = async (
  req,
  res
) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email })
      .select("_id email role active");

    /*
      Do not reveal whether an email exists.
    */
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If the email is registered, a password reset request has been created.",
      });
    }

    /*
      Super Admin does not use client password recovery.
    */
    if (
      String(user.role || "")
        .trim()
        .toLowerCase() === "superadmin"
    ) {
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

    /*
      Prevent multiple pending requests.
    */
    const existingPending =
      await PasswordResetRequest.findOne({
        userId: user._id,
        status: "pending",
      })
        .sort({ createdAt: -1 })
        .select("_id status")
        .lean();

    if (existingPending) {
      return res.status(200).json({
        success: true,
        message:
          "A password reset request is already waiting for approval.",
        requestId: existingPending._id,
        status: existingPending.status,
      });
    }

    /*
      Remove/replace stale approved requests only when
      they have already expired.

      An active approved request must remain the only
      usable reset request for the user.
    */
    const existingApproved =
      await PasswordResetRequest.findOne({
        userId: user._id,
        status: "approved",
      })
        .sort({ createdAt: -1 })
        .select(
          "_id status resetTokenExpiresAt"
        )
        .lean();

    if (
      existingApproved &&
      !isExpired(
        existingApproved.resetTokenExpiresAt
      )
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Your previous password reset request has already been approved.",
        requestId: existingApproved._id,
        status: existingApproved.status,
      });
    }

    /*
      If an old approved request exists but its token
      has expired, mark it completed so a new request
      can be created.
    */
    if (
      existingApproved &&
      isExpired(
        existingApproved.resetTokenExpiresAt
      )
    ) {
      await PasswordResetRequest.updateOne(
        {
          _id: existingApproved._id,
          status: "approved",
        },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
          },
          $unset: {
            resetTokenHash: "",
            resetTokenExpiresAt: "",
          },
        }
      );
    }

    const request =
      await PasswordResetRequest.create({
        userId: user._id,
        email: user.email,
        status: "pending",
      });

    return res.status(201).json({
      success: true,
      message:
        "Password reset request sent to Super Admin for approval.",
      requestId: request._id,
      status: request.status,
    });
  } catch (error) {
    console.error(
      "CREATE PASSWORD RESET REQUEST ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: getSafeErrorMessage(error),
    });
  }
};

/* =========================================================
   CLIENT
   CHECK PASSWORD RESET STATUS
========================================================= */

export const getPasswordResetStatus = async (
  req,
  res
) => {
  try {
    const token = String(
      req.params?.token || ""
    ).trim();

    if (!isValidResetToken(token)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid password reset token.",
      });
    }

    const tokenHash =
      hashResetToken(token);

    const request =
      await PasswordResetRequest.findOne({
        resetTokenHash: tokenHash,
      })
        .select(
          "_id email status rejectionReason createdAt approvedAt completedAt resetTokenExpiresAt"
        )
        .lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Password reset token is invalid or has expired.",
      });
    }

    if (
      request.status === "approved" &&
      isExpired(request.resetTokenExpiresAt)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This password reset token has expired.",
        code: "RESET_TOKEN_EXPIRED",
      });
    }

    return res.status(200).json({
      success: true,
      request: {
        id: request._id,
        email: request.email,
        status: request.status,
        rejectionReason:
          request.rejectionReason || "",
        createdAt: request.createdAt,
        approvedAt: request.approvedAt,
        completedAt: request.completedAt,
        expiresAt:
          request.resetTokenExpiresAt || null,
      },
    });
  } catch (error) {
    console.error(
      "GET PASSWORD RESET STATUS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to check password reset status.",
    });
  }
};

/* =========================================================
   CLIENT
   RESET PASSWORD
========================================================= */

export const resetPassword = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    const token = String(
      req.params?.token || ""
    ).trim();

    const password = String(
      req.body?.password || ""
    );

    const confirmPassword = String(
      req.body?.confirmPassword || ""
    );

    if (!isValidResetToken(token)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid password reset token.",
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Password and confirm password are required.",
      });
    }

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
          "Password must not exceed 128 characters.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match.",
      });
    }

    /*
      Hash before transaction to avoid holding the
      MongoDB transaction open during bcrypt work.
    */
    const hashedPassword =
      await bcrypt.hash(password, 12);

    const tokenHash =
      hashResetToken(token);

    let completed = false;

    await session.withTransaction(
      async () => {
        /*
          Only an APPROVED request with the matching
          token hash can be completed.
        */
        const request =
          await PasswordResetRequest.findOne({
            resetTokenHash: tokenHash,
            status: "approved",
          }).session(session);

        if (!request) {
          const error = new Error(
            "RESET_TOKEN_INVALID"
          );
          error.statusCode = 400;
          throw error;
        }

        /*
          Token must have an expiry.
        */
        if (
          !request.resetTokenExpiresAt ||
          isExpired(
            request.resetTokenExpiresAt
          )
        ) {
          const error = new Error(
            "RESET_TOKEN_EXPIRED"
          );
          error.statusCode = 400;
          throw error;
        }

        const user =
          await User.findById(
            request.userId
          ).session(session);

        if (!user) {
          const error = new Error(
            "PASSWORD_RESET_USER_NOT_FOUND"
          );
          error.statusCode = 404;
          throw error;
        }

        if (!user.active) {
          const error = new Error(
            "PASSWORD_RESET_ACCOUNT_DISABLED"
          );
          error.statusCode = 403;
          throw error;
        }

        /*
          Update directly because the password is
          already bcrypt-hashed.
        */
        const userUpdate =
          await User.updateOne(
            {
              _id: user._id,
              active: true,
            },
            {
              $set: {
                password: hashedPassword,
              },
            },
            { session }
          );

        if (userUpdate.modifiedCount !== 1) {
          const error = new Error(
            "PASSWORD_UPDATE_FAILED"
          );
          error.statusCode = 409;
          throw error;
        }

        /*
          Mark request completed and immediately
          destroy the reset credential.

          This makes the token one-time-use.
        */
        request.status = "completed";
        request.completedAt = new Date();

        request.resetTokenHash = undefined;
        request.resetTokenExpiresAt =
          undefined;

        await request.save({
          session,
        });

        completed = true;
      }
    );

    if (!completed) {
      return res.status(409).json({
        success: false,
        message:
          "Password reset could not be completed.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully.",
    });
  } catch (error) {
    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    const statusCode =
      error?.statusCode || 500;

    const messages = {
      400:
        "This password reset token is invalid, expired, or has already been used.",
      403:
        "This account is disabled.",
      404:
        "Password reset account not found.",
      409:
        "Password reset could not be completed.",
    };

    return res.status(statusCode).json({
      success: false,
      message:
        messages[statusCode] ||
        "Unable to reset password.",
    });
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   SUPER ADMIN
   GET PASSWORD RESET REQUESTS
========================================================= */

export const getPasswordResetRequests =
  async (req, res) => {
    try {
      const {
        status,
        search,
        page = 1,
        limit = 20,
      } = req.query;

      const filter = {};

      const normalizedStatus =
        String(status || "")
          .trim()
          .toLowerCase();

      if (
        [
          "pending",
          "approved",
          "rejected",
          "completed",
        ].includes(normalizedStatus)
      ) {
        filter.status = normalizedStatus;
      }

      if (
        search &&
        String(search).trim()
      ) {
        const searchText = escapeRegex(
          String(search).trim()
        );

        filter.email = {
          $regex: searchText,
          $options: "i",
        };
      }

      const parsedPage = Math.max(
        1,
        Number.parseInt(page, 10) || 1
      );

      const parsedLimit = Math.min(
        100,
        Math.max(
          1,
          Number.parseInt(limit, 10) || 20
        )
      );

      const skip =
        (parsedPage - 1) *
        parsedLimit;

      const [
        requests,
        total,
      ] = await Promise.all([
        PasswordResetRequest.find(filter)
          .populate(
            "userId",
            "name email role active pumpId"
          )
          .populate(
            "approvedBy",
            "name email"
          )
          .populate(
            "rejectedBy",
            "name email"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),

        PasswordResetRequest.countDocuments(
          filter
        ),
      ]);

      /*
        Never return resetTokenHash or
        resetTokenExpiresAt to Super Admin.
      */
      const sanitizedRequests =
        requests.map((request) => {
          const {
            resetTokenHash,
            resetTokenExpiresAt,
            ...safeRequest
          } = request;

          return safeRequest;
        });

      return res.status(200).json({
        success: true,
        count: sanitizedRequests.length,
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(
          total / parsedLimit
        ),
        requests: sanitizedRequests,
      });
    } catch (error) {
      console.error(
        "GET PASSWORD RESET REQUESTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load password reset requests.",
      });
    }
  };

/* =========================================================
   SUPER ADMIN
   PENDING COUNT
========================================================= */

export const getPendingPasswordResetCount =
  async (req, res) => {
    try {
      const count =
        await PasswordResetRequest.countDocuments({
          status: "pending",
        });

      return res.status(200).json({
        success: true,
        count,
      });
    } catch (error) {
      console.error(
        "GET PASSWORD RESET COUNT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to get password reset request count.",
      });
    }
  };

/* =========================================================
   SUPER ADMIN
   APPROVE
========================================================= */

export const approvePasswordReset =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid password reset request ID.",
        });
      }

      const adminId =
        getUserIdFromRequest(req);

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      let approvalResult = null;

      await session.withTransaction(
        async () => {
          const request =
            await PasswordResetRequest.findOne({
              _id: id,
              status: "pending",
            }).session(session);

          if (!request) {
            const existing =
              await PasswordResetRequest.findById(
                id
              )
                .select("status")
                .session(session)
                .lean();

            if (!existing) {
              const error = new Error(
                "REQUEST_NOT_FOUND"
              );
              error.statusCode = 404;
              throw error;
            }

            const error = new Error(
              "REQUEST_ALREADY_PROCESSED"
            );

            error.statusCode = 400;
            error.currentStatus =
              existing.status;

            throw error;
          }

          const user =
            await User.findById(
              request.userId
            )
              .select("_id active")
              .session(session);

          if (!user) {
            const error = new Error(
              "USER_NOT_FOUND"
            );

            error.statusCode = 404;
            throw error;
          }

          if (!user.active) {
            const error = new Error(
              "USER_DISABLED"
            );

            error.statusCode = 400;
            throw error;
          }

          /*
            Generate a cryptographically secure,
            single-use token.
          */
          const resetToken =
            generateResetToken();

          const resetTokenHash =
            hashResetToken(
              resetToken
            );

          const resetTokenExpiresAt =
            getResetTokenExpiry();

          request.status = "approved";
          request.approvedBy = adminId;
          request.approvedAt = new Date();

          request.rejectedBy = null;
          request.rejectedAt = null;
          request.rejectionReason = "";

          request.resetTokenHash =
            resetTokenHash;

          request.resetTokenExpiresAt =
            resetTokenExpiresAt;

          await request.save({
            session,
          });

          approvalResult = {
            id: request._id,
            status: request.status,
            userId: request.userId,
            email: request.email,
            approvedAt:
              request.approvedAt,
            expiresAt:
              resetTokenExpiresAt,
            resetToken,
          };
        }
      );

      /*
        IMPORTANT:
        In production, resetToken should preferably be
        delivered through an email/SMS/secure notification
        service rather than returned in an admin API response.
      */

      return res.status(200).json({
        success: true,
        message:
          "Password reset request approved.",
        request: approvalResult,
      });
    } catch (error) {
      console.error(
        "APPROVE PASSWORD RESET ERROR:",
        error
      );

      if (
        error?.statusCode === 404
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Password reset request or user account not found.",
        });
      }

      if (
        error?.statusCode === 400
      ) {
        return res.status(400).json({
          success: false,
          message: error.currentStatus
            ? `Request is already ${error.currentStatus}.`
            : "This user account is disabled.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to approve password reset request.",
      });
    } finally {
      await session.endSession();
    }
  };

/* =========================================================
   SUPER ADMIN
   REJECT
========================================================= */

export const rejectPasswordReset =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const { id } = req.params;

      const reason = String(
        req.body?.reason ||
          req.body?.rejectionReason ||
          ""
      ).trim();

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid password reset request ID.",
        });
      }

      if (reason.length > 1000) {
        return res.status(400).json({
          success: false,
          message:
            "Rejection reason must not exceed 1000 characters.",
        });
      }

      const adminId =
        getUserIdFromRequest(req);

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      let rejectedRequest = null;

      await session.withTransaction(
        async () => {
          const request =
            await PasswordResetRequest.findOne({
              _id: id,
              status: "pending",
            }).session(session);

          if (!request) {
            const existing =
              await PasswordResetRequest.findById(
                id
              )
                .select("status")
                .session(session)
                .lean();

            if (!existing) {
              const error = new Error(
                "REQUEST_NOT_FOUND"
              );

              error.statusCode = 404;
              throw error;
            }

            const error = new Error(
              "REQUEST_ALREADY_PROCESSED"
            );

            error.statusCode = 400;
            error.currentStatus =
              existing.status;

            throw error;
          }

          request.status = "rejected";
          request.rejectedBy = adminId;
          request.rejectedAt = new Date();
          request.rejectionReason = reason;

          request.approvedBy = null;
          request.approvedAt = null;

          request.resetTokenHash =
            undefined;

          request.resetTokenExpiresAt =
            undefined;

          await request.save({
            session,
          });

          rejectedRequest = {
            id: request._id,
            status: request.status,
            rejectionReason:
              request.rejectionReason,
            rejectedAt:
              request.rejectedAt,
          };
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Password reset request rejected.",
        request: rejectedRequest,
      });
    } catch (error) {
      console.error(
        "REJECT PASSWORD RESET ERROR:",
        error
      );

      if (
        error?.statusCode === 404
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Password reset request not found.",
        });
      }

      if (
        error?.statusCode === 400
      ) {
        return res.status(400).json({
          success: false,
          message: error.currentStatus
            ? `Request is already ${error.currentStatus}.`
            : "Unable to reject password reset request.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to reject password reset request.",
      });
    } finally {
      await session.endSession();
    }
  };