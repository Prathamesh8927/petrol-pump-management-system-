import mongoose from "mongoose";

import Client from "../models/Client.js";
import Pump from "../models/Pump.js";
import User from "../models/User.js";
import FuelPrice from "../models/FuelPrice.js";
import RegistrationRequest from "../models/RegistrationRequest.js";

import {
  createDeletedRecord,
  generateDeletionGroupId,
} from "../services/recoveryService.js";

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
   AUTHENTICATED USER ID

   Supports different auth middleware formats.
===================================================== */

const getAuthenticatedUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );
};

/* =====================================================
   AUTHORIZED PUMP ID

   Normal pump users:
   → always use their own req.user.pumpId

   Superadmin:
   → may specify pumpId through query/body
===================================================== */

const getAuthorizedPumpId = (req) => {
  const role = normalizeString(
    req.user?.role
  ).toLowerCase();

  if (role === "superadmin") {
    const requestedPumpId =
      req.query?.pumpId ||
      req.body?.pumpId;

    if (
      requestedPumpId &&
      isValidObjectId(requestedPumpId)
    ) {
      return String(requestedPumpId);
    }

    return null;
  }

  if (
    req.user?.pumpId &&
    isValidObjectId(req.user.pumpId)
  ) {
    return String(req.user.pumpId);
  }

  return null;
};

/* =====================================================
   UNIQUE PUMP CODE
===================================================== */

const generatePumpCode = async (
  session = null
) => {
  let number =
    (await Client.countDocuments(
      {},
      { session }
    )) + 1;

  while (true) {
    const code =
      `PUMP${String(number).padStart(4, "0")}`;

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
   GET PUMP SETTINGS
===================================================== */

export const getPumpSettings = async (
  req,
  res
) => {
  try {
    const pumpId =
      getAuthorizedPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid pump ID is required",
      });
    }

    const pump =
      await Pump.findById(pumpId).select(
        "-__v"
      );

    if (!pump) {
      return res.status(404).json({
        success: false,
        message: "Pump not found",
      });
    }

    return res.status(200).json({
      success: true,
      pump,
    });
  } catch (error) {
    console.error(
      "GET PUMP SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load pump settings",
    });
  }
};

/* =====================================================
   UPDATE PUMP SETTINGS
===================================================== */

export const updatePumpSettings = async (
  req,
  res
) => {
  try {
    const pumpId =
      getAuthorizedPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid pump ID is required",
      });
    }

    const pump =
      await Pump.findById(pumpId);

    if (!pump) {
      return res.status(404).json({
        success: false,
        message: "Pump not found",
      });
    }

    const {
      pumpName,
      ownerName,
      phone,
      email,
      companyName,
      dealerCode,
      gstin,
      address,
      city,
      state,
      pincode,
      lowStockAlert,
      enableLowStockAlert,
    } = req.body;

    if (pumpName !== undefined) {
      const value =
        normalizeString(pumpName);

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            "Pump name cannot be empty",
        });
      }

      pump.pumpName = value;
    }

    if (ownerName !== undefined) {
      const value =
        normalizeString(ownerName);

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            "Owner name cannot be empty",
        });
      }

      pump.ownerName = value;
    }

    if (phone !== undefined) {
      pump.phone =
        normalizeString(phone);
    }

    if (email !== undefined) {
      const normalizedEmail =
        normalizeEmail(email);

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Email cannot be empty",
        });
      }

      pump.email = normalizedEmail;
    }

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

    if (address !== undefined) {
      pump.address =
        normalizeString(address);
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

    if (lowStockAlert !== undefined) {
      const value =
        Number(lowStockAlert);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Low stock alert must be a valid non-negative number",
        });
      }

      pump.lowStockAlert = value;
    }

    if (
      enableLowStockAlert !==
      undefined
    ) {
      if (
        typeof enableLowStockAlert !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "enableLowStockAlert must be true or false",
        });
      }

      pump.enableLowStockAlert =
        enableLowStockAlert;
    }

    await pump.save();

    return res.status(200).json({
      success: true,
      message:
        "Pump settings updated successfully",
      pump,
    });
  } catch (error) {
    console.error(
      "UPDATE PUMP SETTINGS ERROR:",
      error
    );

    return res.status(
      error?.code === 11000
        ? 409
        : 500
    ).json({
      success: false,
      message:
        error?.code === 11000
          ? "A record with the same unique information already exists"
          : "Unable to update pump settings",
    });
  }
};

