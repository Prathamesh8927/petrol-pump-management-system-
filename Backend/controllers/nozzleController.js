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

const ALLOWED_PAYMENT_METHODS =
  new Set([
    "cash",
    "upi",
    "card",
    "credit",
  ]);

const ALLOWED_STAFF_ROLES =
  new Set([
    "owner",
    "manager",
    "staff",
  ]);

const ALLOWED_NOZZLE_STATUS =
  new Set([
    "active",
    "inactive",
  ]);

const ALLOWED_FUEL_TYPES =
  new Set([
    "petrol",
    "diesel",
  ]);

const SHIFT_ORDER = {
  morning: 1,
  evening: 2,
  night: 3,
};

const MAX_HISTORY_LIMIT = 100;

const DEFAULT_HISTORY_LIMIT = 50;

const MAX_NOZZLE_NUMBER_LENGTH = 50;

const MAX_NAME_LENGTH = 100;

const MAX_NOTE_LENGTH = 500;


/* =====================================================
   AUTH HELPERS
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
   INDIA DATE / TIME
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


const getIndiaTime = () => {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }
  ).format(new Date());
};


const getIndiaTimeFromDate = (
  value
) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }
  ).format(date);
};


/* =====================================================
   OBJECT ID
===================================================== */

const normalizeObjectId = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {
    return value;
  }

  if (
    mongoose.Types.ObjectId.isValid(
      value
    )
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

const normalizeFuelType = (
  value
) => {
  const fuel = String(
    value || ""
  )
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


const normalizeShiftName = (
  value
) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, 50);


const normalizePaymentMethod = (
  value
) =>
  String(value || "cash")
    .trim()
    .toLowerCase();


const normalizeStatus = (
  value
) =>
  String(value || "")
    .trim()
    .toLowerCase();


/* =====================================================
   NUMBER HELPERS
===================================================== */

const toNonNegativeNumber = (
  value
) => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
};


const roundToTwo = (
  value
) =>
  Number(
    Number(value).toFixed(2)
  );


/* =====================================================
   DATE VALIDATION
===================================================== */

const isValidDateString = (
  value
) => {
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
    date.getMonth() ===
      month - 1 &&
    date.getDate() === day
  );
};


/* =====================================================
   TIME VALIDATION
===================================================== */

const isValidTimeString = (
  value
) => {
  return (
    typeof value === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
      value
    )
  );
};


/* =====================================================
   PAYMENT VALIDATION
===================================================== */

const isValidPaymentMethod = (
  value
) =>
  ALLOWED_PAYMENT_METHODS.has(
    value
  );


const normalizePayments = (
  payments
) => {
  if (!Array.isArray(payments)) {
    return [];
  }

  return payments
    .map((item) => {
      const method =
        normalizePaymentMethod(
          item?.method
        );

      const amount =
        Number(item?.amount);

      return {
        method,
        amount:
          Number.isFinite(amount)
            ? roundToTwo(amount)
            : NaN,
      };
    })
    .filter(
      (item) =>
        item.method ||
        Number.isFinite(
          item.amount
        )
    );
};


/* =====================================================
   PAYMENT BREAKDOWN VALIDATION

   Example:

   Total = 50000

   UPI    = 20000
   CARD   = 15000
   CASH   = 10000
   CREDIT = 5000

   Total = 50000
===================================================== */

const validatePaymentBreakdown = ({
  payments,
  totalAmount,
}) => {
  if (
    !Array.isArray(payments)
  ) {
    return {
      valid: false,
      code:
        "INVALID_PAYMENT_BREAKDOWN",
      message:
        "Payment breakdown must be an array.",
    };
  }

  if (
    payments.length === 0
  ) {
    return {
      valid: false,
      code:
        "INVALID_PAYMENT_BREAKDOWN",
      message:
        "At least one payment method is required.",
    };
  }

  if (
    payments.length > 4
  ) {
    return {
      valid: false,
      code:
        "INVALID_PAYMENT_BREAKDOWN",
      message:
        "Maximum 4 payment methods are allowed.",
    };
  }

  const normalized =
    normalizePayments(
      payments
    );

  if (
    normalized.length !==
    payments.length
  ) {
    return {
      valid: false,
      code:
        "INVALID_PAYMENT_BREAKDOWN",
      message:
        "Invalid payment breakdown.",
    };
  }

  const methods = new Set();

  for (
    const payment of normalized
  ) {
    if (
      !isValidPaymentMethod(
        payment.method
      )
    ) {
      return {
        valid: false,
        code:
          "INVALID_PAYMENT_METHOD",
        message:
          `Invalid payment method: ${payment.method}`,
      };
    }

    if (
      methods.has(
        payment.method
      )
    ) {
      return {
        valid: false,
        code:
          "DUPLICATE_PAYMENT_METHOD",
        message:
          `Payment method "${payment.method}" cannot be added more than once.`,
      };
    }

    methods.add(
      payment.method
    );

    if (
      !Number.isFinite(
        payment.amount
      ) ||
      payment.amount <= 0
    ) {
      return {
        valid: false,
        code:
          "INVALID_PAYMENT_AMOUNT",
        message:
          "Each payment amount must be greater than zero.",
      };
    }
  }

  const paymentTotal =
    roundToTwo(
      normalized.reduce(
        (
          sum,
          payment
        ) =>
          sum +
          payment.amount,
        0
      )
    );

  const expectedTotal =
    roundToTwo(
      Number(totalAmount)
    );

  const paymentTotalPaise =
    Math.round(
      paymentTotal * 100
    );

  const expectedTotalPaise =
    Math.round(
      expectedTotal * 100
    );

  if (
    paymentTotalPaise !==
    expectedTotalPaise
  ) {
    return {
      valid: false,
      code:
        "PAYMENT_TOTAL_MISMATCH",
      message:
        `Payment total ₹${paymentTotal.toFixed(
          2
        )} does not match sale total ₹${expectedTotal.toFixed(
          2
        )}.`,
      paymentTotal,
      expectedTotal,
    };
  }

  return {
    valid: true,

    payments:
      normalized.map(
        (payment) => ({
          method:
            payment.method,

          amount:
            payment.amount,
        })
      ),

    paymentTotal,
  };
};


