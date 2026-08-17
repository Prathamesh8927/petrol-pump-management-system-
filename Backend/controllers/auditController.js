import AuditLog from "../models/AuditLog.js";

export const getAuditLogs =
  async (req, res) => {
    try {
      const page =
        Math.max(
          Number(
            req.query.page ||
              1
          ),
          1
        );

      const limit =
        Math.min(
          Math.max(
            Number(
              req.query.limit ||
                50
            ),
            1
          ),
          100
        );

      const skip =
        (page - 1) *
        limit;

      const filter = {
        pumpId:
          req.user.pumpId,
      };

      if (
        req.query.module
      ) {
        filter.module =
          req.query.module;
      }

      const [
        logs,
        total,
      ] = await Promise.all([
        AuditLog.find(
          filter
        )
          .populate(
            "userId",
            "name email role"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit),

        AuditLog.countDocuments(
          filter
        ),
      ]);

      return res.status(200).json({
        success: true,

        page,

        pages:
          Math.ceil(
            total / limit
          ),

        total,

        logs,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,

        message:
          "Unable to load audit logs",

        error:
          error.message,
      });
    }
  };