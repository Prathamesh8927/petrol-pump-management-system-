import DailyClosing from "../models/DailyClosing.js";

import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";
import FuelStock from "../models/FuelStock.js";
import LedgerEntry from "../models/LedgerEntry.js";
import LedgerCustomer from "../models/LedgerCustomer.js";

import createAuditLog from "../utils/createAuditLog.js";

const sum = (
  list,
  field
) =>
  list.reduce(
    (total, item) =>
      total +
      Number(
        item?.[field] || 0
      ),
    0
  );

/* =====================================================
   GET DAY CLOSING
===================================================== */

export const getDailyClosing =
  async (req, res) => {
    try {
      const date =
        req.query.date ||
        new Date().toLocaleDateString(
          "en-CA"
        );

      const closing =
        await DailyClosing.findOne({
          pumpId:
            req.user.pumpId,

          businessDate:
            date,
        }).populate(
          "closedBy",
          "name email"
        );

      return res.status(200).json({
        success: true,
        closing,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,

        message:
          "Unable to load daily closing",

        error:
          error.message,
      });
    }
  };

/* =====================================================
   CLOSE DAY
===================================================== */

export const closeDay =
  async (req, res) => {
    try {
      const pumpId =
        req.user.pumpId;

      const businessDate =
        req.body.businessDate ||
        new Date().toLocaleDateString(
          "en-CA"
        );

      const existing =
        await DailyClosing.findOne({
          pumpId,
          businessDate,
        });

      if (
        existing &&
        existing.status ===
          "closed"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "This business day is already closed",
        });
      }

      const sales =
        await Sale.find({
          pumpId,
          businessDate,
        });

      const expenses =
        await Expense.find({
          pumpId,

          expenseDate:
            businessDate,
        });

      const credits =
        await LedgerEntry.find({
          pumpId,

          entryType:
            "credit",

          entryDate:
            businessDate,
        });

      const stocks =
        await FuelStock.find({
          pumpId,
        });

      const pendingCustomers =
        await LedgerCustomer.find({
          pumpId,

          currentBalance: {
            $gt: 0,
          },
        });

      const normalSales =
        sum(
          sales,
          "totalAmount"
        );

      const creditSales =
        sum(
          credits,
          "amount"
        );

      const totalSales =
        normalSales +
        creditSales;

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

      const totalExpenses =
        sum(
          expenses,
          "amount"
        );

      const petrol =
        stocks.find(
          (item) =>
            item.fuelType ===
            "petrol"
        );

      const diesel =
        stocks.find(
          (item) =>
            item.fuelType ===
            "diesel"
        );

      const pendingCredit =
        pendingCustomers.reduce(
          (
            total,
            customer
          ) =>
            total +
            Number(
              customer.currentBalance ||
                0
            ),
          0
        );

      const closing =
        await DailyClosing.findOneAndUpdate(
          {
            pumpId,
            businessDate,
          },

          {
            $set: {
              totalSales,

              cashSales,

              upiSales,

              cardSales,

              creditSales,

              totalExpenses,

              netCollection:
                totalSales -
                totalExpenses,

              petrolSold:
                Number(
                  petrol?.sold ||
                    0
                ),

              dieselSold:
                Number(
                  diesel?.sold ||
                    0
                ),

              petrolClosingStock:
                Number(
                  petrol
                    ?.currentStock ||
                    0
                ),

              dieselClosingStock:
                Number(
                  diesel
                    ?.currentStock ||
                    0
                ),

              pendingCredit,

              status:
                "closed",

              closedBy:
                req.user._id,

              closedAt:
                new Date(),

              note:
                String(
                  req.body.note ||
                    ""
                ).trim(),
            },
          },

          {
            upsert: true,

            returnDocument:
              "after",

            runValidators:
              true,
          }
        );

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
      });

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

      return res.status(500).json({
        success: false,

        message:
          "Unable to close business day",

        error:
          error.message,
      });
    }
  };

/* =====================================================
   REOPEN DAY
===================================================== */

export const reopenDay =
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const closing =
        await DailyClosing.findOne({
          _id: id,

          pumpId:
            req.user.pumpId,
        });

      if (!closing) {
        return res.status(404).json({
          success: false,

          message:
            "Daily closing not found",
        });
      }

      closing.status =
        "reopened";

      closing.reopenedBy =
        req.user._id;

      closing.reopenedAt =
        new Date();

      await closing.save();

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
      });

      return res.status(200).json({
        success: true,

        message:
          "Business day reopened",

        closing,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,

        message:
          "Unable to reopen day",

        error:
          error.message,
      });
    }
  };