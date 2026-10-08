import mongoose from "mongoose";

import LedgerCustomer from "../models/LedgerCustomer.js";
import LedgerEntry from "../models/LedgerEntry.js";
import FuelPrice from "../models/FuelPrice.js";

/* =====================================================
   CONSTANTS
===================================================== */

const BUSINESS_TIMEZONE = "Asia/Kolkata";
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_FUEL_TYPES = new Set([
  "petrol",
  "diesel",
]);

const MAX_NOTE_LENGTH = 500;

/* =====================================================
   HELPERS
===================================================== */

const todayString = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const normalizeDate = (value) => {
  const date = String(value || "").trim();

  if (!date) {
    return todayString();
  }

  if (!DATE_REGEX.test(date)) {
    return null;
  }

  const parsed = new Date(
    `${date}T00:00:00+05:30`
  );

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return date;
};

const roundMoney = (value) =>
  Number(Number(value || 0).toFixed(2));

const getAuthorizedPumpId = (req) => {
  const pumpId = req.user?.pumpId;

  if (!pumpId) {
    const error = new Error(
      "Authenticated pump information is missing."
    );

    error.statusCode = 403;
    error.code = "PUMP_ID_MISSING";

    throw error;
  }

  return pumpId;
};

const getAuthorizedUserId = (req) =>
  req.user?._id ||
  req.user?.userId ||
  null;

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const normalizeFuelType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeNote = (value) =>
  String(value || "").trim();

const handleValidationError = (
  error,
  fallbackMessage,
  fallbackCode
) => {
  if (Number.isInteger(error?.statusCode)) {
    return {
      status: error.statusCode,
      message:
        error.message || fallbackMessage,
      code:
        error.code || fallbackCode,
    };
  }

  if (error?.name === "ValidationError") {
    return {
      status: 400,
      message: fallbackMessage,
      code: fallbackCode,
    };
  }

  if (error?.name === "CastError") {
    return {
      status: 400,
      message: "Invalid data provided.",
      code: fallbackCode,
    };
  }

  if (error?.code === 11000) {
    return {
      status: 409,
      message:
        "This record could not be created because a duplicate record was detected.",
      code: error.code,
    };
  }

  return {
    status: 500,
    message:
      error?.message || fallbackMessage,
    code:
      error?.code || fallbackCode,
  };
};

/* =====================================================
   CALCULATE CUSTOMER ADVANCE
===================================================== */

const calculateCustomerAdvance = (
  entries = []
) => {
  let totalAdvanceReceived = 0;
  let totalAdvanceApplied = 0;

  for (const entry of entries) {
    if (entry.entryType === "advance") {
      totalAdvanceReceived += Number(
        entry.advanceAmount ??
          entry.paymentAmount ??
          entry.totalAmount ??
          0
      );
    }

    if (entry.entryType === "purchase") {
      totalAdvanceApplied += Number(
        entry.advanceAppliedAmount || 0
      );
    }
  }

  totalAdvanceReceived =
    roundMoney(totalAdvanceReceived);

  totalAdvanceApplied =
    roundMoney(totalAdvanceApplied);

  return {
    totalAdvanceReceived,

    totalAdvanceApplied,

    advanceBalance: roundMoney(
      Math.max(
        totalAdvanceReceived -
          totalAdvanceApplied,
        0
      )
    ),
  };
};

/* =====================================================
   CALCULATE CUSTOMER SUMMARY
===================================================== */

const calculateCustomerSummary = async (
  pumpId,
  customerId,
  session = null
) => {
  let query = LedgerEntry.find({
    pumpId,
    customerId,
  }).select(
    "entryType totalAmount paidAmount paymentAmount advanceAmount advanceAppliedAmount"
  );

  if (session) {
    query = query.session(session);
  }

  const entries = await query.lean();

  let totalPurchased = 0;
  let purchasePaid = 0;
  let paymentReceived = 0;

  let purchaseCount = 0;
  let paymentCount = 0;
  let advanceCount = 0;

  for (const entry of entries) {
    if (entry.entryType === "purchase") {
      totalPurchased += Number(
        entry.totalAmount || 0
      );

      purchasePaid += Number(
        entry.paidAmount || 0
      );

      purchaseCount += 1;
    }

    if (entry.entryType === "payment") {
      paymentReceived += Number(
        entry.paymentAmount || 0
      );

      paymentCount += 1;
    }

    if (entry.entryType === "advance") {
      advanceCount += 1;
    }
  }

  totalPurchased =
    roundMoney(totalPurchased);

  purchasePaid =
    roundMoney(purchasePaid);

  paymentReceived =
    roundMoney(paymentReceived);

  const advanceData =
    calculateCustomerAdvance(entries);

  const totalPaid =
    roundMoney(
      purchasePaid +
        paymentReceived +
        advanceData.totalAdvanceApplied
    );

  /*
   * Calculate pending from purchases.
   *
   * Important:
   * paymentReceived is normal payment made later.
   * advanceAppliedAmount is separately deducted.
   */
  let purchasePending = 0;

  for (const entry of entries) {
    if (entry.entryType !== "purchase") {
      continue;
    }

    const total =
      Number(entry.totalAmount || 0);

    const paid =
      Number(entry.paidAmount || 0);

    const advanceApplied =
      Number(
        entry.advanceAppliedAmount || 0
      );

    purchasePending += Math.max(
      total -
        paid -
        advanceApplied,
      0
    );
  }

  const totalPending =
    roundMoney(
      Math.max(
        purchasePending -
          paymentReceived,
        0
      )
    );

  return {
    totalPurchased,

    totalPaid,

    totalPending,

    purchaseCount,

    paymentCount,

    advanceCount,

    totalAdvanceReceived:
      advanceData.totalAdvanceReceived,

    totalAdvanceApplied:
      advanceData.totalAdvanceApplied,

    advanceBalance:
      advanceData.advanceBalance,
  };
};

