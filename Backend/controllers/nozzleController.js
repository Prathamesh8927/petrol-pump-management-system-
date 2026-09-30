import mongoose from "mongoose";

import Nozzle from "../models/Nozzle.js";
import NozzleReading from "../models/NozzleReading.js";
import FuelPrice from "../models/FuelPrice.js";
import FuelStock from "../models/FuelStock.js";
import Sale from "../models/Sale.js";
import User from "../models/User.js";

import {
  createDeletedRecord,
} from "../services/recoveryService.js";

/* =====================================================
   CONSTANTS
===================================================== */

const ALLOWED_SHIFTS = new Set([
  "morning",
  "evening",
  "night",
]);

const ALLOWED_PAYMENT_METHODS = new Set([
  "cash",
  "upi",
  "card",
  "credit",
]);

const ALLOWED_STAFF_ROLES = new Set([
  "owner",
  "manager",
  "staff",
]);

const ALLOWED_NOZZLE_STATUS = new Set([
  "active",
  "inactive",
]);

const ALLOWED_FUEL_TYPES = new Set([
  "petrol",
  "diesel",
]);

const MAX_HISTORY_LIMIT = 100;
const DEFAULT_HISTORY_LIMIT = 50;

const MAX_NOZZLE_NUMBER_LENGTH = 50;
const MAX_NAME_LENGTH = 100;
const MAX_NOTE_LENGTH = 500;

/* =====================================================
   AUTH / ID HELPERS
===================================================== */

const getPumpId = (req) =>
  req.user?.pumpId?._id ||
  req.user?.pumpId ||
  null;

const getUserId = (req) =>
  req.user?._id ||
  req.user?.userId ||
  null;

/* =====================================================
   DATE HELPERS

   IMPORTANT:
   Server may run in UTC on Render.
   Business operates in India.

   Therefore dates are always generated using
   Asia/Kolkata instead of server local timezone.
===================================================== */

const getIndiaDate = () => {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());
};

/* =====================================================
   OBJECT ID
===================================================== */

const normalizeObjectId = (value) => {
  if (!value) {
    return null;
  }

  if (
    value instanceof mongoose.Types.ObjectId
  ) {
    return value;
  }

  if (
    mongoose.Types.ObjectId.isValid(value)
  ) {
    return new mongoose.Types.ObjectId(
      value
    );
  }

  return null;
};

/* =====================================================
   STRING HELPERS
===================================================== */

const normalizeFuelType = (value) => {
  const fuel = String(value || "")
    .trim()
    .toLowerCase();

  if (
    fuel === "diesel" ||
    fuel === "disel"
  ) {
    return "diesel";
  }

  if (fuel === "petrol") {
    return "petrol";
  }

  return fuel;
};

const normalizeShiftName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, 50);

const normalizePaymentMethod = (value) =>
  String(value || "cash")
    .trim()
    .toLowerCase();

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

/* =====================================================
   NUMBER HELPERS
===================================================== */

const toNonNegativeNumber = (value) => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
};

const roundToTwo = (value) =>
  Number(Number(value).toFixed(2));

/* =====================================================
   DATE VALIDATION
===================================================== */

const isValidDateString = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

/* =====================================================
   VALIDATION HELPERS
===================================================== */

const isValidPaymentMethod = (
  value
) =>
  ALLOWED_PAYMENT_METHODS.has(
    value
  );

/* =====================================================
   GET NOZZLES
===================================================== */

export const getNozzles = async (
  req,
  res
) => {
  try {
    const pumpId = getPumpId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message:
          "Pump information not found",
        nozzles: [],
      });
    }

    const nozzles =
      await Nozzle.find({
        pumpId,
      })
        .sort({
          createdAt: 1,
          _id: 1,
        })
        .lean();

    const normalizedNozzles =
      nozzles.map((nozzle) => ({
        ...nozzle,

        fuelType:
          normalizeFuelType(
            nozzle.fuelType
          ),

        currentReading:
          Number(
            nozzle.currentReading ?? 0
          ),

        status:
          normalizeStatus(
            nozzle.status ||
              "active"
          ),
      }));

    return res.status(200).json({
      success: true,

      count:
        normalizedNozzles.length,

      nozzles:
        normalizedNozzles,
    });
  } catch (error) {
    console.error(
      "GET NOZZLES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load nozzles",
      nozzles: [],
    });
  }
};

/* =====================================================
   ADD NOZZLE
===================================================== */

