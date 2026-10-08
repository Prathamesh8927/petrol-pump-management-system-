import mongoose from "mongoose";

import Sale from "../models/Sale.js";
import NozzleReading from "../models/NozzleReading.js";
import Expense from "../models/Expense.js";
import FuelPurchase from "../models/FuelPurchase.js";
import FuelStock from "../models/FuelStock.js";
import LedgerCustomer from "../models/LedgerCustomer.js";
import LedgerEntry from "../models/LedgerEntry.js";

/* =====================================================
   CONSTANTS
===================================================== */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const BUSINESS_TIMEZONE =
  process.env.BUSINESS_TIMEZONE ||
  "Asia/Kolkata";

const MAX_REPORT_DAYS = 366;

const PAYMENT_METHODS = [
  "cash",
  "upi",
  "card",
  "credit",
];

/* =====================================================
   DATE HELPERS
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

  const [
    year,
    month,
    day,
  ] = value.split("-").map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/**
 * Format Date using business timezone.
 */
const formatDate = (date) => {
  const parsedDate =
    date instanceof Date
      ? date
      : new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          BUSINESS_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(parsedDate);
  } catch (error) {
    console.error(
      "REPORT DATE FORMAT ERROR:",
      error.message
    );

    return "";
  }
};

/**
 * Get today's business date.
 */
const getTodayDate = () =>
  formatDate(new Date());

/**
 * Add days to YYYY-MM-DD.
 */
const addDays = (
  dateString,
  days
) => {
  if (
    !isValidDateString(
      dateString
    )
  ) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = dateString
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);
};

/**
 * Calculate calendar-day difference.
 */
const getDateDifferenceInDays = (
  from,
  to
) => {
  if (
    !isValidDateString(from) ||
    !isValidDateString(to)
  ) {
    return null;
  }

  const [
    fromYear,
    fromMonth,
    fromDay,
  ] = from.split("-").map(Number);

  const [
    toYear,
    toMonth,
    toDay,
  ] = to.split("-").map(Number);

  const start = Date.UTC(
    fromYear,
    fromMonth - 1,
    fromDay
  );

  const end = Date.UTC(
    toYear,
    toMonth - 1,
    toDay
  );

  return Math.floor(
    (end - start) /
      (24 * 60 * 60 * 1000)
  );
};

/**
 * Validate complete report range.
 */
const getDateRange = (
  from,
  to
) => {
  if (
    !isValidDateString(from) ||
    !isValidDateString(to)
  ) {
    return false;
  }

  if (from > to) {
    return false;
  }

  const difference =
    getDateDifferenceInDays(
      from,
      to
    );

  if (
    difference === null ||
    difference < 0
  ) {
    return false;
  }

  return (
    difference <
    MAX_REPORT_DAYS
  );
};

/* =====================================================
   GENERAL HELPERS
===================================================== */

/**
 * Safely convert number.
 */
const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

/**
 * Round money/quantity.
 */
const roundNumber = (value) =>
  Number(
    toNumber(value).toFixed(2)
  );

/**
 * Get authenticated user's pumpId.
 */