/* =====================================================
   GET CUSTOMER SUMMARIES - AGGREGATED
   ===================================================== */

const getCustomerSummaries = async (
  pumpId,
  customerIds
) => {
  if (!customerIds?.length) {
    return new Map();
  }

  const summaries =
    await LedgerEntry.aggregate([
      {
        $match: {
          pumpId:
            new mongoose.Types.ObjectId(
              pumpId
            ),

          customerId: {
            $in: customerIds.map(
              (id) =>
                new mongoose.Types.ObjectId(
                  id
                )
            ),
          },
        },
      },

      {
        $group: {
          _id: "$customerId",

          entries: {
            $push: {
              entryType: "$entryType",

              totalAmount:
                "$totalAmount",

              paidAmount:
                "$paidAmount",

              paymentAmount:
                "$paymentAmount",

              advanceAmount:
                "$advanceAmount",

              advanceAppliedAmount:
                "$advanceAppliedAmount",
            },
          },
        },
      },
    ]);

  const summaryMap = new Map();

  for (const group of summaries) {
    const entries =
      group.entries || [];

    let totalPurchased = 0;
    let purchasePaid = 0;
    let paymentReceived = 0;

    let purchasePending = 0;

    let purchaseCount = 0;
    let paymentCount = 0;
    let advanceCount = 0;

    let totalAdvanceReceived = 0;
    let totalAdvanceApplied = 0;

    for (const entry of entries) {
      if (
        entry.entryType ===
        "purchase"
      ) {
        const total =
          Number(
            entry.totalAmount || 0
          );

        const paid =
          Number(
            entry.paidAmount || 0
          );

        const advanceApplied =
          Number(
            entry.advanceAppliedAmount ||
              0
          );

        totalPurchased += total;

        purchasePaid += paid;

        purchasePending += Math.max(
          total -
            paid -
            advanceApplied,
          0
        );

        totalAdvanceApplied +=
          advanceApplied;

        purchaseCount += 1;
      }

      if (
        entry.entryType ===
        "payment"
      ) {
        paymentReceived +=
          Number(
            entry.paymentAmount || 0
          );

        paymentCount += 1;
      }

      if (
        entry.entryType ===
        "advance"
      ) {
        totalAdvanceReceived +=
          Number(
            entry.advanceAmount ??
              entry.paymentAmount ??
              entry.totalAmount ??
              0
          );

        advanceCount += 1;
      }
    }

    totalPurchased =
      roundMoney(totalPurchased);

    purchasePaid =
      roundMoney(purchasePaid);

    paymentReceived =
      roundMoney(paymentReceived);

    totalAdvanceReceived =
      roundMoney(
        totalAdvanceReceived
      );

    totalAdvanceApplied =
      roundMoney(
        totalAdvanceApplied
      );

    const totalPaid =
      roundMoney(
        purchasePaid +
          paymentReceived +
          totalAdvanceApplied
      );

    const totalPending =
      roundMoney(
        Math.max(
          purchasePending -
            paymentReceived,
          0
        )
      );

    const advanceBalance =
      roundMoney(
        Math.max(
          totalAdvanceReceived -
            totalAdvanceApplied,
          0
        )
      );

    summaryMap.set(
      String(group._id),
      {
        totalPurchased,

        totalPaid,

        totalPending,

        purchaseCount,

        paymentCount,

        advanceCount,

        totalAdvanceReceived,

        totalAdvanceApplied,

        advanceBalance,
      }
    );
  }

  /*
   * Customers with no ledger entries
   * should still receive a zero summary.
   */
  for (const customerId of customerIds) {
    const key = String(customerId);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        totalPurchased: 0,
        totalPaid: 0,
        totalPending: 0,
        purchaseCount: 0,
        paymentCount: 0,
        advanceCount: 0,
        totalAdvanceReceived: 0,
        totalAdvanceApplied: 0,
        advanceBalance: 0,
      });
    }
  }

  return summaryMap;
};

/* =====================================================
   ADD CUSTOMER
===================================================== */

