import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getPumpSettings,
  updatePumpSettings,

  getFuelSettings,
  updateFuelSettings,

  getPumpUsers,
  addPumpUser,
  updatePumpUser,
  deletePumpUser,
} from "../controllers/settingsController.js";

const router =
  express.Router();

router.use(
  authMiddleware
);

/* PUMP */

router.get(
  "/pump",
  getPumpSettings
);

router.put(
  "/pump",
  updatePumpSettings
);

/* FUEL */

router.get(
  "/fuel",
  getFuelSettings
);

router.put(
  "/fuel",
  updateFuelSettings
);

/* USERS */

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