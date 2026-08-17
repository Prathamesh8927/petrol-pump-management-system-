import mongoose from "mongoose";

const expenseSchema =
  new mongoose.Schema(
    {
      pumpId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Pump",
        required: true,
        index: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      category: {
        type: String,

        enum: [
          "salary",
          "electricity",
          "maintenance",
          "transport",
          "office",
          "food",
          "repair",
          "miscellaneous",
        ],

        required: true,
      },

      amount: {
        type: Number,
        required: true,
        min: 0,
      },

      paymentMethod: {
        type: String,

        enum: [
          "cash",
          "upi",
          "bank",
          "card",
        ],

        default: "cash",
      },

      expenseDate: {
        type: String,
        required: true,
        index: true,
      },

      employeeId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Employee",

        default:
          null,
      },

      note: {
        type: String,
        trim: true,
        default: "",
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,
      },
    },

    {
      timestamps: true,
    }
  );

expenseSchema.index({
  pumpId: 1,
  expenseDate: 1,
});

const Expense =
  mongoose.models.Expense ||
  mongoose.model(
    "Expense",
    expenseSchema
  );

export default Expense;