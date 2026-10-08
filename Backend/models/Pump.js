import mongoose from "mongoose";

/* =========================================================
   BANK ACCOUNT
========================================================= */

const bankAccountSchema = new mongoose.Schema(
  {
    accountHolderName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    bankName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    /*
     * Sensitive information.
     *
     * select:false prevents the complete account number
     * from being returned by normal Pump queries.
     *
     * Explicitly request it only when required:
     *
     * .select("+bankAccount.accountNumber")
     */
    accountNumber: {
      type: String,
      default: "",
      trim: true,
      select: false,
      maxlength: 50,
    },

    ifsc: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      maxlength: 20,
    },

    branchName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    accountType: {
      type: String,
      enum: ["savings", "current", ""],
      default: "",
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
    strict: true,
  }
);

/* =========================================================
   PAYMENT CONFIGURATION
========================================================= */

const paymentConfigSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["razorpay", "bank"],
      default: "razorpay",
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    merchantId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    terminalId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    merchantVpa: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    dynamicQrEnabled: {
      type: Boolean,
      default: true,
    },

    webhookEnabled: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "connected",
        "pending",
        "disabled",
        "error",
      ],
      default: "connected",
    },

    connectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
    strict: true,
  }
);

/* =========================================================
   PUMP
========================================================= */

const pumpSchema = new mongoose.Schema(
  {
    // =====================================================
    // BASIC PUMP INFORMATION
    // =====================================================

    pumpName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    ownerName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    companyName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 150,
    },

    dealerCode: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    gstin: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      maxlength: 20,
    },

    // =====================================================
    // ADDRESS
    // =====================================================

    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    city: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    state: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },

    pincode: {
      type: String,
      default: "",
      trim: true,
      maxlength: 20,
    },

    // =====================================================
    // FUEL STOCK ALERT
    // =====================================================

    lowStockAlert: {
      type: Number,
      default: 1000,
      min: 0,
    },

    enableLowStockAlert: {
      type: Boolean,
      default: true,
    },

    // =====================================================
    // PAYMENT CONFIGURATION
    // =====================================================

    /*
     * Controls payment processing.
     *
     * This is separate from bankAccount because it
     * contains payment-provider configuration rather
     * than settlement-bank details.
     */
    paymentConfig: {
      type: paymentConfigSchema,
      default: () => ({}),
    },

    // =====================================================
    // OWNER BANK ACCOUNT
    // =====================================================

    /*
     * Sensitive settlement account information.
     *
     * accountNumber is select:false inside bankAccount.
     */
    bankAccount: {
      type: bankAccountSchema,
      default: () => ({}),
    },

    // =====================================================
    // STATUS
    // =====================================================

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

/* =========================================================
   INDEXES
========================================================= */

/*
 * Pump name lookup/listing.
 *
 * Useful for SuperAdmin pump management.
 */
pumpSchema.index(
  {
    pumpName: 1,
  },
  {
    name: "idx_pump_name",
  }
);

/*
 * Active pump filtering.
 *
 * Useful for SuperAdmin dashboards and pump lists.
 */
pumpSchema.index(
  {
    active: 1,
  },
  {
    name: "idx_pump_active",
  }
);

/*
 * Dealer code lookup.
 *
 * Keep this non-unique because the current business model
 * does not explicitly require dealerCode to be globally
 * unique.
 */
pumpSchema.index(
  {
    dealerCode: 1,
  },
  {
    name: "idx_pump_dealer_code",
    sparse: true,
  }
);

/* =========================================================
   MODEL
========================================================= */

const Pump =
  mongoose.models.Pump ||
  mongoose.model("Pump", pumpSchema);

export default Pump;