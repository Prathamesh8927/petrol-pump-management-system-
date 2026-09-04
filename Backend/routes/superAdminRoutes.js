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
  All Super Admin routes require authentication
  and Super Admin role.
*/

router.use(authMiddleware);
router.use(superAdminMiddleware);

/* =========================================================
   DASHBOARD
========================================================= */

router.get("/summary", getSuperAdminSummary);

/* =========================================================
   USERS
========================================================= */

router.get("/users", getSuperAdminUsers);

/* =========================================================
   REGISTRATION REQUESTS
========================================================= */

router.get("/requests", getRegistrationRequests);

router.get(
  "/requests/pending-count",
  getPendingRegistrationCount
);

router.get(
  "/requests/:id",
  getRegistrationRequestById
);

router.patch(
  "/requests/:id/approve",
  approveRegistrationRequest
);

router.patch(
  "/requests/:id/reject",
  rejectRegistrationRequest
);

/* =========================================================
   PASSWORD RESET REQUESTS
========================================================= */

router.get(
  "/password-requests",
  getPasswordResetRequests
);

router.get(
  "/password-requests/pending-count",
  getPendingPasswordResetCount
);

router.patch(
  "/password-requests/:id/approve",
  approvePasswordReset
);

router.patch(
  "/password-requests/:id/reject",
  rejectPasswordReset
);

/* =========================================================
   CLIENTS
========================================================= */

router.get("/clients", getClients);

router.post("/clients", addClient);

router.get("/clients/:id", getClientById);

router.put("/clients/:id", updateClient);

router.patch(
  "/clients/:id/status",
  updateClientStatus
);

router.delete("/clients/:id", deleteClient);

export default router;