export const addLedgerCustomer = async (
  req,
  res
) => {
  try {
    const pumpId =
      getAuthorizedPumpId(req);

    const {
      name,
      phone = "",
      vehicleNumber = "",
      address = "",
      note = "",
    } = req.body || {};

    const normalizedName =
      String(name || "").trim();

    const normalizedPhone =
      String(phone || "").trim();

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name is required",
        code:
          "CUSTOMER_NAME_REQUIRED",
      });
    }

    if (
      normalizedName.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name cannot exceed 150 characters",
        code:
          "CUSTOMER_NAME_TOO_LONG",
      });
    }

    if (
      normalizedPhone.length > 30
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number cannot exceed 30 characters",
        code:
          "CUSTOMER_PHONE_TOO_LONG",
      });
    }

    const normalizedVehicleNumber =
      String(
        vehicleNumber || ""
      )
        .trim()
        .toUpperCase();

    const normalizedAddress =
      String(
        address || ""
      ).trim();

    const normalizedNote =
      normalizeNote(note);

    if (
      normalizedNote.length >
      MAX_NOTE_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Note cannot exceed 500 characters.",
        code:
          "NOTE_TOO_LONG",
      });
    }

    /*
     * Only active customers with the same
     * phone are considered duplicates.
     */
    if (normalizedPhone) {
      const existingCustomer =
        await LedgerCustomer.exists({
          pumpId,
          phone: normalizedPhone,
          status: "active",
        });

      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          message:
            "Customer already exists. Open the existing ledger and add a new purchase.",
          code:
            "CUSTOMER_ALREADY_EXISTS",
        });
      }
    }

    const customer =
      await LedgerCustomer.create({
        pumpId,

        name:
          normalizedName,

        phone:
          normalizedPhone,

        vehicleNumber:
          normalizedVehicleNumber,

        address:
          normalizedAddress,

        note:
          normalizedNote,

        currentBalance: 0,

        status: "active",
      });

    return res.status(201).json({
      success: true,

      message:
        "Customer added successfully",

      customer,
    });
  } catch (error) {
    console.error(
      "ADD LEDGER CUSTOMER ERROR:",
      error
    );

    const result =
      handleValidationError(
        error,
        "Unable to add customer",
        "ADD_LEDGER_CUSTOMER_ERROR"
      );

    return res.status(result.status).json({
      success: false,
      message: result.message,
      code: result.code,
    });
  }
};

/* =====================================================
   GET ALL CUSTOMERS
===================================================== */

export const getLedgerCustomers = async (
  req,
  res
) => {
  try {
    const pumpId =
      getAuthorizedPumpId(req);

    /*
     * One customer query.
     */
    const customers =
      await LedgerCustomer.find({
        pumpId,
        status: "active",
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    if (!customers.length) {
      return res.status(200).json({
        success: true,

        count: 0,

        customers: [],

        totalPurchased: 0,

        totalPaid: 0,

        totalPending: 0,

        totalAdvanceReceived: 0,

        totalAdvanceApplied: 0,

        totalAdvanceBalance: 0,
      });
    }

    /*
     * IMPORTANT OPTIMIZATION:
     *
     * Old code:
     *
     * customers.map(() =>
     *   calculateCustomerSummary()
     * )
     *
     * This creates N database queries.
     *
     * New code:
     * one aggregation for all customers.
     */
    const customerIds =
      customers.map(
        (customer) =>
          customer._id
      );

    const summaryMap =
      await getCustomerSummaries(
        pumpId,
        customerIds
      );

    let totalPurchased = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalAdvanceReceived = 0;
    let totalAdvanceApplied = 0;
    let totalAdvanceBalance = 0;

    const customersWithSummary =
      customers.map(
        (customer) => {
          const summary =
            summaryMap.get(
              String(customer._id)
            );

          const finalSummary =
            summary || {
              totalPurchased: 0,
              totalPaid: 0,
              totalPending: 0,
              purchaseCount: 0,
              paymentCount: 0,
              advanceCount: 0,
              totalAdvanceReceived: 0,
              totalAdvanceApplied: 0,
              advanceBalance: 0,
            };

          totalPurchased +=
            Number(
              finalSummary.totalPurchased ||
                0
            );

          totalPaid +=
            Number(
              finalSummary.totalPaid ||
                0
            );

          totalPending +=
            Number(
              finalSummary.totalPending ||
                0
            );

          totalAdvanceReceived +=
            Number(
              finalSummary.totalAdvanceReceived ||
                0
            );

          totalAdvanceApplied +=
            Number(
              finalSummary.totalAdvanceApplied ||
                0
            );

          totalAdvanceBalance +=
            Number(
              finalSummary.advanceBalance ||
                0
            );

          return {
            ...customer,
            ...finalSummary,
          };
        }
      );

    return res.status(200).json({
      success: true,

      count:
        customersWithSummary.length,

      customers:
        customersWithSummary,

      totalPurchased:
        roundMoney(totalPurchased),

      totalPaid:
        roundMoney(totalPaid),

      totalPending:
        roundMoney(totalPending),

      totalAdvanceReceived:
        roundMoney(
          totalAdvanceReceived
        ),

      totalAdvanceApplied:
        roundMoney(
          totalAdvanceApplied
        ),

      totalAdvanceBalance:
        roundMoney(
          totalAdvanceBalance
        ),
    });
  } catch (error) {
    console.error(
      "GET LEDGER CUSTOMERS ERROR:",
      error
    );

    const result =
      handleValidationError(
        error,
        "Unable to load ledger customers",
        "GET_LEDGER_CUSTOMERS_ERROR"
      );

    return res.status(result.status).json({
      success: false,
      message: result.message,
      code: result.code,
    });
  }
};

/* =====================================================
   GET ONE CUSTOMER
===================================================== */

export const getCustomerLedger = async (
  req,
  res
) => {
  try {
    const pumpId =
      getAuthorizedPumpId(req);

    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid customer ID",
        code:
          "INVALID_CUSTOMER_ID",
      });
    }

    const customer =
      await LedgerCustomer.findOne({
        _id: id,
        pumpId,
      }).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found",
        code:
          "CUSTOMER_NOT_FOUND",
      });
    }

    const summary =
      await calculateCustomerSummary(
        pumpId,
        customer._id
      );

    return res.status(200).json({
      success: true,

      customer: {
        ...customer,
        ...summary,
      },
    });
  } catch (error) {
    console.error(
      "GET CUSTOMER LEDGER ERROR:",
      error
    );

    const result =
      handleValidationError(
        error,
        "Unable to load customer",
        "GET_CUSTOMER_LEDGER_ERROR"
      );

    return res.status(result.status).json({
      success: false,
      message: result.message,
      code: result.code,
    });
  }
};

