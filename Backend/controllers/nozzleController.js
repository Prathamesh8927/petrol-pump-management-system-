import mongoose from "mongoose";

import Nozzle from "../models/Nozzle.js";
import NozzleReading from "../models/NozzleReading.js";
import FuelPrice from "../models/FuelPrice.js";
import FuelStock from "../models/FuelStock.js";
import Sale from "../models/Sale.js";

/* =====================================================
   HELPERS
===================================================== */

const getPumpId = (req) =>
  req.user?.pumpId?._id ||
  req.user?.pumpId ||
  null;

const getUserId = (req) =>
  req.user?._id ||
  req.user?.userId ||
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

const isValidDateString = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value);

const isValidPaymentMethod = (value) =>
  [
    "cash",
    "upi",
    "card",
    "credit",
  ].includes(value);

/* =====================================================
   GET NOZZLES
===================================================== */

export const getNozzles = async (
  req,
  res
) => {
  try {
    const pumpId = getPumpId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message:
          "Pump information not found",
      });
    }

    const nozzles =
      await Nozzle.find({
        pumpId,
      }).sort({
        createdAt: 1,
      });

    const normalizedNozzles =
      nozzles.map((nozzle) => {
        const item =
          nozzle.toObject();

        item.fuelType =
          normalizeFuelType(
            item.fuelType
          );

        return item;
      });

    return res.status(200).json({
      success: true,
      count:
        normalizedNozzles.length,
      nozzles:
        normalizedNozzles,
    });
  } catch (error) {
    console.error(
      "GET NOZZLES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load nozzles",
    });
  }
};

/* =====================================================
   ADD NOZZLE
===================================================== */

export const addNozzle = async (
  req,
  res
) => {
  try {
    const pumpId = getPumpId(req);

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message:
          "Pump information not found",
      });
    }

    const {
      nozzleNumber,
      name = "",
      machineName = "",
      fuelType,
      currentReading,
      openingReading,
      status,
    } = req.body || {};

    const cleanNumber =
      String(
        nozzleNumber || ""
      ).trim();

    if (!cleanNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Nozzle number is required",
      });
    }

    const fuel =
      normalizeFuelType(
        fuelType
      );

    if (
      ![
        "petrol",
        "diesel",
      ].includes(fuel)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fuel type must be Petrol or Diesel",
      });
    }

    const initialReading =
      Number(
        currentReading ??
          openingReading ??
          0
      );

    if (
      !Number.isFinite(
        initialReading
      ) ||
      initialReading < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Opening reading is invalid",
      });
    }

    const cleanName =
      String(
        name ||
          machineName ||
          ""
      ).trim();

    let normalizedStatus =
      status === undefined
        ? "active"
        : String(status)
            .trim()
            .toLowerCase();

    if (
      ![
        "active",
        "inactive",
      ].includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid nozzle status",
      });
    }

    /*
      Unique index also protects against
      concurrent duplicate creation.
    */

    const nozzle =
      await Nozzle.create({
        pumpId,

        nozzleNumber:
          cleanNumber,

        name:
          cleanName,

        fuelType:
          fuel,

        currentReading:
          initialReading,

        status:
          normalizedStatus,
      });

    return res.status(201).json({
      success: true,
      message:
        "Nozzle added successfully",
      nozzle,
    });
  } catch (error) {
    console.error(
      "ADD NOZZLE ERROR:",
      error
    );

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Nozzle number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to add nozzle",
    });
  }
};

/* =====================================================
   UPDATE NOZZLE
===================================================== */

