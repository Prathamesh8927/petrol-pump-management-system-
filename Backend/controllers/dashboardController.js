import mongoose from "mongoose";

import Sale from "../models/Sale.js";
import FuelStock from "../models/FuelStock.js";
import LedgerCustomer from "../models/LedgerCustomer.js";
import Expense from "../models/Expense.js";

/* =====================================================
   HELPERS
===================================================== */

const getPumpId = (req) =>
  req.user?.pumpId?._id ||
  req.user?.pumpId ||
  null;

const todayString = () =>
  new Date().toLocaleDateString(
    "en-CA"
  );

const toNumber = (value) =>
  Number(value || 0);

const roundMoney = (value) =>
  Number(
    toNumber(value).toFixed(2)
  );

/* =====================================================
   FIND LEDGER ENTRY COLLECTION
===================================================== */

const getLedgerEntryCollection =
  async () => {
    const db =
      mongoose.connection.db;

    if (!db) {
      return null;
    }

    const collections =
      await db
        .listCollections(
          {},
          {
            nameOnly: true,
          }
        )
        .toArray();

    const names =
      collections.map(
        (item) =>
          item.name
      );

    const preferredNames = [
      "ledgerentries",
      "ledger_entries",
      "ledgertransactions",
      "ledger_transactions",
    ];

    const exactName =
      preferredNames.find(
        (name) =>
          names.includes(name)
      );

    if (exactName) {
      return db.collection(
        exactName
      );
    }

    const fallbackName =
      names.find(
        (name) => {
          const lower =
            name.toLowerCase();

          return (
            lower.includes(
              "ledger"
            ) &&
            (
              lower.includes(
                "entry"
              ) ||
              lower.includes(
                "transaction"
              )
            )
          );
        }
      );

    if (!fallbackName) {
      return null;
    }

    return db.collection(
      fallbackName
    );
  };

/* =====================================================
   GET TODAY'S LEDGER CREDIT

   Credit =
   pendingAmount

   OR

   totalAmount - paidAmount
===================================================== */

const getTodayLedgerCredit =
  async ({
    pumpId,
    date,
    customers,
  }) => {
    try {
      if (
        !customers ||
        customers.length === 0
      ) {
        return 0;
      }

      const collection =
        await getLedgerEntryCollection();

      if (!collection) {
        console.log(
          "DASHBOARD LEDGER CREDIT: Ledger entry collection not found"
        );

        return 0;
      }

      const customerIds =
        customers.map(
          (customer) =>
            customer._id
        );

      let normalizedPumpId =
        pumpId;

      if (
        mongoose.Types.ObjectId.isValid(
          String(pumpId)
        )
      ) {
        normalizedPumpId =
          new mongoose.Types.ObjectId(
            String(pumpId)
          );
      }

      const startDate =
        new Date(
          `${date}T00:00:00.000Z`
        );

      const endDate =
        new Date(
          `${date}T23:59:59.999Z`
        );

      const entries =
        await collection
          .find({
            entryType:
              "purchase",

            $and: [
              {
                $or: [
                  {
                    customerId: {
                      $in:
                        customerIds,
                    },
                  },

                  {
                    pumpId:
                      normalizedPumpId,
                  },
                ],
              },

              {
                $or: [
                  {
                    entryDate:
                      date,
                  },

                  {
                    date:
                      date,
                  },

                  {
                    createdAt: {
                      $gte:
                        startDate,

                      $lte:
                        endDate,
                    },
                  },
                ],
              },
            ],
          })
          .toArray();

      const credit =
        entries.reduce(
          (
            total,
            entry
          ) => {
            /*
              Use saved pending
              if available.
            */

            if (
              entry.pendingAmount !==
                undefined &&
              entry.pendingAmount !==
                null
            ) {
              return (
                total +
                Math.max(
                  toNumber(
                    entry.pendingAmount
                  ),
                  0
                )
              );
            }

            /*
              Otherwise calculate:
              total - paid
            */

            const totalAmount =
              toNumber(
                entry.totalAmount
              );

            const paidAmount =
              toNumber(
                entry.paidAmount
              );

            return (
              total +
              Math.max(
                totalAmount -
                  paidAmount,
                0
              )
            );
          },
          0
        );

      console.log(
        "DASHBOARD LEDGER PURCHASES TODAY:",
        entries.length
      );

      console.log(
        "DASHBOARD LEDGER CREDIT TODAY:",
        roundMoney(
          credit
        )
      );

      return credit;
    } catch (error) {
      console.error(
        "DASHBOARD LEDGER CREDIT ERROR:",
        error
      );

      return 0;
    }
  };

