import mongoose from "mongoose";

import DailyClosing from "../models/DailyClosing.js";

import Sale from "../models/Sale.js";
import NozzleReading from "../models/NozzleReading.js";

import Expense from "../models/Expense.js";
import FuelStock from "../models/FuelStock.js";
import LedgerEntry from "../models/LedgerEntry.js";
import LedgerCustomer from "../models/LedgerCustomer.js";

import createAuditLog from "../utils/createAuditLog.js";

/* =====================================================
   CONSTANTS
===================================================== */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const BUSINESS_TIMEZONE =
  process.env.BUSINESS_TIMEZONE || "Asia/Kolkata";

const PAYMENT_METHODS = [
  "cash",
  "upi",
  "card",
  "credit",
];

/* =====================================================
   HELPERS
===================================================== */

/**
 * Validate YYYY-MM-DD strictly.
 */
const isValidDateString = (value) => {
  if (
    typeof value !== "string" ||
    !DATE_REGEX.test(value)
  ) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/**
 * Get today's business date using configured timezone.
 */
const getTodayBusinessDate = () => {
  try {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: BUSINESS_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(new Date());
  } catch (error) {
    console.error(
      "BUSINESS TIMEZONE ERROR:",
      error.message
    );

    return new Date()
      .toISOString()
      .slice(0, 10);
  }
};

/**
 * Get requested business date.
 */
const getBusinessDate = (value) => {
  if (
    value !== undefined &&
    value !== null
  ) {
    const date = String(value).trim();

    if (!isValidDateString(date)) {
      throw createError(
        "Business date must be in YYYY-MM-DD format",
        400
      );
    }

    return date;
  }

  return getTodayBusinessDate();
};

/**
 * Get authenticated pump ID.
 */
const getPumpId = (req) => {
  const pumpId =
    req.user?.pumpId?._id ||
    req.user?.pumpId ||
    req.user?.pumpID ||
    req.user?.pump?.pumpId ||
    null;

  return pumpId || null;
};

/**
 * Get authenticated user ID.
 */
const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );
};

/**
 * Safe numeric conversion.
 */
const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

/**
 * Round monetary/fuel values.
 */
const roundNumber = (
  value,
  decimals = 2
) => {
  const factor =
    10 ** decimals;

  return (
    Math.round(
      (toNumber(value) + Number.EPSILON) *
        factor
    ) / factor
  );
};

/**
 * Create application error.
 */
const createError = (
  message,
  statusCode = 500
) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

/* =====================================================
   PAYMENT HELPERS
===================================================== */

/**
 * Normalize payment method.
 */
const normalizePaymentMethod = (
  method
) => {
  const normalized =
    String(method || "")
      .trim()
      .toLowerCase();

  return PAYMENT_METHODS.includes(
    normalized
  )
    ? normalized
    : null;
};

/**
 * Normalize split payment records.
 *
 * Supports:
 *
 * payments: [
 *   { method: "cash", amount: 500 },
 *   { method: "upi", amount: 500 }
 * ]
 *
 * Also supports older records having:
 *
 * paymentMethod: "cash"
 */
const getPaymentBreakdown = (
  transaction
) => {
  const result = {
    cash: 0,
    upi: 0,
    card: 0,
    credit: 0,
  };

  const payments =
    Array.isArray(
      transaction?.payments
    )
      ? transaction.payments
      : [];

  if (payments.length > 0) {
    for (const payment of payments) {
      const method =
        normalizePaymentMethod(
          payment?.method
        );

      if (!method) {
        continue;
      }

      const amount =
        toNumber(
          payment?.amount
        );

      if (amount > 0) {
        result[method] += amount;
      }
    }

    return result;
  }

  const method =
    normalizePaymentMethod(
      transaction?.paymentMethod
    );

  if (method) {
    result[method] =
      toNumber(
        transaction?.totalAmount
      );
  }

  return result;
};

/**
 * Add payment breakdown.
 */
const addPaymentBreakdown = (
  target,
  transaction
) => {
  const breakdown =
    getPaymentBreakdown(
      transaction
    );

  target.cash += breakdown.cash;
  target.upi += breakdown.upi;
  target.card += breakdown.card;
  target.credit += breakdown.credit;
};

/* =====================================================
   SALES HELPERS
===================================================== */

/**
 * Convert nozzle reading into a
 * daily-closing sales object.
 */
const nozzleReadingToSale = (
  reading
) => {
  return {
    totalAmount: toNumber(
      reading?.totalAmount
    ),

    quantity: toNumber(
      reading?.litresSold
    ),

    fuelType:
      reading?.fuelType,

    payments:
      reading?.payments,

    paymentMethod:
      reading?.paymentMethod,
  };
};

/**
 * Add sale transaction into summary.
 */
const addSaleToSummary = (
  summary,
  transaction
) => {
  const amount =
    toNumber(
      transaction?.totalAmount
    );

  const quantity =
    toNumber(
      transaction?.quantity
    );

  summary.totalSales += amount;
  summary.totalFuelSold += quantity;

  if (
    transaction?.fuelType ===
    "petrol"
  ) {
    summary.petrolSold += quantity;
  }

  if (
    transaction?.fuelType ===
    "diesel"
  ) {
    summary.dieselSold += quantity;
  }

  addPaymentBreakdown(
    summary,
    transaction
  );
};