/* =====================================================
   OLD RECORD PAYMENT FALLBACK

   Old records may only have:

   paymentMethod: "cash"

   New records have:

   payments: [
     {
       method: "cash",
       amount: 1000
     }
   ]
===================================================== */

const getExistingPaymentBreakdown = (
  document
) => {
  if (
    Array.isArray(
      document?.payments
    ) &&
    document.payments.length > 0
  ) {
    return normalizePayments(
      document.payments
    );
  }

  const method =
    normalizePaymentMethod(
      document?.paymentMethod
    );

  const amount =
    roundToTwo(
      Number(
        document?.totalAmount || 0
      )
    );

  if (
    isValidPaymentMethod(
      method
    ) &&
    amount > 0
  ) {
    return [
      {
        method,
        amount,
      },
    ];
  }

  return [];
};


/* =====================================================
   SHIFT HELPERS
===================================================== */

const getLaterShifts = (
  shiftName
) => {
  const currentOrder =
    SHIFT_ORDER[
      shiftName
    ] || 0;

  return Object.entries(
    SHIFT_ORDER
  )
    .filter(
      ([, order]) =>
        order > currentOrder
    )
    .map(
      ([shift]) => shift
    );
};


/* =====================================================
   GET NOZZLES
===================================================== */

export const getNozzles =
  async (
    req,
    res
  ) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump information not found",
        });
      }

      const nozzles =
        await Nozzle.find({
          pumpId,
        })
          .sort({
            createdAt: 1,
          })
          .lean();

      const normalizedNozzles =
        nozzles.map(
          (nozzle) => ({
            ...nozzle,

            fuelType:
              normalizeFuelType(
                nozzle.fuelType
              ),

            currentReading:
              Number(
                nozzle.currentReading ??
                  0
              ),

            status:
              normalizeStatus(
                nozzle.status
              ),
          })
        );

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
      });
    }
  };


/* =====================================================
   ADD NOZZLE
===================================================== */

