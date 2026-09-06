import mongoose from "mongoose";

import Client from "../models/Client.js";
import Pump from "../models/Pump.js";
import User from "../models/User.js";
import RegistrationRequest from "../models/RegistrationRequest.js";

/* =====================================================
   HELPERS
===================================================== */

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const normalizeString = (value) =>
  String(value || "").trim();

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(
    String(value || "")
  );

const getSafeErrorMessage = (error) => {
  if (error?.code === 11000) {
    return "A record with the same unique information already exists";
  }

  if (error?.name === "ValidationError") {
    return "Please provide valid information";
  }

  if (error?.name === "CastError") {
    return "Invalid record identifier";
  }

  return "An unexpected server error occurred";
};

/* =====================================================
   UNIQUE PUMP CODE
===================================================== */

const generatePumpCode = async (session = null) => {
  let number =
    (await Client.countDocuments({}, { session })) + 1;

  while (true) {
    const code = `PUMP${String(number).padStart(4, "0")}`;

    const query = Client.exists({
      pumpCode: code,
    });

    if (session) {
      query.session(session);
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
    const clients = await Client.find()
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

    return res.status(200).json({
      success: true,
      count: clients.length,
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
    });
  }
};

/* =====================================================
   GET CLIENT
===================================================== */

export const getClientById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const client = await Client.findById(
      req.params.id
    )
      .populate("pumpId")
      .populate(
        "ownerUserId",
        "-password"
      );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
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
    });
  }
};

/* =====================================================
   CREATE CLIENT + PUMP + OWNER USER
===================================================== */

export const addClient = async (req, res) => {
  const session = await mongoose.startSession();

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
    } = req.body;

    /* ===============================================
       VALIDATION
    =============================================== */

    if (!normalizeString(pumpName)) {
      return res.status(400).json({
        success: false,
        message: "Pump name is required",
      });
    }

    if (!normalizeString(ownerName)) {
      return res.status(400).json({
        success: false,
        message: "Owner name is required",
      });
    }

    const normalizedEmail =
      normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Owner email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Client password is required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Client password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
      });
    }

    const existingClient = await Client.findOne({
      email: normalizedEmail,
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        message:
          "A client with this email already exists",
      });
    }

    let createdClient = null;
    let pumpCode = null;

    /* ===============================================
       TRANSACTION
    =============================================== */

    await session.withTransaction(async () => {
      const [createdPump] = await Pump.create(
        [
          {
            pumpName: normalizeString(pumpName),
            ownerName: normalizeString(ownerName),
            phone: normalizeString(phone),
            email: normalizedEmail,
            companyName: normalizeString(companyName),
            dealerCode: normalizeString(dealerCode),
            gstin: normalizeString(gstin),
            address: normalizeString(address),
            city: normalizeString(city),
            state: normalizeString(state),
            pincode: normalizeString(pincode),
            active: true,
          },
        ],
        { session }
      );

      const [createdUser] = await User.create(
        [
          {
            name: normalizeString(ownerName),
            email: normalizedEmail,
            password,
            role: "owner",
            pumpId: createdPump._id,
            active: true,
          },
        ],
        { session }
      );

      pumpCode = await generatePumpCode(session);

      [createdClient] = await Client.create(
        [
          {
            pumpId: createdPump._id,
            ownerUserId: createdUser._id,
            pumpName: normalizeString(pumpName),
            ownerName: normalizeString(ownerName),
            email: normalizedEmail,
            phone: normalizeString(phone),
            address: normalizeString(address),
            pumpCode,
            plan: plan || "standard",
            status: "active",
            subscriptionStart:
              subscriptionStart || new Date(),
            subscriptionEnd:
              subscriptionEnd || null,
            notes: normalizeString(notes),
            createdBy: req.user?._id || null,
          },
        ],
        { session }
      );
    });

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

    return res
      .status(error?.code === 11000 ? 409 : 500)
      .json({
        success: false,
        message:
          error?.code === 11000
            ? "A record with the same unique information already exists"
            : "Unable to create client",
      });
  } finally {
    await session.endSession();
  }
};

/* =====================================================
   UPDATE CLIENT
===================================================== */

