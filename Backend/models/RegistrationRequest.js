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
        maxlength: 100,
      },

      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        maxlength: 254,

        validate: {
          validator: (value) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
              value
            ),

          message:
            "Please provide a valid email address",
        },
      },

      /*
       * IMPORTANT:
       * This field contains a bcrypt HASH.
       * Plaintext passwords must NEVER be stored.
       *
       * The registration controller is responsible
       * for hashing the plaintext password before
       * creating this document.
       */

      password: {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 200,
        select: false,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
        maxlength: 20,
      },

      /* ===============================================
         PUMP INFORMATION
      =============================================== */

      pumpName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      companyName: {
        type: String,
        default: "",
        trim: true,
        maxlength: 150,
      },

      dealerCode: {
        type: String,
        default: "",
        trim: true,
        maxlength: 100,
      },

      gstin: {
        type: String,
        default: "",
        trim: true,
        uppercase: true,
        maxlength: 20,
      },

      address: {
        type: String,
        default: "",
        trim: true,
        maxlength: 500,
      },

      city: {
        type: String,
        default: "",
        trim: true,
        maxlength: 100,
      },

      state: {
        type: String,
        default: "",
        trim: true,
        maxlength: 100,
      },

      pincode: {
        type: String,
        default: "",
        trim: true,
        maxlength: 10,
      },

      /* ===============================================
         PLAN
      =============================================== */

      plan: {
        type: String,
        default: "standard",
        trim: true,
        enum: [
          "standard",
          "premium",
          "enterprise",
        ],
      },

      notes: {
        type: String,
        default: "",
        trim: true,
        maxlength: 1000,
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
        maxlength: 1000,
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

/*
 * Helps find requests by email and status.
 */

registrationRequestSchema.index({
  email: 1,
  status: 1,
});

/*
 * Helps super-admin request listing.
 */

registrationRequestSchema.index({
  status: 1,
  createdAt: -1,
});

/*
 * Helps newest-first queries.
 */

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