export const addNozzle =
  async (
    req,
    res
  ) => {
    try {
      const pumpId =
        getPumpId(req);

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

      const cleanNumber =
        String(
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
        normalizeFuelType(
          fuelType
        );

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
        Number(
          currentReading ??
            openingReading ??
            0
        );

      if (
        !Number.isFinite(
          initialReading
        ) ||
        initialReading < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Opening reading is invalid",
        });
      }

      const cleanName =
        String(
          name ||
            machineName ||
            ""
        )
          .trim()
          .slice(
            0,
            MAX_NAME_LENGTH
          );

      const normalizedStatus =
        status === undefined
          ? "active"
          : normalizeStatus(
              status
            );

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

      const duplicate =
        await Nozzle.findOne({
          pumpId,
          nozzleNumber:
            cleanNumber,
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "Nozzle number already exists",
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
            "Nozzle number already exists",
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

export const updateNozzle =
  async (
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

        const duplicate =
          await Nozzle.findOne({
            pumpId,
            nozzleNumber:
              cleanNumber,

            _id: {
              $ne:
                nozzle._id,
            },
          });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Nozzle number already exists",
          });
        }

        nozzle.nozzleNumber =
          cleanNumber;
      }

      if (
        name !== undefined ||
        machineName !== undefined
      ) {
        const value =
          name !== undefined
            ? name
            : machineName;

        nozzle.name =
          String(
            value || ""
          )
            .trim()
            .slice(
              0,
              MAX_NAME_LENGTH
            );
      }

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

      let normalizedStatus =
        null;

      if (
        status !== undefined
      ) {
        normalizedStatus =
          normalizeStatus(
            status
          );
      } else if (
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
            "Nozzle number already exists",
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
===================================================== */

export const deleteNozzle =
  async (
    req,
    res
  ) => {
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

      let deletedNozzle =
        null;

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
                "Nozzle has readings"
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
                "Nozzle has sales"
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
          "Nozzle deleted successfully and can be recovered from Deleted Data.",

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
            "This nozzle has historical readings and cannot be deleted. Set it to inactive instead.",
        });
      }

      if (
        error?.code ===
        "NOZZLE_HAS_SALES"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This nozzle has historical sales and cannot be deleted. Set it to inactive instead.",
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
   ADD NOZZLE READING

   ONE READING
   ONE SALE
   MULTIPLE PAYMENT METHODS

   Example:

   ₹50,000

   UPI     ₹20,000
   Card    ₹15,000
   Cash    ₹10,000
   Credit   ₹5,000

   One NozzleReading document
   One Sale document
===================================================== */

export const addNozzleReading =
  async (
    req,
    res
  ) => {
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
        readingTime,
        paymentMethod =
          "cash",
        payments,
        note = "",
      } = req.body || {};

      /* =====================================
         NOZZLE
      ===================================== */

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

      /* =====================================
         SHIFT
      ===================================== */

      const finalShift =
        normalizeShiftName(
          shiftName || shift
        );

      if (
        !finalShift ||
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

      /* =====================================
         STAFF
      ===================================== */

      const finalStaffId =
        normalizeObjectId(
          staffId ||
            employeeId
        );

      if (!finalStaffId) {
        return res.status(400).json({
          success: false,
          message:
            "Valid staff member is required",
        });
      }

      /* =====================================
         DATE
      ===================================== */

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

      /* =====================================
         TIME
      ===================================== */

      const finalTime =
        String(
          readingTime ||
            getIndiaTime()
        ).trim();

      if (
        !isValidTimeString(
          finalTime
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid reading time. Use HH:mm format.",
        });
      }

      /* =====================================
         PAYMENT METHOD
      ===================================== */

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

      /* =====================================
         NOTE
      ===================================== */

      const cleanNote =
        String(
          note || ""
        )
          .trim()
          .slice(
            0,
            MAX_NOTE_LENGTH
          );

      /* =====================================
         CLOSING READING
      ===================================== */

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

      /* =====================================
         TRANSACTION
      ===================================== */

      session =
        await mongoose.startSession();

      let transactionResult =
        null;

      await session.withTransaction(
        async () => {
          /* =================================
             NOZZLE
          ================================= */

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

          /* =================================
             STAFF
          ================================= */

          const staff =
            await User.findOne({
              _id:
                finalStaffId,

              pumpId,

              active:
                true,

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

          /* =================================
             STAFF NAME
          ================================= */

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

          /* =================================
             FUEL TYPE
          ================================= */

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

          /* =================================
             OPENING READING
          ================================= */

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

          /* =================================
             CLOSING > OPENING
          ================================= */

          if (
            finalReading <=
            opening
          ) {
            const error =
              new Error(
                "Closing reading must be greater than opening"
              );

            error.code =
              "INVALID_CLOSING_READING";

            error.opening =
              opening;

            throw error;
          }

          /* =================================
             LITRES
          ================================= */

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

          /* =================================
             DUPLICATE SHIFT
          ================================= */

          const existingReading =
            await NozzleReading.findOne({
              pumpId,

              nozzleId:
                nozzle._id,

              readingDate:
                finalDate,

              shiftName:
                finalShift,
            }).session(
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

          /* =================================
             FUEL PRICE
          ================================= */

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
            pricePerLitre ===
              null ||
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

          /* =================================
             TOTAL
          ================================= */

          const totalAmount =
            roundToTwo(
              litresSold *
                pricePerLitre
            );

          /* =================================
             PAYMENT BREAKDOWN
          ================================= */

          let finalPayments =
            [];

          if (
            Array.isArray(
              payments
            ) &&
            payments.length > 0
          ) {
            const validation =
              validatePaymentBreakdown({
                payments,
                totalAmount,
              });

            if (
              !validation.valid
            ) {
              const error =
                new Error(
                  validation.message
                );

              error.code =
                validation.code;

              error.paymentTotal =
                validation.paymentTotal;

              error.expectedTotal =
                validation.expectedTotal;

              throw error;
            }

            finalPayments =
              validation.payments;
          } else {
            finalPayments = [
              {
                method:
                  payment,

                amount:
                  totalAmount,
              },
            ];
          }

          /* =================================
             FUEL STOCK
          ================================= */

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
            stockBefore ===
            null
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

          /* =================================
             CREATE READING
          ================================= */

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

                  readingTime:
                    finalTime,

                  paymentMethod:
                    finalPayments[0]
                      .method,

                  payments:
                    finalPayments,

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

          /* =================================
             CREATE ONE SALE
          ================================= */

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
                    finalPayments[0]
                      .method,

                  payments:
                    finalPayments,

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

          /* =================================
             UPDATE STOCK
          ================================= */

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

          /* =================================
             UPDATE NOZZLE
          ================================= */

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

            finalPayments,

            finalDate,

            finalTime,
          };
        }
      );

      if (
        !transactionResult?.newReading
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Reading transaction completed without a saved reading. Please try again.",
        });
      }

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

          time:
            transactionResult
              .newReading
              .readingTime,
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

        paymentMethod:
          transactionResult
            .newReading
            .paymentMethod,

        payments:
          transactionResult
            .newReading
            .payments,

        readingDate:
          transactionResult
            .newReading
            .readingDate,

        readingTime:
          transactionResult
            .newReading
            .readingTime,

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

      if (
        error?.code ===
        "INVALID_PAYMENT_METHOD"
      ) {
        return res.status(400).json({
          success: false,
          message:
            error.message ||
            "Invalid payment method",
        });
      }

      if (
        error?.code ===
        "INVALID_PAYMENT_BREAKDOWN"
      ) {
        return res.status(400).json({
          success: false,
          message:
            error.message ||
            "Invalid payment breakdown",
        });
      }

      if (
        error?.code ===
        "DUPLICATE_PAYMENT_METHOD"
      ) {
        return res.status(400).json({
          success: false,
          message:
            error.message ||
            "A payment method cannot be used more than once.",
        });
      }

      if (
        error?.code ===
        "INVALID_PAYMENT_AMOUNT"
      ) {
        return res.status(400).json({
          success: false,
          message:
            error.message ||
            "Invalid payment amount",
        });
      }

      if (
        error?.code ===
        "PAYMENT_TOTAL_MISMATCH"
      ) {
        return res.status(400).json({
          success: false,

          message:
            error.message,

          paymentTotal:
            error.paymentTotal,

          expectedTotal:
            error.expectedTotal,
        });
      }

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A final reading already exists for this nozzle and shift.",
        });
      }

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
   UPDATE EXISTING NOZZLE SHIFT READING

   Supports:

   - Closing reading change
   - Staff change
   - Payment method change
   - Split payment change
   - Reading time change
   - Note change

   Accounting:

   Old litres -> New litres
   Difference is adjusted in stock.

   Important:

   nozzleId
   readingDate
   shiftName
   openingReading
   fuelType
   pricePerLitre

   remain immutable.
