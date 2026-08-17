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
        type: mongoose.Schema.Types
          .ObjectId,
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

/* HASH PASSWORD */

userSchema.pre(
  "save",
  async function () {
    if (
      !this.isModified(
        "password"
      )
    ) {
      return;
    }

    const salt =
      await bcrypt.genSalt(10);

    this.password =
      await bcrypt.hash(
        this.password,
        salt
      );
  }
);

/* CHECK PASSWORD */

userSchema.methods.matchPassword =
  async function (
    enteredPassword
  ) {
    return bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

const User = mongoose.model(
  "User",
  userSchema
);

export default User;