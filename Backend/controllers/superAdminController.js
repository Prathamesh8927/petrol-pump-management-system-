import mongoose from "mongoose";

import Client from "../models/Client.js";
import Pump from "../models/Pump.js";
import User from "../models/User.js";
import RegistrationRequest from "../models/RegistrationRequest.js";

import {
  createDeletedRecord,
  generateDeletionGroupId,
} from "../services/recoveryService.js";

/* =====================================================
   CONSTANTS
===================================================== */

const ALLOWED_CLIENT_STATUSES = [
  "active",
  "inactive",
  "expired",
];

const ALLOWED_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
];

const ALLOWED_CLIENT_PLANS = [
  "basic",
  "standard",
  "premium",
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/* =====================================================
   HELPERS
===================================================== */

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const normalizeString = (value) =>
  String(value ?? "").trim();

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(
    String(value || "")
  );

const isValidEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (
    !normalizedEmail ||
    normalizedEmail.length > 254
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizedEmail
  );
};

const escapeRegex = (value) =>
  String(value || "").replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

const parsePagination = (query = {}) => {
  const parsedPage = Number.parseInt(
    query.page,
    10
  );

  const parsedLimit = Number.parseInt(
    query.limit,
    10
  );

  const page =
    Number.isInteger(parsedPage) &&
    parsedPage > 0
      ? parsedPage
      : DEFAULT_PAGE;

  const limit =
    Number.isInteger(parsedLimit) &&
    parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

/*
 * Client model supports:
 * basic / standard / premium
 *
 * RegistrationRequest also supports:
 * enterprise
 *
 * Enterprise is mapped to premium because the
 * current Client schema does not contain enterprise.
 */
const normalizeClientPlan = (value) => {
  const plan = normalizeString(value).toLowerCase();

  if (plan === "enterprise") {
    return "premium";
  }

  return ALLOWED_CLIENT_PLANS.includes(plan)
    ? plan
    : "standard";
};

const normalizeClientStatus = (value) =>
  normalizeString(value).toLowerCase();

const normalizeRequestStatus = (value) =>
  normalizeString(value).toLowerCase();

const isValidDateValue = (value) => {
  if (!value) {
    return true;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

/* =====================================================
   UNIQUE PUMP CODE
===================================================== */

/*
 * Pump codes are generated from Client records.
 *
 * Client.pumpCode has a unique database index,
 * which remains the final uniqueness protection.
 */
const generatePumpCode = async (session = null) => {
  let number =
    (await Client.countDocuments(
      {},
      session
        ? { session }
        : undefined
    )) + 1;

  while (true) {
    const code = `PUMP${String(number).padStart(4, "0")}`;

    let query = Client.exists({
      pumpCode: code,
    });

    if (session) {
      query = query.session(session);
    }

    const exists = await query;

    if (!exists) {
      return code;
    }

    number += 1;
  }
};

/* =====================================================
   GET ALL CLIENTS
===================================================== */

export const getClients = async (req, res) => {
  try {
    const {
      page,
      limit,
      skip,
    } = parsePagination(req.query);

    const [
      clients,
      total,
    ] = await Promise.all([
      Client.find()
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
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Client.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      count: clients.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(
        total / limit
      ),
      clients,
    });
  } catch (error) {
    console.error(
      "GET SUPERADMIN CLIENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load clients",
      code: "CLIENT_LIST_ERROR",
    });
  }
};

/* =====================================================
   GET CLIENT
===================================================== */

export const getClientById = async (
  req,
  res
) => {
  try {
    if (
      !isValidObjectId(req.params.id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
        code: "INVALID_CLIENT_ID",
      });
    }

    const client =
      await Client.findById(
        req.params.id
      )
        .populate("pumpId")
        .populate(
          "ownerUserId",
          "-password"
        )
        .lean();

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
        code: "CLIENT_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      client,
    });
  } catch (error) {
    console.error(
      "GET CLIENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load client",
      code: "CLIENT_FETCH_ERROR",
    });
  }
};

/* =====================================================
   CREATE CLIENT + PUMP + OWNER USER
===================================================== */

