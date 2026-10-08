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

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| NOZZLE READINGS
|--------------------------------------------------------------------------
*/

/*
 * GET /api/nozzles/readings
 *
 * Supports:
 * - page
 * - limit
 * - date
 * - shift
 * - staffId
 * - nozzleId
 * - paymentMethod
 */
router.get(
  "/readings",
  getNozzleReadings
);

/*
 * Backward-compatible endpoint.
 *
 * GET /api/nozzles/readings/history
 */
router.get(
  "/readings/history",
  getNozzleReadings
);

/*
 * POST /api/nozzles/readings
 *
 * Adds the final shift reading and handles
 * the related sale/stock operations.
 */
router.post(
  "/readings",
  addNozzleReading
);

/*
|--------------------------------------------------------------------------
| NOZZLES
|--------------------------------------------------------------------------
*/

// GET /api/nozzles
router.get(
  "/",
  getNozzles
);

// POST /api/nozzles
router.post(
  "/",
  addNozzle
);

// PATCH /api/nozzles/:id
router.patch(
  "/:id",
  updateNozzle
);

// Backward-compatible PUT endpoint.
router.put(
  "/:id",
  updateNozzle
);

// DELETE /api/nozzles/:id
router.delete(
  "/:id",
  deleteNozzle
);

export default router;