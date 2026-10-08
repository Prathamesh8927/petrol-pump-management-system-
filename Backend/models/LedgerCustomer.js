import mongoose from "mongoose";

const ledgerCustomerSchema =
  new mongoose.Schema(
    {
      // ==================================================
      // PUMP
      // ==================================================
      pumpId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        required: true,
        immutable: true,
      },

      // ==================================================
      // CUSTOMER NAME
      // ==================================================
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      // ==================================================
      // PHONE
      // ==================================================
      phone: {
        type: String,
        default: "",
        trim: true,
        maxlength: 20,
      },

      // ==================================================
      // VEHICLE NUMBER
      // ==================================================
      vehicleNumber: {
        type: String,
        default: "",
        trim: true,
        uppercase: true,
        maxlength: 30,
      },

      // ==================================================
      // ADDRESS
      // ==================================================
      address: {
        type: String,
        default: "",
        trim: true,
        maxlength: 500,
      },

      // ==================================================
      // CURRENT BALANCE
      // ==================================================
      currentBalance: {
        type: Number,
        default: 0,
        min: 0,
      },

      // ==================================================
      // STATUS
      // ==================================================
      status: {
        type: String,
        enum: [
          "active",
          "inactive",
        ],
        default: "active",
        lowercase: true,
        trim: true,
      },

      // ==================================================
      // NOTE
      // ==================================================
      note: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
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
 * Customer name search/listing.
 */
ledgerCustomerSchema.index(
  {
    pumpId: 1,
    name: 1,
  },
  {
    name: "idx_customer_pump_name",
  }
);

/*
 * Phone lookup.
 */
ledgerCustomerSchema.index(
  {
    pumpId: 1,
    phone: 1,
  },
  {
    name: "idx_customer_pump_phone",
  }
);

/*
 * Vehicle number lookup.
 */
ledgerCustomerSchema.index(
  {
    pumpId: 1,
    vehicleNumber: 1,
  },
  {
    name: "idx_customer_pump_vehicle",
  }
);

/*
 * Active/inactive customer filtering.
 */
ledgerCustomerSchema.index(
  {
    pumpId: 1,
    status: 1,
  },
  {
    name: "idx_customer_pump_status",
  }
);

/*
 * Dashboard / credit report.
 *
 * Supports:
 *
 * {
 *   pumpId,
 *   status: "active",
 *   currentBalance: { $gt: 0 }
 * }
 */
ledgerCustomerSchema.index(
  {
    pumpId: 1,
    status: 1,
    currentBalance: 1,
  },
  {
    name: "idx_customer_active_balance",
  }
);

/* =====================================================
   MODEL
===================================================== */

const LedgerCustomer =
  mongoose.models.LedgerCustomer ||
  mongoose.model(
    "LedgerCustomer",
    ledgerCustomerSchema
  );

export default LedgerCustomer;