export const addNozzle = async (
  req,
  res
) => {
  try {
    const pumpId = getPumpId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message:
          "Pump information not found",
      });
    }

    const {
      nozzleNumber,
      name = "",
      machineName = "",
      fuelType,
      currentReading,
      openingReading,
      status,
    } = req.body || {};

    const cleanNumber = String(
      nozzleNumber || ""
    ).trim();

    if (!cleanNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Nozzle number is required",
      });
    }

    if (
      cleanNumber.length >
      MAX_NOZZLE_NUMBER_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nozzle number is too long",
      });
    }

    const fuel =
      normalizeFuelType(fuelType);

    if (
      !ALLOWED_FUEL_TYPES.has(
        fuel
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fuel type must be Petrol or Diesel",
      });
    }

    const initialReading =
      toNonNegativeNumber(
        currentReading ??
          openingReading ??
          0
      );

    if (
      initialReading === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Opening reading is invalid",
      });
    }

    const cleanName = String(
      name ||
        machineName ||
        ""
    ).trim();

    if (
      cleanName.length >
      MAX_NAME_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nozzle name is too long",
      });
    }

    const normalizedStatus =
      status === undefined
        ? "active"
        : normalizeStatus(status);

    if (
      !ALLOWED_NOZZLE_STATUS.has(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid nozzle status",
      });
    }

    const nozzle =
      await Nozzle.create({
        pumpId,

        nozzleNumber:
          cleanNumber,

        name:
          cleanName,

        fuelType:
          fuel,

        currentReading:
          initialReading,

        status:
          normalizedStatus,
      });

    return res.status(201).json({
      success: true,

      message:
        "Nozzle added successfully",

      nozzle,
    });
  } catch (error) {
    console.error(
      "ADD NOZZLE ERROR:",
      error
    );

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Nozzle number already exists for this pump",
      });
    }

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid nozzle data",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to add nozzle",
    });
  }
};

/* =====================================================
   UPDATE NOZZLE
===================================================== */

export const updateNozzle = async (
  req,
  res
) => {
  try {
    const pumpId =
      getPumpId(req);

    const { id } =
      req.params;

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message:
          "Pump information not found",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid nozzle ID",
      });
    }

    const nozzle =
      await Nozzle.findOne({
        _id: id,
        pumpId,
      });

    if (!nozzle) {
      return res.status(404).json({
        success: false,
        message:
          "Nozzle not found",
      });
    }

    const {
      nozzleNumber,
      name,
      machineName,
      fuelType,
      active,
      status,
    } = req.body || {};

    /* =================================================
       NOZZLE NUMBER
    ================================================= */

    if (
      nozzleNumber !== undefined
    ) {
      const cleanNumber =
        String(
          nozzleNumber
        ).trim();

      if (!cleanNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Nozzle number is required",
        });
      }

      if (
        cleanNumber.length >
        MAX_NOZZLE_NUMBER_LENGTH
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Nozzle number is too long",
        });
      }

      if (
        cleanNumber !==
        nozzle.nozzleNumber
      ) {
        const duplicate =
          await Nozzle.findOne({
            pumpId,

            nozzleNumber:
              cleanNumber,

            _id: {
              $ne:
                nozzle._id,
            },
          }).lean();

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Nozzle number already exists for this pump",
          });
        }
      }

      nozzle.nozzleNumber =
        cleanNumber;
    }

    /* =================================================
       NAME
    ================================================= */

    if (
      name !== undefined ||
      machineName !== undefined
    ) {
      const value =
        name !== undefined
          ? name
          : machineName;

      const cleanName =
        String(
          value || ""
        ).trim();

      if (
        cleanName.length >
        MAX_NAME_LENGTH
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Nozzle name is too long",
        });
      }

      nozzle.name =
        cleanName;
    }

    /* =================================================
       FUEL TYPE

       Fuel type cannot be changed after
       historical readings exist.
    ================================================= */

    if (
      fuelType !== undefined
    ) {
      const normalizedFuel =
        normalizeFuelType(
          fuelType
        );

      if (
        !ALLOWED_FUEL_TYPES.has(
          normalizedFuel
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid fuel type",
        });
      }

      if (
        normalizedFuel !==
        normalizeFuelType(
          nozzle.fuelType
        )
      ) {
        const historicalReading =
          await NozzleReading.exists({
            pumpId,

            nozzleId:
              nozzle._id,
          });

        if (historicalReading) {
          return res.status(409).json({
            success: false,
            message:
              "Fuel type cannot be changed because this nozzle has historical readings.",
          });
        }

        nozzle.fuelType =
          normalizedFuel;
      }
    }

    /* =================================================
       STATUS
    ================================================= */

    let normalizedStatus =
      status !== undefined
        ? normalizeStatus(status)
        : null;

    if (
      normalizedStatus === null &&
      active !== undefined
    ) {
      normalizedStatus =
        active === true ||
        active === "true"
          ? "active"
          : "inactive";
    }

    if (
      normalizedStatus !== null
    ) {
      if (
        !ALLOWED_NOZZLE_STATUS.has(
          normalizedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid nozzle status",
        });
      }

      nozzle.status =
        normalizedStatus;
    }

    await nozzle.save();

    return res.status(200).json({
      success: true,

      message:
        "Nozzle updated successfully",

      nozzle,
    });
  } catch (error) {
    console.error(
      "UPDATE NOZZLE ERROR:",
      error
    );

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Nozzle number already exists for this pump",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update nozzle",
    });
  }
};

