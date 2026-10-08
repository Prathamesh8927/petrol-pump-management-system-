import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getPumpSettings,
  updatePumpSettings,

  getPaymentSettings,
  updatePaymentSettings,

  getBankAccountSettings,
  updateBankAccountSettings,

  getFuelSettings,
  updateFuelSettings,

  getPumpUsers,
  addPumpUser,
  updatePumpUser,
  deletePumpUser,
} from "../controllers/settingsController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
| Every settings endpoint requires an authenticated user.
|--------------------------------------------------------------------------
*/

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| PUMP SETTINGS
|--------------------------------------------------------------------------
*/

// GET /api/settings/pump
router.get(
  "/pump",
  getPumpSettings
);

// PUT /api/settings/pump
router.put(
  "/pump",
  updatePumpSettings
);

/*
|--------------------------------------------------------------------------
| PAYMENT PROVIDER SETTINGS
|--------------------------------------------------------------------------
*/

// GET /api/settings/payment
router.get(
  "/payment",
  getPaymentSettings
);

// PUT /api/settings/payment
router.put(
  "/payment",
  updatePaymentSettings
);

/*
|--------------------------------------------------------------------------
| OWNER BANK ACCOUNT
|--------------------------------------------------------------------------
*/

// GET /api/settings/bank
router.get(
  "/bank",
  getBankAccountSettings
);

// PUT /api/settings/bank
router.put(
  "/bank",
  updateBankAccountSettings
);

/*
|--------------------------------------------------------------------------
| FUEL SETTINGS
|--------------------------------------------------------------------------
*/

// GET /api/settings/fuel
router.get(
  "/fuel",
  getFuelSettings
);

// PUT /api/settings/fuel
router.put(
  "/fuel",
  updateFuelSettings
);

/*
|--------------------------------------------------------------------------
| PUMP USERS
|--------------------------------------------------------------------------
*/

// GET /api/settings/users
router.get(
  "/users",
  getPumpUsers
);

// POST /api/settings/users
router.post(
  "/users",
  addPumpUser
);

// PUT /api/settings/users/:userId
router.put(
  "/users/:userId",
  updatePumpUser
);

// DELETE /api/settings/users/:userId
router.delete(
  "/users/:userId",
  deletePumpUser
);

export default router;