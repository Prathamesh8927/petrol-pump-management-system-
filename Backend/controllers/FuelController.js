import FuelStock from "../models/FuelStock.js";
import FuelPurchase from "../models/FuelPurchase.js";
import FuelPrice from "../models/FuelPrice.js";

/* =====================================================
   GET FUEL STOCK
===================================================== */

export const getFuelStock = async (req, res) => {
  try {
    const stocks = await FuelStock.find({
      pumpId: req.user.pumpId,
    }).sort({
      fuelType: 1,
    });

    return res.status(200).json({
      success: true,

      // Keeping both names helps older frontend code.
      stock: stocks,
      stocks,
    });
  } catch (error) {
    console.error(
      "GET FUEL STOCK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load fuel stock",
      error: error.message,
    });
  }
};

/* =====================================================
   CREATE / UPDATE FUEL STOCK
===================================================== */

export const saveFuelStock = async (req, res) => {
  try {
    const fuelType =
      req.params.fuelType ||
      req.body.fuelType;

    const type = String(
      fuelType || ""
    )
      .trim()
      .toLowerCase();

    if (
      !["petrol", "diesel"].includes(
        type
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid fuel type",
      });
    }

    const {
      openingStock,
      purchased,
      sold,
      currentStock,
      lastSupplier,
      capacity,
    } = req.body;

    const update = {};

    /* ===========================
       OPENING STOCK
    =========================== */

    if (
      openingStock !==
      undefined
    ) {
      const value =
        Number(openingStock);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid opening stock",
        });
      }

      update.openingStock =
        value;
    }

    /* ===========================
       PURCHASED
    =========================== */

    if (
      purchased !==
      undefined
    ) {
      const value =
        Number(purchased);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid purchased stock",
        });
      }

      update.purchased =
        value;
    }

    /* ===========================
       SOLD
    =========================== */

    if (
      sold !== undefined
    ) {
      const value =
        Number(sold);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid sold stock",
        });
      }

      update.sold =
        value;
    }

    /* ===========================
       CURRENT STOCK
    =========================== */

    if (
      currentStock !==
      undefined
    ) {
      const value =
        Number(currentStock);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid current stock",
        });
      }

      update.currentStock =
        value;
    }

    /* ===========================
       CAPACITY
    =========================== */

    if (
      capacity !==
      undefined
    ) {
      const value =
        Number(capacity);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid tank capacity",
        });
      }

      update.capacity =
        value;
    }

    /* ===========================
       SUPPLIER
    =========================== */

    if (
      lastSupplier !==
      undefined
    ) {
      update.lastSupplier =
        String(
          lastSupplier || ""
        ).trim();
    }

    const stock =
      await FuelStock.findOneAndUpdate(
        {
          pumpId:
            req.user.pumpId,

          fuelType:
            type,
        },

        {
          $set:
            update,

          $setOnInsert: {
            pumpId:
              req.user.pumpId,

            fuelType:
              type,
          },
        },

        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        `${type} stock updated successfully`,
      stock,
    });
  } catch (error) {
    console.error(
      "SAVE FUEL STOCK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update fuel stock",
      error: error.message,
    });
  }
};

/* =====================================================
   DELETE FUEL STOCK
===================================================== */

