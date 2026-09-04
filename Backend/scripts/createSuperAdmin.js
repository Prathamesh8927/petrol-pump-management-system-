import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const email =
      process.env.SUPERADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    const password =
      process.env.SUPERADMIN_PASSWORD;

    const name =
      process.env.SUPERADMIN_NAME ||
      "Super Admin";

    if (!email || !password) {
      throw new Error(
        "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required"
      );
    }

    let user =
      await User.findOne({
        email,
      });

    if (user) {
      user.name = name;
      user.password = password;
      user.role = "superadmin";
      user.active = true;

      user.pumpId = undefined;

      await user.save();

      console.log(
        "SUPER ADMIN UPDATED"
      );
    } else {
      user =
        await User.create({
          name,
          email,
          password,
          role: "superadmin",
          active: true,
        });

      console.log(
        "SUPER ADMIN CREATED"
      );
    }

    console.log(
      "--------------------------------"
    );

    console.log(
      "Email:",
      user.email
    );

    console.log(
      "Role:",
      user.role
    );

    console.log(
      "Active:",
      user.active
    );

    console.log(
      "--------------------------------"
    );

    await mongoose.connection.close();

    process.exit(0);

  } catch (error) {
    console.error(
      "SUPER ADMIN ERROR:",
      error
    );

    await mongoose.connection.close();

    process.exit(1);
  }
};

createSuperAdmin();