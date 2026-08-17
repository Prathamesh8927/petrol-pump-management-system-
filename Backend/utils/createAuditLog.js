import AuditLog from "../models/AuditLog.js";

const createAuditLog = async ({
  req,
  action,
  module,
  recordId = null,
  description = "",
  oldData = null,
  newData = null,
}) => {
  try {
    if (!req?.user?.pumpId) {
      return;
    }

    await AuditLog.create({
      pumpId:
        req.user.pumpId,

      userId:
        req.user._id ||
        req.user.userId ||
        null,

      userName:
        req.user.name ||
        req.user.email ||
        "",

      action,

      module,

      recordId,

      description,

      oldData,

      newData,

      ipAddress:
        req.ip ||
        req.socket
          ?.remoteAddress ||
        "",
    });
  } catch (error) {
    console.error(
      "AUDIT LOG ERROR:",
      error.message
    );
  }
};

export default createAuditLog;