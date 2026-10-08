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
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
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
    ===================================================== */

    /*
     * NEVER store the raw reset token.
     *
     * Store only the SHA-256 hash.
     *
     * select:false prevents the hash from being returned
     * in normal queries.
     */
    resetTokenHash: {
      type: String,
      default: undefined,
      select: false,
    },

    resetTokenExpiresAt: {
      type: Date,
      default: null,
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
    strict: true,
  }
);

/* =====================================================
   INDEXES
===================================================== */

/*
 * 1. EMAIL + STATUS
 *
 * Useful for:
 *
 * - checking pending reset requests
 * - finding reset requests by email
 */
passwordResetRequestSchema.index(
  {
    email: 1,
    status: 1,
  },
  {
    name: "idx_password_reset_email_status",
  }
);

/*
 * 2. USER + STATUS + CREATED
 *
 * Efficient user-specific reset history.
 */
passwordResetRequestSchema.index(
  {
    userId: 1,
    status: 1,
    createdAt: -1,
  },
  {
    name: "idx_password_reset_user_status_created",
  }
);

/*
 * 3. STATUS + CREATED
 *
 * Useful for admin approval/rejection screens.
 *
 * Example:
 *
 * pending requests, newest first.
 */
passwordResetRequestSchema.index(
  {
    status: 1,
    createdAt: -1,
  },
  {
    name: "idx_password_reset_status_created",
  }
);

/*
 * 4. CREATED
 *
 * Useful when displaying all requests chronologically,
 * regardless of status.
 */
passwordResetRequestSchema.index(
  {
    createdAt: -1,
  },
  {
    name: "idx_password_reset_created",
  }
);

/*
 * 5. RESET TOKEN HASH
 *
 * Only real token hashes are indexed.
 *
 * Multiple documents without a reset token are allowed.
 *
 * This protects against accidentally having the same
 * reset token hash stored twice.
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

/* =====================================================
   MODEL
===================================================== */

const PasswordResetRequest =
  mongoose.models.PasswordResetRequest ||
  mongoose.model(
    "PasswordResetRequest",
    passwordResetRequestSchema
  );

export default PasswordResetRequest;