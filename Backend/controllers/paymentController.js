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
import { getPaymentProvider } from "../services/paymentProviders/providerRegistry.js";

const ALLOWED_STAFF_ROLES = ["owner", "manager", "staff"];
const ALLOWED_SHIFTS = new Set(["morning", "evening", "night"]);
const PAYMENT_TTL_MINUTES = 20;
const MAX_STANDALONE_AMOUNT = 1000000;

const getPumpId = (req) =>
  req.user?.pumpId?._id || req.user?.pumpId || null;

const getUserId = (req) =>
  req.user?._id || req.user?.userId || null;

const asObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value)
    ? new mongoose.Types.ObjectId(value)
    : null;

const round = (value) =>
  Number(Number(value).toFixed(2));

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const getIndiaDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const safePayment = (payment) => ({
  id: payment._id,
  amount: payment.amount,
  amountPaise: payment.amountPaise,
  provider: payment.paymentProvider,
  fuelType: payment.fuelType,
  quantity: payment.quantity,
  nozzleId: payment.nozzleId,
  shiftName: payment.shiftName,
  readingDate: payment.readingDate,
  status: payment.status,
  method: payment.method,
  providerPaymentId: payment.providerPaymentId || null,
  providerOrderId: payment.providerOrderId || null,
  qrCodeId: payment.providerQrCodeId || null,
  qrImageUrl: payment.qrImageUrl || null,
  expiresAt: payment.expiresAt,
  paidAt: payment.paidAt,
  failureReason: payment.failureReason || null,
  saleId: payment.saleId || null,
});

const findPaymentForPump = async (id, pumpId) => {
  if (!asObjectId(id)) return null;

  return Payment.findOne({
    _id: id,
    pumpId,
  });
};

/*
 * Prevent browser/CDN/proxy caching for payment status.
 *
 * Payment status is dynamic and must never be served from an old
 * browser cache while a Razorpay transaction is changing state.
 */
const disablePaymentStatusCache = (res) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
};

/*
 * --------------------------------------------------------------------------
 * CREATE ADMIN/NOZZLE PAYMENT
 * --------------------------------------------------------------------------
 */

