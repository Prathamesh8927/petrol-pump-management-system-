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

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const roundMoney = (value) =>
  Number(
    toNumber(value).toFixed(2)
  );

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
      String(value)
    )
  ) {
    return new mongoose.Types.ObjectId(
      String(value)
    );
  }

  return null;
};

const isValidDateString = (
  value
) =>
  /^\d{4}-\d{2}-\d{2}$/.test(
    String(value)
  );

/* =====================================================
   LEDGER COLLECTION CACHE

   Avoid listCollections() on every
   dashboard request.
===================================================== */

let cachedLedgerCollectionName =
  null;

let ledgerCollectionChecked =
  false;

/*
  Useful when the application starts before
  the ledger collection exists.

  If needed, the cache can be reset after
  collection creation.
*/
const resetLedgerCollectionCache =
  () => {
    cachedLedgerCollectionName =
      null;

    ledgerCollectionChecked =
      false;
  };

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

    if (
      ledgerCollectionChecked
    ) {
      return cachedLedgerCollectionName
        ? db.collection(
            cachedLedgerCollectionName
          )
        : null;
    }

    try {
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
        cachedLedgerCollectionName =
          exactName;

        ledgerCollectionChecked =
          true;

        return db.collection(
          exactName
        );
      }

      const fallbackName =
        names.find(
          (name) => {
            const lower =
              String(
                name
              ).toLowerCase();

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

      ledgerCollectionChecked =
        true;

      if (!fallbackName) {
        cachedLedgerCollectionName =
          null;

        return null;
      }

      cachedLedgerCollectionName =
        fallbackName;

      return db.collection(
        fallbackName
      );
    } catch (error) {
      console.error(
        "LEDGER COLLECTION DISCOVERY ERROR:",
        error
      );

      /*
        Do not permanently cache a discovery
        failure. A later request can retry.
      */
      resetLedgerCollectionCache();

      return null;
    }
  };

/* =====================================================
   GET TODAY'S LEDGER CREDIT

   Credit =
   pendingAmount

   OR

   totalAmount - paidAmount

   SECURITY:
   pumpId + customerId are both required.
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

      const normalizedPumpId =
        normalizeObjectId(
          pumpId
        );

      if (!normalizedPumpId) {
        console.error(
          "DASHBOARD LEDGER CREDIT: Invalid pumpId"
        );

        return 0;
      }

      const collection =
        await getLedgerEntryCollection();

      if (!collection) {
        return 0;
      }

      const customerIds =
        customers
          .map(
            (customer) =>
              normalizeObjectId(
                customer._id
              )
          )
          .filter(Boolean);

      if (
        customerIds.length === 0
      ) {
        return 0;
      }

      const startDate =
        new Date(
          `${date}T00:00:00.000Z`
        );

      const endDate =
        new Date(
          `${date}T23:59:59.999Z`
        );

      /*
        IMPORTANT:

        Never allow a customer from another
        pump to contribute to this dashboard.

        Both conditions are mandatory:

        pumpId = current pump
        customerId = current pump's customer
      */

      const entries =
        await collection
          .find({
            pumpId:
              normalizedPumpId,

            customerId: {
              $in: customerIds,
            },

            entryType:
              "purchase",

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
          })
          .toArray();

      const credit =
        entries.reduce(
          (
            total,
            entry
          ) => {
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

      return credit;
    } catch (error) {
      console.error(
        "DASHBOARD LEDGER CREDIT ERROR:",
        error
      );

      /*
        Dashboard should still load even if
        an optional legacy ledger collection
        cannot be read.
      */
      return 0;
    }
  };

/* =====================================================
   GET DASHBOARD SUMMARY
===================================================== */