export const updateClient = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    if (!isValidObjectId(req.params.id)) {
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
    } = req.body;

    let updatedClient = null;

    await session.withTransaction(async () => {
      const client =
        await Client.findById(req.params.id).session(
          session
        );

      if (!client) {
        const error = new Error(
          "CLIENT_NOT_FOUND"
        );

        error.statusCode = 404;
        throw error;
      }

      const pump = await Pump.findById(
        client.pumpId
      ).session(session);

      const owner = await User.findById(
        client.ownerUserId
      ).session(session);

      /* =========================================
         EMAIL
      ========================================= */

      if (email !== undefined) {
        const normalizedEmail =
          normalizeEmail(email);

        if (!normalizedEmail) {
          const error = new Error(
            "INVALID_EMAIL"
          );

          error.statusCode = 400;
          throw error;
        }

        const duplicateUser =
          await User.findOne({
            email: normalizedEmail,
            _id: {
              $ne: client.ownerUserId,
            },
          }).session(session);

        if (duplicateUser) {
          const error = new Error(
            "DUPLICATE_EMAIL"
          );

          error.statusCode = 409;
          throw error;
        }

        client.email = normalizedEmail;

        if (pump) {
          pump.email = normalizedEmail;
        }

        if (owner) {
          owner.email = normalizedEmail;
        }
      }

      /* =========================================
         BASIC CLIENT / PUMP / OWNER INFORMATION
      ========================================= */

      if (pumpName !== undefined) {
        const value =
          normalizeString(pumpName);

        if (!value) {
          const error = new Error(
            "INVALID_PUMP_NAME"
          );

          error.statusCode = 400;
          throw error;
        }

        client.pumpName = value;

        if (pump) {
          pump.pumpName = value;
        }
      }

      if (ownerName !== undefined) {
        const value =
          normalizeString(ownerName);

        if (!value) {
          const error = new Error(
            "INVALID_OWNER_NAME"
          );

          error.statusCode = 400;
          throw error;
        }

        client.ownerName = value;

        if (pump) {
          pump.ownerName = value;
        }

        if (owner) {
          owner.name = value;
        }
      }

      if (phone !== undefined) {
        client.phone =
          normalizeString(phone);

        if (pump) {
          pump.phone =
            normalizeString(phone);
        }
      }

      if (address !== undefined) {
        client.address =
          normalizeString(address);

        if (pump) {
          pump.address =
            normalizeString(address);
        }
      }

      if (plan !== undefined) {
        client.plan = plan;
      }

      if (subscriptionStart !== undefined) {
        client.subscriptionStart =
          subscriptionStart || null;
      }

      if (subscriptionEnd !== undefined) {
        client.subscriptionEnd =
          subscriptionEnd || null;
      }

      if (notes !== undefined) {
        client.notes =
          normalizeString(notes);
      }

      /* =========================================
         PUMP INFORMATION
      ========================================= */

      if (pump) {
        if (companyName !== undefined) {
          pump.companyName =
            normalizeString(companyName);
        }

        if (dealerCode !== undefined) {
          pump.dealerCode =
            normalizeString(dealerCode);
        }

        if (gstin !== undefined) {
          pump.gstin =
            normalizeString(gstin);
        }

        if (city !== undefined) {
          pump.city =
            normalizeString(city);
        }

        if (state !== undefined) {
          pump.state =
            normalizeString(state);
        }

        if (pincode !== undefined) {
          pump.pincode =
            normalizeString(pincode);
        }
      }

      /* =========================================
         STATUS
      ========================================= */

      if (status !== undefined) {
        if (
          ![
            "active",
            "inactive",
            "expired",
          ].includes(status)
        ) {
          const error = new Error(
            "INVALID_STATUS"
          );

          error.statusCode = 400;
          throw error;
        }

        client.status = status;

        const active =
          status === "active";

        if (pump) {
          pump.active = active;
        }

        if (owner) {
          owner.active = active;
        }
      }

      /* =========================================
         SAVE ALL DOCUMENTS INSIDE TRANSACTION
      ========================================= */

      await client.save({
        session,
      });

      if (pump) {
        await pump.save({
          session,
        });
      }

      if (owner) {
        await owner.save({
          session,
        });
      }

      updatedClient = client;
    });

    return res.json({
      success: true,
      message: "Client updated successfully",
      client: updatedClient,
    });
  } catch (error) {
    console.error(
      "UPDATE CLIENT ERROR:",
      error
    );

    if (error?.statusCode) {
      const messages = {
        400: "Invalid client information",
        404: "Client not found",
        409: "Another user already uses this email",
      };

      return res.status(error.statusCode).json({
        success: false,
        message:
          messages[error.statusCode] ||
          "Unable to update client",
      });
    }

    return res
      .status(error?.code === 11000 ? 409 : 500)
      .json({
        success: false,
        message:
          error?.code === 11000
            ? "A record with the same unique information already exists"
            : "Unable to update client",
      });
  } finally {
    await session.endSession();
  }
};