/* =====================================================
   UPDATE CUSTOMER
===================================================== */

export const updateLedgerCustomer =
  async (
    req,
    res
  ) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const { id } =
        req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
          code:
            "INVALID_CUSTOMER_ID",
        });
      }

      const customer =
        await LedgerCustomer.findOne({
          _id: id,
          pumpId,
        });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found",
          code:
            "CUSTOMER_NOT_FOUND",
        });
      }

      const {
        name,
        phone,
        vehicleNumber,
        address,
        note,
      } = req.body || {};

      if (name !== undefined) {
        const value =
          String(name).trim();

        if (!value) {
          return res.status(400).json({
            success: false,
            message:
              "Customer name is required",
            code:
              "CUSTOMER_NAME_REQUIRED",
          });
        }

        if (value.length > 150) {
          return res.status(400).json({
            success: false,
            message:
              "Customer name cannot exceed 150 characters",
            code:
              "CUSTOMER_NAME_TOO_LONG",
          });
        }

        customer.name = value;
      }

      if (phone !== undefined) {
        const normalizedPhone =
          String(phone).trim();

        if (
          normalizedPhone.length > 30
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Phone number cannot exceed 30 characters",
            code:
              "CUSTOMER_PHONE_TOO_LONG",
          });
        }

        /*
         * Prevent changing a customer's phone
         * to another active customer's phone.
         */
        if (
          normalizedPhone &&
          normalizedPhone !==
            customer.phone
        ) {
          const duplicate =
            await LedgerCustomer.exists({
              _id: {
                $ne: customer._id,
              },
              pumpId,
              phone:
                normalizedPhone,
              status: "active",
            });

          if (duplicate) {
            return res.status(409).json({
              success: false,
              message:
                "Another active customer already uses this phone number.",
              code:
                "CUSTOMER_PHONE_ALREADY_EXISTS",
            });
          }
        }

        customer.phone =
          normalizedPhone;
      }

      if (
        vehicleNumber !==
        undefined
      ) {
        customer.vehicleNumber =
          String(
            vehicleNumber
          )
            .trim()
            .toUpperCase();
      }

      if (
        address !==
        undefined
      ) {
        customer.address =
          String(
            address
          ).trim();
      }

      if (note !== undefined) {
        const normalizedNote =
          normalizeNote(note);

        if (
          normalizedNote.length >
          MAX_NOTE_LENGTH
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Note cannot exceed 500 characters.",
            code:
              "NOTE_TOO_LONG",
          });
        }

        customer.note =
          normalizedNote;
      }

      await customer.save();

      return res.status(200).json({
        success: true,

        message:
          "Customer updated successfully",

        customer,
      });
    } catch (error) {
      console.error(
        "UPDATE LEDGER CUSTOMER ERROR:",
        error
      );

      const result =
        handleValidationError(
          error,
          "Unable to update customer",
          "UPDATE_LEDGER_CUSTOMER_ERROR"
        );

      return res.status(result.status).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    }
  };

/* =====================================================
   DELETE CUSTOMER
===================================================== */

export const deleteLedgerCustomer =
  async (
    req,
    res
  ) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const { id } =
        req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
          code:
            "INVALID_CUSTOMER_ID",
        });
      }

      const customer =
        await LedgerCustomer.findOne({
          _id: id,
          pumpId,
        });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found",
          code:
            "CUSTOMER_NOT_FOUND",
        });
      }

      customer.status =
        "inactive";

      await customer.save();

      return res.status(200).json({
        success: true,
        message:
          "Customer removed successfully",
      });
    } catch (error) {
      console.error(
        "DELETE CUSTOMER ERROR:",
        error
      );

      const result =
        handleValidationError(
          error,
          "Unable to remove customer",
          "DELETE_CUSTOMER_ERROR"
        );

      return res.status(result.status).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    }
  };

