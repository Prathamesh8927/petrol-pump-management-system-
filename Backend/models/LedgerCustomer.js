import mongoose from "mongoose";

const ledgerCustomerSchema =
  new mongoose.Schema(
    {
      /* -----------------------------------------
         PUMP
      ----------------------------------------- */

      pumpId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        required: true,
        index: true,
      },

      /* -----------------------------------------
         CUSTOMER NAME
      ----------------------------------------- */

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      /* -----------------------------------------
         PHONE
      ----------------------------------------- */

      phone: {
        type: String,
        default: "",
        trim: true,
        maxlength: 20,
      },

      /* -----------------------------------------
         VEHICLE NUMBER
      ----------------------------------------- */

      vehicleNumber: {
        type: String,
        default: "",
        trim: true,
        uppercase: true,
        maxlength: 30,
      },

      /* -----------------------------------------
         ADDRESS
      ----------------------------------------- */

      address: {
        type: String,
        default: "",
        trim: true,
        maxlength: 500,
      },

      /* -----------------------------------------
         CURRENT BALANCE
      ----------------------------------------- */

      currentBalance: {
        type: Number,
        default: 0,
        min: 0,
      },

      /* -----------------------------------------
         STATUS
      ----------------------------------------- */

      status: {
        type: String,
        enum: [
          "active",
          "inactive",
        ],
        default: "active",
        index: true,
      },

      /* -----------------------------------------
         NOTE
      ----------------------------------------- */

      note: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
      },
    },
    {
      timestamps: true,
    }
  );

/* =========================================
   INDEXES
========================================= */

/*
   Common ledger customer listing/search.
*/

ledgerCustomerSchema.index({
  pumpId: 1,
  name: 1,
});

/*
   Phone-based customer search.
*/

ledgerCustomerSchema.index({
  pumpId: 1,
  phone: 1,
});

/*
   Important for soft-delete filtering.

   Example:
   {
     pumpId,
     status: "active"
   }
*/

ledgerCustomerSchema.index({
  pumpId: 1,
  status: 1,
});

/*
   Useful for vehicle-based customer lookup.
*/

ledgerCustomerSchema.index({
  pumpId: 1,
  vehicleNumber: 1,
});

/* =========================================
   MODEL
========================================= */

const LedgerCustomer =
  mongoose.models
    .LedgerCustomer ||
  mongoose.model(
    "LedgerCustomer",
    ledgerCustomerSchema
  );

export default LedgerCustomer;