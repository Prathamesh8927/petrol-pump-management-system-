import mongoose from "mongoose";

const ledgerEntrySchema = new mongoose.Schema(
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
    // CUSTOMER
    // ==================================================
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerCustomer",
      required: true,
      immutable: true,
    },

    // ==================================================
    // ENTRY TYPE
    // ==================================================
    entryType: {
      type: String,
      enum: [
        "purchase",
        "payment",
        "advance",
      ],
      required: true,
      lowercase: true,
      trim: true,
      immutable: true,
    },

    // ==================================================
    // FUEL TYPE
    // ==================================================
    fuelType: {
      type: String,
      enum: [
        "petrol",
        "diesel",
        null,
      ],
      default: null,
      lowercase: true,
      trim: true,
    },

    // ==================================================
    // PURCHASE RATE
    // ==================================================
    rate: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==================================================
    // PURCHASE AMOUNT
    // ==================================================
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

    // ==================================================
    // PAYMENT ENTRY
    // ==================================================
    paymentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==================================================
    // ADVANCE PAYMENT
    // ==================================================
    /*
     * Example:
     *
     * Customer pays ₹30,000 advance.
     *
     * advanceAmount = 30000
     *
     * Later:
     * ₹2,000 purchase
     * ₹3,000 purchase
     * ₹5,000 purchase
     *
     * advanceAppliedAmount tracks
     * the amount consumed by purchases.
     */
    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceAppliedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==================================================
    // BUSINESS DATE
    // ==================================================
    entryDate: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    // ==================================================
    // NOTE
    // ==================================================
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    // ==================================================
    // CREATED BY
    // ==================================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
 * 1. CUSTOMER LEDGER HISTORY
 *
 * Main index for:
 *
 * - customer ledger page
 * - customer transaction history
 * - chronological transactions
 * - date range queries
 *
 * Example:
 *
 * LedgerEntry.find({
 *   pumpId,
 *   customerId
 * }).sort({
 *   entryDate: -1,
 *   createdAt: -1
 * })
 */
ledgerEntrySchema.index(
  {
    pumpId: 1,
    customerId: 1,
    entryDate: -1,
    createdAt: -1,
  },
  {
    name: "idx_ledger_customer_date",
  }
);

/*
 * 2. CUSTOMER + ENTRY TYPE
 *
 * Supports:
 *
 * - purchase history
 * - payment history
 * - advance history
 *
 * Example:
 *
 * {
 *   pumpId,
 *   customerId,
 *   entryType: "payment"
 * }
 */
ledgerEntrySchema.index(
  {
    pumpId: 1,
    customerId: 1,
    entryType: 1,
    entryDate: -1,
  },
  {
    name: "idx_ledger_customer_type_date",
  }
);

/*
 * 3. PUMP + DATE
 *
 * Main reporting index.
 *
 * Supports:
 *
 * - daily report
 * - weekly report
 * - monthly report
 * - custom report
 *
 * Example:
 *
 * {
 *   pumpId,
 *   entryDate: {
 *     $gte: "2026-10-01",
 *     $lte: "2026-10-08"
 *   }
 * }
 */
ledgerEntrySchema.index(
  {
    pumpId: 1,
    entryDate: -1,
    createdAt: -1,
  },
  {
    name: "idx_ledger_pump_date",
  }
);

/*
 * 4. PUMP + ENTRY TYPE + DATE
 *
 * Supports reports such as:
 *
 * - all purchases
 * - all payments
 * - all advances
 */
ledgerEntrySchema.index(
  {
    pumpId: 1,
    entryType: 1,
    entryDate: -1,
  },
  {
    name: "idx_ledger_type_date",
  }
);

/*
 * 5. CREATED BY
 *
 * Useful for:
 *
 * - audit/history
 * - employee/user activity
 * - transaction creator filtering
 */
ledgerEntrySchema.index(
  {
    pumpId: 1,
    createdBy: 1,
    createdAt: -1,
  },
  {
    name: "idx_ledger_creator_created",
  }
);

/* =====================================================
   MODEL
===================================================== */

const LedgerEntry =
  mongoose.models.LedgerEntry ||
  mongoose.model(
    "LedgerEntry",
    ledgerEntrySchema
  );

export default LedgerEntry;