import mongoose from "mongoose";

const passwordResetRequestSchema = new mongoose.Schema(
  {
    /* =====================================================
       USER
    ===================================================== */

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },

    /* =====================================================
       REQUEST STATUS
    ===================================================== */

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "completed",
      ],
      default: "pending",
      index: true,
    },

    /* =====================================================
       APPROVAL
    ===================================================== */

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    /* =====================================================
       REJECTION
    ===================================================== */

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    /* =====================================================
       SECURE RESET TOKEN

       IMPORTANT:
       - Never store the raw reset token.
       - Store only the SHA-256 hash.
       - undefined means the field is absent from MongoDB.
       - This works with the partial unique index below.
    ===================================================== */

    resetTokenHash: {
      type: String,
      default: undefined,
      select: false,
    },

    resetTokenExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    /* =====================================================
       COMPLETION
    ===================================================== */

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   INDEXES
========================================================= */

/*
 * Useful for checking requests belonging to an email
 * with a particular status.
 */
passwordResetRequestSchema.index({
  email: 1,
  status: 1,
});

/*
 * Efficient lookup of a user's reset-request history.
 */
passwordResetRequestSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

/*
 * Efficient admin listing/filtering by status.
 */
passwordResetRequestSchema.index({
  status: 1,
  createdAt: -1,
});

/*
 * Efficient chronological lookup.
 */
passwordResetRequestSchema.index({
  createdAt: -1,
});

/*
 * SECURE RESET TOKEN INDEX
 *
 * Only actual string token hashes are indexed.
 *
 * This prevents multiple requests without a reset token
 * from conflicting with a unique index.
 *
 * Example:
 *
 * pending request:
 *   resetTokenHash = undefined
 *   -> NOT indexed
 *
 * approved request:
 *   resetTokenHash = "64-character SHA-256 hash"
 *   -> indexed
 *
 * completed request:
 *   resetTokenHash = undefined
 *   -> NOT indexed
 *
 * Two real token hashes can never be identical.
 */
passwordResetRequestSchema.index(
  {
    resetTokenHash: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      resetTokenHash: {
        $type: "string",
      },
    },
    name: "uniq_password_reset_token_hash",
  }
);

/* =========================================================
   MODEL
========================================================= */

const PasswordResetRequest =
  mongoose.models.PasswordResetRequest ||
  mongoose.model(
    "PasswordResetRequest",
    passwordResetRequestSchema
  );

export default PasswordResetRequest;