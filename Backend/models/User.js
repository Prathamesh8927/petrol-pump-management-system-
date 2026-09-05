import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },

      password: {
        type: String,
        required: true,
        minlength: 6,
        select: false,
      },

      role: {
        type: String,
        enum: [
          "superadmin",
          "owner",
          "manager",
          "staff",
        ],
        default: "owner",
      },

      pumpId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        required: function () {
          return (
            this.role !==
            "superadmin"
          );
        },
      },

      active: {
        type: Boolean,
        default: true,
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

  return /^\$2[aby]\$\d{2}\$/.test(
    value
  );
};

/* =====================================================
   HASH PASSWORD
===================================================== */

userSchema.pre(
  "save",
  async function (next) {
    try {
      if (
        !this.isModified(
          "password"
        )
      ) {
        return next();
      }

      /*
       * IMPORTANT:
       * RegistrationRequest already stores
       * a bcrypt hash.
       *
       * This prevents double hashing when
       * Superadmin approves a request.
       */

      if (
        isBcryptHash(
          this.password
        )
      ) {
        return next();
      }

      const salt =
        await bcrypt.genSalt(12);

      this.password =
        await bcrypt.hash(
          this.password,
          salt
        );

      next();
    } catch (error) {
      next(error);
    }
  }
);

/* =====================================================
   CHECK PASSWORD
===================================================== */

userSchema.methods.matchPassword =
  async function (
    enteredPassword
  ) {
    if (
      !this.password ||
      !enteredPassword
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
  mongoose.model(
    "User",
    userSchema
  );

export default User;