export const getDashboardSummary =
  async (req, res) => {
    try {
      /* =====================================
         PUMP ISOLATION
      ===================================== */

      const pumpId =
        normalizeObjectId(
          getPumpId(req)
        );

      if (!pumpId) {
        return res.status(403).json({
          success: false,

          message:
            "Pump information not found",
        });
      }

      /* =====================================
         DATE
      ===================================== */

      const requestedDate =
        req.query?.date;

      const date =
        requestedDate ||
        todayString();

      if (
        !isValidDateString(
          date
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid date format. Use YYYY-MM-DD.",
        });
      }

      /* =====================================
         SALES

         Strictly scoped by pumpId + date.
      ===================================== */

      const sales =
        await Sale.find({
          pumpId,

          saleDate:
            date,
        })
          .select(
            "totalAmount quantity paymentMethod fuelType"
          )
          .lean();

      let todaySales = 0;

      let cashSales = 0;

      let upiSales = 0;

      let cardSales = 0;

      let directCreditSales = 0;

      let petrolSold = 0;

      let dieselSold = 0;

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

        const fuelType =
          String(
            sale.fuelType || ""
          )
            .trim()
            .toLowerCase();

        if (
          fuelType ===
          "petrol"
        ) {
          petrolSold +=
            quantity;
        }

        if (
          fuelType ===
          "diesel"
        ) {
          dieselSold +=
            quantity;
        }
      }

      /* =====================================
         STOCK
      ===================================== */

      const stocks =
        await FuelStock.find({
          pumpId,
        })
          .select(
            "fuelType currentStock"
          )
          .lean();

      const petrolStockDocument =
        stocks.find(
          (item) =>
            String(
              item.fuelType
            )
              .trim()
              .toLowerCase() ===
            "petrol"
        );

      const dieselStockDocument =
        stocks.find(
          (item) =>
            String(
              item.fuelType
            )
              .trim()
              .toLowerCase() ===
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

      /* =====================================
         LEDGER CUSTOMER BALANCES
      ===================================== */

      let customers = [];

      let pendingCredit = 0;

      try {
        customers =
          await LedgerCustomer.find(
            {
              pumpId,

              status:
                "active",
            }
          )
            .select(
              "_id currentBalance"
            )
            .lean();

        pendingCredit =
          customers.reduce(
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
      } catch (error) {
        console.error(
          "LEDGER SUMMARY ERROR:",
          error
        );
      }

      /* =====================================
         TODAY'S LEDGER CREDIT
      ===================================== */

      const ledgerCreditSales =
        await getTodayLedgerCredit({
          pumpId,

          date,

          customers,
        });

      /*
        Final credit sales:

        Direct credit sales
        +
        Today's unpaid ledger purchases
      */

      const creditSales =
        directCreditSales +
        ledgerCreditSales;

      /* =====================================
         EXPENSES

         IMPORTANT:
         Filter at MongoDB level instead
         of loading every historical expense.
      ===================================== */

      let totalExpenses = 0;

      try {
        const expenses =
          await Expense.find({
            pumpId,

            $or: [
              {
                expenseDate:
                  date,
              },

              {
                date:
                  date,
              },

              {
                createdAt: {
                  $gte:
                    new Date(
                      `${date}T00:00:00.000Z`
                    ),

                  $lte:
                    new Date(
                      `${date}T23:59:59.999Z`
                    ),
                },
              },
            ],
          })
            .select(
              "amount expenseDate date createdAt"
            )
            .lean();

        totalExpenses =
          expenses.reduce(
            (
              total,
              expense
            ) =>
              total +
              Math.max(
                toNumber(
                  expense.amount
                ),
                0
              ),
            0
          );
      } catch (error) {
        console.error(
          "EXPENSE SUMMARY ERROR:",
          error
        );
      }

      /* =====================================
         NET COLLECTION

         Credit is not collected money.

         Therefore:

         cash
         + UPI
         + card
         - expenses
      ===================================== */

      const netCollection =
        cashSales +
        upiSales +
        cardSales -
        totalExpenses;

      /* =====================================
         SUMMARY
      ===================================== */

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

      /* =====================================
         RESPONSE

         Existing frontend aliases preserved.
      ===================================== */

      return res.status(200).json({
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

      return res.status(500).json({
        success: false,

        message:
          "Unable to load dashboard summary",
      });
    }
  };