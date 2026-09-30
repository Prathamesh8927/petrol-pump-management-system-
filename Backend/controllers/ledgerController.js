import mongoose from "mongoose";

import LedgerCustomer from "../models/LedgerCustomer.js";
import LedgerEntry from "../models/LedgerEntry.js";

import {
  createDeletedRecord,
} from "../services/recoveryService.js";

/* =====================================================
   CONSTANTS
===================================================== */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const BUSINESS_TIMEZONE =
  process.env.BUSINESS_TIMEZONE ||
  "Asia/Kolkata";

/* =====================================================
   DATE HELPERS
===================================================== */

const isValidDateString = (value) => {
  if (
    typeof value !== "string" ||
    !DATE_REGEX.test(value)
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = value.split("-").map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const formatBusinessDate = (date) => {
  try {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          BUSINESS_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(date);
  } catch (error) {
    console.error(
      "BUSINESS DATE FORMAT ERROR:",
      error.message
    );

    return "";
  }
};

const todayString = () =>
  formatBusinessDate(
    new Date()
  );

/* =====================================================
   OBJECT ID HELPERS
===================================================== */

const isValidObjectId = (
  value
) =>
  mongoose.Types.ObjectId.isValid(
    value
  );

const normalizeObjectId = (
  value
) => {
  if (
    !isValidObjectId(value)
  ) {
    return null;
  }

  return new mongoose.Types.ObjectId(
    value
  );
};

/* =====================================================
   GET AUTHENTICATED USER ID
===================================================== */

const getAuthenticatedUserId = (
  req
) => {
  const userId =
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null;

  return isValidObjectId(
    userId
  )
    ? userId
    : null;
};

/* =====================================================
   GET AUTHORIZED PUMP ID
===================================================== */

const getAuthorizedPumpId = (
  req
) => {
  const pumpId =
    req.user?.pumpId?._id ||
    req.user?.pumpId ||
    req.user?.pumpID ||
    req.user?.pump?.pumpId ||
    null;

  return isValidObjectId(
    pumpId
  )
    ? pumpId
    : null;
};

/* =====================================================
   VALIDATE ENTRY DATE
===================================================== */

const getEntryDate = (
  value
) => {
  const date =
    value === undefined ||
    value === null ||
    String(value).trim() === ""
      ? todayString()
      : String(value).trim();

  if (
    !isValidDateString(date)
  ) {
    const error = new Error(
      "Entry date must be in YYYY-MM-DD format"
    );

    error.statusCode = 400;

    throw error;
  }

  return date;
};

/* =====================================================
   CALCULATE CUSTOMER SUMMARY
===================================================== */

const calculateCustomerSummary =
  async (
    pumpId,
    customerId
  ) => {
    const entries =
      await LedgerEntry.find(
        {
          pumpId,
          customerId,
        },
        {
          entryType: 1,
          totalAmount: 1,
          paidAmount: 1,
          paymentAmount: 1,
        }
      )
        .lean();

    const purchases =
      entries.filter(
        (entry) =>
          entry.entryType ===
          "purchase"
      );

    const payments =
      entries.filter(
        (entry) =>
          entry.entryType ===
          "payment"
      );

    const totalPurchased =
      purchases.reduce(
        (
          total,
          entry
        ) =>
          total +
          Number(
            entry.totalAmount || 0
          ),
        0
      );

    const purchasePaid =
      purchases.reduce(
        (
          total,
          entry
        ) =>
          total +
          Number(
            entry.paidAmount || 0
          ),
        0
      );

    const paymentReceived =
      payments.reduce(
        (
          total,
          entry
        ) =>
          total +
          Number(
            entry.paymentAmount || 0
          ),
        0
      );

    const totalPaid =
      purchasePaid +
      paymentReceived;

    const totalPending =
      Math.max(
        totalPurchased -
          totalPaid,
        0
      );

    return {
      totalPurchased,
      totalPaid,
      totalPending,

      purchaseCount:
        purchases.length,

      paymentCount:
        payments.length,
    };
  };

/* =====================================================
   CALCULATE ALL CUSTOMER SUMMARIES
===================================================== */

const calculateAllCustomerSummaries =
  async (
    pumpId,
    customerIds
  ) => {
    if (
      !Array.isArray(
        customerIds
      ) ||
      customerIds.length === 0
    ) {
      return new Map();
    }

    const normalizedPumpId =
      normalizeObjectId(
        pumpId
      );

    if (!normalizedPumpId) {
      return new Map();
    }

    const validCustomerIds =
      customerIds.filter(
        (customerId) =>
          isValidObjectId(
            customerId
          )
      );

    if (
      validCustomerIds.length === 0
    ) {
      return new Map();
    }

    const summaries =
      await LedgerEntry.aggregate(
        [
          {
            $match: {
              pumpId:
                normalizedPumpId,

              customerId: {
                $in:
                  validCustomerIds,
              },
            },
          },

          {
            $group: {
              _id: {
                customerId:
                  "$customerId",

                entryType:
                  "$entryType",
              },

              totalAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$entryType",
                        "purchase",
                      ],
                    },
                    {
                      $ifNull: [
                        "$totalAmount",
                        0,
                      ],
                    },
                    0,
                  ],
                },
              },

              paidAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$entryType",
                        "purchase",
                      ],
                    },
                    {
                      $ifNull: [
                        "$paidAmount",
                        0,
                      ],
                    },
                    0,
                  ],
                },
              },

              paymentAmount: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$entryType",
                        "payment",
                      ],
                    },
                    {
                      $ifNull: [
                        "$paymentAmount",
                        0,
                      ],
                    },
                    0,
                  ],
                },
              },

              count: {
                $sum: 1,
              },
            },
          },
        ]
      );

    const summaryMap =
      new Map();

    validCustomerIds.forEach(
      (customerId) => {
        summaryMap.set(
          customerId.toString(),
          {
            totalPurchased: 0,
            totalPaid: 0,
            totalPending: 0,
            purchaseCount: 0,
            paymentCount: 0,
          }
        );
      }
    );

    summaries.forEach(
      (item) => {
        const customerId =
          item._id.customerId.toString();

        const current =
          summaryMap.get(
            customerId
          ) || {
            totalPurchased: 0,
            totalPaid: 0,
            totalPending: 0,
            purchaseCount: 0,
            paymentCount: 0,
          };

        if (
          item._id.entryType ===
          "purchase"
        ) {
          current.totalPurchased +=
            Number(
              item.totalAmount || 0
            );

          current.totalPaid +=
            Number(
              item.paidAmount || 0
            );

          current.purchaseCount +=
            Number(
              item.count || 0
            );
        }

        if (
          item._id.entryType ===
          "payment"
        ) {
          current.totalPaid +=
            Number(
              item.paymentAmount || 0
            );

          current.paymentCount +=
            Number(
              item.count || 0
            );
        }

        current.totalPending =
          Math.max(
            current.totalPurchased -
              current.totalPaid,
            0
          );

        summaryMap.set(
          customerId,
          current
        );
      }
    );

    return summaryMap;
  };

