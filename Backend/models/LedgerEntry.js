import mongoose from "mongoose";

const ledgerEntrySchema = new mongoose.Schema(
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
    // CUSTOMER
    // --------------------------------------------------
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerCustomer",
      required: true,
      index: true,
      immutable: true,
    },

    // --------------------------------------------------
    // ENTRY TYPE
    // --------------------------------------------------
    entryType: {
      type: String,
      enum: ["purchase", "payment"],
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      immutable: true,
    },

    // --------------------------------------------------
    // FUEL TYPE
    // --------------------------------------------------
    fuelType: {
      type: String,
      enum: ["petrol", "diesel", null],
      default: null,
      lowercase: true,
      trim: true,
    },

    // --------------------------------------------------
    // PURCHASE AMOUNTS
    // --------------------------------------------------
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // --------------------------------------------------
    // PAYMENT ENTRY
    // --------------------------------------------------
    paymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // --------------------------------------------------
    // ENTRY DATE
    // --------------------------------------------------
    /*
     * Business date.
     * Kept as String for compatibility with
     * the existing frontend/controller.
     *
     * Format:
     * YYYY-MM-DD
     */
    entryDate: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },

    // --------------------------------------------------
    // NOTE
    // --------------------------------------------------
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    // --------------------------------------------------
    // CREATED BY
    // --------------------------------------------------
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// ======================================================
// INDEXES
// ======================================================

/*
 * Customer ledger history.
 */
ledgerEntrySchema.index({
  pumpId: 1,
  customerId: 1,
  entryDate: -1,
});

/*
 * Customer purchase/payment filtering.
 */
ledgerEntrySchema.index({
  pumpId: 1,
  customerId: 1,
  entryType: 1,
  entryDate: -1,
});

/*
 * Pump-wide ledger reports.
 */
ledgerEntrySchema.index({
  pumpId: 1,
  entryDate: -1,
});

/*
 * Audit queries by staff/user.
 */
ledgerEntrySchema.index({
  pumpId: 1,
  createdBy: 1,
  createdAt: -1,
});

/*
 * Useful for payment/purchase reporting
 * by entry type across a pump.
 */
ledgerEntrySchema.index({
  pumpId: 1,
  entryType: 1,
  entryDate: -1,
});

// ======================================================
// MODEL
// ======================================================

const LedgerEntry =
  mongoose.models.LedgerEntry ||
  mongoose.model(
    "LedgerEntry",
    ledgerEntrySchema
  );

export default LedgerEntry;