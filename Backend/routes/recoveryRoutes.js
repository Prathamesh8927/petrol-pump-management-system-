import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getDeletedData,
  getDeletedDataById,
  restoreDeletedData,
  restoreDeletedGroup,
  permanentlyDeleteDeletedData,
} from "../controllers/recoveryController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| RECOVERY LIST
|--------------------------------------------------------------------------
*/

// GET /api/recovery
router.get(
  "/",
  getDeletedData
);

// GET /api/recovery/:id
router.get(
  "/:id",
  getDeletedDataById
);

/*
|--------------------------------------------------------------------------
| GROUP RESTORE
|--------------------------------------------------------------------------
*/

// POST /api/recovery/group/:groupId/restore
router.post(
  "/group/:groupId/restore",
  restoreDeletedGroup
);

/*
|--------------------------------------------------------------------------
| INDIVIDUAL RESTORE
|--------------------------------------------------------------------------
*/

// POST /api/recovery/:id/restore
router.post(
  "/:id/restore",
  restoreDeletedData
);

/*
|--------------------------------------------------------------------------
| PERMANENT DELETE
|--------------------------------------------------------------------------
*/

// DELETE /api/recovery/:id
router.delete(
  "/:id",
  permanentlyDeleteDeletedData
);

export default router;