/* =====================================================
   ADD CUSTOMER
===================================================== */

export const addLedgerCustomer =
  async (req, res) => {
    try {
      const {
        name,
        phone = "",
        vehicleNumber = "",
        address = "",
        note = "",
      } = req.body || {};

      const pumpId =
        getAuthorizedPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump ID is required.",
        });
      }

      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Customer name is required",
        });
      }

      const normalizedPhone =
        String(
          phone || ""
        ).trim();

      if (normalizedPhone) {
        const existingCustomer =
          await LedgerCustomer.findOne(
            {
              pumpId,
              phone:
                normalizedPhone,
              status:
                "active",
            }
          ).lean();

        if (existingCustomer) {
          return res.status(409).json({
            success: false,

            message:
              "Customer already exists. Open the existing ledger and add a new purchase.",

            customer:
              existingCustomer,
          });
        }
      }

      try {
        const customer =
          await LedgerCustomer.create(
            {
              pumpId,

              name:
                name.trim(),

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

              currentBalance: 0,

              status:
                "active",
            }
          );

        return res.status(201).json({
          success: true,

          message:
            "Customer added successfully",

          customer,
        });
      } catch (error) {
        if (
          error?.code === 11000
        ) {
          return res.status(409).json({
            success: false,

            message:
              "Customer with this phone number already exists.",
          });
        }

        throw error;
      }
    } catch (error) {
      console.error(
        "ADD LEDGER CUSTOMER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to add customer",
      });
    }
  };

