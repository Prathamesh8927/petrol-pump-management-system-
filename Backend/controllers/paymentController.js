import crypto from "crypto";
import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import Nozzle from "../models/Nozzle.js";
import NozzleReading from "../models/NozzleReading.js";
import FuelPrice from "../models/FuelPrice.js";
import FuelStock from "../models/FuelStock.js";
import Sale from "../models/Sale.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import Pump from "../models/Pump.js";

import {
  getPaymentProvider,
} from "../services/paymentProviders/providerRegistry.js";

/* =========================================================
   CONSTANTS
========================================================= */

const ALLOWED_STAFF_ROLES = new Set([
  "owner",
  "manager",
  "staff",
]);

const STAFF_PAYMENT_ROLES = new Set([
  "staff",
  "employee",
]);

const ALLOWED_SHIFTS = new Set([
  "morning",
  "evening",
  "night",
]);

const PAYMENT_METHODS = new Set([
  "upi",
  "card",
]);

const PAYMENT_TTL_MINUTES = 20;

const MAX_STANDALONE_AMOUNT = 1_000_000;

const MAX_NOTE_LENGTH = 500;

const DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}$/;

const INDIA_TIMEZONE =
  "Asia/Kolkata";

/* =========================================================
   BASIC HELPERS
========================================================= */

const getPumpId = (req) =>
  req.user?.pumpId?._id ||
  req.user?.pumpId ||
  null;

const getUserId = (req) =>
  req.user?._id ||
  req.user?.userId ||
  null;

const asObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : null;

const round = (value) =>
  Number(
    Number(value).toFixed(2)
  );

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizePaymentMethod = (
  value
) => {
  const method =
    normalize(value);

  return PAYMENT_METHODS.has(method)
    ? method
    : "upi";
};

const getIndiaDate = () =>
  new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        INDIA_TIMEZONE,

      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());

const isValidDate = (value) =>
  DATE_REGEX.test(
    String(value || "")
  );

/* =========================================================
   PAYMENT RESPONSE SANITIZER
========================================================= */

const safePayment = (
  payment
) => ({
  id:
    payment._id,

  amount:
    payment.amount,

  amountPaise:
    payment.amountPaise,

  provider:
    payment.paymentProvider,

  fuelType:
    payment.fuelType,

  quantity:
    payment.quantity,

  nozzleId:
    payment.nozzleId,

  shiftName:
    payment.shiftName,

  readingDate:
    payment.readingDate,

  status:
    payment.status,

  method:
    payment.method,

  providerPaymentId:
    payment.providerPaymentId ||
    null,

  providerOrderId:
    payment.providerOrderId ||
    null,

  qrCodeId:
    payment.providerQrCodeId ||
    null,

  qrImageUrl:
    payment.qrImageUrl ||
    null,

  expiresAt:
    payment.expiresAt,

  paidAt:
    payment.paidAt,

  failureReason:
    payment.failureReason ||
    null,

  saleId:
    payment.saleId ||
    null,
});

/* =========================================================
   PAYMENT LOOKUP
========================================================= */

const findPaymentForPump = async (
  id,
  pumpId
) => {
  const paymentId =
    asObjectId(id);

  if (!paymentId || !pumpId) {
    return null;
  }

  return Payment.findOne({
    _id: paymentId,
    pumpId,
  });
};

/* =========================================================
   PAYMENT STATUS CACHE CONTROL
========================================================= */

const disablePaymentStatusCache = (
  res
) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );

  res.set(
    "Pragma",
    "no-cache"
  );

  res.set(
    "Expires",
    "0"
  );

  res.set(
    "Surrogate-Control",
    "no-store"
  );
};

/* =========================================================
   CREATE ADMIN / NOZZLE PAYMENT
========================================================= */

