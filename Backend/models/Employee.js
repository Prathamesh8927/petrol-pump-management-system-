import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    // ==================================================
    // PUMP
    // ==================================================
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      immutable: true,
    },

    // ==================================================
    // USER ACCOUNT LINK
    // ==================================================
    /*
     * Links an employee to their login account.
     *
     * One User can belong to only one Employee.
     *
     * sparse:true allows multiple employees to have
     * userId = null when login is not enabled.
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ==================================================
    // LOGIN
    // ==================================================
    loginEnabled: {
      type: Boolean,
      default: false,
    },

    // ==================================================
    // BASIC EMPLOYEE INFORMATION
    // ==================================================
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
    },

    designation: {
      type: String,
      trim: true,
      default: "Staff",
      maxlength: 100,
    },

    // ==================================================
    // SALARY
    // ==================================================
    salary: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==================================================
    // JOINING DATE
    // ==================================================
    /*
     * Stored as:
     *
     * YYYY-MM-DD
     */
    joiningDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    // ==================================================
    // STATUS
    // ==================================================
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      lowercase: true,
      trim: true,
    },

    // ==================================================
    // NOTE
    // ==================================================
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    // ==================================================
    // SHIFT DETAILS
    // ==================================================
    shiftName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    /*
     * Stored as HH:mm
     *
     * Example:
     * 06:00
     */
    shiftStartTime: {
      type: String,
      trim: true,
      default: "",
      match: /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    },

    /*
     * Stored as HH:mm
     *
     * Example:
     * 14:00
     */
    shiftEndTime: {
      type: String,
      trim: true,
      default: "",
      match: /^(?:[01]\d|2[0-3]):[0-5]\d$/,
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
 * 1. EMPLOYEE → USER RELATIONSHIP
 *
 * One User can be linked to only one Employee.
 *
 * sparse:true allows multiple employees without
 * login accounts.
 */
employeeSchema.index(
  {
    userId: 1,
  },
  {
    unique: true,
    sparse: true,
    name: "uniq_employee_user",
  }
);

/*
 * 2. EMPLOYEE LIST / SEARCH
 *
 * Supports:
 *
 * Employee.find({
 *   pumpId
 * }).sort({
 *   name: 1
 * })
 */
employeeSchema.index(
  {
    pumpId: 1,
    name: 1,
  },
  {
    name: "idx_employee_pump_name",
  }
);

/*
 * 3. ACTIVE / INACTIVE EMPLOYEES
 *
 * Supports:
 *
 * Employee.find({
 *   pumpId,
 *   status: "active"
 * })
 */
employeeSchema.index(
  {
    pumpId: 1,
    status: 1,
  },
  {
    name: "idx_employee_pump_status",
  }
);

/*
 * 4. NEWEST EMPLOYEES
 *
 * Useful for employee management screens
 * and recently-created employee queries.
 */
employeeSchema.index(
  {
    pumpId: 1,
    createdAt: -1,
  },
  {
    name: "idx_employee_pump_created",
  }
);

/*
 * 5. SHIFT FILTERING
 *
 * Useful for:
 *
 * - Morning shift
 * - Evening shift
 * - Night shift
 * - Active employees in a shift
 */
employeeSchema.index(
  {
    pumpId: 1,
    shiftName: 1,
    status: 1,
  },
  {
    name: "idx_employee_pump_shift_status",
  }
);

/* =====================================================
   MODEL
===================================================== */

const Employee =
  mongoose.models.Employee ||
  mongoose.model("Employee", employeeSchema);

export default Employee;