import Sale from "../models/Sale.js";
import NozzleReading from "../models/NozzleReading.js";

/* =====================================================
   HELPERS
===================================================== */

const getPumpId = (req) =>
  req.user?.pumpId?._id ||
  req.user?.pumpId ||
  null;

const getLocalDate = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

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

const readingToSale = (reading) => ({
  _id: reading._id,

  nozzleId: reading.nozzleId,

  readingId: reading._id,

  fuelType: normalizeFuelType(
    reading.fuelType
  ),

  quantity: Number(
    reading.litresSold || 0
  ),

  pricePerLitre: Number(
    reading.pricePerLitre || 0
  ),

  totalAmount: Number(
    reading.totalAmount || 0
  ),

  paymentMethod: String(
    reading.paymentMethod || "cash"
  ).toLowerCase(),

  saleDate: reading.readingDate,

  source: "nozzle",

  note: reading.note || "",

  createdAt: reading.createdAt,
});

/* =====================================================
   DAILY SALES
===================================================== */

export const getDailySales = async (
  req,
  res
) => {
  try {
    const pumpId = getPumpId(req);

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

    const readings =
      await NozzleReading.find({
        pumpId,
        readingDate: date,
      })
        .populate(
          "nozzleId",
          "nozzleNumber fuelType"
        )
        .sort({
          createdAt: -1,
        });

    const manualSales =
      await Sale.find({
        pumpId,
        saleDate: date,
        source: "manual",
      })
        .populate(
          "nozzleId",
          "nozzleNumber fuelType"
        )
        .sort({
          createdAt: -1,
        });

    const nozzleSales =
      readings.map(readingToSale);

    const formattedManual =
      manualSales.map((sale) => ({
        ...sale.toObject(),

        fuelType:
          normalizeFuelType(
            sale.fuelType
          ),
      }));

    const sales = [
      ...nozzleSales,
      ...formattedManual,
    ];

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

    sales.forEach((sale) => {
      const fuelType =
        normalizeFuelType(
          sale.fuelType
        );

      const amount = Number(
        sale.totalAmount || 0
      );

      const litres = Number(
        sale.quantity ||
          sale.litresSold ||
          0
      );

      summary.totalSale +=
        amount;

      summary.totalLitres +=
        litres;

      if (fuelType === "petrol") {
        summary.petrolSale +=
          amount;

        summary.petrolLitres +=
          litres;
      }

      if (fuelType === "diesel") {
        summary.dieselSale +=
          amount;

        summary.dieselLitres +=
          litres;
      }

      const payment = String(
        sale.paymentMethod ||
          "cash"
      ).toLowerCase();

      if (
        summary[payment] !==
        undefined
      ) {
        summary[payment] +=
          amount;
      }
    });

    Object.keys(summary).forEach(
      (key) => {
        summary[key] = Number(
          summary[key].toFixed(2)
        );
      }
    );

    console.log(
      "DAILY SALES DATE:",
      date
    );

    console.log(
      "NOZZLE SALES:",
      nozzleSales.length
    );

    console.log(
      "PETROL SOLD:",
      summary.petrolLitres
    );

    console.log(
      "DIESEL SOLD:",
      summary.dieselLitres
    );

    console.log(
      "DAILY TOTAL:",
      summary.totalSale
    );

    return res.status(200).json({
      success: true,

      date,

      count: sales.length,

      sales,

      summary,
    });
  } catch (error) {
    console.error(
      "DAILY SALES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load daily sales",
    });
  }
};

/* =====================================================
   HISTORY
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

      const readingFilter = {
        pumpId,
      };

      if (date) {
        readingFilter.readingDate =
          date;
      }

      if (paymentMethod) {
        readingFilter.paymentMethod =
          String(
            paymentMethod
          ).toLowerCase();
      }

      const readings =
        await NozzleReading.find(
          readingFilter
        )
          .populate(
            "nozzleId",
            "nozzleNumber fuelType"
          )
          .sort({
            createdAt: -1,
          });

      let nozzleSales =
        readings.map(
          readingToSale
        );

      if (fuelType) {
        const requestedFuel =
          normalizeFuelType(
            fuelType
          );

        nozzleSales =
          nozzleSales.filter(
            (sale) =>
              normalizeFuelType(
                sale.fuelType
              ) === requestedFuel
          );
      }

      const manualFilter = {
        pumpId,
        source: "manual",
      };

      if (date) {
        manualFilter.saleDate =
          date;
      }

      if (paymentMethod) {
        manualFilter.paymentMethod =
          String(
            paymentMethod
          ).toLowerCase();
      }

      const manualSales =
        await Sale.find(
          manualFilter
        )
          .populate(
            "nozzleId",
            "nozzleNumber fuelType"
          )
          .sort({
            createdAt: -1,
          });

      let formattedManual =
        manualSales.map(
          (sale) => ({
            ...sale.toObject(),

            fuelType:
              normalizeFuelType(
                sale.fuelType
              ),
          })
        );

      if (fuelType) {
        const requestedFuel =
          normalizeFuelType(
            fuelType
          );

        formattedManual =
          formattedManual.filter(
            (sale) =>
              sale.fuelType ===
              requestedFuel
          );
      }

      const sales = [
        ...nozzleSales,
        ...formattedManual,
      ];

      return res.status(200).json({
        success: true,
        count: sales.length,
        sales,
      });
    } catch (error) {
      console.error(
        "SALES HISTORY ERROR:",
        error
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

      const readings =
        await NozzleReading.find({
          pumpId,
          readingDate: date,
        });

      const manualSales =
        await Sale.find({
          pumpId,
          saleDate: date,
          source: "manual",
        });

      const summary = {
        cash: 0,
        upi: 0,
        card: 0,
        credit: 0,
        total: 0,
      };

      const transactions = [
        ...readings.map(
          (reading) => ({
            paymentMethod:
              reading.paymentMethod,

            totalAmount:
              reading.totalAmount,
          })
        ),

        ...manualSales,
      ];

      transactions.forEach(
        (item) => {
          const amount = Number(
            item.totalAmount || 0
          );

          const payment = String(
            item.paymentMethod ||
              "cash"
          ).toLowerCase();

          summary.total +=
            amount;

          if (
            summary[payment] !==
            undefined
          ) {
            summary[payment] +=
              amount;
          }
        }
      );

      Object.keys(summary).forEach(
        (key) => {
          summary[key] = Number(
            summary[key].toFixed(2)
          );
        }
      );

      return res.status(200).json({
        success: true,
        date,
        summary,
      });
    } catch (error) {
      console.error(
        "PAYMENT SUMMARY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load payment summary",
      });
    }
  };