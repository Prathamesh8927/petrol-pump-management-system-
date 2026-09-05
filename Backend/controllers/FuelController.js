import mongoose from "mongoose";

import FuelStock from "../models/FuelStock.js";
import FuelPurchase from "../models/FuelPurchase.js";
import FuelPrice from "../models/FuelPrice.js";

/* =====================================================
   HELPERS
===================================================== */

const getPumpId = (req) => {
  return req.user?.pumpId || null;
};

const getUserId = (req) => {
  return req.user?._id || null;
};

const normalizeFuelType = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const isValidFuelType = (fuelType) => {
  return ["petrol", "diesel"].includes(fuelType);
};

const toPositiveNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
};

const toNonNegativeNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return number;
};

const todayString = () => {
  return new Date().toLocaleDateString("en-CA");
};

/* =====================================================
   GET FUEL STOCK
===================================================== */

export const getFuelStock = async (req, res) => {
  try {
    const pumpId = getPumpId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message: "Pump access is required",
      });
    }

    const stocks = await FuelStock.find({
      pumpId,
    }).sort({
      fuelType: 1,
    });

    return res.status(200).json({
      success: true,

      // Keep both keys for frontend compatibility.
      stock: stocks,
      stocks,
    });
  } catch (error) {
    console.error("GET FUEL STOCK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load fuel stock",
    });
  }
};

/* =====================================================
   CREATE / UPDATE FUEL STOCK
===================================================== */

export const saveFuelStock = async (req, res) => {
  try {
    const pumpId = getPumpId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message: "Pump access is required",
      });
    }

    const fuelType =
      req.params.fuelType ||
      req.body?.fuelType;

    const type = normalizeFuelType(fuelType);

    if (!isValidFuelType(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fuel type",
      });
    }

    const {
      currentStock,
      totalPurchased,
      totalSold,

      // Backward-compatible frontend names.
      purchased,
      sold,
    } = req.body || {};

    const update = {};

    /* ===========================
       CURRENT STOCK
    =========================== */

    if (currentStock !== undefined) {
      const value =
        toNonNegativeNumber(currentStock);

      if (value === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid current stock",
        });
      }

      update.currentStock = value;
    }

    /* ===========================
       TOTAL PURCHASED
    =========================== */

    const purchasedValue =
      totalPurchased !== undefined
        ? totalPurchased
        : purchased;

    if (purchasedValue !== undefined) {
      const value =
        toNonNegativeNumber(purchasedValue);

      if (value === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchased stock",
        });
      }

      update.totalPurchased = value;
    }

    /* ===========================
       TOTAL SOLD
    =========================== */

    const soldValue =
      totalSold !== undefined
        ? totalSold
        : sold;

    if (soldValue !== undefined) {
      const value =
        toNonNegativeNumber(soldValue);

      if (value === null) {
        return res.status(400).json({
          success: false,
          message: "Invalid sold stock",
        });
      }

      update.totalSold = value;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No stock data provided",
      });
    }

    const stock =
      await FuelStock.findOneAndUpdate(
        {
          pumpId,
          fuelType: type,
        },
        {
          $set: update,
          $setOnInsert: {
            pumpId,
            fuelType: type,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        `${type} stock updated successfully`,
      stock,
    });
  } catch (error) {
    console.error("SAVE FUEL STOCK ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update fuel stock",
    });
  }
};

/* =====================================================
   DELETE FUEL STOCK
===================================================== */

export const deleteFuelStock = async (req, res) => {
  try {
    const pumpId = getPumpId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message: "Pump access is required",
      });
    }

    const type = normalizeFuelType(
      req.params.fuelType
    );

    if (!isValidFuelType(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fuel type",
      });
    }

    const stock =
      await FuelStock.findOneAndDelete({
        pumpId,
        fuelType: type,
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
      message: "Unable to delete fuel stock",
    });
  }
};

/* =====================================================
   ADD FUEL PURCHASE
===================================================== */

