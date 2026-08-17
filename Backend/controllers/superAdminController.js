import crypto from "crypto";

import Client from "../models/Client.js";

import Pump from "../models/Pump.js";

import User from "../models/User.js";

/* =====================================================
   HELPERS
===================================================== */

const normalizeEmail = (
  email
) =>
  String(
    email || ""
  )
    .trim()
    .toLowerCase();

/* =====================================================
   TEMPORARY PASSWORD
===================================================== */

const generateTemporaryPassword =
  () => {
    /*
      Example:
      Mp@A72B91C

      More than 6 characters,
      compatible with your User schema.
    */

    const random =
      crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();

    return `Mp@${random}`;
  };

/* =====================================================
   UNIQUE PUMP CODE
===================================================== */

const generatePumpCode =
  async () => {
    /*
      Example:
      PUMP0001
      PUMP0002
    */

    let number =
      (await Client.countDocuments()) +
      1;

    while (true) {
      const code =
        `PUMP${String(
          number
        ).padStart(
          4,
          "0"
        )}`;

      const exists =
        await Client.exists({
          pumpCode:
            code,
        });

      if (!exists) {
        return code;
      }

      number += 1;
    }
  };

/* =====================================================
   GET ALL CLIENTS
===================================================== */

export const getClients =
  async (req, res) => {
    try {
      const clients =
        await Client.find()
          .populate(
            "pumpId",
            "pumpName ownerName phone email active"
          )
          .populate(
            "ownerUserId",
            "name email role active"
          )
          .sort({
            createdAt: -1,
          });

      return res
        .status(200)
        .json({
          success: true,

          count:
            clients.length,

          clients,
        });
    } catch (error) {
      console.error(
        "GET SUPERADMIN CLIENTS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load clients",
        });
    }
  };

/* =====================================================
   GET CLIENT
===================================================== */

export const getClientById =
  async (req, res) => {
    try {
      const client =
        await Client.findById(
          req.params.id
        )
          .populate(
            "pumpId"
          )
          .populate(
            "ownerUserId",
            "-password"
          );

      if (!client) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Client not found",
          });
      }

      return res.json({
        success: true,

        client,
      });
    } catch (error) {
      console.error(
        "GET CLIENT ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load client",
        });
    }
  };

/* =====================================================
   CREATE CLIENT + PUMP + OWNER USER
===================================================== */