export const getPaymentSettings = async (req, res) => {
  try {
    const pumpId = getAuthorizedPumpId(req);
    if (!pumpId) return res.status(400).json({ success: false, message: "A valid pump ID is required" });

    const pump = await Pump.findById(pumpId).select("paymentConfig").lean();
    if (!pump) return res.status(404).json({ success: false, message: "Pump not found" });

    return res.status(200).json({
      success: true,
      paymentConfig: pump.paymentConfig || { provider: "razorpay", enabled: true, status: "connected" },
    });
  } catch (error) {
    console.error("GET PAYMENT SETTINGS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to load payment settings" });
  }
};

export const updatePaymentSettings = async (req, res) => {
  try {
    const pumpId = getAuthorizedPumpId(req);
    if (!pumpId) return res.status(400).json({ success: false, message: "A valid pump ID is required" });

    const provider = normalizeString(req.body?.provider).toLowerCase();
    if (!["razorpay", "bank"].includes(provider)) {
      return res.status(400).json({ success: false, message: "Unsupported payment provider" });
    }

    const pump = await Pump.findById(pumpId);
    if (!pump) return res.status(404).json({ success: false, message: "Pump not found" });

    pump.paymentConfig = {
      ...(pump.paymentConfig?.toObject?.() || pump.paymentConfig || {}),
      provider,
      enabled: req.body?.enabled !== false,
      merchantId: normalizeString(req.body?.merchantId),
      terminalId: normalizeString(req.body?.terminalId),
      merchantVpa: normalizeString(req.body?.merchantVpa),
      dynamicQrEnabled: req.body?.dynamicQrEnabled !== false,
      webhookEnabled: req.body?.webhookEnabled === true,
      status: provider === "razorpay" ? "connected" : "pending",
      connectedAt: provider === "razorpay" ? new Date() : pump.paymentConfig?.connectedAt || null,
    };

    await pump.save();
    return res.status(200).json({ success: true, message: "Payment settings updated successfully", paymentConfig: pump.paymentConfig });
  } catch (error) {
    console.error("UPDATE PAYMENT SETTINGS ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to update payment settings" });
  }
};
/* =====================================================
   GET OWNER BANK ACCOUNT SETTINGS

   SECURITY:
   - Uses authenticated user's pumpId.
   - Superadmin can use an explicit pumpId.
   - Full account number is never returned.
   - Only last 4 digits are exposed.
===================================================== */

export const getBankAccountSettings = async (
  req,
  res
) => {
  try {
    const pumpId =
      getAuthorizedPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid pump ID is required",
      });
    }

    /*
     * Explicitly select the hidden account number.
     *
     * accountNumber has select:false in Pump schema.
     */
    const pump =
      await Pump.findById(pumpId)
        .select(
          "+bankAccount.accountNumber"
        )
        .lean();

    if (!pump) {
      return res.status(404).json({
        success: false,
        message:
          "Pump not found",
      });
    }

    const bankAccount =
      pump.bankAccount || {};

    const accountNumber =
      normalizeString(
        bankAccount.accountNumber
      );

    let maskedAccountNumber = "";

    if (accountNumber) {
      const lastFour =
        accountNumber.slice(-4);

      maskedAccountNumber =
        `••••••••${lastFour}`;
    }

    return res.status(200).json({
      success: true,

      bankAccount: {
        accountHolderName:
          bankAccount.accountHolderName ||
          "",

        bankName:
          bankAccount.bankName ||
          "",

        accountNumber:
          maskedAccountNumber,

        ifsc:
          bankAccount.ifsc ||
          "",

        branchName:
          bankAccount.branchName ||
          "",

        accountType:
          bankAccount.accountType ||
          "",

        verified:
          bankAccount.verified === true,

        verifiedAt:
          bankAccount.verifiedAt ||
          null,

        hasAccountNumber:
          Boolean(accountNumber),
      },
    });
  } catch (error) {
    console.error(
      "GET BANK ACCOUNT SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load bank account settings",
    });
  }
};
/* =====================================================
   UPDATE OWNER BANK ACCOUNT SETTINGS

   SECURITY:
   - Uses authenticated user's pumpId.
   - Superadmin may use explicit pumpId.
   - Does NOT mark account as verified.
   - Never stores banking passwords, OTP, UPI PIN,
     card PIN, internet banking credentials, etc.
===================================================== */

