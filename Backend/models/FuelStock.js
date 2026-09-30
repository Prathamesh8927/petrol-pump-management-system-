import mongoose from "mongoose";

const fuelStockSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      index: true,
      immutable: true,
    },

    fuelType: {
      type: String,
      enum: ["petrol", "diesel"],
      required: true,
      lowercase: true,
      trim: true,
      immutable: true,
    },

    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPurchased: {
      type: Number,
      default: 0,
      min: 0,
    },

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
 * Critical uniqueness rule:
 *
 * One pump can have only:
 *   - one petrol stock record
 *   - one diesel stock record
 *
 * This also protects against duplicate stock
 * records when multiple requests happen concurrently.
 */
fuelStockSchema.index(
  {
    pumpId: 1,
    fuelType: 1,
  },
  {
    unique: true,
  }
);

/*
 * Useful for pump-level stock queries.
 */
fuelStockSchema.index({
  pumpId: 1,
  updatedAt: -1,
});

/* =====================================================
   MODEL
===================================================== */

const FuelStock =
  mongoose.models.FuelStock ||
  mongoose.model("FuelStock", fuelStockSchema);

export default FuelStock;