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
      default: undefined,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
      index: true,
    },

    fuelType: {
      type: String,
      enum: ["petrol", "diesel"],
      default: null,
      lowercase: true,
      trim: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    pricePerLitre: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "credit"],
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
      enum: ["manual", "nozzle", "payment"],
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

    providerPaymentId: {
      type: String,
      default: null,
      index: true,
    },

    paymentProvider: {
      type: String,
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
 * Sales without a readingId, such as manual
 * or employee payment sales, are excluded
 * from this unique constraint.
 */
saleSchema.index(
  { readingId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      readingId: {
        $type: "objectId",
      },
    },
    name: "uniq_sale_reading",
  }
);

saleSchema.index({
  pumpId: 1,
  createdBy: 1,
  createdAt: -1,
});

saleSchema.index(
  { paymentId: 1 },
  {
    unique: true,
    sparse: true,
    name: "uniq_sale_payment",
  }
);

/* =====================================================
   MODEL
===================================================== */

const Sale =
  mongoose.models.Sale ||
  mongoose.model("Sale", saleSchema);

export default Sale;