import User from "../models/User.js";
import Pump from "../models/Pump.js";

import generateToken from "../utils/generateToken.js";

/* =====================================================
   REGISTER OWNER
===================================================== */

export const registerUser =
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        pumpName,
      } = req.body;

      /* ===============================
         VALIDATION
      =============================== */

      if (
        !name ||
        !email ||
        !password ||
        !pumpName
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Name, email, password and pump name are required",
        });
      }

      /* ===============================
         CHECK EMAIL
      =============================== */

      const existingUser =
        await User.findOne({
          email:
            email
              .trim()
              .toLowerCase(),
        });

      if (existingUser) {
        return res.status(409).json({
          success: false,

          message:
            "Email already registered",
        });
      }

      /* ===============================
         CREATE PUMP
      =============================== */

      const pump =
        await Pump.create({
          name:
            pumpName.trim(),

          ownerName:
            name.trim(),
        });

      /* ===============================
         CREATE OWNER
      =============================== */

      const user =
        await User.create({
          name:
            name.trim(),

          email:
            email
              .trim()
              .toLowerCase(),

          password,

          role:
            "owner",

          pumpId:
            pump._id,

          active:
            true,
        });

      const token =
        generateToken(user);

      return res.status(201).json({
        success: true,

        message:
          "Account created successfully",

        token,

        user: {
          _id:
            user._id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,

          pumpId:
            user.pumpId,

          pumpName:
            pump.name,

          active:
            user.active,
        },
      });
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to create account",

        error:
          error.message,
      });
    }
  };

/* =====================================================
   LOGIN USER
===================================================== */

export const loginUser =
  async (req, res) => {
    try {
      const {
        email,
        password,
      } = req.body;

      /* ===============================
         VALIDATION
      =============================== */

      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Email and password are required",
        });
      }

      /* ===============================
         FIND USER
      =============================== */

      const user =
        await User.findOne({
          email:
            email
              .trim()
              .toLowerCase(),
        });

      if (!user) {
        return res.status(401).json({
          success: false,

          message:
            "Invalid email or password",
        });
      }

      /* ===============================
         ACCOUNT STATUS
      =============================== */

      if (
        user.active === false
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Your account is inactive",
        });
      }

      /* ===============================
         PASSWORD
      =============================== */

      const validPassword =
        await user.matchPassword(
          password
        );

      if (!validPassword) {
        return res.status(401).json({
          success: false,

          message:
            "Invalid email or password",
        });
      }

      /* ===============================
         LOAD PUMP
      =============================== */

      let pump = null;

      if (user.pumpId) {
        pump =
          await Pump.findById(
            user.pumpId
          );
      }

      /* ===============================
         GENERATE NEW TOKEN
      =============================== */

      const token =
        generateToken(user);

      return res.status(200).json({
        success: true,

        message:
          "Login successful",

        token,

        user: {
          _id:
            user._id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,

          pumpId:
            user.pumpId,

          pumpName:
            pump?.name ||
            "My Petrol Pump",

          active:
            user.active !==
            false,
        },
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to login",

        error:
          error.message,
      });
    }
  };

/* =====================================================
   CURRENT USER
===================================================== */

export const getMe =
  async (req, res) => {
    try {
      let pump =
        null;

      if (
        req.user.pumpId
      ) {
        pump =
          await Pump.findById(
            req.user.pumpId
          );
      }

      return res.status(200).json({
        success: true,

        user: {
          _id:
            req.user._id,

          name:
            req.user.name,

          email:
            req.user.email,

          role:
            req.user.role,

          pumpId:
            req.user.pumpId,

          pumpName:
            pump?.name ||
            "My Petrol Pump",

          active:
            req.user.active !==
            false,
        },
      });
    } catch (error) {
      console.error(
        "GET ME ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load user",
      });
    }
  };