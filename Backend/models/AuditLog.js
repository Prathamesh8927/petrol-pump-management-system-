import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    // ==================================================
    // PUMP ISOLATION
    // ==================================================

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      immutable: true,
    },

    // ==================================================
    // USER
    // ==================================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      immutable: true,
    },

    userName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    // ==================================================
    // ACTION
    // ==================================================

    action: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      immutable: true,
    },

    // ==================================================
    // MODULE
    // ==================================================

    module: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      immutable: true,
    },

    // ==================================================
    // RECORD
    // ==================================================

    /*
     * ID of the affected document.
     *
     * Examples:
     *
     * Sale._id
     * Expense._id
     * Employee._id
     * DailyClosing._id
     */
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      immutable: true,
    },

    // ==================================================
    // DESCRIPTION
    // ==================================================

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    // ==================================================
    // DATA SNAPSHOTS
    // ==================================================

    /*
     * Mixed is intentional because different modules
     * have different document structures.
     *
     * NEVER store:
     *
     * - passwords
     * - JWT tokens
     * - refresh tokens
     * - API secrets
     * - payment secrets
     * - bank credentials
     */
    oldData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ==================================================
    // REQUEST INFORMATION
    // ==================================================

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
 * 1. MAIN AUDIT HISTORY
 *
 * Most common query:
 *
 * AuditLog.find({
 *   pumpId
 * }).sort({
 *   createdAt: -1
 * })
 */
auditLogSchema.index(
  {
    pumpId: 1,
    createdAt: -1,
  },
  {
    name: "idx_audit_pump_created",
  }
);

/*
 * 2. USER AUDIT HISTORY
 *
 * Example:
 *
 * "Show everything performed by this employee."
 */
auditLogSchema.index(
  {
    pumpId: 1,
    userId: 1,
    createdAt: -1,
  },
  {
    name: "idx_audit_pump_user_created",
  }
);

/*
 * 3. MODULE AUDIT HISTORY
 *
 * Example:
 *
 * "Show all changes made in the Sales module."
 */
auditLogSchema.index(
  {
    pumpId: 1,
    module: 1,
    createdAt: -1,
  },
  {
    name: "idx_audit_pump_module_created",
  }
);

/*
 * 4. ACTION AUDIT HISTORY
 *
 * Example:
 *
 * "Show all delete actions."
 */
auditLogSchema.index(
  {
    pumpId: 1,
    action: 1,
    createdAt: -1,
  },
  {
    name: "idx_audit_pump_action_created",
  }
);

/*
 * 5. RECORD HISTORY
 *
 * Example:
 *
 * "Show the complete audit history of this
 * particular Sale / Expense / Employee / Closing."
 */
auditLogSchema.index(
  {
    pumpId: 1,
    recordId: 1,
    createdAt: -1,
  },
  {
    name: "idx_audit_pump_record_created",
  }
);

/* =====================================================
   MODEL
===================================================== */

const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;