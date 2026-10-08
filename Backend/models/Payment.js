import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
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
       EMPLOYEE
    ===================================================== */

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
    },

    employeeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    /* =====================================================
       TRANSACTION TYPE
    ===================================================== */

    transactionType: {
      type: String,
      enum: ["nozzle", "standalone"],
      default: "nozzle",
    },

    /* =====================================================
       NOZZLE / READING
    ===================================================== */

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

    /* =====================================================
       FUEL
    ===================================================== */

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

    /* =====================================================
       AMOUNT
    ===================================================== */

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
     * Amount in paise.
     *
     * Used for payment-provider APIs that require
     * integer currency units.
     */
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },

    /* =====================================================
       PAYMENT PROVIDER
    ===================================================== */

    paymentProvider: {
      type: String,
      default: "razorpay",
      enum: ["razorpay", "bank"],
      immutable: true,
    },

    providerOrderId: {
      type: String,
      default: undefined,
      trim: true,
    },

    providerQrCodeId: {
      type: String,
      default: undefined,
      trim: true,
    },

    qrImageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    providerPaymentId: {
      type: String,
      default: undefined,
      trim: true,
    },

    /* =====================================================
       PAYMENT METHOD
    ===================================================== */

    method: {
      type: String,
      default: "upi",
      enum: ["upi", "card"],
    },

    /* =====================================================
       PAYMENT STATUS
    ===================================================== */

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
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    /* =====================================================
       SALE
    ===================================================== */

    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      default: null,
    },

    /* =====================================================
       FAILURE
    ===================================================== */

    failureReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    /* =====================================================
       WEBHOOK
    ===================================================== */

    webhookEventIds: {
      type: [String],
      default: [],
    },

    /* =====================================================
       RESERVATION
    ===================================================== */

    /*
     * Prevents duplicate pending payments for the same
     * reservation.
     */
    reservationKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    /* =====================================================
       NOTE
    ===================================================== */

    note: {
      type: String,
      default: "",
      trim: true,
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

/*
 * 1. PUMP + STATUS + CREATED
 *
 * Main payment history query.
 *
 * Useful for:
 *
 * - pending payments
 * - paid payments
 * - failed payments
 * - newest payments
 */
paymentSchema.index(
  {
    pumpId: 1,
    status: 1,
    createdAt: -1,
  },
  {
    name: "idx_payment_pump_status_created",
  }
);

/*
 * 2. PUMP + CREATED
 *
 * Useful when listing all payments for a pump
 * regardless of status.
 */
paymentSchema.index(
  {
    pumpId: 1,
    createdAt: -1,
  },
  {
    name: "idx_payment_pump_created",
  }
);

/*
 * 3. PROVIDER ORDER ID
 *
 * Provider order IDs must be unique when present.
 */
paymentSchema.index(
  {
    providerOrderId: 1,
  },
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
 * 4. PROVIDER QR CODE ID
 *
 * Each provider QR code belongs to one local payment.
 */
paymentSchema.index(
  {
    providerQrCodeId: 1,
  },
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
 * 5. PROVIDER PAYMENT ID
 *
 * Prevents the same provider payment from being
 * processed more than once.
 *
 * This is particularly important for webhook
 * idempotency.
 */
paymentSchema.index(
  {
    providerPaymentId: 1,
  },
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
 * 6. PENDING RESERVATION
 *
 * Only one pending payment can exist for a
 * reservationKey.
 *
 * Once the payment becomes paid/failed/expired,
 * another payment with the same reservationKey
 * is allowed.
 */
paymentSchema.index(
  {
    reservationKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "pending",
    },
    name: "uniq_pending_payment_reservation",
  }
);

/*
 * 7. PAYMENT CLEANUP
 *
 * MongoDB removes documents after expiresAt + 24 hours.
 *
 * Important:
 * this is cleanup, not exact payment expiration.
 *
 * Your payment controller should still explicitly
 * mark expired payments as "expired".
 */
paymentSchema.index(
  {
    expiresAt: 1,
  },
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