import mongoose from "mongoose";

const ledgerCustomerSchema =
  new mongoose.Schema(
    {
      pumpId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        required: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
      },

      vehicleNumber: {
        type: String,
        default: "",
        trim: true,
        uppercase: true,
      },

      address: {
        type: String,
        default: "",
        trim: true,
      },

      currentBalance: {
        type: Number,
        default: 0,
        min: 0,
      },

      status: {
        type: String,

        enum: [
          "active",
          "inactive",
        ],

        default: "active",
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

/* =========================================
   INDEXES
========================================= */

ledgerCustomerSchema.index({
  pumpId: 1,
  name: 1,
});

ledgerCustomerSchema.index({
  pumpId: 1,
  phone: 1,
});

const LedgerCustomer =
  mongoose.models
    .LedgerCustomer ||
  mongoose.model(
    "LedgerCustomer",
    ledgerCustomerSchema
  );

export default LedgerCustomer;