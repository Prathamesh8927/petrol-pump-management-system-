import mongoose from "mongoose";

import Sale from "../models/Sale.js";
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

/*
 * Prevent accidentally generating extremely large
 * reports which could consume unnecessary memory.
 *
 * 366 days allows a full leap year.
 */
const MAX_REPORT_DAYS = 366;

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
 * Calculate number of calendar days
 * between two YYYY-MM-DD values.
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
 * Safely sum numeric field.
 */
const sumField = (
  items,
  field
) => {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce(
    (total, item) => {
      const value = Number(
        item?.[field]
      );

      return (
        total +
        (Number.isFinite(value)
          ? value
          : 0)
      );
    },
    0
  );
};

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
 * Get today's business date.
 */
const getTodayDate = () => {
  return formatDate(
    new Date()
  );
};

/**
 * Validate date range.
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

/**
 * Convert to ObjectId safely.
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

  /* ===================================================
     QUERY FILTERS
  =================================================== */

  const dateFilter = {
    $gte: from,
    $lte: to,
  };

  /* ===================================================
     FETCH REPORT DATA IN PARALLEL
  =================================================== */

  const [
    sales,
    expenses,
    fuelPurchases,
    ledgerEntries,
    fuelStocks,
    pendingCustomers,
  ] = await Promise.all([
    /* -------------------------------------------------
       SALES
    ------------------------------------------------- */

    Sale.find({
      pumpId:
        normalizedPumpId,

      saleDate:
        dateFilter,
    })
      .select(
        [
          "pumpId",
          "nozzleId",
          "readingId",
          "fuelType",
          "quantity",
          "pricePerLitre",
          "totalAmount",
          "paymentMethod",
          "saleDate",
          "source",
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
          "pumpId",
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
          "pumpId",
          "fuelType",
          "quantity",
          "pricePerLitre",
          "totalAmount",
          "purchaseDate",
          "supplier",
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
          "pumpId",
          "customerId",
          "entryType",
          "fuelType",
          "totalAmount",
          "paidAmount",
          "pendingAmount",
          "paymentAmount",
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

      currentBalance: {
        $gt: 0,
      },

      status: "active",
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
     SALES SUMMARY
  =================================================== */

  const totalSales =
    sumField(
      sales,
      "totalAmount"
    );

  const totalLitresSold =
    sumField(
      sales,
      "quantity"
    );

  const petrolSales =
    sales.filter(
      (sale) =>
        sale.fuelType ===
        "petrol"
    );

  const dieselSales =
    sales.filter(
      (sale) =>
        sale.fuelType ===
        "diesel"
    );

  const petrolLitresSold =
    sumField(
      petrolSales,
      "quantity"
    );

  const dieselLitresSold =
    sumField(
      dieselSales,
      "quantity"
    );

  const petrolSalesAmount =
    sumField(
      petrolSales,
      "totalAmount"
    );

  const dieselSalesAmount =
    sumField(
      dieselSales,
      "totalAmount"
    );

  /* ===================================================
     PAYMENT METHODS
  =================================================== */

  const cashSales =
    sumField(
      sales.filter(
        (sale) =>
          sale.paymentMethod ===
          "cash"
      ),
      "totalAmount"
    );

  const upiSales =
    sumField(
      sales.filter(
        (sale) =>
          sale.paymentMethod ===
          "upi"
      ),
      "totalAmount"
    );

  const cardSales =
    sumField(
      sales.filter(
        (sale) =>
          sale.paymentMethod ===
          "card"
      ),
      "totalAmount"
    );

  const creditSales =
    sumField(
      sales.filter(
        (sale) =>
          sale.paymentMethod ===
          "credit"
      ),
      "totalAmount"
    );

  /* ===================================================
     EXPENSE SUMMARY
  =================================================== */

  const totalExpenses =
    sumField(
      expenses,
      "amount"
    );

  const salaryExpenses =
    sumField(
      expenses.filter(
        (expense) =>
          expense.category ===
          "salary"
      ),
      "amount"
    );

  const electricityExpenses =
    sumField(
      expenses.filter(
        (expense) =>
          expense.category ===
          "electricity"
      ),
      "amount"
    );

  const maintenanceExpenses =
    sumField(
      expenses.filter(
        (expense) =>
          expense.category ===
          "maintenance"
      ),
      "amount"
    );

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

  const totalFuelPurchased =
    sumField(
      fuelPurchases,
      "quantity"
    );

  const totalFuelPurchaseAmount =
    sumField(
      fuelPurchases,
      "totalAmount"
    );

  const petrolPurchased =
    sumField(
      fuelPurchases.filter(
        (item) =>
          item.fuelType ===
          "petrol"
      ),
      "quantity"
    );

  const dieselPurchased =
    sumField(
      fuelPurchases.filter(
        (item) =>
          item.fuelType ===
          "diesel"
      ),
      "quantity"
    );

  /* ===================================================
     LEDGER SUMMARY
  =================================================== */

  const ledgerPurchases =
    ledgerEntries.filter(
      (entry) =>
        entry.entryType ===
        "purchase"
    );

  const ledgerPaymentEntries =
    ledgerEntries.filter(
      (entry) =>
        entry.entryType ===
        "payment"
    );

  /*
   * Total ledger purchase value
   * created during this period.
   */
  const ledgerCredit =
    sumField(
      ledgerPurchases,
      "totalAmount"
    );

  /*
   * Amount paid immediately
   * with purchase entries.
   */
  const ledgerPurchasePayments =
    sumField(
      ledgerPurchases,
      "paidAmount"
    );

  /*
   * Separate customer payments.
   */
  const ledgerPayments =
    sumField(
      ledgerPaymentEntries,
      "paymentAmount"
    );

  /*
   * Pending amount created by
   * purchase entries.
   */
  const ledgerPendingCreated =
    sumField(
      ledgerPurchases,
      "pendingAmount"
    );

  /*
   * Current outstanding balance.
   */
  const pendingLedger =
    pendingCustomers.reduce(
      (total, customer) => {
        const balance =
          Number(
            customer?.currentBalance ||
              0
          );

        return (
          total +
          (Number.isFinite(balance)
            ? Math.max(balance, 0)
            : 0)
        );
      },
      0
    );

  /* ===================================================
     CURRENT STOCK
  =================================================== */

  const petrolStock =
    fuelStocks.find(
      (stock) =>
        stock.fuelType ===
        "petrol"
    );

  const dieselStock =
    fuelStocks.find(
      (stock) =>
        stock.fuelType ===
        "diesel"
    );

  const currentPetrolStock =
    Number(
      petrolStock?.currentStock ||
        0
    );

  const currentDieselStock =
    Number(
      dieselStock?.currentStock ||
        0
    );

  /* ===================================================
     NET AMOUNT
  =================================================== */

  const netAmount =
    totalSales -
    totalExpenses;

  /* ===================================================
     RESPONSE
  =================================================== */

  return {
    from,
    to,

    summary: {
      totalSales,
      totalExpenses,
      netAmount,

      totalLitresSold,

      petrolLitresSold,
      dieselLitresSold,

      petrolSalesAmount,
      dieselSalesAmount,

      cashSales,
      upiSales,
      cardSales,
      creditSales,

      salaryExpenses,
      electricityExpenses,
      maintenanceExpenses,
      otherExpenses,

      totalFuelPurchased,
      totalFuelPurchaseAmount,

      petrolPurchased,
      dieselPurchased,

      ledgerCredit,
      ledgerPayments,

      ledgerPurchasePayments,
      ledgerPendingCreated,
      pendingLedger,

      currentPetrolStock,
      currentDieselStock,

      totalCurrentStock:
        currentPetrolStock +
        currentDieselStock,

      salesTransactions:
        sales.length,

      expenseTransactions:
        expenses.length,

      fuelPurchaseTransactions:
        fuelPurchases.length,

      ledgerTransactions:
        ledgerEntries.length,
    },

    sales,
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
        error
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
        error
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
        error
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
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate custom report",
      });
    }
  };