/* =====================================================
   UPDATE CLIENT STATUS
===================================================== */

export const updateClientStatus = async (
  req,
  res
) => {
  const session = await mongoose.startSession();

  try {
    const { status } = req.body;

    if (
      ![
        "active",
        "inactive",
        "expired",
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    let updatedClient = null;

    await session.withTransaction(async () => {
      const client =
        await Client.findById(req.params.id).session(
          session
        );

      if (!client) {
        const error = new Error(
          "CLIENT_NOT_FOUND"
        );

        error.statusCode = 404;
        throw error;
      }

      client.status = status;

      const active =
        status === "active";

      await client.save({
        session,
      });

      await Pump.findByIdAndUpdate(
        client.pumpId,
        {
          active,
        },
        {
          session,
          runValidators: true,
        }
      );

      await User.findByIdAndUpdate(
        client.ownerUserId,
        {
          active,
        },
        {
          session,
          runValidators: true,
        }
      );

      updatedClient = client;
    });

    return res.json({
      success: true,
      message:
        status === "active"
          ? "Client activated"
          : "Client deactivated",
      client: updatedClient,
    });
  } catch (error) {
    console.error(
      "UPDATE CLIENT STATUS ERROR:",
      error
    );

    if (error?.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
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
===================================================== */

export const deleteClient = async (
  req,
  res
) => {
  const session = await mongoose.startSession();

  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    await session.withTransaction(async () => {
      const client =
        await Client.findById(req.params.id).session(
          session
        );

      if (!client) {
        const error = new Error(
          "CLIENT_NOT_FOUND"
        );

        error.statusCode = 404;
        throw error;
      }

      await User.findByIdAndDelete(
        client.ownerUserId,
        {
          session,
        }
      );

      await Pump.findByIdAndDelete(
        client.pumpId,
        {
          session,
        }
      );

      await Client.findByIdAndDelete(
        client._id,
        {
          session,
        }
      );
    });

    return res.json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE CLIENT ERROR:",
      error
    );

    if (error?.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete client",
    });
  } finally {
    await session.endSession();
  }
};

/* =====================================================
   SUPER ADMIN SUMMARY
===================================================== */

export const getSuperAdminSummary = async (
  req,
  res
) => {
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
    });
  }
};

/* =====================================================
   GET ALL USERS
===================================================== */

export const getSuperAdminUsers = async (
  req,
  res
) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate(
        "pumpId",
        "pumpName ownerName pumpCode active"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(
      "GET SUPERADMIN USERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load users",
    });
  }
};

/* =====================================================
   GET REGISTRATION REQUESTS
===================================================== */

export const getRegistrationRequests = async (
  req,
  res
) => {
  try {
    const { status, search } = req.query;

    const filter = {};

    if (
      status &&
      [
        "pending",
        "approved",
        "rejected",
      ].includes(status)
    ) {
      filter.status = status;
    }

    if (search?.trim()) {
      const searchValue =
        search.trim();

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

    const requests =
      await RegistrationRequest.find(filter)
        .populate(
          "approvedBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: requests.length,
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
    });
  }
};

/* =====================================================
   GET REGISTRATION REQUEST BY ID
===================================================== */

export const getRegistrationRequestById =
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid registration request ID",
        });
      }

      const request =
        await RegistrationRequest.findById(
          req.params.id
        ).populate(
          "approvedBy",
          "name email"
        );

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
        await RegistrationRequest.countDocuments({
          status: "pending",
        });

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
      });
    }
  };

/* =====================================================
   APPROVE REGISTRATION REQUEST
===================================================== */

