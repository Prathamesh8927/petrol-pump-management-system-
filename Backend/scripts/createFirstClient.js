import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import connectDB from "../config/db.js";
import Pump from "../models/Pump.js";
import User from "../models/User.js";

dotenv.config();

const createFirstClient = async () => {
  try {
    await connectDB();

    const existingUser = await User.findOne({
      email: "owner@pump.com",
    });

    if (existingUser) {
      console.log("Client already exists.");
      process.exit(0);
    }

    const pump = await Pump.create({
      pumpName: "My Petrol Pump",
      ownerName: "Pump Owner",
      phone: "9999999999",
      address: "Maharashtra",
      status: "active",
    });

    const hashedPassword = await bcrypt.hash(
      "12345678",
      10
    );

    const user = await User.create({
      name: "Pump Owner",

      email: "owner@pump.com",

      password: hashedPassword,

      role: "owner",

      pumpId: pump._id,
    });

    console.log("Client 1 created successfully.");

    console.log("Pump:", pump.pumpName);

    console.log("Email:", user.email);

    console.log("Password: 12345678");

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
};

createFirstClient();