export const updateBankAccountSettings = async (
  req,
  res
) => {
  try {
    const pumpId =
      getAuthorizedPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid pump ID is required",
      });
    }

    const pump =
      await Pump.findById(pumpId).select(
        "+bankAccount.accountNumber"
      );

    if (!pump) {
      return res.status(404).json({
        success: false,
        message: "Pump not found",
      });
    }

    const {
      accountHolderName,
      bankName,
      accountNumber,
      ifsc,
      branchName,
      accountType,
    } = req.body || {};

    if (
      accountHolderName !==
      undefined
    ) {
      const value =
        normalizeString(
          accountHolderName
        );

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            "Account holder name is required",
        });
      }

      pump.bankAccount.accountHolderName =
        value;
    }

    if (bankName !== undefined) {
      const value =
        normalizeString(bankName);

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            "Bank name is required",
        });
      }

      pump.bankAccount.bankName =
        value;
    }

    if (
      accountNumber !==
      undefined
    ) {
      const value =
        normalizeString(
          accountNumber
        ).replace(/\s+/g, "");

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            "Account number is required",
        });
      }

      /*
       * Basic validation only.
       *
       * Do not assume a specific bank's account-number
       * format because formats can vary.
       */
      if (
        !/^\d{6,30}$/.test(value)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Account number must contain 6 to 30 digits",
        });
      }

      pump.bankAccount.accountNumber =
        value;

      /*
       * Changing the account number means an old
       * verification state cannot safely remain valid.
       */
      pump.bankAccount.verified =
        false;

      pump.bankAccount.verifiedAt =
        null;
    }

    if (ifsc !== undefined) {
      const value =
        normalizeString(ifsc)
          .toUpperCase()
          .replace(/\s+/g, "");

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            "IFSC code is required",
        });
      }

      /*
       * Standard Indian IFSC format:
       * 4 letters + 0 + 6 alphanumeric characters.
       */
      if (
        !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
          value
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid IFSC code",
        });
      }

      pump.bankAccount.ifsc =
        value;
    }

    if (
      branchName !==
      undefined
    ) {
      pump.bankAccount.branchName =
        normalizeString(
          branchName
        );
    }

    if (
      accountType !==
      undefined
    ) {
      const normalizedType =
        normalizeString(
          accountType
        ).toLowerCase();

      if (
        ![
          "savings",
          "current",
        ].includes(normalizedType)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Account type must be savings or current",
        });
      }

      pump.bankAccount.accountType =
        normalizedType;
    }

    /*
     * Never allow the API request to mark the account
     * as verified.
     *
     * Verification must happen only through a real
     * verification flow/provider later.
     */

    await pump.save();

    const savedAccount =
      pump.bankAccount || {};

    const savedAccountNumber =
      normalizeString(
        savedAccount.accountNumber
      );

    const maskedAccountNumber =
      savedAccountNumber
        ? `••••••••${savedAccountNumber.slice(-4)}`
        : "";

    return res.status(200).json({
      success: true,
      message:
        "Bank account settings updated successfully",

      bankAccount: {
        accountHolderName:
          savedAccount.accountHolderName ||
          "",

        bankName:
          savedAccount.bankName ||
          "",

        accountNumber:
          maskedAccountNumber,

        ifsc:
          savedAccount.ifsc ||
          "",

        branchName:
          savedAccount.branchName ||
          "",

        accountType:
          savedAccount.accountType ||
          "",

        verified:
          savedAccount.verified ===
          true,

        verifiedAt:
          savedAccount.verifiedAt ||
          null,

        hasAccountNumber:
          Boolean(
            savedAccountNumber
          ),
      },
    });
  } catch (error) {
    console.error(
      "UPDATE BANK ACCOUNT SETTINGS ERROR:",
      error
    );

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid bank account information",
      });
    }

    if (
      error?.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid bank account information",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update bank account settings",
    });
  }
};
/* =====================================================
   GET FUEL SETTINGS
===================================================== */

export const getFuelSettings = async (
  req,
  res
) => {
  try {
    const pumpId =
      getAuthorizedPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid pump ID is required",
      });
    }

    const fuelPrices =
      await FuelPrice.find({
        pumpId,
      })
        .sort({
          fuelType: 1,
        })
        .lean();

    const petrol =
      fuelPrices.find(
        (item) => item.fuelType === "petrol"
      );

    const diesel =
      fuelPrices.find(
        (item) => item.fuelType === "diesel"
      );

    return res.status(200).json({
      success: true,

      fuelPrices,

      settings: {
        petrolPrice:
          petrol?.price ?? "",

        dieselPrice:
          diesel?.price ?? "",
      },

      petrolPrice:
        petrol?.price ?? "",

      dieselPrice:
        diesel?.price ?? "",
    });
  } catch (error) {
    console.error(
      "GET FUEL SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load fuel settings",
    });
  }
};