export const updateNozzle = async (
  req,
  res
) => {
  try {
    const pumpId = getPumpId(req);
    const { id } = req.params;

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message:
          "Pump information not found",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid nozzle ID",
      });
    }

    const nozzle =
      await Nozzle.findOne({
        _id: id,
        pumpId,
      });

    if (!nozzle) {
      return res.status(404).json({
        success: false,
        message:
          "Nozzle not found",
      });
    }

    const {
      nozzleNumber,
      name,
      machineName,
      fuelType,

      /*
        Support old frontend field name
        while storing the correct model field.
      */
      active,

      /*
        Correct field according to Nozzle model.
      */
      status,
    } = req.body || {};

    /* =====================================
       NOZZLE NUMBER
    ===================================== */

    if (
      nozzleNumber !==
      undefined
    ) {
      const cleanNumber =
        String(
          nozzleNumber
        ).trim();

      if (!cleanNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Nozzle number is required",
        });
      }

      if (
        cleanNumber !==
        nozzle.nozzleNumber
      ) {
        const duplicate =
          await Nozzle.findOne({
            pumpId,
            nozzleNumber:
              cleanNumber,
            _id: {
              $ne: nozzle._id,
            },
          });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Nozzle number already exists",
          });
        }
      }

      nozzle.nozzleNumber =
        cleanNumber;
    }

    /* =====================================
       NAME
    ===================================== */

    if (
      name !== undefined ||
      machineName !== undefined
    ) {
      const value =
        name !== undefined
          ? name
          : machineName;

      nozzle.name =
        String(
          value || ""
        ).trim();
    }

    /* =====================================
       FUEL TYPE
    ===================================== */

    if (
      fuelType !==
      undefined
    ) {
      const normalizedFuel =
        normalizeFuelType(
          fuelType
        );

      if (
        ![
          "petrol",
          "diesel",
        ].includes(
          normalizedFuel
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid fuel type",
        });
      }

      /*
        Changing a nozzle's fuel type after
        historical readings exist can make
        the history confusing.

        Therefore, reject the change when
        historical readings exist.
      */

      if (
        normalizedFuel !==
        nozzle.fuelType
      ) {
        const historicalReading =
          await NozzleReading.exists({
            pumpId,
            nozzleId:
              nozzle._id,
          });

        if (historicalReading) {
          return res.status(409).json({
            success: false,
            message:
              "Fuel type cannot be changed because this nozzle has historical readings.",
          });
        }

        nozzle.fuelType =
          normalizedFuel;
      }
    }

    /* =====================================
       STATUS
    ===================================== */

    let normalizedStatus =
      status !== undefined
        ? String(status)
            .trim()
            .toLowerCase()
        : null;

    /*
      Backward compatibility:
      old frontend may send active=true/false.
    */

    if (
      normalizedStatus === null &&
      active !== undefined
    ) {
      normalizedStatus =
        active === true ||
        active === "true"
          ? "active"
          : "inactive";
    }

    if (
      normalizedStatus !==
      null
    ) {
      if (
        ![
          "active",
          "inactive",
        ].includes(
          normalizedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid nozzle status",
        });
      }

      nozzle.status =
        normalizedStatus;
    }

    await nozzle.save();

    return res.status(200).json({
      success: true,
      message:
        "Nozzle updated successfully",
      nozzle,
    });
  } catch (error) {
    console.error(
      "UPDATE NOZZLE ERROR:",
      error
    );

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Nozzle number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to update nozzle",
    });
  }
};

/* =====================================================
   DELETE NOZZLE
===================================================== */

export const deleteNozzle = async (
  req,
  res
) => {
  try {
    const pumpId = getPumpId(req);
    const { id } = req.params;

    if (!pumpId) {
      return res.status(403).json({
        success: false,
        message:
          "Pump information not found",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid nozzle ID",
      });
    }

    const nozzle =
      await Nozzle.findOne({
        _id: id,
        pumpId,
      });

    if (!nozzle) {
      return res.status(404).json({
        success: false,
        message:
          "Nozzle not found",
      });
    }

    /*
      Never physically delete a nozzle that
      already has historical readings.

      Otherwise NozzleReading.nozzleId and
      Sale.nozzleId would point to a deleted
      document.
    */

    const hasReadings =
      await NozzleReading.exists({
        pumpId,
        nozzleId:
          nozzle._id,
      });

    if (hasReadings) {
      return res.status(409).json({
        success: false,
        message:
          "This nozzle has historical readings and cannot be deleted. Set it to inactive instead.",
      });
    }

    const deleted =
      await Nozzle.findOneAndDelete({
        _id: id,
        pumpId,
      });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message:
          "Nozzle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Nozzle deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE NOZZLE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete nozzle",
    });
  }
};

/* =====================================================
   ADD NOZZLE READING
===================================================== */

