import mongoose from "mongoose";

const passwordResetRequestSchema =
  new mongoose.Schema(
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
         
         Store ONLY the SHA-256 hash of the token.
         Never store the raw reset token.
      ===================================================== */

      resetTokenHash: {
        type: String,
        default: null,
        select: false,
        index: true,
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

passwordResetRequestSchema.index({
  email: 1,
  status: 1,
});

passwordResetRequestSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

passwordResetRequestSchema.index({
  status: 1,
  createdAt: -1,
});

passwordResetRequestSchema.index({
  createdAt: -1,
});

/*
  Token lookup is normally performed using the hash.

  Sparse unique index allows multiple old requests with
  null token hashes while guaranteeing that two active
  requests cannot accidentally receive the same hash.
*/
passwordResetRequestSchema.index(
  { resetTokenHash: 1 },
  {
    unique: true,
    sparse: true,
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