/* =====================================================
   ADD CUSTOMER ADVANCE
===================================================== */

export const addLedgerAdvance =
  async (
    req,
    res
  ) => {
    const session =
      await mongoose.startSession();

    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const userId =
        getAuthorizedUserId(req);

      const {
        customerId,
      } = req.params;

      const {
        amount,
        entryDate,
        note = "",
      } = req.body || {};

      if (
        !isValidObjectId(
          customerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
          code:
            "INVALID_CUSTOMER_ID",
        });
      }

      const advance =
        roundMoney(
          Number(amount)
        );

      if (
        !Number.isFinite(advance) ||
        advance <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Advance amount must be greater than 0",
          code:
            "INVALID_ADVANCE_AMOUNT",
        });
      }

      const normalizedEntryDate =
        normalizeDate(
          entryDate
        );

      if (!normalizedEntryDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid advance date. Use YYYY-MM-DD.",
          code:
            "INVALID_ENTRY_DATE",
        });
      }

      const normalizedNote =
        normalizeNote(note);

      if (
        normalizedNote.length >
        MAX_NOTE_LENGTH
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Note cannot exceed 500 characters.",
          code:
            "NOTE_TOO_LONG",
        });
      }

      let result = null;

      await session.withTransaction(
        async () => {
          const customer =
            await LedgerCustomer.findOne({
              _id: customerId,
              pumpId,
              status: "active",
            }).session(session);

          if (!customer) {
            const error =
              new Error(
                "Customer not found"
              );

            error.statusCode = 404;
            error.code =
              "CUSTOMER_NOT_FOUND";

            throw error;
          }

          /*
           * Only fields required for advance
           * calculation are loaded.
           */
          const existingEntries =
            await LedgerEntry.find({
              pumpId,
              customerId:
                customer._id,
            })
              .select(
                "entryType totalAmount paidAmount paymentAmount advanceAmount advanceAppliedAmount"
              )
              .lean()
              .session(session);

          const {
            advanceBalance:
              currentAdvanceBalance,
          } =
            calculateCustomerAdvance(
              existingEntries
            );

          const newAdvanceBalance =
            roundMoney(
              currentAdvanceBalance +
                advance
            );

          const createdEntries =
            await LedgerEntry.create(
              [
                {
                  pumpId,

                  customerId:
                    customer._id,

                  entryType:
                    "advance",

                  fuelType:
                    null,

                  totalAmount:
                    0,

                  paidAmount:
                    0,

                  pendingAmount:
                    0,

                  paymentAmount:
                    0,

                  advanceAmount:
                    advance,

                  advanceAppliedAmount:
                    0,

                  advanceBalance:
                    newAdvanceBalance,

                  entryDate:
                    normalizedEntryDate,

                  note:
                    normalizedNote,

                  createdBy:
                    userId ||
                    undefined,
                },
              ],
              {
                session,
                ordered: true,
              }
            );

          const entry =
            createdEntries[0];

          if (!entry) {
            const error =
              new Error(
                "Advance entry could not be created."
              );

            error.statusCode = 500;
            error.code =
              "ADVANCE_ENTRY_CREATE_FAILED";

            throw error;
          }

          const summary =
            await calculateCustomerSummary(
              pumpId,
              customer._id,
              session
            );

          result = {
            entry,
            customer,
            summary,
          };
        }
      );

      return res.status(201).json({
        success: true,

        message:
          "Advance added successfully",

        entry:
          result.entry,

        customer:
          result.customer,

        summary:
          result.summary,
      });
    } catch (error) {
      console.error(
        "ADD LEDGER ADVANCE ERROR:",
        {
          message:
            error?.message,
          code:
            error?.code,
          name:
            error?.name,
          statusCode:
            error?.statusCode,
        }
      );

      const result =
        handleValidationError(
          error,
          "Unable to add advance",
          "ADD_LEDGER_ADVANCE_ERROR"
        );

      return res.status(result.status).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    } finally {
      await session.endSession();
    }
  };

/* =====================================================
   ADD CUSTOMER PURCHASE
===================================================== */

