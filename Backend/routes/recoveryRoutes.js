import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getDeletedData,
  getDeletedDataById,
  restoreDeletedData,
  restoreDeletedGroup,
  permanentlyDeleteDeletedData,
} from "../controllers/recoveryController.js";

/* =====================================================
   ROUTER
===================================================== */

const router =
  express.Router();

/* =====================================================
   AUTHENTICATION
===================================================== */

router.use(
  authMiddleware
);

/* =====================================================
   DELETED DATA
===================================================== */

/*
 * GET /api/recovery
 *
 * List deleted records for the authenticated pump.
 *
 * Optional query parameters:
 *
 * ?page=1
 * ?limit=20
 * ?originalCollection=expenses
 */
router.get(
  "/",
  getDeletedData
);

/*
 * GET /api/recovery/:id
 *
 * Get one deleted record.
 */
router.get(
  "/:id",
  getDeletedDataById
);

/* =====================================================
   GROUP RECOVERY
===================================================== */

/*
 * POST /api/recovery/group/:groupId/restore
 *
 * Restore all records belonging to one deletion group.
 *
 * Example:
 *
 * Client deletion creates:
 *
 *   Client
 *      +
 *   Pump
 *      +
 *   Owner User
 *
 * All three records share the same deletionGroupId.
 *
 * Group restore restores them atomically:
 *
 *   Pump
 *      ↓
 *   Owner User
 *      ↓
 *   Client
 *
 * If any record cannot be restored,
 * the complete transaction is rolled back.
 *
 * This prevents partial client restoration.
 */
router.post(
  "/group/:groupId/restore",
  restoreDeletedGroup
);

/* =====================================================
   INDIVIDUAL RECOVERY
===================================================== */

/*
 * POST /api/recovery/:id/restore
 *
 * Restore a deleted record.
 *
 * IMPORTANT:
 * The controller should automatically handle
 * grouped Client/Pump/User records as a complete
 * group to prevent partial restoration.
 */
router.post(
  "/:id/restore",
  restoreDeletedData
);

/* =====================================================
   PERMANENT DELETE
===================================================== */

/*
 * DELETE /api/recovery/:id
 *
 * Permanently remove the recovery copy.
 *
 * This cannot be undone through the application.
 */
router.delete(
  "/:id",
  permanentlyDeleteDeletedData
);

/* =====================================================
   EXPORT
===================================================== */

export default router;