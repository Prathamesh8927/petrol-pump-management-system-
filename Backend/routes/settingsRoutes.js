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
 * All settings routes require authentication.
 */
router.use(authMiddleware);

/* =====================================================
   PUMP SETTINGS
===================================================== */

router.get(
  "/pump",
  getPumpSettings
);

router.put(
  "/pump",
  updatePumpSettings
);

/* =====================================================
   PAYMENT PROVIDER SETTINGS
===================================================== */

router.get(
  "/payment",
  getPaymentSettings
);

router.put(
  "/payment",
  updatePaymentSettings
);

/* =====================================================
   OWNER BANK ACCOUNT
===================================================== */

router.get(
  "/bank",
  getBankAccountSettings
);

router.put(
  "/bank",
  updateBankAccountSettings
);

/* =====================================================
   FUEL SETTINGS
===================================================== */

router.get(
  "/fuel",
  getFuelSettings
);

router.put(
  "/fuel",
  updateFuelSettings
);

/* =====================================================
   PUMP USERS
===================================================== */

router.get(
  "/users",
  getPumpUsers
);

router.post(
  "/users",
  addPumpUser
);

router.put(
  "/users/:userId",
  updatePumpUser
);

router.delete(
  "/users/:userId",
  deletePumpUser
);

export default router;