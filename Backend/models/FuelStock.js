import mongoose from "mongoose";

const fuelStockSchema = new mongoose.Schema(
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
    // CURRENT STOCK
    // ==================================================
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==================================================
    // TOTAL PURCHASED
    // ==================================================
    totalPurchased: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==================================================
    // TOTAL SOLD
    // ==================================================
    totalSold: {
      type: Number,
      default: 0,
      min: 0,
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
 * CRITICAL
 *
 * Only one stock document per:
 *
 * pump + fuelType
 *
 * Example:
 *
 * Pump A + petrol
 * Pump A + diesel
 *
 * This also makes:
 *
 * FuelStock.findOne({
 *   pumpId,
 *   fuelType
 * })
 *
 * very fast.
 */
fuelStockSchema.index(
  {
    pumpId: 1,
    fuelType: 1,
  },
  {
    unique: true,
    name: "uniq_fuel_stock_pump_type",
  }
);

/* =====================================================
   MODEL
===================================================== */

const FuelStock =
  mongoose.models.FuelStock ||
  mongoose.model(
    "FuelStock",
    fuelStockSchema
  );

export default FuelStock;