import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error(
        "MONGO_URI is not configured in environment variables."
      );
    }

    const connection =
      await mongoose.connect(
        mongoURI
      );

    console.log(
      `MongoDB Connected: ${connection.connection.host}`
    );

    return connection;
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
};

export default connectDB;