export const approveRegistrationRequest =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid registration request ID",
        });
      }

      let createdClient = null;
      let createdRequest = null;
      let pumpCode = null;

      await session.withTransaction(async () => {
        /*
         * IMPORTANT:
         * RegistrationRequest.password uses select:false.
         *
         * Therefore +password is mandatory here.
         * The registration controller has already converted
         * the applicant's plaintext password into a bcrypt
         * hash. We need that hash to create the User.
         */

        const request =
          await RegistrationRequest.findById(
            req.params.id
          )
            .select("+password")
            .session(session);

        if (!request) {
          const error = new Error(
            "REQUEST_NOT_FOUND"
          );

          error.statusCode = 404;
          throw error;
        }

        if (request.status !== "pending") {
          const error = new Error(
            "REQUEST_NOT_PENDING"
          );

          error.statusCode = 400;
          error.requestStatus =
            request.status;

          throw error;
        }

        const normalizedEmail =
          normalizeEmail(request.email);

        if (!normalizedEmail) {
          const error = new Error(
            "INVALID_EMAIL"
          );

          error.statusCode = 400;
          throw error;
        }

        /* =========================================
           DUPLICATE USER
        ========================================= */

        const existingUser =
          await User.findOne({
            email: normalizedEmail,
          }).session(session);

        if (existingUser) {
          const error = new Error(
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
            email: normalizedEmail,
          }).session(session);

        if (existingClient) {
          const error = new Error(
            "DUPLICATE_CLIENT"
          );

          error.statusCode = 409;
          throw error;
        }

        /* =========================================
           CREATE PUMP
        ========================================= */

        const [createdPump] =
          await Pump.create(
            [
              {
                pumpName:
                  normalizeString(
                    request.pumpName
                  ),

                ownerName:
                  normalizeString(
                    request.ownerName
                  ),

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
                  ),

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

        const [createdUser] =
          await User.create(
            [
              {
                name:
                  normalizeString(
                    request.ownerName
                  ),

                email:
                  normalizedEmail,

                /*
                 * This is already a bcrypt hash.
                 * User.pre("save") detects the hash and
                 * prevents double hashing.
                 */
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

        [createdClient] =
          await Client.create(
            [
              {
                pumpId:
                  createdPump._id,

                ownerUserId:
                  createdUser._id,

                pumpName:
                  normalizeString(
                    request.pumpName
                  ),

                ownerName:
                  normalizeString(
                    request.ownerName
                  ),

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
                  request.plan ||
                  "standard",

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
                  req.user?._id ||
                  null,
              },
            ],
            { session }
          );

        /* =========================================
           MARK REQUEST APPROVED
        ========================================= */

        request.status = "approved";

        request.approvedBy =
          req.user?._id || null;

        request.approvedAt =
          new Date();

        request.createdPumpId =
          createdPump._id;

        request.createdUserId =
          createdUser._id;

        request.createdClientId =
          createdClient._id;

        await request.save({
          session,
        });

        createdRequest = request;
      });

      return res.status(200).json({
        success: true,

        message:
          "Registration request approved successfully",

        request: createdRequest,

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

      if (error?.statusCode) {
        if (error.statusCode === 404) {
          return res.status(404).json({
            success: false,
            message:
              "Registration request not found",
          });
        }

        if (error.statusCode === 400) {
          return res.status(400).json({
            success: false,
            message:
              `Request has already been ${error.requestStatus}`,
          });
        }

        if (error.statusCode === 409) {
          return res.status(409).json({
            success: false,
            message:
              "A user or client with this email already exists",
          });
        }
      }

      return res
        .status(error?.code === 11000 ? 409 : 500)
        .json({
          success: false,
          message:
            error?.code === 11000
              ? "A record with the same unique information already exists"
              : "Unable to approve registration request",
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
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid registration request ID",
        });
      }

      const { rejectionReason } =
        req.body;

      const request =
        await RegistrationRequest.findById(
          req.params.id
        );

      if (!request) {
        return res.status(404).json({
          success: false,
          message:
            "Registration request not found",
        });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          success: false,
          message:
            `Request has already been ${request.status}`,
        });
      }

      request.status = "rejected";

      if (rejectionReason !== undefined) {
        request.rejectionReason =
          normalizeString(
            rejectionReason
          );
      }

      request.approvedBy =
        req.user?._id || null;

      request.approvedAt =
        new Date();

      await request.save();

      return res.status(200).json({
        success: true,
        message:
          "Registration request rejected successfully",
        request,
      });
    } catch (error) {
      console.error(
        "REJECT REGISTRATION REQUEST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to reject registration request",
      });
    }
  };