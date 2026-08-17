import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getNozzles,
  addNozzle,
  updateNozzle,
  deleteNozzle,
  addNozzleReading,
  getNozzleReadings,
} from "../controllers/nozzleController.js";

const router =
  express.Router();

router.use(
  authMiddleware
);

/* READINGS */

router.get(
  "/readings",
  getNozzleReadings
);

router.get(
  "/readings/history",
  getNozzleReadings
);

router.post(
  "/readings",
  addNozzleReading
);

/* NOZZLES */

router.get(
  "/",
  getNozzles
);

router.post(
  "/",
  addNozzle
);

router.patch(
  "/:id",
  updateNozzle
);

router.put(
  "/:id",
  updateNozzle
);

router.delete(
  "/:id",
  deleteNozzle
);

export default router;