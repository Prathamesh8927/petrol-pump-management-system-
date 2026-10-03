import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    /* =====================================================
       BASIC USER INFORMATION
    ===================================================== */

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
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 128,
      select: false,
    },

    /* =====================================================
       ROLE
    ===================================================== */

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
      index: true,
    },

    /* =====================================================
       PUMP ISOLATION
    ===================================================== */

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      default: null,
      index: true,
    },

    /* =====================================================
       EMPLOYEE LINK
    ===================================================== */

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
      unique: true,
      sparse: true,
    },

    /* =====================================================
       ACCOUNT STATUS
    ===================================================== */

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    /* =====================================================
       SESSION SECURITY
       
       tokenVersion is included in JWTs.

       When incremented:
       all previously issued JWTs become invalid.

       This is used for:
       - password reset
       - logout-all
       - forced session revocation
       - security incidents
    ===================================================== */

    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    /* =====================================================
       PASSWORD SECURITY AUDIT

       Records the last successful password change.

       This does not contain the password or any secret.
    ===================================================== */

    passwordChangedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

/* =========================================================
   PASSWORD HASH DETECTION
========================================================= */

const isBcryptHash = (value) => {
  return (
    typeof value === "string" &&
    /^\$2[aby]\$\d{2}\$/.test(value)
  );
};

/* =========================================================
   PASSWORD HASHING
========================================================= */

userSchema.pre("save", async function (next) {
  try {
    /*
     * Only hash when the password was actually changed.
     *
     * This prevents already-hashed passwords from being
     * hashed again during unrelated user updates.
     */
    if (
      !this.isModified("password") ||
      isBcryptHash(this.password)
    ) {
      return next();
    }

    this.password = await bcrypt.hash(
      this.password,
      12
    );

    return next();
  } catch (error) {
    return next(error);
  }
});

/* =========================================================
   PASSWORD CHANGE TRACKING
========================================================= */

userSchema.pre("save", function (next) {
  /*
   * Whenever the password changes through a normal
   * document save, record the change time.
   *
   * If passwordChangedAt was explicitly supplied during
   * creation, preserve it.
   */
  if (
    this.isModified("password") &&
    !this.isNew
  ) {
    this.passwordChangedAt = new Date();
  }

  return next();
});

/* =========================================================
   MODEL
========================================================= */

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;