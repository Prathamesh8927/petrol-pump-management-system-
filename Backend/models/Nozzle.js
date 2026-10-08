import mongoose from "mongoose";

const nozzleSchema = new mongoose.Schema(
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
    // NOZZLE NUMBER
    // ==================================================
    nozzleNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    // ==================================================
    // NOZZLE NAME
    // ==================================================
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
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
    // CURRENT METER READING
    // ==================================================
    currentReading: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==================================================
    // STATUS
    // ==================================================
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      lowercase: true,
      trim: true,
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
 * 1. UNIQUE NOZZLE NUMBER PER PUMP
 *
 * Business rule:
 *
 * Pump A:
 *   Nozzle 1
 *   Nozzle 2
 *
 * Pump B:
 *   Nozzle 1
 *   Nozzle 2
 *
 * This is allowed because uniqueness is scoped
 * to pumpId.
 */
nozzleSchema.index(
  {
    pumpId: 1,
    nozzleNumber: 1,
  },
  {
    unique: true,
    name: "uniq_nozzle_pump_number",
  }
);

/*
 * 2. ACTIVE / INACTIVE NOZZLES
 *
 * Supports queries such as:
 *
 * Nozzle.find({
 *   pumpId,
 *   status: "active"
 * })
 */
nozzleSchema.index(
  {
    pumpId: 1,
    status: 1,
  },
  {
    name: "idx_nozzle_pump_status",
  }
);

/*
 * 3. NOZZLE MANAGEMENT / NEWEST RECORDS
 *
 * Supports:
 *
 * Nozzle.find({
 *   pumpId
 * }).sort({
 *   createdAt: -1
 * })
 */
nozzleSchema.index(
  {
    pumpId: 1,
    createdAt: -1,
  },
  {
    name: "idx_nozzle_pump_created",
  }
);

/* =====================================================
   MODEL
===================================================== */

const Nozzle =
  mongoose.models.Nozzle ||
  mongoose.model("Nozzle", nozzleSchema);

export default Nozzle;