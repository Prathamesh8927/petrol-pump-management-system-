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

const router = express.Router();

/* =====================================================
   AUTHENTICATION
===================================================== */

router.use(authMiddleware);

/* =====================================================
   NOZZLE READING HISTORY
===================================================== */

/*
 * GET complete nozzle reading history.
 *
 * Supports:
 *
 * page
 * limit
 * date
 * shift
 * staffId
 * nozzleId
 * paymentMethod
 */
router.get(
  "/readings",
  getNozzleReadings
);

/*
 * Backward-compatible history endpoint.
 */
router.get(
  "/readings/history",
  getNozzleReadings
);

/*
 * Add final shift reading.
 *
 * Transaction:
 * reading
 * + sale
 * + stock deduction
 * + nozzle reading update
 */
router.post(
  "/readings",
  addNozzleReading
);

/* =====================================================
   NOZZLES
===================================================== */

/*
 * Get all nozzles belonging to
 * authenticated user's pump.
 */
router.get(
  "/",
  getNozzles
);

/*
 * Add nozzle.
 */
router.post(
  "/",
  addNozzle
);

/*
 * Update nozzle.
 */
router.patch(
  "/:id",
  updateNozzle
);

/*
 * Backward-compatible PUT update.
 */
router.put(
  "/:id",
  updateNozzle
);

/*
 * Delete nozzle.
 *
 * Historical nozzles containing readings
 * or sales cannot be permanently deleted.
 *
 * If deletion is allowed, the original
 * document is moved into recovery storage.
 */
router.delete(
  "/:id",
  deleteNozzle
);

export default router;