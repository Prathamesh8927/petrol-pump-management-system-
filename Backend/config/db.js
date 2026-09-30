import mongoose from "mongoose";

/* =====================================================
   MONGODB CONFIGURATION
===================================================== */

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI;

    /* =================================================
       ENVIRONMENT VALIDATION
    ================================================= */

    if (
      typeof mongoURI !== "string" ||
      !mongoURI.trim()
    ) {
      throw new Error(
        "MONGO_URI is not configured in environment variables."
      );
    }

    /* =================================================
       CONNECTION OPTIONS
    ================================================= */

    const connection =
      await mongoose.connect(
        mongoURI,
        {
          /*
           * MongoDB Atlas connection pool.
           *
           * maxPoolSize controls the maximum number
           * of concurrent MongoDB connections used by
           * this backend instance.
           */
          maxPoolSize:
            Number(
              process.env.MONGO_MAX_POOL_SIZE
            ) || 20,

          /*
           * Keep a small number of warm connections
           * ready for normal requests.
           */
          minPoolSize:
            Number(
              process.env.MONGO_MIN_POOL_SIZE
            ) || 2,

          /*
           * Don't wait indefinitely for a MongoDB
           * operation when Atlas is unavailable.
           */
          serverSelectionTimeoutMS:
            Number(
              process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS
            ) || 10000,

          /*
           * Prevent individual database operations
           * from hanging indefinitely.
           */
          socketTimeoutMS:
            Number(
              process.env.MONGO_SOCKET_TIMEOUT_MS
            ) || 45000,

          /*
           * Time allowed to establish a connection.
           */
          connectTimeoutMS:
            Number(
              process.env.MONGO_CONNECT_TIMEOUT_MS
            ) || 10000,

          /*
           * Prevent old idle connections from
           * remaining unnecessarily long.
           */
          maxIdleTimeMS:
            Number(
              process.env.MONGO_MAX_IDLE_TIME_MS
            ) || 60000,

          /*
           * Heartbeat frequency for monitoring
           * MongoDB server availability.
           */
          heartbeatFrequencyMS:
            Number(
              process.env.MONGO_HEARTBEAT_FREQUENCY_MS
            ) || 10000,
        }
      );

    /* =================================================
       CONNECTION EVENTS
    ================================================= */

    const db =
      mongoose.connection;

    db.on(
      "connected",
      () => {
        console.log(
          "MongoDB event: connected"
        );
      }
    );

    db.on(
      "error",
      (error) => {
        console.error(
          "MongoDB event error:",
          error.message
        );
      }
    );

    db.on(
      "disconnected",
      () => {
        console.warn(
          "MongoDB event: disconnected"
        );
      }
    );

    db.on(
      "reconnected",
      () => {
        console.log(
          "MongoDB event: reconnected"
        );
      }
    );

    console.log(
      `MongoDB Connected: ${connection.connection.host}`
    );

    console.log(
      `MongoDB Pool: min=${connection.connection.getClient()?.options?.maxPoolSize ? "configured" : "default"}`
    );

    return connection;
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    /*
     * Startup cannot safely continue without
     * MongoDB because the application depends
     * on the database for authentication and
     * all pump data.
     */
    process.exit(1);
  }
};

export default connectDB;