/* =====================================================
   DELETE NOZZLE

   IMPORTANT:
   Nozzle with historical readings/sales is not
   physically deleted.

   This preserves historical accounting data.

   Nozzle without history is moved to recovery
   before permanent removal.
===================================================== */

export const deleteNozzle =
  async (req, res) => {
    let session = null;

    try {
      const pumpId =
        getPumpId(req);

      const userId =
        getUserId(req);

      const { id } =
        req.params;

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump information not found",
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid nozzle ID",
        });
      }

      session =
        await mongoose.startSession();

      let deletedNozzle = null;

      await session.withTransaction(
        async () => {
          const nozzle =
            await Nozzle.findOne({
              _id: id,
              pumpId,
            }).session(
              session
            );

          if (!nozzle) {
            const error =
              new Error(
                "Nozzle not found"
              );

            error.code =
              "NOZZLE_NOT_FOUND";

            throw error;
          }

          const hasReadings =
            await NozzleReading.exists({
              pumpId,

              nozzleId:
                nozzle._id,
            }).session(
              session
            );

          if (hasReadings) {
            const error =
              new Error(
                "NOZZLE_HAS_READINGS"
              );

            error.code =
              "NOZZLE_HAS_READINGS";

            throw error;
          }

          const hasSales =
            await Sale.exists({
              pumpId,

              nozzleId:
                nozzle._id,
            }).session(
              session
            );

          if (hasSales) {
            const error =
              new Error(
                "NOZZLE_HAS_SALES"
              );

            error.code =
              "NOZZLE_HAS_SALES";

            throw error;
          }

          await createDeletedRecord({
            document:
              nozzle,

            originalCollection:
              Nozzle.collection.name,

            originalModel:
              "Nozzle",

            pumpId,

            deletedBy:
              userId,

            req,

            deletionReason:
              "Nozzle deleted by user",

            session,
          });

          deletedNozzle =
            await Nozzle.findOneAndDelete(
              {
                _id: id,
                pumpId,
              },
              {
                session,
              }
            );

          if (!deletedNozzle) {
            const error =
              new Error(
                "Nozzle delete conflict"
              );

            error.code =
              "NOZZLE_DELETE_CONFLICT";

            throw error;
          }
        }
      );

      return res.status(200).json({
        success: true,

        message:
          "Nozzle deleted successfully and moved to Deleted Data for recovery.",

        nozzle:
          deletedNozzle,
      });
    } catch (error) {
      console.error(
        "DELETE NOZZLE ERROR:",
        error
      );

      if (
        error?.code ===
        "NOZZLE_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Nozzle not found",
        });
      }

      if (
        error?.code ===
        "NOZZLE_HAS_READINGS"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This nozzle has historical readings and cannot be deleted. Set it to inactive instead so historical records remain safe.",
        });
      }

      if (
        error?.code ===
        "NOZZLE_HAS_SALES"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This nozzle has historical sales and cannot be deleted. Set it to inactive instead so historical records remain safe.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete nozzle",
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  };

/* =====================================================
   ADD FINAL SHIFT NOZZLE READING

   BUSINESS FLOW:

   Staff selects:
   - Nozzle
   - Shift
   - Staff
   - Final reading
   - Payment method
   - Date

   Backend calculates:
   openingReading
   litresSold
   fuel price
   total amount

   Then atomically:
   1. Creates nozzle reading
   2. Creates sale
   3. Deducts fuel stock
   4. Updates nozzle current reading

   All operations are inside one MongoDB transaction.
===================================================== */

