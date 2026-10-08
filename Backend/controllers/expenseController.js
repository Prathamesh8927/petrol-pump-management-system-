import mongoose from "mongoose";

import Expense from "../models/Expense.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";

import {
  createDeletedRecord,
} from "../services/recoveryService.js";

/* =====================================================
   CONSTANTS
===================================================== */

const VALID_CATEGORIES = new Set([
  "salary",
  "electricity",
  "maintenance",
  "transport",
  "office",
  "food",
  "repair",
  "miscellaneous",
]);

const VALID_PAYMENT_METHODS = new Set([
  "cash",
  "upi",
  "bank",
  "card",
]);

const SHIFT_TIME_REGEX =
  /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 30;
const MAX_DESIGNATION_LENGTH = 100;
const MAX_NOTE_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;
const MAX_LOGIN_PASSWORD_LENGTH = 128;
const MIN_LOGIN_PASSWORD_LENGTH = 6;

/* =====================================================
   HELPERS
===================================================== */

const getPumpId = (req) => {
  return (
    req.user?.pumpId?._id ||
    req.user?.pumpId ||
    req.user?.pumpID ||
    req.user?.pump?.pumpId ||
    null
  );
};

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    null
  );
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(
    String(id || "")
  );
};

const normalizeString = (
  value,
  fallback = ""
) => {
  return String(
    value ?? fallback
  ).trim();
};

const normalizeEmail = (value) => {
  return normalizeString(
    value
  ).toLowerCase();
};

const isValidEmail = (email) => {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    EMAIL_REGEX.test(email)
  );
};

const parseNonNegativeNumber = (
  value
) => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
};

const parsePositiveNumber = (
  value
) => {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return null;
  }

  return number;
};

/* =====================================================
   ADD EXPENSE
===================================================== */

export const addExpense =
  async (req, res) => {
    try {
      const {
        title,
        category,
        amount,
        paymentMethod = "cash",
        expenseDate,
        note = "",
      } = req.body || {};

      const pumpId =
        getPumpId(req);

      const userId =
        getUserId(req);

      /* =====================================
         ACCESS VALIDATION
      ===================================== */

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found",
        });
      }

      /* =====================================
         TITLE
      ===================================== */

      const cleanTitle =
        normalizeString(title);

      if (!cleanTitle) {
        return res.status(400).json({
          success: false,
          message:
            "Expense title is required",
        });
      }

      if (
        cleanTitle.length >
        MAX_TITLE_LENGTH
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Expense title is too long",
        });
      }

      /* =====================================
         CATEGORY
      ===================================== */

      const normalizedCategory =
        normalizeString(
          category
        ).toLowerCase();

      if (
        !VALID_CATEGORIES.has(
          normalizedCategory
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid expense category",
        });
      }

      /* =====================================
         AMOUNT
      ===================================== */

      const amountValue =
        parsePositiveNumber(
          amount
        );

      if (amountValue === null) {
        return res.status(400).json({
          success: false,
          message:
            "Expense amount must be greater than zero",
        });
      }

      /* =====================================
         DATE
      ===================================== */

      const cleanExpenseDate =
        normalizeString(
          expenseDate
        );

      if (!cleanExpenseDate) {
        return res.status(400).json({
          success: false,
          message:
            "Expense date is required",
        });
      }

      /* =====================================
         PAYMENT METHOD
      ===================================== */

      const normalizedPaymentMethod =
        normalizeString(
          paymentMethod
        ).toLowerCase();

      if (
        !VALID_PAYMENT_METHODS.has(
          normalizedPaymentMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment method",
        });
      }

      /* =====================================
         CREATE
      ===================================== */

      const expense =
        await Expense.create({
          pumpId,

          title:
            cleanTitle,

          category:
            normalizedCategory,

          amount:
            amountValue,

          paymentMethod:
            normalizedPaymentMethod,

          expenseDate:
            cleanExpenseDate,

          note:
            normalizeString(note),

          createdBy:
            userId,
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
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      const {
        from,
        to,
        category,
      } = req.query || {};

      /* =====================================
         FILTER
      ===================================== */

      const filter = {
        pumpId,
      };

      if (
        typeof category ===
          "string" &&
        category.trim()
      ) {
        const normalizedCategory =
          category
            .trim()
            .toLowerCase();

        if (
          !VALID_CATEGORIES.has(
            normalizedCategory
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid expense category",
          });
        }

        filter.category =
          normalizedCategory;
      }

      if (
        typeof from ===
          "string" ||
        typeof to ===
          "string"
      ) {
        filter.expenseDate = {};

        if (
          typeof from ===
            "string" &&
          from.trim()
        ) {
          filter.expenseDate.$gte =
            from.trim();
        }

        if (
          typeof to ===
            "string" &&
          to.trim()
        ) {
          filter.expenseDate.$lte =
            to.trim();
        }

        if (
          Object.keys(
            filter.expenseDate
          ).length === 0
        ) {
          delete filter.expenseDate;
        }
      }

      /* =====================================
         QUERY
      ===================================== */

      const expenses =
        await Expense.find(filter)
          .select(
            [
              "pumpId",
              "title",
              "category",
              "amount",
              "paymentMethod",
              "expenseDate",
              "employeeId",
              "note",
              "createdBy",
              "createdAt",
              "updatedAt",
            ].join(" ")
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
          })
          .lean();

      /* =====================================
         TOTAL
      ===================================== */

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
    let session = null;

    try {
      const {
        id,
      } = req.params;

      const pumpId =
        getPumpId(req);

      const deletedBy =
        getUserId(req);

      /* =====================================
         VALIDATION
      ===================================== */

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
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid expense ID",
        });
      }

      /* =====================================
         TRANSACTION
      ===================================== */

      session =
        await mongoose.startSession();

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

          /* ===============================
             RECOVERY SNAPSHOT
          =============================== */

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

          /* ===============================
             DELETE
          =============================== */

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
      if (session) {
        await session.endSession();
      }
    }
  };

