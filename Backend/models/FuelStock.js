import mongoose from "mongoose";

const fuelStockSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      index: true,
    },

    fuelType: {
      type: String,
      enum: ["petrol", "diesel"],
      required: true,
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
  }
);

fuelStockSchema.index(
  {
    pumpId: 1,
    fuelType: 1,
  },
  {
    unique: true,
  }
);

const FuelStock =
  mongoose.models.FuelStock ||
  mongoose.model(
    "FuelStock",
    fuelStockSchema
  );

export default FuelStock;