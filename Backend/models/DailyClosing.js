import mongoose from "mongoose";

const dailyClosingSchema =
  new mongoose.Schema(
    {
      pumpId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        required: true,
        index: true,
      },

      businessDate: {
        type: String,
        required: true,
      },

      totalSales: {
        type: Number,
        default: 0,
      },

      cashSales: {
        type: Number,
        default: 0,
      },

      upiSales: {
        type: Number,
        default: 0,
      },

      cardSales: {
        type: Number,
        default: 0,
      },

      creditSales: {
        type: Number,
        default: 0,
      },

      totalExpenses: {
        type: Number,
        default: 0,
      },

      netCollection: {
        type: Number,
        default: 0,
      },

      petrolSold: {
        type: Number,
        default: 0,
      },

      dieselSold: {
        type: Number,
        default: 0,
      },

      petrolClosingStock: {
        type: Number,
        default: 0,
      },

      dieselClosingStock: {
        type: Number,
        default: 0,
      },

      pendingCredit: {
        type: Number,
        default: 0,
      },

      status: {
        type: String,
        enum: [
          "closed",
          "reopened",
        ],
        default: "closed",
      },

      closedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      closedAt: {
        type: Date,
        default: Date.now,
      },

      reopenedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      reopenedAt: {
        type: Date,
        default: null,
      },

      note: {
        type: String,
        default: "",
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

dailyClosingSchema.index(
  {
    pumpId: 1,
    businessDate: 1,
  },
  {
    unique: true,
  }
);

const DailyClosing =
  mongoose.models
    .DailyClosing ||
  mongoose.model(
    "DailyClosing",
    dailyClosingSchema
  );

export default DailyClosing;