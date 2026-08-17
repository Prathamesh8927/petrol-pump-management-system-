import mongoose from "mongoose";

const ledgerEntrySchema =
  new mongoose.Schema(
    {
      pumpId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        required: true,
        index: true,
      },

      customerId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "LedgerCustomer",
        required: true,
        index: true,
      },

      entryType: {
        type: String,

        enum: [
          "purchase",
          "payment",
        ],

        required: true,
      },

      fuelType: {
        type: String,

        enum: [
          "petrol",
          "diesel",
          null,
        ],

        default: null,
      },

      totalAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      paidAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      pendingAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      paymentAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      entryDate: {
        type: String,
        required: true,
      },

      note: {
        type: String,
        default: "",
        trim: true,
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

ledgerEntrySchema.index({
  pumpId: 1,
  customerId: 1,
  entryDate: -1,
});

const LedgerEntry =
  mongoose.models.LedgerEntry ||
  mongoose.model(
    "LedgerEntry",
    ledgerEntrySchema
  );

export default LedgerEntry;