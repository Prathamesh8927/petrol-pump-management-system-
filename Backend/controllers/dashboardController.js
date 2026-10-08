import mongoose from "mongoose";

import Sale from "../models/Sale.js";
import NozzleReading from "../models/NozzleReading.js";
import FuelStock from "../models/FuelStock.js";
import LedgerCustomer from "../models/LedgerCustomer.js";
import Expense from "../models/Expense.js";

/* =====================================================
   CONSTANTS
===================================================== */

const PAYMENT_METHODS = [
  "cash",
  "upi",
  "card",
  "credit",
];

const BUSINESS_TIMEZONE = "Asia/Kolkata";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/* =====================================================
   HELPERS
===================================================== */

const getPumpId = (req) =>
  req.user?.pumpId?._id ||
  req.user?.pumpId ||
  null;

/* =====================================================
   TODAY DATE
===================================================== */

const todayString = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

/* =====================================================
   NUMBER HELPERS
===================================================== */

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

  const stringValue = String(value);

  if (
    !mongoose.Types.ObjectId.isValid(
      stringValue
    )
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(
    stringValue
  );
};

/* =====================================================
   DATE VALIDATION
===================================================== */

const isValidDateString = (value) =>
  DATE_REGEX.test(
    String(value || "")
  );

/* =====================================================
   DATE RANGE
===================================================== */

const getDateRange = (date) => ({
  startDate: new Date(
    `${date}T00:00:00.000Z`
  ),

  endDate: new Date(
    `${date}T23:59:59.999Z`
  ),
});

/* =====================================================
   FUEL NORMALIZATION
===================================================== */

const normalizeFuelType = (value) => {
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

/* =====================================================
   PAYMENT NORMALIZATION
===================================================== */

const normalizePaymentMethod = (value) =>
  String(
    value || ""
  )
    .trim()
    .toLowerCase();

/* =====================================================
   PAYMENT BREAKDOWN
===================================================== */

/*
 * Supports:
 *
 * 1. New split-payment records
 *    payments: [
 *      { method: "cash", amount: 1000 },
 *      { method: "upi", amount: 500 }
 *    ]
 *
 * 2. Old single-payment records
 *    paymentMethod: "cash"
 */
const getPaymentBreakdown = (
  transaction
) => {
  const breakdown = {};

  /* =====================================
     SPLIT PAYMENTS
  ===================================== */

  if (
    Array.isArray(
      transaction?.payments
    ) &&
    transaction.payments.length > 0
  ) {
    for (const payment of transaction.payments) {
      const method =
        normalizePaymentMethod(
          payment?.method
        );

      const amount = Number(
        payment?.amount || 0
      );

      if (
        PAYMENT_METHODS.includes(
          method
        ) &&
        Number.isFinite(amount) &&
        amount > 0
      ) {
        breakdown[method] =
          (breakdown[method] || 0) +
          amount;
      }
    }

    /*
     * Only use split payments when at least
     * one valid payment exists.
     */
    if (
      Object.keys(breakdown).length > 0
    ) {
      return breakdown;
    }
  }

  /* =====================================
     OLD SINGLE PAYMENT
  ===================================== */

  const method =
    normalizePaymentMethod(
      transaction?.paymentMethod
    );

  const total = Number(
    transaction?.totalAmount || 0
  );

  if (
    PAYMENT_METHODS.includes(method) &&
    Number.isFinite(total) &&
    total > 0
  ) {
    breakdown[method] = total;
  }

  return breakdown;
};

/* =====================================================
   LEDGER COLLECTION CACHE
===================================================== */

/*
 * The application historically supported multiple
 * possible ledger collection names.
 *
 * Collection discovery is therefore kept for backward
 * compatibility, but it happens only once per process.
 */

let cachedLedgerCollectionName = null;

let ledgerCollectionChecked = false;

let ledgerCollectionPromise = null;

/* =====================================================
   RESET LEDGER CACHE
===================================================== */

const resetLedgerCollectionCache = () => {
  cachedLedgerCollectionName = null;

  ledgerCollectionChecked = false;

  ledgerCollectionPromise = null;
};

/* =====================================================
   FIND LEDGER COLLECTION
===================================================== */

const getLedgerEntryCollection = async () => {
  const db = mongoose.connection.db;

  if (!db) {
    return null;
  }

  /* =====================================
     CACHED RESULT
  ===================================== */

  if (ledgerCollectionChecked) {
    return cachedLedgerCollectionName
      ? db.collection(
          cachedLedgerCollectionName
        )
      : null;
  }

  /*
   * Prevent multiple simultaneous dashboard
   * requests from calling listCollections()
   * at the same time.
   */
  if (ledgerCollectionPromise) {
    return ledgerCollectionPromise;
  }

  ledgerCollectionPromise =
    (async () => {
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
            (item) => item.name
          );

        /* ===============================
           PREFERRED COLLECTION NAMES
        =============================== */

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

        /* ===============================
           FALLBACK DISCOVERY
        =============================== */

        const fallbackName =
          names.find((name) => {
            const lower =
              String(name).toLowerCase();

            return (
              lower.includes("ledger") &&
              (
                lower.includes("entry") ||
                lower.includes("transaction")
              )
            );
          });

        ledgerCollectionChecked = true;

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
          error.message
        );

        resetLedgerCollectionCache();

        return null;
      } finally {
        /*
         * Only keep the result through the
         * cached collection-name mechanism.
         */
        ledgerCollectionPromise = null;
      }
    })();

  return ledgerCollectionPromise;
};