export const addFuelPurchase = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    const pumpId = getPumpId(req);
    const userId = getUserId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message: "Pump access is required",
      });
    }

    const {
      fuelType,
      supplierName,
      quantity,
      purchasePrice,
      pricePerLitre,
      purchaseDate,
      invoiceNumber = "",
      note = "",
    } = req.body || {};

    /* =====================================
       NORMALIZE FUEL
    ===================================== */

    const normalizedFuelType =
      normalizeFuelType(fuelType);

    if (
      !isValidFuelType(
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
      String(supplierName || "").trim();

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
      toPositiveNumber(quantity);

    if (parsedQuantity === null) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be greater than zero",
      });
    }

    /* =====================================
       PURCHASE PRICE

       Supports:
       purchasePrice
       pricePerLitre
    ===================================== */

    const parsedPurchasePrice =
      toPositiveNumber(
        purchasePrice ??
          pricePerLitre
      );

    if (parsedPurchasePrice === null) {
      return res.status(400).json({
        success: false,
        message:
          "Purchase price must be greater than zero",
      });
    }

    /* =====================================
       PURCHASE DATE
    ===================================== */

    const cleanPurchaseDate =
      purchaseDate
        ? String(purchaseDate).trim()
        : todayString();

    if (!cleanPurchaseDate) {
      return res.status(400).json({
        success: false,
        message:
          "Purchase date is required",
      });
    }

    /* =====================================
       TOTAL

       Always calculate on backend.
    ===================================== */

    const calculatedTotal =
      Number(
        (
          parsedQuantity *
          parsedPurchasePrice
        ).toFixed(2)
      );

    /* =====================================
       TRANSACTION

       Purchase + Stock update must succeed
       together.
    ===================================== */

    let purchase;
    let stock;

    await session.withTransaction(
      async () => {
        const purchaseDocuments =
          await FuelPurchase.create(
            [
              {
                pumpId,

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
                  cleanPurchaseDate,

                invoiceNumber:
                  String(
                    invoiceNumber || ""
                  ).trim(),

                note:
                  String(
                    note || ""
                  ).trim(),

                createdBy:
                  userId,
              },
            ],
            {
              session,
            }
          );

        purchase =
          purchaseDocuments[0];

        stock =
          await FuelStock.findOneAndUpdate(
            {
              pumpId,
              fuelType:
                normalizedFuelType,
            },
            {
              $inc: {
                currentStock:
                  parsedQuantity,

                totalPurchased:
                  parsedQuantity,
              },

              $setOnInsert: {
                pumpId,
                fuelType:
                  normalizedFuelType,
              },
            },
            {
              new: true,
              upsert: true,
              runValidators: true,
              setDefaultsOnInsert: true,
              session,
            }
          );
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
    });
  } finally {
    await session.endSession();
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
    const pumpId = getPumpId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message: "Pump access is required",
      });
    }

    const purchases =
      await FuelPurchase.find({
        pumpId,
      })
        .populate(
          "createdBy",
          "name email"
        )
        .sort({
          purchaseDate: -1,
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: purchases.length,
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
  const session =
    await mongoose.startSession();

  try {
    const pumpId = getPumpId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message: "Pump access is required",
      });
    }

    const {
      petrolPrice,
      dieselPrice,
    } = req.body || {};

    const petrol =
      toPositiveNumber(
        petrolPrice
      );

    const diesel =
      toPositiveNumber(
        dieselPrice
      );

    if (petrol === null) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid petrol price",
      });
    }

    if (diesel === null) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid diesel price",
      });
    }

    let prices;

    /* =====================================
       TRANSACTION

       One document for petrol.
       One document for diesel.
    ===================================== */

    await session.withTransaction(
      async () => {
        await FuelPrice.findOneAndUpdate(
          {
            pumpId,
            fuelType: "petrol",
          },
          {
            $set: {
              price: petrol,
            },

            $setOnInsert: {
              pumpId,
              fuelType: "petrol",
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
            session,
          }
        );

        await FuelPrice.findOneAndUpdate(
          {
            pumpId,
            fuelType: "diesel",
          },
          {
            $set: {
              price: diesel,
            },

            $setOnInsert: {
              pumpId,
              fuelType: "diesel",
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
            session,
          }
        );

        prices =
          await FuelPrice.find({
            pumpId,
          })
            .sort({
              fuelType: 1,
            })
            .session(session);
      }
    );

    const petrolRecord =
      prices.find(
        (item) =>
          item.fuelType === "petrol"
      );

    const dieselRecord =
      prices.find(
        (item) =>
          item.fuelType === "diesel"
      );

    /*
      Keep a frontend-friendly object while
      retaining the actual database structure.
    */
    const price = {
      petrolPrice:
        petrolRecord?.price ?? petrol,

      dieselPrice:
        dieselRecord?.price ?? diesel,

      petrol:
        petrolRecord || null,

      diesel:
        dieselRecord || null,
    };

    return res.status(200).json({
      success: true,

      message:
        "Fuel prices updated successfully",

      price,

      // Backward-compatible key.
      fuelPrice: price,

      // Actual database records.
      prices,
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
    });
  } finally {
    await session.endSession();
  }
};

/* =====================================================
   GET CURRENT FUEL PRICES
===================================================== */

export const getFuelPrice = async (
  req,
  res
) => {
  try {
    const pumpId = getPumpId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message: "Pump access is required",
      });
    }

    const prices =
      await FuelPrice.find({
        pumpId,
      })
        .sort({
          fuelType: 1,
        });

    const petrolRecord =
      prices.find(
        (item) =>
          item.fuelType === "petrol"
      );

    const dieselRecord =
      prices.find(
        (item) =>
          item.fuelType === "diesel"
      );

    const price = {
      petrolPrice:
        petrolRecord?.price ?? null,

      dieselPrice:
        dieselRecord?.price ?? null,

      petrol:
        petrolRecord || null,

      diesel:
        dieselRecord || null,
    };

    return res.status(200).json({
      success: true,

      // Frontend-friendly format.
      price,

      // Backward-compatible key.
      fuelPrice: price,

      // Actual database records.
      prices,
    });
  } catch (error) {
    console.error(
      "GET FUEL PRICE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load fuel prices",
    });
  }
};