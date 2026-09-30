import mongoose from "mongoose";

/* =====================================================
   CLIENT SCHEMA
===================================================== */

const clientSchema = new mongoose.Schema(
  {
    /* =================================================
       LINKED PUMP

       One Client record represents one Pump.

       immutable prevents accidental reassignment of an
       existing client to another pump.
    ================================================= */

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Pump",

      required: true,

      unique: true,

      index: true,

      immutable: true,
    },

    /* =================================================
       OWNER USER

       One Client has exactly one owner account.

       immutable prevents accidental ownership transfer
       through a normal Client update.
    ================================================= */

    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      required: true,

      unique: true,

      index: true,

      immutable: true,
    },

    /* =================================================
       CLIENT INFORMATION
    ================================================= */

    pumpName: {
      type: String,

      required: true,

      trim: true,

      minlength: 1,

      maxlength: 200,
    },

    ownerName: {
      type: String,

      required: true,

      trim: true,

      minlength: 1,

      maxlength: 100,
    },

    email: {
      type: String,

      required: true,

      lowercase: true,

      trim: true,

      maxlength: 254,

      unique: true,
    },

    phone: {
      type: String,

      default: "",

      trim: true,

      maxlength: 30,
    },

    address: {
      type: String,

      default: "",

      trim: true,

      maxlength: 500,
    },

    /* =================================================
       CLIENT CODE

       Unique business-facing identifier.
    ================================================= */

    pumpCode: {
      type: String,

      required: true,

      unique: true,

      index: true,

      trim: true,

      uppercase: true,

      minlength: 1,

      maxlength: 50,
    },

    /* =================================================
       PLAN
    ================================================= */

    plan: {
      type: String,

      enum: [
        "basic",
        "standard",
        "premium",
      ],

      default: "standard",

      lowercase: true,

      trim: true,

      index: true,
    },

    /* =================================================
       STATUS
    ================================================= */

    status: {
      type: String,

      enum: [
        "active",
        "inactive",
        "expired",
      ],

      default: "active",

      lowercase: true,

      trim: true,

      index: true,
    },

    /* =================================================
       SUBSCRIPTION
    ================================================= */

    subscriptionStart: {
      type: Date,

      default: null,
    },

    subscriptionEnd: {
      type: Date,

      default: null,

      validate: {
        validator: function (value) {
          if (!value) {
            return true;
          }

          if (!this.subscriptionStart) {
            return true;
          }

          return (
            value >=
            this.subscriptionStart
          );
        },

        message:
          "Subscription end date cannot be before subscription start date",
      },
    },

    notes: {
      type: String,

      default: "",

      trim: true,

      maxlength: 2000,
    },

    /* =================================================
       CREATED BY

       Usually the Super Admin who created/approved the
       client. Indexed for audit/admin queries.
    ================================================= */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "User",

      default: null,

      index: true,
    },
  },

  {
    timestamps: true,

    /*
     * Prevent accidental storage of fields that are not
     * defined in the schema.
     */
    strict: true,
  }
);

/* =====================================================
   ADDITIONAL INDEXES
===================================================== */

/*
 * Useful for Super Admin client listings and
 * subscription/status-related queries.
 *
 * pumpId, ownerUserId, email and pumpCode already have
 * unique indexes created from their schema options.
 */
clientSchema.index({
  status: 1,
  createdAt: -1,
});

clientSchema.index({
  subscriptionEnd: 1,
  status: 1,
});

/* =====================================================
   MODEL
===================================================== */

const Client =
  mongoose.models.Client ||
  mongoose.model(
    "Client",
    clientSchema
  );

export default Client;