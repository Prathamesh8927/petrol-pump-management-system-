import mongoose from "mongoose";

/* =====================================================
   HEALTH CHECK
===================================================== */

export const getHealth =
  async (req, res) => {
    try {
      const databaseConnected =
        mongoose.connection.readyState ===
        1;

      return res
        .status(
          databaseConnected
            ? 200
            : 503
        )
        .json({
          success:
            databaseConnected,

          application:
            "MyPump",

          status:
            databaseConnected
              ? "healthy"
              : "unhealthy",

          database:
            databaseConnected
              ? "connected"
              : "disconnected",

          uptime:
            Math.floor(
              process.uptime()
            ),

          timestamp:
            new Date().toISOString(),

          environment:
            process.env.NODE_ENV ||
            "development",
        });
    } catch (error) {
      console.error(
        "HEALTH CHECK ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          application:
            "MyPump",

          status:
            "unhealthy",

          message:
            "Health check failed",

          error:
            error.message,
        });
    }
  };