import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // PUMP ISOLATION
    // --------------------------------------------------
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      index: true,
      immutable: true,
    },

    // --------------------------------------------------
    // USER
    // --------------------------------------------------
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
      immutable: true,
    },

    userName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    // --------------------------------------------------
    // ACTION
    // --------------------------------------------------
    action: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      index: true,
    },

    // --------------------------------------------------
    // MODULE
    // --------------------------------------------------
    module: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      index: true,
    },

    // --------------------------------------------------
    // RECORD
    // --------------------------------------------------
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      immutable: true,
      index: true,
    },

    // --------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    // --------------------------------------------------
    // DATA SNAPSHOTS
    // --------------------------------------------------
    /*
     * Stored as Mixed because different modules
     * can have different document structures.
     *
     * IMPORTANT:
     * Passwords, JWTs, tokens and other secrets
     * must never be stored here.
     */
    oldData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // --------------------------------------------------
    // REQUEST INFORMATION
    // --------------------------------------------------
    ipAddress: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
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
 * Main audit history query.
 */
auditLogSchema.index({
  pumpId: 1,
  createdAt: -1,
});

/*
 * User-specific audit history.
 */
auditLogSchema.index({
  pumpId: 1,
  userId: 1,
  createdAt: -1,
});

/*
 * Module-specific audit history.
 */
auditLogSchema.index({
  pumpId: 1,
  module: 1,
  createdAt: -1,
});

/*
 * Action-specific filtering.
 */
auditLogSchema.index({
  pumpId: 1,
  action: 1,
  createdAt: -1,
});

/*
 * Record-specific audit history.
 */
auditLogSchema.index({
  pumpId: 1,
  recordId: 1,
  createdAt: -1,
});

/* =====================================================
   MODEL
===================================================== */

const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;