export const createPayment = async (req, res) => {
  let payment = null;

  try {
    const pumpId = getPumpId(req);
    const userId = getUserId(req);

    if (!pumpId || !userId) {
      return res.status(403).json({
        success: false,
        message: "Pump or user information not found.",
      });
    }

    const pump = await Pump.findById(pumpId).select("paymentConfig");

    if (!pump) {
      return res.status(404).json({
        success: false,
        message: "Pump not found.",
      });
    }

    if (
      pump.paymentConfig?.enabled === false ||
      pump.paymentConfig?.dynamicQrEnabled === false
    ) {
      return res.status(503).json({
        success: false,
        message: "Digital payments are disabled for this pump.",
      });
    }

    const body = req.body || {};

    const nozzleId = asObjectId(body.nozzleId);
    const staffId = asObjectId(
      body.staffId || body.employeeId
    );

    const shiftName = normalize(
      body.shiftName || body.shift
    );

    const readingDate = String(
      body.readingDate ||
        body.date ||
        getIndiaDate()
    ).trim();

    const closingReading = Number(
      body.closingReading ?? body.reading
    );

    const note = String(body.note || "").trim();

    if (!nozzleId || !staffId) {
      return res.status(400).json({
        success: false,
        message:
          "Valid nozzle and staff member are required.",
      });
    }

    if (!ALLOWED_SHIFTS.has(shiftName)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift.",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(readingDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reading date.",
      });
    }

    if (
      !Number.isFinite(closingReading) ||
      closingReading < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid closing reading.",
      });
    }

    if (note.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Note cannot exceed 500 characters.",
      });
    }

    const [staff, nozzle] = await Promise.all([
      User.findOne({
        _id: staffId,
        pumpId,
        active: true,
        role: { $in: ALLOWED_STAFF_ROLES },
      }).select("_id name email"),

      Nozzle.findOne({
        _id: nozzleId,
        pumpId,
        status: "active",
      }),
    ]);

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
        message: "Nozzle not found or inactive.",
      });
    }

    const openingReading = Number(
      nozzle.currentReading
    );

    const fuelType = normalize(nozzle.fuelType);

    if (
      !Number.isFinite(openingReading) ||
      closingReading <= openingReading
    ) {
      return res.status(400).json({
        success: false,
        message: `Closing reading must be greater than ${openingReading}.`,
      });
    }

    const litresSold = round(
      closingReading - openingReading
    );

    const priceRecord = await FuelPrice.findOne({
      pumpId,
      fuelType,
    }).lean();

    const pricePerLitre = Number(
      priceRecord?.price
    );

    if (
      !Number.isFinite(pricePerLitre) ||
      pricePerLitre <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Fuel price is not configured.",
      });
    }

    const amount = round(
      litresSold * pricePerLitre
    );

    const amountPaise = Math.round(
      amount * 100
    );

    if (amountPaise <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Calculated amount must be greater than zero.",
      });
    }

    const reservationKey =
      `${pumpId}:${nozzleId}:${readingDate}:${shiftName}`;

    const existing = await Payment.findOne({
      reservationKey,
      status: "pending",
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message:
          "An active payment already exists for this reading.",
        payment: safePayment(existing),
      });
    }

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

    payment = await Payment.create({
      pumpId,
      employeeId: staff._id,
      userId,
      employeeName: String(
        staff.name ||
          staff.email ||
          "Staff"
      )
        .trim()
        .slice(0, 150),

      paymentProvider:
        pump.paymentConfig?.provider ||
        "razorpay",

      nozzleId,
      shiftName,
      readingDate,

      openingReading,
      closingReading,
      fuelType,
      quantity: litresSold,
      pricePerLitre,

      amount,
      amountPaise,

      method: "upi",
      status: "pending",

      expiresAt: new Date(
        Date.now() +
          PAYMENT_TTL_MINUTES *
            60 *
            1000
      ),

      reservationKey,
      note,
    });

    const provider =
      getPaymentProvider(pump);

    const providerPayment =
      await provider.createDynamicQr(payment);

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

    await AuditLog.create({
      pumpId,
      userId,
      userName: String(
        req.user?.name ||
          req.user?.email ||
          ""
      ).slice(0, 100),

      action: "payment_created",
      module: "payments",
      recordId: payment._id,

      description:
        "Razorpay payment QR created.",

      newData: {
        amount: payment.amount,
        status: payment.status,
      },

      ipAddress: req.ip || "",
    }).catch((auditError) =>
      console.error(
        "PAYMENT AUDIT ERROR:",
        auditError.message
      )
    );

    return res.status(201).json({
      success: true,
      message: "Payment QR generated.",
      payment: safePayment(payment),
    });
  } catch (error) {
    console.error(
      "CREATE PAYMENT ERROR:",
      {
        code: error?.code,
        message: error?.message,
      }
    );

    if (payment?._id) {
      await Payment.findByIdAndUpdate(
        payment._id,
        {
          status: "failed",
          failureReason:
            "Unable to create provider payment.",
        }
      ).catch(() => {});
    }

    if (error?.code === 11000) {
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
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate payment QR.",
    });
  }
};

/*
 * --------------------------------------------------------------------------
 * CREATE EMPLOYEE STANDALONE PAYMENT
 * --------------------------------------------------------------------------
 */

