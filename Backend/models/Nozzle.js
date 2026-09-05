import mongoose from "mongoose";

const nozzleSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      index: true,
    },

    nozzleNumber: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    fuelType: {
      type: String,
      enum: ["petrol", "diesel"],
      required: true,
    },

    currentReading: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

nozzleSchema.index(
  {
    pumpId: 1,
    nozzleNumber: 1,
  },
  {
    unique: true,
  }
);

const Nozzle =
  mongoose.models.Nozzle ||
  mongoose.model(
    "Nozzle",
    nozzleSchema
  );

export default Nozzle;