/* =====================================================
   GET ALL CUSTOMERS
===================================================== */

export const getLedgerCustomers =
  async (req, res) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump ID is required.",
        });
      }

      const customers =
        await LedgerCustomer.find({
          pumpId,
          status: "active",
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      const customerIds =
        customers.map(
          (customer) =>
            customer._id
        );

      const summaryMap =
        await calculateAllCustomerSummaries(
          pumpId,
          customerIds
        );

      const customersWithSummary =
        customers.map(
          (customer) => {
            const summary =
              summaryMap.get(
                customer._id.toString()
              ) || {
                totalPurchased: 0,
                totalPaid: 0,
                totalPending: 0,
                purchaseCount: 0,
                paymentCount: 0,
              };

            return {
              ...customer,
              ...summary,
            };
          }
        );

      const totalPurchased =
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
        );

      const totalPaid =
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
        );

      const totalPending =
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
      });
    } catch (error) {
      console.error(
        "GET LEDGER CUSTOMERS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load ledger customers",
      });
    }
  };

/* =====================================================
   GET ONE CUSTOMER
===================================================== */

export const getCustomerLedger =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const pumpId =
        getAuthorizedPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump ID is required.",
        });
      }

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
        });
      }

      const customer =
        await LedgerCustomer.findOne(
          {
            _id: id,
            pumpId,
          }
        );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found",
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

      return res.status(500).json({
        success: false,

        message:
          "Unable to load customer",
      });
    }
  };

/* =====================================================
   UPDATE CUSTOMER
===================================================== */

export const updateLedgerCustomer =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const pumpId =
        getAuthorizedPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump ID is required.",
        });
      }

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
        });
      }

      const customer =
        await LedgerCustomer.findOne(
          {
            _id: id,
            pumpId,
          }
        );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found",
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
        const normalizedName =
          String(name).trim();

        if (!normalizedName) {
          return res.status(400).json({
            success: false,
            message:
              "Customer name is required",
          });
        }

        customer.name =
          normalizedName;
      }

      if (
        phone !== undefined
      ) {
        const normalizedPhone =
          String(
            phone || ""
          ).trim();

        if (
          normalizedPhone &&
          normalizedPhone !==
            customer.phone
        ) {
          const duplicate =
            await LedgerCustomer.findOne(
              {
                _id: {
                  $ne: customer._id,
                },

                pumpId,

                phone:
                  normalizedPhone,

                status:
                  "active",
              }
            ).lean();

          if (duplicate) {
            return res.status(409).json({
              success: false,
              message:
                "Another active customer already uses this phone number.",
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
            vehicleNumber || ""
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
            address || ""
          ).trim();
      }

      if (
        note !== undefined
      ) {
        customer.note =
          String(
            note || ""
          ).trim();
      }

      try {
        await customer.save();
      } catch (error) {
        if (
          error?.code === 11000
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Another customer already uses this phone number.",
          });
        }

        throw error;
      }

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

      return res.status(500).json({
        success: false,

        message:
          "Unable to update customer",
      });
    }
  };

/* =====================================================
   DELETE CUSTOMER
===================================================== */

export const deleteLedgerCustomer =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const { id } =
        req.params;

      const pumpId =
        getAuthorizedPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,

          message:
            "Pump ID is required.",
        });
      }

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid customer ID",
        });
      }

      const deletedBy =
        getAuthenticatedUserId(req);

      if (!deletedBy) {
        return res.status(401).json({
          success: false,

          message:
            "Authenticated user not found.",
        });
      }

      await session.withTransaction(
        async () => {
          const customer =
            await LedgerCustomer.findOne(
              {
                _id: id,
                pumpId,
              }
            ).session(session);

          if (!customer) {
            const error =
              new Error(
                "Customer not found"
              );

            error.statusCode = 404;

            throw error;
          }

          if (
            customer.status ===
            "inactive"
          ) {
            const error =
              new Error(
                "Customer is already inactive."
              );

            error.statusCode = 409;

            throw error;
          }

          await createDeletedRecord({
            document:
              customer,

            originalCollection:
              LedgerCustomer
                .collection
                .name,

            originalModel:
              "LedgerCustomer",

            pumpId,

            deletedBy,

            req,

            deletionReason:
              "Ledger customer removed by user",

            session,
          });

          customer.status =
            "inactive";

          await customer.save({
            session,
          });
        }
      );

      return res.status(200).json({
        success: true,

        message:
          "Customer removed successfully",
      });
    } catch (error) {
      console.error(
        "DELETE LEDGER CUSTOMER ERROR:",
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,

        message:
          error.statusCode === 404
            ? "Customer not found"
            : error.statusCode === 409
            ? "Customer is already inactive."
            : "Unable to remove customer",
      });
    } finally {
      await session.endSession();
    }
  };

