import mongoose from "mongoose";
import dotenv from "dotenv";

import Pump from "../models/Pump.js";
import User from "../models/User.js";
import Client from "../models/Client.js";

dotenv.config();

/* =====================================================
   DATABASE
===================================================== */

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL;

/* =====================================================
   EXISTING OWNER EMAIL

   Add this to Backend/.env:

   EXISTING_OWNER_EMAIL=your-old-owner-email@gmail.com
===================================================== */

const OWNER_EMAIL =
  String(
    process.env.EXISTING_OWNER_EMAIL ||
      ""
  )
    .trim()
    .toLowerCase();

/* =====================================================
   SHOW AVAILABLE OWNERS
===================================================== */

const showAvailableOwners =
  async () => {
    const owners =
      await User.find(
        {
          role: "owner",
        },
        {
          name: 1,
          email: 1,
          role: 1,
          pumpId: 1,
          active: 1,
        }
      ).lean();

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "AVAILABLE OWNER ACCOUNTS"
    );
    console.log(
      "======================================"
    );

    if (!owners.length) {
      console.log(
        "No owner users found."
      );

      return;
    }

    owners.forEach(
      (owner, index) => {
        console.log(
          `${index + 1}. ${owner.name}`
        );

        console.log(
          "   Email:",
          owner.email
        );

        console.log(
          "   Pump ID:",
          owner.pumpId
            ? owner.pumpId.toString()
            : "NOT ASSIGNED"
        );

        console.log(
          "   Active:",
          owner.active
        );

        console.log("");
      }
    );
  };

/* =====================================================
   GENERATE UNIQUE PUMP CODE
===================================================== */

const generatePumpCode =
  async () => {
    let number =
      (await Client.countDocuments()) +
      1;

    while (true) {
      const code =
        `PUMP${String(
          number
        ).padStart(4, "0")}`;

      const exists =
        await Client.exists({
          pumpCode: code,
        });

      if (!exists) {
        return code;
      }

      number += 1;
    }
  };

/* =====================================================
   MIGRATE EXISTING PUMP
===================================================== */

const addExistingPumpAsClient =
  async () => {
    try {
      /* ===============================================
         DATABASE URI CHECK
      =============================================== */

      if (!MONGO_URI) {
        throw new Error(
          "MongoDB URI not found in .env"
        );
      }

      /* ===============================================
         CONNECT
      =============================================== */

      await mongoose.connect(
        MONGO_URI
      );

      console.log(
        "MongoDB connected"
      );

      /* ===============================================
         EMAIL CHECK
      =============================================== */

      if (!OWNER_EMAIL) {
        console.log("");
        console.log(
          "EXISTING_OWNER_EMAIL is not set in .env"
        );

        await showAvailableOwners();

        console.log(
          "Add one of the emails above to Backend/.env:"
        );

        console.log(
          "EXISTING_OWNER_EMAIL=owner@example.com"
        );

        return;
      }

      /* ===============================================
         FIND EXISTING OWNER
      =============================================== */

      const owner =
        await User.findOne({
          email: OWNER_EMAIL,
          role: "owner",
        });

      if (!owner) {
        console.log("");
        console.log(
          `Owner not found: ${OWNER_EMAIL}`
        );

        await showAvailableOwners();

        return;
      }

      console.log("");
      console.log(
        "OWNER FOUND"
      );

      console.log(
        "Name:",
        owner.name
      );

      console.log(
        "Email:",
        owner.email
      );

      console.log(
        "Role:",
        owner.role
      );

      console.log(
        "Pump ID:",
        owner.pumpId
          ? owner.pumpId.toString()
          : "NOT ASSIGNED"
      );

      /* ===============================================
         OWNER MUST HAVE EXISTING PUMP
      =============================================== */

      if (!owner.pumpId) {
        throw new Error(
          "Existing owner has no pumpId. Cannot determine the old pump."
        );
      }

      /* ===============================================
         FIND EXISTING PUMP
      =============================================== */

      const pump =
        await Pump.findById(
          owner.pumpId
        );

      if (!pump) {
        throw new Error(
          `Pump not found for pumpId ${owner.pumpId}`
        );
      }

      console.log("");
      console.log(
        "PUMP FOUND"
      );

      console.log(
        "Pump Name:",
        pump.pumpName ||
          "Unnamed Pump"
      );

      console.log(
        "Pump ID:",
        pump._id.toString()
      );

      /* ===============================================
         CHECK EXISTING CLIENT
      =============================================== */

      const existingClient =
        await Client.findOne({
          $or: [
            {
              pumpId:
                pump._id,
            },
            {
              ownerUserId:
                owner._id,
            },
            {
              email:
                owner.email,
            },
          ],
        });

      if (existingClient) {
        console.log("");
        console.log(
          "======================================"
        );

        console.log(
          "PUMP ALREADY REGISTERED AS CLIENT"
        );

        console.log(
          "======================================"
        );

        console.log(
          "Pump:",
          existingClient.pumpName
        );

        console.log(
          "Owner:",
          existingClient.ownerName
        );

        console.log(
          "Email:",
          existingClient.email
        );

        console.log(
          "Pump Code:",
          existingClient.pumpCode
        );

        console.log(
          "Pump ID:",
          existingClient.pumpId.toString()
        );

        return;
      }

      /* ===============================================
         GENERATE CLIENT CODE
      =============================================== */

      const pumpCode =
        await generatePumpCode();

      /* ===============================================
         CREATE CLIENT ONLY

         IMPORTANT:
         - Existing Pump remains unchanged
         - Existing User remains unchanged
         - Existing pumpId remains unchanged
         - Existing sales/nozzles/ledger remain linked
      =============================================== */

      const client =
        await Client.create({
          pumpId:
            pump._id,

          ownerUserId:
            owner._id,

          pumpName:
            pump.pumpName ||
            "Existing Pump",

          ownerName:
            pump.ownerName ||
            owner.name,

          email:
            owner.email,

          phone:
            pump.phone ||
            "",

          address:
            pump.address ||
            "",

          pumpCode,

          plan:
            "standard",

          status:
            pump.active === false
              ? "inactive"
              : "active",

          subscriptionStart:
            new Date(),

          subscriptionEnd:
            null,

          notes:
            "Existing MyPump petrol pump migrated into Super Admin client management.",
        });

      /* ===============================================
         SUCCESS
      =============================================== */

      console.log("");
      console.log(
        "======================================"
      );

      console.log(
        "EXISTING PUMP ADDED SUCCESSFULLY"
      );

      console.log(
        "======================================"
      );

      console.log(
        "Pump:",
        client.pumpName
      );

      console.log(
        "Owner:",
        client.ownerName
      );

      console.log(
        "Email:",
        client.email
      );

      console.log(
        "Client Code:",
        client.pumpCode
      );

      console.log(
        "Existing Pump ID:",
        client.pumpId.toString()
      );

      console.log(
        "Existing Owner User ID:",
        client.ownerUserId.toString()
      );

      console.log(
        "Status:",
        client.status
      );

      console.log("");
      console.log(
        "Old pump data has NOT been deleted or duplicated."
      );
    } catch (error) {
      console.error("");
      console.error(
        "EXISTING PUMP MIGRATION ERROR:",
        error
      );
    } finally {
      if (
        mongoose.connection.readyState !==
        0
      ) {
        await mongoose.connection.close();

        console.log("");
        console.log(
          "MongoDB connection closed"
        );
      }
    }
  };

addExistingPumpAsClient();