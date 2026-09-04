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

const router =
  express.Router();

/* =====================================================
   SUPER ADMIN SECURITY
===================================================== */

router.use(
  authMiddleware
);

router.use(
  superAdminMiddleware
);

/* =====================================================
   DASHBOARD
===================================================== */

router.get(
  "/summary",
  getSuperAdminSummary
);

/* =====================================================
   USERS
===================================================== */

router.get(
  "/users",
  getSuperAdminUsers
);

/* =====================================================
   REGISTRATION REQUESTS
===================================================== */

/*
   Get all requests

   Optional:
   ?status=pending
   ?status=approved
   ?status=rejected
   ?search=abc
*/

router.get(
  "/requests",
  getRegistrationRequests
);

/*
   Pending request count
*/

router.get(
  "/requests/pending-count",
  getPendingRegistrationCount
);

/*
   IMPORTANT:
   Keep pending-count BEFORE /requests/:id
   so Express does not treat "pending-count"
   as an ID.
*/

/*
   Get one request
*/

router.get(
  "/requests/:id",
  getRegistrationRequestById
);

/*
   Approve request
*/

router.patch(
  "/requests/:id/approve",
  approveRegistrationRequest
);

/*
   Reject request
*/

router.patch(
  "/requests/:id/reject",
  rejectRegistrationRequest
);

/* =====================================================
   CLIENTS
===================================================== */

router.get(
  "/clients",
  getClients
);

router.post(
  "/clients",
  addClient
);

router.get(
  "/clients/:id",
  getClientById
);

router.put(
  "/clients/:id",
  updateClient
);

router.patch(
  "/clients/:id/status",
  updateClientStatus
);

router.delete(
  "/clients/:id",
  deleteClient
);

export default router;