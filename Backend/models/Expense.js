import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
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
    // TITLE
    // ==================================================
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // ==================================================
    // CATEGORY
    // ==================================================
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

    // ==================================================
    // AMOUNT
    // ==================================================
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==================================================
    // PAYMENT METHOD
    // ==================================================
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

    // ==================================================
    // EXPENSE DATE
    // ==================================================
    /*
     * Stored as:
     *
     * YYYY-MM-DD
     */
    expenseDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    // ==================================================
    // EMPLOYEE
    // ==================================================
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
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
    // CREATED BY
    // ==================================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
 * Main expense history.
 *
 * Used by:
 *
 * Expense.find({
 *   pumpId,
 *   expenseDate: ...
 * })
 *
 * Also supports date-range queries.
 */
expenseSchema.index(
  {
    pumpId: 1,
    expenseDate: -1,
  },
  {
    name: "idx_expense_pump_date",
  }
);

/*
 * Category reports.
 */
expenseSchema.index(
  {
    pumpId: 1,
    category: 1,
    expenseDate: -1,
  },
  {
    name: "idx_expense_category_date",
  }
);

/*
 * Employee expense history.
 */
expenseSchema.index(
  {
    pumpId: 1,
    employeeId: 1,
    expenseDate: -1,
  },
  {
    name: "idx_expense_employee_date",
  }
);

/*
 * User-created expense history / audit.
 */
expenseSchema.index(
  {
    pumpId: 1,
    createdBy: 1,
    createdAt: -1,
  },
  {
    name: "idx_expense_creator_created",
  }
);

/* =====================================================
   MODEL
===================================================== */

const Expense =
  mongoose.models.Expense ||
  mongoose.model(
    "Expense",
    expenseSchema
  );

export default Expense;