import mongoose from "mongoose";

import Expense from "../models/Expense.js";
import Employee from "../models/Employee.js";

/* =====================================================
   EXPENSE CATEGORIES
===================================================== */

const VALID_CATEGORIES = [
  "salary",
  "electricity",
  "maintenance",
  "transport",
  "office",
  "food",
  "repair",
  "miscellaneous",
];

const VALID_PAYMENT_METHODS = [
  "cash",
  "upi",
  "bank",
  "card",
];

/* =====================================================
   ADD EXPENSE
===================================================== */

export const addExpense = async (
  req,
  res
) => {
  try {
    const {
      title,
      category,
      amount,
      paymentMethod =
        "cash",
      expenseDate,
      note = "",
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Expense title is required",
      });
    }

    if (
      !VALID_CATEGORIES.includes(
        category
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid expense category",
      });
    }

    const amountValue =
      Number(amount);

    if (
      !Number.isFinite(
        amountValue
      ) ||
      amountValue <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expense amount must be greater than zero",
      });
    }

    if (!expenseDate) {
      return res.status(400).json({
        success: false,
        message:
          "Expense date is required",
      });
    }

    if (
      !VALID_PAYMENT_METHODS.includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment method",
      });
    }

    const expense =
      await Expense.create({
        pumpId:
          req.user.pumpId,

        title:
          title.trim(),

        category,

        amount:
          amountValue,

        paymentMethod,

        expenseDate,

        note:
          String(
            note || ""
          ).trim(),

        createdBy:
          req.user._id,
      });

    return res.status(201).json({
      success: true,

      message:
        "Expense added successfully",

      expense,
    });
  } catch (error) {
    console.error(
      "ADD EXPENSE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to add expense",

      error:
        error.message,
    });
  }
};

/* =====================================================
   GET EXPENSES
===================================================== */

export const getExpenses =
  async (req, res) => {
    try {
      const {
        from,
        to,
        category,
      } = req.query;

      const filter = {
        pumpId:
          req.user.pumpId,
      };

      if (category) {
        filter.category =
          category;
      }

      if (from || to) {
        filter.expenseDate =
          {};

        if (from) {
          filter.expenseDate.$gte =
            from;
        }

        if (to) {
          filter.expenseDate.$lte =
            to;
        }
      }

      const expenses =
        await Expense.find(
          filter
        )
          .populate(
            "employeeId",
            "name designation salary"
          )
          .populate(
            "createdBy",
            "name email"
          )
          .sort({
            expenseDate: -1,
            createdAt: -1,
          });

      const totalExpense =
        expenses.reduce(
          (
            total,
            expense
          ) =>
            total +
            Number(
              expense.amount ||
                0
            ),
          0
        );

      return res.status(200).json({
        success: true,

        count:
          expenses.length,

        totalExpense,

        expenses,
      });
    } catch (error) {
      console.error(
        "GET EXPENSES ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load expenses",

        error:
          error.message,
      });
    }
  };

/* =====================================================
   DELETE EXPENSE
===================================================== */

export const deleteExpense =
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid expense ID",
        });
      }

      const expense =
        await Expense.findOneAndDelete(
          {
            _id: id,

            pumpId:
              req.user.pumpId,
          }
        );

      if (!expense) {
        return res.status(404).json({
          success: false,
          message:
            "Expense not found",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Expense deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE EXPENSE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to delete expense",

        error:
          error.message,
      });
    }
  };

/* =====================================================
   ADD EMPLOYEE
===================================================== */

export const addEmployee =
  async (req, res) => {
    try {
      const {
        name,
        phone,
        designation,
        salary,
        joiningDate,
        note = "",
      } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,

          message:
            "Employee name is required",
        });
      }

      const salaryValue =
        Number(salary);

      if (
        !Number.isFinite(
          salaryValue
        ) ||
        salaryValue < 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid salary",
        });
      }

      if (!joiningDate) {
        return res.status(400).json({
          success: false,

          message:
            "Joining date is required",
        });
      }

      const employee =
        await Employee.create({
          pumpId:
            req.user.pumpId,

          name:
            name.trim(),

          phone:
            String(
              phone || ""
            ).trim(),

          designation:
            String(
              designation ||
                "Staff"
            ).trim(),

          salary:
            salaryValue,

          joiningDate,

          status:
            "active",

          note:
            String(
              note || ""
            ).trim(),
        });

      return res.status(201).json({
        success: true,

        message:
          "Employee added successfully",

        employee,
      });
    } catch (error) {
      console.error(
        "ADD EMPLOYEE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to add employee",

        error:
          error.message,
      });
    }
  };

/* =====================================================
   GET EMPLOYEES
===================================================== */