export const addCustomerPurchase =
  async (
    req,
    res
  ) => {
    const session =
      await mongoose.startSession();

    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const userId =
        getAuthorizedUserId(req);

      const {
        customerId,
      } = req.params;

      const {
        fuelType,
        totalAmount,
        paidAmount = 0,
        rate,
        entryDate,
        note = "",
      } = req.body || {};

      /* ---------------------------------------------
         CUSTOMER ID
      --------------------------------------------- */

      if (
        !isValidObjectId(
          customerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
          code:
            "INVALID_CUSTOMER_ID",
        });
      }

      /* ---------------------------------------------
         FUEL
      --------------------------------------------- */

      const normalizedFuel =
        normalizeFuelType(
          fuelType
        );

      if (
        !VALID_FUEL_TYPES.has(
          normalizedFuel
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Select Petrol or Diesel",
          code:
            "INVALID_FUEL_TYPE",
        });
      }

      /* ---------------------------------------------
         AMOUNTS
      --------------------------------------------- */

      const total =
        roundMoney(
          Number(totalAmount)
        );

      const paid =
        roundMoney(
          Number(
            paidAmount ?? 0
          )
        );

      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Total amount must be greater than 0",
          code:
            "INVALID_TOTAL_AMOUNT",
        });
      }

      if (
        !Number.isFinite(paid) ||
        paid < 0 ||
        paid > total
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Paid amount must be between 0 and total amount",
          code:
            "INVALID_PAID_AMOUNT",
        });
      }

      /* ---------------------------------------------
         RATE
      --------------------------------------------- */

      let purchaseRate =
        roundMoney(
          Number(
            rate ??
              req.body?.sellingRate ??
              req.body?.pricePerLitre ??
              req.body?.pricePerLiter ??
              0
          )
        );

      /*
       * If frontend did not provide a valid rate,
       * use current pump fuel price.
       */
      if (
        !Number.isFinite(
          purchaseRate
        ) ||
        purchaseRate <= 0
      ) {
        const priceRecord =
          await FuelPrice.findOne({
            pumpId,
            fuelType:
              normalizedFuel,
          })
            .sort({
              updatedAt: -1,
            })
            .select(
              "price sellingPrice currentPrice rate"
            )
            .lean();

        purchaseRate =
          roundMoney(
            Number(
              priceRecord?.price ??
                priceRecord?.sellingPrice ??
                priceRecord?.currentPrice ??
                priceRecord?.rate ??
                0
            )
          );
      }

      if (
        !Number.isFinite(
          purchaseRate
        ) ||
        purchaseRate <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            `No valid ${normalizedFuel} fuel rate is configured for this pump. Please update the ${normalizedFuel} fuel price first.`,

          code:
            "INVALID_FUEL_RATE",
        });
      }

      /* ---------------------------------------------
         QUANTITY
      --------------------------------------------- */

      const quantity =
        Number(
          (
            total /
            purchaseRate
          ).toFixed(3)
        );

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unable to calculate purchase quantity",
          code:
            "INVALID_PURCHASE_QUANTITY",
        });
      }

      /* ---------------------------------------------
         DATE
      --------------------------------------------- */

      const normalizedEntryDate =
        normalizeDate(
          entryDate
        );

      if (!normalizedEntryDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid purchase date. Use YYYY-MM-DD.",
          code:
            "INVALID_ENTRY_DATE",
        });
      }

      /* ---------------------------------------------
         NOTE
      --------------------------------------------- */

      const normalizedNote =
        normalizeNote(note);

      if (
        normalizedNote.length >
        MAX_NOTE_LENGTH
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Note cannot exceed 500 characters.",
          code:
            "NOTE_TOO_LONG",
        });
      }

      let result = null;

      await session.withTransaction(
        async () => {
          /* -----------------------------------------
             CUSTOMER
          ----------------------------------------- */

          const customer =
            await LedgerCustomer.findOne({
              _id: customerId,
              pumpId,
              status: "active",
            }).session(session);

          if (!customer) {
            const error =
              new Error(
                "Customer not found"
              );

            error.statusCode = 404;
            error.code =
              "CUSTOMER_NOT_FOUND";

            throw error;
          }

          /* -----------------------------------------
             EXISTING ADVANCE
          ----------------------------------------- */

          const existingEntries =
            await LedgerEntry.find({
              pumpId,
              customerId:
                customer._id,
            })
              .select(
                "entryType totalAmount paidAmount paymentAmount advanceAmount advanceAppliedAmount"
              )
              .lean()
              .session(session);

          const {
            advanceBalance:
              currentAdvanceBalance,
          } =
            calculateCustomerAdvance(
              existingEntries
            );

          /* -----------------------------------------
             NORMAL PAYMENT
          ----------------------------------------- */

          const amountAfterNormalPayment =
            roundMoney(
              Math.max(
                total - paid,
                0
              )
            );

          /* -----------------------------------------
             ADVANCE USAGE
          ----------------------------------------- */

          const advanceApplied =
            roundMoney(
              Math.min(
                currentAdvanceBalance,
                amountAfterNormalPayment
              )
            );

          /* -----------------------------------------
             PENDING
          ----------------------------------------- */

          const pending =
            roundMoney(
              Math.max(
                total -
                  paid -
                  advanceApplied,
                0
              )
            );

          /* -----------------------------------------
             NEW ADVANCE BALANCE
          ----------------------------------------- */

          const newAdvanceBalance =
            roundMoney(
              Math.max(
                currentAdvanceBalance -
                  advanceApplied,
                0
              )
            );

          /* -----------------------------------------
             CREATE PURCHASE
          ----------------------------------------- */

          const createdEntries =
            await LedgerEntry.create(
              [
                {
                  pumpId,

                  customerId:
                    customer._id,

                  entryType:
                    "purchase",

                  fuelType:
                    normalizedFuel,

                  totalAmount:
                    total,

                  rate:
                    purchaseRate,

                  paidAmount:
                    paid,

                  pendingAmount:
                    pending,

                  paymentAmount:
                    0,

                  advanceAmount:
                    0,

                  advanceAppliedAmount:
                    advanceApplied,

                  advanceBalance:
                    newAdvanceBalance,

                  entryDate:
                    normalizedEntryDate,

                  note:
                    normalizedNote,

                  createdBy:
                    userId ||
                    undefined,
                },
              ],
              {
                session,
                ordered: true,
              }
            );

          const entry =
            createdEntries[0];

          if (!entry) {
            const error =
              new Error(
                "Purchase entry could not be created."
              );

            error.statusCode = 500;
            error.code =
              "PURCHASE_ENTRY_CREATE_FAILED";

            throw error;
          }

          /* -----------------------------------------
             CUSTOMER PENDING BALANCE
          ----------------------------------------- */

          const currentBalance =
            roundMoney(
              Number(
                customer.currentBalance ||
                  0
              )
            );

          customer.currentBalance =
            roundMoney(
              Math.max(
                currentBalance +
                  pending,
                0
              )
            );

          await customer.save({
            session,
          });

          /* -----------------------------------------
             SUMMARY
          ----------------------------------------- */

          const summary =
            await calculateCustomerSummary(
              pumpId,
              customer._id,
              session
            );

          result = {
            entry,
            customer,
            summary,
          };
        }
      );

      return res.status(201).json({
        success: true,

        message:
          "Purchase added successfully",

        entry:
          result.entry,

        customer:
          result.customer,

        summary:
          result.summary,
      });
    } catch (error) {
      console.error(
        "ADD CUSTOMER PURCHASE ERROR:",
        {
          message:
            error?.message,

          code:
            error?.code,

          name:
            error?.name,

          statusCode:
            error?.statusCode,

          customerId:
            req.params?.customerId,
        }
      );

      const result =
        handleValidationError(
          error,
          "Unable to add purchase",
          "ADD_CUSTOMER_PURCHASE_ERROR"
        );

      return res.status(result.status).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    } finally {
      await session.endSession();
    }
  };

