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

// All fuel operations require authentication.
router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| FUEL STOCK
|--------------------------------------------------------------------------
*/

// GET /api/fuel/stock
router.get(
  "/stock",
  getFuelStock
);

// POST /api/fuel/stock
router.post(
  "/stock",
  saveFuelStock
);

// PATCH /api/fuel/stock/:fuelType
router.patch(
  "/stock/:fuelType",
  saveFuelStock
);

// DELETE /api/fuel/stock/:fuelType
router.delete(
  "/stock/:fuelType",
  deleteFuelStock
);

/*
|--------------------------------------------------------------------------
| FUEL PURCHASES
|--------------------------------------------------------------------------
*/

// GET /api/fuel/purchases
router.get(
  "/purchases",
  getFuelPurchases
);

// POST /api/fuel/purchases
router.post(
  "/purchases",
  addFuelPurchase
);

/*
|--------------------------------------------------------------------------
| FUEL PRICE
|--------------------------------------------------------------------------
*/

// GET /api/fuel/price
router.get(
  "/price",
  getFuelPrice
);

// POST /api/fuel/price
router.post(
  "/price",
  setFuelPrice
);

// PATCH /api/fuel/price
router.patch(
  "/price",
  setFuelPrice
);

export default router;