export const addNozzleReading =
  async (req, res) => {
    let session = null;

    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump information not found",
        });
      }

      const {
        nozzleId,
        closingReading,
        reading,
        readingDate,
        date,
        paymentMethod = "cash",
        note = "",
      } = req.body || {};

      /* =====================================
         NOZZLE ID
      ===================================== */

      if (
        !nozzleId ||
        !mongoose.Types.ObjectId.isValid(
          nozzleId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid nozzle",
        });
      }

      /* =====================================
         PAYMENT METHOD
      ===================================== */

      const payment =
        String(
          paymentMethod || "cash"
        )
          .trim()
          .toLowerCase();

      if (
        !isValidPaymentMethod(
          payment
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment method",
        });
      }

      /* =====================================
         DATE
      ===================================== */

      const finalDate =
        String(
          readingDate ||
            date ||
            getLocalDate()
        ).trim();

      if (
        !isValidDateString(
          finalDate
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid reading date. Use YYYY-MM-DD format.",
        });
      }

      /* =====================================
         CLOSING READING
      ===================================== */

      const finalReading =
        Number(
          closingReading ??
            reading
        );

      if (
        !Number.isFinite(
          finalReading
        ) ||
        finalReading < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Enter valid closing reading",
        });
      }

      session =
        await mongoose.startSession();

      let transactionResult = null;

      await session.withTransaction(
        async () => {
          /* =====================================
             GET ACTIVE NOZZLE

             IMPORTANT:
             Actual model uses `status`,
             not `active`.
          ===================================== */

          const nozzle =
            await Nozzle.findOne({
              _id: nozzleId,
              pumpId,
              status: "active",
            }).session(session);

          if (!nozzle) {
            const error =
              new Error(
                "NOZZLE_NOT_FOUND_OR_INACTIVE"
              );

            error.code =
              "NOZZLE_NOT_FOUND_OR_INACTIVE";

            throw error;
          }

          const fuelType =
            normalizeFuelType(
              nozzle.fuelType
            );

          if (
            ![
              "petrol",
              "diesel",
            ].includes(
              fuelType
            )
          ) {
            const error =
              new Error(
                "INVALID_FUEL_TYPE"
              );

            error.code =
              "INVALID_FUEL_TYPE";

            throw error;
          }

          /* =====================================
             OPENING READING
          ===================================== */

          const opening =
            Number(
              nozzle.currentReading ||
                0
            );

          if (
            finalReading <=
            opening
          ) {
            const error =
              new Error(
                "INVALID_CLOSING_READING"
              );

            error.code =
              "INVALID_CLOSING_READING";

            error.opening =
              opening;

            throw error;
          }

          const litresSold =
            Number(
              (
                finalReading -
                opening
              ).toFixed(2)
            );

          /* =====================================
             CURRENT FUEL PRICE

             FuelPrice model has exactly one
             document per pump + fuelType.

             DO NOT use effectiveFrom because
             that field does not exist.
          ===================================== */

          const priceRecord =
            await FuelPrice.findOne({
              pumpId,
              fuelType,
            }).session(session);

          if (!priceRecord) {
            const error =
              new Error(
                "FUEL_PRICE_NOT_CONFIGURED"
              );

            error.code =
              "FUEL_PRICE_NOT_CONFIGURED";

            throw error;
          }

          const pricePerLitre =
            Number(
              priceRecord.price
            );

          if (
            !Number.isFinite(
              pricePerLitre
            ) ||
            pricePerLitre <= 0
          ) {
            const error =
              new Error(
                "INVALID_FUEL_PRICE"
              );

            error.code =
              "INVALID_FUEL_PRICE";

            throw error;
          }

          const totalAmount =
            Number(
              (
                litresSold *
                pricePerLitre
              ).toFixed(2)
            );

          /* =====================================
             CHECK FUEL STOCK
          ===================================== */

          const stock =
            await FuelStock.findOne({
              pumpId,
              fuelType,
            }).session(session);

          if (!stock) {
            const error =
              new Error(
                "FUEL_STOCK_NOT_FOUND"
              );

            error.code =
              "FUEL_STOCK_NOT_FOUND";

            throw error;
          }

          const stockBefore =
            Number(
              stock.currentStock ||
                0
            );

          if (
            stockBefore <
            litresSold
          ) {
            const error =
              new Error(
                "INSUFFICIENT_FUEL_STOCK"
              );

            error.code =
              "INSUFFICIENT_FUEL_STOCK";

            error.available =
              stockBefore;

            error.required =
              litresSold;

            throw error;
          }

          /* =====================================
             CREATE NOZZLE READING
          ===================================== */

          const createdReadings =
            await NozzleReading.create(
              [
                {
                  pumpId,

                  nozzleId:
                    nozzle._id,

                  fuelType,

                  openingReading:
                    opening,

                  closingReading:
                    finalReading,

                  litresSold,

                  pricePerLitre,

                  totalAmount,

                  readingDate:
                    finalDate,

                  paymentMethod:
                    payment,

                  note:
                    String(
                      note || ""
                    ).trim(),

                  createdBy:
                    getUserId(req),
                },
              ],
              {
                session,
              }
            );

          const newReading =
            createdReadings[0];

          /* =====================================
             CREATE CORRESPONDING SALE
          ===================================== */

          await Sale.create(
            [
              {
                pumpId,

                nozzleId:
                  nozzle._id,

                readingId:
                  newReading._id,

                fuelType,

                quantity:
                  litresSold,

                pricePerLitre,

                totalAmount,

                paymentMethod:
                  payment,

                saleDate:
                  finalDate,

                source:
                  "nozzle",

                note:
                  String(
                    note || ""
                  ).trim(),

                createdBy:
                  getUserId(req),
              },
            ],
            {
              session,
            }
          );

          /* =====================================
             ATOMIC STOCK UPDATE

             Prevents negative stock if another
             transaction changes the stock.
          ===================================== */

          const updatedStock =
            await FuelStock.findOneAndUpdate(
              {
                _id:
                  stock._id,

                pumpId,

                fuelType,

                currentStock: {
                  $gte:
                    litresSold,
                },
              },
              {
                $inc: {
                  currentStock:
                    -litresSold,

                  totalSold:
                    litresSold,
                },
              },
              {
                new: true,
                runValidators:
                  true,
                session,
              }
            );

          if (!updatedStock) {
            const error =
              new Error(
                "STOCK_UPDATE_CONFLICT"
              );

            error.code =
              "STOCK_UPDATE_CONFLICT";

            throw error;
          }

          /* =====================================
             ATOMIC NOZZLE READING UPDATE

             Only update if the reading has not
             changed since we read it.
          ===================================== */

          const updatedNozzle =
            await Nozzle.findOneAndUpdate(
              {
                _id:
                  nozzle._id,

                pumpId,

                status:
                  "active",

                currentReading:
                  opening,
              },
              {
                $set: {
                  currentReading:
                    finalReading,
                },
              },
              {
                new: true,
                runValidators:
                  true,
                session,
              }
            );

          if (!updatedNozzle) {
            const error =
              new Error(
                "NOZZLE_READING_CONFLICT"
              );

            error.code =
              "NOZZLE_READING_CONFLICT";

            throw error;
          }

          transactionResult = {
            newReading,

            updatedStock,

            litresSold,

            fuelType,

            pricePerLitre,

            totalAmount,
          };
        }
      );

      return res.status(201).json({
        success: true,

        message:
          "Reading and sale recorded successfully",

        reading:
          transactionResult
            .newReading,

        litresSold:
          transactionResult
            .litresSold,

        fuelType:
          transactionResult
            .fuelType,

        pricePerLitre:
          transactionResult
            .pricePerLitre,

        totalAmount:
          transactionResult
            .totalAmount,

        stock: {
          currentStock:
            transactionResult
              .updatedStock
              .currentStock,
        },
      });
    } catch (error) {
      console.error(
        "ADD READING ERROR:",
        error
      );

      if (
        error?.code ===
        "NOZZLE_NOT_FOUND_OR_INACTIVE"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Nozzle not found or inactive",
        });
      }

      if (
        error?.code ===
        "INVALID_FUEL_TYPE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid nozzle fuel type",
        });
      }

      if (
        error?.code ===
        "INVALID_CLOSING_READING"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Closing reading must be greater than ${error.opening}`,
        });
      }

      if (
        error?.code ===
        "INVALID_FUEL_PRICE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Configured fuel price is invalid",
        });
      }

      if (
        error?.code ===
        "FUEL_PRICE_NOT_CONFIGURED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Fuel price is not configured",
        });
      }

      if (
        error?.code ===
        "FUEL_STOCK_NOT_FOUND"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Fuel stock not found",
        });
      }

      if (
        error?.code ===
        "INSUFFICIENT_FUEL_STOCK"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Insufficient fuel stock",
        });
      }

      if (
        error?.code ===
        "STOCK_UPDATE_CONFLICT"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Fuel stock changed while recording the reading. Please try again.",
        });
      }

      if (
        error?.code ===
        "NOZZLE_READING_CONFLICT"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This nozzle was updated by another request. Please refresh and enter the reading again.",
        });
      }

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This reading has already been recorded.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to add reading",
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  };

/* =====================================================
   READING HISTORY
===================================================== */

export const getNozzleReadings =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump information not found",
        });
      }

      const readings =
        await NozzleReading.find({
          pumpId,
        })
          .populate(
            "nozzleId",
            "nozzleNumber fuelType"
          )
          .sort({
            readingDate: -1,
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,
        readings,
      });
    } catch (error) {
      console.error(
        "GET NOZZLE READINGS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load readings",
      });
    }
  };