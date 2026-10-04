import mongoose from "mongoose";

import LedgerCustomer from "../models/LedgerCustomer.js";
import LedgerEntry from "../models/LedgerEntry.js";
import FuelPrice from "../models/FuelPrice.js";

/* =====================================================
   HELPERS
===================================================== */

const todayString = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const normalizeDate = (value) => {
  const date = String(value || "").trim();

  if (!date) {
    return todayString();
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
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

const getAuthorizedUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.userId ||
    null
  );
};

/* =====================================================
   CALCULATE CUSTOMER ADVANCE
===================================================== */

const calculateCustomerAdvance = (
  entries = []
) => {
  const advanceEntries = entries.filter(
    (entry) =>
      entry.entryType === "advance"
  );

  const purchases = entries.filter(
    (entry) =>
      entry.entryType === "purchase"
  );

  const totalAdvanceReceived =
    roundMoney(
      advanceEntries.reduce(
        (total, entry) =>
          total +
          Number(
            entry.advanceAmount ||
              entry.paymentAmount ||
              entry.totalAmount ||
              0
          ),
        0
      )
    );

  const totalAdvanceApplied =
    roundMoney(
      purchases.reduce(
        (total, entry) =>
          total +
          Number(
            entry.advanceAppliedAmount ||
              0
          ),
        0
      )
    );

  const calculatedBalance =
    roundMoney(
      Math.max(
        totalAdvanceReceived -
          totalAdvanceApplied,
        0
      )
    );

  return {
    totalAdvanceReceived,
    totalAdvanceApplied,
    advanceBalance:
      calculatedBalance,
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
  });

  if (session) {
    query = query.session(session);
  }

  const entries = await query;

  const purchases = entries.filter(
    (entry) =>
      entry.entryType === "purchase"
  );

  const payments = entries.filter(
    (entry) =>
      entry.entryType === "payment"
  );

  const advances = entries.filter(
    (entry) =>
      entry.entryType === "advance"
  );

  const totalPurchased =
    roundMoney(
      purchases.reduce(
        (total, entry) =>
          total +
          Number(
            entry.totalAmount || 0
          ),
        0
      )
    );

  /*
   * paidAmount represents normal payment
   * made at the time of purchase.
   */
  const purchasePaid =
    roundMoney(
      purchases.reduce(
        (total, entry) =>
          total +
          Number(
            entry.paidAmount || 0
          ),
        0
      )
    );

  const paymentReceived =
    roundMoney(
      payments.reduce(
        (total, entry) =>
          total +
          Number(
            entry.paymentAmount || 0
          ),
        0
      )
    );

  const advanceData =
    calculateCustomerAdvance(
      entries
    );

  /*
   * Total money received by the pump,
   * including advance payments already
   * applied to purchases.
   */
  const totalPaid =
    roundMoney(
      purchasePaid +
        paymentReceived +
        advanceData.totalAdvanceApplied
    );

  /*
   * Pending is calculated from purchase
   * amount minus normal paid amount and
   * advance applied to purchases.
   */
  const totalPending =
    roundMoney(
      Math.max(
        purchases.reduce(
          (total, entry) =>
            total +
            Math.max(
              Number(
                entry.totalAmount || 0
              ) -
                Number(
                  entry.paidAmount || 0
                ) -
                Number(
                  entry.advanceAppliedAmount ||
                    0
                ),
              0
            ),
          0
        ) -
          paymentReceived,
        0
      )
    );

  return {
    totalPurchased,

    totalPaid,

    totalPending,

    purchaseCount:
      purchases.length,

    paymentCount:
      payments.length,

    advanceCount:
      advances.length,

    totalAdvanceReceived:
      advanceData.totalAdvanceReceived,

    totalAdvanceApplied:
      advanceData.totalAdvanceApplied,

    advanceBalance:
      advanceData.advanceBalance,
  };
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

    let existingCustomer = null;

    if (normalizedPhone) {
      existingCustomer =
        await LedgerCustomer.findOne({
          pumpId,
          phone: normalizedPhone,
          status: "active",
        });
    }

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message:
          "Customer already exists. Open the existing ledger and add a new purchase.",
        customer:
          existingCustomer,
        code:
          "CUSTOMER_ALREADY_EXISTS",
      });
    }

    const customer =
      await LedgerCustomer.create({
        pumpId,

        name:
          normalizedName,

        phone:
          normalizedPhone,

        vehicleNumber:
          String(
            vehicleNumber || ""
          )
            .trim()
            .toUpperCase(),

        address:
          String(
            address || ""
          ).trim(),

        note:
          String(
            note || ""
          ).trim(),

        currentBalance:
          0,

        status:
          "active",
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

    return res.status(
      error?.statusCode || 500
    ).json({
      success: false,

      message:
        error?.message ||
        "Unable to add customer",

      code:
        error?.code ||
        "ADD_LEDGER_CUSTOMER_ERROR",
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

    const customers =
      await LedgerCustomer.find({
        pumpId,
        status: "active",
      }).sort({
        createdAt: -1,
      });

    const customersWithSummary =
      await Promise.all(
        customers.map(
          async (customer) => {
            const summary =
              await calculateCustomerSummary(
                pumpId,
                customer._id
              );

            return {
              ...customer.toObject(),
              ...summary,
            };
          }
        )
      );

    const totalPurchased =
      roundMoney(
        customersWithSummary.reduce(
          (
            total,
            customer
          ) =>
            total +
            Number(
              customer.totalPurchased ||
                0
            ),
          0
        )
      );

    const totalPaid =
      roundMoney(
        customersWithSummary.reduce(
          (
            total,
            customer
          ) =>
            total +
            Number(
              customer.totalPaid ||
                0
            ),
          0
        )
      );

    const totalPending =
      roundMoney(
        customersWithSummary.reduce(
          (
            total,
            customer
          ) =>
            total +
            Number(
              customer.totalPending ||
                0
            ),
          0
        )
      );

    const totalAdvanceReceived =
      roundMoney(
        customersWithSummary.reduce(
          (
            total,
            customer
          ) =>
            total +
            Number(
              customer.totalAdvanceReceived ||
                0
            ),
          0
        )
      );

    const totalAdvanceApplied =
      roundMoney(
        customersWithSummary.reduce(
          (
            total,
            customer
          ) =>
            total +
            Number(
              customer.totalAdvanceApplied ||
                0
            ),
          0
        )
      );

    const totalAdvanceBalance =
      roundMoney(
        customersWithSummary.reduce(
          (
            total,
            customer
          ) =>
            total +
            Number(
              customer.advanceBalance ||
                0
            ),
          0
        )
      );

    return res.status(200).json({
      success: true,

      count:
        customersWithSummary.length,

      customers:
        customersWithSummary,

      totalPurchased,

      totalPaid,

      totalPending,

      totalAdvanceReceived,

      totalAdvanceApplied,

      totalAdvanceBalance,
    });
  } catch (error) {
    console.error(
      "GET LEDGER CUSTOMERS ERROR:",
      error
    );

    return res.status(
      error?.statusCode || 500
    ).json({
      success: false,

      message:
        error?.message ||
        "Unable to load ledger customers",

      code:
        error?.code ||
        "GET_LEDGER_CUSTOMERS_ERROR",
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

    if (
      !mongoose.Types.ObjectId.isValid(
        id
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

    const summary =
      await calculateCustomerSummary(
        pumpId,
        customer._id
      );

    return res.status(200).json({
      success: true,

      customer: {
        ...customer.toObject(),
        ...summary,
      },
    });
  } catch (error) {
    console.error(
      "GET CUSTOMER LEDGER ERROR:",
      error
    );

    return res.status(
      error?.statusCode || 500
    ).json({
      success: false,

      message:
        error?.message ||
        "Unable to load customer",

      code:
        error?.code ||
        "GET_CUSTOMER_LEDGER_ERROR",
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

      if (
        !mongoose.Types.ObjectId.isValid(
          id
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

      if (
        name !== undefined
      ) {
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

        customer.name =
          value;
      }

      if (
        phone !== undefined
      ) {
        customer.phone =
          String(
            phone
          ).trim();
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

      if (
        note !== undefined
      ) {
        customer.note =
          String(
            note
          ).trim();
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

      return res.status(
        error?.statusCode || 500
      ).json({
        success: false,

        message:
          error?.message ||
          "Unable to update customer",

        code:
          error?.code ||
          "UPDATE_LEDGER_CUSTOMER_ERROR",
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

      if (
        !mongoose.Types.ObjectId.isValid(
          id
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

      return res.status(
        error?.statusCode || 500
      ).json({
        success: false,

        message:
          error?.message ||
          "Unable to remove customer",

        code:
          error?.code ||
          "DELETE_CUSTOMER_ERROR",
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
        !mongoose.Types.ObjectId.isValid(
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
        String(
          note || ""
        ).trim();

      if (
        normalizedNote.length >
        500
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

          const existingEntries =
            await LedgerEntry.find({
              pumpId,
              customerId:
                customer._id,
            }).session(session);

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
        error
      );

      const status =
        Number.isInteger(
          error?.statusCode
        )
          ? error.statusCode
          : error?.name ===
              "ValidationError"
            ? 400
            : error?.name ===
                "CastError"
              ? 400
              : error?.code ===
                  11000
                ? 409
                : 500;

      return res.status(status).json({
        success: false,

        message:
          error?.name ===
          "ValidationError"
            ? "Advance data is invalid."
            : error?.code ===
                11000
              ? "This advance could not be added because a duplicate record was detected."
              : error?.message ||
                "Unable to add advance",

        code:
          error?.code ||
          "ADD_LEDGER_ADVANCE_ERROR",
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

      // ------------------------------------------------
      // CUSTOMER
      // ------------------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
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

      // ------------------------------------------------
      // FUEL
      // ------------------------------------------------

      const normalizedFuel =
        String(
          fuelType || ""
        )
          .trim()
          .toLowerCase();

      if (
        ![
          "petrol",
          "diesel",
        ].includes(
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

      // ------------------------------------------------
      // AMOUNTS
      // ------------------------------------------------

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

      // ------------------------------------------------
      // FUEL RATE
      // ------------------------------------------------
      //
      // The frontend may send the rate.
      //
      // If no valid rate is supplied, automatically
      // fetch the current rate configured for this
      // pump and fuel type.
      //

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

      // ------------------------------------------------
      // GET CURRENT FUEL RATE
      // ------------------------------------------------

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
          }).sort({
            updatedAt: -1,
          });

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

      // ------------------------------------------------
      // VALIDATE FUEL RATE
      // ------------------------------------------------

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

      // ------------------------------------------------
      // CALCULATE QUANTITY
      //
      // Quantity = Purchase Amount / Fuel Rate
      // ------------------------------------------------

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

      // ------------------------------------------------
      // DATE
      // ------------------------------------------------

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

      // ------------------------------------------------
      // NOTE
      // ------------------------------------------------

      const normalizedNote =
        String(
          note || ""
        ).trim();

      if (
        normalizedNote.length >
        500
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
          // --------------------------------------------
          // CUSTOMER
          // --------------------------------------------

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

          // --------------------------------------------
          // GET EXISTING ADVANCE
          // --------------------------------------------

          const existingEntries =
            await LedgerEntry.find({
              pumpId,
              customerId:
                customer._id,
            })
              .sort({
                entryDate: 1,
                createdAt: 1,
              })
              .session(session);

          const {
            advanceBalance:
              currentAdvanceBalance,
          } =
            calculateCustomerAdvance(
              existingEntries
            );

          // --------------------------------------------
          // CALCULATE ADVANCE USAGE
          // --------------------------------------------

          /*
           * Only the unpaid portion of the purchase
           * can consume advance.
           */
          const amountAfterNormalPayment =
            roundMoney(
              Math.max(
                total - paid,
                0
              )
            );

          const advanceApplied =
            roundMoney(
              Math.min(
                currentAdvanceBalance,
                amountAfterNormalPayment
              )
            );

          const pending =
            roundMoney(
              Math.max(
                total -
                  paid -
                  advanceApplied,
                0
              )
            );

          const newAdvanceBalance =
            roundMoney(
              Math.max(
                currentAdvanceBalance -
                  advanceApplied,
                0
              )
            );

          // --------------------------------------------
          // CREATE PURCHASE
          // --------------------------------------------

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

                  /*
                   * Purchase amount.
                   */
                  totalAmount:
                    total,

                  /*
                   * Fuel rate used for this
                   * purchase.
                   */
                  rate:
                    purchaseRate,

                  /*
                   * paidAmount remains the amount
                   * directly paid for this purchase.
                   *
                   * Advance is tracked separately.
                   */
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

          // --------------------------------------------
          // UPDATE PENDING CUSTOMER BALANCE
          // --------------------------------------------

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

          // --------------------------------------------
          // SUMMARY
          // --------------------------------------------

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

          pumpId:
            req.user?.pumpId,
        }
      );

      const status =
        Number.isInteger(
          error?.statusCode
        )
          ? error.statusCode
          : error?.name ===
              "ValidationError"
            ? 400
            : error?.name ===
                "CastError"
              ? 400
              : error?.code ===
                  11000
                ? 409
                : 500;

      return res.status(status).json({
        success: false,

        message:
          error?.name ===
          "ValidationError"
            ? "Purchase data is invalid."
            : error?.code ===
                11000
              ? "This purchase could not be added because a duplicate record was detected."
              : error?.message ||
                "Unable to add purchase",

        code:
          error?.code ||
          "ADD_CUSTOMER_PURCHASE_ERROR",
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

      if (
        !mongoose.Types.ObjectId.isValid(
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

      const normalizedNote =
        String(
          note || ""
        ).trim();

      if (
        normalizedNote.length >
        500
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
        error
      );

      const status =
        Number.isInteger(
          error?.statusCode
        )
          ? error.statusCode
          : error?.name ===
              "ValidationError"
            ? 400
            : error?.name ===
                "CastError"
              ? 400
              : error?.code ===
                  11000
                ? 409
                : 500;

      return res.status(status).json({
        success: false,

        message:
          error?.name ===
          "ValidationError"
            ? "Payment data is invalid."
            : error?.code ===
                11000
              ? "This payment could not be added because a duplicate record was detected."
              : error?.message ||
                "Unable to add payment",

        code:
          error?.code ||
          "ADD_LEDGER_PAYMENT_ERROR",
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
        !mongoose.Types.ObjectId.isValid(
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

      const customer =
        await LedgerCustomer.findOne({
          _id:
            customerId,

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

      const entries =
        await LedgerEntry.find({
          pumpId,

          customerId:
            customer._id,
        }).sort({
          entryDate: 1,
          createdAt: 1,
        });

      const summary =
        await calculateCustomerSummary(
          pumpId,
          customer._id
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

      return res.status(
        error?.statusCode || 500
      ).json({
        success: false,

        message:
          error?.message ||
          "Unable to load customer ledger history",

        code:
          error?.code ||
          "GET_CUSTOMER_LEDGER_HISTORY_ERROR",
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
        }).sort({
          currentBalance: -1,
        });

      const totalPending =
        roundMoney(
          customers.reduce(
            (
              total,
              customer
            ) =>
              total +
              Number(
                customer.currentBalance ||
                  0
              ),
            0
          )
        );

      return res.status(200).json({
        success: true,

        count:
          customers.length,

        totalPending,

        customers,
      });
    } catch (error) {
      console.error(
        "GET PENDING CREDIT ERROR:",
        error
      );

      return res.status(
        error?.statusCode || 500
      ).json({
        success: false,

        message:
          error?.message ||
          "Unable to load pending credit",

        code:
          error?.code ||
          "GET_PENDING_CREDIT_ERROR",
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

      const entries =
        await LedgerEntry.find({
          pumpId,

          entryType:
            "purchase",

          entryDate:
            date,
        });

      const totalCreditSales =
        roundMoney(
          entries.reduce(
            (
              total,
              entry
            ) =>
              total +
              Number(
                entry.totalAmount ||
                  0
              ),
            0
          )
        );

      return res.status(200).json({
        success: true,

        date,

        count:
          entries.length,

        totalCreditSales,

        entries,
      });
    } catch (error) {
      console.error(
        "TODAY CREDIT SALES ERROR:",
        error
      );

      return res.status(
        error?.statusCode || 500
      ).json({
        success: false,

        message:
          error?.message ||
          "Unable to load today's credit sales",

        code:
          error?.code ||
          "TODAY_CREDIT_SALES_ERROR",
      });
    }
  };