/* =====================================================
   GET TODAY'S LEDGER CREDIT
===================================================== */

/*
 * Previous implementation:
 *
 * - loaded all matching ledger entries
 * - transferred them to Node.js
 * - calculated pending credit in JavaScript
 *
 * Optimized implementation:
 *
 * - MongoDB performs the filtering
 * - MongoDB performs the SUM
 * - Node receives only one small result
 *
 * This significantly reduces memory usage and
 * response processing for pumps with large ledgers.
 */
const getTodayLedgerCredit = async ({
  pumpId,
  date,
}) => {
  try {
    const normalizedPumpId =
      normalizeObjectId(pumpId);

    if (!normalizedPumpId) {
      return 0;
    }

    const collection =
      await getLedgerEntryCollection();

    if (!collection) {
      return 0;
    }

    const {
      startDate,
      endDate,
    } = getDateRange(date);

    const result =
      await collection
        .aggregate([
          {
            $match: {
              pumpId:
                normalizedPumpId,

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
            },
          },

          {
            $project: {
              pendingValue: {
                $cond: [
                  {
                    $ne: [
                      {
                        $type:
                          "$pendingAmount",
                      },
                      "missing",
                    ],
                  },

                  {
                    $max: [
                      {
                        $convert: {
                          input:
                            "$pendingAmount",

                          to: "double",

                          onError: 0,

                          onNull: 0,
                        },
                      },

                      0,
                    ],
                  },

                  {
                    $max: [
                      {
                        $subtract: [
                          {
                            $convert: {
                              input:
                                "$totalAmount",

                              to: "double",

                              onError: 0,

                              onNull: 0,
                            },
                          },

                          {
                            $convert: {
                              input:
                                "$paidAmount",

                              to: "double",

                              onError: 0,

                              onNull: 0,
                            },
                          },
                        ],
                      },

                      0,
                    ],
                  },
                ],
              },
            },
          },

          {
            $group: {
              _id: null,

              total: {
                $sum:
                  "$pendingValue",
              },
            },
          },
        ])
        .toArray();

    if (
      !result ||
      result.length === 0
    ) {
      return 0;
    }

    return Math.max(
      toNumber(
        result[0].total
      ),
      0
    );
  } catch (error) {
    console.error(
      "DASHBOARD LEDGER CREDIT ERROR:",
      error.message
    );

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
        String(
          req.query?.date || ""
        ).trim();

      const date =
        requestedDate ||
        todayString();

      if (
        !isValidDateString(date)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid date format. Use YYYY-MM-DD.",
        });
      }

      const {
        startDate,
        endDate,
      } = getDateRange(date);

      /* =====================================
         PARALLEL DATABASE QUERIES
      ===================================== */

      /*
       * Ledger collection discovery also starts
       * immediately instead of waiting for the
       * other queries.
       */
      const ledgerCollectionPromise =
        getLedgerEntryCollection();

      const [
        nozzleReadings,
        manualSales,
        stocks,
        customers,
        expenses,
        ledgerCollection,
      ] = await Promise.all([
        /* ===================================
           NOZZLE READINGS
        =================================== */

        NozzleReading.find({
          pumpId,
          readingDate: date,
        })
          .select(
            "totalAmount litresSold paymentMethod payments fuelType"
          )
          .lean(),

        /* ===================================
           MANUAL / PAYMENT SALES
        =================================== */

        Sale.find({
          pumpId,
          saleDate: date,

          source: {
            $in: [
              "manual",
              "payment",
            ],
          },
        })
          .select(
            "totalAmount quantity paymentMethod payments fuelType"
          )
          .lean(),

        /* ===================================
           FUEL STOCK
        =================================== */

        FuelStock.find({
          pumpId,
        })
          .select(
            "fuelType currentStock"
          )
          .lean(),

        /* ===================================
           ACTIVE LEDGER CUSTOMERS
        =================================== */

        LedgerCustomer.find({
          pumpId,
          status: "active",
        })
          .select(
            "_id currentBalance"
          )
          .lean(),

        /* ===================================
           EXPENSES
        =================================== */

        Expense.find({
          pumpId,

          $or: [
            {
              expenseDate: date,
            },

            {
              date: date,
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
          .select(
            "amount expenseDate date createdAt"
          )
          .lean(),

        /* ===================================
           LEDGER COLLECTION DISCOVERY
        =================================== */

        ledgerCollectionPromise,
      ]);

      /* =====================================
         SALES SUMMARY
      ===================================== */

      let todaySales = 0;

      let cashSales = 0;

      let upiSales = 0;

      let cardSales = 0;

      let directCreditSales = 0;

      let petrolSold = 0;

      let dieselSold = 0;

      let saleCount = 0;

      /* =====================================
         PROCESS NOZZLE READINGS
      ===================================== */

      for (
        const reading of nozzleReadings
      ) {
        const amount =
          toNumber(
            reading.totalAmount
          );

        const quantity =
          toNumber(
            reading.litresSold
          );

        todaySales += amount;

        saleCount += 1;

        /* ===============================
           FUEL
        =============================== */

        const fuelType =
          normalizeFuelType(
            reading.fuelType
          );

        if (
          fuelType === "petrol"
        ) {
          petrolSold += quantity;
        } else if (
          fuelType === "diesel"
        ) {
          dieselSold += quantity;
        }

        /* ===============================
           PAYMENTS
        =============================== */

        const breakdown =
          getPaymentBreakdown(
            reading
          );

        cashSales +=
          toNumber(
            breakdown.cash
          );

        upiSales +=
          toNumber(
            breakdown.upi
          );

        cardSales +=
          toNumber(
            breakdown.card
          );

        directCreditSales +=
          toNumber(
            breakdown.credit
          );
      }

      /* =====================================
         PROCESS MANUAL/PAYMENT SALES
      ===================================== */

      for (
        const sale of manualSales
      ) {
        const amount =
          toNumber(
            sale.totalAmount
          );

        const quantity =
          toNumber(
            sale.quantity
          );

        todaySales += amount;

        saleCount += 1;

        /* ===============================
           FUEL
        =============================== */

        const fuelType =
          normalizeFuelType(
            sale.fuelType
          );

        if (
          fuelType === "petrol"
        ) {
          petrolSold += quantity;
        } else if (
          fuelType === "diesel"
        ) {
          dieselSold += quantity;
        }

        /* ===============================
           PAYMENTS
        =============================== */

        const breakdown =
          getPaymentBreakdown(
            sale
          );

        cashSales +=
          toNumber(
            breakdown.cash
          );

        upiSales +=
          toNumber(
            breakdown.upi
          );

        cardSales +=
          toNumber(
            breakdown.card
          );

        directCreditSales +=
          toNumber(
            breakdown.credit
          );
      }

      /* =====================================
         STOCK SUMMARY
      ===================================== */

      let petrolStock = 0;

      let dieselStock = 0;

      for (
        const stock of stocks
      ) {
        const fuelType =
          normalizeFuelType(
            stock.fuelType
          );

        const currentStock =
          toNumber(
            stock.currentStock
          );

        if (
          fuelType === "petrol"
        ) {
          petrolStock +=
            currentStock;
        } else if (
          fuelType === "diesel"
        ) {
          dieselStock +=
            currentStock;
        }
      }

      const totalFuelStock =
        petrolStock +
        dieselStock;

      const totalFuelSold =
        petrolSold +
        dieselSold;

      /* =====================================
         PENDING CUSTOMER CREDIT
      ===================================== */

      const pendingCredit =
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

      /* =====================================
         TODAY'S LEDGER CREDIT
      ===================================== */

      /*
       * If the collection doesn't exist,
       * getTodayLedgerCredit() safely returns 0.
       *
       * The collection itself has already been
       * discovered above.
       */
      let ledgerCreditSales = 0;

      if (ledgerCollection) {
        ledgerCreditSales =
          await getTodayLedgerCredit({
            pumpId,
            date,
          });
      }

      /* =====================================
         TOTAL CREDIT
      ===================================== */

      const creditSales =
        directCreditSales +
        ledgerCreditSales;

      /* =====================================
         EXPENSE SUMMARY
      ===================================== */

      const totalExpenses =
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

      /* =====================================
         NET COLLECTION
      ===================================== */

      /*
       * Credit sales are not considered
       * collected money.
       *
       * Therefore:
       *
       * cash
       * + UPI
       * + card
       * - expenses
       */

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

        saleCount,
      };

      /* =====================================
         RESPONSE
      ===================================== */

      /*
       * All existing aliases are preserved so
       * the current frontend does not need to
       * be changed.
       */

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