/* =====================================================
   UPDATE FUEL SETTINGS
===================================================== */

export const updateFuelSettings = async (
  req,
  res
) => {
  try {
    const pumpId =
      getAuthorizedPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid pump ID is required",
      });
    }

    const pump =
      await Pump.findById(pumpId).select(
        "_id active"
      );

    if (!pump) {
      return res.status(404).json({
        success: false,
        message: "Pump not found",
      });
    }

    const {
      petrolPrice,
      dieselPrice,
      petrol,
      diesel,
      prices,
    } = req.body || {};

    const fuelData =
      prices &&
      typeof prices === "object"
        ? prices
        : {
            petrol:
              petrolPrice !== undefined
                ? petrolPrice
                : petrol,

            diesel:
              dieselPrice !== undefined
                ? dieselPrice
                : diesel,
          };

    const updates = [];

    for (const fuelType of [
      "petrol",
      "diesel",
    ]) {
      if (
        fuelData[fuelType] ===
        undefined
      ) {
        continue;
      }

      const price = Number(
        fuelData[fuelType]
      );

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${fuelType} price must be a valid non-negative number`,
        });
      }

      updates.push(
        FuelPrice.findOneAndUpdate(
          {
            pumpId,
            fuelType,
          },
          {
            $set: {
              price,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        )
      );
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "At least one fuel price is required",
      });
    }

    await Promise.all(updates);

    const fuelPrices =
      await FuelPrice.find({
        pumpId,
      })
        .sort({
          fuelType: 1,
        })
        .lean();

    const savedPetrol =
      fuelPrices.find(
        (item) => item.fuelType === "petrol"
      );

    const savedDiesel =
      fuelPrices.find(
        (item) => item.fuelType === "diesel"
      );

    return res.status(200).json({
      success: true,

      message:
        "Fuel settings updated successfully",

      fuelPrices,

      settings: {
        petrolPrice:
          savedPetrol?.price ?? "",

        dieselPrice:
          savedDiesel?.price ?? "",
      },

      petrolPrice:
        savedPetrol?.price ?? "",

      dieselPrice:
        savedDiesel?.price ?? "",
    });
  } catch (error) {
    console.error(
      "UPDATE FUEL SETTINGS ERROR:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Fuel price already exists for this pump",
      });
    }

    if (
      error?.name === "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid fuel price information",
      });
    }

    if (error?.name === "CastError") {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fuel price information",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update fuel settings",
    });
  }
};
/* =====================================================
   GET PUMP USERS
===================================================== */

export const getPumpUsers = async (
  req,
  res
) => {
  try {
    const pumpId =
      getAuthorizedPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid pump ID is required",
      });
    }

    const users =
      await User.find({
        pumpId,
      })
        .select("-password")
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(
      "GET PUMP USERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load pump users",
    });
  }
};

/* =====================================================
   ADD PUMP USER

   Creates manager/staff only.

   IMPORTANT:
   User schema uses:
   - manager
   - staff

   It does NOT use "employee".
===================================================== */

export const addPumpUser = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      password,
      role,
      pumpId: requestedPumpId,
      active,
    } = req.body;

    const pumpId =
      getAuthorizedPumpId(req) ||
      (
        normalizeString(
          req.user?.role
        ).toLowerCase() ===
          "superadmin" &&
        isValidObjectId(
          requestedPumpId
        )
          ? String(requestedPumpId)
          : null
      );

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid pump ID is required",
      });
    }

    const normalizedName =
      normalizeString(name);

    const normalizedEmail =
      normalizeEmail(email);

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message:
          "User name is required",
      });
    }

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message:
          "User email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message:
          "Password is required",
      });
    }

    if (
      String(password).length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const allowedRoles = [
      "manager",
      "staff",
    ];

    const normalizedRole =
      normalizeString(role).toLowerCase() ||
      "staff";

    if (
      !allowedRoles.includes(
        normalizedRole
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user role. Allowed roles: manager, staff",
      });
    }

    const pump =
      await Pump.findById(pumpId).select(
        "_id pumpName ownerName active"
      );

    if (!pump) {
      return res.status(404).json({
        success: false,
        message: "Pump not found",
      });
    }

    if (!pump.active) {
      return res.status(403).json({
        success: false,
        message:
          "Cannot create a user for an inactive pump",
      });
    }

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
      });
    }

    const user =
      await User.create({
        name: normalizedName,
        email: normalizedEmail,
        password,
        role: normalizedRole,
        pumpId: pump._id,
        active:
          typeof active ===
          "boolean"
            ? active
            : true,
      });

    const safeUser =
      user.toObject();

    delete safeUser.password;

    return res.status(201).json({
      success: true,
      message:
        "Pump user created successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error(
      "ADD PUMP USER ERROR:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A user with the same unique information already exists",
      });
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid user information",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to create pump user",
    });
  }
};

/* =====================================================
   UPDATE PUMP USER
===================================================== */

export const updatePumpUser = async (
  req,
  res
) => {
  try {
    const userId =
      req.params.userId;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    const pumpId =
      getAuthorizedPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid pump ID is required",
      });
    }

    const user =
      await User.findOne({
        _id: userId,
        pumpId,
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Pump user not found",
      });
    }

    if (
      user.role === "owner" ||
      user.role === "superadmin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Owner and superadmin accounts cannot be modified from this section",
      });
    }

    const {
      name,
      email,
      password,
      role,
      active,
    } = req.body;

    if (name !== undefined) {
      const normalizedName =
        normalizeString(name);

      if (!normalizedName) {
        return res.status(400).json({
          success: false,
          message:
            "User name cannot be empty",
        });
      }

      user.name =
        normalizedName;
    }

    if (email !== undefined) {
      const normalizedEmail =
        normalizeEmail(email);

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message:
            "User email cannot be empty",
        });
      }

      const duplicateUser =
        await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: user._id,
          },
        });

      if (duplicateUser) {
        return res.status(409).json({
          success: false,
          message:
            "A user with this email already exists",
        });
      }

      user.email =
        normalizedEmail;
    }

    if (role !== undefined) {
      const normalizedRole =
        normalizeString(
          role
        ).toLowerCase();

      if (
        ![
          "manager",
          "staff",
        ].includes(normalizedRole)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user role. Allowed roles: manager, staff",
        });
      }

      user.role =
        normalizedRole;
    }

    if (password !== undefined) {
      if (
        !password ||
        String(password).length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters",
        });
      }

      user.password = password;
    }

    if (active !== undefined) {
      if (
        typeof active !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Active status must be true or false",
        });
      }

      user.active = active;
    }

    await user.save();

    const safeUser =
      user.toObject();

    delete safeUser.password;

    return res.status(200).json({
      success: true,
      message:
        "Pump user updated successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error(
      "UPDATE PUMP USER ERROR:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A user with the same unique information already exists",
      });
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid user information",
      });
    }

    if (
      error?.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user identifier",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update pump user",
    });
  }
};

/* =====================================================
   DELETE PUMP USER

   Recovery snapshot + physical deletion are performed
   inside the SAME MongoDB transaction.

   IMPORTANT:
   password is explicitly selected because
   User.password uses select:false.
===================================================== */

export const deletePumpUser = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    const userId =
      req.params.userId;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    const pumpId =
      getAuthorizedPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid pump ID is required",
      });
    }

    let deleted = false;

    await session.withTransaction(
      async () => {
        /*
         * IMPORTANT:
         *
         * User.password is select:false
         * in the User schema.
         *
         * Explicitly select +password so the
         * recovery snapshot contains the original
         * hashed password.
         *
         * This allows a restored manager/staff user
         * to log in with the same password.
         */
        const user =
          await User.findOne({
            _id: userId,
            pumpId,
          })
            .select("+password")
            .session(session);

        if (!user) {
          const error =
            new Error(
              "USER_NOT_FOUND"
            );

          error.statusCode = 404;

          throw error;
        }

        if (
          user.role === "owner" ||
          user.role === "superadmin"
        ) {
          const error =
            new Error(
              "PROTECTED_USER"
            );

          error.statusCode = 403;

          throw error;
        }

        await createDeletedRecord({
          document: user,

          originalCollection:
            User.collection.name,

          originalModel:
            "User",

          pumpId:
            user.pumpId,

          deletedBy:
            getAuthenticatedUserId(
              req
            ),

          req,

          deletionReason:
            "Pump user deleted by administrator",

          session,
        });

        const deleteResult =
          await User.deleteOne(
            {
              _id: user._id,
              pumpId,
            },
            {
              session,
            }
          );

        if (
          deleteResult.deletedCount !==
          1
        ) {
          const error =
            new Error(
              "DELETE_FAILED"
            );

          error.statusCode = 500;

          throw error;
        }

        deleted = true;
      }
    );

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message:
          "Unable to delete pump user",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Pump user deleted successfully and moved to recovery",
    });
  } catch (error) {
    console.error(
      "DELETE PUMP USER ERROR:",
      error
    );

    if (
      error?.statusCode ===
      404
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Pump user not found",
      });
    }

    if (
      error?.statusCode ===
      403
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Owner and superadmin accounts cannot be deleted from this section",
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A record with the same unique information already exists",
      });
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user information",
      });
    }

    if (
      error?.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user identifier",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete pump user",
    });
  } finally {
    await session.endSession();
  }
};

/* =====================================================
   GET ALL CLIENTS
===================================================== */

export const getClients = async (
  req,
  res
) => {
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
      message:
        "Unable to load clients",
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

    const client =
      await Client.findById(
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
        message:
          "Client not found",
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
      message:
        "Unable to load client",
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
    } = req.body;

    if (!normalizeString(pumpName)) {
      return res.status(400).json({
        success: false,
        message:
          "Pump name is required",
      });
    }

    if (!normalizeString(ownerName)) {
      return res.status(400).json({
        success: false,
        message:
          "Owner name is required",
      });
    }

    const normalizedEmail =
      normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Owner email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message:
          "Client password is required",
      });
    }

    if (
      String(password).length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Client password must be at least 6 characters",
      });
    }

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
      });
    }

    const existingClient =
      await Client.findOne({
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

    await session.withTransaction(
      async () => {
        const [createdPump] =
          await Pump.create(
            [
              {
                pumpName:
                  normalizeString(
                    pumpName
                  ),
                ownerName:
                  normalizeString(
                    ownerName
                  ),
                phone:
                  normalizeString(
                    phone
                  ),
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
                  ),
                address:
                  normalizeString(
                    address
                  ),
                city:
                  normalizeString(city),
                state:
                  normalizeString(
                    state
                  ),
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
                  normalizeString(
                    ownerName
                  ),
                email:
                  normalizedEmail,
                password,
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
                  normalizeString(
                    pumpName
                  ),
                ownerName:
                  normalizeString(
                    ownerName
                  ),
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
                  plan || "standard",
                status: "active",
                subscriptionStart:
                  subscriptionStart ||
                  new Date(),
                subscriptionEnd:
                  subscriptionEnd ||
                  null,
                notes:
                  normalizeString(
                    notes
                  ),
                createdBy:
                  getAuthenticatedUserId(
                    req
                  ),
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
        email:
          normalizedEmail,
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
      .status(
        error?.code === 11000
          ? 409
          : 500
      )
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
        message:
          "Invalid client ID",
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

        if (email !== undefined) {
          const normalizedEmail =
            normalizeEmail(email);

          if (!normalizedEmail) {
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

          client.pumpName =
            value;

          if (pump) {
            pump.pumpName =
              value;
          }
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

          client.ownerName =
            value;

          if (pump) {
            pump.ownerName =
              value;
          }

          if (owner) {
            owner.name =
              value;
          }
        }

        if (phone !== undefined) {
          client.phone =
            normalizeString(phone);

          if (pump) {
            pump.phone =
              normalizeString(
                phone
              );
          }
        }

        if (address !== undefined) {
          client.address =
            normalizeString(
              address
            );

          if (pump) {
            pump.address =
              normalizeString(
                address
              );
          }
        }

        if (plan !== undefined) {
          client.plan = plan;
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

        if (notes !== undefined) {
          client.notes =
            normalizeString(notes);
        }

        if (pump) {
          if (
            companyName !==
            undefined
          ) {
            pump.companyName =
              normalizeString(
                companyName
              );
          }

          if (
            dealerCode !==
            undefined
          ) {
            pump.dealerCode =
              normalizeString(
                dealerCode
              );
          }

          if (gstin !== undefined) {
            pump.gstin =
              normalizeString(
                gstin
              );
          }

          if (city !== undefined) {
            pump.city =
              normalizeString(city);
          }

          if (state !== undefined) {
            pump.state =
              normalizeString(
                state
              );
          }

          if (
            pincode !== undefined
          ) {
            pump.pincode =
              normalizeString(
                pincode
              );
          }
        }

        if (status !== undefined) {
          if (
            ![
              "active",
              "inactive",
              "expired",
            ].includes(status)
          ) {
            const error =
              new Error(
                "INVALID_STATUS"
              );

            error.statusCode = 400;
            throw error;
          }

          client.status =
            status;

          const active =
            status === "active";

          if (pump) {
            pump.active =
              active;
          }

          if (owner) {
            owner.active =
              active;
          }
        }

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

        updatedClient =
          client;
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
          "Client not found",
        409:
          "Another user already uses this email",
      };

      return res.status(
        error.statusCode
      ).json({
        success: false,
        message:
          messages[
            error.statusCode
          ] ||
          "Unable to update client",
      });
    }

    return res
      .status(
        error?.code === 11000
          ? 409
          : 500
      )
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

export const updateClientStatus =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const { status } =
        req.body;

      if (
        ![
          "active",
          "inactive",
          "expired",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status",
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

          client.status =
            status;

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

          updatedClient =
            client;
        }
      );

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

      if (
        error?.statusCode ===
        404
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Client not found",
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

   Deletes:
   - Owner User
   - Pump
   - Client

   IMPORTANT:
   All three recovery records receive the SAME
   deletionGroupId.

   This allows the recovery controller to restore
   the complete client + pump + owner relationship
   atomically instead of restoring only one record.

   All recovery snapshots and physical deletions happen
   inside ONE MongoDB transaction.
===================================================== */

export const deleteClient = async (
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
        message:
          "Invalid client ID",
      });
    }

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

        /*
         * IMPORTANT:
         *
         * User.password is select:false
         * in the User schema.
         *
         * Explicitly select it so the recovery
         * snapshot contains the complete owner
         * account and can later restore login
         * credentials.
         */
        const owner =
          await User.findById(
            client.ownerUserId
          )
            .select("+password")
            .session(session);

        const pump =
          await Pump.findById(
            client.pumpId
          ).session(session);

        /*
         * A Client deletion must always have
         * its linked owner and pump available.
         *
         * Without these records, grouped recovery
         * could restore a broken relationship.
         */

        if (!owner || !pump) {
          const error =
            new Error(
              "CLIENT_RELATIONSHIP_INCOMPLETE"
            );

          error.statusCode = 409;

          throw error;
        }

        /*
         * One logical deletion operation
         * gets ONE group ID.
         *
         * Client + Pump + Owner User
         * all share this same ID.
         */

        const deletionGroupId =
          generateDeletionGroupId();

        const deletedBy =
          getAuthenticatedUserId(
            req
          );

        /*
         * Owner recovery snapshot.
         */

        await createDeletedRecord({
          document: owner,

          originalCollection:
            User.collection.name,

          originalModel:
            "User",

          pumpId:
            client.pumpId,

          deletedBy,

          req,

          session,

          deletionGroupId,

          deletionReason:
            "Owner user deleted as part of client deletion",
        });

        /*
         * Pump recovery snapshot.
         *
         * Pump itself does not contain pumpId.
         * DeletedRecord.pumpId stores Pump._id.
         */

        await createDeletedRecord({
          document: pump,

          originalCollection:
            Pump.collection.name,

          originalModel:
            "Pump",

          pumpId:
            pump._id,

          deletedBy,

          req,

          session,

          deletionGroupId,

          deletionReason:
            "Pump deleted as part of client deletion",
        });

        /*
         * Client recovery snapshot.
         */

        await createDeletedRecord({
          document: client,

          originalCollection:
            Client.collection.name,

          originalModel:
            "Client",

          pumpId:
            client.pumpId,

          deletedBy,

          req,

          session,

          deletionGroupId,

          deletionReason:
            "Client deleted by super admin",
        });

        /*
         * Physical deletions.
         *
         * Everything is inside the same transaction.
         *
         * If any deletion fails:
         * → recovery snapshots rollback
         * → original records remain
         */

        const ownerDeleteResult =
          await User.deleteOne(
            {
              _id: client.ownerUserId,
              pumpId: client.pumpId,
            },
            {
              session,
            }
          );

        if (
          ownerDeleteResult.deletedCount !==
          1
        ) {
          const error =
            new Error(
              "OWNER_DELETE_FAILED"
            );

          error.statusCode = 500;

          throw error;
        }

        const pumpDeleteResult =
          await Pump.deleteOne(
            {
              _id: client.pumpId,
            },
            {
              session,
            }
          );

        if (
          pumpDeleteResult.deletedCount !==
          1
        ) {
          const error =
            new Error(
              "PUMP_DELETE_FAILED"
            );

          error.statusCode = 500;

          throw error;
        }

        const clientDeleteResult =
          await Client.deleteOne(
            {
              _id: client._id,
              pumpId: pump._id,
              ownerUserId: owner._id,
            },
            {
              session,
            }
          );

        if (
          clientDeleteResult.deletedCount !==
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
        "Client deleted successfully and moved to recovery",
    });
  } catch (error) {
    console.error(
      "DELETE CLIENT ERROR:",
      error
    );

    if (
      error?.statusCode ===
      404
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Client not found",
      });
    }

    if (
      error?.statusCode ===
      409 &&
      error?.message ===
        "CLIENT_RELATIONSHIP_INCOMPLETE"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Client cannot be deleted because its linked owner or pump record is missing",
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A recovery record with the same unique information already exists",
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
      });
    }
  };

/* =====================================================
   GET ALL USERS
===================================================== */

export const getSuperAdminUsers =
  async (req, res) => {
    try {
      const users =
        await User.find()
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
        message:
          "Unable to load users",
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

      const filter = {};

      if (
        status &&
        [
          "pending",
          "approved",
          "rejected",
        ].includes(status)
      ) {
        filter.status =
          status;
      }

      if (search?.trim()) {
        const searchValue =
          search.trim();

        filter.$or = [
          {
            ownerName: {
              $regex:
                searchValue,
              $options: "i",
            },
          },
          {
            pumpName: {
              $regex:
                searchValue,
              $options: "i",
            },
          },
          {
            email: {
              $regex:
                searchValue,
              $options: "i",
            },
          },
          {
            phone: {
              $regex:
                searchValue,
              $options: "i",
            },
          },
        ];
      }

      const requests =
        await RegistrationRequest.find(
          filter
        )
          .populate(
            "approvedBy",
            "name email"
          )
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,
        count:
          requests.length,
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
        await RegistrationRequest.countDocuments(
          {
            status:
              "pending",
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

      let createdClient = null;
      let createdRequest = null;
      let pumpCode = null;

      await session.withTransaction(
        async () => {
          const request =
            await RegistrationRequest.findById(
              req.params.id
            )
              .select(
                "+password"
              )
              .session(session);

          if (!request) {
            const error =
              new Error(
                "REQUEST_NOT_FOUND"
              );

            error.statusCode =
              404;
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

            error.statusCode =
              400;

            error.requestStatus =
              request.status;

            throw error;
          }

          const normalizedEmail =
            normalizeEmail(
              request.email
            );

          if (!normalizedEmail) {
            const error =
              new Error(
                "INVALID_EMAIL"
              );

            error.statusCode =
              400;

            throw error;
          }

          const existingUser =
            await User.findOne({
              email:
                normalizedEmail,
            }).session(
              session
            );

          if (existingUser) {
            const error =
              new Error(
                "DUPLICATE_USER"
              );

            error.statusCode =
              409;

            throw error;
          }

          const existingClient =
            await Client.findOne({
              email:
                normalizedEmail,
            }).session(
              session
            );

          if (existingClient) {
            const error =
              new Error(
                "DUPLICATE_CLIENT"
              );

            error.statusCode =
              409;

            throw error;
          }

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
                    getAuthenticatedUserId(
                      req
                    ),
                },
              ],
              { session }
            );

          request.status =
            "approved";

          request.approvedBy =
            getAuthenticatedUserId(
              req
            );

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

          createdRequest =
            request;
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Registration request approved successfully",
        request:
          createdRequest,
        client:
          createdClient,
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
        if (
          error.statusCode ===
          404
        ) {
          return res
            .status(404)
            .json({
              success: false,
              message:
                "Registration request not found",
            });
        }

        if (
          error.statusCode ===
          400
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                `Request has already been ${error.requestStatus}`,
            });
        }

        if (
          error.statusCode ===
          409
        ) {
          return res
            .status(409)
            .json({
              success: false,
              message:
                "A user or client with this email already exists",
            });
        }
      }

      return res
        .status(
          error?.code ===
            11000
            ? 409
            : 500
        )
        .json({
          success: false,
          message:
            error?.code ===
            11000
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
      } = req.body;

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

      if (
        request.status !==
        "pending"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Request has already been ${request.status}`,
        });
      }

      request.status =
        "rejected";

      if (
        rejectionReason !==
        undefined
      ) {
        request.rejectionReason =
          normalizeString(
            rejectionReason
          );
      }

      request.approvedBy =
        getAuthenticatedUserId(
          req
        );

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