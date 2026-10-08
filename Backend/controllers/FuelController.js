import mongoose from "mongoose";

import FuelStock from "../models/FuelStock.js";
import FuelPurchase from "../models/FuelPurchase.js";
import FuelPrice from "../models/FuelPrice.js";

import {
  createDeletedRecord,
} from "../services/recoveryService.js";

/* =====================================================
   CONSTANTS
===================================================== */

const VALID_FUEL_TYPES = new Set([
  "petrol",
  "diesel",
]);

const DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}$/;

/* =====================================================
   HELPERS
===================================================== */

const getPumpId = (req) => {
  return (
    req.user?.pumpId?._id ||
    req.user?.pumpId ||
    req.user?.pumpID ||
    req.user?.pump?.pumpId ||
    null
  );
};

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    null
  );
};

const normalizeFuelType = (
  value
) => {
  const type =
    String(value || "")
      .trim()
      .toLowerCase();

  /*
   * Keep backward compatibility with
   * the old "disel" spelling.
   */
  return type === "disel"
    ? "diesel"
    : type;
};

const isValidFuelType = (
  fuelType
) => {
  return VALID_FUEL_TYPES.has(
    fuelType
  );
};

const toPositiveNumber = (
  value
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return null;
  }

  return number;
};

const toNonNegativeNumber = (
  value
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
};

const todayString = () => {
  return new Date()
    .toLocaleDateString(
      "en-CA"
    );
};

const isValidDateString = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    return false;
  }

  if (
    !DATE_REGEX.test(value)
  ) {
    return false;
  }

  const date =
    new Date(
      `${value}T00:00:00Z`
    );

  return (
    !Number.isNaN(
      date.getTime()
    ) &&
    date
      .toISOString()
      .slice(0, 10) ===
      value
  );
};

const isValidObjectId = (
  id
) => {
  return mongoose.Types.ObjectId.isValid(
    String(id || "")
  );
};

/* =====================================================
   GET FUEL STOCK
===================================================== */

export const getFuelStock =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      const stocks =
        await FuelStock.find({
          pumpId,
        })
          .select(
            "pumpId fuelType currentStock totalPurchased totalSold createdAt updatedAt"
          )
          .sort({
            fuelType: 1,
          })
          .lean();

      return res.status(200).json({
        success: true,

        stock:
          stocks,

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
      });
    }
  };

/* =====================================================
   CREATE / UPDATE FUEL STOCK
===================================================== */

export const saveFuelStock =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      const fuelType =
        req.params?.fuelType ??
        req.body?.fuelType;

      const type =
        normalizeFuelType(
          fuelType
        );

      if (
        !isValidFuelType(
          type
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid fuel type",
        });
      }

      const {
        currentStock,
        totalPurchased,
        totalSold,
        purchased,
        sold,
      } = req.body || {};

      const update = {};

      /* =====================================
         CURRENT STOCK
      ===================================== */

      if (
        currentStock !==
        undefined
      ) {
        const value =
          toNonNegativeNumber(
            currentStock
          );

        if (
          value === null
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

      /* =====================================
         PURCHASED
      ===================================== */

      const purchasedValue =
        totalPurchased !==
          undefined
          ? totalPurchased
          : purchased;

      if (
        purchasedValue !==
        undefined
      ) {
        const value =
          toNonNegativeNumber(
            purchasedValue
          );

        if (
          value === null
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid purchased stock",
          });
        }

        update.totalPurchased =
          value;
      }

      /* =====================================
         SOLD
      ===================================== */

      const soldValue =
        totalSold !==
          undefined
          ? totalSold
          : sold;

      if (
        soldValue !==
        undefined
      ) {
        const value =
          toNonNegativeNumber(
            soldValue
          );

        if (
          value === null
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid sold stock",
          });
        }

        update.totalSold =
          value;
      }

      if (
        Object.keys(
          update
        ).length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No stock data provided",
        });
      }

      /* =====================================
         UPSERT
      ===================================== */

      const stock =
        await FuelStock.findOneAndUpdate(
          {
            pumpId,
            fuelType:
              type,
          },
          {
            $set:
              update,

            $setOnInsert: {
              pumpId,
              fuelType:
                type,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert:
              true,
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
      });
    }
  };