/* =====================================================
   ADD EMPLOYEE
===================================================== */

export const addEmployee =
  async (req, res) => {
    let session = null;

    try {
      const {
        name,
        phone,
        designation,
        salary,
        joiningDate,
        note = "",

        shiftName = "",
        shiftStartTime = "",
        shiftEndTime = "",

        loginEmail = "",
        loginPassword = "",
        enableLogin = false,
      } = req.body || {};

      const pumpId =
        getPumpId(req);

      /* =====================================
         PUMP VALIDATION
      ===================================== */

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      /* =====================================
         BASIC VALIDATION
      ===================================== */

      const cleanName =
        normalizeString(name);

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message:
            "Employee name is required",
        });
      }

      if (
        cleanName.length >
        MAX_NAME_LENGTH
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Employee name is too long",
        });
      }

      const salaryValue =
        parseNonNegativeNumber(
          salary
        );

      if (salaryValue === null) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid salary",
        });
      }

      if (
        !joiningDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Joining date is required",
        });
      }

      /* =====================================
         NORMALIZE SHIFT
      ===================================== */

      const normalizedShiftName =
        normalizeString(
          shiftName
        );

      const normalizedShiftStartTime =
        normalizeString(
          shiftStartTime
        );

      const normalizedShiftEndTime =
        normalizeString(
          shiftEndTime
        );

      /* =====================================
         SHIFT VALIDATION
      ===================================== */

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

      /* =====================================
         LOGIN
      ===================================== */

      const shouldEnableLogin =
        enableLogin === true ||
        enableLogin === "true";

      const normalizedLoginEmail =
        normalizeEmail(
          loginEmail
        );

      const normalizedLoginPassword =
        String(
          loginPassword || ""
        );

      if (shouldEnableLogin) {
        if (
          !isValidEmail(
            normalizedLoginEmail
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "A valid employee login email is required",
          });
        }

        if (
          normalizedLoginPassword.length <
            MIN_LOGIN_PASSWORD_LENGTH ||
          normalizedLoginPassword.length >
            MAX_LOGIN_PASSWORD_LENGTH
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Employee login password must contain 6 to 128 characters",
          });
        }
      }

      /* =====================================
         CREATE TRANSACTION
      ===================================== */

      session =
        await mongoose.startSession();

      let employee = null;

      await session.withTransaction(
        async () => {
          /* ===============================
             LOGIN DUPLICATE CHECK
          =============================== */

          if (
            shouldEnableLogin
          ) {
            const existingLogin =
              await User.findOne({
                email:
                  normalizedLoginEmail,
              })
                .select("_id")
                .session(
                  session
                )
                .lean();

            if (existingLogin) {
              const error =
                new Error(
                  "A user with this employee login already exists"
                );

              error.code =
                "EMPLOYEE_LOGIN_EXISTS";

              throw error;
            }
          }

          /* ===============================
             EMPLOYEE
          =============================== */

          const createdEmployees =
            await Employee.create(
              [
                {
                  pumpId,

                  name:
                    cleanName,

                  phone:
                    normalizeString(
                      phone
                    ),

                  designation:
                    normalizeString(
                      designation ||
                        "Staff"
                    ),

                  salary:
                    salaryValue,

                  joiningDate,

                  status:
                    "active",

                  note:
                    normalizeString(
                      note
                    ),

                  shiftName:
                    normalizedShiftName,

                  shiftStartTime:
                    normalizedShiftStartTime,

                  shiftEndTime:
                    normalizedShiftEndTime,

                  loginEnabled:
                    shouldEnableLogin,
                },
              ],
              {
                session,
              }
            );

          employee =
            createdEmployees[0];

          /* ===============================
             USER LOGIN
          =============================== */

          if (
            shouldEnableLogin
          ) {
            const createdUsers =
              await User.create(
                [
                  {
                    name:
                      cleanName,

                    email:
                      normalizedLoginEmail,

                    password:
                      normalizedLoginPassword,

                    role:
                      "employee",

                    pumpId,

                    employeeId:
                      employee._id,

                    active:
                      true,
                  },
                ],
                {
                  session,
                }
              );

            employee.userId =
              createdUsers[0]._id;

            await employee.save({
              session,
            });
          }
        }
      );

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

      if (
        error?.code ===
          "EMPLOYEE_LOGIN_EXISTS" ||
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,

          message:
            "A user with this employee login already exists",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to add employee",

        error:
          error.message,
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  };

