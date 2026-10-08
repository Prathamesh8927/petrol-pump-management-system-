import mongoose from "mongoose";

/* =====================================================
   CLIENT SCHEMA
===================================================== */

const clientSchema = new mongoose.Schema(
  {
    /* =================================================
       LINKED PUMP
    ================================================= */

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: true,
      immutable: true,
    },

    /* =================================================
       OWNER USER
    ================================================= */

    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    ================================================= */

    pumpCode: {
      type: String,
      required: true,
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
      enum: ["basic", "standard", "premium"],
      default: "standard",
      lowercase: true,
      trim: true,
    },

    /* =================================================
       STATUS
    ================================================= */

    status: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "active",
      lowercase: true,
      trim: true,
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
          if (!value || !this.subscriptionStart) {
            return true;
          }

          return value >= this.subscriptionStart;
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
    ================================================= */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
 * One client per pump.
 */
clientSchema.index(
  { pumpId: 1 },
  {
    unique: true,
    name: "uniq_client_pump",
  }
);

/*
 * One owner account per client.
 */
clientSchema.index(
  { ownerUserId: 1 },
  {
    unique: true,
    name: "uniq_client_owner_user",
  }
);

/*
 * Email is unique for client accounts.
 */
clientSchema.index(
  { email: 1 },
  {
    unique: true,
    name: "uniq_client_email",
  }
);

/*
 * Business-facing pump code.
 */
clientSchema.index(
  { pumpCode: 1 },
  {
    unique: true,
    name: "uniq_client_pump_code",
  }
);

/*
 * Useful for Super Admin client listings.
 */
clientSchema.index(
  { status: 1, createdAt: -1 },
  {
    name: "idx_client_status_created",
  }
);

/*
 * Useful for subscription expiry checks.
 */
clientSchema.index(
  { subscriptionEnd: 1, status: 1 },
  {
    name: "idx_client_subscription_status",
  }
);

/*
 * Useful when filtering clients by plan.
 */
clientSchema.index(
  { plan: 1, status: 1, createdAt: -1 },
  {
    name: "idx_client_plan_status_created",
  }
);

/*
 * Useful for Super Admin queries by creator.
 */
clientSchema.index(
  { createdBy: 1, createdAt: -1 },
  {
    name: "idx_client_creator_created",
  }
);

/* =====================================================
   MODEL
===================================================== */

const Client =
  mongoose.models.Client ||
  mongoose.model("Client", clientSchema);

export default Client;