/* =====================================================
   ADD PAYMENT
===================================================== */

export const addLedgerPayment =
  async (
    req,
    res
  ) => {
    const session =
      await mongoose.startSession();

    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const userId =
        getAuthorizedUserId(req);

      const {
        customerId,
        amount,
        entryDate,
        note = "",
      } = req.body || {};

      /* ---------------------------------------------
         CUSTOMER
      --------------------------------------------- */

      if (
        !isValidObjectId(
          customerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
          code:
            "INVALID_CUSTOMER_ID",
        });
      }

      /* ---------------------------------------------
         PAYMENT
      --------------------------------------------- */

      const payment =
        roundMoney(
          Number(amount)
        );

      if (
        !Number.isFinite(payment) ||
        payment <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount must be greater than 0",
          code:
            "INVALID_PAYMENT_AMOUNT",
        });
      }

      /* ---------------------------------------------
         DATE
      --------------------------------------------- */

      const normalizedEntryDate =
        normalizeDate(
          entryDate
        );

      if (!normalizedEntryDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment date. Use YYYY-MM-DD.",
          code:
            "INVALID_ENTRY_DATE",
        });
      }

      /* ---------------------------------------------
         NOTE
      --------------------------------------------- */

      const normalizedNote =
        normalizeNote(note);

      if (
        normalizedNote.length >
        MAX_NOTE_LENGTH
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Note cannot exceed 500 characters.",
          code:
            "NOTE_TOO_LONG",
        });
      }

      let result = null;

      await session.withTransaction(
        async () => {
          const customer =
            await LedgerCustomer.findOne({
              _id: customerId,
              pumpId,
              status: "active",
            }).session(session);

          if (!customer) {
            const error =
              new Error(
                "Customer not found"
              );

            error.statusCode = 404;
            error.code =
              "CUSTOMER_NOT_FOUND";

            throw error;
          }

          const currentBalance =
            roundMoney(
              Number(
                customer.currentBalance ||
                  0
              )
            );

          if (
            payment >
            currentBalance
          ) {
            const error =
              new Error(
                `Payment cannot exceed pending amount ₹${currentBalance.toFixed(
                  2
                )}`
              );

            error.statusCode = 400;
            error.code =
              "PAYMENT_EXCEEDS_PENDING";

            throw error;
          }

          /* -----------------------------------------
             CREATE PAYMENT
          ----------------------------------------- */

          const createdEntries =
            await LedgerEntry.create(
              [
                {
                  pumpId,

                  customerId:
                    customer._id,

                  entryType:
                    "payment",

                  fuelType:
                    null,

                  totalAmount:
                    0,

                  paidAmount:
                    0,

                  pendingAmount:
                    0,

                  paymentAmount:
                    payment,

                  advanceAmount:
                    0,

                  advanceAppliedAmount:
                    0,

                  advanceBalance:
                    0,

                  entryDate:
                    normalizedEntryDate,

                  note:
                    normalizedNote,

                  createdBy:
                    userId ||
                    undefined,
                },
              ],
              {
                session,
                ordered: true,
              }
            );

          const entry =
            createdEntries[0];

          if (!entry) {
            const error =
              new Error(
                "Payment entry could not be created."
              );

            error.statusCode = 500;
            error.code =
              "PAYMENT_ENTRY_CREATE_FAILED";

            throw error;
          }

          /* -----------------------------------------
             UPDATE CUSTOMER BALANCE
          ----------------------------------------- */

          customer.currentBalance =
            roundMoney(
              Math.max(
                currentBalance -
                  payment,
                0
              )
            );

          await customer.save({
            session,
          });

          /* -----------------------------------------
             SUMMARY
          ----------------------------------------- */

          const summary =
            await calculateCustomerSummary(
              pumpId,
              customer._id,
              session
            );

          result = {
            entry,
            customer,
            summary,
          };
        }
      );

      return res.status(201).json({
        success: true,

        message:
          "Payment added successfully",

        entry:
          result.entry,

        customer:
          result.customer,

        summary:
          result.summary,
      });
    } catch (error) {
      console.error(
        "ADD LEDGER PAYMENT ERROR:",
        {
          message:
            error?.message,

          code:
            error?.code,

          name:
            error?.name,

          statusCode:
            error?.statusCode,

          customerId:
            req.body?.customerId,
        }
      );

      const result =
        handleValidationError(
          error,
          "Unable to add payment",
          "ADD_LEDGER_PAYMENT_ERROR"
        );

      return res.status(result.status).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    } finally {
      await session.endSession();
    }
  };