export const addClient = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    const {
      pumpName,
      ownerName,
      email,
      password,
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
    } = req.body || {};

    /* ===============================================
       VALIDATION
    =============================================== */

    const cleanPumpName =
      normalizeString(pumpName);

    const cleanOwnerName =
      normalizeString(ownerName);

    const normalizedEmail =
      normalizeEmail(email);

    const cleanPassword =
      typeof password === "string"
        ? password
        : "";

    const normalizedPlan =
      normalizeClientPlan(plan);

    if (!cleanPumpName) {
      return res.status(400).json({
        success: false,
        message: "Pump name is required",
      });
    }

    if (!cleanOwnerName) {
      return res.status(400).json({
        success: false,
        message: "Owner name is required",
      });
    }

    if (
      !isValidEmail(
        normalizedEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid owner email",
      });
    }

    if (!cleanPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Client password is required",
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Client password must be at least 6 characters",
      });
    }

    if (cleanPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message:
          "Client password cannot exceed 128 characters",
      });
    }

    if (
      !isValidDateValue(
        subscriptionStart
      ) ||
      !isValidDateValue(
        subscriptionEnd
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid subscription date",
      });
    }

    if (
      subscriptionStart &&
      subscriptionEnd &&
      new Date(subscriptionEnd) <
        new Date(subscriptionStart)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subscription end date cannot be before start date",
      });
    }

    /* ===============================================
       EXISTING USER
    =============================================== */

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      }).select("_id");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
        code: "USER_EXISTS",
      });
    }

    /* ===============================================
       EXISTING CLIENT
    =============================================== */

    const existingClient =
      await Client.findOne({
        email: normalizedEmail,
      }).select("_id");

    if (existingClient) {
      return res.status(409).json({
        success: false,
        message:
          "A client with this email already exists",
        code: "CLIENT_EXISTS",
      });
    }

    let createdClient = null;
    let pumpCode = null;

    /* ===============================================
       TRANSACTION
    =============================================== */

    await session.withTransaction(
      async () => {
        const [createdPump] =
          await Pump.create(
            [
              {
                pumpName:
                  cleanPumpName,

                ownerName:
                  cleanOwnerName,

                phone:
                  normalizeString(phone),

                email:
                  normalizedEmail,

                companyName:
                  normalizeString(
                    companyName
                  ),

                dealerCode:
                  normalizeString(
                    dealerCode
                  ),

                gstin:
                  normalizeString(
                    gstin
                  ).toUpperCase(),

                address:
                  normalizeString(
                    address
                  ),

                city:
                  normalizeString(city),

                state:
                  normalizeString(state),

                pincode:
                  normalizeString(
                    pincode
                  ),

                active: true,
              },
            ],
            { session }
          );

        const [createdUser] =
          await User.create(
            [
              {
                name:
                  cleanOwnerName,

                email:
                  normalizedEmail,

                password:
                  cleanPassword,

                role: "owner",

                pumpId:
                  createdPump._id,

                active: true,
              },
            ],
            { session }
          );

        pumpCode =
          await generatePumpCode(
            session
          );

        [createdClient] =
          await Client.create(
            [
              {
                pumpId:
                  createdPump._id,

                ownerUserId:
                  createdUser._id,

                pumpName:
                  cleanPumpName,

                ownerName:
                  cleanOwnerName,

                email:
                  normalizedEmail,

                phone:
                  normalizeString(phone),

                address:
                  normalizeString(
                    address
                  ),

                pumpCode,

                plan:
                  normalizedPlan,

                status: "active",

                subscriptionStart:
                  subscriptionStart
                    ? new Date(
                        subscriptionStart
                      )
                    : new Date(),

                subscriptionEnd:
                  subscriptionEnd
                    ? new Date(
                        subscriptionEnd
                      )
                    : null,

                notes:
                  normalizeString(notes),

                createdBy:
                  req.user?._id || null,
              },
            ],
            { session }
          );
      }
    );

    return res.status(201).json({
      success: true,
      message:
        "Client, pump and owner account created successfully",

      client: createdClient,

      credentials: {
        email: normalizedEmail,
        role: "owner",
        pumpCode,
      },
    });
  } catch (error) {
    console.error(
      "ADD SUPERADMIN CLIENT ERROR:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A record with the same unique information already exists",
        code: "DUPLICATE_RECORD",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create client",
      code: "CLIENT_CREATE_ERROR",
    });
  } finally {
    await session.endSession();
  }
};

/* =====================================================
   UPDATE CLIENT
===================================================== */