/* =====================================================
   ADD CUSTOMER PURCHASE
===================================================== */

export const addCustomerPurchase =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const {
        customerId,
      } = req.params;

      const {
        fuelType,
        totalAmount,
        paidAmount = 0,
        entryDate,
        note = "",
      } = req.body || {};

      const pumpId =
        getAuthorizedPumpId(req);

      const createdBy =
        getAuthenticatedUserId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump ID is required.",
        });
      }

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found.",
        });
      }

      if (
        !isValidObjectId(
          customerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
        });
      }

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
        });
      }

      const total =
        Number(totalAmount);

      const paid =
        Number(
          paidAmount || 0
        );

      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Total amount must be greater than 0",
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
        });
      }

      const normalizedEntryDate =
        getEntryDate(
          entryDate
        );

      let entry;
      let customer;

      await session.withTransaction(
        async () => {
          customer =
            await LedgerCustomer.findOne(
              {
                _id:
                  customerId,

                pumpId,

                status:
                  "active",
              }
            ).session(session);

          if (!customer) {
            const error =
              new Error(
                "Customer not found"
              );

            error.statusCode = 404;

            throw error;
          }

          const pending =
            total - paid;

          const entries =
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

                  paidAmount:
                    paid,

                  pendingAmount:
                    pending,

                  paymentAmount:
                    0,

                  entryDate:
                    normalizedEntryDate,

                  note:
                    String(
                      note || ""
                    ).trim(),

                  createdBy,
                },
              ],
              {
                session,
              }
            );

          entry =
            entries[0];

          /*
           * Keep the customer's cached balance
           * synchronized with the ledger entries.
           */
          customer.currentBalance =
            Number(
              customer.currentBalance ||
                0
            ) + pending;

          await customer.save({
            session,
          });
        }
      );

      const summary =
        await calculateCustomerSummary(
          pumpId,
          customer._id
        );

      return res.status(201).json({
        success: true,

        message:
          "Purchase added successfully",

        entry,

        customer,

        summary,
      });
    } catch (error) {
      console.error(
        "ADD CUSTOMER PURCHASE ERROR:",
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,

        message:
          error.statusCode === 400
            ? error.message
            : error.statusCode === 404
            ? "Customer not found"
            : "Unable to add purchase",
      });
    } finally {
      await session.endSession();
    }
  };

/* =====================================================
   ADD PAYMENT
===================================================== */