export const addClient =
  async (req, res) => {
    let createdPump =
      null;

    let createdUser =
      null;

    try {
      const {
        pumpName,
        ownerName,
        email,
        phone,
        address,
        companyName,
        dealerCode,
        gstin,
        city,
        state,
        pincode,
        plan,
        subscriptionStart,
        subscriptionEnd,
        notes,
      } = req.body;

      /* =================================================
         VALIDATION
      ================================================= */

      if (
        !pumpName?.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Pump name is required",
          });
      }

      if (
        !ownerName?.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Owner name is required",
          });
      }

      const normalizedEmail =
        normalizeEmail(
          email
        );

      if (!normalizedEmail) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Owner email is required",
          });
      }

      /* =================================================
         DUPLICATE USER
      ================================================= */

      const existingUser =
        await User.findOne({
          email:
            normalizedEmail,
        });

      if (existingUser) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              "A user with this email already exists",
          });
      }

      /* =================================================
         DUPLICATE CLIENT
      ================================================= */

      const existingClient =
        await Client.findOne({
          email:
            normalizedEmail,
        });

      if (existingClient) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              "A client with this email already exists",
          });
      }

      /* =================================================
         CREATE PUMP
      ================================================= */

      createdPump =
        await Pump.create({
          pumpName:
            pumpName.trim(),

          ownerName:
            ownerName.trim(),

          phone:
            phone?.trim() ||
            "",

          email:
            normalizedEmail,

          companyName:
            companyName?.trim() ||
            "",

          dealerCode:
            dealerCode?.trim() ||
            "",

          gstin:
            gstin?.trim() ||
            "",

          address:
            address?.trim() ||
            "",

          city:
            city?.trim() ||
            "",

          state:
            state?.trim() ||
            "",

          pincode:
            pincode?.trim() ||
            "",

          active:
            true,
        });

      /* =================================================
         GENERATE OWNER PASSWORD
      ================================================= */

      const temporaryPassword =
        generateTemporaryPassword();

      /* =================================================
         CREATE OWNER

         User.js hashes password automatically.
      ================================================= */

      createdUser =
        await User.create({
          name:
            ownerName.trim(),

          email:
            normalizedEmail,

          password:
            temporaryPassword,

          role:
            "owner",

          pumpId:
            createdPump._id,

          active:
            true,
        });

      /* =================================================
         PUMP CODE
      ================================================= */

      const pumpCode =
        await generatePumpCode();

      /* =================================================
         CREATE CLIENT
      ================================================= */

      const client =
        await Client.create({
          pumpId:
            createdPump._id,

          ownerUserId:
            createdUser._id,

          pumpName:
            pumpName.trim(),

          ownerName:
            ownerName.trim(),

          email:
            normalizedEmail,

          phone:
            phone?.trim() ||
            "",

          address:
            address?.trim() ||
            "",

          pumpCode,

          plan:
            plan ||
            "standard",

          status:
            "active",

          subscriptionStart:
            subscriptionStart ||
            new Date(),

          subscriptionEnd:
            subscriptionEnd ||
            null,

          notes:
            notes?.trim() ||
            "",

          createdBy:
            req.user?._id ||
            null,
        });

      /* =================================================
         RESPONSE

         Temporary password is returned ONLY here.
         It is never stored in plain text.
      ================================================= */

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Client, pump and owner account created successfully",

          client,

          credentials: {
            email:
              normalizedEmail,

            password:
              temporaryPassword,

            role:
              "owner",

            pumpCode,
          },
        });
    } catch (error) {
      console.error(
        "ADD SUPERADMIN CLIENT ERROR:",
        error
      );

      /*
        If something fails after the
        Pump/User was created, roll back
        the partial data.
      */

      try {
        if (
          createdUser?._id
        ) {
          await User.findByIdAndDelete(
            createdUser._id
          );
        }

        if (
          createdPump?._id
        ) {
          await Pump.findByIdAndDelete(
            createdPump._id
          );
        }
      } catch (
        rollbackError
      ) {
        console.error(
          "CLIENT CREATION ROLLBACK ERROR:",
          rollbackError
        );
      }

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to create client",

          error:
            error.message,
        });
    }
  };

/* =====================================================
   UPDATE CLIENT
===================================================== */

export const updateClient =
  async (req, res) => {
    try {
      const client =
        await Client.findById(
          req.params.id
        );

      if (!client) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Client not found",
          });
      }

      const {
        pumpName,
        ownerName,
        email,
        phone,
        address,
        companyName,
        dealerCode,
        gstin,
        city,
        state,
        pincode,
        plan,
        status,
        subscriptionStart,
        subscriptionEnd,
        notes,
      } = req.body;

      const pump =
        await Pump.findById(
          client.pumpId
        );

      const owner =
        await User.findById(
          client.ownerUserId
        );

      /* =================================================
         EMAIL DUPLICATE CHECK
      ================================================= */

      if (
        email !== undefined
      ) {
        const normalizedEmail =
          normalizeEmail(
            email
          );

        const duplicateUser =
          await User.findOne({
            email:
              normalizedEmail,

            _id: {
              $ne:
                client.ownerUserId,
            },
          });

        if (
          duplicateUser
        ) {
          return res
            .status(409)
            .json({
              success:
                false,

              message:
                "Another user already uses this email",
            });
        }

        client.email =
          normalizedEmail;

        if (pump) {
          pump.email =
            normalizedEmail;
        }

        if (owner) {
          owner.email =
            normalizedEmail;
        }
      }

      /* =================================================
         UPDATE CLIENT
      ================================================= */

      if (
        pumpName !==
        undefined
      ) {
        client.pumpName =
          pumpName;

        if (pump) {
          pump.pumpName =
            pumpName;
        }
      }

      if (
        ownerName !==
        undefined
      ) {
        client.ownerName =
          ownerName;

        if (pump) {
          pump.ownerName =
            ownerName;
        }

        if (owner) {
          owner.name =
            ownerName;
        }
      }

      if (
        phone !==
        undefined
      ) {
        client.phone =
          phone;

        if (pump) {
          pump.phone =
            phone;
        }
      }

      if (
        address !==
        undefined
      ) {
        client.address =
          address;

        if (pump) {
          pump.address =
            address;
        }
      }

      if (
        plan !==
        undefined
      ) {
        client.plan =
          plan;
      }

      if (
        subscriptionStart !==
        undefined
      ) {
        client.subscriptionStart =
          subscriptionStart ||
          null;
      }

      if (
        subscriptionEnd !==
        undefined
      ) {
        client.subscriptionEnd =
          subscriptionEnd ||
          null;
      }

      if (
        notes !==
        undefined
      ) {
        client.notes =
          notes;
      }

      /* =================================================
         EXTRA PUMP SETTINGS
      ================================================= */

      if (pump) {
        if (
          companyName !==
          undefined
        ) {
          pump.companyName =
            companyName;
        }

        if (
          dealerCode !==
          undefined
        ) {
          pump.dealerCode =
            dealerCode;
        }

        if (
          gstin !==
          undefined
        ) {
          pump.gstin =
            gstin;
        }

        if (
          city !==
          undefined
        ) {
          pump.city =
            city;
        }

        if (
          state !==
          undefined
        ) {
          pump.state =
            state;
        }

        if (
          pincode !==
          undefined
        ) {
          pump.pincode =
            pincode;
        }
      }

      /* =================================================
         STATUS SYNCHRONIZATION
      ================================================= */

      if (
        status !==
        undefined
      ) {
        client.status =
          status;

        const active =
          status ===
          "active";

        if (pump) {
          pump.active =
            active;
        }

        if (owner) {
          owner.active =
            active;
        }
      }

      /* =================================================
         SAVE ALL
      ================================================= */

      await Promise.all([
        client.save(),

        pump
          ? pump.save()
          : Promise.resolve(),

        owner
          ? owner.save()
          : Promise.resolve(),
      ]);

      return res.json({
        success: true,

        message:
          "Client updated successfully",

        client,
      });
    } catch (error) {
      console.error(
        "UPDATE CLIENT ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to update client",

          error:
            error.message,
        });
    }
  };

