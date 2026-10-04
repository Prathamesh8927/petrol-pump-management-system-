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

    /*
     * Only QR/online payment sales need a paymentId.
     *
     * Normal sales such as:
     * - cash
     * - UPI
     * - card
     * - credit
     *
     * can have no paymentId.
     */
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: undefined,
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

/*
 * Pump + sale date
 *
 * Useful for:
 * - daily sales
 * - reports
 * - dashboard queries
 */
saleSchema.index({
  pumpId: 1,
  saleDate: -1,
});

/*
 * Pump + date + source
 */
saleSchema.index({
  pumpId: 1,
  saleDate: 1,
  source: 1,
});

/*
 * Pump + nozzle + date
 */
saleSchema.index({
  pumpId: 1,
  nozzleId: 1,
  saleDate: -1,
});

/*
 * =====================================================
 * ONE SALE PER NOZZLE READING
 * =====================================================
 *
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

/*
 * =====================================================
 * USER / CREATOR QUERY INDEX
 * =====================================================
 */
saleSchema.index({
  pumpId: 1,
  createdBy: 1,
  createdAt: -1,
});

/*
 * =====================================================
 * PAYMENT ID UNIQUE INDEX
 * =====================================================
 *
 * IMPORTANT:
 *
 * Only actual Payment ObjectIds participate
 * in this unique constraint.
 *
 * Therefore:
 *
 * paymentId: ObjectId("...")
 *      -> must be unique
 *
 * paymentId: undefined
 *      -> ignored
 *
 * paymentId: null
 *      -> ignored
 *
 * This allows multiple normal sales without
 * an online Payment record.
 *
 * Example:
 *
 * Sale 1 -> cash -> no paymentId
 * Sale 2 -> cash -> no paymentId
 * Sale 3 -> UPI  -> no paymentId
 * Sale 4 -> card -> no paymentId
 * Sale 5 -> QR   -> paymentId = ObjectId(...)
 *
 * All are valid.
 */
saleSchema.index(
  { paymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paymentId: {
        $type: "objectId",
      },
    },
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