export const createEmployeePayment = async (
  req,
  res
) => {
  let payment = null;

  try {
    const pumpId = getPumpId(req);
    const employeeId = getUserId(req);

    const amount = Number(
      req.body?.amount
    );

    if (!pumpId || !employeeId) {
      return res.status(403).json({
        success: false,
        message:
          "Pump or employee information not found.",
      });
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > MAX_STANDALONE_AMOUNT
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid payment amount.",
      });
    }

    const amountPaise =
      Math.round(amount * 100);

    if (
      amountPaise <= 0 ||
      amountPaise >
        MAX_STANDALONE_AMOUNT * 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid payment amount.",
      });
    }

    const employeeName = String(
      req.user?.name ||
        req.user?.email ||
        "Employee"
    )
      .trim()
      .slice(0, 150);

    const pump =
      await Pump.findById(pumpId)
        .select("paymentConfig");

    if (!pump) {
      return res.status(404).json({
        success: false,
        message: "Pump not found.",
      });
    }

    if (
      pump.paymentConfig?.enabled === false ||
      pump.paymentConfig?.dynamicQrEnabled === false
    ) {
      return res.status(503).json({
        success: false,
        message:
          "Digital payments are disabled for this pump.",
      });
    }

    payment = await Payment.create({
      pumpId,

      employeeId,
      userId: employeeId,

      employeeName,

      transactionType:
        "standalone",

      paymentProvider:
        pump.paymentConfig?.provider ||
        "razorpay",

      amount:
        round(amountPaise / 100),

      amountPaise,

      method: "upi",
      status: "pending",

      expiresAt: new Date(
        Date.now() +
          PAYMENT_TTL_MINUTES *
            60 *
            1000
      ),

      reservationKey:
        `standalone:${pumpId}:${employeeId}:${crypto.randomUUID()}`,
    });

    const provider =
      getPaymentProvider(pump);

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
      "========== EMPLOYEE PAYMENT CREATED =========="
    );

    console.log({
      paymentId: String(payment._id),
      provider: payment.paymentProvider,
      providerOrderId:
        payment.providerOrderId,
      qrCodeId:
        payment.providerQrCodeId,
      amountPaise:
        payment.amountPaise,
    });

    console.log(
      "==============================================="
    );

    return res.status(201).json({
      success: true,
      payment: safePayment(payment),
    });
  } catch (error) {
    console.error(
      "========== RAZORPAY FULL ERROR =========="
    );

    console.error("code:", error?.code);
    console.error(
      "status code:",
      error?.statusCode
    );
    console.error(
      "message:",
      error?.message
    );
    console.error(
      "description:",
      error?.description
    );

    console.error(
      "error.response?.data:",
      error?.response?.data
    );

    console.error(
      "=========================================="
    );

    if (payment?._id) {
      await Payment.findByIdAndUpdate(
        payment._id,
        {
          status: "failed",
          failureReason:
            "Unable to create provider payment.",
        }
      ).catch(() => {});
    }

    if (
      error?.code ===
        "RAZORPAY_NOT_CONFIGURED" ||
      error?.code ===
        "BANK_PROVIDER_NOT_CONFIGURED"
    ) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    const razorpayMessage =
      error?.error?.description ||
      error?.response?.data?.error?.description ||
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
      error?.statusCode === 400 ||
      error?.statusCode === 401 ||
      error?.statusCode === 403
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

/*
 * --------------------------------------------------------------------------
 * RAZORPAY PAYMENT LINK RECONCILIATION
 * --------------------------------------------------------------------------
 *
 * This is the major reliability improvement.
 *
 * If the DB says pending and this payment has a Razorpay Payment Link,
 * we ask Razorpay directly whether that Payment Link is actually paid.
 *
 * We do NOT trust:
 * - frontend status
 * - browser callbacks
 * - QR scanning
 * - client-side JavaScript
 *
 * Only the authenticated Razorpay API response can trigger finalization.
 */

const reconcilePendingRazorpayPayment =
  async (payment) => {
    if (
      !payment ||
      payment.status !== "pending"
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

    /*
     * The QR Codes API uses providerQrCodeId.
     * The Payment Link fallback uses a plink_ ID.
     *
     * Reconciliation is intended for Payment Links.
     */
    const providerOrderId =
      String(payment.providerOrderId);

    if (
      !providerOrderId.startsWith(
        "plink_"
      )
    ) {
      return payment;
    }

    if (
      payment.expiresAt &&
      payment.expiresAt <= new Date()
    ) {
      return payment;
    }

    try {
      const pump =
        await Pump.findById(
          payment.pumpId
        ).select("paymentConfig");

      if (!pump) {
        return payment;
      }

      const provider =
        getPaymentProvider(pump);

      if (
        typeof provider.reconcilePaymentLink !==
        "function"
      ) {
        console.warn(
          "RAZORPAY RECONCILIATION: provider does not support Payment Link reconciliation."
        );

        return payment;
      }

      const reconciliation =
        await provider.reconcilePaymentLink(
          providerOrderId
        );

      console.log(
        "RAZORPAY PAYMENT LINK RECONCILIATION:",
        {
          paymentId: String(
            payment._id
          ),
          providerOrderId,
          razorpayStatus:
            reconciliation.status,
          expectedAmountPaise:
            payment.amountPaise,
          razorpayAmountPaise:
            reconciliation.amountPaise,
          razorpayAmountPaidPaise:
            reconciliation.amountPaidPaise,
          providerPaymentId:
            reconciliation.providerPaymentId ||
            null,
        }
      );

      const razorpayStatus =
        String(
          reconciliation.status || ""
        ).toLowerCase();

      /*
       * Payment Link must be fully paid.
       */
      const paid =
        razorpayStatus === "paid" &&
        Number(
          reconciliation.amountPaidPaise
        ) ===
          Number(
            payment.amountPaise
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

          eventId: null,

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

      /*
       * If Razorpay says the link is expired/cancelled,
       * synchronize our local state.
       */
      if (
        razorpayStatus === "expired" ||
        razorpayStatus === "cancelled"
      ) {
        if (
          payment.status ===
          "pending"
        ) {
          payment.status =
            razorpayStatus ===
            "expired"
              ? "expired"
              : "cancelled";

          payment.failureReason =
            `Razorpay Payment Link ${razorpayStatus}.`;

          await payment.save();
        }

        return payment;
      }

      return payment;
    } catch (error) {
      /*
       * Reconciliation must NEVER make a legitimate pending
       * payment fail merely because Razorpay's API temporarily
       * failed.
       */
      console.error(
        "RAZORPAY PAYMENT LINK RECONCILIATION ERROR:",
        {
          paymentId: String(
            payment._id
          ),
          providerOrderId:
            payment.providerOrderId,
          code: error?.code,
          message:
            error?.message,
        }
      );

      return payment;
    }
  };

/*
 * --------------------------------------------------------------------------
 * PAYMENT STATUS
 * --------------------------------------------------------------------------
 */

export const getPaymentStatus =
  async (req, res) => {
    disablePaymentStatusCache(res);

    try {
      const query = {
        _id: asObjectId(
          req.params.id
        ),
        pumpId: getPumpId(req),
      };

      if (
        ["staff", "employee"].includes(
          String(
            req.user?.role || ""
          ).toLowerCase()
        )
      ) {
        query.employeeId =
          getUserId(req);
      }

      let payment = query._id
        ? await Payment.findOne(
            query
          )
        : null;

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found.",
        });
      }

      /*
       * First perform server-side reconciliation
       * for a still-pending Razorpay Payment Link.
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
       * Local expiry check happens after reconciliation.
       * This prevents us from expiring a payment that Razorpay
       * has already confirmed as paid.
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
          safePayment(payment),
      });
    } catch (error) {
      console.error(
        "GET PAYMENT STATUS ERROR:",
        {
          code: error?.code,
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

/*
 * --------------------------------------------------------------------------
 * CANCEL PAYMENT
 * --------------------------------------------------------------------------
 */

export const cancelPayment =
  async (req, res) => {
    try {
      const query = {
        _id: asObjectId(
          req.params.id
        ),
        pumpId: getPumpId(req),
      };

      if (
        ["staff", "employee"].includes(
          String(
            req.user?.role || ""
          ).toLowerCase()
        )
      ) {
        query.employeeId =
          getUserId(req);
      }

      const payment = query._id
        ? await Payment.findOne(
            query
          )
        : null;

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
        payment.status =
          "cancelled";

        payment.failureReason =
          "Cancelled by employee.";

        await payment.save();
      }

      return res.status(200).json({
        success: true,
        payment:
          safePayment(payment),
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

/*
 * --------------------------------------------------------------------------
 * WEBHOOK SIGNATURE
 * --------------------------------------------------------------------------
 */

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
    !Buffer.isBuffer(rawBody)
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
      String(signature),
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

/*
 * --------------------------------------------------------------------------
 * FINALIZE VERIFIED PAYMENT
 * --------------------------------------------------------------------------
 */

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
              _id: paymentId,
              status: "pending",
            }).session(session);

          /*
           * Idempotency:
           * if webhook/reconciliation arrives twice after the first
           * successful finalization, simply do nothing.
           */
          if (!payment) {
            return;
          }

          /*
           * We deliberately do not allow an expired payment to become
           * paid merely because a late webhook arrived.
           */
          if (
            payment.expiresAt <=
            new Date()
          ) {
            payment.status =
              "expired";

            payment.failureReason =
              "Payment confirmation arrived after expiry.";

            await payment.save({
              session,
            });

            return;
          }

          /*
           * Razorpay may expose different amount fields depending
           * on event type.
           *
           * Payment Link:
           *   amount_paid
           *
           * Payment:
           *   amount
           *
           * QR:
           *   payment_amount / amount
           */
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
              payment.amountPaise
          ) {
            const error =
              new Error(
                "Payment amount does not match the expected amount."
              );

            error.code =
              "PAYMENT_AMOUNT_MISMATCH";

            throw error;
          }

          /*
           * Payment Link ID / Order ID verification.
           */
          const receivedOrderId =
  payload?.order_id ||
  payload?.payment_link_id ||
  (
    payload?.id &&
    String(payload.id).startsWith("plink_")
      ? payload.id
      : null
  );

          if (
            receivedOrderId &&
            payment.providerOrderId &&
            receivedOrderId !==
              payment.providerOrderId
          ) {
            const error =
              new Error(
                "Payment order does not match the expected order."
              );

            error.code =
              "PAYMENT_ORDER_MISMATCH";

            throw error;
          }

          /*
           * If a Sale already exists, synchronize the Payment
           * instead of creating a duplicate Sale.
           */
          const existingSale =
            await Sale.findOne({
              paymentId:
                payment._id,
            }).session(session);

          if (existingSale) {
            payment.status =
              "paid";

            payment.providerPaymentId =
              providerPaymentId ||
              payment.providerPaymentId;

            payment.paidAt =
              payment.paidAt ||
              new Date();

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

          /*
           * --------------------------------------------------------------
           * STANDALONE EMPLOYEE PAYMENT
           * --------------------------------------------------------------
           */

          if (
            payment.transactionType ===
            "standalone"
          ) {
            const [sale] =
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
                { session }
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
              new Date();

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
              { session }
            );

            result =
              sale;

            return;
          }

          /*
           * --------------------------------------------------------------
           * NOZZLE PAYMENT
           * --------------------------------------------------------------
           */

          const nozzle =
            await Nozzle.findOne({
              _id:
                payment.nozzleId,

              pumpId:
                payment.pumpId,

              status:
                "active",
            }).session(session);

          if (
            !nozzle ||
            Number(
              nozzle.currentReading
            ) !==
              payment.openingReading
          ) {
            const error =
              new Error(
                "Nozzle reading changed before payment confirmation."
              );

            error.code =
              "NOZZLE_READING_CONFLICT";

            throw error;
          }

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
            ).session(session);

          if (duplicateReading) {
            const error =
              new Error(
                "A final reading already exists for this shift."
              );

            error.code =
              "SHIFT_READING_ALREADY_EXISTS";

            throw error;
          }

          const stock =
            await FuelStock.findOne({
              pumpId:
                payment.pumpId,

              fuelType:
                payment.fuelType,
            }).session(session);

          if (
            !stock ||
            Number(
              stock.currentStock
            ) <
              payment.quantity
          ) {
            const error =
              new Error(
                "Insufficient fuel stock for this paid transaction."
              );

            error.code =
              "INSUFFICIENT_FUEL_STOCK";

            throw error;
          }

          const [reading] =
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
                    method === "card"
                      ? "card"
                      : "upi",

                  note:
                    payment.note,

                  createdBy:
                    payment.employeeId,
                },
              ],
              { session }
            );

          const [sale] =
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
                    method === "card"
                      ? "card"
                      : "upi",

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
              { session }
            );

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
            !updatedStock ||
            !updatedNozzle
          ) {
            const error =
              new Error(
                "The paid transaction could not update stock or nozzle safely."
              );

            error.code =
              "FINALIZATION_CONFLICT";

            throw error;
          }

          payment.status =
            "paid";

          payment.providerPaymentId =
            providerPaymentId ||
            payment.providerPaymentId ||
            null;

          payment.method =
            method === "card"
              ? "card"
              : "upi";

          payment.paidAt =
            new Date();

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
                  "Razorpay payment verified and marked paid.",

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
                  "Sale created from verified Razorpay payment.",

                newData: {
                  paymentId:
                    payment._id,

                  amount:
                    payment.amount,
                },
              },
            ],
            { session }
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

