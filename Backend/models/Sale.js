import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      index: true,
      immutable: true,
    },

    nozzleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nozzle",
      default: null,
      index: true,
    },

    readingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NozzleReading",
      default: null,
    },

    fuelType: {
      type: String,
      enum: ["petrol", "diesel"],
      required: true,
      lowercase: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    pricePerLitre: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "upi",
        "card",
        "credit",
      ],
      default: "cash",
      lowercase: true,
      trim: true,
    },

    saleDate: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    source: {
      type: String,
      enum: [
        "manual",
        "nozzle",
      ],
      default: "nozzle",
      lowercase: true,
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

saleSchema.index({
  pumpId: 1,
  saleDate: -1,
});

saleSchema.index({
  pumpId: 1,
  saleDate: 1,
  source: 1,
});

saleSchema.index({
  pumpId: 1,
  nozzleId: 1,
  saleDate: -1,
});

/*
 * A nozzle reading should generate at most
 * one Sale.
 *
 * Manual sales can have no readingId.
 */
saleSchema.index(
  {
    readingId: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

saleSchema.index({
  pumpId: 1,
  createdBy: 1,
  createdAt: -1,
});

/* =====================================================
   MODEL
===================================================== */

const Sale =
  mongoose.models.Sale ||
  mongoose.model(
    "Sale",
    saleSchema
  );

export default Sale;