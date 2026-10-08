import mongoose from "mongoose";

const pumpSettingSchema = new mongoose.Schema(
  {
    /* =====================================================
       PUMP
    ===================================================== */

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
    },

    /* =====================================================
       BASIC INFORMATION
    ===================================================== */

    pumpName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    ownerName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 254,
    },

    /* =====================================================
       ADDRESS
    ===================================================== */

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    city: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    state: {
      type: String,
      trim: true,
      default: "Maharashtra",
      maxlength: 100,
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },

    /* =====================================================
       BUSINESS INFORMATION
    ===================================================== */

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      maxlength: 20,
    },

    dealerCode: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },

    /* =====================================================
       SYSTEM SETTINGS
    ===================================================== */

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
      maxlength: 10,
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
 * One settings document per pump.
 *
 * This unique index also makes:
 *
 * PumpSetting.findOne({ pumpId })
 *
 * very efficient.
 */
pumpSettingSchema.index(
  {
    pumpId: 1,
  },
  {
    unique: true,
    name: "uniq_pump_setting_pump",
  }
);

/* =====================================================
   MODEL
===================================================== */

const PumpSetting =
  mongoose.models.PumpSetting ||
  mongoose.model(
    "PumpSetting",
    pumpSettingSchema
  );

export default PumpSetting;