import mongoose from "mongoose";

/* =====================================================
   NOZZLE READING SCHEMA
===================================================== */

const nozzleReadingSchema =
  new mongoose.Schema(
    {
      /* =====================================
         PUMP
      ===================================== */

      pumpId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        required: true,
        index: true,
      },

      /* =====================================
         NOZZLE
      ===================================== */

      nozzleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Nozzle",
        required: true,
        index: true,
      },

      /* =====================================
         SHIFT
      ===================================== */

      shiftName: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        enum: [
          "morning",
          "evening",
          "night",
        ],
      },

      /* =====================================
         STAFF
      ===================================== */

      staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      staffName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      /* =====================================
         FUEL
      ===================================== */

      fuelType: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        enum: [
          "petrol",
          "diesel",
        ],
      },

      /* =====================================
         READINGS
      ===================================== */

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

      /* =====================================
         PRICE
      ===================================== */

      pricePerLitre: {
        type: Number,
        required: true,
        min: 0,
      },

      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      /* =====================================
         DATE
         
         Format:
         YYYY-MM-DD

         Example:
         2026-10-08
      ===================================== */

      readingDate: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
        index: true,
      },

      /* =====================================
         TIME

         Format:
         HH:mm

         Example:
         14:35
      ===================================== */

      readingTime: {
        type: String,
        trim: true,
        match:
          /^(?:[01]\d|2[0-3]):[0-5]\d$/,
        default: null,
      },

      /* =====================================
         PRIMARY PAYMENT METHOD

         Kept for backward compatibility.

         Single payment:

         paymentMethod: "cash"

         Split payment:

         paymentMethod: "upi"

         payments:
         [
           { method: "upi", amount: 20000 },
           { method: "card", amount: 15000 },
           { method: "cash", amount: 10000 },
           { method: "credit", amount: 5000 }
         ]
      ===================================== */

      paymentMethod: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        enum: [
          "cash",
          "upi",
          "card",
          "credit",
        ],
      },

      /* =====================================
         SPLIT / MULTIPLE PAYMENTS

         One nozzle reading = one transaction.

         Example:

         totalAmount = 50000

         payments:
         [
           {
             method: "upi",
             amount: 20000
           },
           {
             method: "card",
             amount: 15000
           },
           {
             method: "cash",
             amount: 10000
           },
           {
             method: "credit",
             amount: 5000
           }
         ]

         Total:
         20000 + 15000 + 10000 + 5000
         = 50000

         The controller validates that the
         payment total exactly matches totalAmount.
      ===================================== */

      payments: {
        type: [
          {
            method: {
              type: String,
              required: true,
              trim: true,
              lowercase: true,
              enum: [
                "cash",
                "upi",
                "card",
                "credit",
              ],
            },

            amount: {
              type: Number,
              required: true,
              min: 0,
            },
          },
        ],

        default: [],
      },

      /* =====================================
         NOTE
      ===================================== */

      note: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      /* =====================================
         CREATED BY
      ===================================== */

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
    },

    {
      timestamps: true,

      /*
       * Prevent accidental storage of unknown
       * fields coming from frontend.
       */
      strict: true,
    }
  );

/* =====================================================
   INDEXES
===================================================== */

/* =====================================
   MAIN HISTORY QUERY
===================================== */

nozzleReadingSchema.index(
  {
    pumpId: 1,
    readingDate: -1,
    createdAt: -1,
  },
  {
    name:
      "idx_nozzle_reading_history",
  }
);

/* =====================================
   FILTER BY NOZZLE
===================================== */

nozzleReadingSchema.index(
  {
    pumpId: 1,
    nozzleId: 1,
    readingDate: -1,
    createdAt: -1,
  },
  {
    name:
      "idx_nozzle_reading_nozzle_history",
  }
);

/* =====================================
   FILTER BY STAFF
===================================== */

nozzleReadingSchema.index(
  {
    pumpId: 1,
    staffId: 1,
    readingDate: -1,
    createdAt: -1,
  },
  {
    name:
      "idx_nozzle_reading_staff_history",
  }
);

/* =====================================
   FILTER BY SHIFT
===================================== */

nozzleReadingSchema.index(
  {
    pumpId: 1,
    shiftName: 1,
    readingDate: -1,
    createdAt: -1,
  },
  {
    name:
      "idx_nozzle_reading_shift_history",
  }
);

/* =====================================
   FILTER BY PRIMARY PAYMENT
===================================== */

nozzleReadingSchema.index(
  {
    pumpId: 1,
    paymentMethod: 1,
    readingDate: -1,
    createdAt: -1,
  },
  {
    name:
      "idx_nozzle_reading_payment_history",
  }
);

/* =====================================
   UNIQUE READING

   Prevent duplicate reading for:

   pump
   +
   nozzle
   +
   date
   +
   shift
===================================== */

nozzleReadingSchema.index(
  {
    pumpId: 1,
    nozzleId: 1,
    readingDate: 1,
    shiftName: 1,
  },
  {
    unique: true,
    name:
      "uniq_pump_nozzle_date_shift",
  }
);

/* =====================================
   DATE QUERY
===================================== */

nozzleReadingSchema.index(
  {
    pumpId: 1,
    readingDate: 1,
  },
  {
    name:
      "idx_nozzle_reading_date",
  }
);

/* =====================================================
   MODEL
===================================================== */

const NozzleReading =
  mongoose.models.NozzleReading ||
  mongoose.model(
    "NozzleReading",
    nozzleReadingSchema
  );

export default NozzleReading;