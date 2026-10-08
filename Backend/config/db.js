import mongoose from "mongoose";

/* =====================================================
   MONGODB CONFIGURATION
===================================================== */

/**
 * Mongoose connection states:
 *
 * 0 = disconnected
 * 1 = connected
 * 2 = connecting
 * 3 = disconnecting
 */

const getMongoNumber = (
  envName,
  defaultValue,
  min = 0
) => {
  const value = Number(process.env[envName]);

  if (
    Number.isFinite(value) &&
    value >= min
  ) {
    return value;
  }

  return defaultValue;
};

/* =====================================================
   MONGODB CONNECTION EVENT LISTENERS
===================================================== */

/*
 * Register connection listeners only once when
 * this module is loaded.
 *
 * This prevents duplicate listeners when
 * connectDB() is called multiple times.
 */

const db = mongoose.connection;

db.on("connected", () => {
  console.log("MongoDB event: connected");
});

db.on("error", (error) => {
  console.error(
    "MongoDB connection error:",
    error?.message || error
  );
});

db.on("disconnected", () => {
  console.warn(
    "MongoDB event: disconnected"
  );
});

db.on("reconnected", () => {
  console.log(
    "MongoDB event: reconnected"
  );
});

/* =====================================================
   WAIT FOR EXISTING CONNECTION
===================================================== */

const waitForConnection = async () => {
  /*
   * If MongoDB is currently connecting, wait until
   * either connected or an error occurs.
   */

  if (
    mongoose.connection.readyState !== 2
  ) {
    return mongoose.connection;
  }

  await new Promise(
    (resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        db.off(
          "connected",
          onConnected
        );

        db.off(
          "error",
          onError
        );
      };

      const onConnected = () => {
        if (settled) return;

        settled = true;
        cleanup();
        resolve();
      };

      const onError = (error) => {
        if (settled) return;

        settled = true;
        cleanup();
        reject(error);
      };

      db.once(
        "connected",
        onConnected
      );

      db.once(
        "error",
        onError
      );
    }
  );

  return mongoose.connection;
};

/* =====================================================
   CONNECT DATABASE
===================================================== */

const connectDB = async () => {
  try {
    /* =================================================
       ENVIRONMENT VALIDATION
    ================================================= */

    const mongoURI =
      process.env.MONGO_URI?.trim();

    if (!mongoURI) {
      throw new Error(
        "MONGO_URI is not configured in environment variables."
      );
    }

    /* =================================================
       REUSE EXISTING CONNECTION
    ================================================= */

    if (
      mongoose.connection.readyState === 1
    ) {
      return mongoose.connection;
    }

    /* =================================================
       WAIT FOR CURRENT CONNECTION
    ================================================= */

    if (
      mongoose.connection.readyState === 2
    ) {
      return await waitForConnection();
    }

    /* =================================================
       MONGODB CONFIGURATION
    ================================================= */

    const maxPoolSize =
      getMongoNumber(
        "MONGO_MAX_POOL_SIZE",
        20,
        1
      );

    const minPoolSize =
      getMongoNumber(
        "MONGO_MIN_POOL_SIZE",
        2,
        0
      );

    /*
     * Make sure minPoolSize never exceeds maxPoolSize.
     */

    const safeMinPoolSize =
      Math.min(
        minPoolSize,
        maxPoolSize
      );

    const serverSelectionTimeoutMS =
      getMongoNumber(
        "MONGO_SERVER_SELECTION_TIMEOUT_MS",
        10000,
        1000
      );

    const socketTimeoutMS =
      getMongoNumber(
        "MONGO_SOCKET_TIMEOUT_MS",
        45000,
        1000
      );

    const connectTimeoutMS =
      getMongoNumber(
        "MONGO_CONNECT_TIMEOUT_MS",
        10000,
        1000
      );

    const maxIdleTimeMS =
      getMongoNumber(
        "MONGO_MAX_IDLE_TIME_MS",
        60000,
        1000
      );

    const heartbeatFrequencyMS =
      getMongoNumber(
        "MONGO_HEARTBEAT_FREQUENCY_MS",
        10000,
        5000
      );

    const waitQueueTimeoutMS =
      getMongoNumber(
        "MONGO_WAIT_QUEUE_TIMEOUT_MS",
        10000,
        100
      );

    /* =================================================
       CONNECTION OPTIONS
    ================================================= */

    const connectionOptions = {
      /*
       * Connection pool.
       */

      maxPoolSize,

      minPoolSize:
        safeMinPoolSize,

      /*
       * MongoDB server selection.
       */

      serverSelectionTimeoutMS,

      /*
       * Network socket timeout.
       */

      socketTimeoutMS,

      /*
       * Initial connection timeout.
       */

      connectTimeoutMS,

      /*
       * Close idle connections when they are
       * no longer required.
       */

      maxIdleTimeMS,

      /*
       * MongoDB topology heartbeat.
       */

      heartbeatFrequencyMS,

      /*
       * Prevent requests from waiting forever
       * for a free connection.
       */

      waitQueueTimeoutMS,

      /*
       * Retry temporary MongoDB failures.
       */

      retryWrites: true,

      retryReads: true,
    };

    /* =================================================
       CONNECT
    ================================================= */

    const connection =
      await mongoose.connect(
        mongoURI,
        connectionOptions
      );

    const connectedDb =
      connection.connection;

    /* =================================================
       CONNECTION INFORMATION
    ================================================= */

    console.log(
      `MongoDB Connected: ${connectedDb.host}`
    );

    console.log(
      `MongoDB Database: ${connectedDb.name}`
    );

    console.log(
      `MongoDB Pool: min=${safeMinPoolSize}, max=${maxPoolSize}`
    );

    console.log(
      `MongoDB Wait Queue: ${waitQueueTimeoutMS}ms`
    );

    /* =================================================
       RETURN CONNECTION
    ================================================= */

    return connectedDb;

  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error?.message || error
    );

    /*
     * Do not process.exit() here.
     *
     * server.js is responsible for deciding how
     * startup failures should be handled.
     */

    throw error;
  }
};

/* =====================================================
   DISCONNECT DATABASE
===================================================== */

/**
 * Gracefully closes MongoDB connection.
 *
 * Useful during server shutdown.
 */

export const disconnectDB = async () => {
  try {
    if (
      mongoose.connection.readyState === 0
    ) {
      return;
    }

    await mongoose.connection.close();

    console.log(
      "MongoDB connection closed."
    );

  } catch (error) {
    console.error(
      "MongoDB disconnect failed:",
      error?.message || error
    );

    throw error;
  }
};

/* =====================================================
   GET CONNECTION
===================================================== */

export const getDB = () => {
  return mongoose.connection;
};

/* =====================================================
   EXPORT
===================================================== */

export default connectDB;