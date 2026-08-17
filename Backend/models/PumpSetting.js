import mongoose from "mongoose";

const pumpSettingSchema = new mongoose.Schema(
  {
    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      unique: true,
      index: true,
    },

    pumpName: {
      type: String,
      trim: true,
      default: "",
    },

    ownerName: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "Maharashtra",
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    dealerCode: {
      type: String,
      trim: true,
      default: "",
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    currency: {
      type: String,
      default: "INR",
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
  }
);

const PumpSetting =
  mongoose.models.PumpSetting ||
  mongoose.model(
    "PumpSetting",
    pumpSettingSchema
  );

export default PumpSetting;