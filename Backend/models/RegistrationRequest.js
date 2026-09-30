import mongoose from "mongoose";

/* =====================================================
   REGISTRATION REQUEST SCHEMA
===================================================== */

const registrationRequestSchema = new mongoose.Schema(
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
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Please provide a valid email address",
      },
    },

    /*
     * IMPORTANT:
     *
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
      maxlength: 30,
    },

    /* ===============================================
       PUMP INFORMATION
    =============================================== */

    pumpName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
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
      lowercase: true,
      enum: ["standard", "premium", "enterprise"],
      index: true,
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
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    /* ===============================================
       APPROVAL ACTION
    =============================================== */

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    /* ===============================================
       REJECTION ACTION
    =============================================== */

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    rejectedAt: {
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

    /*
     * These fields intentionally use field-level indexes.
     *
     * DO NOT create additional schema.index()
     * declarations for these same fields.
     */

    createdPumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      default: null,
      index: true,
    },

    createdUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    createdClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

/* =====================================================
   COMPOUND / QUERY INDEXES
===================================================== */

/*
 * Find requests by email and status.
 */
registrationRequestSchema.index({
  email: 1,
  status: 1,
});

/*
 * Superadmin pending/previous request listing.
 */
registrationRequestSchema.index({
  status: 1,
  createdAt: -1,
});

/*
 * Newest requests first.
 */
registrationRequestSchema.index({
  createdAt: -1,
});

/*
 * IMPORTANT:
 *
 * No additional indexes are created for:
 *
 * createdPumpId
 * createdUserId
 * createdClientId
 *
 * because those fields already use:
 *
 * index: true
 *
 * in their field definitions.
 */

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