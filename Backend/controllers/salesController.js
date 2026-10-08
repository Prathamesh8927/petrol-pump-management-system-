import Sale from "../models/Sale.js";
import NozzleReading from "../models/NozzleReading.js";

/* =====================================================
   CONSTANTS
===================================================== */

const PAYMENT_METHODS = [
  "cash",
  "upi",
  "card",
  "credit",
];

/* =====================================================
   HELPERS
===================================================== */

const getPumpId = (req) =>
  req.user?.pumpId?._id ||
  req.user?.pumpId ||
  null;

/* =====================================================
   INDIA DATE
===================================================== */

const getIndiaDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

/*
 * Kept for backward compatibility.
 */
const getLocalDate = () => getIndiaDate();

/* =====================================================
   INDIA TIME FALLBACK
===================================================== */

const getIndiaTimeFromDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
};

/* =====================================================
   NORMALIZE FUEL
===================================================== */

const normalizeFuelType = (value) => {
  const fuel = String(value || "")
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
   NORMALIZE PAYMENT
===================================================== */

const normalizePaymentMethod = (value) =>
  String(value || "cash")
    .trim()
    .toLowerCase();

/* =====================================================
   VALID PAYMENT METHOD
===================================================== */

const isValidPaymentMethod = (value) =>
  PAYMENT_METHODS.includes(
    normalizePaymentMethod(value)
  );

/* =====================================================
   PAYMENT BREAKDOWN
===================================================== */

const getPaymentBreakdown = (transaction) => {
  const breakdown = {};

  /*
   * New split-payment records.
   */
  if (
    Array.isArray(transaction?.payments) &&
    transaction.payments.length > 0
  ) {
    transaction.payments.forEach((payment) => {
      const method = normalizePaymentMethod(
        payment?.method
      );

      const amount = Number(
        payment?.amount || 0
      );

      if (
        PAYMENT_METHODS.includes(method) &&
        Number.isFinite(amount) &&
        amount > 0
      ) {
        breakdown[method] =
          (breakdown[method] || 0) +
          amount;
      }
    });

    /*
     * If valid payment entries were found,
     * use them.
     */
    if (
      Object.keys(breakdown).length > 0
    ) {
      return breakdown;
    }
  }

  /*
   * Backward compatibility for old records.
   */
  const method = normalizePaymentMethod(
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
   NORMALIZE PAYMENT ARRAY
===================================================== */

const getNormalizedPayments = (
  transaction
) => {
  if (
    Array.isArray(transaction?.payments) &&
    transaction.payments.length > 0
  ) {
    return transaction.payments
      .map((payment) => ({
        method: normalizePaymentMethod(
          payment?.method
        ),

        amount: Number(
          payment?.amount || 0
        ),
      }))
      .filter(
        (payment) =>
          PAYMENT_METHODS.includes(
            payment.method
          ) &&
          Number.isFinite(payment.amount) &&
          payment.amount > 0
      );
  }

  const breakdown =
    getPaymentBreakdown(transaction);

  return Object.entries(breakdown).map(
    ([method, amount]) => ({
      method,
      amount,
    })
  );
};

/* =====================================================
   PAYMENT METHOD MATCH
===================================================== */

const hasPaymentMethod = (
  transaction,
  requestedMethod
) => {
  const method =
    normalizePaymentMethod(
      requestedMethod
    );

  if (
    !PAYMENT_METHODS.includes(method)
  ) {
    return false;
  }

  const breakdown =
    getPaymentBreakdown(transaction);

  return (
    Number(breakdown[method] || 0) > 0
  );
};

/* =====================================================
   READING -> SALE FORMAT
===================================================== */

const readingToSale = (reading) => {
  const payments =
    getNormalizedPayments(reading);

  return {
    _id: reading._id,

    nozzleId:
      reading.nozzleId,

    readingId:
      reading._id,

    fuelType:
      normalizeFuelType(
        reading.fuelType
      ),

    quantity:
      Number(
        reading.litresSold || 0
      ),

    pricePerLitre:
      Number(
        reading.pricePerLitre || 0
      ),

    totalAmount:
      Number(
        reading.totalAmount || 0
      ),

    paymentMethod:
      normalizePaymentMethod(
        reading.paymentMethod
      ),

    payments,

    readingTime:
      reading.readingTime ||
      getIndiaTimeFromDate(
        reading.createdAt
      ),

    saleDate:
      reading.readingDate,

    source:
      "nozzle",

    note:
      reading.note || "",

    createdBy:
      reading.createdBy,

    createdAt:
      reading.createdAt,

    updatedAt:
      reading.updatedAt,
  };
};

/* =====================================================
   ROUND SUMMARY
===================================================== */

const roundSummary = (summary) => {
  Object.keys(summary).forEach((key) => {
    summary[key] = Number(
      Number(
        summary[key] || 0
      ).toFixed(2)
    );
  });

  return summary;
};

/* =====================================================
   ADD TRANSACTION TO SUMMARY
===================================================== */

const addTransactionToSummary = (
  summary,
  transaction
) => {
  const fuelType =
    normalizeFuelType(
      transaction.fuelType
    );

  const amount = Number(
    transaction.totalAmount || 0
  );

  const litres = Number(
    transaction.quantity ??
      transaction.litresSold ??
      0
  );

  if (Number.isFinite(amount)) {
    summary.totalSale += amount;
  }

  if (Number.isFinite(litres)) {
    summary.totalLitres += litres;
  }

  if (fuelType === "petrol") {
    summary.petrolSale += amount;
    summary.petrolLitres += litres;
  }

  if (fuelType === "diesel") {
    summary.dieselSale += amount;
    summary.dieselLitres += litres;
  }

  const breakdown =
    getPaymentBreakdown(
      transaction
    );

  Object.entries(
    breakdown
  ).forEach(
    ([method, paymentAmount]) => {
      if (
        summary[method] !== undefined
      ) {
        summary[method] += Number(
          paymentAmount || 0
        );
      }
    }
  );
};

/* =====================================================
   FORMAT MANUAL SALE
===================================================== */

const formatManualSale = (sale) => {
  const object =
    sale?.toObject
      ? sale.toObject()
      : sale;

  return {
    ...object,

    fuelType:
      normalizeFuelType(
        object.fuelType
      ),

    paymentMethod:
      normalizePaymentMethod(
        object.paymentMethod
      ),

    payments:
      getNormalizedPayments(
        object
      ),

    readingTime:
      object.readingTime ||
      getIndiaTimeFromDate(
        object.createdAt
      ),
  };
};

/* =====================================================
   COMMON POPULATE
===================================================== */

const nozzlePopulate = {
  path: "nozzleId",
  select: "nozzleNumber fuelType",
};

/* =====================================================
   DAILY SALES
===================================================== */

export const getDailySales =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump information not found",
        });
      }

      const date =
        req.query.date ||
        getLocalDate();

      /*
       * Run both MongoDB queries at
       * the same time.
       */
      const [
        readings,
        manualSales,
      ] = await Promise.all([
        NozzleReading.find({
          pumpId,
          readingDate: date,
        })
          .select(
            "_id nozzleId fuelType litresSold pricePerLitre totalAmount paymentMethod payments readingTime readingDate note createdBy createdAt updatedAt"
          )
          .populate(nozzlePopulate)
          .sort({
            readingDate: -1,
            readingTime: -1,
            createdAt: -1,
          })
          .lean(),

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
            "_id pumpId nozzleId fuelType quantity pricePerLitre totalAmount paymentMethod payments readingTime saleDate source note createdBy providerPaymentId paymentProvider createdAt updatedAt"
          )
          .populate(nozzlePopulate)
          .sort({
            createdAt: -1,
          })
          .lean(),
      ]);

      /*
       * Nozzle sales come from
       * NozzleReading.
       */
      const nozzleSales =
        readings.map(
          readingToSale
        );

      /*
       * Manual/payment sales come
       * from Sale.
       */
      const formattedManual =
        manualSales.map(
          formatManualSale
        );

      const sales = [
        ...nozzleSales,
        ...formattedManual,
      ];

      /* =====================================
         SUMMARY
      ===================================== */

      const summary = {
        totalSale: 0,

        totalLitres: 0,

        petrolSale: 0,
        dieselSale: 0,

        petrolLitres: 0,
        dieselLitres: 0,

        cash: 0,
        upi: 0,
        card: 0,
        credit: 0,
      };

      sales.forEach(
        (sale) => {
          addTransactionToSummary(
            summary,
            sale
          );
        }
      );

      roundSummary(summary);

      return res.status(200).json({
        success: true,

        date,

        count:
          sales.length,

        sales,

        summary,
      });
    } catch (error) {
      console.error(
        "DAILY SALES ERROR:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load daily sales",
      });
    }
  };

