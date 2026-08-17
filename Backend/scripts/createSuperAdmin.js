import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../models/User.js";

dotenv.config();

/* =====================================================
   DATABASE URI
===================================================== */

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL;

if (!MONGO_URI) {
  console.error(
    "MongoDB URI not found in .env"
  );

  process.exit(1);
}

/* =====================================================
   SUPER ADMIN DETAILS
===================================================== */

const SUPERADMIN_NAME =
  process.env.SUPERADMIN_NAME ||
  "MyPump Super Admin";

const SUPERADMIN_EMAIL =
  (
    process.env.SUPERADMIN_EMAIL ||
    "superadmin@mypump.com"
  )
    .trim()
    .toLowerCase();

const SUPERADMIN_PASSWORD =
  process.env.SUPERADMIN_PASSWORD ||
  "Admin@123456";

/* =====================================================
   CREATE / UPDATE SUPER ADMIN
===================================================== */

const createSuperAdmin =
  async () => {
    try {
      /* ===============================================
         CONNECT DATABASE
      =============================================== */

      await mongoose.connect(
        MONGO_URI
      );

      console.log(
        "MongoDB connected"
      );

      /* ===============================================
         CHECK EXISTING USER
      =============================================== */

      let user =
        await User.findOne({
          email:
            SUPERADMIN_EMAIL,
        });

      /* ===============================================
         UPDATE EXISTING USER
      =============================================== */

      if (user) {
        console.log(
          "Existing user found:",
          user.email
        );

        user.name =
          SUPERADMIN_NAME;

        user.role =
          "superadmin";

        user.active =
          true;

        /*
          Superadmin does not require pumpId.
        */

        user.pumpId =
          undefined;

        /*
          Set password again.
          User.js will hash it automatically.
        */

        user.password =
          SUPERADMIN_PASSWORD;

        await user.save();

        console.log(
          "Super Admin updated successfully"
        );
      }

      /* ===============================================
         CREATE NEW USER
      =============================================== */

      else {
        user =
          await User.create({
            name:
              SUPERADMIN_NAME,

            email:
              SUPERADMIN_EMAIL,

            password:
              SUPERADMIN_PASSWORD,

            role:
              "superadmin",

            active:
              true,
          });

        console.log(
          "Super Admin created successfully"
        );
      }

      /* ===============================================
         RESULT
      =============================================== */

      console.log(
        "----------------------------------"
      );

      console.log(
        "SUPER ADMIN LOGIN"
      );

      console.log(
        "Email:",
        SUPERADMIN_EMAIL
      );

      console.log(
        "Password:",
        SUPERADMIN_PASSWORD
      );

      console.log(
        "Role:",
        user.role
      );

      console.log(
        "User ID:",
        user._id.toString()
      );

      console.log(
        "----------------------------------"
      );
    } catch (error) {
      console.error(
        "CREATE SUPER ADMIN ERROR:",
        error
      );

      process.exitCode = 1;
    } finally {
      await mongoose.connection.close();

      console.log(
        "MongoDB connection closed"
      );
    }
  };

createSuperAdmin();