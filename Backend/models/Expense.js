import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      index: true,
      immutable: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    category: {
      type: String,
      enum: [
        "salary",
        "electricity",
        "maintenance",
        "transport",
        "office",
        "food",
        "repair",
        "miscellaneous",
      ],
      required: true,
      lowercase: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "upi",
        "bank",
        "card",
      ],
      default: "cash",
      lowercase: true,
      trim: true,
    },

    /*
     * Stored as YYYY-MM-DD.
     */
    expenseDate: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },

    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
 * Main expense history / dashboard query.
 */
expenseSchema.index({
  pumpId: 1,
  expenseDate: -1,
});

/*
 * Useful when filtering expenses by category.
 */
expenseSchema.index({
  pumpId: 1,
  category: 1,
  expenseDate: -1,
});

/*
 * Useful for employee-related expense history.
 */
expenseSchema.index({
  pumpId: 1,
  employeeId: 1,
  expenseDate: -1,
});

/*
 * Useful for audit/user filtering.
 */
expenseSchema.index({
  pumpId: 1,
  createdBy: 1,
  createdAt: -1,
});

/* =====================================================
   MODEL
===================================================== */

const Expense =
  mongoose.models.Expense ||
  mongoose.model("Expense", expenseSchema);

export default Expense;