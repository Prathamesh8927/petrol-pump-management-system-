import api from "../services/api";

/* =====================================================
   GET DELETED DATA
===================================================== */

/**
 * GET /api/recovery
 *
 * Supported params:
 * - page
 * - limit
 * - originalCollection
 */
export const getDeletedData = async (params = {}) => {
  try {
    const response = await api.get("/recovery", {
      params,
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

/* =====================================================
   GET ONE DELETED RECORD
===================================================== */

/**
 * GET /api/recovery/:id
 */
export const getDeletedDataById = async (id) => {
  if (!id) {
    throw new Error("Deleted record ID is required.");
  }

  try {
    const response = await api.get(
      `/recovery/${encodeURIComponent(id)}`
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

/* =====================================================
   RESTORE ONE RECORD
===================================================== */

/**
 * POST /api/recovery/:id/restore
 */
export const restoreDeletedData = async (id) => {
  if (!id) {
    throw new Error("Deleted record ID is required.");
  }

  try {
    const response = await api.post(
      `/recovery/${encodeURIComponent(id)}/restore`
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

/* =====================================================
   RESTORE GROUP
===================================================== */

/**
 * POST /api/recovery/group/:groupId/restore
 */
export const restoreDeletedGroup = async (groupId) => {
  if (!groupId) {
    throw new Error("Deletion group ID is required.");
  }

  try {
    const response = await api.post(
      `/recovery/group/${encodeURIComponent(groupId)}/restore`
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

/* =====================================================
   PERMANENT DELETE
===================================================== */

/**
 * DELETE /api/recovery/:id
 *
 * Permanently removes only the recovery copy.
 * This action cannot be undone through the application.
 */
export const permanentlyDeleteDeletedData = async (id) => {
  if (!id) {
    throw new Error("Deleted record ID is required.");
  }

  try {
    const response = await api.delete(
      `/recovery/${encodeURIComponent(id)}`
    );

    return response.data;
  } catch (error) {
    throw error;
  }
};

/* =====================================================
   COMPATIBILITY ALIASES
===================================================== */

export const getRecoveryData = getDeletedData;

export const getRecoveryDataById =
  getDeletedDataById;

export const restoreRecoveryData =
  restoreDeletedData;

export const restoreRecoveryGroup =
  restoreDeletedGroup;

export const permanentlyDeleteRecoveryData =
  permanentlyDeleteDeletedData;

/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {
  getDeletedData,
  getDeletedDataById,
  restoreDeletedData,
  restoreDeletedGroup,
  permanentlyDeleteDeletedData,

  getRecoveryData,
  getRecoveryDataById,
  restoreRecoveryData,
  restoreRecoveryGroup,
  permanentlyDeleteRecoveryData,
};