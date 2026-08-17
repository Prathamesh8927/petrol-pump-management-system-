import mongoose from "mongoose";

const fuelPurchaseSchema =
  new mongoose.Schema(
    {
      pumpId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        required: true,
        index: true,
      },

      fuelType: {
        type: String,
        enum: [
          "petrol",
          "diesel",
        ],
        required: true,
      },

      supplierName: {
        type: String,
        required: true,
        trim: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 0.01,
      },

      /* =====================================
         PURCHASE PRICE PER LITRE
      ===================================== */

      purchasePrice: {
        type: Number,
        required: true,
        min: 0.01,
      },

      totalAmount: {
        type: Number,
        required: true,
        min: 0.01,
      },

      purchaseDate: {
        type: String,
        required: true,
      },

      invoiceNumber: {
        type: String,
        default: "",
        trim: true,
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

fuelPurchaseSchema.index({
  pumpId: 1,
  purchaseDate: -1,
});

const FuelPurchase =
  mongoose.models.FuelPurchase ||
  mongoose.model(
    "FuelPurchase",
    fuelPurchaseSchema
  );

export default FuelPurchase;