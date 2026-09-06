import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
      select: false,
    },

    role: {
      type: String,
      enum: ["superadmin", "owner", "manager", "staff"],
      default: "owner",
      index: true,
    },

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pump",
      required: function () {
        return this.role !== "superadmin";
      },
      index: true,
    },

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

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  /*
   * Prevent double hashing when an existing bcrypt
   * password hash is assigned to the User document.
   */
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