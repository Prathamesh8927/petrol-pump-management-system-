import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      index: true,
    },

    nozzleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nozzle",
      default: null,
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
    },

    saleDate: {
      type: String,
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: [
        "manual",
        "nozzle",
      ],
      default: "nozzle",
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   INDEXES
===================================================== */

/*
  Optimizes pump-specific sales
  history and dashboard queries.
*/
saleSchema.index({
  pumpId: 1,
  saleDate: -1,
});

/*
  Optimizes manual-sale queries:
  pumpId + saleDate + source
*/
saleSchema.index({
  pumpId: 1,
  saleDate: 1,
  source: 1,
});

/*
  Unique only when readingId exists.
  Manual sales may have no readingId.
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

const Sale =
  mongoose.models.Sale ||
  mongoose.model(
    "Sale",
    saleSchema
  );

export default Sale;