/* =====================================================
   DASHBOARD SUMMARY
===================================================== */

export const getDashboardSummary =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Pump information not found",
          });
      }

      const date =
        req.query.date ||
        todayString();

      /* =================================================
         SALES
      ================================================= */

      const sales =
        await Sale.find({
          pumpId,
          saleDate:
            date,
        });

      let todaySales =
        0;

      let cashSales =
        0;

      let upiSales =
        0;

      let cardSales =
        0;

      let directCreditSales =
        0;

      let petrolSold =
        0;

      let dieselSold =
        0;

      for (
        const sale of sales
      ) {
        const amount =
          toNumber(
            sale.totalAmount
          );

        const quantity =
          toNumber(
            sale.quantity
          );

        todaySales +=
          amount;

        /* PAYMENT */

        if (
          sale.paymentMethod ===
          "cash"
        ) {
          cashSales +=
            amount;
        }

        if (
          sale.paymentMethod ===
          "upi"
        ) {
          upiSales +=
            amount;
        }

        if (
          sale.paymentMethod ===
          "card"
        ) {
          cardSales +=
            amount;
        }

        if (
          sale.paymentMethod ===
          "credit"
        ) {
          directCreditSales +=
            amount;
        }

        /* FUEL */

        if (
          sale.fuelType ===
          "petrol"
        ) {
          petrolSold +=
            quantity;
        }

        if (
          sale.fuelType ===
          "diesel"
        ) {
          dieselSold +=
            quantity;
        }
      }

      /* =================================================
         STOCK
      ================================================= */

      const stocks =
        await FuelStock.find({
          pumpId,
        });

      const petrolStockDocument =
        stocks.find(
          (item) =>
            String(
              item.fuelType
            ).toLowerCase() ===
            "petrol"
        );

      const dieselStockDocument =
        stocks.find(
          (item) =>
            String(
              item.fuelType
            ).toLowerCase() ===
            "diesel"
        );

      const petrolStock =
        toNumber(
          petrolStockDocument
            ?.currentStock
        );

      const dieselStock =
        toNumber(
          dieselStockDocument
            ?.currentStock
        );

      const totalFuelStock =
        petrolStock +
        dieselStock;

      const totalFuelSold =
        petrolSold +
        dieselSold;

      /* =================================================
         LEDGER PENDING CREDIT
      ================================================= */

      let customers = [];

      let pendingCredit =
        0;

      try {
        customers =
          await LedgerCustomer.find({
            pumpId,
            status:
              "active",
          });

        pendingCredit =
          customers.reduce(
            (
              total,
              customer
            ) =>
              total +
              toNumber(
                customer.currentBalance
              ),
            0
          );
      } catch (error) {
        console.error(
          "LEDGER SUMMARY ERROR:",
          error
        );
      }

      /* =================================================
         TODAY'S LEDGER CREDIT
      ================================================= */

      const ledgerCreditSales =
        await getTodayLedgerCredit({
          pumpId,
          date,
          customers,
        });

      /*
        Final Credit Sale:

        Direct credit fuel sales
        +
        Today's unpaid ledger purchases
      */

      const creditSales =
        directCreditSales +
        ledgerCreditSales;

      /* =================================================
         EXPENSES
      ================================================= */

      let totalExpenses =
        0;

      try {
        const expenses =
          await Expense.find({
            pumpId,
          });

        totalExpenses =
          expenses
            .filter(
              (expense) => {
                const expenseDate =
                  expense.expenseDate ||
                  expense.date ||
                  expense.createdAt
                    ?.toISOString?.()
                    ?.slice(
                      0,
                      10
                    );

                return (
                  expenseDate ===
                  date
                );
              }
            )
            .reduce(
              (
                total,
                expense
              ) =>
                total +
                toNumber(
                  expense.amount
                ),
              0
            );
      } catch (error) {
        console.error(
          "EXPENSE SUMMARY ERROR:",
          error
        );
      }

      /* =================================================
         NET COLLECTION

         Credit is not collected money.
      ================================================= */

      const netCollection =
        cashSales +
        upiSales +
        cardSales -
        totalExpenses;

      /* =================================================
         SUMMARY
      ================================================= */

      const summary = {
        todaySales:
          roundMoney(
            todaySales
          ),

        creditSales:
          roundMoney(
            creditSales
          ),

        cashSales:
          roundMoney(
            cashSales
          ),

        upiSales:
          roundMoney(
            upiSales
          ),

        cardSales:
          roundMoney(
            cardSales
          ),

        totalExpenses:
          roundMoney(
            totalExpenses
          ),

        pendingCredit:
          roundMoney(
            pendingCredit
          ),

        petrolStock:
          roundMoney(
            petrolStock
          ),

        dieselStock:
          roundMoney(
            dieselStock
          ),

        totalFuelStock:
          roundMoney(
            totalFuelStock
          ),

        petrolSold:
          roundMoney(
            petrolSold
          ),

        dieselSold:
          roundMoney(
            dieselSold
          ),

        totalFuelSold:
          roundMoney(
            totalFuelSold
          ),

        netCollection:
          roundMoney(
            netCollection
          ),

        saleCount:
          sales.length,
      };

      /* =================================================
         DEBUG
      ================================================= */

      console.log(
        "DASHBOARD DATE:",
        date
      );

      console.log(
        "PETROL SOLD:",
        summary.petrolSold
      );

      console.log(
        "DIESEL SOLD:",
        summary.dieselSold
      );

      console.log(
        "DASHBOARD SALES:",
        sales.length
      );

      console.log(
        "DASHBOARD SALE TOTAL:",
        summary.todaySales
      );

      console.log(
        "DIRECT CREDIT SALES:",
        roundMoney(
          directCreditSales
        )
      );

      console.log(
        "LEDGER CREDIT SALES:",
        roundMoney(
          ledgerCreditSales
        )
      );

      console.log(
        "DASHBOARD CREDIT SALES:",
        summary.creditSales
      );

      console.log(
        "DASHBOARD PENDING CREDIT:",
        summary.pendingCredit
      );

      /* =================================================
         RESPONSE
      ================================================= */

      return res
        .status(200)
        .json({
          success: true,

          date,

          summary,

          /* ===============================
             OLD FRONTEND COMPATIBILITY
          =============================== */

          todaySale:
            summary.todaySales,

          todaysSale:
            summary.todaySales,

          totalSales:
            summary.todaySales,

          creditSale:
            summary.creditSales,

          creditSales:
            summary.creditSales,

          cashSale:
            summary.cashSales,

          cashSales:
            summary.cashSales,

          upiSale:
            summary.upiSales,

          upiSales:
            summary.upiSales,

          cardSale:
            summary.cardSales,

          cardSales:
            summary.cardSales,

          todayExpense:
            summary.totalExpenses,

          totalExpenses:
            summary.totalExpenses,

          pendingCredit:
            summary.pendingCredit,

          petrolStock:
            summary.petrolStock,

          dieselStock:
            summary.dieselStock,

          totalFuelStock:
            summary.totalFuelStock,

          petrolSold:
            summary.petrolSold,

          dieselSold:
            summary.dieselSold,

          totalFuelSold:
            summary.totalFuelSold,

          netCollection:
            summary.netCollection,
        });
    } catch (error) {
      console.error(
        "DASHBOARD SUMMARY ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load dashboard summary",

          error:
            error.message,
        });
    }
  };