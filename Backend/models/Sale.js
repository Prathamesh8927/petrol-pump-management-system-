import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    /* =====================================================
       PUMP
    ===================================================== */

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      immutable: true,
    },

    /* =====================================================
       NOZZLE
    ===================================================== */

    nozzleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nozzle",
      default: null,
    },

    /* =====================================================
       NOZZLE READING
    ===================================================== */

    readingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NozzleReading",
      default: undefined,
    },

    /* =====================================================
       PAYMENT
    ===================================================== */

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: undefined,
    },

    /* =====================================================
       FUEL
    ===================================================== */

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

    /* =====================================================
       PRIMARY PAYMENT METHOD
    ===================================================== */

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

    /* =====================================================
       SPLIT PAYMENTS
    ===================================================== */

    payments: {
      type: [
        {
          _id: false,

          method: {
            type: String,
            enum: [
              "cash",
              "upi",
              "card",
              "credit",
            ],
            required: true,
            lowercase: true,
            trim: true,
          },

          amount: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],

      default: [],
    },

    /* =====================================================
       READING TIME
    ===================================================== */

    readingTime: {
      type: String,
      default: null,
      match:
        /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    },

    /* =====================================================
       SALE DATE
    ===================================================== */

    saleDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    /* =====================================================
       SOURCE
    ===================================================== */

    source: {
      type: String,
      enum: [
        "manual",
        "nozzle",
        "payment",
      ],
      default: "nozzle",
      lowercase: true,
      trim: true,
    },

    /* =====================================================
       NOTE
    ===================================================== */

    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    /* =====================================================
       CREATED BY
    ===================================================== */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* =====================================================
       PAYMENT PROVIDER
    ===================================================== */

    providerPaymentId: {
      type: String,
      default: null,
    },

    paymentProvider: {
      type: String,
      default: null,
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
 * =====================================================
 * 1. PUMP + CREATED AT
 * =====================================================
 *
 * Extremely useful for:
 *
 * - latest sales
 * - sales history
 * - recent transactions
 * - pagination
 * - dashboard recent sales
 *
 * Example:
 *
 * Sale.find({ pumpId })
 *   .sort({ createdAt: -1 })
 *   .limit(20)
 */

saleSchema.index(
  {
    pumpId: 1,
    createdAt: -1,
  },
  {
    name: "idx_sale_pump_created",
  }
);

/*
 * =====================================================
 * 2. PUMP + SALE DATE
 * =====================================================
 *
 * Used heavily for:
 *
 * - daily sales
 * - reports
 * - date filtering
 * - dashboard calculations
 */

saleSchema.index(
  {
    pumpId: 1,
    saleDate: -1,
  },
  {
    name: "idx_sale_pump_date",
  }
);

/*
 * =====================================================
 * 3. PUMP + SALE DATE + SOURCE
 * =====================================================
 *
 * Useful when filtering:
 *
 * manual
 * nozzle
 * payment
 */

saleSchema.index(
  {
    pumpId: 1,
    saleDate: 1,
    source: 1,
  },
  {
    name: "idx_sale_pump_date_source",
  }
);

/*
 * =====================================================
 * 4. PUMP + NOZZLE + SALE DATE
 * =====================================================
 *
 * Useful for nozzle-specific sales history.
 */

saleSchema.index(
  {
    pumpId: 1,
    nozzleId: 1,
    saleDate: -1,
  },
  {
    name: "idx_sale_pump_nozzle_date",
  }
);

/*
 * =====================================================
 * 5. PUMP + CREATED BY + CREATED AT
 * =====================================================
 *
 * Useful for employee/user-created sales.
 */

saleSchema.index(
  {
    pumpId: 1,
    createdBy: 1,
    createdAt: -1,
  },
  {
    name: "idx_sale_pump_creator_created",
  }
);

/*
 * =====================================================
 * 6. ONE SALE PER NOZZLE READING
 * =====================================================
 *
 * A nozzle reading can create at most one Sale.
 *
 * Manual/payment sales can have no readingId.
 */

saleSchema.index(
  {
    readingId: 1,
  },
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
 * 7. UNIQUE PAYMENT SALE
 * =====================================================
 *
 * Only actual Payment ObjectIds participate.
 *
 * Normal sales without paymentId are allowed.
 */

saleSchema.index(
  {
    paymentId: 1,
  },
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

/*
 * =====================================================
 * 8. PROVIDER PAYMENT ID
 * =====================================================
 *
 * Useful for payment/webhook lookup.
 */

saleSchema.index(
  {
    providerPaymentId: 1,
  },
  {
    sparse: true,
    name: "idx_sale_provider_payment",
  }
);

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