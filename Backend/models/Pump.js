import mongoose from "mongoose";

const bankAccountSchema = new mongoose.Schema(
  {
    accountHolderName: {
      type: String,
      default: "",
      trim: true,
    },

    bankName: {
      type: String,
      default: "",
      trim: true,
    },

    accountNumber: {
      type: String,
      default: "",
      trim: true,
      select: false,
    },

    ifsc: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    branchName: {
      type: String,
      default: "",
      trim: true,
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
  }
);

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
    },

    terminalId: {
      type: String,
      default: "",
      trim: true,
    },

    merchantVpa: {
      type: String,
      default: "",
      trim: true,
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
  }
);

const pumpSchema = new mongoose.Schema(
  {
    pumpName: {
      type: String,
      default: "",
      trim: true,
    },

    ownerName: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    companyName: {
      type: String,
      default: "",
      trim: true,
    },

    dealerCode: {
      type: String,
      default: "",
      trim: true,
    },

    gstin: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    pincode: {
      type: String,
      default: "",
      trim: true,
    },

    lowStockAlert: {
      type: Number,
      default: 1000,
      min: 0,
    },

    enableLowStockAlert: {
      type: Boolean,
      default: true,
    },

    /*
     * Payment provider configuration.
     *
     * This controls how payments are processed.
     * It does NOT contain owner's bank account details.
     */
    paymentConfig: {
      type: paymentConfigSchema,
      default: () => ({}),
    },

    /*
     * Owner settlement bank account.
     *
     * This is intentionally separate from paymentConfig.
     *
     * accountNumber uses select:false so normal Pump queries
     * do not expose the full bank account number.
     */
    bankAccount: {
      type: bankAccountSchema,
      default: () => ({}),
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Pump =
  mongoose.models.Pump ||
  mongoose.model("Pump", pumpSchema);

export default Pump;