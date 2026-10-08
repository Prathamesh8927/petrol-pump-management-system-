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
    },

    /* =====================================================
       PUMP ISOLATION
    ===================================================== */

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      default: null,
    },

    /* =====================================================
       EMPLOYEE LINK
    ===================================================== */

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    /* =====================================================
       ACCOUNT STATUS
    ===================================================== */

    active: {
      type: Boolean,
      default: true,
    },

    /* =====================================================
       SESSION SECURITY
       
       Included in JWTs.

       Incrementing this value invalidates previously
       issued JWTs when the authentication middleware
       checks the token version.
    ===================================================== */

    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    /* =====================================================
       PASSWORD SECURITY AUDIT
    ===================================================== */

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

/* =========================================================
   INDEXES
========================================================= */

/*
 * 1. EMAIL
 *
 * `unique: true` already creates the required unique index.
 *
 * No separate `index: true` is necessary.
 */
userSchema.index(
  {
    email: 1,
  },
  {
    unique: true,
    name: "uniq_user_email",
  }
);

/*
 * 2. EMPLOYEE LINK
 *
 * One User can be linked to one Employee.
 *
 * sparse is important because:
 *
 * - superadmin may have no employeeId
 * - owner may have no employeeId
 * - manager may have no employeeId
 * - staff may have no employeeId
 *
 * Multiple null/missing values are therefore allowed.
 */
userSchema.index(
  {
    employeeId: 1,
  },
  {
    unique: true,
    sparse: true,
    name: "uniq_user_employee",
  }
);

/*
 * 3. PUMP + ACTIVE
 *
 * Useful for pump-specific user management:
 *
 * User.find({
 *   pumpId,
 *   active: true
 * })
 *
 * This is especially useful for your employee/user
 * management screens.
 */
userSchema.index(
  {
    pumpId: 1,
    active: 1,
  },
  {
    name: "idx_user_pump_active",
  }
);

/*
 * 4. PUMP + ROLE
 *
 * Useful for RBAC/user management queries such as:
 *
 * - owners of a pump
 * - managers of a pump
 * - staff of a pump
 * - employees of a pump
 */
userSchema.index(
  {
    pumpId: 1,
    role: 1,
  },
  {
    name: "idx_user_pump_role",
  }
);

/*
 * 5. PUMP + ROLE + ACTIVE
 *
 * Useful when the application requests active users
 * of a particular role inside a pump.
 */
userSchema.index(
  {
    pumpId: 1,
    role: 1,
    active: 1,
  },
  {
    name: "idx_user_pump_role_active",
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
     * Do nothing when password was not changed.
     *
     * This prevents unrelated user updates from
     * re-hashing an already hashed password.
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
   * Record the time whenever an existing user's
   * password changes.
   *
   * During initial account creation, we leave the
   * explicitly supplied/default value untouched.
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