/* =====================================================
   DELETE FUEL STOCK
===================================================== */

export const deleteFuelStock =
  async (req, res) => {
    let session = null;

    try {
      const pumpId =
        getPumpId(req);

      const userId =
        getUserId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found",
        });
      }

      const type =
        normalizeFuelType(
          req.params?.fuelType
        );

      if (
        !isValidFuelType(
          type
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid fuel type",
        });
      }

      session =
        await mongoose.startSession();

      await session.withTransaction(
        async () => {
          const stock =
            await FuelStock.findOne({
              pumpId,
              fuelType:
                type,
            }).session(
              session
            );

          if (!stock) {
            throw new Error(
              "Fuel stock not found"
            );
          }

          /* ===============================
             RECOVERY
          =============================== */

          await createDeletedRecord({
            document:
              stock,

            originalCollection:
              FuelStock.collection.name,

            originalModel:
              "FuelStock",

            pumpId,

            deletedBy:
              userId,

            req,

            deletionReason:
              `${type} fuel stock deleted by user`,

            session,
          });

          /* ===============================
             DELETE
          =============================== */

          const deleted =
            await FuelStock.deleteOne({
              _id:
                stock._id,

              pumpId,

              fuelType:
                type,
            }).session(
              session
            );

          if (
            deleted.deletedCount !==
            1
          ) {
            throw new Error(
              "Fuel stock deletion failed"
            );
          }
        }
      );

      return res.status(200).json({
        success: true,

        message:
          `${type} stock deleted successfully and can be recovered from Deleted Data.`,
      });
    } catch (error) {
      console.error(
        "DELETE FUEL STOCK ERROR:",
        error
      );

      if (
        error.message ===
        "Fuel stock not found"
      ) {
        return res.status(404).json({
          success: false,

          message:
            `${normalizeFuelType(
              req.params?.fuelType
            )} stock not found`,
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to delete fuel stock",

        error:
          error.message,
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  };

/* =====================================================
   ADD FUEL PURCHASE
===================================================== */

export const addFuelPurchase =
  async (req, res) => {
    let session = null;

    try {
      const pumpId =
        getPumpId(req);

      const userId =
        getUserId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found",
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
         FUEL TYPE
      ===================================== */

      const normalizedFuelType =
        normalizeFuelType(
          fuelType
        );

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
        toPositiveNumber(
          quantity
        );

      if (
        parsedQuantity ===
        null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be greater than zero",
        });
      }

      /* =====================================
         PURCHASE PRICE
      ===================================== */

      const parsedPurchasePrice =
        toPositiveNumber(
          purchasePrice ??
            pricePerLitre
        );

      if (
        parsedPurchasePrice ===
        null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase price must be greater than zero",
        });
      }

      /* =====================================
         DATE
      ===================================== */

      const cleanPurchaseDate =
        purchaseDate
          ? String(
              purchaseDate
            ).trim()
          : todayString();

      if (
        !isValidDateString(
          cleanPurchaseDate
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid purchase date. Use YYYY-MM-DD format.",
        });
      }

      /* =====================================
         TOTAL
      ===================================== */

      const calculatedTotal =
        Number(
          (
            parsedQuantity *
            parsedPurchasePrice
          ).toFixed(2)
        );

      let purchase = null;
      let stock = null;

      /* =====================================
         TRANSACTION
      ===================================== */

      session =
        await mongoose.startSession();

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
                      invoiceNumber ||
                        ""
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

                runValidators:
                  true,

                setDefaultsOnInsert:
                  true,

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

        error:
          error.message,
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  };

