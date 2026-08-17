import mongoose from "mongoose";

const clientSchema =
  new mongoose.Schema(
    {
      /* =================================================
         LINKED PUMP
      ================================================= */

      pumpId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Pump",

        required: true,

        unique: true,

        index: true,
      },

      /* =================================================
         OWNER USER
      ================================================= */

      ownerUserId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        unique: true,

        index: true,
      },

      /* =================================================
         CLIENT INFORMATION
      ================================================= */

      pumpName: {
        type: String,

        required: true,

        trim: true,
      },

      ownerName: {
        type: String,

        required: true,

        trim: true,
      },

      email: {
        type: String,

        required: true,

        lowercase: true,

        trim: true,

        unique: true,
      },

      phone: {
        type: String,

        default: "",

        trim: true,
      },

      address: {
        type: String,

        default: "",

        trim: true,
      },

      /* =================================================
         CLIENT CODE
      ================================================= */

      pumpCode: {
        type: String,

        required: true,

        unique: true,

        index: true,
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

        default:
          "standard",
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

        default:
          "active",

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
      },

      notes: {
        type: String,

        default: "",

        trim: true,
      },

      /* =================================================
         CREATED BY
      ================================================= */

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

const Client =
  mongoose.models.Client ||
  mongoose.model(
    "Client",
    clientSchema
  );

export default Client;