/* =====================================================
   GET DAILY CLOSING
===================================================== */

export const getDailyClosing = async (
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
          "Pump access is required",
      });
    }

    const businessDate =
      getBusinessDate(
        req.query?.date
      );

    const closing =
      await DailyClosing.findOne({
        pumpId,
        businessDate,
      })
        .populate(
          "closedBy",
          "name email role"
        )
        .populate(
          "reopenedBy",
          "name email role"
        )
        .lean();

    return res.status(200).json({
      success: true,
      closing,
    });
  } catch (error) {
    console.error(
      "GET DAILY CLOSING ERROR:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.statusCode === 400
          ? error.message
          : "Unable to load daily closing",
    });
  }
};

/* =====================================================
   CLOSE DAY
===================================================== */

export const closeDay = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    const pumpId =
      getPumpId(req);

    const userId =
      getUserId(req);

    if (!pumpId || !userId) {
      return res.status(403).json({
        success: false,
        message:
          "Authenticated pump user is required",
      });
    }

    if (
      !mongoose.isValidObjectId(
        pumpId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid pump ID",
      });
    }

    if (
      !mongoose.isValidObjectId(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid authenticated user ID",
      });
    }

    const businessDate =
      getBusinessDate(
        req.body?.businessDate
      );

    let closing;

    await session.withTransaction(
      async () => {
        /* =========================================
           EXISTING CLOSING
        ========================================= */

        const existing =
          await DailyClosing.findOne({
            pumpId,
            businessDate,
          })
            .session(session);

        if (
          existing &&
          existing.status === "closed"
        ) {
          throw createError(
            "This business day is already closed",
            409
          );
        }

        /* =========================================
           LOAD ALL REQUIRED DATA IN PARALLEL
        ========================================= */

        const [
          nozzleReadings,
          manualSales,
          expenses,
          stocks,
          pendingCustomers,
        ] = await Promise.all([
          /* ---------------------------------------
             NOZZLE SALES
          --------------------------------------- */

          NozzleReading.find({
            pumpId,
            readingDate:
              businessDate,
          })
            .select(
              "fuelType litresSold totalAmount paymentMethod payments"
            )
            .session(session)
            .lean(),

          /* ---------------------------------------
             MANUAL / PAYMENT SALES
          --------------------------------------- */

          Sale.find({
            pumpId,
            saleDate:
              businessDate,

            source: {
              $in: [
                "manual",
                "payment",
              ],
            },
          })
            .select(
              "totalAmount paymentMethod payments fuelType quantity"
            )
            .session(session)
            .lean(),

          /* ---------------------------------------
             EXPENSES
          --------------------------------------- */

          Expense.find({
            pumpId,
            expenseDate:
              businessDate,
          })
            .select("amount")
            .session(session)
            .lean(),

          /* ---------------------------------------
             CURRENT FUEL STOCK
          --------------------------------------- */

          FuelStock.find({
            pumpId,
          })
            .select(
              "fuelType currentStock totalPurchased totalSold"
            )
            .session(session)
            .lean(),

          /* ---------------------------------------
             CURRENT PENDING CREDIT
          --------------------------------------- */

          LedgerCustomer.find({
            pumpId,
            currentBalance: {
              $gt: 0,
            },
          })
            .select(
              "currentBalance"
            )
            .session(session)
            .lean(),
        ]);

        /* =========================================
           SALES SUMMARY
        ========================================= */

        const salesSummary = {
          totalSales: 0,

          cash: 0,
          upi: 0,
          card: 0,
          credit: 0,

          petrolSold: 0,
          dieselSold: 0,

          totalFuelSold: 0,
        };

        /* -----------------------------------------
           NOZZLE READINGS
        ----------------------------------------- */

        for (
          const reading of nozzleReadings
        ) {
          const sale =
            nozzleReadingToSale(
              reading
            );

          addSaleToSummary(
            salesSummary,
            sale
          );
        }

        /* -----------------------------------------
           MANUAL / PAYMENT SALES
        ----------------------------------------- */

        for (
          const sale of manualSales
        ) {
          addSaleToSummary(
            salesSummary,
            sale
          );
        }

        /* =========================================
           SALES TOTALS
        ========================================= */

        const totalSales =
          roundNumber(
            salesSummary.totalSales
          );

        const cashSales =
          roundNumber(
            salesSummary.cash
          );

        const upiSales =
          roundNumber(
            salesSummary.upi
          );

        const cardSales =
          roundNumber(
            salesSummary.card
          );

        const creditSales =
          roundNumber(
            salesSummary.credit
          );

        /* =========================================
           EXPENSE TOTAL
        ========================================= */

        const totalExpenses =
          roundNumber(
            expenses.reduce(
              (
                total,
                expense
              ) =>
                total +
                toNumber(
                  expense?.amount
                ),
              0
            )
          );

        /* =========================================
           CURRENT STOCK
        ========================================= */

        const petrolStock =
          stocks.find(
            (stock) =>
              stock?.fuelType ===
              "petrol"
          );

        const dieselStock =
          stocks.find(
            (stock) =>
              stock?.fuelType ===
              "diesel"
          );

        const petrolClosingStock =
          roundNumber(
            petrolStock?.currentStock
          );

        const dieselClosingStock =
          roundNumber(
            dieselStock?.currentStock
          );

        /* =========================================
           PENDING CREDIT
        ========================================= */

        const pendingCredit =
          roundNumber(
            pendingCustomers.reduce(
              (
                total,
                customer
              ) =>
                total +
                Math.max(
                  toNumber(
                    customer?.currentBalance
                  ),
                  0
                ),
              0
            )
          );

        /* =========================================
           NET COLLECTION
        ========================================= */

        /*
         * Credit sales are not immediate
         * cash/UPI/card collection.
         *
         * Therefore:
         *
         * cash + UPI + card - expenses
         */

        const netCollection =
          roundNumber(
            cashSales +
              upiSales +
              cardSales -
              totalExpenses
          );

        /* =========================================
           DAILY CLOSING DATA
        ========================================= */

        const closingData = {
          totalSales,

          cashSales,
          upiSales,
          cardSales,
          creditSales,

          totalExpenses,

          netCollection,

          petrolSold:
            roundNumber(
              salesSummary.petrolSold
            ),

          dieselSold:
            roundNumber(
              salesSummary.dieselSold
            ),

          petrolClosingStock,

          dieselClosingStock,

          pendingCredit,

          status: "closed",

          closedBy: userId,

          closedAt:
            new Date(),

          reopenedBy: null,

          reopenedAt: null,

          note: String(
            req.body?.note || ""
          ).trim(),
        };

        /* =========================================
           SAVE CLOSING
        ========================================= */

        if (existing) {
          Object.assign(
            existing,
            closingData
          );

          closing =
            await existing.save({
              session,
            });
        } else {
          const documents =
            await DailyClosing.create(
              [
                {
                  pumpId,

                  businessDate,

                  ...closingData,
                },
              ],
              {
                session,
              }
            );

          closing =
            documents[0];
        }

        /* =========================================
           AUDIT LOG
        ========================================= */

        await createAuditLog({
          req,

          action:
            "CLOSE_DAY",

          module:
            "DailyClosing",

          recordId:
            closing._id,

          description:
            `Business day ${businessDate} closed`,

          newData:
            closing.toObject(),

          session,
        });
      }
    );

    return res.status(201).json({
      success: true,

      message:
        "Business day closed successfully",

      closing,
    });
  } catch (error) {
    console.error(
      "CLOSE DAY ERROR:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message:
        error.statusCode === 400 ||
        error.statusCode === 409
          ? error.message
          : "Unable to close business day",
    });
  } finally {
    await session.endSession();
  }
};