/* =====================================================
   CUSTOMER FULL HISTORY
===================================================== */

export const getCustomerLedgerHistory =
  async (
    req,
    res
  ) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const {
        customerId,
      } = req.params;

      if (
        !isValidObjectId(
          customerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
          code:
            "INVALID_CUSTOMER_ID",
        });
      }

      /*
       * Customer and history can be fetched
       * concurrently because neither depends
       * on the other.
       */
      const [
        customer,
        entries,
      ] = await Promise.all([
        LedgerCustomer.findOne({
          _id:
            customerId,
          pumpId,
        }).lean(),

        LedgerEntry.find({
          pumpId,
          customerId,
        })
          .sort({
            entryDate: 1,
            createdAt: 1,
          })
          .lean(),
      ]);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found",
          code:
            "CUSTOMER_NOT_FOUND",
        });
      }

      const summary =
        await calculateCustomerSummary(
          pumpId,
          customerId
        );

      return res.status(200).json({
        success: true,

        customer,

        entries,

        summary,
      });
    } catch (error) {
      console.error(
        "GET CUSTOMER LEDGER HISTORY ERROR:",
        error
      );

      const result =
        handleValidationError(
          error,
          "Unable to load customer ledger history",
          "GET_CUSTOMER_LEDGER_HISTORY_ERROR"
        );

      return res.status(result.status).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    }
  };

/* =====================================================
   PENDING CREDIT
===================================================== */

export const getPendingCredit =
  async (
    req,
    res
  ) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const customers =
        await LedgerCustomer.find({
          pumpId,

          status:
            "active",

          currentBalance: {
            $gt: 0,
          },
        })
          .sort({
            currentBalance: -1,
          })
          .lean();

      let totalPending = 0;

      for (const customer of customers) {
        totalPending +=
          Number(
            customer.currentBalance ||
              0
          );
      }

      return res.status(200).json({
        success: true,

        count:
          customers.length,

        totalPending:
          roundMoney(
            totalPending
          ),

        customers,
      });
    } catch (error) {
      console.error(
        "GET PENDING CREDIT ERROR:",
        error
      );

      const result =
        handleValidationError(
          error,
          "Unable to load pending credit",
          "GET_PENDING_CREDIT_ERROR"
        );

      return res.status(result.status).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    }
  };

/* =====================================================
   TODAY CREDIT SALES
===================================================== */

export const getTodayCreditSales =
  async (
    req,
    res
  ) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const requestedDate =
        req.query?.date;

      const date =
        requestedDate
          ? normalizeDate(
              requestedDate
            )
          : todayString();

      if (!date) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid date. Use YYYY-MM-DD.",
          code:
            "INVALID_DATE",
        });
      }

      /*
       * This endpoint only needs:
       * - count
       * - totalCreditSales
       * - entries
       *
       * Use one query and lean documents.
       */
      const entries =
        await LedgerEntry.find({
          pumpId,

          entryType:
            "purchase",

          entryDate:
            date,
        })
          .sort({
            createdAt: 1,
          })
          .lean();

      let totalCreditSales = 0;

      for (const entry of entries) {
        totalCreditSales +=
          Number(
            entry.totalAmount ||
              0
          );
      }

      return res.status(200).json({
        success: true,

        date,

        count:
          entries.length,

        totalCreditSales:
          roundMoney(
            totalCreditSales
          ),

        entries,
      });
    } catch (error) {
      console.error(
        "TODAY CREDIT SALES ERROR:",
        error
      );

      const result =
        handleValidationError(
          error,
          "Unable to load today's credit sales",
          "TODAY_CREDIT_SALES_ERROR"
        );

      return res.status(result.status).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    }
  };