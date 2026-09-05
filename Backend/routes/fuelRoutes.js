import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getFuelStock,
  saveFuelStock,
  deleteFuelStock,
  addFuelPurchase,
  getFuelPurchases,
  setFuelPrice,
  getFuelPrice,
} from "../controllers/FuelController.js";

const router = express.Router();

router.use(authMiddleware);

/* ===============================
   STOCK
================================ */

router.get(
  "/stock",
  getFuelStock
);

router.post(
  "/stock",
  saveFuelStock
);

router.patch(
  "/stock/:fuelType",
  saveFuelStock
);

router.delete(
  "/stock/:fuelType",
  deleteFuelStock
);

/* ===============================
   PURCHASE
================================ */

router.get(
  "/purchases",
  getFuelPurchases
);

router.post(
  "/purchases",
  addFuelPurchase
);

/* ===============================
   PRICE
================================ */

router.get(
  "/price",
  getFuelPrice
);

router.post(
  "/price",
  setFuelPrice
);

router.patch(
  "/price",
  setFuelPrice
);

export default router;