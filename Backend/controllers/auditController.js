import mongoose from "mongoose";

import AuditLog from "../models/AuditLog.js";

/* =====================================================
   CONSTANTS
===================================================== */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_PAGE = 100000;

/* =====================================================
   HELPERS
===================================================== */

/**
 * Get authenticated user's pumpId.
 *
 * Supports:
 * req.user.pumpId
 * req.user.pumpId._id
 * req.user.pumpID
 * req.user.pump.pumpId
 */
const getPumpId = (req) => {
  const pumpId =
    req.user?.pumpId?._id ||
    req.user?.pumpId ||
    req.user?.pumpID ||
    req.user?.pump?.pumpId ||
    null;

  if (
    !pumpId ||
    !mongoose.Types.ObjectId.isValid(String(pumpId))
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(
    String(pumpId)
  );
};

/**
 * Normalize module filter.
 */
const getModuleFilter = (req) => {
  if (
    typeof req.query?.module !== "string"
  ) {
    return null;
  }

  const module = req.query.module.trim();

  if (!module) {
    return null;
  }

  /*
   * Prevent excessively large query values.
   */
  if (module.length > 100) {
    return null;
  }

  return module.toLowerCase();
};

/**
 * Safely parse positive integer.
 */
const getPositiveInteger = (
  value,
  fallback,
  maximum = Number.MAX_SAFE_INTEGER
) => {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return Math.min(
    Math.floor(parsed),
    maximum
  );
};

/* =====================================================
   GET AUDIT LOGS
===================================================== */

export const getAuditLogs = async (
  req,
  res
) => {
  try {
    /* =================================================
       PUMP ISOLATION
    ================================================= */

    const pumpId = getPumpId(req);

    /*
     * Audit logs are pump-scoped.
     *
     * Superadmin must use a dedicated
     * superadmin audit endpoint if
     * cross-pump audit access is required.
     */
    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "Pump information is required",
      });
    }

    /* =================================================
       PAGINATION
    ================================================= */

    const page = getPositiveInteger(
      req.query?.page,
      DEFAULT_PAGE,
      MAX_PAGE
    );

    const requestedLimit =
      getPositiveInteger(
        req.query?.limit,
        DEFAULT_LIMIT,
        MAX_LIMIT
      );

    const limit = Math.min(
      requestedLimit,
      MAX_LIMIT
    );

    const skip = (page - 1) * limit;

    /* =================================================
       FILTER
    ================================================= */

    const filter = {
      pumpId,
    };

    const module = getModuleFilter(req);

    if (module) {
      filter.module = module;
    }

    /* =================================================
       DATABASE QUERY
    ================================================= */

    const [logs, total] =
      await Promise.all([
        AuditLog.find(filter)
          .select(
            [
              "pumpId",
              "userId",
              "userName",
              "action",
              "module",
              "recordId",
              "description",
              "oldData",
              "newData",
              "ipAddress",
              "createdAt",
            ].join(" ")
          )
          .populate(
            "userId",
            "name email role"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        AuditLog.countDocuments(filter),
      ]);

    /* =================================================
       RESPONSE
    ================================================= */

    return res.status(200).json({
      success: true,
      page,
      pages: Math.ceil(
        total / limit
      ),
      total,
      limit,
      logs,
    });
  } catch (error) {
    console.error(
      "GET AUDIT LOGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load audit logs",
    });
  }
};