/* =====================================================
   SALES HISTORY
===================================================== */

export const getSalesHistory =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump information not found",
        });
      }

      const {
        date,
        fuelType,
        paymentMethod,
      } = req.query;

      const requestedFuel =
        fuelType
          ? normalizeFuelType(
              fuelType
            )
          : null;

      const requestedPayment =
        paymentMethod
          ? normalizePaymentMethod(
              paymentMethod
            )
          : null;

      /*
       * Validate payment filter.
       */
      if (
        requestedPayment &&
        !PAYMENT_METHODS.includes(
          requestedPayment
        )
      ) {
        return res.status(200).json({
          success: true,
          count: 0,
          sales: [],
        });
      }

      /* =====================================
         NOZZLE QUERY
      ===================================== */

      const readingFilter = {
        pumpId,
      };

      if (date) {
        readingFilter.readingDate =
          date;
      }

      if (
        requestedFuel === "petrol" ||
        requestedFuel === "diesel"
      ) {
        /*
         * Fuel filtering is now done
         * directly by MongoDB.
         */
        readingFilter.fuelType =
          requestedFuel;
      }

      if (requestedPayment) {
        /*
         * Support both:
         *
         * old:
         * paymentMethod
         *
         * new:
         * payments[]
         */
        readingFilter.$or = [
          {
            paymentMethod:
              requestedPayment,
          },
          {
            payments: {
              $elemMatch: {
                method:
                  requestedPayment,

                amount: {
                  $gt: 0,
                },
              },
            },
          },
        ];
      }

      /* =====================================
         MANUAL / PAYMENT QUERY
      ===================================== */

      const manualFilter = {
        pumpId,

        source: {
          $in: [
            "manual",
            "payment",
          ],
        },
      };

      if (date) {
        manualFilter.saleDate =
          date;
      }

      if (
        requestedFuel === "petrol" ||
        requestedFuel === "diesel"
      ) {
        manualFilter.fuelType =
          requestedFuel;
      }

      if (requestedPayment) {
        manualFilter.$or = [
          {
            paymentMethod:
              requestedPayment,
          },
          {
            payments: {
              $elemMatch: {
                method:
                  requestedPayment,

                amount: {
                  $gt: 0,
                },
              },
            },
          },
        ];
      }

      /*
       * Run both queries simultaneously.
       */
      const [
        readings,
        manualSales,
      ] = await Promise.all([
        NozzleReading.find(
          readingFilter
        )
          .select(
            "_id nozzleId fuelType litresSold pricePerLitre totalAmount paymentMethod payments readingTime readingDate note createdBy createdAt updatedAt"
          )
          .populate(nozzlePopulate)
          .sort({
            readingDate: -1,
            readingTime: -1,
            createdAt: -1,
          })
          .lean(),

        Sale.find(
          manualFilter
        )
          .select(
            "_id pumpId nozzleId fuelType quantity pricePerLitre totalAmount paymentMethod payments readingTime saleDate source note createdBy providerPaymentId paymentProvider createdAt updatedAt"
          )
          .populate(nozzlePopulate)
          .sort({
            saleDate: -1,
            readingTime: -1,
            createdAt: -1,
          })
          .lean(),
      ]);

      /* =====================================
         FORMAT
      ===================================== */

      const nozzleSales =
        readings.map(
          readingToSale
        );

      const formattedManual =
        manualSales.map(
          formatManualSale
        );

      /*
       * MongoDB already handled:
       *
       * fuelType
       * paymentMethod
       *
       * so we do not need to filter
       * those records again in JS.
       */

      const sales = [
        ...nozzleSales,
        ...formattedManual,
      ];

      /* =====================================
         FINAL COMBINED SORT
      ===================================== */

      sales.sort(
        (a, b) => {
          const dateA =
            String(
              a.saleDate || ""
            );

          const dateB =
            String(
              b.saleDate || ""
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
              a.readingTime || ""
            );

          const timeB =
            String(
              b.readingTime || ""
            );

          if (
            timeA !== timeB
          ) {
            return timeB.localeCompare(
              timeA
            );
          }

          const createdA =
            new Date(
              a.createdAt || 0
            ).getTime();

          const createdB =
            new Date(
              b.createdAt || 0
            ).getTime();

          return (
            createdB -
            createdA
          );
        }
      );

      return res.status(200).json({
        success: true,

        count:
          sales.length,

        sales,
      });
    } catch (error) {
      console.error(
        "SALES HISTORY ERROR:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load sales history",
      });
    }
  };