export const updateClient = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    if (
      !isValidObjectId(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
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
    } = req.body || {};

    let updatedClient = null;

    await session.withTransaction(
      async () => {
        const client =
          await Client.findById(
            req.params.id
          ).session(session);

        if (!client) {
          const error =
            new Error(
              "CLIENT_NOT_FOUND"
            );

          error.statusCode = 404;

          throw error;
        }

        const pump =
          await Pump.findById(
            client.pumpId
          ).session(session);

        const owner =
          await User.findById(
            client.ownerUserId
          ).session(session);

        if (!pump) {
          const error =
            new Error(
              "PUMP_NOT_FOUND"
            );

          error.statusCode = 404;

          throw error;
        }

        if (!owner) {
          const error =
            new Error(
              "OWNER_NOT_FOUND"
            );

          error.statusCode = 404;

          throw error;
        }

        /* =========================================
           EMAIL
        ========================================= */

        if (email !== undefined) {
          const normalizedEmail =
            normalizeEmail(email);

          if (
            !isValidEmail(
              normalizedEmail
            )
          ) {
            const error =
              new Error(
                "INVALID_EMAIL"
              );

            error.statusCode = 400;

            throw error;
          }

          const duplicateUser =
            await User.findOne({
              email:
                normalizedEmail,

              _id: {
                $ne:
                  client.ownerUserId,
              },
            }).session(session);

          if (duplicateUser) {
            const error =
              new Error(
                "DUPLICATE_EMAIL"
              );

            error.statusCode = 409;

            throw error;
          }

          const duplicateClient =
            await Client.findOne({
              email:
                normalizedEmail,

              _id: {
                $ne:
                  client._id,
              },
            }).session(session);

          if (duplicateClient) {
            const error =
              new Error(
                "DUPLICATE_CLIENT_EMAIL"
              );

            error.statusCode = 409;

            throw error;
          }

          client.email =
            normalizedEmail;

          pump.email =
            normalizedEmail;

          owner.email =
            normalizedEmail;
        }

        /* =========================================
           BASIC INFORMATION
        ========================================= */

        if (
          pumpName !== undefined
        ) {
          const value =
            normalizeString(
              pumpName
            );

          if (!value) {
            const error =
              new Error(
                "INVALID_PUMP_NAME"
              );

            error.statusCode = 400;

            throw error;
          }

          client.pumpName = value;
          pump.pumpName = value;
        }

        if (
          ownerName !== undefined
        ) {
          const value =
            normalizeString(
              ownerName
            );

          if (!value) {
            const error =
              new Error(
                "INVALID_OWNER_NAME"
              );

            error.statusCode = 400;

            throw error;
          }

          client.ownerName = value;
          pump.ownerName = value;
          owner.name = value;
        }

        if (
          phone !== undefined
        ) {
          const value =
            normalizeString(phone);

          client.phone = value;
          pump.phone = value;
        }

        if (
          address !== undefined
        ) {
          const value =
            normalizeString(address);

          client.address = value;
          pump.address = value;
        }

        if (
          companyName !== undefined
        ) {
          pump.companyName =
            normalizeString(
              companyName
            );
        }

        if (
          dealerCode !== undefined
        ) {
          pump.dealerCode =
            normalizeString(
              dealerCode
            );
        }

        if (
          gstin !== undefined
        ) {
          pump.gstin =
            normalizeString(
              gstin
            ).toUpperCase();
        }

        if (
          city !== undefined
        ) {
          pump.city =
            normalizeString(city);
        }

        if (
          state !== undefined
        ) {
          pump.state =
            normalizeString(state);
        }

        if (
          pincode !== undefined
        ) {
          pump.pincode =
            normalizeString(
              pincode
            );
        }

        /* =========================================
           PLAN
        ========================================= */

        if (
          plan !== undefined
        ) {
          const normalizedPlan =
            normalizeString(plan)
              .toLowerCase();

          if (
            !ALLOWED_CLIENT_PLANS.includes(
              normalizedPlan
            )
          ) {
            const error =
              new Error(
                "INVALID_PLAN"
              );

            error.statusCode = 400;

            throw error;
          }

          client.plan =
            normalizedPlan;
        }

        /* =========================================
           SUBSCRIPTION DATES
        ========================================= */

        const nextStart =
          subscriptionStart !==
          undefined
            ? subscriptionStart
            : client.subscriptionStart;

        const nextEnd =
          subscriptionEnd !==
          undefined
            ? subscriptionEnd
            : client.subscriptionEnd;

        if (
          !isValidDateValue(
            nextStart
          ) ||
          !isValidDateValue(
            nextEnd
          )
        ) {
          const error =
            new Error(
              "INVALID_SUBSCRIPTION_DATE"
            );

          error.statusCode = 400;

          throw error;
        }

        if (
          nextStart &&
          nextEnd &&
          new Date(nextEnd) <
            new Date(nextStart)
        ) {
          const error =
            new Error(
              "INVALID_SUBSCRIPTION_RANGE"
            );

          error.statusCode = 400;

          throw error;
        }

        if (
          subscriptionStart !==
          undefined
        ) {
          client.subscriptionStart =
            subscriptionStart
              ? new Date(
                  subscriptionStart
                )
              : null;
        }

        if (
          subscriptionEnd !==
          undefined
        ) {
          client.subscriptionEnd =
            subscriptionEnd
              ? new Date(
                  subscriptionEnd
                )
              : null;
        }

        if (
          notes !== undefined
        ) {
          client.notes =
            normalizeString(notes);
        }

        /* =========================================
           STATUS
        ========================================= */

        if (
          status !== undefined
        ) {
          const normalizedStatus =
            normalizeClientStatus(
              status
            );

          if (
            !ALLOWED_CLIENT_STATUSES.includes(
              normalizedStatus
            )
          ) {
            const error =
              new Error(
                "INVALID_STATUS"
              );

            error.statusCode = 400;

            throw error;
          }

          client.status =
            normalizedStatus;

          const active =
            normalizedStatus ===
            "active";

          pump.active = active;
          owner.active = active;
        }

        /* =========================================
           SAVE ALL DOCUMENTS
        ========================================= */

        await client.save({
          session,
        });

        await pump.save({
          session,
        });

        await owner.save({
          session,
        });

        updatedClient = client;
      }
    );

    return res.json({
      success: true,
      message:
        "Client updated successfully",
      client: updatedClient,
    });
  } catch (error) {
    console.error(
      "UPDATE CLIENT ERROR:",
      error
    );

    if (error?.statusCode) {
      const messages = {
        400:
          "Invalid client information",

        404:
          "Client, pump or owner not found",

        409:
          "Another user or client already uses this email",
      };

      return res
        .status(error.statusCode)
        .json({
          success: false,
          message:
            messages[
              error.statusCode
            ] ||
            "Unable to update client",
        });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A record with the same unique information already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update client",
    });
  } finally {
    await session.endSession();
  }
};