/*
 * --------------------------------------------------------------------------
 * RAZORPAY WEBHOOK
 * --------------------------------------------------------------------------
 */

export const handleRazorpayWebhook =
  async (req, res) => {
    const rawBody =
      req.body;

    const signature =
      req.headers[
        "x-razorpay-signature"
      ];

    console.log(
      "========== RAZORPAY WEBHOOK RECEIVED =========="
    );

    console.log({
      hasRawBody:
        Buffer.isBuffer(
          rawBody
        ),

      bodyBytes:
        Buffer.isBuffer(
          rawBody
        )
          ? rawBody.length
          : 0,

      hasSignature:
        Boolean(signature),

      webhookSecretConfigured:
        Boolean(
          process.env
            .RAZORPAY_WEBHOOK_SECRET
        ),
    });

    /*
     * NEVER log:
     * - webhook secret
     * - Razorpay API secret
     * - full authorization headers
     * - raw payment payload
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
      event = JSON.parse(
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

    console.log(
      "RAZORPAY WEBHOOK EVENT:",
      {
        event:
          event?.event,

        eventId:
          event?.id,
      }
    );

    try {
      const paymentEntity =
        event?.payload?.payment
          ?.entity;

      const qrEntity =
        event?.payload?.qr_code
          ?.entity;

      const paymentLinkEntity =
        event?.payload?.payment_link
          ?.entity;

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

      const lookup = [];

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

      console.log(
        "RAZORPAY WEBHOOK LOOKUP:",
        {
          providerPaymentId:
            providerPaymentId ||
            null,

          providerOrderId:
            providerOrderId ||
            null,

          qrCodeId:
            qrCodeId ||
            null,
        }
      );

      const payment =
        lookup.length
          ? await Payment.findOne(
              {
                $or: lookup,
              }
            )
          : null;

      if (!payment) {
        console.warn(
          "RAZORPAY WEBHOOK: PAYMENT NOT FOUND"
        );

        /*
         * Acknowledge unknown webhook IDs so Razorpay does not
         * continuously retry an event that belongs to another
         * transaction/account/environment.
         */
        return res.status(200).json({
          success: true,
          message:
            "Webhook acknowledged.",
        });
      }

      console.log(
        "RAZORPAY WEBHOOK PAYMENT FOUND:",
        {
          paymentId:
            String(
              payment._id
            ),

          currentStatus:
            payment.status,

          expectedAmountPaise:
            payment.amountPaise,

          providerOrderId:
            payment.providerOrderId,
        }
      );

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

      if (
        successEvent
      ) {
        /*
         * Payment Link events can use amount_paid.
         */
        const receivedAmount =
          Number(
            entity?.amount_paid ??
              entity?.paid_amount ??
              entity?.amount ??
              entity?.payment_amount ??
              0
          );

        console.log(
          "RAZORPAY WEBHOOK PAYMENT DATA:",
          {
            event:
              event.event,

            receivedAmount,

            expectedAmount:
              payment.amountPaise,

            providerPaymentId:
              providerPaymentId ||
              null,

            providerOrderId:
              providerOrderId ||
              null,
          }
        );

        const method =
          entity?.method ===
          "card"
            ? "card"
            : "upi";

        await finalizePaidPayment(
          {
            paymentId:
              payment._id,

            providerPaymentId,

            method,

            eventId:
              event.id,

            payload: entity,
          }
        );

        console.log(
          "RAZORPAY WEBHOOK: PAYMENT FINALIZATION COMPLETE",
          {
            paymentId:
              String(
                payment._id
              ),
          }
        );
      } else if (
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

      return res.status(500).json({
        success: false,
        message:
          "Webhook processing failed.",
      });
    }
  };