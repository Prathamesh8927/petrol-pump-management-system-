import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      immutable: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      immutable: true,
      index: true,
    },

    employeeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    transactionType: {
      type: String,
      enum: ["nozzle", "standalone"],
      default: "nozzle",
      index: true,
    },

    nozzleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nozzle",
      default: null,
      immutable: true,
    },

    readingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NozzleReading",
      default: null,
    },

    shiftName: {
      type: String,
      default: null,
      enum: ["morning", "evening", "night"],
      lowercase: true,
      trim: true,
    },

    readingDate: {
      type: String,
      default: null,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    openingReading: {
      type: Number,
      default: null,
      min: 0,
    },

    closingReading: {
      type: Number,
      default: null,
      min: 0,
    },

    fuelType: {
      type: String,
      default: null,
      enum: ["petrol", "diesel"],
      lowercase: true,
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

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },

    paymentProvider: {
      type: String,
      default: "razorpay",
      enum: ["razorpay", "bank"],
      immutable: true,
    },

    providerOrderId: {
      type: String,
      default: undefined,
    },

    providerQrCodeId: {
      type: String,
      default: undefined,
    },

    qrImageUrl: {
      type: String,
      default: "",
    },

    providerPaymentId: {
      type: String,
      default: undefined,
    },

    method: {
      type: String,
      default: "upi",
      enum: ["upi", "card"],
    },

    status: {
      type: String,
      default: "pending",
      enum: [
        "pending",
        "paid",
        "failed",
        "expired",
        "cancelled",
      ],
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      default: null,
    },

    failureReason: {
      type: String,
      default: "",
      maxlength: 500,
    },

    webhookEventIds: {
      type: [String],
      default: [],
    },

    reservationKey: {
      type: String,
      required: true,
    },

    note: {
      type: String,
      default: "",
      maxlength: 500,
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

paymentSchema.index({
  pumpId: 1,
  status: 1,
  createdAt: -1,
});

paymentSchema.index({
  pumpId: 1,
  createdAt: -1,
});

/*
 * Provider order IDs must be unique when present.
 * Payments without a provider order ID are allowed.
 */
paymentSchema.index(
  { providerOrderId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerOrderId: {
        $type: "string",
      },
    },
    name: "uniq_payment_provider_order_id",
  }
);

/*
 * Provider QR IDs must be unique when present.
 * Payments without a provider QR ID are allowed.
 */
paymentSchema.index(
  { providerQrCodeId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerQrCodeId: {
        $type: "string",
      },
    },
    name: "uniq_payment_provider_qr_code_id",
  }
);

/*
 * A provider payment ID represents an actual
 * successful/failed provider-side payment.
 *
 * Multiple local pending payments can have no
 * providerPaymentId. Once a real provider ID exists,
 * it must be unique.
 */
paymentSchema.index(
  { providerPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerPaymentId: {
        $type: "string",
      },
    },
    name: "uniq_payment_provider_payment_id",
  }
);

/*
 * Only one pending payment is allowed for the
 * same reservation key.
 */
paymentSchema.index(
  { reservationKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "pending",
    },
    name: "uniq_pending_payment_reservation",
  }
);

/*
 * Automatically clean up old payment documents
 * after their expiry period.
 */
paymentSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 86400,
    name: "payment_expiry_cleanup",
  }
);

/* =====================================================
   MODEL
===================================================== */

const Payment =
  mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);

export default Payment;