export const getEmployees =
  async (req, res) => {
    try {
      const employees =
        await Employee.find({
          pumpId:
            req.user.pumpId,
        }).sort({
          createdAt: -1,
        });

      const totalMonthlySalary =
        employees
          .filter(
            (employee) =>
              employee.status ===
              "active"
          )
          .reduce(
            (
              total,
              employee
            ) =>
              total +
              Number(
                employee.salary ||
                  0
              ),
            0
          );

      return res.status(200).json({
        success: true,

        count:
          employees.length,

        totalMonthlySalary,

        employees,
      });
    } catch (error) {
      console.error(
        "GET EMPLOYEES ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load employees",

        error:
          error.message,
      });
    }
  };

/* =====================================================
   UPDATE EMPLOYEE
===================================================== */

export const updateEmployee =
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid employee ID",
        });
      }

      const employee =
        await Employee.findOne({
          _id: id,

          pumpId:
            req.user.pumpId,
        });

      if (!employee) {
        return res.status(404).json({
          success: false,

          message:
            "Employee not found",
        });
      }

      const {
        name,
        phone,
        designation,
        salary,
        joiningDate,
        status,
        note,
      } = req.body;

      if (
        name !== undefined
      ) {
        employee.name =
          String(
            name
          ).trim();
      }

      if (
        phone !== undefined
      ) {
        employee.phone =
          String(
            phone
          ).trim();
      }

      if (
        designation !==
        undefined
      ) {
        employee.designation =
          String(
            designation
          ).trim();
      }

      if (
        salary !== undefined
      ) {
        const salaryValue =
          Number(salary);

        if (
          !Number.isFinite(
            salaryValue
          ) ||
          salaryValue < 0
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid salary",
            });
        }

        employee.salary =
          salaryValue;
      }

      if (
        joiningDate !==
        undefined
      ) {
        employee.joiningDate =
          joiningDate;
      }

      if (
        status !== undefined
      ) {
        if (
          ![
            "active",
            "inactive",
          ].includes(status)
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid employee status",
            });
        }

        employee.status =
          status;
      }

      if (
        note !== undefined
      ) {
        employee.note =
          String(
            note
          ).trim();
      }

      await employee.save();

      return res.status(200).json({
        success: true,

        message:
          "Employee updated successfully",

        employee,
      });
    } catch (error) {
      console.error(
        "UPDATE EMPLOYEE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to update employee",

        error:
          error.message,
      });
    }
  };

/* =====================================================
   DELETE EMPLOYEE
===================================================== */

export const deleteEmployee =
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid employee ID",
        });
      }

      const employee =
        await Employee.findOneAndDelete(
          {
            _id: id,

            pumpId:
              req.user.pumpId,
          }
        );

      if (!employee) {
        return res.status(404).json({
          success: false,

          message:
            "Employee not found",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Employee deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE EMPLOYEE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to delete employee",

        error:
          error.message,
      });
    }
  };

/* =====================================================
   PAY EMPLOYEE SALARY
===================================================== */

export const payEmployeeSalary =
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const {
        paymentDate,
        paymentMethod =
          "cash",
        amount,
        note = "",
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid employee ID",
        });
      }

      const employee =
        await Employee.findOne({
          _id: id,

          pumpId:
            req.user.pumpId,
        });

      if (!employee) {
        return res.status(404).json({
          success: false,

          message:
            "Employee not found",
        });
      }

      if (
        employee.status !==
        "active"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Cannot pay salary to inactive employee",
        });
      }

      const salaryAmount =
        amount !== undefined &&
        amount !== ""
          ? Number(amount)
          : Number(
              employee.salary
            );

      if (
        !Number.isFinite(
          salaryAmount
        ) ||
        salaryAmount <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid salary amount",
        });
      }

      if (!paymentDate) {
        return res.status(400).json({
          success: false,

          message:
            "Payment date is required",
        });
      }

      if (
        !VALID_PAYMENT_METHODS.includes(
          paymentMethod
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid payment method",
        });
      }

      /*
        Salary payment automatically
        becomes an expense.
      */

      const expense =
        await Expense.create({
          pumpId:
            req.user.pumpId,

          title:
            `Salary - ${employee.name}`,

          category:
            "salary",

          amount:
            salaryAmount,

          paymentMethod,

          expenseDate:
            paymentDate,

          employeeId:
            employee._id,

          note:
            String(
              note || ""
            ).trim(),

          createdBy:
            req.user._id,
        });

      return res.status(201).json({
        success: true,

        message:
          `Salary paid to ${employee.name}`,

        employee,

        expense,
      });
    } catch (error) {
      console.error(
        "PAY SALARY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to pay salary",

        error:
          error.message,
      });
    }
  };