/* =====================================================
   UPDATE CLIENT STATUS
===================================================== */

export const updateClientStatus =
  async (req, res) => {
    try {
      const {
        status,
      } = req.body;

      if (
        ![
          "active",
          "inactive",
          "expired",
        ].includes(status)
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid status",
          });
      }

      const client =
        await Client.findById(
          req.params.id
        );

      if (!client) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Client not found",
          });
      }

      client.status =
        status;

      const active =
        status ===
        "active";

      await Promise.all([
        client.save(),

        Pump.findByIdAndUpdate(
          client.pumpId,

          {
            active,
          }
        ),

        User.findByIdAndUpdate(
          client.ownerUserId,

          {
            active,
          }
        ),
      ]);

      return res.json({
        success: true,

        message:
          active
            ? "Client activated"
            : "Client deactivated",

        client,
      });
    } catch (error) {
      console.error(
        "UPDATE CLIENT STATUS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to update client status",
        });
    }
  };

/* =====================================================
   DELETE CLIENT
===================================================== */

export const deleteClient =
  async (req, res) => {
    try {
      const client =
        await Client.findById(
          req.params.id
        );

      if (!client) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Client not found",
          });
      }

      /*
        IMPORTANT:

        This removes:
        - Client
        - Owner User
        - Pump

        It does NOT automatically delete
        sales, ledger, nozzles, stock, etc.

        For production, deactivation is
        safer than hard deletion.
      */

      await Promise.all([
        User.findByIdAndDelete(
          client.ownerUserId
        ),

        Pump.findByIdAndDelete(
          client.pumpId
        ),

        Client.findByIdAndDelete(
          client._id
        ),
      ]);

      return res.json({
        success: true,

        message:
          "Client deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE CLIENT ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to delete client",
        });
    }
  };

/* =====================================================
   SUPER ADMIN SUMMARY
===================================================== */

export const getSuperAdminSummary =
  async (req, res) => {
    try {
      const [
        totalClients,
        activeClients,
        inactiveClients,
        expiredClients,
      ] =
        await Promise.all([
          Client.countDocuments(),

          Client.countDocuments({
            status:
              "active",
          }),

          Client.countDocuments({
            status:
              "inactive",
          }),

          Client.countDocuments({
            status:
              "expired",
          }),
        ]);

      return res.json({
        success: true,

        summary: {
          totalClients,

          activeClients,

          inactiveClients,

          expiredClients,
        },
      });
    } catch (error) {
      console.error(
        "SUPER ADMIN SUMMARY ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load super admin summary",
        });
    }
  };