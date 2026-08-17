import mongoose from "mongoose";
import dotenv from "dotenv";

import connectDB from "../config/db.js";
import Sale from "../models/Sale.js";

dotenv.config();

const fixSalesIndexes = async () => {
  try {
    await connectDB();

    console.log(
      "Checking Sales indexes..."
    );

    const indexes =
      await Sale.collection.indexes();

    console.log(
      "Current indexes:",
      indexes.map(
        (index) => index.name
      )
    );

    /*
      Remove old index from previous schema.
    */
    const oldIndex =
      indexes.find(
        (index) =>
          index.name ===
          "nozzleReadingId_1"
      );

    if (oldIndex) {
      await Sale.collection.dropIndex(
        "nozzleReadingId_1"
      );

      console.log(
        "Removed old index: nozzleReadingId_1"
      );
    } else {
      console.log(
        "Old nozzleReadingId_1 index not found"
      );
    }

    /*
      Make MongoDB indexes match
      current Sale.js schema.
    */
    await Sale.syncIndexes();

    const finalIndexes =
      await Sale.collection.indexes();

    console.log(
      "Final Sales indexes:"
    );

    finalIndexes.forEach(
      (index) => {
        console.log(
          index.name,
          index.key,
          {
            unique:
              index.unique || false,

            sparse:
              index.sparse || false,
          }
        );
      }
    );

    console.log(
      "Sales indexes fixed successfully"
    );
  } catch (error) {
    console.error(
      "FIX SALES INDEX ERROR:",
      error
    );
  } finally {
    await mongoose.connection.close();

    process.exit(0);
  }
};

fixSalesIndexes();