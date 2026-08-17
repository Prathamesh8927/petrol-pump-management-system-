import mongoose from "mongoose";

const fuelPriceSchema =
  new mongoose.Schema(
    {
      pumpId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Pump",

        required: true,

        index: true,
      },

      fuelType: {
        type: String,

        enum: [
          "petrol",
          "diesel",
        ],

        required: true,
      },

      price: {
        type: Number,

        required: true,

        min: 0,
      },
    },
    {
      timestamps: true,
    }
  );

fuelPriceSchema.index(
  {
    pumpId: 1,
    fuelType: 1,
  },
  {
    unique: true,
  }
);

const FuelPrice =
  mongoose.models.FuelPrice ||
  mongoose.model(
    "FuelPrice",
    fuelPriceSchema
  );

export default FuelPrice;