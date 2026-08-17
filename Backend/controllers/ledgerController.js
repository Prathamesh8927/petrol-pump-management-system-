import mongoose from "mongoose";

import LedgerCustomer from "../models/LedgerCustomer.js";
import LedgerEntry from "../models/LedgerEntry.js";

/* =====================================================
   HELPERS
===================================================== */

const todayString = () =>
  new Date().toLocaleDateString("en-CA");

const calculateCustomerSummary = async (
  pumpId,
  customerId
) => {
  const entries =
    await LedgerEntry.find({
      pumpId,
      customerId,
    });

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
      (total, entry) =>
        total +
        Number(
          entry.totalAmount || 0
        ),
      0
    );

  const purchasePaid =
    purchases.reduce(
      (total, entry) =>
        total +
        Number(
          entry.paidAmount || 0
        ),
      0
    );

  const paymentReceived =
    payments.reduce(
      (total, entry) =>
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
   ADD CUSTOMER
===================================================== */

export const addLedgerCustomer = async (
  req,
  res
) => {
  try {
    const {
      name,
      phone = "",
      vehicleNumber = "",
      address = "",
      note = "",
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name is required",
      });
    }

    let existingCustomer =
      null;

    if (phone.trim()) {
      existingCustomer =
        await LedgerCustomer.findOne({
          pumpId:
            req.user.pumpId,

          phone:
            phone.trim(),

          status:
            "active",
        });
    }

    if (existingCustomer) {
      return res.status(409).json({
        success: false,

        message:
          "Customer already exists. Open the existing ledger and add a new purchase.",

        customer:
          existingCustomer,
      });
    }

    const customer =
      await LedgerCustomer.create({
        pumpId:
          req.user.pumpId,

        name:
          name.trim(),

        phone:
          phone.trim(),

        vehicleNumber:
          String(
            vehicleNumber
          )
            .trim()
            .toUpperCase(),

        address:
          String(
            address
          ).trim(),

        note:
          String(
            note
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

    return res.status(500).json({
      success: false,

      message:
        "Unable to add customer",

      error:
        error.message,
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
    const customers =
      await LedgerCustomer.find({
        pumpId:
          req.user.pumpId,

        status:
          "active",
      }).sort({
        createdAt: -1,
      });

    const customersWithSummary =
      await Promise.all(
        customers.map(
          async (customer) => {
            const summary =
              await calculateCustomerSummary(
                req.user.pumpId,
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

      error:
        error.message,
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
      });
    }

    const customer =
      await LedgerCustomer.findOne({
        _id: id,

        pumpId:
          req.user.pumpId,
      });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found",
      });
    }

    const summary =
      await calculateCustomerSummary(
        req.user.pumpId,
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

      error:
        error.message,
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
        });
      }

      const customer =
        await LedgerCustomer.findOne({
          _id: id,

          pumpId:
            req.user.pumpId,
        });

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
      } = req.body;

      if (
        name !== undefined
      ) {
        customer.name =
          String(
            name
          ).trim();
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

      return res.status(500).json({
        success: false,

        message:
          "Unable to update customer",

        error:
          error.message,
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
      const { id } =
        req.params;

      const customer =
        await LedgerCustomer.findOne({
          _id: id,

          pumpId:
            req.user.pumpId,
        });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found",
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
        "DELETE LEDGER CUSTOMER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to remove customer",

        error:
          error.message,
      });
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
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
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
        ).toLowerCase();

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
        Number(
          totalAmount
        );

      const paid =
        Number(
          paidAmount || 0
        );

      if (
        !Number.isFinite(
          total
        ) ||
        total <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Total amount must be greater than 0",
        });
      }

      if (
        !Number.isFinite(
          paid
        ) ||
        paid < 0 ||
        paid > total
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Paid amount must be between 0 and total amount",
        });
      }

      const customer =
        await LedgerCustomer.findOne({
          _id:
            customerId,

          pumpId:
            req.user.pumpId,

          status:
            "active",
        });

      if (!customer) {
        return res.status(404).json({
          success: false,

          message:
            "Customer not found",
        });
      }

      const pending =
        total - paid;

      const entry =
        await LedgerEntry.create({
          pumpId:
            req.user.pumpId,

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
            entryDate ||
            todayString(),

          note:
            String(
              note || ""
            ).trim(),

          createdBy:
            req.user._id ||
            req.user.userId ||
            null,
        });

      customer.currentBalance =
        Number(
          customer.currentBalance ||
            0
        ) +
        pending;

      await customer.save();

      const summary =
        await calculateCustomerSummary(
          req.user.pumpId,
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

      return res.status(500).json({
        success: false,

        message:
          "Unable to add purchase",

        error:
          error.message,
      });
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
    try {
      const {
        customerId,
        amount,
        entryDate,
        note = "",
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
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
        Number(
          amount
        );

      if (
        !Number.isFinite(
          payment
        ) ||
        payment <= 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Payment amount must be greater than 0",
        });
      }

      const customer =
        await LedgerCustomer.findOne({
          _id:
            customerId,

          pumpId:
            req.user.pumpId,

          status:
            "active",
        });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found",
        });
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
        return res.status(400).json({
          success: false,

          message:
            `Payment cannot exceed pending amount ₹${currentBalance.toFixed(
              2
            )}`,
        });
      }

      const entry =
        await LedgerEntry.create({
          pumpId:
            req.user.pumpId,

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
            entryDate ||
            todayString(),

          note:
            String(
              note || ""
            ).trim(),

          createdBy:
            req.user._id ||
            req.user.userId ||
            null,
        });

      customer.currentBalance =
        Math.max(
          currentBalance -
            payment,
          0
        );

      await customer.save();

      const summary =
        await calculateCustomerSummary(
          req.user.pumpId,
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

      return res.status(500).json({
        success: false,

        message:
          "Unable to add payment",

        error:
          error.message,
      });
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
        });
      }

      const customer =
        await LedgerCustomer.findOne({
          _id:
            customerId,

          pumpId:
            req.user.pumpId,
        });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found",
        });
      }

      const entries =
        await LedgerEntry.find({
          pumpId:
            req.user.pumpId,

          customerId:
            customer._id,
        }).sort({
          entryDate: 1,
          createdAt: 1,
        });

      const summary =
        await calculateCustomerSummary(
          req.user.pumpId,
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

        error:
          error.message,
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
      const customers =
        await LedgerCustomer.find({
          pumpId:
            req.user.pumpId,

          status:
            "active",

          currentBalance: {
            $gt: 0,
          },
        }).sort({
          currentBalance: -1,
        });

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

        error:
          error.message,
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
      const date =
        req.query.date ||
        todayString();

      const entries =
        await LedgerEntry.find({
          pumpId:
            req.user.pumpId,

          entryType:
            "purchase",

          entryDate:
            date,
        });

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

        error:
          error.message,
      });
    }
  };