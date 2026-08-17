import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";
import FuelPurchase from "../models/FuelPurchase.js";
import FuelStock from "../models/FuelStock.js";
import LedgerCustomer from "../models/LedgerCustomer.js";
import LedgerEntry from "../models/LedgerEntry.js";

/* =====================================================
   HELPERS
===================================================== */

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-CA");
};

const sumField = (items, field) => {
  return items.reduce(
    (total, item) =>
      total + Number(item?.[field] || 0),
    0
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
  /* ===============================
     SALES
  =============================== */

  const sales = await Sale.find({
    pumpId,

    businessDate: {
      $gte: from,
      $lte: to,
    },
  })
    .populate(
      "nozzleId",
      "nozzleNumber name fuelType"
    )
    .sort({
      businessDate: -1,
      createdAt: -1,
    });

  /* ===============================
     EXPENSES
  =============================== */

  const expenses =
    await Expense.find({
      pumpId,

      expenseDate: {
        $gte: from,
        $lte: to,
      },
    })
      .populate(
        "employeeId",
        "name designation"
      )
      .sort({
        expenseDate: -1,
        createdAt: -1,
      });

  /* ===============================
     FUEL PURCHASES
  =============================== */

  const fuelPurchases =
    await FuelPurchase.find({
      pumpId,

      purchaseDate: {
        $gte: from,
        $lte: to,
      },
    }).sort({
      purchaseDate: -1,
      createdAt: -1,
    });

  /* ===============================
     LEDGER TRANSACTIONS
  =============================== */

  const ledgerEntries =
    await LedgerEntry.find({
      pumpId,

      entryDate: {
        $gte: from,
        $lte: to,
      },
    })
      .populate(
        "customerId",
        "name phone vehicleNumber fuelType"
      )
      .sort({
        entryDate: -1,
        createdAt: -1,
      });

  /* ===============================
     CURRENT FUEL STOCK
  =============================== */

  const fuelStocks =
    await FuelStock.find({
      pumpId,
    });

  /* ===============================
     CURRENT PENDING LEDGER
  =============================== */

  const pendingCustomers =
    await LedgerCustomer.find({
      pumpId,

      currentBalance: {
        $gt: 0,
      },
    });

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
      "litresSold"
    );

  const petrolSales =
    sales.filter(
      (sale) =>
        sale.fuelType === "petrol"
    );

  const dieselSales =
    sales.filter(
      (sale) =>
        sale.fuelType === "diesel"
    );

  const petrolLitresSold =
    sumField(
      petrolSales,
      "litresSold"
    );

  const dieselLitresSold =
    sumField(
      dieselSales,
      "litresSold"
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
          sale.paymentMethod === "cash"
      ),
      "totalAmount"
    );

  const upiSales =
    sumField(
      sales.filter(
        (sale) =>
          sale.paymentMethod === "upi"
      ),
      "totalAmount"
    );

  const cardSales =
    sumField(
      sales.filter(
        (sale) =>
          sale.paymentMethod === "card"
      ),
      "totalAmount"
    );

  const creditSales =
    sumField(
      sales.filter(
        (sale) =>
          sale.paymentMethod === "credit"
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
          expense.category === "salary"
      ),
      "amount"
    );

  const electricityExpenses =
    sumField(
      expenses.filter(
        (expense) =>
          expense.category === "electricity"
      ),
      "amount"
    );

  const maintenanceExpenses =
    sumField(
      expenses.filter(
        (expense) =>
          expense.category === "maintenance"
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
          item.fuelType === "petrol"
      ),
      "quantity"
    );

  const dieselPurchased =
    sumField(
      fuelPurchases.filter(
        (item) =>
          item.fuelType === "diesel"
      ),
      "quantity"
    );

  /* ===================================================
     LEDGER
  =================================================== */

  const ledgerCredit =
    sumField(
      ledgerEntries.filter(
        (entry) =>
          entry.entryType === "credit"
      ),
      "amount"
    );

  const ledgerPayments =
    sumField(
      ledgerEntries.filter(
        (entry) =>
          entry.entryType === "payment"
      ),
      "amount"
    );

  const pendingLedger =
    pendingCustomers.reduce(
      (total, customer) =>
        total +
        Number(
          customer.currentBalance || 0
        ),
      0
    );

  /* ===================================================
     STOCK
  =================================================== */

  const petrolStock =
    fuelStocks.find(
      (stock) =>
        stock.fuelType === "petrol"
    );

  const dieselStock =
    fuelStocks.find(
      (stock) =>
        stock.fuelType === "diesel"
    );

  const currentPetrolStock =
    Number(
      petrolStock?.currentStock || 0
    );

  const currentDieselStock =
    Number(
      dieselStock?.currentStock || 0
    );

  /* ===================================================
     NET
  =================================================== */

  const netAmount =
    totalSales -
    totalExpenses;

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
   DAILY
===================================================== */

export const getDailyReport =
  async (req, res) => {
    try {
      const date =
        req.query.date ||
        formatDate(
          new Date()
        );

      const report =
        await buildReport(
          req.user.pumpId,
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
        error:
          error.message,
      });
    }
  };

/* =====================================================
   WEEKLY
===================================================== */

export const getWeeklyReport =
  async (req, res) => {
    try {
      let {
        from,
        to,
      } = req.query;

      if (!to) {
        to =
          formatDate(
            new Date()
          );
      }

      if (!from) {
        const start =
          new Date(
            `${to}T00:00:00`
          );

        start.setDate(
          start.getDate() -
            6
        );

        from =
          formatDate(
            start
          );
      }

      if (from > to) {
        return res.status(400).json({
          success: false,
          message:
            "Start date cannot be after end date",
        });
      }

      const report =
        await buildReport(
          req.user.pumpId,
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
        error:
          error.message,
      });
    }
  };

/* =====================================================
   MONTHLY
===================================================== */

export const getMonthlyReport =
  async (req, res) => {
    try {
      const now =
        new Date();

      const month =
        Number(
          req.query.month ||
            now.getMonth() + 1
        );

      const year =
        Number(
          req.query.year ||
            now.getFullYear()
        );

      if (
        month < 1 ||
        month > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid month",
        });
      }

      const firstDay =
        new Date(
          year,
          month - 1,
          1
        );

      const lastDay =
        new Date(
          year,
          month,
          0
        );

      const report =
        await buildReport(
          req.user.pumpId,
          formatDate(
            firstDay
          ),
          formatDate(
            lastDay
          )
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
        error:
          error.message,
      });
    }
  };

/* =====================================================
   CUSTOM
===================================================== */

export const getCustomReport =
  async (req, res) => {
    try {
      const {
        from,
        to,
      } = req.query;

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

      if (from > to) {
        return res.status(400).json({
          success: false,
          message:
            "Start date cannot be after end date",
        });
      }

      const report =
        await buildReport(
          req.user.pumpId,
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
        error:
          error.message,
      });
    }
  };