export const addLedgerPayment =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      const {
        customerId,
        amount,
        entryDate,
        note = "",
      } = req.body || {};

      const pumpId =
        getAuthorizedPumpId(req);

      const createdBy =
        getAuthenticatedUserId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump ID is required.",
        });
      }

      if (!createdBy) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found.",
        });
      }

      if (
        !isValidObjectId(
          customerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
        });
      }

      const payment =
        Number(amount);

      if (
        !Number.isFinite(payment) ||
        payment <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Payment amount must be greater than 0",
        });
      }

      const normalizedEntryDate =
        getEntryDate(
          entryDate
        );

      let entry;
      let customer;

      await session.withTransaction(
        async () => {
          /*
           * First read the customer inside the
           * transaction.
           */
          customer =
            await LedgerCustomer.findOne(
              {
                _id:
                  customerId,

                pumpId,

                status:
                  "active",
              }
            ).session(session);

          if (!customer) {
            const error =
              new Error(
                "Customer not found"
              );

            error.statusCode = 404;

            throw error;
          }

          const currentBalance =
            Number(
              customer.currentBalance ||
                0
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

            throw error;
          }

          /*
           * Create the payment ledger entry.
           */
          const entries =
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

                  entryDate:
                    normalizedEntryDate,

                  note:
                    String(
                      note || ""
                    ).trim(),

                  createdBy,
                },
              ],
              {
                session,
              }
            );

          entry =
            entries[0];

          /*
           * IMPORTANT:
           *
           * Use an atomic conditional update
           * so concurrent payments cannot make
           * currentBalance negative.
           *
           * Example:
           *
           * Balance = ₹5,000
           *
           * Two simultaneous ₹5,000 payments
           * must NOT both succeed.
           */
          const updatedCustomer =
            await LedgerCustomer.findOneAndUpdate(
              {
                _id:
                  customer._id,

                pumpId,

                status:
                  "active",

                currentBalance: {
                  $gte:
                    payment,
                },
              },
              {
                $inc: {
                  currentBalance:
                    -payment,
                },
              },
              {
                new: true,

                session,
              }
            );

          if (!updatedCustomer) {
            const error =
              new Error(
                "Customer balance changed. Please retry the payment."
              );

            error.statusCode = 409;

            throw error;
          }

          customer =
            updatedCustomer;
        }
      );

      const summary =
        await calculateCustomerSummary(
          pumpId,
          customer._id
        );

      return res.status(201).json({
        success: true,

        message:
          "Payment added successfully",

        entry,

        customer,

        summary,
      });
    } catch (error) {
      console.error(
        "ADD LEDGER PAYMENT ERROR:",
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,

        message:
          error.statusCode === 400 ||
          error.statusCode === 409
            ? error.message
            : error.statusCode === 404
            ? "Customer not found"
            : "Unable to add payment",
      });
    } finally {
      await session.endSession();
    }
  };

/* =====================================================
   CUSTOMER FULL HISTORY
===================================================== */

export const getCustomerLedgerHistory =
  async (req, res) => {
    try {
      const {
        customerId,
      } = req.params;

      const pumpId =
        getAuthorizedPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump ID is required.",
        });
      }

      if (
        !isValidObjectId(
          customerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid customer ID",
        });
      }

      const customer =
        await LedgerCustomer.findOne(
          {
            _id:
              customerId,

            pumpId,
          }
        );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found",
        });
      }

      const entries =
        await LedgerEntry.find({
          pumpId,

          customerId:
            customer._id,
        })
          .sort({
            entryDate: 1,
            createdAt: 1,
          })
          .lean();

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

      return res.status(500).json({
        success: false,

        message:
          "Unable to load customer ledger history",
      });
    }
  };

/* =====================================================
   PENDING CREDIT
===================================================== */

export const getPendingCredit =
  async (req, res) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump ID is required.",
        });
      }

      const customers =
        await LedgerCustomer.find({
          pumpId,

          status: "active",

          currentBalance: {
            $gt: 0,
          },
        })
          .sort({
            currentBalance: -1,
          })
          .lean();

      const totalPending =
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

      return res.status(500).json({
        success: false,

        message:
          "Unable to load pending credit",
      });
    }
  };

/* =====================================================
   TODAY CREDIT SALES
===================================================== */

export const getTodayCreditSales =
  async (req, res) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      if (!pumpId) {
        return res.status(400).json({
          success: false,
          message:
            "Pump ID is required.",
        });
      }

      const date =
        req.query?.date ||
        todayString();

      if (
        !isValidDateString(date)
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid date. Use YYYY-MM-DD",
        });
      }

      const entries =
        await LedgerEntry.find({
          pumpId,

          entryType:
            "purchase",

          entryDate:
            date,
        })
          .populate(
            "customerId",
            "name phone vehicleNumber"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      /*
       * Credit sales represent the FULL
       * purchase amount, not only the pending
       * amount.
       *
       * Example:
       *
       * Purchase = ₹10,000
       * Paid now = ₹2,000
       * Pending = ₹8,000
       *
       * Credit sale = ₹10,000
       * Outstanding = ₹8,000
       */
      const totalCreditSales =
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

      return res.status(500).json({
        success: false,

        message:
          "Unable to load today's credit sales",
      });
    }
  };