/* =====================================================
   UPDATE CLIENT STATUS
===================================================== */

export const updateClientStatus =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const normalizedStatus =
        normalizeClientStatus(
          req.body?.status
        );

      if (
        !ALLOWED_CLIENT_STATUSES.includes(
          normalizedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid client ID",
        });
      }

      let updatedClient = null;

      await session.withTransaction(
        async () => {
          const client =
            await Client.findById(
              req.params.id
            ).session(session);

          if (!client) {
            const error =
              new Error(
                "CLIENT_NOT_FOUND"
              );

            error.statusCode = 404;

            throw error;
          }

          const pump =
            await Pump.findById(
              client.pumpId
            ).session(session);

          if (!pump) {
            const error =
              new Error(
                "PUMP_NOT_FOUND"
              );

            error.statusCode = 404;

            throw error;
          }

          const owner =
            await User.findById(
              client.ownerUserId
            ).session(session);

          if (!owner) {
            const error =
              new Error(
                "OWNER_NOT_FOUND"
              );

            error.statusCode = 404;

            throw error;
          }

          client.status =
            normalizedStatus;

          const active =
            normalizedStatus ===
            "active";

          pump.active = active;
          owner.active = active;

          await client.save({
            session,
          });

          await pump.save({
            session,
          });

          await owner.save({
            session,
          });

          updatedClient = client;
        }
      );

      return res.json({
        success: true,
        message:
          normalizedStatus === "active"
            ? "Client activated"
            : normalizedStatus ===
              "inactive"
            ? "Client deactivated"
            : "Client marked as expired",

        client: updatedClient,
      });
    } catch (error) {
      console.error(
        "UPDATE CLIENT STATUS ERROR:",
        error
      );

      if (
        error?.statusCode === 404
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Client, pump or owner not found",
        });
      }

      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "A record with the same unique information already exists",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to update client status",
      });
    } finally {
      await session.endSession();
    }
  };

/* =====================================================
   DELETE CLIENT

   Client + Pump + Owner User are deleted as ONE
   recoverable group.

   Recovery snapshots are created BEFORE physical
   deletion and inside the SAME MongoDB transaction.
===================================================== */

