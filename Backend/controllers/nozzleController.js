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
   GET NOZZLES
===================================================== */

export const getNozzles = async (
  req,
  res
) => {
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

    const nozzles =
      await Nozzle.find({
        pumpId,
      }).sort({
        createdAt: 1,
      });

    const normalizedNozzles =
      nozzles.map(
        (nozzle) => {
          const item =
            nozzle.toObject();

          item.fuelType =
            normalizeFuelType(
              item.fuelType
            );

          return item;
        }
      );

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
      error:
        error.message,
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
      nozzleNumber,
      name = "",
      machineName = "",
      fuelType,
      currentReading,
      openingReading,
    } = req.body;

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

    const duplicate =
      await Nozzle.findOne({
        pumpId,
        nozzleNumber:
          cleanNumber,
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Nozzle number already exists",
      });
    }

    const nozzle =
      await Nozzle.create({
        pumpId,
        nozzleNumber:
          cleanNumber,
        name:
          String(
            name || ""
          ).trim(),
        machineName:
          String(
            machineName ||
              name ||
              ""
          ).trim(),
        fuelType:
          fuel,
        currentReading:
          initialReading,
        active: true,
        createdBy:
          getUserId(req),
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

    return res.status(500).json({
      success: false,
      message:
        "Unable to add nozzle",
      error:
        error.message,
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
    const pumpId =
      getPumpId(req);

    const {
      id,
    } = req.params;

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
      active,
    } = req.body;

    if (
      nozzleNumber !==
      undefined
    ) {
      nozzle.nozzleNumber =
        String(
          nozzleNumber
        ).trim();
    }

    if (
      name !==
      undefined
    ) {
      nozzle.name =
        String(
          name || ""
        ).trim();
    }

    if (
      machineName !==
      undefined
    ) {
      nozzle.machineName =
        String(
          machineName || ""
        ).trim();
    }

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

      nozzle.fuelType =
        normalizedFuel;
    }

    if (
      active !==
      undefined
    ) {
      nozzle.active =
        Boolean(active);
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

    return res.status(500).json({
      success: false,
      message:
        "Unable to update nozzle",
      error:
        error.message,
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
    const pumpId =
      getPumpId(req);

    const {
      id,
    } = req.params;

    const nozzle =
      await Nozzle.findOneAndDelete({
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

    return res.status(200).json({
      success: true,
      message:
        "Nozzle deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Unable to delete nozzle",
      error:
        error.message,
    });
  }
};

/* =====================================================
   ADD READING
===================================================== */

export const addNozzleReading = async (
  req,
  res
) => {
  try {
    const pumpId =
      getPumpId(req);

    const {
      nozzleId,
      closingReading,
      reading,
      readingDate,
      date,
      paymentMethod = "cash",
      note = "",
    } = req.body;

    console.log(
      "ADD READING BODY:",
      req.body
    );

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "Pump information not found",
      });
    }

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

    const nozzle =
      await Nozzle.findOne({
        _id:
          nozzleId,
        pumpId,
      });

    if (!nozzle) {
      return res.status(404).json({
        success: false,
        message:
          "Nozzle not found",
      });
    }

    const fuelType =
      normalizeFuelType(
        nozzle.fuelType
      );

    console.log(
      "FUEL TYPE:",
      fuelType
    );

    const opening =
      Number(
        nozzle.currentReading ||
          0
      );

    const finalReading =
      Number(
        closingReading ??
          reading
      );

    if (
      !Number.isFinite(
        finalReading
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid closing reading",
      });
    }

    if (
      finalReading <=
      opening
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Closing reading must be greater than ${opening}`,
      });
    }

    const litresSold =
      Number(
        (
          finalReading -
          opening
        ).toFixed(2)
      );

    const finalDate =
      readingDate ||
      date ||
      getLocalDate();

    const payment =
      String(
        paymentMethod ||
          "cash"
      )
        .trim()
        .toLowerCase();

    /* PRICE */

    const priceRecord =
      await FuelPrice.findOne({
        pumpId,
        fuelType,
      });

    console.log(
      "PRICE RECORD:",
      priceRecord
    );

    if (!priceRecord) {
      return res.status(400).json({
        success: false,
        message:
          `${fuelType} price not configured`,
      });
    }

    const pricePerLitre =
      Number(
        priceRecord.price
      );

    const totalAmount =
      Number(
        (
          litresSold *
          pricePerLitre
        ).toFixed(2)
      );

    /* STOCK */

    const stock =
      await FuelStock.findOne({
        pumpId,
        fuelType,
      });

    if (!stock) {
      return res.status(400).json({
        success: false,
        message:
          `${fuelType} stock not found`,
      });
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
      return res.status(400).json({
        success: false,
        message:
          `Insufficient ${fuelType} stock`,
      });
    }

    /* READING */

    const newReading =
      await NozzleReading.create({
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
      });

    /* SALE */

    await Sale.findOneAndUpdate(
      {
        readingId:
          newReading._id,
      },
      {
        $set: {
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
        },
      },
      {
        upsert: true,
        returnDocument:
          "after",
        runValidators:
          true,
      }
    );

    /* STOCK UPDATE */

    stock.currentStock =
      Number(
        (
          stockBefore -
          litresSold
        ).toFixed(2)
      );

    stock.totalSold =
      Number(
        (
          Number(
            stock.totalSold ||
              0
          ) +
          litresSold
        ).toFixed(2)
      );

    await stock.save();

    /* NOZZLE UPDATE */

    nozzle.currentReading =
      finalReading;

    nozzle.fuelType =
      fuelType;

    await nozzle.save();

    console.log(
      "READING CREATED:",
      newReading._id
    );

    console.log(
      "FUEL SOLD:",
      fuelType,
      litresSold
    );

    return res.status(201).json({
      success: true,

      message:
        "Reading and sale recorded successfully",

      reading:
        newReading,

      litresSold,

      fuelType,

      pricePerLitre,

      totalAmount,

      stock: {
        currentStock:
          stock.currentStock,
      },
    });
  } catch (error) {
    console.error(
      "ADD READING ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to add reading",
      error:
        error.message,
    });
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
      return res.status(500).json({
        success: false,
        message:
          "Unable to load readings",
      });
    }
  };