/* =====================================================
   PAYMENT SUMMARY
===================================================== */

export const getPaymentSummary =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump information not found",
        });
      }

      const date =
        req.query.date ||
        getLocalDate();

      /*
       * Only retrieve fields needed
       * for payment calculations.
       *
       * This is much lighter than
       * loading complete documents.
       */
      const [
        readings,
        manualSales,
      ] = await Promise.all([
        NozzleReading.find({
          pumpId,
          readingDate: date,
        })
          .select(
            "totalAmount paymentMethod payments"
          )
          .lean(),

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
            "totalAmount paymentMethod payments"
          )
          .lean(),
      ]);

      const summary = {
        cash: 0,
        upi: 0,
        card: 0,
        credit: 0,
        total: 0,
      };

      /*
       * Process both transaction
       * collections.
       */
      const processTransaction = (
        item
      ) => {
        const amount =
          Number(
            item.totalAmount || 0
          );

        if (
          Number.isFinite(amount)
        ) {
          summary.total +=
            amount;
        }

        const breakdown =
          getPaymentBreakdown(
            item
          );

        Object.entries(
          breakdown
        ).forEach(
          ([method, paymentAmount]) => {
            if (
              summary[method] !==
              undefined
            ) {
              summary[method] +=
                Number(
                  paymentAmount || 0
                );
            }
          }
        );
      };

      readings.forEach(
        processTransaction
      );

      manualSales.forEach(
        processTransaction
      );

      roundSummary(summary);

      return res.status(200).json({
        success: true,

        date,

        summary,
      });
    } catch (error) {
      console.error(
        "PAYMENT SUMMARY ERROR:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load payment summary",
      });
    }
  };