export const deleteClient =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid client ID",
        });
      }

      let deletionGroupId = null;

      await session.withTransaction(
        async () => {
          const client =
            await Client.findById(
              req.params.id
            ).session(session);

          if (!client) {
            const error =
              new Error(
                "CLIENT_NOT_FOUND"
              );

            error.statusCode = 404;

            throw error;
          }

          const pump =
            await Pump.findById(
              client.pumpId
            ).session(session);

          const owner =
            await User.findById(
              client.ownerUserId
            )
              .select("+password")
              .session(session);

          if (!pump) {
            const error =
              new Error(
                "PUMP_NOT_FOUND"
              );

            error.statusCode = 404;

            throw error;
          }

          if (!owner) {
            const error =
              new Error(
                "OWNER_NOT_FOUND"
              );

            error.statusCode = 404;

            throw error;
          }

          if (
            owner.role !== "owner"
          ) {
            const error =
              new Error(
                "INVALID_OWNER_ROLE"
              );

            error.statusCode = 409;

            throw error;
          }

          const deletedBy =
            req.user?._id;

          if (!deletedBy) {
            const error =
              new Error(
                "AUTHENTICATED_USER_REQUIRED"
              );

            error.statusCode = 401;

            throw error;
          }

          deletionGroupId =
            generateDeletionGroupId();

          /* =========================================
             SNAPSHOT OWNER
          ========================================= */

          await createDeletedRecord({
            document: owner,

            originalCollection:
              User.collection.name,

            originalModel: "User",

            pumpId: pump._id,

            deletedBy,

            req,

            deletionReason:
              "Super Admin client deletion",

            deletionGroupId,

            session,
          });

          /* =========================================
             SNAPSHOT PUMP
          ========================================= */

          await createDeletedRecord({
            document: pump,

            originalCollection:
              Pump.collection.name,

            originalModel: "Pump",

            pumpId: pump._id,

            deletedBy,

            req,

            deletionReason:
              "Super Admin client deletion",

            deletionGroupId,

            session,
          });

          /* =========================================
             SNAPSHOT CLIENT
          ========================================= */

          await createDeletedRecord({
            document: client,

            originalCollection:
              Client.collection.name,

            originalModel: "Client",

            pumpId: pump._id,

            deletedBy,

            req,

            deletionReason:
              "Super Admin client deletion",

            deletionGroupId,

            session,
          });

          /* =========================================
             DELETE OWNER
          ========================================= */

          const ownerDelete =
            await User.deleteOne({
              _id: owner._id,
              pumpId: pump._id,
            }).session(session);

          if (
            ownerDelete.deletedCount !==
            1
          ) {
            const error =
              new Error(
                "OWNER_DELETE_FAILED"
              );

            error.statusCode = 500;

            throw error;
          }

          /* =========================================
             DELETE PUMP
          ========================================= */

          const pumpDelete =
            await Pump.deleteOne({
              _id: pump._id,
            }).session(session);

          if (
            pumpDelete.deletedCount !==
            1
          ) {
            const error =
              new Error(
                "PUMP_DELETE_FAILED"
              );

            error.statusCode = 500;

            throw error;
          }

          /* =========================================
             DELETE CLIENT
          ========================================= */

          const clientDelete =
            await Client.deleteOne({
              _id: client._id,
              pumpId: pump._id,
            }).session(session);

          if (
            clientDelete.deletedCount !==
            1
          ) {
            const error =
              new Error(
                "CLIENT_DELETE_FAILED"
              );

            error.statusCode = 500;

            throw error;
          }
        }
      );

      return res.json({
        success: true,

        message:
          "Client, pump and owner account deleted successfully. Recovery is available for the configured retention period.",

        deletionGroupId,
      });
    } catch (error) {
      console.error(
        "DELETE CLIENT ERROR:",
        error
      );

      if (
        error?.statusCode === 404
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Client not found",
        });
      }

      if (
        error?.statusCode === 409
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Client owner account is not valid for grouped recovery",
        });
      }

      if (
        error?.statusCode === 401
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated Super Admin is required",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete client",
        code:
          "CLIENT_DELETE_ERROR",
      });
    } finally {
      await session.endSession();
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
      ] = await Promise.all([
        Client.countDocuments(),

        Client.countDocuments({
          status: "active",
        }),

        Client.countDocuments({
          status: "inactive",
        }),

        Client.countDocuments({
          status: "expired",
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

      return res.status(500).json({
        success: false,
        message:
          "Unable to load super admin summary",
        code:
          "SUMMARY_ERROR",
      });
    }
  };

/* =====================================================
   GET ALL USERS
===================================================== */

export const getSuperAdminUsers =
  async (req, res) => {
    try {
      const {
        page,
        limit,
        skip,
      } = parsePagination(
        req.query
      );

      const [
        users,
        total,
      ] = await Promise.all([
        User.find()
          .select("-password")
          .populate(
            "pumpId",
            "pumpName ownerName active"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        User.countDocuments(),
      ]);

      return res.status(200).json({
        success: true,
        count: users.length,
        total,
        page,
        limit,
        totalPages:
          Math.ceil(
            total / limit
          ),
        users,
      });
    } catch (error) {
      console.error(
        "GET SUPERADMIN USERS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load users",
        code:
          "USER_LIST_ERROR",
      });
    }
  };

/* =====================================================
   GET REGISTRATION REQUESTS
===================================================== */

export const getRegistrationRequests =
  async (req, res) => {
    try {
      const {
        status,
        search,
      } = req.query;

      const {
        page,
        limit,
        skip,
      } = parsePagination(
        req.query
      );

      const filter = {};

      if (status) {
        const normalizedStatus =
          normalizeRequestStatus(
            status
          );

        if (
          !ALLOWED_REQUEST_STATUSES.includes(
            normalizedStatus
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid registration request status",
            code:
              "INVALID_REQUEST_STATUS",
          });
        }

        filter.status =
          normalizedStatus;
      }

      if (
        typeof search === "string" &&
        search.trim()
      ) {
        const searchValue =
          escapeRegex(
            search.trim()
          );

        filter.$or = [
          {
            ownerName: {
              $regex: searchValue,
              $options: "i",
            },
          },
          {
            pumpName: {
              $regex: searchValue,
              $options: "i",
            },
          },
          {
            email: {
              $regex: searchValue,
              $options: "i",
            },
          },
          {
            phone: {
              $regex: searchValue,
              $options: "i",
            },
          },
        ];
      }

      const [
        requests,
        total,
      ] = await Promise.all([
        RegistrationRequest.find(
          filter
        )
          .select("-password")
          .populate(
            "approvedBy",
            "name email"
          )
          .populate(
            "rejectedBy",
            "name email"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        RegistrationRequest.countDocuments(
          filter
        ),
      ]);

      return res.status(200).json({
        success: true,
        count:
          requests.length,
        total,
        page,
        limit,
        totalPages:
          Math.ceil(
            total / limit
          ),
        requests,
      });
    } catch (error) {
      console.error(
        "GET REGISTRATION REQUESTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load registration requests",
        code:
          "REGISTRATION_LIST_ERROR",
      });
    }
  };

/* =====================================================
   GET REGISTRATION REQUEST BY ID
===================================================== */

export const getRegistrationRequestById =
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid registration request ID",
        });
      }

      const request =
        await RegistrationRequest.findById(
          req.params.id
        )
          .select("-password")
          .populate(
            "approvedBy",
            "name email"
          )
          .populate(
            "rejectedBy",
            "name email"
          )
          .lean();

      if (!request) {
        return res.status(404).json({
          success: false,
          message:
            "Registration request not found",
        });
      }

      return res.status(200).json({
        success: true,
        request,
      });
    } catch (error) {
      console.error(
        "GET REGISTRATION REQUEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load registration request",
        code:
          "REGISTRATION_FETCH_ERROR",
      });
    }
  };

