import mongoose from "mongoose";

const nozzleReadingSchema =
  new mongoose.Schema(
    {
      pumpId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        required: true,
        index: true,
      },

      nozzleId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Nozzle",
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

      openingReading: {
        type: Number,
        required: true,
        min: 0,
      },

      closingReading: {
        type: Number,
        required: true,
        min: 0,
      },

      litresSold: {
        type: Number,
        required: true,
        min: 0,
      },

      /*
        Store the selling price used
        at the time of this reading.
      */

      pricePerLitre: {
        type: Number,
        required: true,
        min: 0,
      },

      /*
        litresSold × pricePerLitre
      */

      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      readingDate: {
        type: String,
        required: true,
        index: true,
      },

      paymentMethod: {
        type: String,
        enum: [
          "cash",
          "upi",
          "card",
          "credit",
        ],
        default: "cash",
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

nozzleReadingSchema.index({
  pumpId: 1,
  readingDate: -1,
});

nozzleReadingSchema.index({
  pumpId: 1,
  nozzleId: 1,
  readingDate: -1,
});

const NozzleReading =
  mongoose.models.NozzleReading ||
  mongoose.model(
    "NozzleReading",
    nozzleReadingSchema
  );

export default NozzleReading;