export const deleteFuelStock = async (req, res) => {
  try {
    const type = String(
      req.params.fuelType || ""
    )
      .trim()
      .toLowerCase();

    if (
      !["petrol", "diesel"].includes(
        type
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid fuel type",
      });
    }

    const stock =
      await FuelStock.findOneAndDelete({
        pumpId:
          req.user.pumpId,

        fuelType:
          type,
      });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message:
          `${type} stock not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        `${type} stock deleted successfully`,
    });
  } catch (error) {
    console.error(
      "DELETE FUEL STOCK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete fuel stock",
      error: error.message,
    });
  }
};

/* =====================================================
   ADD FUEL PURCHASE
===================================================== */

export const addFuelPurchase =
  async (req, res) => {
    try {
      const {
        fuelType,
        supplierName,
        quantity,

        /*
          Support both old and new
          frontend field names.
        */
        purchasePrice,
        pricePerLitre,

        totalAmount,
        purchaseDate,
        invoiceNumber = "",
        note = "",
      } = req.body;

      /* =====================================
         NORMALIZE FUEL
      ===================================== */

      const normalizedFuelType =
        String(
          fuelType || ""
        )
          .trim()
          .toLowerCase();

      if (
        ![
          "petrol",
          "diesel",
        ].includes(
          normalizedFuelType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Select Petrol or Diesel",
        });
      }

      /* =====================================
         SUPPLIER
      ===================================== */

      const cleanSupplier =
        String(
          supplierName || ""
        ).trim();

      if (!cleanSupplier) {
        return res.status(400).json({
          success: false,
          message:
            "Supplier name is required",
        });
      }

      /* =====================================
         QUANTITY
      ===================================== */

      const parsedQuantity =
        Number(quantity);

      if (
        !Number.isFinite(
          parsedQuantity
        ) ||
        parsedQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be greater than zero",
        });
      }

      /* =====================================
         PURCHASE PRICE

         Important:
         supports BOTH:

         purchasePrice
         pricePerLitre
      ===================================== */

      const parsedPurchasePrice =
        Number(
          purchasePrice ??
            pricePerLitre
        );

      if (
        !Number.isFinite(
          parsedPurchasePrice
        ) ||
        parsedPurchasePrice <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase price must be greater than zero",
        });
      }

      /* =====================================
         TOTAL

         Always calculate on backend.
         Do not trust frontend total.
      ===================================== */

      const calculatedTotal =
        Number(
          (
            parsedQuantity *
            parsedPurchasePrice
          ).toFixed(2)
        );

      /* =====================================
         CREATE PURCHASE
      ===================================== */

      const purchase =
        await FuelPurchase.create({
          pumpId:
            req.user.pumpId,

          fuelType:
            normalizedFuelType,

          supplierName:
            cleanSupplier,

          quantity:
            parsedQuantity,

          purchasePrice:
            parsedPurchasePrice,

          totalAmount:
            calculatedTotal,

          purchaseDate:
            purchaseDate ||
            new Date().toLocaleDateString(
              "en-CA"
            ),

          invoiceNumber:
            String(
              invoiceNumber || ""
            ).trim(),

          note:
            String(
              note || ""
            ).trim(),

          createdBy:
            req.user._id ||
            req.user.userId ||
            null,
        });

      /* =====================================
         UPDATE FUEL STOCK

         Make sure your FuelStock schema
         contains fuelType + currentStock.
      ===================================== */

      const stock =
        await FuelStock.findOneAndUpdate(
          {
            pumpId:
              req.user.pumpId,

            fuelType:
              normalizedFuelType,
          },

          {
            $inc: {
              currentStock:
                parsedQuantity,

              purchased:
                parsedQuantity,
            },

            $set: {
              lastSupplier:
                cleanSupplier,
            },
          },

          {
            upsert: true,

            returnDocument:
              "after",

            runValidators:
              true,

            setDefaultsOnInsert:
              true,
          }
        );

      return res.status(201).json({
        success: true,

        message:
          "Fuel purchase added successfully",

        purchase,

        stock,
      });
    } catch (error) {
      console.error(
        "ADD FUEL PURCHASE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to add fuel purchase",

        error:
          error.message,
      });
    }
  };
/* =====================================================
   GET FUEL PURCHASE HISTORY
===================================================== */

export const getFuelPurchases = async (
  req,
  res
) => {
  try {
    const purchases =
      await FuelPurchase.find({
        pumpId:
          req.user.pumpId,
      })
        .populate(
          "createdBy",
          "name email"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count:
        purchases.length,
      purchases,
    });
  } catch (error) {
    console.error(
      "GET FUEL PURCHASES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load purchase history",
      error: error.message,
    });
  }
};

/* =====================================================
   SET / UPDATE FUEL PRICE
===================================================== */

export const setFuelPrice = async (
  req,
  res
) => {
  try {
    const {
      petrolPrice,
      dieselPrice,
    } = req.body;

    const petrol =
      Number(petrolPrice);

    const diesel =
      Number(dieselPrice);

    if (
      !Number.isFinite(petrol) ||
      petrol <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid petrol price",
      });
    }

    if (
      !Number.isFinite(diesel) ||
      diesel <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid diesel price",
      });
    }

    const price =
      await FuelPrice.create({
        pumpId:
          req.user.pumpId,

        petrolPrice:
          petrol,

        dieselPrice:
          diesel,

        effectiveFrom:
          new Date(),

        /*
          Works if your model uses createdBy.
        */
        createdBy:
          req.user._id,
      });

    return res.status(201).json({
      success: true,
      message:
        "Fuel prices updated successfully",

      // Keep both names for frontend compatibility.
      price,
      fuelPrice:
        price,
    });
  } catch (error) {
    console.error(
      "SET FUEL PRICE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update fuel prices",
      error: error.message,
    });
  }
};

/* =====================================================
   GET LATEST FUEL PRICE
===================================================== */

export const getFuelPrice = async (
  req,
  res
) => {
  try {
    const price =
      await FuelPrice.findOne({
        pumpId:
          req.user.pumpId,
      })
        .sort({
          effectiveFrom: -1,
          createdAt: -1,
        })
        .populate(
          "createdBy",
          "name email"
        );

    return res.status(200).json({
      success: true,

      // Both keys support previous frontend versions.
      price,
      fuelPrice:
        price,
    });
  } catch (error) {
    console.error(
      "GET FUEL PRICE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load fuel price",
      error: error.message,
    });
  }
};