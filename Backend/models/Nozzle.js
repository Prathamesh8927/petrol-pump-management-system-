import mongoose from "mongoose";

const nozzleSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      index: true,
      immutable: true,
    },

    nozzleNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    fuelType: {
      type: String,
      enum: ["petrol", "diesel"],
      required: true,
      lowercase: true,
      trim: true,
      immutable: true,
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
      lowercase: true,
      trim: true,
      index: true,
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
 * Critical business rule:
 *
 * A nozzle number must be unique inside
 * a particular pump.
 *
 * Different pumps can have the same nozzle number.
 */
nozzleSchema.index(
  {
    pumpId: 1,
    nozzleNumber: 1,
  },
  {
    unique: true,
  }
);

/*
 * Optimizes active-nozzle queries for a pump.
 */
nozzleSchema.index({
  pumpId: 1,
  status: 1,
});

/*
 * Useful for newest nozzle records.
 */
nozzleSchema.index({
  pumpId: 1,
  createdAt: -1,
});

/* =====================================================
   MODEL
===================================================== */

const Nozzle =
  mongoose.models.Nozzle ||
  mongoose.model("Nozzle", nozzleSchema);

export default Nozzle;