const getPumpId = (req) => {
  const pumpId =
    req.user?.pumpId?._id ||
    req.user?.pumpId ||
    req.user?.pumpID ||
    req.user?.pump?.pumpId ||
    null;

  if (
    !pumpId ||
    !mongoose.Types.ObjectId.isValid(
      String(pumpId)
    )
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(
    String(pumpId)
  );
};

/**
 * Convert ObjectId safely.
 */
const toObjectId = (
  value
) => {
  if (
    !value ||
    !mongoose.Types.ObjectId.isValid(
      String(value)
    )
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(
    String(value)
  );
};

/**
 * Normalize fuel type.
 */
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

/**
 * Normalize payment method.
 */
const normalizePaymentMethod = (
  value
) =>
  String(
    value || ""
  )
    .trim()
    .toLowerCase();

/* =====================================================
   PAYMENT HELPERS
===================================================== */

/**
 * Get payment breakdown.
 *
 * Supports both:
 *
 * Old:
 * paymentMethod: "cash"
 *
 * New:
 * payments: [
 *   { method: "cash", amount: 1000 },
 *   { method: "upi", amount: 500 }
 * ]
 */
const getPaymentBreakdown = (
  transaction
) => {
  const breakdown = {
    cash: 0,
    upi: 0,
    card: 0,
    credit: 0,
  };

  if (
    Array.isArray(
      transaction?.payments
    ) &&
    transaction.payments.length > 0
  ) {
    for (
      const payment of transaction.payments
    ) {
      const method =
        normalizePaymentMethod(
          payment?.method
        );

      const amount =
        toNumber(
          payment?.amount
        );

      if (
        PAYMENT_METHODS.includes(
          method
        ) &&
        amount > 0
      ) {
        breakdown[method] += amount;
      }
    }

    const hasSplitPayment =
      Object.values(
        breakdown
      ).some(
        (amount) =>
          amount > 0
      );

    if (hasSplitPayment) {
      return breakdown;
    }
  }

  const method =
    normalizePaymentMethod(
      transaction?.paymentMethod
    );

  const totalAmount =
    toNumber(
      transaction?.totalAmount
    );

  if (
    PAYMENT_METHODS.includes(
      method
    ) &&
    totalAmount > 0
  ) {
    breakdown[method] =
      totalAmount;
  }

  return breakdown;
};

/* =====================================================
   BUILD REPORT
===================================================== */

const buildReport = async (
  pumpId,
  from,
  to
) => {
  if (!pumpId) {
    throw new Error(
      "Pump ID is required"
    );
  }

  if (
    !getDateRange(
      from,
      to
    )
  ) {
    throw new Error(
      "Invalid report date range"
    );
  }

  const normalizedPumpId =
    toObjectId(pumpId);

  if (!normalizedPumpId) {
    throw new Error(
      "Invalid pump ID"
    );
  }

  /*
   * Because all business dates are stored as
   * YYYY-MM-DD strings, lexicographical
   * range queries work correctly.
   */
  const dateFilter = {
    $gte: from,
    $lte: to,
  };

  /* ===================================================
     FETCH EVERYTHING IN PARALLEL
  =================================================== */

  const [
    nozzleReadings,
    sales,
    expenses,
    fuelPurchases,
    ledgerEntries,
    fuelStocks,
    pendingCustomers,
  ] = await Promise.all([
    /* -------------------------------------------------
       NOZZLE SALES
    ------------------------------------------------- */

    NozzleReading.find({
      pumpId:
        normalizedPumpId,

      readingDate:
        dateFilter,
    })
      .select(
        [
          "nozzleId",
          "shiftName",
          "staffId",
          "staffName",
          "fuelType",
          "openingReading",
          "closingReading",
          "litresSold",
          "pricePerLitre",
          "totalAmount",
          "readingDate",
          "readingTime",
          "paymentMethod",
          "payments",
          "note",
          "createdBy",
          "createdAt",
        ].join(" ")
      )
      .populate(
        "nozzleId",
        "nozzleNumber name fuelType"
      )
      .sort({
        readingDate: -1,
        readingTime: -1,
        createdAt: -1,
      })
      .lean(),

    /* -------------------------------------------------
       MANUAL / PAYMENT SALES
    ------------------------------------------------- */

    /*
     * IMPORTANT:
     *
     * NozzleReading is the source for nozzle sales.
     *
     * Therefore only manual/payment Sale documents
     * are included here to prevent double counting.
     */
    Sale.find({
      pumpId:
        normalizedPumpId,

      saleDate:
        dateFilter,

      source: {
        $in: [
          "manual",
          "payment",
        ],
      },
    })
      .select(
        [
          "nozzleId",
          "readingId",
          "fuelType",
          "quantity",
          "pricePerLitre",
          "totalAmount",
          "paymentMethod",
          "payments",
          "saleDate",
          "source",
          "note",
          "createdBy",
          "createdAt",
          "providerPaymentId",
          "paymentProvider",
        ].join(" ")
      )
      .populate(
        "nozzleId",
        "nozzleNumber name fuelType"
      )
      .sort({
        saleDate: -1,
        createdAt: -1,
      })
      .lean(),

    /* -------------------------------------------------
       EXPENSES
    ------------------------------------------------- */

    Expense.find({
      pumpId:
        normalizedPumpId,

      expenseDate:
        dateFilter,
    })
      .select(
        [
          "title",
          "category",
          "amount",
          "paymentMethod",
          "expenseDate",
          "employeeId",
          "note",
          "createdBy",
          "createdAt",
        ].join(" ")
      )
      .populate(
        "employeeId",
        "name designation"
      )
      .sort({
        expenseDate: -1,
        createdAt: -1,
      })
      .lean(),

    /* -------------------------------------------------
       FUEL PURCHASES
    ------------------------------------------------- */

    FuelPurchase.find({
      pumpId:
        normalizedPumpId,

      purchaseDate:
        dateFilter,
    })
      .select(
        [
          "fuelType",
          "quantity",
          "purchasePrice",
          "totalAmount",
          "purchaseDate",
          "supplierName",
          "invoiceNumber",
          "note",
          "createdBy",
          "createdAt",
        ].join(" ")
      )
      .sort({
        purchaseDate: -1,
        createdAt: -1,
      })
      .lean(),

    /* -------------------------------------------------
       LEDGER TRANSACTIONS
    ------------------------------------------------- */

    LedgerEntry.find({
      pumpId:
        normalizedPumpId,

      entryDate:
        dateFilter,
    })
      .select(
        [
          "customerId",
          "entryType",
          "fuelType",
          "rate",
          "totalAmount",
          "paidAmount",
          "pendingAmount",
          "paymentAmount",
          "advanceAmount",
          "advanceAppliedAmount",
          "advanceBalance",
          "entryDate",
          "note",
          "createdBy",
          "createdAt",
        ].join(" ")
      )
      .populate(
        "customerId",
        "name phone vehicleNumber"
      )
      .sort({
        entryDate: -1,
        createdAt: -1,
      })
      .lean(),

    /* -------------------------------------------------
       CURRENT FUEL STOCK
    ------------------------------------------------- */

    FuelStock.find({
      pumpId:
        normalizedPumpId,
    })
      .select(
        [
          "fuelType",
          "currentStock",
          "totalPurchased",
          "totalSold",
        ].join(" ")
      )
      .lean(),

    /* -------------------------------------------------
       CURRENT PENDING LEDGER
    ------------------------------------------------- */

    LedgerCustomer.find({
      pumpId:
        normalizedPumpId,

      status: "active",

      currentBalance: {
        $gt: 0,
      },
    })
      .select(
        [
          "_id",
          "name",
          "phone",
          "vehicleNumber",
          "currentBalance",
        ].join(" ")
      )
      .lean(),
  ]);

  /* ===================================================
     COMBINE SALES
  =================================================== */

  /*
   * Keep nozzle readings and Sale records separate
   * internally, but create a unified transaction list
   * for report calculations.
   */
  const reportSales = [];

  /* ---------------------------------------------------
     NOZZLE TRANSACTIONS
  --------------------------------------------------- */

  for (
    const reading of nozzleReadings
  ) {
    reportSales.push({
      ...reading,

      /*
       * Mark this clearly so frontend/report
       * consumers can identify the source.
       */
      source:
        "nozzle",

      quantity:
        toNumber(
          reading.litresSold
        ),

      pricePerLitre:
        toNumber(
          reading.pricePerLitre
        ),

      totalAmount:
        toNumber(
          reading.totalAmount
        ),

      saleDate:
        reading.readingDate,
    });
  }

  /* ---------------------------------------------------
     MANUAL / PAYMENT TRANSACTIONS
  --------------------------------------------------- */

  for (
    const sale of sales
  ) {
    reportSales.push({
      ...sale,

      quantity:
        toNumber(
          sale.quantity
        ),

      pricePerLitre:
        toNumber(
          sale.pricePerLitre
        ),

      totalAmount:
        toNumber(
          sale.totalAmount
        ),
    });
  }

  /*
   * Keep newest transactions first.
   */
  reportSales.sort(
    (a, b) => {
      const dateA =
        String(
          a.saleDate ||
            a.readingDate ||
            ""
        );

      const dateB =
        String(
          b.saleDate ||
            b.readingDate ||
            ""
        );

      if (
        dateA !== dateB
      ) {
        return dateB.localeCompare(
          dateA
        );
      }

      const timeA =
        String(
          a.readingTime ||
            ""
        );

      const timeB =
        String(
          b.readingTime ||
            ""
        );

      if (
        timeA !== timeB
      ) {
        return timeB.localeCompare(
          timeA
        );
      }

      return (
        new Date(
          b.createdAt || 0
        ).getTime() -
        new Date(
          a.createdAt || 0
        ).getTime()
      );
    }
  );

  /* ===================================================
     SALES SUMMARY
  =================================================== */

  let totalSales = 0;
  let totalLitresSold = 0;

  let petrolLitresSold = 0;
  let dieselLitresSold = 0;

  let petrolSalesAmount = 0;
  let dieselSalesAmount = 0;

  let cashSales = 0;
  let upiSales = 0;
  let cardSales = 0;
  let creditSales = 0;

  /*
   * Single pass through all report sales.
   *
   * This is faster than repeatedly calling:
   *
   * filter()
   * filter()
   * filter()
   * reduce()
   * reduce()
   */
  for (
    const sale of reportSales
  ) {
    const amount =
      toNumber(
        sale.totalAmount
      );

    const quantity =
      toNumber(
        sale.quantity
      );

    const fuelType =
      normalizeFuelType(
        sale.fuelType
      );

    totalSales += amount;
    totalLitresSold +=
      quantity;

    if (
      fuelType === "petrol"
    ) {
      petrolLitresSold +=
        quantity;

      petrolSalesAmount +=
        amount;
    }

    if (
      fuelType === "diesel"
    ) {
      dieselLitresSold +=
        quantity;

      dieselSalesAmount +=
        amount;
    }

    /*
     * Correctly supports:
     *
     * payments[]
     *
     * and legacy:
     *
     * paymentMethod
     */
    const breakdown =
      getPaymentBreakdown(
        sale
      );

    cashSales +=
      breakdown.cash;

    upiSales +=
      breakdown.upi;

    cardSales +=
      breakdown.card;

    creditSales +=
      breakdown.credit;
  }

  /* ===================================================
     EXPENSE SUMMARY
  =================================================== */

  let totalExpenses = 0;
  let salaryExpenses = 0;
  let electricityExpenses = 0;
  let maintenanceExpenses = 0;

  for (
    const expense of expenses
  ) {
    const amount =
      toNumber(
        expense.amount
      );

    totalExpenses +=
      amount;

    const category =
      String(
        expense.category ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      category === "salary"
    ) {
      salaryExpenses +=
        amount;
    }

    if (
      category ===
      "electricity"
    ) {
      electricityExpenses +=
        amount;
    }

    if (
      category ===
      "maintenance"
    ) {
      maintenanceExpenses +=
        amount;
    }
  }

  const otherExpenses =
    Math.max(
      totalExpenses -
        salaryExpenses -
        electricityExpenses -
        maintenanceExpenses,
      0
    );

  /* ===================================================
     FUEL PURCHASE SUMMARY
  =================================================== */

  let totalFuelPurchased = 0;
  let totalFuelPurchaseAmount = 0;

  let petrolPurchased = 0;
  let dieselPurchased = 0;

  for (
    const purchase of fuelPurchases
  ) {
    const quantity =
      toNumber(
        purchase.quantity
      );

    const amount =
      toNumber(
        purchase.totalAmount
      );

    const fuelType =
      normalizeFuelType(
        purchase.fuelType
      );

    totalFuelPurchased +=
      quantity;

    totalFuelPurchaseAmount +=
      amount;

    if (
      fuelType === "petrol"
    ) {
      petrolPurchased +=
        quantity;
    }

    if (
      fuelType === "diesel"
    ) {
      dieselPurchased +=
        quantity;
    }
  }

  /* ===================================================
     LEDGER SUMMARY
  =================================================== */

  let ledgerCredit = 0;
  let ledgerPayments = 0;
  let ledgerAdvancePayments = 0;

  let ledgerPurchasePayments = 0;
  let ledgerPendingCreated = 0;

  let ledgerAdvanceApplied = 0;

  let ledgerPurchaseTransactions = 0;
  let ledgerPaymentTransactions = 0;
  let ledgerAdvanceTransactions = 0;

  for (
    const entry of ledgerEntries
  ) {
    const entryType =
      String(
        entry.entryType ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      entryType === "purchase"
    ) {
      ledgerPurchaseTransactions +=
        1;

      ledgerCredit +=
        toNumber(
          entry.totalAmount
        );

      ledgerPurchasePayments +=
        toNumber(
          entry.paidAmount
        );

      ledgerPendingCreated +=
        toNumber(
          entry.pendingAmount
        );

      ledgerAdvanceApplied +=
        toNumber(
          entry.advanceAppliedAmount
        );
    }

    if (
      entryType === "payment"
    ) {
      ledgerPaymentTransactions +=
        1;

      ledgerPayments +=
        toNumber(
          entry.paymentAmount
        );
    }

    if (
      entryType === "advance"
    ) {
      ledgerAdvanceTransactions +=
        1;

      ledgerAdvancePayments +=
        toNumber(
          entry.advanceAmount
        );
    }
  }

  /* ===================================================
     CURRENT PENDING LEDGER
  =================================================== */

  let pendingLedger = 0;

  for (
    const customer of pendingCustomers
  ) {
    const balance =
      toNumber(
        customer.currentBalance
      );

    if (
      balance > 0
    ) {
      pendingLedger +=
        balance;
    }
  }

  /* ===================================================
     CURRENT STOCK
  =================================================== */

  let currentPetrolStock = 0;
  let currentDieselStock = 0;

  for (
    const stock of fuelStocks
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
      currentPetrolStock +=
        currentStock;
    }

    if (
      fuelType === "diesel"
    ) {
      currentDieselStock +=
        currentStock;
    }
  }

  /* ===================================================
     NET AMOUNT
  =================================================== */

  const netAmount =
    totalSales -
    totalExpenses;

  /*
   * Actual cash collected after expenses.
   *
   * Credit sales are not included in collected cash.
   */
  const netCollection =
    cashSales +
    upiSales +
    cardSales -
    totalExpenses;

  /* ===================================================
     NORMALIZE SUMMARY VALUES
  =================================================== */

  const summary = {
    totalSales:
      roundNumber(
        totalSales
      ),

    totalExpenses:
      roundNumber(
        totalExpenses
      ),

    netAmount:
      roundNumber(
        netAmount
      ),

    netCollection:
      roundNumber(
        netCollection
      ),

    totalLitresSold:
      roundNumber(
        totalLitresSold
      ),

    petrolLitresSold:
      roundNumber(
        petrolLitresSold
      ),

    dieselLitresSold:
      roundNumber(
        dieselLitresSold
      ),

    petrolSalesAmount:
      roundNumber(
        petrolSalesAmount
      ),

    dieselSalesAmount:
      roundNumber(
        dieselSalesAmount
      ),

    cashSales:
      roundNumber(
        cashSales
      ),

    upiSales:
      roundNumber(
        upiSales
      ),

    cardSales:
      roundNumber(
        cardSales
      ),

    creditSales:
      roundNumber(
        creditSales
      ),

    salaryExpenses:
      roundNumber(
        salaryExpenses
      ),

    electricityExpenses:
      roundNumber(
        electricityExpenses
      ),

    maintenanceExpenses:
      roundNumber(
        maintenanceExpenses
      ),

    otherExpenses:
      roundNumber(
        otherExpenses
      ),

    totalFuelPurchased:
      roundNumber(
        totalFuelPurchased
      ),

    totalFuelPurchaseAmount:
      roundNumber(
        totalFuelPurchaseAmount
      ),

    petrolPurchased:
      roundNumber(
        petrolPurchased
      ),

    dieselPurchased:
      roundNumber(
        dieselPurchased
      ),

    ledgerCredit:
      roundNumber(
        ledgerCredit
      ),

    ledgerPayments:
      roundNumber(
        ledgerPayments
      ),

    ledgerAdvancePayments:
      roundNumber(
        ledgerAdvancePayments
      ),

    ledgerPurchasePayments:
      roundNumber(
        ledgerPurchasePayments
      ),

    ledgerPendingCreated:
      roundNumber(
        ledgerPendingCreated
      ),

    ledgerAdvanceApplied:
      roundNumber(
        ledgerAdvanceApplied
      ),

    pendingLedger:
      roundNumber(
        pendingLedger
      ),

    currentPetrolStock:
      roundNumber(
        currentPetrolStock
      ),

    currentDieselStock:
      roundNumber(
        currentDieselStock
      ),

    totalCurrentStock:
      roundNumber(
        currentPetrolStock +
          currentDieselStock
      ),

    /*
     * Transaction counts.
     */
    salesTransactions:
      reportSales.length,

    nozzleTransactions:
      nozzleReadings.length,

    manualSalesTransactions:
      sales.length,

    expenseTransactions:
      expenses.length,

    fuelPurchaseTransactions:
      fuelPurchases.length,

    ledgerTransactions:
      ledgerEntries.length,

    ledgerPurchaseTransactions,

    ledgerPaymentTransactions,

    ledgerAdvanceTransactions,
  };

  /* ===================================================
     RESPONSE
  =================================================== */

  return {
    from,
    to,

    summary,

    /*
     * Keep existing sales property.
     *
     * It now contains both:
     * - nozzle transactions
     * - manual/payment transactions
     */
    sales: reportSales,

    /*
     * Expose the original sources separately too.
     * This is useful for future PDF/report screens
     * without breaking the existing sales property.
     */
    nozzleReadings,

    manualSales: sales,

    expenses,

    fuelPurchases,

    ledgerEntries,
  };
};

/* =====================================================
   DAILY REPORT
===================================================== */

export const getDailyReport =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump information is required",
        });
      }

      const date =
        String(
          req.query?.date ||
            getTodayDate()
        ).trim();

      if (
        !isValidDateString(
          date
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid date. Use YYYY-MM-DD",
        });
      }

      const report =
        await buildReport(
          pumpId,
          date,
          date
        );

      return res.status(200).json({
        success: true,
        report,
      });
    } catch (error) {
      console.error(
        "DAILY REPORT ERROR:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load daily report",
      });
    }
  };

