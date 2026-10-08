import mongoose from "mongoose";

/* =====================================================
   FUEL PRICE SCHEMA
===================================================== */

const fuelPriceSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
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

    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

/* =====================================================
   INDEX
===================================================== */

/*
 * One fuel price per fuel type for each pump.
 *
 * This index also efficiently supports:
 *
 * { pumpId, fuelType }
 */
fuelPriceSchema.index(
  {
    pumpId: 1,
    fuelType: 1,
  },
  {
    unique: true,
    name: "uniq_fuel_price_pump_type",
  }
);

/*
 * Useful if the system displays the latest prices
 * for a pump.
 */
fuelPriceSchema.index(
  {
    pumpId: 1,
    updatedAt: -1,
  },
  {
    name: "idx_fuel_price_pump_updated",
  }
);

/* =====================================================
   MODEL
===================================================== */

const FuelPrice =
  mongoose.models.FuelPrice ||
  mongoose.model(
    "FuelPrice",
    fuelPriceSchema
  );

export default FuelPrice;