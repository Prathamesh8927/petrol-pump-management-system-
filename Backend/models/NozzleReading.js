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
         
         IMPORTANT:
         Keep this as String because the
         application uses local Indian
         calendar dates in YYYY-MM-DD.
      ===================================== */

      readingDate: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
        index: true,
      },

      /* =====================================
         PAYMENT
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
       * fields coming from the frontend.
       */
      strict: true,
    }
  );

/* =====================================================
   INDEXES
===================================================== */

/*
 * MAIN HISTORY QUERY
 *
 * Controller query:
 *
 * NozzleReading.find({
 *   pumpId
 * })
 * .sort({
 *   readingDate: -1,
 *   createdAt: -1
 * })
 *
 * This is the most important index for
 * Reading History.
 */
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

/*
 * FILTER BY NOZZLE
 */
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

/*
 * FILTER BY STAFF
 */
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

/*
 * FILTER BY SHIFT
 */
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

/*
 * FILTER BY PAYMENT
 */
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

/*
 * VERY IMPORTANT:
 *
 * Prevent duplicate final shift readings
 * for the same nozzle, pump, date and shift.
 */
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

/*
 * Date-specific queries.
 *
 * Useful when the frontend requests:
 *
 * ?date=2026-09-25
 */
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