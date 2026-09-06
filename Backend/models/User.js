import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/* =====================================================
   USER SCHEMA
===================================================== */

const userSchema = new mongoose.Schema(
  {
    /* -----------------------------------------------
       NAME
    ------------------------------------------------ */

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    /* -----------------------------------------------
       EMAIL
    ------------------------------------------------ */

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    /* -----------------------------------------------
       PASSWORD
    ------------------------------------------------ */

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    /* -----------------------------------------------
       ROLE
    ------------------------------------------------ */

    role: {
      type: String,
      enum: [
        "superadmin",
        "owner",
        "manager",
        "staff",
      ],
      default: "owner",
      index: true,
    },

    /* -----------------------------------------------
       PUMP
       
       Superadmin:
       pumpId = null / undefined

       Owner / Manager / Staff:
       pumpId is required
    ------------------------------------------------ */

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: function () {
        return this.role !== "superadmin";
      },
      index: true,
    },

    /* -----------------------------------------------
       ACCOUNT STATUS
    ------------------------------------------------ */

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   DETECT BCRYPT HASH
===================================================== */

const isBcryptHash = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  return /^\$2[aby]\$\d{2}\$/.test(value);
};

/* =====================================================
   HASH PASSWORD
===================================================== */

/*
 * IMPORTANT:
 *
 * RegistrationRequest stores an already-hashed password.
 *
 * When Super Admin approves the request, that hash can
 * be assigned to User.
 *
 * Therefore we must NOT hash an existing bcrypt hash
 * again.
 */

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  if (isBcryptHash(this.password)) {
    return;
  }

  const salt = await bcrypt.genSalt(12);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );
});

/* =====================================================
   CHECK PASSWORD
===================================================== */

userSchema.methods.matchPassword = async function (
  enteredPassword
) {
  if (
    typeof enteredPassword !== "string" ||
    !enteredPassword ||
    !this.password
  ) {
    return false;
  }

  return bcrypt.compare(
    enteredPassword,
    this.password
  );
};

/* =====================================================
   MODEL
===================================================== */

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;