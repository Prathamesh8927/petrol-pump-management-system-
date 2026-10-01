import crypto from "crypto";
import Razorpay from "razorpay";
import QRCode from "qrcode";

const getProviderDescription = (error) =>
  error?.error?.description ||
  error?.response?.data?.error?.description ||
  error?.description ||
  error?.message ||
  "";

export default class RazorpayProvider {
  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      const error = new Error("Razorpay is not configured on the backend.");
      error.code = "RAZORPAY_NOT_CONFIGURED";
      throw error;
    }

    this.client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createDynamicQr(payment) {
    const payload = {
      type: "upi_qr",
      name: "Shivshambho Petrol Pump",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: payment.amountPaise,
      description: `Employee payment ${payment._id}`,
      close_by: Math.floor(payment.expiresAt.getTime() / 1000),
      notes: {
        payment_id: String(payment._id),
        pump_id: String(payment.pumpId),
      },
    };

    try {
      const qr = await this.client.qrCode.create(payload);
      return {
        provider: "razorpay",
        providerQrCodeId: qr.id,
        providerOrderId: qr.order_id || qr.id,
        qrImageUrl: qr.image_url || qr.imageUrl || "",
      };
    } catch (error) {
      if (getProviderDescription(error) !== "The requested URL was not found on the server.") {
        throw error;
      }

      const link = await this.client.paymentLink.create({
        amount: payment.amountPaise,
        currency: "INR",
        accept_partial: false,
        description: `Employee payment ${payment._id}`,
        reference_id: String(payment._id),
        expire_by: Math.floor(payment.expiresAt.getTime() / 1000),
        notes: {
          payment_id: String(payment._id),
          pump_id: String(payment.pumpId),
        },
      });

      return {
        provider: "razorpay",
        providerQrCodeId: null,
        providerOrderId: link.id,
        qrImageUrl: await QRCode.toDataURL(link.short_url, {
          width: 600,
          margin: 2,
          errorCorrectionLevel: "M",
        }),
      };
    }
  }

  verifyWebhook(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature || !Buffer.isBuffer(rawBody)) return false;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const left = Buffer.from(expected, "utf8");
    const right = Buffer.from(String(signature), "utf8");
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }

  normalizeWebhook(event) {
    const payment = event?.payload?.payment?.entity;
    const qrCode = event?.payload?.qr_code?.entity;
    const paymentLink = event?.payload?.payment_link?.entity;
    const entity = payment || qrCode || paymentLink;

    return {
      event: event?.event,
      eventId: event?.id,
      entity,
      providerPaymentId: payment?.id || entity?.payment_id || null,
      providerOrderId: payment?.order_id || paymentLink?.id || entity?.order_id || null,
      providerQrCodeId: qrCode?.id || entity?.qr_code_id || null,
      amountPaise: Number(entity?.amount ?? entity?.payment_amount ?? 0),
      method: entity?.method === "card" ? "card" : "upi",
    };
  }

  isSuccessfulEvent(eventName) {
    return ["payment.captured", "qr_code.credited", "payment_link.paid"].includes(eventName);
  }

  isFailedEvent(eventName) {
    return ["payment.failed", "qr_code.closed", "payment_link.cancelled", "payment_link.expired"].includes(eventName);
  }
}