/* =====================================================
   WEEKLY REPORT
===================================================== */

export const getWeeklyReport =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump information is required",
        });
      }

      let {
        from,
        to,
      } = req.query || {};

      from = from
        ? String(from).trim()
        : "";

      to = to
        ? String(to).trim()
        : getTodayDate();

      if (
        !isValidDateString(to)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid end date. Use YYYY-MM-DD",
        });
      }

      if (!from) {
        from =
          addDays(
            to,
            -6
          );
      }

      if (
        !isValidDateString(
          from
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid start date. Use YYYY-MM-DD",
        });
      }

      const difference =
        getDateDifferenceInDays(
          from,
          to
        );

      if (
        difference === null ||
        difference < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Start date cannot be after end date",
        });
      }

      if (
        difference >=
        MAX_REPORT_DAYS
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Report date range is too large",
        });
      }

      const report =
        await buildReport(
          pumpId,
          from,
          to
        );

      return res.status(200).json({
        success: true,
        report,
      });
    } catch (error) {
      console.error(
        "WEEKLY REPORT ERROR:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load weekly report",
      });
    }
  };

/* =====================================================
   MONTHLY REPORT
===================================================== */

export const getMonthlyReport =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump information is required",
        });
      }

      const now =
        new Date();

      const currentMonth =
        Number(
          new Intl.DateTimeFormat(
            "en-US",
            {
              timeZone:
                BUSINESS_TIMEZONE,
              month: "numeric",
            }
          ).format(now)
        );

      const currentYear =
        Number(
          new Intl.DateTimeFormat(
            "en-US",
            {
              timeZone:
                BUSINESS_TIMEZONE,
              year: "numeric",
            }
          ).format(now)
        );

      const month =
        Number(
          req.query?.month ||
            currentMonth
        );

      const year =
        Number(
          req.query?.year ||
            currentYear
        );

      if (
        !Number.isInteger(
          month
        ) ||
        month < 1 ||
        month > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid month",
        });
      }

      if (
        !Number.isInteger(
          year
        ) ||
        year < 2000 ||
        year > 2100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid year",
        });
      }

      const from =
        `${year}-${String(
          month
        ).padStart(2, "0")}-01`;

      const lastDay =
        new Date(
          Date.UTC(
            year,
            month,
            0
          )
        );

      const to =
        lastDay
          .toISOString()
          .slice(0, 10);

      const report =
        await buildReport(
          pumpId,
          from,
          to
        );

      return res.status(200).json({
        success: true,
        month,
        year,
        report,
      });
    } catch (error) {
      console.error(
        "MONTHLY REPORT ERROR:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load monthly report",
      });
    }
  };

/* =====================================================
   CUSTOM REPORT
===================================================== */

export const getCustomReport =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump information is required",
        });
      }

      const from =
        String(
          req.query?.from ||
            ""
        ).trim();

      const to =
        String(
          req.query?.to ||
            ""
        ).trim();

      if (
        !from ||
        !to
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Start date and end date are required",
        });
      }

      if (
        !isValidDateString(
          from
        ) ||
        !isValidDateString(
          to
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid date. Use YYYY-MM-DD",
        });
      }

      const difference =
        getDateDifferenceInDays(
          from,
          to
        );

      if (
        difference === null ||
        difference < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Start date cannot be after end date",
        });
      }

      if (
        difference >=
        MAX_REPORT_DAYS
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Report date range is too large",
        });
      }

      const report =
        await buildReport(
          pumpId,
          from,
          to
        );

      return res.status(200).json({
        success: true,
        report,
      });
    } catch (error) {
      console.error(
        "CUSTOM REPORT ERROR:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate custom report",
      });
    }
  };