/* =====================================================
   PENDING REGISTRATION COUNT
===================================================== */

export const getPendingRegistrationCount =
  async (req, res) => {
    try {
      const count =
        await RegistrationRequest.countDocuments(
          {
            status: "pending",
          }
        );

      return res.status(200).json({
        success: true,
        count,
      });
    } catch (error) {
      console.error(
        "GET PENDING REGISTRATION COUNT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load pending registration count",
        code:
          "PENDING_COUNT_ERROR",
      });
    }
  };

/* =====================================================
   APPROVE REGISTRATION REQUEST

   RegistrationRequest
        ↓
      Pump
        ↓
      Owner User
        ↓
      Client
        ↓
   Mark request approved

   Everything is one MongoDB transaction.
===================================================== */

export const approveRegistrationRequest =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid registration request ID",
        });
      }

      const authenticatedUserId =
        req.user?._id || null;

      let createdClient = null;
      let createdRequest = null;
      let pumpCode = null;

      await session.withTransaction(
        async () => {
          const request =
            await RegistrationRequest.findById(
              req.params.id
            )
              .select("+password")
              .session(session);

          if (!request) {
            const error =
              new Error(
                "REQUEST_NOT_FOUND"
              );

            error.statusCode = 404;

            throw error;
          }

          if (
            request.status !==
            "pending"
          ) {
            const error =
              new Error(
                "REQUEST_NOT_PENDING"
              );

            error.statusCode = 400;
            error.requestStatus =
              request.status;

            throw error;
          }

          const normalizedEmail =
            normalizeEmail(
              request.email
            );

          if (
            !isValidEmail(
              normalizedEmail
            )
          ) {
            const error =
              new Error(
                "INVALID_EMAIL"
              );

            error.statusCode = 400;

            throw error;
          }

          const cleanPumpName =
            normalizeString(
              request.pumpName
            );

          const cleanOwnerName =
            normalizeString(
              request.ownerName
            );

          if (!cleanPumpName) {
            const error =
              new Error(
                "INVALID_PUMP_NAME"
              );

            error.statusCode = 400;

            throw error;
          }

          if (!cleanOwnerName) {
            const error =
              new Error(
                "INVALID_OWNER_NAME"
              );

            error.statusCode = 400;

            throw error;
          }

          if (
            typeof request.password !==
              "string" ||
            !request.password
          ) {
            const error =
              new Error(
                "PASSWORD_HASH_MISSING"
              );

            error.statusCode = 400;

            throw error;
          }

          /*
           * RegistrationRequest.password is already
           * bcrypt hashed by authController.
           *
           * User.js must avoid hashing an already
           * bcrypt-hashed password again.
           */

          const normalizedPlan =
            normalizeClientPlan(
              request.plan
            );

          /* =========================================
             DUPLICATE USER
          ========================================= */

          const existingUser =
            await User.findOne({
              email:
                normalizedEmail,
            }).session(session);

          if (existingUser) {
            const error =
              new Error(
                "DUPLICATE_USER"
              );

            error.statusCode = 409;

            throw error;
          }

          /* =========================================
             DUPLICATE CLIENT
          ========================================= */

          const existingClient =
            await Client.findOne({
              email:
                normalizedEmail,
            }).session(session);

          if (existingClient) {
            const error =
              new Error(
                "DUPLICATE_CLIENT"
              );

            error.statusCode = 409;

            throw error;
          }

          /* =========================================
             CREATE PUMP
          ========================================= */

          const [
            createdPump,
          ] =
            await Pump.create(
              [
                {
                  pumpName:
                    cleanPumpName,

                  ownerName:
                    cleanOwnerName,

                  phone:
                    normalizeString(
                      request.phone
                    ),

                  email:
                    normalizedEmail,

                  companyName:
                    normalizeString(
                      request.companyName
                    ),

                  dealerCode:
                    normalizeString(
                      request.dealerCode
                    ),

                  gstin:
                    normalizeString(
                      request.gstin
                    ).toUpperCase(),

                  address:
                    normalizeString(
                      request.address
                    ),

                  city:
                    normalizeString(
                      request.city
                    ),

                  state:
                    normalizeString(
                      request.state
                    ),

                  pincode:
                    normalizeString(
                      request.pincode
                    ),

                  active: true,
                },
              ],
              { session }
            );

          /* =========================================
             CREATE OWNER
          ========================================= */

          const [
            createdUser,
          ] =
            await User.create(
              [
                {
                  name:
                    cleanOwnerName,

                  email:
                    normalizedEmail,

                  password:
                    request.password,

                  role: "owner",

                  pumpId:
                    createdPump._id,

                  active: true,
                },
              ],
              { session }
            );

          /* =========================================
             GENERATE PUMP CODE
          ========================================= */

          pumpCode =
            await generatePumpCode(
              session
            );

          /* =========================================
             CREATE CLIENT
          ========================================= */

          [
            createdClient,
          ] =
            await Client.create(
              [
                {
                  pumpId:
                    createdPump._id,

                  ownerUserId:
                    createdUser._id,

                  pumpName:
                    cleanPumpName,

                  ownerName:
                    cleanOwnerName,

                  email:
                    normalizedEmail,

                  phone:
                    normalizeString(
                      request.phone
                    ),

                  address:
                    normalizeString(
                      request.address
                    ),

                  pumpCode,

                  plan:
                    normalizedPlan,

                  status: "active",

                  subscriptionStart:
                    new Date(),

                  subscriptionEnd:
                    null,

                  notes:
                    normalizeString(
                      request.notes
                    ),

                  createdBy:
                    authenticatedUserId,
                },
              ],
              { session }
            );

          /* =========================================
             MARK REQUEST APPROVED
          ========================================= */

          request.status =
            "approved";

          request.approvedBy =
            authenticatedUserId;

          request.approvedAt =
            new Date();

          request.rejectedBy =
            null;

          request.rejectedAt =
            null;

          request.rejectionReason =
            "";

          request.createdPumpId =
            createdPump._id;

          request.createdUserId =
            createdUser._id;

          request.createdClientId =
            createdClient._id;

          await request.save({
            session,
          });

          createdRequest =
            request;
        }
      );

      /* =============================================
         NEVER RETURN PASSWORD HASH
      ============================================= */

      const safeRequest =
        createdRequest?.toObject
          ? createdRequest.toObject()
          : createdRequest;

      if (safeRequest) {
        delete safeRequest.password;
      }

      return res.status(200).json({
        success: true,

        message:
          "Registration request approved successfully",

        request: safeRequest,

        client: createdClient,

        credentials: {
          email:
            normalizeEmail(
              createdClient.email
            ),

          role: "owner",

          pumpCode,
        },
      });
    } catch (error) {
      console.error(
        "APPROVE REGISTRATION REQUEST ERROR:",
        error
      );

      if (
        error?.statusCode === 404
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Registration request not found",
          code:
            "REQUEST_NOT_FOUND",
        });
      }

      if (
        error?.statusCode === 400
      ) {
        const messages = {
          REQUEST_NOT_PENDING:
            error.requestStatus
              ? `Request has already been ${error.requestStatus}`
              : "Registration request is no longer pending",

          INVALID_EMAIL:
            "Registration request contains an invalid email",

          PASSWORD_HASH_MISSING:
            "Registration request password information is missing",

          INVALID_PUMP_NAME:
            "Registration request contains an invalid pump name",

          INVALID_OWNER_NAME:
            "Registration request contains an invalid owner name",
        };

        return res.status(400).json({
          success: false,

          message:
            messages[
              error.message
            ] ||
            "Registration request contains invalid information",

          code:
            error.message ||
            "INVALID_REGISTRATION_REQUEST",
        });
      }

      if (
        error?.statusCode === 409
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A user or client with this email already exists",
          code:
            "DUPLICATE_ACCOUNT",
        });
      }

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A record with the same unique information already exists",
          code:
            "DUPLICATE_RECORD",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to approve registration request",
        code:
          "APPROVAL_ERROR",
      });
    } finally {
      await session.endSession();
    }
  };

