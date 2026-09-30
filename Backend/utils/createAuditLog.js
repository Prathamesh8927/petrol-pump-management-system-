import AuditLog from "../models/AuditLog.js";

const createAuditLog = async ({
  req,
  action,
  module,
  recordId = null,
  description = "",
  oldData = null,
  newData = null,
  session = null,
}) => {
  try {
    if (!req?.user?.pumpId) {
      return null;
    }

    const auditData = {
      pumpId:
        req.user.pumpId?._id ||
        req.user.pumpId,

      userId:
        req.user._id ||
        req.user.userId ||
        null,

      userName:
        req.user.name ||
        req.user.email ||
        "",

      action: String(action || "")
        .trim()
        .toLowerCase(),

      module: String(module || "")
        .trim()
        .toLowerCase(),

      recordId,

      description: String(
        description || ""
      ).trim(),

      oldData,

      newData,

      ipAddress:
        req.ip ||
        req.socket?.remoteAddress ||
        "",
    };

    /*
     * IMPORTANT:
     *
     * When a transaction/session is supplied,
     * the AuditLog is created inside that transaction.
     *
     * If the transaction rolls back, the audit log
     * also rolls back.
     */
    if (session) {
      const documents =
        await AuditLog.create(
          [auditData],
          { session }
        );

      return documents[0] || null;
    }

    /*
     * Normal non-transactional audit logging.
     */
    return await AuditLog.create(
      auditData
    );
  } catch (error) {
    /*
     * Audit logging must not normally break
     * the primary business operation.
     *
     * Transactional callers will still roll back
     * if their primary operation itself throws.
     */
    console.error(
      "AUDIT LOG ERROR:",
      error.message
    );

    return null;
  }
};

export default createAuditLog;