/* =====================================================
   GET FUEL PURCHASE HISTORY
===================================================== */

export const getFuelPurchases =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      const purchases =
        await FuelPurchase.find({
          pumpId,
        })
          .select(
            [
              "pumpId",
              "fuelType",
              "supplierName",
              "quantity",
              "purchasePrice",
              "totalAmount",
              "purchaseDate",
              "invoiceNumber",
              "note",
              "createdBy",
              "createdAt",
              "updatedAt",
            ].join(" ")
          )
          .populate(
            "createdBy",
            "name email"
          )
          .sort({
            purchaseDate: -1,
            createdAt: -1,
          })
          .lean();

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
      });
    }
  };

/* =====================================================
   SET / UPDATE FUEL PRICE
===================================================== */

export const setFuelPrice =
  async (req, res) => {
    let session = null;

    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
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

      if (
        petrol === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid petrol price",
        });
      }

      if (
        diesel === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Enter a valid diesel price",
        });
      }

      let prices = [];

      session =
        await mongoose.startSession();

      await session.withTransaction(
        async () => {
          /* =================================
             UPDATE BOTH PRICES IN PARALLEL
          ================================= */

          await Promise.all([
            FuelPrice.findOneAndUpdate(
              {
                pumpId,

                fuelType:
                  "petrol",
              },
              {
                $set: {
                  price:
                    petrol,
                },

                $setOnInsert: {
                  pumpId,

                  fuelType:
                    "petrol",
                },
              },
              {
                upsert:
                  true,

                new:
                  true,

                runValidators:
                  true,

                setDefaultsOnInsert:
                  true,

                session,
              }
            ),

            FuelPrice.findOneAndUpdate(
              {
                pumpId,

                fuelType:
                  "diesel",
              },
              {
                $set: {
                  price:
                    diesel,
                },

                $setOnInsert: {
                  pumpId,

                  fuelType:
                    "diesel",
                },
              },
              {
                upsert:
                  true,

                new:
                  true,

                runValidators:
                  true,

                setDefaultsOnInsert:
                  true,

                session,
              }
            ),
          ]);

          prices =
            await FuelPrice.find({
              pumpId,
            })
              .select(
                "pumpId fuelType price createdAt updatedAt"
              )
              .sort({
                fuelType: 1,
              })
              .session(
                session
              )
              .lean();
        }
      );

      const petrolRecord =
        prices.find(
          (item) =>
            item.fuelType ===
            "petrol"
        );

      const dieselRecord =
        prices.find(
          (item) =>
            item.fuelType ===
            "diesel"
        );

      const price = {
        petrolPrice:
          petrolRecord?.price ??
          petrol,

        dieselPrice:
          dieselRecord?.price ??
          diesel,

        petrol:
          petrolRecord ||
          null,

        diesel:
          dieselRecord ||
          null,
      };

      return res.status(200).json({
        success: true,

        message:
          "Fuel prices updated successfully",

        price,

        fuelPrice:
          price,

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
      if (session) {
        await session.endSession();
      }
    }
  };

/* =====================================================
   GET CURRENT FUEL PRICES
===================================================== */

export const getFuelPrice =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      const prices =
        await FuelPrice.find({
          pumpId,
        })
          .select(
            "pumpId fuelType price createdAt updatedAt"
          )
          .sort({
            fuelType: 1,
          })
          .lean();

      const petrolRecord =
        prices.find(
          (item) =>
            item.fuelType ===
            "petrol"
        );

      const dieselRecord =
        prices.find(
          (item) =>
            item.fuelType ===
            "diesel"
        );

      const price = {
        petrolPrice:
          petrolRecord?.price ??
          null,

        dieselPrice:
          dieselRecord?.price ??
          null,

        petrol:
          petrolRecord ||
          null,

        diesel:
          dieselRecord ||
          null,
      };

      return res.status(200).json({
        success: true,

        price,

        fuelPrice:
          price,

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