import mongoose from "mongoose";

const dailyClosingSchema = new mongoose.Schema(
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
    // BUSINESS DATE
    // --------------------------------------------------
    /*
     * Business date, not UTC timestamp.
     *
     * Format:
     * YYYY-MM-DD
     *
     * The controller/service layer should generate
     * this using the configured business timezone.
     */
    businessDate: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      immutable: true,
    },

    // --------------------------------------------------
    // SALES
    // --------------------------------------------------
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },

    cashSales: {
      type: Number,
      default: 0,
      min: 0,
    },

    upiSales: {
      type: Number,
      default: 0,
      min: 0,
    },

    cardSales: {
      type: Number,
      default: 0,
      min: 0,
    },

    creditSales: {
      type: Number,
      default: 0,
      min: 0,
    },

    // --------------------------------------------------
    // EXPENSES / COLLECTION
    // --------------------------------------------------
    totalExpenses: {
      type: Number,
      default: 0,
      min: 0,
    },

    netCollection: {
      type: Number,
      default: 0,
    },

    // --------------------------------------------------
    // FUEL SALES
    // --------------------------------------------------
    petrolSold: {
      type: Number,
      default: 0,
      min: 0,
    },

    dieselSold: {
      type: Number,
      default: 0,
      min: 0,
    },

    // --------------------------------------------------
    // CLOSING STOCK
    // --------------------------------------------------
    petrolClosingStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    dieselClosingStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    // --------------------------------------------------
    // CREDIT
    // --------------------------------------------------
    pendingCredit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // --------------------------------------------------
    // STATUS
    // --------------------------------------------------
    status: {
      type: String,
      enum: ["closed", "reopened"],
      default: "closed",
      lowercase: true,
      trim: true,
      index: true,
    },

    // --------------------------------------------------
    // CLOSING USER
    // --------------------------------------------------
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      immutable: true,
    },

    closedAt: {
      type: Date,
      default: Date.now,
    },

    // --------------------------------------------------
    // REOPEN INFORMATION
    // --------------------------------------------------
    reopenedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    reopenedAt: {
      type: Date,
      default: null,
    },

    // --------------------------------------------------
    // NOTE
    // --------------------------------------------------
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
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
 * CRITICAL:
 *
 * One pump can have only one daily-closing
 * record for a particular business date.
 */
dailyClosingSchema.index(
  {
    pumpId: 1,
    businessDate: 1,
  },
  {
    unique: true,
  }
);

/*
 * Useful for pump closing history.
 */
dailyClosingSchema.index({
  pumpId: 1,
  businessDate: -1,
});

/*
 * Useful for finding reopened days.
 */
dailyClosingSchema.index({
  pumpId: 1,
  status: 1,
  businessDate: -1,
});

/*
 * Useful for audit/history queries.
 */
dailyClosingSchema.index({
  pumpId: 1,
  closedBy: 1,
  closedAt: -1,
});

/* =====================================================
   MODEL
===================================================== */

const DailyClosing =
  mongoose.models.DailyClosing ||
  mongoose.model(
    "DailyClosing",
    dailyClosingSchema
  );

export default DailyClosing;