import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // =====================================================
    // BASIC USER INFORMATION
    // =====================================================

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 128,
      select: false,
    },

    // =====================================================
    // ROLE
    // =====================================================

    role: {
      type: String,
      enum: [
        "superadmin",
        "owner",
        "manager",
        "staff",
        "employee",
      ],
      default: "staff",
    },

    // =====================================================
    // PUMP ISOLATION
    // =====================================================

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      default: null,
    },

    // =====================================================
    // EMPLOYEE LINK
    // =====================================================

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    // =====================================================
    // ACCOUNT STATUS
    // =====================================================

    active: {
      type: Boolean,
      default: true,
    },

    // =====================================================
    // SESSION SECURITY
    // =====================================================

    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    // =====================================================
    // PASSWORD SECURITY AUDIT
    // =====================================================

    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// =====================================================
// INDEXES
// =====================================================

// Email uniqueness
userSchema.index(
  { email: 1 },
  {
    unique: true,
    name: "uniq_user_email",
  }
);

// One User per Employee link
userSchema.index(
  { employeeId: 1 },
  {
    unique: true,
    sparse: true,
    name: "uniq_user_employee",
  }
);

// Pump + active status
userSchema.index(
  { pumpId: 1, active: 1 },
  {
    name: "idx_user_pump_active",
  }
);

// Pump + role
userSchema.index(
  { pumpId: 1, role: 1 },
  {
    name: "idx_user_pump_role",
  }
);

// Pump + role + active status
userSchema.index(
  { pumpId: 1, role: 1, active: 1 },
  {
    name: "idx_user_pump_role_active",
  }
);

// =====================================================
// PASSWORD HASH DETECTION
// =====================================================

const isBcryptHash = (value) => {
  return (
    typeof value === "string" &&
    /^\$2[aby]\$\d{2}\$/.test(value)
  );
};

// =====================================================
// PASSWORD HASHING
// =====================================================

// Use promise-based middleware.
// Do not use next() in this async pre-save hook.
userSchema.pre("save", async function () {
  // Do not hash an unchanged password.
  if (!this.isModified("password")) {
    return;
  }

  // RegistrationRequest already stores a bcrypt hash.
  // Prevent double-hashing during registration approval.
  if (isBcryptHash(this.password)) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

// =====================================================
// PASSWORD CHANGE TRACKING
// =====================================================

// Track password changes for existing users.
userSchema.pre("save", function () {
  if (this.isModified("password") && !this.isNew) {
    this.passwordChangedAt = new Date();
  }
});

// =====================================================
// MODEL
// =====================================================

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;