export const createPayment = async (
  req,
  res
) => {
  let payment = null;

  try {
    const pumpId =
      getPumpId(req);

    const userId =
      getUserId(req);

    if (!pumpId || !userId) {
      return res.status(403).json({
        success: false,
        message:
          "Pump or user information not found.",
      });
    }

    const body =
      req.body || {};

    const nozzleId =
      asObjectId(
        body.nozzleId
      );

    const staffId =
      asObjectId(
        body.staffId ||
          body.employeeId
      );

    const shiftName =
      normalize(
        body.shiftName ||
          body.shift
      );

    const readingDate =
      String(
        body.readingDate ||
          body.date ||
          getIndiaDate()
      ).trim();

    const closingReading =
      Number(
        body.closingReading ??
          body.reading
      );

    const note =
      String(
        body.note || ""
      ).trim();

    /* -----------------------------------------------
       VALIDATION
    ------------------------------------------------ */

    if (
      !nozzleId ||
      !staffId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid nozzle and staff member are required.",
      });
    }

    if (
      !ALLOWED_SHIFTS.has(
        shiftName
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid shift.",
      });
    }

    if (
      !isValidDate(
        readingDate
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid reading date.",
      });
    }

    if (
      !Number.isFinite(
        closingReading
      ) ||
      closingReading < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a valid closing reading.",
      });
    }

    if (
      note.length >
      MAX_NOTE_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Note cannot exceed 500 characters.",
      });
    }

    /* -----------------------------------------------
       LOAD PUMP + STAFF + NOZZLE
    ------------------------------------------------ */

    const [
      pump,
      staff,
      nozzle,
    ] = await Promise.all([
      Pump.findById(
        pumpId
      )
        .select(
          "paymentConfig"
        )
        .lean(),

      User.findOne({
        _id: staffId,
        pumpId,
        active: true,
        role: {
          $in: [
            ...ALLOWED_STAFF_ROLES,
          ],
        },
      })
        .select(
          "_id name email"
        )
        .lean(),

      Nozzle.findOne({
        _id: nozzleId,
        pumpId,
        status: "active",
      })
        .select(
          "_id pumpId fuelType currentReading status"
        )
        .lean(),
    ]);

    if (!pump) {
      return res.status(404).json({
        success: false,
        message:
          "Pump not found.",
      });
    }

    if (
      pump.paymentConfig
        ?.enabled === false ||
      pump.paymentConfig
        ?.dynamicQrEnabled === false
    ) {
      return res.status(503).json({
        success: false,
        message:
          "Digital payments are disabled for this pump.",
      });
    }

    if (!staff) {
      return res.status(404).json({
        success: false,
        message:
          "Selected staff member was not found or is inactive.",
      });
    }

    if (!nozzle) {
      return res.status(404).json({
        success: false,
        message:
          "Nozzle not found or inactive.",
      });
    }

    /* -----------------------------------------------
       READING CALCULATION
    ------------------------------------------------ */

    const openingReading =
      Number(
        nozzle.currentReading
      );

    const fuelType =
      normalize(
        nozzle.fuelType
      );

    if (
      !Number.isFinite(
        openingReading
      ) ||
      closingReading <=
        openingReading
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Closing reading must be greater than ${openingReading}.`,
      });
    }

    const litresSold =
      round(
        closingReading -
          openingReading
      );

    /* -----------------------------------------------
       FUEL PRICE
    ------------------------------------------------ */

    const priceRecord =
      await FuelPrice.findOne({
        pumpId,
        fuelType,
      })
        .select(
          "price"
        )
        .lean();

    const pricePerLitre =
      Number(
        priceRecord?.price
      );

    if (
      !Number.isFinite(
        pricePerLitre
      ) ||
      pricePerLitre <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Fuel price is not configured.",
      });
    }

    const amount =
      round(
        litresSold *
          pricePerLitre
      );

    const amountPaise =
      Math.round(
        amount * 100
      );

    if (
      amountPaise <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Calculated amount must be greater than zero.",
      });
    }

    /* -----------------------------------------------
       PAYMENT RESERVATION
    ------------------------------------------------ */

    const reservationKey =
      `${pumpId}:${nozzleId}:${readingDate}:${shiftName}`;

    const existing =
      await Payment.findOne({
        reservationKey,
        status: "pending",
      })
        .select(
          "_id amount amountPaise paymentProvider fuelType quantity nozzleId shiftName readingDate status method providerPaymentId providerOrderId providerQrCodeId qrImageUrl expiresAt paidAt failureReason saleId"
        )
        .lean();

    if (existing) {
      return res.status(200).json({
        success: true,
        message:
          "An active payment already exists for this reading.",
        payment:
          safePayment(existing),
      });
    }

    /* -----------------------------------------------
       CHECK FINAL READING
    ------------------------------------------------ */

    const existingReading =
      await NozzleReading.exists({
        pumpId,
        nozzleId,
        readingDate,
        shiftName,
      });

    if (existingReading) {
      return res.status(409).json({
        success: false,
        message:
          "A final reading already exists for this nozzle and shift.",
      });
    }

    /* -----------------------------------------------
       CREATE LOCAL PAYMENT
    ------------------------------------------------ */

    payment =
      await Payment.create({
        pumpId,

        employeeId:
          staff._id,

        userId,

        employeeName:
          String(
            staff.name ||
              staff.email ||
              "Staff"
          )
            .trim()
            .slice(0, 150),

        paymentProvider:
          pump.paymentConfig
            ?.provider ||
          "razorpay",

        nozzleId,

        shiftName,

        readingDate,

        openingReading,

        closingReading,

        fuelType,

        quantity:
          litresSold,

        pricePerLitre,

        amount,

        amountPaise,

        method:
          "upi",

        status:
          "pending",

        expiresAt:
          new Date(
            Date.now() +
              PAYMENT_TTL_MINUTES *
                60 *
                1000
          ),

        reservationKey,

        note,
      });

    /* -----------------------------------------------
       PROVIDER QR
    ------------------------------------------------ */

    const provider =
      getPaymentProvider(
        pump
      );

    const providerPayment =
      await provider.createDynamicQr(
        payment
      );

    payment.paymentProvider =
      providerPayment.provider;

    payment.providerQrCodeId =
      providerPayment.providerQrCodeId ||
      undefined;

    payment.providerOrderId =
      providerPayment.providerOrderId ||
      undefined;

    payment.qrImageUrl =
      providerPayment.qrImageUrl ||
      "";

    await payment.save();

    /* -----------------------------------------------
       AUDIT
    ------------------------------------------------ */

    await AuditLog.create({
      pumpId,

      userId,

      userName:
        String(
          req.user?.name ||
            req.user?.email ||
            ""
        )
          .trim()
          .slice(0, 100),

      action:
        "payment_created",

      module:
        "payments",

      recordId:
        payment._id,

      description:
        "Payment QR created.",

      newData: {
        amount:
          payment.amount,

        status:
          payment.status,
      },

      ipAddress:
        req.ip || "",
    }).catch(
      (auditError) => {
        console.error(
          "PAYMENT AUDIT ERROR:",
          auditError.message
        );
      }
    );

    return res.status(201).json({
      success: true,

      message:
        "Payment QR generated.",

      payment:
        safePayment(
          payment
        ),
    });
  } catch (error) {
    console.error(
      "CREATE PAYMENT ERROR:",
      {
        code:
          error?.code,

        message:
          error?.message,
      }
    );

    /*
     * If the provider failed after local payment creation,
     * keep the payment record but mark it failed.
     */

    if (
      payment?._id
    ) {
      await Payment.findOneAndUpdate(
        {
          _id:
            payment._id,

          status:
            "pending",
        },
        {
          $set: {
            status:
              "failed",

            failureReason:
              "Unable to create provider payment.",
          },
        }
      ).catch(
        () => {}
      );
    }

    if (
      error?.code ===
      11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "An active payment already exists for this reading.",
      });
    }

    if (
      error?.code ===
        "RAZORPAY_NOT_CONFIGURED" ||
      error?.code ===
        "BANK_PROVIDER_NOT_CONFIGURED"
    ) {
      return res.status(503).json({
        success: false,
        message:
          error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate payment QR.",
    });
  }
};

/* =========================================================
   CREATE EMPLOYEE STANDALONE PAYMENT
========================================================= */

export const createEmployeePayment =
  async (
    req,
    res
  ) => {
    let payment = null;

    try {
      const pumpId =
        getPumpId(req);

      const employeeId =
        getUserId(req);

      const amount =
        Number(
          req.body?.amount
        );

      if (
        !pumpId ||
        !employeeId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Pump or employee information not found.",
        });
      }

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0 ||
        amount >
          MAX_STANDALONE_AMOUNT
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid payment amount.",
        });
      }

      const amountPaise =
        Math.round(
          amount * 100
        );

      if (
        amountPaise <= 0 ||
        amountPaise >
          MAX_STANDALONE_AMOUNT *
            100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid payment amount.",
        });
      }

      const employeeName =
        String(
          req.user?.name ||
            req.user?.email ||
            "Employee"
        )
          .trim()
          .slice(0, 150);

      const pump =
        await Pump.findById(
          pumpId
        )
          .select(
            "paymentConfig"
          )
          .lean();

      if (!pump) {
        return res.status(404).json({
          success: false,
          message:
            "Pump not found.",
        });
      }

      if (
        pump.paymentConfig
          ?.enabled === false ||
        pump.paymentConfig
          ?.dynamicQrEnabled === false
      ) {
        return res.status(503).json({
          success: false,
          message:
            "Digital payments are disabled for this pump.",
        });
      }

      /* -----------------------------------------------
         CREATE LOCAL PAYMENT
      ------------------------------------------------ */

      payment =
        await Payment.create({
          pumpId,

          employeeId,

          userId:
            employeeId,

          employeeName,

          transactionType:
            "standalone",

          paymentProvider:
            pump.paymentConfig
              ?.provider ||
            "razorpay",

          amount:
            round(
              amountPaise /
                100
            ),

          amountPaise,

          method:
            "upi",

          status:
            "pending",

          expiresAt:
            new Date(
              Date.now() +
                PAYMENT_TTL_MINUTES *
                  60 *
                  1000
            ),

          reservationKey:
            `standalone:${pumpId}:${employeeId}:${crypto.randomUUID()}`,
        });

      /* -----------------------------------------------
         CREATE PROVIDER QR
      ------------------------------------------------ */

      const provider =
        getPaymentProvider(
          pump
        );

      const providerPayment =
        await provider.createDynamicQr(
          payment
        );

      payment.paymentProvider =
        providerPayment.provider;

      payment.providerQrCodeId =
        providerPayment.providerQrCodeId ||
        undefined;

      payment.providerOrderId =
        providerPayment.providerOrderId ||
        undefined;

      payment.qrImageUrl =
        providerPayment.qrImageUrl ||
        "";

      await payment.save();

      console.log(
        "EMPLOYEE PAYMENT CREATED:",
        {
          paymentId:
            String(
              payment._id
            ),

          provider:
            payment.paymentProvider,

          providerOrderId:
            payment.providerOrderId,

          qrCodeId:
            payment.providerQrCodeId,

          amountPaise:
            payment.amountPaise,
        }
      );

      return res.status(201).json({
        success: true,

        payment:
          safePayment(
            payment
          ),
      });
    } catch (error) {
      console.error(
        "CREATE EMPLOYEE PAYMENT ERROR:",
        {
          code:
            error?.code,

          statusCode:
            error?.statusCode,

          message:
            error?.message,

          description:
            error?.description,
        }
      );

      if (
        payment?._id
      ) {
        await Payment.findOneAndUpdate(
          {
            _id:
              payment._id,

            status:
              "pending",
          },
          {
            $set: {
              status:
                "failed",

              failureReason:
                "Unable to create provider payment.",
            },
          }
        ).catch(
          () => {}
        );
      }

      if (
        error?.code ===
          "RAZORPAY_NOT_CONFIGURED" ||
        error?.code ===
          "BANK_PROVIDER_NOT_CONFIGURED"
      ) {
        return res.status(503).json({
          success: false,
          message:
            error.message,
        });
      }

      const razorpayMessage =
        error?.error
          ?.description ||
        error?.response
          ?.data
          ?.error
          ?.description ||
        error?.description ||
        error?.message;

      if (
        razorpayMessage ===
        "The requested URL was not found on the server."
      ) {
        return res.status(503).json({
          success: false,
          message:
            "Razorpay QR Codes are not enabled for this account. The system will use the Razorpay Payment Link fallback when available.",
        });
      }

      if (
        error?.statusCode ===
          400 ||
        error?.statusCode ===
          401 ||
        error?.statusCode ===
          403
      ) {
        return res.status(502).json({
          success: false,
          message:
            razorpayMessage ||
            "Razorpay rejected the payment request.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          razorpayMessage ||
          "Unable to create payment. Please try again.",
      });
    }
  };

/* =========================================================
   RAZORPAY PAYMENT LINK RECONCILIATION
========================================================= */

const reconcilePendingRazorpayPayment =
  async (
    payment
  ) => {
    if (
      !payment ||
      payment.status !==
        "pending"
    ) {
      return payment;
    }

    if (
      payment.paymentProvider !==
      "razorpay"
    ) {
      return payment;
    }

    if (
      !payment.providerOrderId
    ) {
      return payment;
    }

    const providerOrderId =
      String(
        payment.providerOrderId
      );

    /*
     * Payment Link fallback IDs start with plink_.
     */

    if (
      !providerOrderId.startsWith(
        "plink_"
      )
    ) {
      return payment;
    }

    /*
     * Do not call Razorpay after our local payment
     * has already expired.
     */

    if (
      payment.expiresAt &&
      payment.expiresAt <=
        new Date()
    ) {
      return payment;
    }

    try {
      const pump =
        await Pump.findById(
          payment.pumpId
        )
          .select(
            "paymentConfig"
          )
          .lean();

      if (!pump) {
        return payment;
      }

      const provider =
        getPaymentProvider(
          pump
        );

      if (
        typeof provider.reconcilePaymentLink !==
        "function"
      ) {
        return payment;
      }

      const reconciliation =
        await provider.reconcilePaymentLink(
          providerOrderId
        );

      const razorpayStatus =
        String(
          reconciliation.status ||
            ""
        ).toLowerCase();

      const paid =
        razorpayStatus ===
          "paid" &&
        Number(
          reconciliation.amountPaidPaise
        ) ===
          Number(
            payment.amountPaise
          );

      console.log(
        "RAZORPAY PAYMENT LINK RECONCILIATION:",
        {
          paymentId:
            String(
              payment._id
            ),

          providerOrderId,

          razorpayStatus,

          expectedAmountPaise:
            payment.amountPaise,

          razorpayAmountPaidPaise:
            reconciliation.amountPaidPaise,

          providerPaymentId:
            reconciliation.providerPaymentId ||
            null,
        }
      );

      if (paid) {
        await finalizePaidPayment({
          paymentId:
            payment._id,

          providerPaymentId:
            reconciliation.providerPaymentId,

          method:
            reconciliation.method ===
            "card"
              ? "card"
              : "upi",

          eventId:
            null,

          payload: {
            amount:
              reconciliation.amountPaidPaise,

            amount_paid:
              reconciliation.amountPaidPaise,

            payment_amount:
              reconciliation.amountPaidPaise,

            order_id:
              reconciliation.providerOrderId,

            payment_id:
              reconciliation.providerPaymentId,
          },
        });

        return Payment.findById(
          payment._id
        );
      }

      if (
        razorpayStatus ===
          "expired" ||
        razorpayStatus ===
          "cancelled"
      ) {
        await Payment.findOneAndUpdate(
          {
            _id:
              payment._id,

            status:
              "pending",
          },
          {
            $set: {
              status:
                razorpayStatus ===
                "expired"
                  ? "expired"
                  : "cancelled",

              failureReason:
                `Razorpay Payment Link ${razorpayStatus}.`,
            },
          }
        );

        return Payment.findById(
          payment._id
        );
      }

      return payment;
    } catch (error) {
      /*
       * Razorpay API failure must never turn a legitimate
       * pending payment into failed locally.
       */

      console.error(
        "RAZORPAY PAYMENT LINK RECONCILIATION ERROR:",
        {
          paymentId:
            String(
              payment._id
            ),

          providerOrderId:
            payment.providerOrderId,

          code:
            error?.code,

          message:
            error?.message,
        }
      );

      return payment;
    }
  };

/* =========================================================
   PAYMENT STATUS
========================================================= */

export const getPaymentStatus =
  async (
    req,
    res
  ) => {
    disablePaymentStatusCache(
      res
    );

    try {
      const pumpId =
        getPumpId(req);

      const paymentId =
        asObjectId(
          req.params.id
        );

      if (
        !pumpId ||
        !paymentId
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found.",
        });
      }

      const query = {
        _id:
          paymentId,

        pumpId,
      };

      const userRole =
        String(
          req.user?.role || ""
        ).toLowerCase();

      if (
        STAFF_PAYMENT_ROLES.has(
          userRole
        )
      ) {
        const employeeId =
          getUserId(req);

        if (!employeeId) {
          return res.status(403).json({
            success: false,
            message:
              "Employee information not found.",
          });
        }

        query.employeeId =
          employeeId;
      }

      let payment =
        await Payment.findOne(
          query
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found.",
        });
      }

      /*
       * Reconcile Payment Link before local expiry.
       */

      if (
        payment.status ===
        "pending"
      ) {
        payment =
          await reconcilePendingRazorpayPayment(
            payment
          );
      }

      /*
       * Local expiry.
       */

      if (
        payment.status ===
          "pending" &&
        payment.expiresAt <=
          new Date()
      ) {
        payment.status =
          "expired";

        payment.failureReason =
          "Payment QR expired.";

        await payment.save();
      }

      return res.status(200).json({
        success: true,

        payment:
          safePayment(
            payment
          ),
      });
    } catch (error) {
      console.error(
        "GET PAYMENT STATUS ERROR:",
        {
          code:
            error?.code,

          message:
            error?.message,
        }
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load payment status.",
      });
    }
  };

/* =========================================================
   CANCEL PAYMENT
========================================================= */

export const cancelPayment =
  async (
    req,
    res
  ) => {
    try {
      const pumpId =
        getPumpId(req);

      const paymentId =
        asObjectId(
          req.params.id
        );

      if (
        !pumpId ||
        !paymentId
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found.",
        });
      }

      const query = {
        _id:
          paymentId,

        pumpId,
      };

      const userRole =
        String(
          req.user?.role || ""
        ).toLowerCase();

      if (
        STAFF_PAYMENT_ROLES.has(
          userRole
        )
      ) {
        const employeeId =
          getUserId(req);

        if (!employeeId) {
          return res.status(403).json({
            success: false,
            message:
              "Employee information not found.",
          });
        }

        query.employeeId =
          employeeId;
      }

      const payment =
        await Payment.findOne(
          query
        );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found.",
        });
      }

      if (
        payment.status ===
        "paid"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A paid payment cannot be cancelled.",
        });
      }

      if (
        payment.status ===
        "pending"
      ) {
        const updated =
          await Payment.findOneAndUpdate(
            {
              _id:
                payment._id,

              pumpId,

              status:
                "pending",
            },
            {
              $set: {
                status:
                  "cancelled",

                failureReason:
                  "Cancelled by employee.",
              },
            },
            {
              new: true,
            }
          );

        return res.status(200).json({
          success: true,

          payment:
            safePayment(
              updated ||
                payment
            ),
        });
      }

      return res.status(200).json({
        success: true,

        payment:
          safePayment(
            payment
          ),
      });
    } catch (error) {
      console.error(
        "CANCEL PAYMENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to cancel payment.",
      });
    }
  };

/* =========================================================
   RAZORPAY WEBHOOK SIGNATURE
========================================================= */

const verifyWebhookSignature = (
  rawBody,
  signature
) => {
  const secret =
    process.env
      .RAZORPAY_WEBHOOK_SECRET;

  if (
    !secret ||
    !signature ||
    !Buffer.isBuffer(
      rawBody
    )
  ) {
    return false;
  }

  const expected =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(rawBody)
      .digest("hex");

  const left =
    Buffer.from(
      expected,
      "utf8"
    );

  const right =
    Buffer.from(
      String(
        signature
      ),
      "utf8"
    );

  return (
    left.length ===
      right.length &&
    crypto.timingSafeEqual(
      left,
      right
    )
  );
};

/* =========================================================
   FINALIZE VERIFIED PAYMENT
========================================================= */

const finalizePaidPayment =
  async ({
    paymentId,
    providerPaymentId,
    method,
    eventId,
    payload,
  }) => {
    const session =
      await mongoose.startSession();

    let result = null;

    try {
      await session.withTransaction(
        async () => {
          const payment =
            await Payment.findOne({
              _id:
                paymentId,

              status:
                "pending",
            }).session(
              session
            );

          /*
           * Idempotency.
           *
           * If another webhook already finalized this payment,
           * there is nothing left to do.
           */

          if (!payment) {
            return;
          }

          const now =
            new Date();

          /*
           * Never allow an expired local payment to become paid.
           */

          if (
            payment.expiresAt &&
            payment.expiresAt <=
              now
          ) {
            payment.status =
              "expired";

            payment.failureReason =
              "Payment confirmation arrived after expiry.";

            if (
              eventId &&
              !payment.webhookEventIds.includes(
                eventId
              )
            ) {
              payment.webhookEventIds.push(
                eventId
              );
            }

            await payment.save({
              session,
            });

            return;
          }

          /* ---------------------------------------------
             VERIFY AMOUNT
          ---------------------------------------------- */

          const receivedAmount =
            Number(
              payload?.amount_paid ??
                payload?.paid_amount ??
                payload?.amount ??
                payload?.payment_amount
            );

          if (
            !Number.isFinite(
              receivedAmount
            ) ||
            receivedAmount !==
              Number(
                payment.amountPaise
              )
          ) {
            const error =
              new Error(
                "Payment amount does not match the expected amount."
              );

            error.code =
              "PAYMENT_AMOUNT_MISMATCH";

            throw error;
          }

          /* ---------------------------------------------
             VERIFY ORDER / PAYMENT LINK
          ---------------------------------------------- */

          const receivedOrderId =
            payload?.order_id ||
            payload?.payment_link_id ||
            (
              payload?.id &&
              String(
                payload.id
              ).startsWith(
                "plink_"
              )
                ? payload.id
                : null
            );

          if (
            receivedOrderId &&
            payment.providerOrderId &&
            String(
              receivedOrderId
            ) !==
              String(
                payment.providerOrderId
              )
          ) {
            const error =
              new Error(
                "Payment order does not match the expected order."
              );

            error.code =
              "PAYMENT_ORDER_MISMATCH";

            throw error;
          }

          /* ---------------------------------------------
             CHECK EXISTING SALE
          ---------------------------------------------- */

          const existingSale =
            await Sale.findOne({
              paymentId:
                payment._id,
            })
              .select(
                "_id pumpId paymentId totalAmount paymentMethod"
              )
              .session(
                session
              )
              .lean();

          if (
            existingSale
          ) {
            payment.status =
              "paid";

            payment.providerPaymentId =
              providerPaymentId ||
              payment.providerPaymentId ||
              null;

            payment.paidAt =
              payment.paidAt ||
              now;

            payment.saleId =
              existingSale._id;

            if (
              eventId &&
              !payment.webhookEventIds.includes(
                eventId
              )
            ) {
              payment.webhookEventIds.push(
                eventId
              );
            }

            await payment.save({
              session,
            });

            result =
              existingSale;

            return;
          }

          /* =================================================
             STANDALONE EMPLOYEE PAYMENT
          ================================================= */

          if (
            payment.transactionType ===
            "standalone"
          ) {
            const [
              sale,
            ] =
              await Sale.create(
                [
                  {
                    pumpId:
                      payment.pumpId,

                    paymentId:
                      payment._id,

                    paymentProvider:
                      payment.paymentProvider,

                    totalAmount:
                      payment.amount,

                    paymentMethod:
                      "upi",

                    saleDate:
                      getIndiaDate(),

                    source:
                      "payment",

                    note:
                      "Employee QR payment",

                    createdBy:
                      payment.employeeId,

                    providerPaymentId:
                      providerPaymentId ||
                      null,
                  },
                ],
                {
                  session,
                }
              );

            payment.status =
              "paid";

            payment.providerPaymentId =
              providerPaymentId ||
              payment.providerPaymentId ||
              null;

            payment.method =
              "upi";

            payment.paidAt =
              now;

            payment.saleId =
              sale._id;

            if (
              eventId &&
              !payment.webhookEventIds.includes(
                eventId
              )
            ) {
              payment.webhookEventIds.push(
                eventId
              );
            }

            await payment.save({
              session,
            });

            await AuditLog.create(
              [
                {
                  pumpId:
                    payment.pumpId,

                  userId:
                    payment.employeeId,

                  userName:
                    payment.employeeName,

                  action:
                    "payment_success",

                  module:
                    "payments",

                  recordId:
                    payment._id,

                  description:
                    "Standalone employee QR payment verified.",

                  newData: {
                    amount:
                      payment.amount,

                    providerPaymentId:
                      providerPaymentId ||
                      null,
                  },
                },

                {
                  pumpId:
                    payment.pumpId,

                  userId:
                    payment.employeeId,

                  userName:
                    payment.employeeName,

                  action:
                    "sale_created_from_payment",

                  module:
                    "sales",

                  recordId:
                    sale._id,

                  description:
                    "Sale created from standalone employee QR payment.",

                  newData: {
                    paymentId:
                      payment._id,

                    amount:
                      payment.amount,
                  },
                },
              ],
              {
                session,
                ordered:
                  true,
              }
            );

            result =
              sale;

            return;
          }

          /* =================================================
             NOZZLE PAYMENT
          ================================================= */

          const nozzle =
            await Nozzle.findOne({
              _id:
                payment.nozzleId,

              pumpId:
                payment.pumpId,

              status:
                "active",
            })
              .select(
                "_id pumpId fuelType currentReading status"
              )
              .session(
                session
              );

          if (!nozzle) {
            const error =
              new Error(
                "Nozzle not found or inactive."
              );

            error.code =
              "NOZZLE_NOT_FOUND";

            throw error;
          }

          /*
           * Critical concurrency check:
           *
           * The nozzle reading used to calculate this payment
           * must still be the current reading.
           */

          if (
            Number(
              nozzle.currentReading
            ) !==
            Number(
              payment.openingReading
            )
          ) {
            const error =
              new Error(
                "Nozzle reading changed before payment confirmation."
              );

            error.code =
              "NOZZLE_READING_CONFLICT";

            throw error;
          }

          /* ---------------------------------------------
             CHECK FINAL SHIFT READING
          ---------------------------------------------- */

          const duplicateReading =
            await NozzleReading.findOne(
              {
                pumpId:
                  payment.pumpId,

                nozzleId:
                  payment.nozzleId,

                readingDate:
                  payment.readingDate,

                shiftName:
                  payment.shiftName,
              }
            )
              .select("_id")
              .session(
                session
              );

          if (
            duplicateReading
          ) {
            const error =
              new Error(
                "A final reading already exists for this shift."
              );

            error.code =
              "SHIFT_READING_ALREADY_EXISTS";

            throw error;
          }

          /* ---------------------------------------------
             CHECK STOCK
          ---------------------------------------------- */

          const stock =
            await FuelStock.findOne({
              pumpId:
                payment.pumpId,

              fuelType:
                payment.fuelType,
            })
              .select(
                "_id pumpId fuelType currentStock"
              )
              .session(
                session
              );

          if (
            !stock ||
            Number(
              stock.currentStock
            ) <
              Number(
                payment.quantity
              )
          ) {
            const error =
              new Error(
                "Insufficient fuel stock for this paid transaction."
              );

            error.code =
              "INSUFFICIENT_FUEL_STOCK";

            throw error;
          }

          /* ---------------------------------------------
             CREATE NOZZLE READING
          ---------------------------------------------- */

          const finalPaymentMethod =
            normalizePaymentMethod(
              method
            );

          const [
            reading,
          ] =
            await NozzleReading.create(
              [
                {
                  pumpId:
                    payment.pumpId,

                  nozzleId:
                    payment.nozzleId,

                  shiftName:
                    payment.shiftName,

                  staffId:
                    payment.employeeId,

                  staffName:
                    payment.employeeName,

                  fuelType:
                    payment.fuelType,

                  openingReading:
                    payment.openingReading,

                  closingReading:
                    payment.closingReading,

                  litresSold:
                    payment.quantity,

                  pricePerLitre:
                    payment.pricePerLitre,

                  totalAmount:
                    payment.amount,

                  readingDate:
                    payment.readingDate,

                  paymentMethod:
                    finalPaymentMethod,

                  note:
                    payment.note,

                  createdBy:
                    payment.employeeId,
                },
              ],
              {
                session,
              }
            );

          /* ---------------------------------------------
             CREATE SALE
          ---------------------------------------------- */

          const [
            sale,
          ] =
            await Sale.create(
              [
                {
                  pumpId:
                    payment.pumpId,

                  nozzleId:
                    payment.nozzleId,

                  readingId:
                    reading._id,

                  paymentId:
                    payment._id,

                  paymentProvider:
                    payment.paymentProvider,

                  fuelType:
                    payment.fuelType,

                  quantity:
                    payment.quantity,

                  pricePerLitre:
                    payment.pricePerLitre,

                  totalAmount:
                    payment.amount,

                  paymentMethod:
                    finalPaymentMethod,

                  saleDate:
                    payment.readingDate,

                  source:
                    "nozzle",

                  note:
                    payment.note,

                  createdBy:
                    payment.employeeId,

                  providerPaymentId:
                    providerPaymentId ||
                    null,
                },
              ],
              {
                session,
              }
            );

          /* ---------------------------------------------
             ATOMIC STOCK UPDATE
          ---------------------------------------------- */

          const updatedStock =
            await FuelStock.findOneAndUpdate(
              {
                _id:
                  stock._id,

                pumpId:
                  payment.pumpId,

                currentStock: {
                  $gte:
                    payment.quantity,
                },
              },
              {
                $inc: {
                  currentStock:
                    -payment.quantity,

                  totalSold:
                    payment.quantity,
                },
              },
              {
                returnDocument:
                  "after",

                runValidators:
                  true,

                session,
              }
            );

          if (
            !updatedStock
          ) {
            const error =
              new Error(
                "Fuel stock changed before payment finalization."
              );

            error.code =
              "STOCK_UPDATE_CONFLICT";

            throw error;
          }

          /* ---------------------------------------------
             ATOMIC NOZZLE UPDATE
          ---------------------------------------------- */

          const updatedNozzle =
            await Nozzle.findOneAndUpdate(
              {
                _id:
                  nozzle._id,

                pumpId:
                  payment.pumpId,

                currentReading:
                  payment.openingReading,

                status:
                  "active",
              },
              {
                $set: {
                  currentReading:
                    payment.closingReading,
                },
              },
              {
                returnDocument:
                  "after",

                runValidators:
                  true,

                session,
              }
            );

          if (
            !updatedNozzle
          ) {
            const error =
              new Error(
                "Nozzle reading changed before finalization."
              );

            error.code =
              "NOZZLE_UPDATE_CONFLICT";

            throw error;
          }

          /* ---------------------------------------------
             MARK PAYMENT PAID
          ---------------------------------------------- */

          payment.status =
            "paid";

          payment.providerPaymentId =
            providerPaymentId ||
            payment.providerPaymentId ||
            null;

          payment.method =
            finalPaymentMethod;

          payment.paidAt =
            now;

          payment.readingId =
            reading._id;

          payment.saleId =
            sale._id;

          if (
            eventId &&
            !payment.webhookEventIds.includes(
              eventId
            )
          ) {
            payment.webhookEventIds.push(
              eventId
            );
          }

          await payment.save({
            session,
          });

          /* ---------------------------------------------
             AUDIT
          ---------------------------------------------- */

          await AuditLog.create(
            [
              {
                pumpId:
                  payment.pumpId,

                userId:
                  payment.employeeId,

                userName:
                  payment.employeeName,

                action:
                  "payment_success",

                module:
                  "payments",

                recordId:
                  payment._id,

                description:
                  "Payment verified and marked paid.",

                newData: {
                  amount:
                    payment.amount,

                  providerPaymentId:
                    providerPaymentId ||
                    null,
                },
              },

              {
                pumpId:
                  payment.pumpId,

                userId:
                  payment.employeeId,

                userName:
                  payment.employeeName,

                action:
                  "sale_created_from_payment",

                module:
                  "sales",

                recordId:
                  sale._id,

                description:
                  "Sale created from verified payment.",

                newData: {
                  paymentId:
                    payment._id,

                  amount:
                    payment.amount,
                },
              },
            ],
            {
              session,
              ordered:
                true,
            }
          );

          result =
            sale;
        }
      );

      return result;
    } finally {
      await session.endSession();
    }
  };

/* =========================================================
   RAZORPAY WEBHOOK
========================================================= */

export const handleRazorpayWebhook =
  async (
    req,
    res
  ) => {
    const rawBody =
      req.body;

    const signature =
      req.headers[
        "x-razorpay-signature"
      ];

    /*
     * IMPORTANT:
     *
     * server.js must register this route BEFORE express.json()
     * and use express.raw({ type: "application/json" }).
     */

    if (
      !verifyWebhookSignature(
        rawBody,
        signature
      )
    ) {
      console.error(
        "RAZORPAY WEBHOOK: INVALID SIGNATURE"
      );

      return res.status(400).json({
        success: false,
        message:
          "Invalid webhook signature.",
      });
    }

    let event;

    try {
      event =
        JSON.parse(
          rawBody.toString(
            "utf8"
          )
        );
    } catch {
      console.error(
        "RAZORPAY WEBHOOK: INVALID JSON"
      );

      return res.status(400).json({
        success: false,
        message:
          "Invalid webhook payload.",
      });
    }

    try {
      const paymentEntity =
        event?.payload
          ?.payment?.entity;

      const qrEntity =
        event?.payload
          ?.qr_code?.entity;

      const paymentLinkEntity =
        event?.payload
          ?.payment_link?.entity;

      const entity =
        paymentEntity ||
        qrEntity ||
        paymentLinkEntity;

      const qrCodeId =
        qrEntity?.id ||
        entity?.qr_code_id ||
        null;

      const providerPaymentId =
        paymentEntity?.id ||
        entity?.payment_id ||
        paymentLinkEntity?.payment_id ||
        null;

      const providerOrderId =
        paymentEntity?.order_id ||
        paymentLinkEntity?.id ||
        entity?.order_id ||
        null;

      /* ---------------------------------------------
         BUILD LOOKUP
      ---------------------------------------------- */

      const lookup =
        [];

      if (
        providerPaymentId
      ) {
        lookup.push({
          providerPaymentId,
        });
      }

      if (
        providerOrderId
      ) {
        lookup.push({
          providerOrderId,
        });
      }

      if (
        qrCodeId
      ) {
        lookup.push({
          providerQrCodeId:
            qrCodeId,
        });
      }

      const payment =
        lookup.length
          ? await Payment.findOne({
              $or:
                lookup,
            })
          : null;

      /*
       * Unknown webhook.
       *
       * Acknowledge it so Razorpay does not continuously
       * retry an event that does not belong to this system.
       */

      if (!payment) {
        return res.status(200).json({
          success: true,
          message:
            "Webhook acknowledged.",
        });
      }

      /* ---------------------------------------------
         EVENT TYPE
      ---------------------------------------------- */

      const successEvent =
        event.event ===
          "payment.captured" ||
        event.event ===
          "qr_code.credited" ||
        event.event ===
          "payment_link.paid";

      const failedEvent =
        event.event ===
          "payment.failed" ||
        event.event ===
          "qr_code.closed" ||
        event.event ===
          "payment_link.cancelled" ||
        event.event ===
          "payment_link.expired";

      /* ---------------------------------------------
         SUCCESS
      ---------------------------------------------- */

      if (
        successEvent
      ) {
        const receivedAmount =
          Number(
            entity?.amount_paid ??
              entity?.paid_amount ??
              entity?.amount ??
              entity?.payment_amount ??
              0
          );

        const method =
          entity?.method ===
          "card"
            ? "card"
            : "upi";

        await finalizePaidPayment({
          paymentId:
            payment._id,

          providerPaymentId,

          method,

          eventId:
            event.id,

          payload:
            entity,
        });
      }

      /* ---------------------------------------------
         FAILED / EXPIRED / CANCELLED
      ---------------------------------------------- */

      else if (
        failedEvent &&
        payment.status ===
          "pending"
      ) {
        const nextStatus =
          event.event ===
              "qr_code.closed" ||
          event.event ===
              "payment_link.expired"
            ? "expired"
            : "failed";

        await Payment.findOneAndUpdate(
          {
            _id:
              payment._id,

            status:
              "pending",
          },
          {
            $set: {
              status:
                nextStatus,

              failureReason:
                entity?.error_description ||
                entity?.description ||
                "Payment failed.",
            },

            ...(event.id
              ? {
                  $addToSet: {
                    webhookEventIds:
                      event.id,
                  },
                }
              : {}),
          }
        );
      }

      /*
       * Always acknowledge a valid webhook after processing.
       */

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      console.error(
        "RAZORPAY WEBHOOK ERROR:",
        {
          code:
            error?.code,

          message:
            error?.message,

          event:
            event?.event,

          eventId:
            event?.id,
        }
      );

      /*
       * These are verification failures rather than
       * temporary server errors.
       */

      if (
        error?.code ===
          "PAYMENT_AMOUNT_MISMATCH" ||
        error?.code ===
          "PAYMENT_ORDER_MISMATCH"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment verification failed.",
        });
      }

      /*
       * Returning 500 allows Razorpay to retry a webhook
       * when our server/DB temporarily fails.
       */

      return res.status(500).json({
        success: false,
        message:
          "Webhook processing failed.",
      });
    }
  };