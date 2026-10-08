import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import superAdminMiddleware from "../middleware/superAdminMiddleware.js";

import {
  getClients,
  getClientById,
  addClient,
  updateClient,
  updateClientStatus,
  deleteClient,

  getSuperAdminSummary,
  getSuperAdminUsers,

  getRegistrationRequests,
  getRegistrationRequestById,
  getPendingRegistrationCount,
  approveRegistrationRequest,
  rejectRegistrationRequest,
} from "../controllers/superAdminController.js";

import {
  getPasswordResetRequests,
  getPendingPasswordResetCount,
  approvePasswordReset,
  rejectPasswordReset,
} from "../controllers/passwordResetController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| SUPER ADMIN AUTHENTICATION
|--------------------------------------------------------------------------
|
| Every endpoint in this router requires:
|
| 1. Valid JWT
| 2. Super Admin authorization
|
|--------------------------------------------------------------------------
*/

router.use(authMiddleware);
router.use(superAdminMiddleware);

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/

// GET /api/superadmin/summary
router.get(
  "/summary",
  getSuperAdminSummary
);

/*
|--------------------------------------------------------------------------
| USERS
|--------------------------------------------------------------------------
*/

// GET /api/superadmin/users
router.get(
  "/users",
  getSuperAdminUsers
);

/*
|--------------------------------------------------------------------------
| REGISTRATION REQUESTS
|--------------------------------------------------------------------------
*/

// GET /api/superadmin/requests
router.get(
  "/requests",
  getRegistrationRequests
);

// GET /api/superadmin/requests/pending-count
router.get(
  "/requests/pending-count",
  getPendingRegistrationCount
);

// GET /api/superadmin/requests/:id
router.get(
  "/requests/:id",
  getRegistrationRequestById
);

// PATCH /api/superadmin/requests/:id/approve
router.patch(
  "/requests/:id/approve",
  approveRegistrationRequest
);

// PATCH /api/superadmin/requests/:id/reject
router.patch(
  "/requests/:id/reject",
  rejectRegistrationRequest
);

/*
|--------------------------------------------------------------------------
| PASSWORD RESET REQUESTS
|--------------------------------------------------------------------------
*/

// GET /api/superadmin/password-requests
router.get(
  "/password-requests",
  getPasswordResetRequests
);

// GET /api/superadmin/password-requests/pending-count
router.get(
  "/password-requests/pending-count",
  getPendingPasswordResetCount
);

// PATCH /api/superadmin/password-requests/:id/approve
router.patch(
  "/password-requests/:id/approve",
  approvePasswordReset
);

// PATCH /api/superadmin/password-requests/:id/reject
router.patch(
  "/password-requests/:id/reject",
  rejectPasswordReset
);

/*
|--------------------------------------------------------------------------
| CLIENTS
|--------------------------------------------------------------------------
*/

// GET /api/superadmin/clients
router.get(
  "/clients",
  getClients
);

// POST /api/superadmin/clients
router.post(
  "/clients",
  addClient
);

// GET /api/superadmin/clients/:id
router.get(
  "/clients/:id",
  getClientById
);

// PUT /api/superadmin/clients/:id
router.put(
  "/clients/:id",
  updateClient
);

// PATCH /api/superadmin/clients/:id/status
router.patch(
  "/clients/:id/status",
  updateClientStatus
);

// DELETE /api/superadmin/clients/:id
router.delete(
  "/clients/:id",
  deleteClient
);

export default router;