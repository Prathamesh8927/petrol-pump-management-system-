import mongoose from "mongoose";

import DailyClosing from "../models/DailyClosing.js";

import Sale from "../models/Sale.js";
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
 * Get today's business date using the configured
 * business timezone instead of the Render server timezone.
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
      const error = new Error(
        "Business date must be in YYYY-MM-DD format"
      );

      error.statusCode = 400;

      throw error;
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

  if (!pumpId) {
    return null;
  }

  return pumpId;
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
 * Numeric safe conversion.
 */
const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

/**
 * Sum a numeric field.
 */
const sum = (list, field) => {
  if (!Array.isArray(list)) {
    return 0;
  }

  return list.reduce(
    (total, item) =>
      total +
      toNumber(item?.[field]),
    0
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
   GET DAILY CLOSING
===================================================== */

export const getDailyClosing = async (
  req,
  res
) => {
  try {
    const pumpId = getPumpId(req);

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
    const pumpId = getPumpId(req);
    const userId = getUserId(req);

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
          }).session(session);

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
           SALES
        ========================================= */

        const sales =
          await Sale.find({
            pumpId,
            saleDate: businessDate,
          })
            .select(
              "totalAmount paymentMethod fuelType quantity"
            )
            .session(session)
            .lean();

        /*
         * Sale already represents the actual sale
         * transaction generated by the application.
         *
         * Therefore totalSales is calculated directly
         * from Sale records.
         */
        const totalSales =
          sum(
            sales,
            "totalAmount"
          );

        const cashSales =
          sum(
            sales.filter(
              (sale) =>
                sale.paymentMethod ===
                "cash"
            ),
            "totalAmount"
          );

        const upiSales =
          sum(
            sales.filter(
              (sale) =>
                sale.paymentMethod ===
                "upi"
            ),
            "totalAmount"
          );

        const cardSales =
          sum(
            sales.filter(
              (sale) =>
                sale.paymentMethod ===
                "card"
            ),
            "totalAmount"
          );

        /*
         * Credit sales are actual Sale records
         * having paymentMethod = credit.
         */
        const creditSales =
          sum(
            sales.filter(
              (sale) =>
                sale.paymentMethod ===
                "credit"
            ),
            "totalAmount"
          );

        /* =========================================
           EXPENSES
        ========================================= */

        const expenses =
          await Expense.find({
            pumpId,
            expenseDate:
              businessDate,
          })
            .select("amount")
            .session(session)
            .lean();

        const totalExpenses =
          sum(
            expenses,
            "amount"
          );

        /* =========================================
           LEDGER PURCHASES
        ========================================= */

        /*
         * Read today's ledger purchases for
         * reporting/audit consistency.
         *
         * These are NOT added again to totalSales
         * because Sale is the source of truth for
         * sales totals.
         */
        const ledgerPurchases =
          await LedgerEntry.find({
            pumpId,
            entryType: "purchase",
            entryDate:
              businessDate,
          })
            .select(
              "totalAmount paidAmount pendingAmount fuelType"
            )
            .session(session)
            .lean();

        /* =========================================
           FUEL STOCK
        ========================================= */

        const stocks =
          await FuelStock.find({
            pumpId,
          })
            .select(
              "fuelType currentStock totalPurchased totalSold"
            )
            .session(session)
            .lean();

        const petrolStock =
          stocks.find(
            (stock) =>
              stock.fuelType ===
              "petrol"
          );

        const dieselStock =
          stocks.find(
            (stock) =>
              stock.fuelType ===
              "diesel"
          );

        /* =========================================
           TODAY'S FUEL SOLD
        ========================================= */

        const petrolSold =
          sales
            .filter(
              (sale) =>
                sale.fuelType ===
                "petrol"
            )
            .reduce(
              (
                total,
                sale
              ) =>
                total +
                toNumber(
                  sale.quantity
                ),
              0
            );

        const dieselSold =
          sales
            .filter(
              (sale) =>
                sale.fuelType ===
                "diesel"
            )
            .reduce(
              (
                total,
                sale
              ) =>
                total +
                toNumber(
                  sale.quantity
                ),
              0
            );

        /* =========================================
           CURRENT PENDING CREDIT
        ========================================= */

        const pendingCustomers =
          await LedgerCustomer.find({
            pumpId,
            currentBalance: {
              $gt: 0,
            },
          })
            .select(
              "currentBalance"
            )
            .session(session)
            .lean();

        const pendingCredit =
          pendingCustomers.reduce(
            (
              total,
              customer
            ) =>
              total +
              Math.max(
                toNumber(
                  customer.currentBalance
                ),
                0
              ),
            0
          );

        /* =========================================
           NET COLLECTION
        ========================================= */

        /*
         * Credit sales are not immediate
         * cash/UPI/card collections.
         *
         * Actual collection:
         *
         * cash + UPI + card - expenses
         */
        const netCollection =
          cashSales +
          upiSales +
          cardSales -
          totalExpenses;

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

          petrolSold,
          dieselSold,

          petrolClosingStock:
            toNumber(
              petrolStock?.currentStock
            ),

          dieselClosingStock:
            toNumber(
              dieselStock?.currentStock
            ),

          pendingCredit,

          status: "closed",

          closedBy: userId,
          closedAt: new Date(),

          reopenedBy: null,
          reopenedAt: null,

          note: String(
            req.body?.note || ""
          ).trim(),
        };

        /* =========================================
           UPDATE REOPENED CLOSING
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
          /* =======================================
             CREATE NEW CLOSING
          ======================================= */

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
           AUDIT
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

        /*
         * ledgerPurchases is intentionally queried
         * above for consistency and future reporting,
         * but is not added to sales totals.
         */
        void ledgerPurchases;
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
        closing =
          await DailyClosing.findOne({
            _id: id,
            pumpId,
          }).session(session);

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

        const oldStatus =
          closing.status;

        closing.status =
          "reopened";

        closing.reopenedBy =
          userId;

        closing.reopenedAt =
          new Date();

        await closing.save({
          session,
        });

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