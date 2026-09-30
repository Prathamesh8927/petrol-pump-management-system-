import mongoose from "mongoose";

import Expense from "../models/Expense.js";
import Employee from "../models/Employee.js";

import {
  createDeletedRecord,
} from "../services/recoveryService.js";

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
   SHIFT HELPERS
===================================================== */

/*
 * Shift time is stored as HH:mm.
 *
 * Examples:
 * 06:00
 * 14:00
 * 22:00
 */
const SHIFT_TIME_REGEX =
  /^(?:[01]\d|2[0-3]):[0-5]\d$/;

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
      paymentMethod = "cash",
      expenseDate,
      note = "",
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense title is required",
      });
    }

    if (
      !VALID_CATEGORIES.includes(category)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense category",
      });
    }

    const amountValue =
      Number(amount);

    if (
      !Number.isFinite(amountValue) ||
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
        message: "Expense date is required",
      });
    }

    if (
      !VALID_PAYMENT_METHODS.includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const expense =
      await Expense.create({
        pumpId: req.user.pumpId,

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
        filter.expenseDate = {};

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
        await Expense.find(filter)
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
              expense.amount || 0
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
    const session =
      await mongoose.startSession();

    try {
      const {
        id,
      } = req.params;

      const pumpId =
        req.user?.pumpId;

      const deletedBy =
        req.user?._id;

      if (!pumpId) {
        return res.status(403).json({
          success: false,

          message:
            "Pump access is required",
        });
      }

      if (!deletedBy) {
        return res.status(401).json({
          success: false,

          message:
            "Authenticated user not found",
        });
      }

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

      /*
       * Recovery snapshot + physical deletion
       * happen inside the same transaction.
       *
       * This guarantees:
       *
       * recovery saved + delete succeeded
       * OR
       * neither operation is committed.
       */

      await session.withTransaction(
        async () => {
          const expense =
            await Expense.findOne({
              _id: id,
              pumpId,
            }).session(
              session
            );

          if (!expense) {
            throw new Error(
              "Expense not found"
            );
          }

          await createDeletedRecord({
            document:
              expense,

            originalCollection:
              Expense.collection.name,

            originalModel:
              "Expense",

            pumpId,

            deletedBy,

            req,

            deletionReason:
              "Expense deleted by user",

            session,
          });

          const deleted =
            await Expense.deleteOne({
              _id:
                expense._id,

              pumpId,
            }).session(
              session
            );

          if (
            deleted.deletedCount !==
            1
          ) {
            throw new Error(
              "Expense deletion failed"
            );
          }
        }
      );

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

      if (
        error.message ===
        "Expense not found"
      ) {
        return res.status(404).json({
          success: false,

          message:
            "Expense not found",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to delete expense",

        error:
          error.message,
      });
    } finally {
      await session.endSession();
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

        /*
         * Shift details
         */
        shiftName = "",
        shiftStartTime = "",
        shiftEndTime = "",
      } = req.body;

      /* ---------------------------------------------
         BASIC VALIDATION
      --------------------------------------------- */

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

      /* ---------------------------------------------
         NORMALIZE SHIFT DETAILS
      --------------------------------------------- */

      const normalizedShiftName =
        String(
          shiftName || ""
        ).trim();

      const normalizedShiftStartTime =
        String(
          shiftStartTime || ""
        ).trim();

      const normalizedShiftEndTime =
        String(
          shiftEndTime || ""
        ).trim();

      /* ---------------------------------------------
         SHIFT TIME VALIDATION
      --------------------------------------------- */

      if (
        normalizedShiftStartTime &&
        !SHIFT_TIME_REGEX.test(
          normalizedShiftStartTime
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid shift start time. Use HH:mm format.",
        });
      }

      if (
        normalizedShiftEndTime &&
        !SHIFT_TIME_REGEX.test(
          normalizedShiftEndTime
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid shift end time. Use HH:mm format.",
        });
      }

      /*
       * If one time is provided,
       * the other one must also be provided.
       */
      if (
        Boolean(
          normalizedShiftStartTime
        ) !==
        Boolean(
          normalizedShiftEndTime
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Both shift start time and shift end time are required.",
        });
      }

      /* ---------------------------------------------
         CREATE EMPLOYEE
      --------------------------------------------- */

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

          /* Shift details */
          shiftName:
            normalizedShiftName,

          shiftStartTime:
            normalizedShiftStartTime,

          shiftEndTime:
            normalizedShiftEndTime,
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

        /*
         * Shift details
         */
        shiftName,
        shiftStartTime,
        shiftEndTime,
      } = req.body;

      /* ---------------------------------------------
         NAME
      --------------------------------------------- */

      if (
        name !== undefined
      ) {
        const normalizedName =
          String(
            name
          ).trim();

        if (!normalizedName) {
          return res.status(400).json({
            success: false,

            message:
              "Employee name is required",
          });
        }

        employee.name =
          normalizedName;
      }

      /* ---------------------------------------------
         PHONE
      --------------------------------------------- */

      if (
        phone !== undefined
      ) {
        employee.phone =
          String(
            phone
          ).trim();
      }

      /* ---------------------------------------------
         DESIGNATION
      --------------------------------------------- */

      if (
        designation !==
        undefined
      ) {
        employee.designation =
          String(
            designation
          ).trim();
      }

      /* ---------------------------------------------
         SALARY
      --------------------------------------------- */

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

      /* ---------------------------------------------
         JOINING DATE
      --------------------------------------------- */

      if (
        joiningDate !==
        undefined
      ) {
        employee.joiningDate =
          joiningDate;
      }

      /* ---------------------------------------------
         STATUS
      --------------------------------------------- */

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

      /* ---------------------------------------------
         NOTE
      --------------------------------------------- */

      if (
        note !== undefined
      ) {
        employee.note =
          String(
            note
          ).trim();
      }

      /* ---------------------------------------------
         SHIFT NAME
      --------------------------------------------- */

      if (
        shiftName !== undefined
      ) {
        employee.shiftName =
          String(
            shiftName || ""
          ).trim();
      }

      /* ---------------------------------------------
         SHIFT START TIME
      --------------------------------------------- */

      if (
        shiftStartTime !==
        undefined
      ) {
        employee.shiftStartTime =
          String(
            shiftStartTime || ""
          ).trim();
      }

      /* ---------------------------------------------
         SHIFT END TIME
      --------------------------------------------- */

      if (
        shiftEndTime !==
        undefined
      ) {
        employee.shiftEndTime =
          String(
            shiftEndTime || ""
          ).trim();
      }

      /* ---------------------------------------------
         FINAL SHIFT VALIDATION
      --------------------------------------------- */

      const finalShiftStartTime =
        String(
          employee.shiftStartTime ||
            ""
        ).trim();

      const finalShiftEndTime =
        String(
          employee.shiftEndTime ||
            ""
        ).trim();

      if (
        finalShiftStartTime &&
        !SHIFT_TIME_REGEX.test(
          finalShiftStartTime
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid shift start time. Use HH:mm format.",
        });
      }

      if (
        finalShiftEndTime &&
        !SHIFT_TIME_REGEX.test(
          finalShiftEndTime
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid shift end time. Use HH:mm format.",
        });
      }

      /*
       * Both shift times must be present
       * or both must be empty.
       */
      if (
        Boolean(
          finalShiftStartTime
        ) !==
        Boolean(
          finalShiftEndTime
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Both shift start time and shift end time are required.",
        });
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
    const session =
      await mongoose.startSession();

    try {
      const {
        id,
      } = req.params;

      const pumpId =
        req.user?.pumpId;

      const deletedBy =
        req.user?._id;

      if (!pumpId) {
        return res.status(403).json({
          success: false,

          message:
            "Pump access is required",
        });
      }

      if (!deletedBy) {
        return res.status(401).json({
          success: false,

          message:
            "Authenticated user not found",
        });
      }

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

      await session.withTransaction(
        async () => {
          const employee =
            await Employee.findOne({
              _id: id,
              pumpId,
            }).session(
              session
            );

          if (!employee) {
            throw new Error(
              "Employee not found"
            );
          }

          await createDeletedRecord({
            document:
              employee,

            originalCollection:
              Employee.collection.name,

            originalModel:
              "Employee",

            pumpId,

            deletedBy,

            req,

            deletionReason:
              "Employee deleted by user",

            session,
          });

          const deleted =
            await Employee.deleteOne({
              _id:
                employee._id,

              pumpId,
            }).session(
              session
            );

          if (
            deleted.deletedCount !==
            1
          ) {
            throw new Error(
              "Employee deletion failed"
            );
          }
        }
      );

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

      if (
        error.message ===
        "Employee not found"
      ) {
        return res.status(404).json({
          success: false,

          message:
            "Employee not found",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to delete employee",

        error:
          error.message,
      });
    } finally {
      await session.endSession();
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