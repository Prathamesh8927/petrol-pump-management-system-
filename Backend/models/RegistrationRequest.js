import mongoose from "mongoose";

const registrationRequestSchema =
  new mongoose.Schema(
    {
      /* ===============================================
         APPLICANT INFORMATION
      =============================================== */

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
      },

      /*
       * IMPORTANT:
       * This field contains a bcrypt HASH.
       * Plaintext passwords must NEVER be stored.
       */
      password: {
        type: String,
        required: true,
        minlength: 6,
        select: false,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
      },

      /* ===============================================
         PUMP INFORMATION
      =============================================== */

      pumpName: {
        type: String,
        required: true,
        trim: true,
      },

      companyName: {
        type: String,
        default: "",
        trim: true,
      },

      dealerCode: {
        type: String,
        default: "",
        trim: true,
      },

      gstin: {
        type: String,
        default: "",
        trim: true,
      },

      address: {
        type: String,
        default: "",
        trim: true,
      },

      city: {
        type: String,
        default: "",
        trim: true,
      },

      state: {
        type: String,
        default: "",
        trim: true,
      },

      pincode: {
        type: String,
        default: "",
        trim: true,
      },

      /* ===============================================
         PLAN
      =============================================== */

      plan: {
        type: String,
        default: "standard",
        trim: true,
      },

      notes: {
        type: String,
        default: "",
        trim: true,
      },

      /* ===============================================
         REQUEST STATUS
      =============================================== */

      status: {
        type: String,

        enum: [
          "pending",
          "approved",
          "rejected",
        ],

        default: "pending",

        index: true,
      },

      /* ===============================================
         SUPER ADMIN ACTION
      =============================================== */

      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      approvedAt: {
        type: Date,
        default: null,
      },

      rejectionReason: {
        type: String,
        default: "",
        trim: true,
      },

      /* ===============================================
         CREATED RECORD REFERENCES
      =============================================== */

      createdPumpId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        default: null,
      },

      createdUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      createdClientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

/* =====================================================
   INDEXES
===================================================== */

registrationRequestSchema.index({
  email: 1,
  status: 1,
});

registrationRequestSchema.index({
  createdAt: -1,
});

/* =====================================================
   MODEL
===================================================== */

const RegistrationRequest =
  mongoose.models.RegistrationRequest ||
  mongoose.model(
    "RegistrationRequest",
    registrationRequestSchema
  );

export default RegistrationRequest;