export const addNozzleReading =
  async (req, res) => {
    let session = null;

    try {
      const pumpId =
        getPumpId(req);

      const userId =
        getUserId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump information not found",
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found",
        });
      }

      const {
        nozzleId,
        shiftName,
        shift,
        staffId,
        employeeId,
        closingReading,
        reading,
        readingDate,
        date,
        paymentMethod =
          "cash",
        note = "",
      } = req.body || {};

      /* =================================================
         NOZZLE
      ================================================= */

      const finalNozzleId =
        normalizeObjectId(
          nozzleId
        );

      if (!finalNozzleId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid nozzle",
        });
      }

      /* =================================================
         SHIFT
      ================================================= */

      const finalShift =
        normalizeShiftName(
          shiftName || shift
        );

      if (
        !ALLOWED_SHIFTS.has(
          finalShift
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid shift. Select Morning, Evening, or Night.",
        });
      }

      /* =================================================
         STAFF
      ================================================= */

      const finalStaffId =
        normalizeObjectId(
          staffId || employeeId
        );

      if (!finalStaffId) {
        return res.status(400).json({
          success: false,
          message:
            "Valid staff member is required",
        });
      }

      /* =================================================
         PAYMENT METHOD
      ================================================= */

      const payment =
        normalizePaymentMethod(
          paymentMethod
        );

      if (
        !isValidPaymentMethod(
          payment
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment method",
        });
      }

      /* =================================================
         DATE
      ================================================= */

      const finalDate =
        String(
          readingDate ||
            date ||
            getIndiaDate()
        ).trim();

      if (
        !isValidDateString(
          finalDate
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid reading date. Use YYYY-MM-DD format.",
        });
      }

      /* =================================================
         CLOSING READING
      ================================================= */

      const finalReading =
        toNonNegativeNumber(
          closingReading ??
            reading
        );

      if (
        finalReading === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Enter valid closing reading",
        });
      }

      /* =================================================
         NOTE
      ================================================= */

      const cleanNote =
        String(
          note || ""
        ).trim();

      if (
        cleanNote.length >
        MAX_NOTE_LENGTH
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Note cannot exceed 500 characters",
        });
      }

      /* =================================================
         START TRANSACTION
      ================================================= */

      session =
        await mongoose.startSession();

      let transactionResult =
        null;

      await session.withTransaction(
        async () => {
          /* =================================================
             VERIFY STAFF

             Staff MUST:
             - belong to same pump
             - be active
             - have valid business role
          ================================================= */

          const staff =
            await User.findOne({
              _id:
                finalStaffId,

              pumpId,

              active: true,

              role: {
                $in:
                  Array.from(
                    ALLOWED_STAFF_ROLES
                  ),
              },
            })
              .select(
                "_id name email role pumpId active"
              )
              .session(
                session
              );

          if (!staff) {
            const error =
              new Error(
                "Staff member not found or inactive"
              );

            error.code =
              "STAFF_NOT_FOUND";

            throw error;
          }

          const staffName =
            String(
              staff.name ||
                staff.email ||
                "Staff"
            )
              .trim()
              .slice(
                0,
                MAX_NAME_LENGTH
              );

          /* =================================================
             VERIFY NOZZLE
          ================================================= */

          const nozzle =
            await Nozzle.findOne({
              _id:
                finalNozzleId,

              pumpId,

              status:
                "active",
            }).session(
              session
            );

          if (!nozzle) {
            const error =
              new Error(
                "Nozzle not found or inactive"
              );

            error.code =
              "NOZZLE_NOT_FOUND_OR_INACTIVE";

            throw error;
          }

          const fuelType =
            normalizeFuelType(
              nozzle.fuelType
            );

          if (
            !ALLOWED_FUEL_TYPES.has(
              fuelType
            )
          ) {
            const error =
              new Error(
                "Invalid fuel type"
              );

            error.code =
              "INVALID_FUEL_TYPE";

            throw error;
          }

          /* =================================================
             OPENING READING

             The currentReading represents the latest
             confirmed reading for this nozzle.

             Example:

             Morning:
             opening 1000
             closing 1200

             Evening:
             opening 1200
             closing 1400

             Night:
             opening 1400
             closing 1600
          ================================================= */

          const opening =
            toNonNegativeNumber(
              nozzle.currentReading
            );

          if (
            opening === null
          ) {
            const error =
              new Error(
                "Current nozzle reading is invalid"
              );

            error.code =
              "INVALID_OPENING_READING";

            throw error;
          }

          if (
            finalReading <=
            opening
          ) {
            const error =
              new Error(
                "Closing reading must be greater than opening reading"
              );

            error.code =
              "INVALID_CLOSING_READING";

            error.opening =
              opening;

            throw error;
          }

          const litresSold =
            roundToTwo(
              finalReading -
                opening
            );

          if (
            litresSold <= 0
          ) {
            const error =
              new Error(
                "Invalid litres sold"
              );

            error.code =
              "INVALID_LITRES_SOLD";

            throw error;
          }

          /* =================================================
             DUPLICATE SHIFT PROTECTION

             One nozzle can have only one final reading
             for a particular date + shift.
          ================================================= */

          const existingReading =
            await NozzleReading.findOne(
              {
                pumpId,

                nozzleId:
                  nozzle._id,

                readingDate:
                  finalDate,

                shiftName:
                  finalShift,
              }
            ).session(
              session
            );

          if (existingReading) {
            const error =
              new Error(
                "Final reading already exists"
              );

            error.code =
              "SHIFT_READING_ALREADY_EXISTS";

            throw error;
          }

          /* =================================================
             FUEL PRICE
          ================================================= */

          const priceRecord =
            await FuelPrice.findOne({
              pumpId,

              fuelType,
            }).session(
              session
            );

          if (!priceRecord) {
            const error =
              new Error(
                "Fuel price is not configured"
              );

            error.code =
              "FUEL_PRICE_NOT_CONFIGURED";

            throw error;
          }

          const pricePerLitre =
            toNonNegativeNumber(
              priceRecord.price
            );

          if (
            pricePerLitre === null ||
            pricePerLitre <= 0
          ) {
            const error =
              new Error(
                "Configured fuel price is invalid"
              );

            error.code =
              "INVALID_FUEL_PRICE";

            throw error;
          }

          /* =================================================
             TOTAL AMOUNT
          ================================================= */

          const totalAmount =
            roundToTwo(
              litresSold *
                pricePerLitre
            );

          /* =================================================
             FUEL STOCK
          ================================================= */

          const stock =
            await FuelStock.findOne({
              pumpId,

              fuelType,
            }).session(
              session
            );

          if (!stock) {
            const error =
              new Error(
                "Fuel stock not found"
              );

            error.code =
              "FUEL_STOCK_NOT_FOUND";

            throw error;
          }

          const stockBefore =
            toNonNegativeNumber(
              stock.currentStock
            );

          if (
            stockBefore === null
          ) {
            const error =
              new Error(
                "Current fuel stock is invalid"
              );

            error.code =
              "INVALID_FUEL_STOCK";

            throw error;
          }

          if (
            stockBefore <
            litresSold
          ) {
            const error =
              new Error(
                "Insufficient fuel stock"
              );

            error.code =
              "INSUFFICIENT_FUEL_STOCK";

            error.available =
              stockBefore;

            error.required =
              litresSold;

            throw error;
          }

          /* =================================================
             CREATE NOZZLE READING
          ================================================= */

          const createdReadings =
            await NozzleReading.create(
              [
                {
                  pumpId,

                  nozzleId:
                    nozzle._id,

                  shiftName:
                    finalShift,

                  staffId:
                    staff._id,

                  staffName,

                  fuelType,

                  openingReading:
                    opening,

                  closingReading:
                    finalReading,

                  litresSold,

                  pricePerLitre,

                  totalAmount,

                  readingDate:
                    finalDate,

                  paymentMethod:
                    payment,

                  note:
                    cleanNote,

                  createdBy:
                    userId,
                },
              ],
              {
                session,
              }
            );

          const newReading =
            createdReadings[0];

          /* =================================================
             CREATE SALE

             Reading and Sale share the same transaction.
             If either fails, both are rolled back.
          ================================================= */

          const createdSales =
            await Sale.create(
              [
                {
                  pumpId,

                  nozzleId:
                    nozzle._id,

                  readingId:
                    newReading._id,

                  fuelType,

                  quantity:
                    litresSold,

                  pricePerLitre,

                  totalAmount,

                  paymentMethod:
                    payment,

                  saleDate:
                    finalDate,

                  source:
                    "nozzle",

                  note:
                    cleanNote,

                  createdBy:
                    userId,
                },
              ],
              {
                session,
              }
            );

          const newSale =
            createdSales[0];

          /* =================================================
             UPDATE FUEL STOCK

             The $gte condition prevents stock from becoming
             negative even during concurrent requests.
          ================================================= */

          const updatedStock =
            await FuelStock.findOneAndUpdate(
              {
                _id:
                  stock._id,

                pumpId,

                fuelType,

                currentStock: {
                  $gte:
                    litresSold,
                },
              },
              {
                $inc: {
                  currentStock:
                    -litresSold,

                  totalSold:
                    litresSold,
                },
              },
              {
                returnDocument:
                  "after",

                runValidators:
                  true,

                session,
              }
            );

          if (!updatedStock) {
            const error =
              new Error(
                "Fuel stock changed while recording the reading"
              );

            error.code =
              "STOCK_UPDATE_CONFLICT";

            throw error;
          }

          /* =================================================
             UPDATE NOZZLE

             currentReading must still equal the opening
             reading.

             This protects against two staff members
             submitting readings simultaneously.
          ================================================= */

          const updatedNozzle =
            await Nozzle.findOneAndUpdate(
              {
                _id:
                  nozzle._id,

                pumpId,

                status:
                  "active",

                currentReading:
                  opening,
              },
              {
                $set: {
                  currentReading:
                    finalReading,
                },
              },
              {
                returnDocument:
                  "after",

                runValidators:
                  true,

                session,
              }
            );

          if (!updatedNozzle) {
            const error =
              new Error(
                "This nozzle was updated by another request"
              );

            error.code =
              "NOZZLE_READING_CONFLICT";

            throw error;
          }

          transactionResult = {
            newReading,

            newSale,

            updatedStock,

            updatedNozzle,

            staff,

            litresSold,

            fuelType,

            pricePerLitre,

            totalAmount,
          };
        }
      );

      /* =================================================
         VERIFY TRANSACTION RESULT
      ================================================= */

      if (
        !transactionResult?.newReading
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Reading transaction completed without a saved reading. Please try again.",
        });
      }

      /* =================================================
         SUCCESS RESPONSE
      ================================================= */

      return res.status(201).json({
        success: true,

        message:
          "Final shift reading and sale recorded successfully",

        reading:
          transactionResult
            .newReading,

        sale:
          transactionResult
            .newSale,

        shift: {
          name:
            transactionResult
              .newReading
              .shiftName,

          staffId:
            transactionResult
              .newReading
              .staffId,

          staffName:
            transactionResult
              .newReading
              .staffName,

          date:
            transactionResult
              .newReading
              .readingDate,
        },

        openingReading:
          transactionResult
            .newReading
            .openingReading,

        closingReading:
          transactionResult
            .newReading
            .closingReading,

        litresSold:
          transactionResult
            .litresSold,

        fuelType:
          transactionResult
            .fuelType,

        pricePerLitre:
          transactionResult
            .pricePerLitre,

        totalAmount:
          transactionResult
            .totalAmount,

        nozzle: {
          currentReading:
            transactionResult
              .updatedNozzle
              .currentReading,
        },

        stock: {
          currentStock:
            transactionResult
              .updatedStock
              .currentStock,
        },
      });
    } catch (error) {
      console.error(
        "ADD NOZZLE READING ERROR:",
        {
          code:
            error?.code,

          message:
            error?.message,

          name:
            error?.name,
        }
      );

      /* =================================================
         KNOWN ERRORS
      ================================================= */

      if (
        error?.code ===
        "STAFF_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Selected staff member was not found, inactive, or does not belong to this pump.",
        });
      }

      if (
        error?.code ===
        "NOZZLE_NOT_FOUND_OR_INACTIVE"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Nozzle not found or inactive",
        });
      }

      if (
        error?.code ===
        "INVALID_FUEL_TYPE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid nozzle fuel type",
        });
      }

      if (
        error?.code ===
        "INVALID_OPENING_READING"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Current nozzle reading is invalid",
        });
      }

      if (
        error?.code ===
        "INVALID_CLOSING_READING"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Closing reading must be greater than ${error.opening}`,
          openingReading:
            error.opening,
        });
      }

      if (
        error?.code ===
        "INVALID_LITRES_SOLD"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid litres sold",
        });
      }

      if (
        error?.code ===
        "SHIFT_READING_ALREADY_EXISTS"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Final reading for this nozzle and shift has already been recorded.",
        });
      }

      if (
        error?.code ===
        "FUEL_PRICE_NOT_CONFIGURED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Fuel price is not configured",
        });
      }

      if (
        error?.code ===
        "INVALID_FUEL_PRICE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Configured fuel price is invalid",
        });
      }

      if (
        error?.code ===
        "FUEL_STOCK_NOT_FOUND"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Fuel stock not found",
        });
      }

      if (
        error?.code ===
        "INVALID_FUEL_STOCK"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Current fuel stock is invalid",
        });
      }

      if (
        error?.code ===
        "INSUFFICIENT_FUEL_STOCK"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient fuel stock. Available: ${error.available}, required: ${error.required}.`,
        });
      }

      if (
        error?.code ===
        "STOCK_UPDATE_CONFLICT"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Fuel stock changed while recording the reading. Please refresh and try again.",
        });
      }

      if (
        error?.code ===
        "NOZZLE_READING_CONFLICT"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This nozzle was updated by another request. Please refresh and enter the final reading again.",
        });
      }

      /* =================================================
         MONGODB DUPLICATE KEY
      ================================================= */

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A final reading already exists for this nozzle and shift.",
        });
      }

      /* =================================================
         MONGOOSE VALIDATION
      ================================================= */

      if (
        error?.name ===
        "ValidationError"
      ) {
        const validationMessages =
          Object.values(
            error.errors || {}
          )
            .map(
              (item) =>
                item?.message
            )
            .filter(Boolean);

        return res.status(400).json({
          success: false,

          message:
            validationMessages.length
              ? validationMessages.join(
                  ", "
                )
              : "Invalid nozzle reading data",
        });
      }

      /* =================================================
         MONGOOSE CAST ERROR
      ================================================= */

      if (
        error?.name ===
        "CastError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid data format",
        });
      }

      /* =================================================
         TRANSACTION / DATABASE ERROR
      ================================================= */

      if (
        error?.errorLabels?.includes(
          "TransientTransactionError"
        ) ||
        error?.errorLabels?.includes(
          "UnknownTransactionCommitResult"
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "The transaction could not be safely completed. Please refresh and try again.",
        });
      }

      /* =================================================
         GENERIC ERROR
      ================================================= */

      return res.status(500).json({
        success: false,

        message:
          error?.message &&
          error.message.length <
            250
            ? error.message
            : "Unable to add final shift reading",
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  };

/* =====================================================
   GET NOZZLE READING HISTORY

   GET /api/nozzles/readings

   Supports:

   ?page=1
   &limit=50
   &date=2026-09-25
   &readingDate=2026-09-25
   &shift=morning
   &shiftName=morning
   &staffId=...
   &employeeId=...
   &nozzleId=...
   &paymentMethod=cash

   Strict pump isolation.
   Server-side pagination.
===================================================== */

export const getNozzleReadings =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump information not found",

          readings: [],
          data: [],
          history: [],
        });
      }

      /* =================================================
         PAGINATION
      ================================================= */

      const parsedPage =
        Number.parseInt(
          req.query?.page,
          10
        );

      const parsedLimit =
        Number.parseInt(
          req.query?.limit,
          10
        );

      const page =
        Number.isFinite(
          parsedPage
        ) &&
        parsedPage > 0
          ? parsedPage
          : 1;

      const limit =
        Number.isFinite(
          parsedLimit
        ) &&
        parsedLimit > 0
          ? Math.min(
              parsedLimit,
              MAX_HISTORY_LIMIT
            )
          : DEFAULT_HISTORY_LIMIT;

      const skip =
        (page - 1) *
        limit;

      /* =================================================
         QUERY
      ================================================= */

      const {
        date,
        readingDate,
        shift,
        shiftName,
        staffId,
        employeeId,
        nozzleId,
        paymentMethod,
      } = req.query || {};

      const query = {
        pumpId,
      };

      /* =================================================
         DATE FILTER
      ================================================= */

      const requestedDate =
        date !== undefined
          ? date
          : readingDate;

      if (
        requestedDate !==
          undefined &&
        String(
          requestedDate
        ).trim() !== ""
      ) {
        const cleanDate =
          String(
            requestedDate
          ).trim();

        if (
          !isValidDateString(
            cleanDate
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid date. Use YYYY-MM-DD format.",
          });
        }

        query.readingDate =
          cleanDate;
      }

      /* =================================================
         SHIFT FILTER
      ================================================= */

      const requestedShift =
        shift !== undefined
          ? shift
          : shiftName;

      if (
        requestedShift !==
          undefined &&
        String(
          requestedShift
        ).trim() !== ""
      ) {
        const cleanShift =
          normalizeShiftName(
            requestedShift
          );

        if (
          !ALLOWED_SHIFTS.has(
            cleanShift
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid shift. Use morning, evening, or night.",
          });
        }

        query.shiftName =
          cleanShift;
      }

      /* =================================================
         STAFF FILTER
      ================================================= */

      const requestedStaff =
        staffId !== undefined
          ? staffId
          : employeeId;

      if (
        requestedStaff !==
          undefined &&
        String(
          requestedStaff
        ).trim() !== ""
      ) {
        const normalizedStaffId =
          normalizeObjectId(
            requestedStaff
          );

        if (!normalizedStaffId) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid staff ID",
          });
        }

        query.staffId =
          normalizedStaffId;
      }

      /* =================================================
         NOZZLE FILTER
      ================================================= */

      if (
        nozzleId !== undefined &&
        String(
          nozzleId
        ).trim() !== ""
      ) {
        const normalizedNozzleId =
          normalizeObjectId(
            nozzleId
          );

        if (!normalizedNozzleId) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid nozzle ID",
          });
        }

        query.nozzleId =
          normalizedNozzleId;
      }

      /* =================================================
         PAYMENT FILTER
      ================================================= */

      if (
        paymentMethod !==
          undefined &&
        String(
          paymentMethod
        ).trim() !== ""
      ) {
        const cleanPayment =
          normalizePaymentMethod(
            paymentMethod
          );

        if (
          !isValidPaymentMethod(
            cleanPayment
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid payment method",
          });
        }

        query.paymentMethod =
          cleanPayment;
      }

      /* =================================================
         DATABASE

         Both queries use the exact same pump-scoped
         query to prevent cross-pump data leakage.
      ================================================= */

      const [
        totalRecords,
        readings,
      ] = await Promise.all([
        NozzleReading.countDocuments(
          query
        ),

        NozzleReading.find(query)
          .populate(
            "nozzleId",
            "nozzleNumber name fuelType status"
          )
          .populate(
            "staffId",
            "name email role active"
          )
          .populate(
            "createdBy",
            "name email role"
          )
          .sort({
            readingDate: -1,
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      /* =================================================
         NORMALIZE RESPONSE
      ================================================= */

      const normalizedReadings =
        readings.map(
          (reading) => {
            const nozzle =
              reading.nozzleId &&
              typeof reading.nozzleId ===
                "object"
                ? reading.nozzleId
                : null;

            const staff =
              reading.staffId &&
              typeof reading.staffId ===
                "object"
                ? reading.staffId
                : null;

            return {
              ...reading,

              /* =========================================
                 IDS
              ========================================= */

              nozzleId:
                nozzle?._id ||
                reading.nozzleId ||
                null,

              staffId:
                staff?._id ||
                reading.staffId ||
                null,

              /* =========================================
                 NOZZLE DISPLAY
              ========================================= */

              nozzleNumber:
                nozzle?.nozzleNumber ||
                "",

              nozzleName:
                nozzle?.name ||
                "",

              nozzleFuelType:
                normalizeFuelType(
                  nozzle?.fuelType ||
                    reading.fuelType
                ),

              /* =========================================
                 STAFF DISPLAY
              ========================================= */

              staffName:
                reading.staffName ||
                staff?.name ||
                staff?.email ||
                "Staff",

              /* =========================================
                 FUEL
              ========================================= */

              fuelType:
                normalizeFuelType(
                  reading.fuelType
                ),

              /* =========================================
                 NUMBERS
              ========================================= */

              litresSold:
                Number(
                  reading.litresSold ??
                    0
                ),

              openingReading:
                Number(
                  reading.openingReading ??
                    0
                ),

              closingReading:
                Number(
                  reading.closingReading ??
                    0
                ),

              pricePerLitre:
                Number(
                  reading.pricePerLitre ??
                    0
                ),

              totalAmount:
                Number(
                  reading.totalAmount ??
                    0
                ),

              /* =========================================
                 SHIFT
              ========================================= */

              shiftName:
                normalizeShiftName(
                  reading.shiftName
                ),

              /* =========================================
                 DATE
              ========================================= */

              readingDate:
                reading.readingDate
                  ? String(
                      reading.readingDate
                    )
                  : "",

              /* =========================================
                 PAYMENT
              ========================================= */

              paymentMethod:
                normalizePaymentMethod(
                  reading.paymentMethod
                ),

              /* =========================================
                 NOTE
              ========================================= */

              note:
                String(
                  reading.note || ""
                ),
            };
          }
        );

      /* =================================================
         PAGINATION
      ================================================= */

      const totalPages =
        totalRecords === 0
          ? 0
          : Math.ceil(
              totalRecords /
                limit
            );

      const hasNextPage =
        page < totalPages;

      const hasPreviousPage =
        page > 1;

      /* =================================================
         FINAL RESPONSE

         Keep all three aliases so existing frontend
         implementations continue working.
      ================================================= */

      return res.status(200).json({
        success: true,

        count:
          normalizedReadings.length,

        readings:
          normalizedReadings,

        data:
          normalizedReadings,

        history:
          normalizedReadings,

        pagination: {
          page,
          limit,
          totalRecords,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },

        filters: {
          date:
            requestedDate || "",

          readingDate:
            requestedDate || "",

          shift:
            requestedShift || "",

          shiftName:
            requestedShift || "",

          staffId:
            requestedStaff || "",

          employeeId:
            requestedStaff || "",

          nozzleId:
            nozzleId || "",

          paymentMethod:
            paymentMethod || "",
        },
      });
    } catch (error) {
      console.error(
        "GET NOZZLE READINGS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load reading history",

        readings: [],
        data: [],
        history: [],
      });
    }
  };