/* =====================================================
   REOPEN DAY
===================================================== */

export const reopenDay = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    const { id } =
      req.params;

    const pumpId =
      getPumpId(req);

    const userId =
      getUserId(req);

    if (!pumpId || !userId) {
      return res.status(403).json({
        success: false,
        message:
          "Authenticated pump user is required",
      });
    }

    if (
      !mongoose.isValidObjectId(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid daily closing ID",
      });
    }

    let closing;

    await session.withTransaction(
      async () => {
        /* =========================================
           FIND CLOSING
        ========================================= */

        closing =
          await DailyClosing.findOne({
            _id: id,
            pumpId,
          })
            .session(session);

        if (!closing) {
          throw createError(
            "Daily closing not found",
            404
          );
        }

        if (
          closing.status ===
          "reopened"
        ) {
          throw createError(
            "This business day is already reopened",
            409
          );
        }

        /* =========================================
           OLD STATUS
        ========================================= */

        const oldStatus =
          closing.status;

        /* =========================================
           UPDATE
        ========================================= */

        closing.status =
          "reopened";

        closing.reopenedBy =
          userId;

        closing.reopenedAt =
          new Date();

        await closing.save({
          session,
        });

        /* =========================================
           AUDIT
        ========================================= */

        await createAuditLog({
          req,

          action:
            "REOPEN_DAY",

          module:
            "DailyClosing",

          recordId:
            closing._id,

          description:
            `Business day ${closing.businessDate} reopened`,

          oldData: {
            status:
              oldStatus,
          },

          newData: {
            status:
              "reopened",

            reopenedBy:
              userId,

            reopenedAt:
              closing.reopenedAt,
          },

          session,
        });
      }
    );

    return res.status(200).json({
      success: true,

      message:
        "Business day reopened",

      closing,
    });
  } catch (error) {
    console.error(
      "REOPEN DAY ERROR:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,

      message:
        error.statusCode === 400 ||
        error.statusCode === 404 ||
        error.statusCode === 409
          ? error.message
          : "Unable to reopen day",
    });
  } finally {
    await session.endSession();
  }
};