/* =====================================================
   GET EMPLOYEES
===================================================== */

export const getEmployees =
  async (req, res) => {
    try {
      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      const employees =
        await Employee.find({
          pumpId,
        })
          .select(
            [
              "pumpId",
              "userId",
              "loginEnabled",
              "name",
              "phone",
              "designation",
              "salary",
              "joiningDate",
              "status",
              "note",
              "shiftName",
              "shiftStartTime",
              "shiftEndTime",
              "createdAt",
              "updatedAt",
            ].join(" ")
          )
          .sort({
            createdAt: -1,
          })
          .lean();

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
                employee.salary || 0
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
    let session = null;

    try {
      const {
        id,
      } = req.params;

      const pumpId =
        getPumpId(req);

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      if (
        !isValidObjectId(id)
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
          pumpId,
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

        shiftName,
        shiftStartTime,
        shiftEndTime,

        loginEmail,
        loginPassword,
        enableLogin,
      } = req.body || {};

      /* =====================================
         NAME
      ===================================== */

      if (
        name !== undefined
      ) {
        const normalizedName =
          normalizeString(
            name
          );

        if (
          !normalizedName
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Employee name is required",
          });
        }

        if (
          normalizedName.length >
          MAX_NAME_LENGTH
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Employee name is too long",
          });
        }

        employee.name =
          normalizedName;
      }

      /* =====================================
         PHONE
      ===================================== */

      if (
        phone !== undefined
      ) {
        const normalizedPhone =
          normalizeString(
            phone
          );

        if (
          normalizedPhone.length >
          MAX_PHONE_LENGTH
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Phone number is too long",
          });
        }

        employee.phone =
          normalizedPhone;
      }

      /* =====================================
         DESIGNATION
      ===================================== */

      if (
        designation !==
        undefined
      ) {
        const normalizedDesignation =
          normalizeString(
            designation
          );

        if (
          normalizedDesignation.length >
          MAX_DESIGNATION_LENGTH
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Designation is too long",
          });
        }

        employee.designation =
          normalizedDesignation;
      }

      /* =====================================
         SALARY
      ===================================== */

      if (
        salary !== undefined
      ) {
        const salaryValue =
          parseNonNegativeNumber(
            salary
          );

        if (
          salaryValue === null
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid salary",
          });
        }

        employee.salary =
          salaryValue;
      }

      /* =====================================
         JOINING DATE
      ===================================== */

      if (
        joiningDate !==
        undefined
      ) {
        employee.joiningDate =
          joiningDate;
      }

      /* =====================================
         STATUS
      ===================================== */

      if (
        status !== undefined
      ) {
        const normalizedStatus =
          normalizeString(
            status
          ).toLowerCase();

        if (
          ![
            "active",
            "inactive",
          ].includes(
            normalizedStatus
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid employee status",
          });
        }

        employee.status =
          normalizedStatus;
      }

      /* =====================================
         NOTE
      ===================================== */

      if (
        note !== undefined
      ) {
        const normalizedNote =
          normalizeString(
            note
          );

        if (
          normalizedNote.length >
          MAX_NOTE_LENGTH
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Employee note is too long",
          });
        }

        employee.note =
          normalizedNote;
      }

      /* =====================================
         SHIFT
      ===================================== */

      if (
        shiftName !== undefined
      ) {
        employee.shiftName =
          normalizeString(
            shiftName
          );
      }

      if (
        shiftStartTime !==
        undefined
      ) {
        employee.shiftStartTime =
          normalizeString(
            shiftStartTime
          );
      }

      if (
        shiftEndTime !==
        undefined
      ) {
        employee.shiftEndTime =
          normalizeString(
            shiftEndTime
          );
      }

      const finalShiftStartTime =
        normalizeString(
          employee.shiftStartTime
        );

      const finalShiftEndTime =
        normalizeString(
          employee.shiftEndTime
        );

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

      /* =====================================
         LOGIN UPDATE
      ===================================== */

      const loginFieldsProvided =
        loginEmail !==
          undefined ||
        loginPassword !==
          undefined ||
        enableLogin !==
          undefined;

      if (
        loginFieldsProvided
      ) {
        const shouldEnableLogin =
          enableLogin ===
            undefined
            ? employee.loginEnabled
            : enableLogin ===
                true ||
              enableLogin ===
                "true";

        const normalizedLoginEmail =
          normalizeEmail(
            loginEmail
          );

        const normalizedPassword =
          loginPassword !==
          undefined
            ? String(
                loginPassword
              )
            : "";

        /* =================================
           VALIDATE NEW LOGIN
        ================================= */

        if (
          shouldEnableLogin &&
          !employee.userId &&
          !isValidEmail(
            normalizedLoginEmail
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "A valid employee login email is required",
          });
        }

        if (
          loginEmail !==
            undefined &&
          shouldEnableLogin &&
          !isValidEmail(
            normalizedLoginEmail
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "A valid employee login email is required",
          });
        }

        if (
          loginPassword !==
            undefined &&
          (
            normalizedPassword.length <
              MIN_LOGIN_PASSWORD_LENGTH ||
            normalizedPassword.length >
              MAX_LOGIN_PASSWORD_LENGTH
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Employee login password must contain 6 to 128 characters",
          });
        }

        /* =================================
           TRANSACTION
        ================================= */

        session =
          await mongoose.startSession();

        await session.withTransaction(
          async () => {
            let user = null;

            if (
              employee.userId
            ) {
              user =
                await User.findOne({
                  _id:
                    employee.userId,

                  pumpId,
                }).session(
                  session
                );
            }

            /* =============================
               CREATE USER
            ============================= */

            if (
              shouldEnableLogin &&
              !user
            ) {
              const existingUser =
                await User.findOne({
                  email:
                    normalizedLoginEmail,
                })
                  .select("_id")
                  .session(
                    session
                  )
                  .lean();

              if (
                existingUser
              ) {
                const error =
                  new Error(
                    "A user with this login email already exists"
                  );

                error.code =
                  "EMPLOYEE_LOGIN_EXISTS";

                throw error;
              }

              const createdUsers =
                await User.create(
                  [
                    {
                      name:
                        employee.name,

                      email:
                        normalizedLoginEmail,

                      password:
                        normalizedPassword,

                      role:
                        "employee",

                      pumpId,

                      employeeId:
                        employee._id,

                      active:
                        employee.status ===
                        "active",
                    },
                  ],
                  {
                    session,
                  }
                );

              user =
                createdUsers[0];

              employee.userId =
                user._id;
            }

            /* =============================
               UPDATE EXISTING USER
            ============================= */

            if (user) {
              if (
                loginEmail !==
                undefined
              ) {
                if (
                  !isValidEmail(
                    normalizedLoginEmail
                  )
                ) {
                  return;
                }

                const duplicate =
                  await User.findOne({
                    email:
                      normalizedLoginEmail,

                    _id: {
                      $ne:
                        user._id,
                    },
                  })
                    .select("_id")
                    .session(
                      session
                    )
                    .lean();

                if (
                  duplicate
                ) {
                  const error =
                    new Error(
                      "A user with this login email already exists"
                    );

                  error.code =
                    "EMPLOYEE_LOGIN_EXISTS";

                  throw error;
                }

                user.email =
                  normalizedLoginEmail;
              }

              if (
                loginPassword !==
                undefined
              ) {
                user.password =
                  normalizedPassword;
              }

              user.active =
                shouldEnableLogin &&
                employee.status ===
                  "active";

              await user.save({
                session,
              });
            }

            employee.loginEnabled =
              shouldEnableLogin;

            if (
              user &&
              !shouldEnableLogin
            ) {
              user.active =
                false;

              await user.save({
                session,
              });
            }

            await employee.save({
              session,
            });
          }
        );
      } else {
        /* =================================
           STATUS → LOGIN SYNC
        ================================= */

        if (
          employee.userId &&
          employee.status ===
            "inactive"
        ) {
          await User.updateOne(
            {
              _id:
                employee.userId,

              pumpId,
            },
            {
              $set: {
                active:
                  false,
              },
            }
          );

          employee.loginEnabled =
            false;
        }

        await employee.save();
      }

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

      if (
        error?.code ===
          "EMPLOYEE_LOGIN_EXISTS" ||
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,

          message:
            "A user with this login email already exists",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update employee",

        error:
          error.message,
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  };

