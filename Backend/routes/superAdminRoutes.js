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
} from "../controllers/superAdminController.js";

const router = express.Router();

/* =====================================================
   SECURITY
===================================================== */

router.use(authMiddleware);

router.use(superAdminMiddleware);

/* =====================================================
   SUMMARY
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