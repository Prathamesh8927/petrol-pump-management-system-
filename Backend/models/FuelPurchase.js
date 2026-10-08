import mongoose from "mongoose";

const fuelPurchaseSchema = new mongoose.Schema(
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
    // FUEL TYPE
    // ==================================================
    fuelType: {
      type: String,
      enum: ["petrol", "diesel"],
      required: true,
      lowercase: true,
      trim: true,
      immutable: true,
    },

    // ==================================================
    // SUPPLIER
    // ==================================================
    supplierName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // ==================================================
    // QUANTITY
    // ==================================================
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // ==================================================
    // PURCHASE PRICE
    // ==================================================
    purchasePrice: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // ==================================================
    // TOTAL AMOUNT
    // ==================================================
    totalAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // ==================================================
    // PURCHASE DATE
    // ==================================================
    /*
     * Business date:
     *
     * YYYY-MM-DD
     */
    purchaseDate: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    // ==================================================
    // INVOICE
    // ==================================================
    invoiceNumber: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
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
 * 1. MAIN PURCHASE HISTORY
 *
 * Supports:
 *
 * - Daily purchases
 * - Weekly purchases
 * - Monthly purchases
 * - Custom date reports
 * - Purchase history
 *
 * Example:
 *
 * FuelPurchase.find({
 *   pumpId,
 *   purchaseDate: {
 *     $gte: from,
 *     $lte: to
 *   }
 * }).sort({
 *   purchaseDate: -1
 * })
 */
fuelPurchaseSchema.index(
  {
    pumpId: 1,
    purchaseDate: -1,
  },
  {
    name: "idx_fuel_purchase_pump_date",
  }
);

/*
 * 2. FUEL TYPE + DATE
 *
 * Supports:
 *
 * - Petrol purchase history
 * - Diesel purchase history
 * - Petrol/diesel reports
 * - Fuel-specific date filtering
 */
fuelPurchaseSchema.index(
  {
    pumpId: 1,
    fuelType: 1,
    purchaseDate: -1,
  },
  {
    name: "idx_fuel_purchase_pump_fuel_date",
  }
);

/* =====================================================
   MODEL
===================================================== */

const FuelPurchase =
  mongoose.models.FuelPurchase ||
  mongoose.model(
    "FuelPurchase",
    fuelPurchaseSchema
  );

export default FuelPurchase;