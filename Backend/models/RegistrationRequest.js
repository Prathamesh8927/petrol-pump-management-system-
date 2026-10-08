import mongoose from "mongoose";

/* =========================================================
   REGISTRATION REQUEST SCHEMA
========================================================= */

const registrationRequestSchema = new mongoose.Schema(
  {
    /* =====================================================
       APPLICANT INFORMATION
    ===================================================== */

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
     * This field contains a bcrypt HASH.
     *
     * Plaintext passwords must NEVER be stored.
     *
     * The registration controller is responsible for
     * hashing the password before creating this document.
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

    /* =====================================================
       PUMP INFORMATION
    ===================================================== */

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

    /* =====================================================
       PLAN
    ===================================================== */

    plan: {
      type: String,
      default: "standard",
      trim: true,
      lowercase: true,
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

    /* =====================================================
       REQUEST STATUS
    ===================================================== */

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
      ],
      default: "pending",
    },

    /* =====================================================
       APPROVAL ACTION
    ===================================================== */

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    /* =====================================================
       REJECTION ACTION
    ===================================================== */

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

    /* =====================================================
       CREATED RECORD REFERENCES
    ===================================================== */

    /*
     * These fields point to records created after an
     * approval.
     *
     * They are intentionally not unique because one
     * registration request itself may be processed only
     * once by application logic, while these references
     * represent relationships rather than unique
     * identifiers.
     */
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
    strict: true,
  }
);

/* =========================================================
   INDEXES
========================================================= */

/*
 * 1. EMAIL + STATUS
 *
 * Useful for:
 *
 * - checking whether an email has a pending request
 * - finding previous requests from an applicant
 */
registrationRequestSchema.index(
  {
    email: 1,
    status: 1,
  },
  {
    name: "idx_registration_email_status",
  }
);

/*
 * 2. STATUS + CREATED
 *
 * Main SuperAdmin request-management query.
 *
 * Example:
 *
 * pending registrations, newest first.
 */
registrationRequestSchema.index(
  {
    status: 1,
    createdAt: -1,
  },
  {
    name: "idx_registration_status_created",
  }
);

/*
 * 3. CREATED
 *
 * Useful for displaying all registration requests
 * chronologically regardless of status.
 */
registrationRequestSchema.index(
  {
    createdAt: -1,
  },
  {
    name: "idx_registration_created",
  }
);

/*
 * 4. CREATED PUMP
 *
 * Useful for locating the pump created from
 * a registration request.
 */
registrationRequestSchema.index(
  {
    createdPumpId: 1,
  },
  {
    name: "idx_registration_created_pump",
    sparse: true,
  }
);

/*
 * 5. CREATED USER
 *
 * Useful for locating the User created from
 * a registration request.
 */
registrationRequestSchema.index(
  {
    createdUserId: 1,
  },
  {
    name: "idx_registration_created_user",
    sparse: true,
  }
);

/*
 * 6. CREATED CLIENT
 *
 * Useful if the registration workflow creates
 * a Client document.
 */
registrationRequestSchema.index(
  {
    createdClientId: 1,
  },
  {
    name: "idx_registration_created_client",
    sparse: true,
  }
);

/* =========================================================
   MODEL
========================================================= */

const RegistrationRequest =
  mongoose.models.RegistrationRequest ||
  mongoose.model(
    "RegistrationRequest",
    registrationRequestSchema
  );

export default RegistrationRequest;