/* =====================================================
   REJECT REGISTRATION REQUEST
===================================================== */

export const rejectRegistrationRequest =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid registration request ID",
        });
      }

      const {
        rejectionReason,
      } = req.body || {};

      const cleanReason =
        normalizeString(
          rejectionReason
        );

      if (
        cleanReason.length > 1000
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rejection reason cannot exceed 1000 characters",
        });
      }

      let updatedRequest = null;

      await session.withTransaction(
        async () => {
          /*
           * Load only the pending request.
           *
           * This prevents processing an already
           * approved/rejected request.
           */

          const request =
            await RegistrationRequest.findOne(
              {
                _id:
                  req.params.id,

                status:
                  "pending",
              }
            ).session(session);

          if (!request) {
            const existing =
              await RegistrationRequest.findById(
                req.params.id
              )
                .select("status")
                .session(session);

            if (!existing) {
              const error =
                new Error(
                  "REQUEST_NOT_FOUND"
                );

              error.statusCode = 404;

              throw error;
            }

            const error =
              new Error(
                "REQUEST_NOT_PENDING"
              );

            error.statusCode = 400;

            error.requestStatus =
              existing.status;

            throw error;
          }

          request.status =
            "rejected";

          request.rejectionReason =
            cleanReason;

          /*
           * Rejection must use rejectedBy/rejectedAt.
           *
           * approvedBy/approvedAt must never be
           * populated when rejecting a request.
           */

          request.rejectedBy =
            req.user?._id || null;

          request.rejectedAt =
            new Date();

          request.approvedBy =
            null;

          request.approvedAt =
            null;

          await request.save({
            session,
          });

          updatedRequest =
            request;
        }
      );

      const safeRequest =
        updatedRequest?.toObject
          ? updatedRequest.toObject()
          : updatedRequest;

      if (safeRequest) {
        delete safeRequest.password;
      }

      return res.status(200).json({
        success: true,

        message:
          "Registration request rejected successfully",

        request: safeRequest,
      });
    } catch (error) {
      console.error(
        "REJECT REGISTRATION REQUEST ERROR:",
        error
      );

      if (
        error?.statusCode === 404
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Registration request not found",
          code:
            "REQUEST_NOT_FOUND",
        });
      }

      if (
        error?.statusCode === 400
      ) {
        return res.status(400).json({
          success: false,

          message:
            error.requestStatus
              ? `Request has already been ${error.requestStatus}`
              : "Invalid registration request",

          code:
            "REQUEST_NOT_PENDING",
        });
      }

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A record with the same unique information already exists",
          code:
            "DUPLICATE_RECORD",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to reject registration request",
        code:
          "REJECTION_ERROR",
      });
    } finally {
      await session.endSession();
    }
  };