===================================================== */

export const updateNozzleReading =
  async (
    req,
    res
  ) => {
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
            "Invalid reading ID",
        });
      }

      const {
        closingReading,
        reading,
        staffId,
        employeeId,
        paymentMethod,
        payments,
        readingTime,
        note,
      } = req.body || {};

      const hasClosingReading =
        closingReading !==
          undefined ||
        reading !==
          undefined;

      let finalReading =
        null;

      if (
        hasClosingReading
      ) {
        finalReading =
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
      }

      let finalPayment =
        null;

      if (
        paymentMethod !==
        undefined
      ) {
        finalPayment =
          normalizePaymentMethod(
            paymentMethod
          );

        if (
          !isValidPaymentMethod(
            finalPayment
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid payment method",
          });
        }
      }

      let finalTime =
        null;

      if (
        readingTime !==
        undefined
      ) {
        finalTime =
          String(
            readingTime
          ).trim();

        if (
          !isValidTimeString(
            finalTime
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid reading time. Use HH:mm format.",
          });
        }
      }

      let finalNote =
        null;

      if (
        note !== undefined
      ) {
        finalNote =
          String(
            note || ""
          )
            .trim()
            .slice(
              0,
              MAX_NOTE_LENGTH
            );
      }

      let finalStaffId =
        null;

      if (
        staffId !== undefined ||
        employeeId !== undefined
      ) {
        finalStaffId =
          normalizeObjectId(
            staffId ||
              employeeId
          );

        if (
          !finalStaffId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Valid staff member is required",
          });
        }
      }

      session =
        await mongoose.startSession();

      let transactionResult =
        null;

      await session.withTransaction(
        async () => {
          /* =================================
             EXISTING READING
          ================================= */

          const existingReading =
            await NozzleReading.findOne({
              _id: id,
              pumpId,
            }).session(
              session
            );

          if (!existingReading) {
            const error =
              new Error(
                "Reading not found"
              );

            error.code =
              "READING_NOT_FOUND";

            throw error;
          }

          /* =================================
             OLD NUMBERS
          ================================= */

          const oldClosing =
            toNonNegativeNumber(
              existingReading.closingReading
            );

          const opening =
            toNonNegativeNumber(
              existingReading.openingReading
            );

          const oldLitres =
            toNonNegativeNumber(
              existingReading.litresSold
            );

          if (
            oldClosing === null ||
            opening === null ||
            oldLitres === null
          ) {
            const error =
              new Error(
                "Existing reading contains invalid numerical data"
              );

            error.code =
              "INVALID_EXISTING_READING";

            throw error;
          }

          const newClosing =
            hasClosingReading
              ? finalReading
              : oldClosing;

          if (
            newClosing <=
            opening
          ) {
            const error =
              new Error(
                "Closing reading must be greater than opening reading"
              );

            error.code =
              "INVALID_UPDATED_CLOSING_READING";

            error.opening =
              opening;

            throw error;
          }

          const newLitres =
            roundToTwo(
              newClosing -
                opening
            );

          if (
            newLitres <= 0
          ) {
            const error =
              new Error(
                "Invalid litres sold"
              );

            error.code =
              "INVALID_UPDATED_LITRES";

            throw error;
          }

          /* =================================
             LATER READING CHECK
          ================================= */

          if (
            newClosing !==
            oldClosing
          ) {
            const currentShift =
              normalizeShiftName(
                existingReading.shiftName
              );

            const laterShifts =
              getLaterShifts(
                currentShift
              );

            const laterConditions = [
              {
                readingDate: {
                  $gt:
                    existingReading.readingDate,
                },
              },
            ];

            if (
              laterShifts.length >
              0
            ) {
              laterConditions.push({
                readingDate:
                  existingReading.readingDate,

                shiftName: {
                  $in:
                    laterShifts,
                },
              });
            }

            const laterReading =
              await NozzleReading.findOne({
                pumpId,

                nozzleId:
                  existingReading.nozzleId,

                $or:
                  laterConditions,

                _id: {
                  $ne:
                    existingReading._id,
                },
              })
                .sort({
                  readingDate: 1,
                  createdAt: 1,
                  _id: 1,
                })
                .session(
                  session
                );

            if (
              laterReading
            ) {
              const error =
                new Error(
                  "A later reading already exists for this nozzle"
                );

              error.code =
                "READING_HAS_LATER_READING";

              error.laterReading =
                laterReading;

              throw error;
            }
          }

          /* =================================
             NOZZLE
          ================================= */

          const nozzle =
            await Nozzle.findOne({
              _id:
                existingReading.nozzleId,

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

          const fuelType =
            normalizeFuelType(
              existingReading.fuelType ||
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

          /* =================================
             NOZZLE CONCURRENCY
          ================================= */

          if (
            newClosing !==
            oldClosing
          ) {
            const currentNozzleReading =
              toNonNegativeNumber(
                nozzle.currentReading
              );

            if (
              currentNozzleReading ===
                null ||
              currentNozzleReading !==
                oldClosing
            ) {
              const error =
                new Error(
                  "Nozzle current reading has changed"
                );

              error.code =
                "NOZZLE_READING_UPDATE_CONFLICT";

              throw error;
            }
          }

          /* =================================
             STAFF
          ================================= */

          let staff =
            null;

          if (
            finalStaffId
          ) {
            staff =
              await User.findOne({
                _id:
                  finalStaffId,

                pumpId,

                active:
                  true,

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
          }

          const updatedStaffId =
            staff?._id ||
            existingReading.staffId;

          const updatedStaffName =
            staff
              ? String(
                  staff.name ||
                    staff.email ||
                    "Staff"
                )
                  .trim()
                  .slice(
                    0,
                    MAX_NAME_LENGTH
                  )
              : String(
                  existingReading.staffName ||
                    "Staff"
                )
                  .trim()
                  .slice(
                    0,
                    MAX_NAME_LENGTH
                  );

          /* =================================
             PRICE
          ================================= */

          const pricePerLitre =
            toNonNegativeNumber(
              existingReading.pricePerLitre
            );

          if (
            pricePerLitre === null ||
            pricePerLitre <= 0
          ) {
            const error =
              new Error(
                "Historical fuel price is invalid"
              );

            error.code =
              "INVALID_HISTORICAL_PRICE";

            throw error;
          }

          /* =================================
             NEW TOTAL
          ================================= */

          const newTotalAmount =
            roundToTwo(
              newLitres *
                pricePerLitre
            );

          /* =================================
             PAYMENT BREAKDOWN
          ================================= */

          const oldPayments =
            getExistingPaymentBreakdown(
              existingReading
            );

          let updatedPayments =
            [];

          if (
            Array.isArray(
              payments
            )
          ) {
            const validation =
              validatePaymentBreakdown({
                payments,
                totalAmount:
                  newTotalAmount,
              });

            if (
              !validation.valid
            ) {
              const error =
                new Error(
                  validation.message
                );

              error.code =
                validation.code;

              error.paymentTotal =
                validation.paymentTotal;

              error.expectedTotal =
                validation.expectedTotal;

              throw error;
            }

            updatedPayments =
              validation.payments;
          } else if (
            finalPayment !==
            null
          ) {
            updatedPayments = [
              {
                method:
                  finalPayment,

                amount:
                  newTotalAmount,
              },
            ];
          } else if (
            oldPayments.length >
            1
          ) {
            /*
             * Existing split payment.
             *
             * If amount changes, old
             * payment values are no
             * longer valid.
             *
             * Require frontend to send
             * the updated breakdown.
             */

            if (
              newTotalAmount !==
              Number(
                existingReading.totalAmount ||
                  0
              )
            ) {
              const error =
                new Error(
                  "Payment breakdown is required when changing the sale total of a split-payment reading."
                );

              error.code =
                "PAYMENT_BREAKDOWN_REQUIRED";

              throw error;
            }

            updatedPayments =
              oldPayments;
          } else {
            const oldMethod =
              normalizePaymentMethod(
                existingReading.paymentMethod
              );

            updatedPayments = [
              {
                method:
                  isValidPaymentMethod(
                    oldMethod
                  )
                    ? oldMethod
                    : "cash",

                amount:
                  newTotalAmount,
              },
            ];
          }

          const updatedPayment =
            updatedPayments[0]
              ?.method ||
            "cash";

          /* =================================
             NOTE
          ================================= */

          const updatedNote =
            finalNote !==
            null
              ? finalNote
              : String(
                  existingReading.note ||
                    ""
                ).trim();

          /* =================================
             READING TIME
          ================================= */

          const updatedReadingTime =
            finalTime !==
            null
              ? finalTime
              : isValidTimeString(
                  existingReading.readingTime
                )
                ? existingReading.readingTime
                : getIndiaTimeFromDate(
                    existingReading.createdAt
                  );

          /* =================================
             STOCK
          ================================= */

          const delta =
            roundToTwo(
              newLitres -
                oldLitres
            );

          let updatedStock =
            await FuelStock.findOne({
              pumpId,

              fuelType,
            }).session(
              session
            );

          if (!updatedStock) {
            const error =
              new Error(
                "Fuel stock not found"
              );

            error.code =
              "FUEL_STOCK_NOT_FOUND";

            throw error;
          }

          /* =================================
             MORE LITRES
          ================================= */

          if (
            delta > 0
          ) {
            const stockBefore =
              toNonNegativeNumber(
                updatedStock.currentStock
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
              delta
            ) {
              const error =
                new Error(
                  "Insufficient fuel stock for updated reading"
                );

              error.code =
                "INSUFFICIENT_UPDATED_FUEL_STOCK";

              error.available =
                stockBefore;

              error.required =
                delta;

              throw error;
            }

            updatedStock =
              await FuelStock.findOneAndUpdate(
                {
                  _id:
                    updatedStock._id,

                  pumpId,

                  fuelType,

                  currentStock: {
                    $gte:
                      delta,
                  },
                },
                {
                  $inc: {
                    currentStock:
                      -delta,

                    totalSold:
                      delta,
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

            if (
              !updatedStock
            ) {
              const error =
                new Error(
                  "Fuel stock changed while updating the reading"
                );

              error.code =
                "UPDATED_STOCK_CONFLICT";

              throw error;
            }
          }

          /* =================================
             FEWER LITRES
          ================================= */

          else if (
            delta < 0
          ) {
            const returnedLitres =
              Math.abs(delta);

            const totalSoldBefore =
              toNonNegativeNumber(
                updatedStock.totalSold
              );

            if (
              totalSoldBefore ===
              null
            ) {
              const error =
                new Error(
                  "Total sold stock value is invalid"
                );

              error.code =
                "INVALID_TOTAL_SOLD";

              throw error;
            }

            if (
              totalSoldBefore <
              returnedLitres
            ) {
              const error =
                new Error(
                  "Cannot reduce sold quantity below zero"
                );

              error.code =
                "INVALID_TOTAL_SOLD_REDUCTION";

              error.available =
                totalSoldBefore;

              error.required =
                returnedLitres;

              throw error;
            }

            updatedStock =
              await FuelStock.findOneAndUpdate(
                {
                  _id:
                    updatedStock._id,

                  pumpId,

                  fuelType,

                  totalSold: {
                    $gte:
                      returnedLitres,
                  },
                },
                {
                  $inc: {
                    currentStock:
                      returnedLitres,

                    totalSold:
                      -returnedLitres,
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

            if (
              !updatedStock
            ) {
              const error =
                new Error(
                  "Fuel stock changed while updating the reading"
                );

              error.code =
                "UPDATED_STOCK_CONFLICT";

              throw error;
            }
          }

          /* =================================
             UPDATE NOZZLE
          ================================= */

          let updatedNozzle =
            nozzle;

          if (
            newClosing !==
            oldClosing
          ) {
            updatedNozzle =
              await Nozzle.findOneAndUpdate(
                {
                  _id:
                    nozzle._id,

                  pumpId,

                  currentReading:
                    oldClosing,
                },
                {
                  $set: {
                    currentReading:
                      newClosing,
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

            if (
              !updatedNozzle
            ) {
              const error =
                new Error(
                  "This nozzle was updated by another request"
                );

              error.code =
                "NOZZLE_READING_UPDATE_CONFLICT";

              throw error;
            }
          }

          /* =================================
             UPDATE READING
          ================================= */

          const updatedReading =
            await NozzleReading.findOneAndUpdate(
              {
                _id:
                  existingReading._id,

                pumpId,

                closingReading:
                  oldClosing,
              },
              {
                $set: {
                  closingReading:
                    newClosing,

                  litresSold:
                    newLitres,

                  totalAmount:
                    newTotalAmount,

                  staffId:
                    updatedStaffId,

                  staffName:
                    updatedStaffName,

                  paymentMethod:
                    updatedPayment,

                  payments:
                    updatedPayments,

                  readingTime:
                    updatedReadingTime,

                  note:
                    updatedNote,
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

          if (
            !updatedReading
          ) {
            const error =
              new Error(
                "Reading was changed by another request"
              );

            error.code =
              "READING_UPDATE_CONFLICT";

            throw error;
          }

          /* =================================
             LINKED SALE
          ================================= */

          const sale =
            await Sale.findOne({
              pumpId,

              readingId:
                existingReading._id,
            }).session(
              session
            );

          if (!sale) {
            const error =
              new Error(
                "Linked sale not found for this reading"
              );

            error.code =
              "SALE_NOT_FOUND";

            throw error;
          }

          const updatedSale =
            await Sale.findOneAndUpdate(
              {
                _id:
                  sale._id,

                pumpId,

                readingId:
                  existingReading._id,
              },
              {
                $set: {
                  quantity:
                    newLitres,

                  pricePerLitre:
                    pricePerLitre,

                  totalAmount:
                    newTotalAmount,

                  paymentMethod:
                    updatedPayment,

                  payments:
                    updatedPayments,

                  note:
                    updatedNote,

                  fuelType:
                    fuelType,

                  nozzleId:
                    existingReading.nozzleId,
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

          if (
            !updatedSale
          ) {
            const error =
              new Error(
                "Linked sale could not be updated"
              );

            error.code =
              "SALE_UPDATE_CONFLICT";

            throw error;
          }

          transactionResult = {
            updatedReading,

            updatedSale,

            updatedStock,

            updatedNozzle,

            oldClosing,

            newClosing,

            oldLitres,

            newLitres,

            delta,

            pricePerLitre,

            newTotalAmount,

            updatedPayments,

            staff,
          };
        }
      );

      if (
        !transactionResult?.updatedReading
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Reading update completed without a saved reading. Please refresh and try again.",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Nozzle shift reading updated successfully",

        reading:
          transactionResult
            .updatedReading,

        sale:
          transactionResult
            .updatedSale,

        openingReading:
          transactionResult
            .updatedReading
            .openingReading,

        closingReading:
          transactionResult
            .updatedReading
            .closingReading,

        litresSold:
          transactionResult
            .updatedReading
            .litresSold,

        pricePerLitre:
          transactionResult
            .updatedReading
            .pricePerLitre,

        totalAmount:
          transactionResult
            .updatedReading
            .totalAmount,

        paymentMethod:
          transactionResult
            .updatedReading
            .paymentMethod,

        payments:
          transactionResult
            .updatedReading
            .payments,

        readingDate:
          transactionResult
            .updatedReading
            .readingDate,

        readingTime:
          transactionResult
            .updatedReading
            .readingTime,

        staffId:
          transactionResult
            .updatedReading
            .staffId,

        staffName:
          transactionResult
            .updatedReading
            .staffName,

        note:
          transactionResult
            .updatedReading
            .note,

        accounting: {
          oldLitres:
            transactionResult
              .oldLitres,

          newLitres:
            transactionResult
              .newLitres,

          delta:
            transactionResult
              .delta,

          stockAdjusted:
            transactionResult
              .delta !== 0,
        },

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

          totalSold:
            transactionResult
              .updatedStock
              .totalSold,
        },
      });
    } catch (error) {
      console.error(
        "UPDATE NOZZLE READING ERROR:",
        {
          code:
            error?.code,

          message:
            error?.message,

          name:
            error?.name,
        }
      );

      if (
        error?.code ===
        "READING_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Nozzle reading not found",
        });
      }

      if (
        error?.code ===
        "READING_HAS_LATER_READING"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "This reading cannot be changed because a later shift reading already exists for this nozzle. Edit the latest reading instead.",

          laterReading: {
            id:
              error.laterReading
                ?._id,

            readingDate:
              error.laterReading
                ?.readingDate,

            shiftName:
              error.laterReading
                ?.shiftName,

            closingReading:
              error.laterReading
                ?.closingReading,
          },
        });
      }

      if (
        error?.code ===
        "INVALID_EXISTING_READING"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This saved reading contains invalid accounting data and cannot be safely edited.",
        });
      }

      if (
        error?.code ===
        "INVALID_UPDATED_CLOSING_READING"
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
        "INVALID_UPDATED_LITRES"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid litres sold",
        });
      }

      if (
        error?.code ===
        "NOZZLE_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "The nozzle associated with this reading was not found.",
        });
      }

      if (
        error?.code ===
        "INVALID_FUEL_TYPE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid fuel type",
        });
      }

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
        "NOZZLE_READING_UPDATE_CONFLICT"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "The nozzle reading has changed since this record was loaded. Please refresh the reading history and try again.",
        });
      }

      if (
        error?.code ===
        "INVALID_HISTORICAL_PRICE"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "The historical fuel price for this reading is invalid. The reading cannot be safely recalculated.",
        });
      }

      if (
        error?.code ===
        "FUEL_STOCK_NOT_FOUND"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Fuel stock not found for this fuel type.",
        });
      }

      if (
        error?.code ===
        "INVALID_FUEL_STOCK"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Current fuel stock is invalid.",
        });
      }

      if (
        error?.code ===
        "INSUFFICIENT_UPDATED_FUEL_STOCK"
      ) {
        return res.status(400).json({
          success: false,

          message:
            `Insufficient fuel stock for this correction. Available: ${error.available}, required: ${error.required}.`,
        });
      }

      if (
        error?.code ===
        "INVALID_TOTAL_SOLD"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Fuel stock total-sold value is invalid. The reading cannot be safely corrected.",
        });
      }

      if (
        error?.code ===
        "INVALID_TOTAL_SOLD_REDUCTION"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "This correction would make total sold fuel negative, so the reading cannot be changed safely.",
        });
      }

      if (
        error?.code ===
        "UPDATED_STOCK_CONFLICT"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Fuel stock changed while updating this reading. Please refresh and try again.",
        });
      }

      if (
        error?.code ===
        "SALE_NOT_FOUND"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "The sale linked to this nozzle reading was not found. The reading was not changed.",
        });
      }

      if (
        error?.code ===
        "SALE_UPDATE_CONFLICT"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "The linked sale could not be updated. The reading was not changed.",
        });
      }

      if (
        error?.code ===
        "READING_UPDATE_CONFLICT"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "This reading was changed by another request. Please refresh and try again.",
        });
      }

      if (
        error?.code ===
        "PAYMENT_TOTAL_MISMATCH"
      ) {
        return res.status(400).json({
          success: false,

          message:
            error.message,

          paymentTotal:
            error.paymentTotal,

          expectedTotal:
            error.expectedTotal,
        });
      }

      if (
        error?.code ===
        "PAYMENT_BREAKDOWN_REQUIRED"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Because this is a split-payment sale and the total changed, the updated payment breakdown is required.",
        });
      }

      if (
        error?.code ===
        "INVALID_PAYMENT_BREAKDOWN" ||
        error?.code ===
        "INVALID_PAYMENT_METHOD" ||
        error?.code ===
        "DUPLICATE_PAYMENT_METHOD" ||
        error?.code ===
        "INVALID_PAYMENT_AMOUNT"
      ) {
        return res.status(400).json({
          success: false,

          message:
            error.message ||
            "Invalid payment breakdown",
        });
      }

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

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,

          message:
            "A conflicting nozzle reading already exists.",
        });
      }

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

      return res.status(500).json({
        success: false,

        message:
          error?.message &&
          error.message.length <
            250
            ? error.message
            : "Unable to update nozzle shift reading",
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  };


/* =====================================================
   GET NOZZLE READING HISTORY

   Supports:

   ?page=1
   ?limit=50
   ?date=2026-10-08
   ?readingDate=2026-10-08
   ?shift=morning
   ?shiftName=morning
   ?staffId=...
   ?employeeId=...
   ?nozzleId=...
   ?paymentMethod=cash

   Split-payment filtering checks:

   paymentMethod
   payments.method
===================================================== */

export const getNozzleReadings =
  async (
    req,
    res
  ) => {
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

      /* =====================================
         PAGINATION
      ===================================== */

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

      /* =====================================
         FILTERS
      ===================================== */

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

      /* =====================================
         DATE
      ===================================== */

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

      /* =====================================
         SHIFT
      ===================================== */

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

      /* =====================================
         STAFF
      ===================================== */

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

        if (
          !normalizedStaffId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid staff ID",
          });
        }

        query.staffId =
          normalizedStaffId;
      }

      /* =====================================
         NOZZLE
      ===================================== */

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

        if (
          !normalizedNozzleId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid nozzle ID",
          });
        }

        query.nozzleId =
          normalizedNozzleId;
      }

      /* =====================================
         PAYMENT FILTER

         OLD:

         {
           paymentMethod: "cash"
         }

         NEW:

         {
           payments: [
             {
               method: "cash",
               amount: 1000
             }
           ]
         }
      ===================================== */

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

        query.$or = [
          {
            paymentMethod:
              cleanPayment,
          },

          {
            "payments.method":
              cleanPayment,
          },
        ];
      }

      /* =====================================
         DATABASE
      ===================================== */

      const [
        totalRecords,
        readings,
      ] = await Promise.all([
        NozzleReading.countDocuments(
          query
        ),

        NozzleReading.find(
          query
        )
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

      /* =====================================
         NORMALIZE
      ===================================== */

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

            const existingPayments =
              getExistingPaymentBreakdown(
                reading
              );

            const normalizedTime =
              isValidTimeString(
                reading.readingTime
              )
                ? reading.readingTime
                : getIndiaTimeFromDate(
                    reading.createdAt
                  );

            return {
              ...reading,

              /* =============================
                 IDS
              ============================= */

              nozzleId:
                nozzle?._id ||
                reading.nozzleId ||
                null,

              staffId:
                staff?._id ||
                reading.staffId ||
                null,

              /* =============================
                 NOZZLE
              ============================= */

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

              /* =============================
                 STAFF
              ============================= */

              staffName:
                reading.staffName ||
                staff?.name ||
                staff?.email ||
                "Staff",

              /* =============================
                 FUEL
              ============================= */

              fuelType:
                normalizeFuelType(
                  reading.fuelType
                ),

              /* =============================
                 NUMBERS
              ============================= */

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

              /* =============================
                 SHIFT
              ============================= */

              shiftName:
                normalizeShiftName(
                  reading.shiftName
                ),

              /* =============================
                 DATE
              ============================= */

              readingDate:
                reading.readingDate
                  ? String(
                      reading.readingDate
                    )
                  : "",

              /* =============================
                 TIME
              ============================= */

              readingTime:
                normalizedTime,

              /* =============================
                 PAYMENT
              ============================= */

              paymentMethod:
                normalizePaymentMethod(
                  reading.paymentMethod
                ),

              payments:
                existingPayments,

              /* =============================
                 NOTE
              ============================= */

              note:
                String(
                  reading.note ||
                    ""
                ),
            };
          }
        );

      /* =====================================
         PAGINATION
      ===================================== */

      const totalPages =
        totalRecords === 0
          ? 0
          : Math.ceil(
              totalRecords /
                limit
            );

      const hasNextPage =
        page <
        totalPages;

      const hasPreviousPage =
        page > 1;

      /* =====================================
         RESPONSE
      ===================================== */

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
            requestedDate ||
            "",

          readingDate:
            requestedDate ||
            "",

          shift:
            requestedShift ||
            "",

          shiftName:
            requestedShift ||
            "",

          staffId:
            requestedStaff ||
            "",

          employeeId:
            requestedStaff ||
            "",

          nozzleId:
            nozzleId ||
            "",

          paymentMethod:
            paymentMethod ||
            "",
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