/* =====================================================
   DELETE EMPLOYEE
===================================================== */

export const deleteEmployee =
  async (req, res) => {
    let session = null;

    try {
      const {
        id,
      } = req.params;

      const pumpId =
        getPumpId(req);

      const deletedBy =
        getUserId(req);

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
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid employee ID",
        });
      }

      session =
        await mongoose.startSession();

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

          /* ===============================
             RECOVERY
          =============================== */

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

          /* ===============================
             DELETE EMPLOYEE
          =============================== */

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

          /* ===============================
             DISABLE LOGIN
          =============================== */

          if (
            employee.userId
          ) {
            await User.updateOne(
              {
                _id:
                  employee.userId,

                pumpId,
              },
              {
                $set: {
                  active:
                    false,
                },
              }
            ).session(
              session
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
      if (session) {
        await session.endSession();
      }
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
        paymentMethod = "cash",
        amount,
        note = "",
      } = req.body || {};

      const pumpId =
        getPumpId(req);

      const userId =
        getUserId(req);

      /* =====================================
         VALIDATION
      ===================================== */

      if (!pumpId) {
        return res.status(403).json({
          success: false,
          message:
            "Pump access is required",
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found",
        });
      }

      if (
        !isValidObjectId(id)
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
          pumpId,
        }).lean();

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
        amount !==
          undefined &&
        amount !== ""
          ? parsePositiveNumber(
              amount
            )
          : parsePositiveNumber(
              employee.salary
            );

      if (
        salaryAmount === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid salary amount",
        });
      }

      const cleanPaymentDate =
        normalizeString(
          paymentDate
        );

      if (
        !cleanPaymentDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment date is required",
        });
      }

      const normalizedPaymentMethod =
        normalizeString(
          paymentMethod
        ).toLowerCase();

      if (
        !VALID_PAYMENT_METHODS.has(
          normalizedPaymentMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment method",
        });
      }

      /* =====================================
         CREATE SALARY EXPENSE
      ===================================== */

      const expense =
        await Expense.create({
          pumpId,

          title:
            `Salary - ${employee.name}`,

          category:
            "salary",

          amount:
            salaryAmount,

          paymentMethod:
            normalizedPaymentMethod,

          expenseDate:
            cleanPaymentDate,

          employeeId:
            employee._id,

          note:
            normalizeString(
              note
            ),

          createdBy:
            userId,
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