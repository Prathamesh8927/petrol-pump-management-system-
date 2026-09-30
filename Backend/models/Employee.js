import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      index: true,
      immutable: true,
    },

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

    salary: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
     * Stored as YYYY-MM-DD.
     */
    joiningDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      lowercase: true,
      trim: true,
      index: true,
    },

    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    /* =================================================
       SHIFT DETAILS
    ================================================= */

    shiftName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    /*
     * Stored as HH:mm.
     * Example: 06:00
     */
    shiftStartTime: {
      type: String,
      trim: true,
      default: "",
      match: /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    },

    /*
     * Stored as HH:mm.
     * Example: 14:00
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

employeeSchema.index({
  pumpId: 1,
  name: 1,
});

employeeSchema.index({
  pumpId: 1,
  status: 1,
});

employeeSchema.index({
  pumpId: 1,
  createdAt: -1,
});

/*
 * Useful for employee + shift filtering.
 */
employeeSchema.index({
  pumpId: 1,
  shiftName: 1,
  status: 1,
});

/* =====================================================
   MODEL
===================================================== */

const Employee =
  mongoose.models.Employee ||
  mongoose.model("Employee", employeeSchema);

export default Employee;