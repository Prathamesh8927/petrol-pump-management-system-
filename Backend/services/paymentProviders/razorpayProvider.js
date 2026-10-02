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
      const error = new Error(
        "Razorpay is not configured on the backend."
      );

      error.code = "RAZORPAY_NOT_CONFIGURED";

      throw error;
    }

    this.client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  /*
   * --------------------------------------------------------------------------
   * CREATE DYNAMIC QR
   * --------------------------------------------------------------------------
   *
   * First try Razorpay QR Codes API.
   *
   * If QR Codes API is not activated for the Razorpay account, automatically
   * fall back to a Razorpay Payment Link and generate a QR image from the
   * Payment Link URL.
   *
   * IMPORTANT:
   * The generated QR itself is NOT treated as proof of payment.
   * Payment is verified only through Razorpay API/webhook.
   */

  async createDynamicQr(payment) {
    const payload = {
      type: "upi_qr",
      name: "Shivshambho Petrol Pump",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: payment.amountPaise,
      description: `Employee payment ${payment._id}`,
      close_by: Math.floor(
        payment.expiresAt.getTime() / 1000
      ),
      notes: {
        payment_id: String(payment._id),
        pump_id: String(payment.pumpId),
      },
    };

    try {
      const qr = await this.client.qrCode.create(payload);

      return {
        provider: "razorpay",

        providerQrCodeId:
          qr.id || null,

        providerOrderId:
          qr.order_id ||
          qr.id ||
          null,

        qrImageUrl:
          qr.image_url ||
          qr.imageUrl ||
          "",
      };
    } catch (error) {
      const description = getProviderDescription(error);

      /*
       * Razorpay account does not have QR Codes API activated.
       *
       * Use Payment Link fallback.
       */
      if (
        description !==
        "The requested URL was not found on the server."
      ) {
        throw error;
      }

      console.warn(
        "Razorpay QR Codes API unavailable. Using Payment Link fallback."
      );

      const link =
        await this.client.paymentLink.create({
          amount: payment.amountPaise,
          currency: "INR",

          /*
           * Partial payments are disabled.
           *
           * Therefore the Payment Link must be paid for the exact
           * amount before our backend finalizes the transaction.
           */
          accept_partial: false,

          description:
            `Employee payment ${payment._id}`,

          reference_id:
            String(payment._id),

          expire_by:
            Math.floor(
              payment.expiresAt.getTime() / 1000
            ),

          notes: {
            payment_id:
              String(payment._id),

            pump_id:
              String(payment.pumpId),
          },
        });

      if (!link?.id || !link?.short_url) {
        const error = new Error(
          "Razorpay Payment Link was created without a valid link URL."
        );

        error.code =
          "RAZORPAY_PAYMENT_LINK_INVALID_RESPONSE";

        throw error;
      }

      return {
        provider: "razorpay",

        /*
         * Payment Link fallback does not have a QR Code ID.
         */
        providerQrCodeId: null,

        /*
         * Store Payment Link ID in providerOrderId.
         *
         * Example:
         * plink_TizGfHreksgxRP
         */
        providerOrderId:
          link.id,

        /*
         * Generate a QR image from Razorpay's hosted Payment Link.
         */
        qrImageUrl:
          await QRCode.toDataURL(
            link.short_url,
            {
              width: 600,
              margin: 2,
              errorCorrectionLevel: "M",
            }
          ),
      };
    }
  }

  /*
   * --------------------------------------------------------------------------
   * PAYMENT LINK RECONCILIATION
   * --------------------------------------------------------------------------
   *
   * This is used when:
   *
   *     providerOrderId = plink_...
   *
   * The backend directly asks Razorpay for the current Payment Link state.
   *
   * This is intentionally server-side.
   *
   * We DO NOT trust:
   * - frontend state
   * - QR scan result
   * - browser callbacks
   * - localStorage/sessionStorage
   *
   * Only Razorpay's authenticated API response can cause finalization.
   */

  async reconcilePaymentLink(paymentLinkId) {
    if (!paymentLinkId) {
      const error = new Error(
        "Razorpay Payment Link ID is required."
      );

      error.code =
        "RAZORPAY_PAYMENT_LINK_ID_REQUIRED";

      throw error;
    }

    /*
     * Razorpay Node SDK officially supports:
     *
     *     instance.paymentLink.fetch(paymentLinkId)
     */
    const link =
      await this.client.paymentLink.fetch(
        paymentLinkId
      );

    if (!link) {
      const error = new Error(
        "Razorpay Payment Link was not found."
      );

      error.code =
        "RAZORPAY_PAYMENT_LINK_NOT_FOUND";

      throw error;
    }

    const status =
      String(link.status || "")
        .trim()
        .toLowerCase();

    /*
     * Razorpay Payment Link returns:
     *
     * amount       -> total amount in paise
     * amount_paid  -> amount actually paid in paise
     * status       -> current Payment Link status
     */
    const amountPaise =
      Number(link.amount ?? 0);

    const amountPaidPaise =
      Number(
        link.amount_paid ??
          link.amountPaid ??
          link.paid_amount ??
          0
      );

    /*
     * Payment Link response can expose payments.
     *
     * We use it when available to obtain the actual Razorpay payment ID
     * and payment method.
     */
    const payments =
      Array.isArray(link.payments)
        ? link.payments
        : [];

    const capturedPayment =
      payments.find(
        (payment) =>
          payment?.status === "captured" ||
          payment?.captured === true
      ) || null;

    const providerPaymentId =
      capturedPayment?.id ||
      link.payment_id ||
      link.paymentId ||
      null;

    const method =
      capturedPayment?.method === "card"
        ? "card"
        : "upi";

    return {
      provider: "razorpay",

      providerOrderId:
        link.id ||
        paymentLinkId,

      status,

      amountPaise,

      amountPaidPaise,

      providerPaymentId,

      method,

      shortUrl:
        link.short_url ||
        link.shortUrl ||
        null,

      raw: link,
    };
  }

  /*
   * --------------------------------------------------------------------------
   * WEBHOOK SIGNATURE
   * --------------------------------------------------------------------------
   */

  verifyWebhook(rawBody, signature) {
    const secret =
      process.env.RAZORPAY_WEBHOOK_SECRET;

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
      left.length === right.length &&
      crypto.timingSafeEqual(
        left,
        right
      )
    );
  }

  /*
   * --------------------------------------------------------------------------
   * NORMALIZE WEBHOOK
   * --------------------------------------------------------------------------
   */

  normalizeWebhook(event) {
    const payment =
      event?.payload?.payment?.entity;

    const qrCode =
      event?.payload?.qr_code?.entity;

    const paymentLink =
      event?.payload?.payment_link?.entity;

    const entity =
      payment ||
      qrCode ||
      paymentLink;

    const paymentAmount =
      Number(
        entity?.amount_paid ??
          entity?.paid_amount ??
          entity?.amount ??
          entity?.payment_amount ??
          0
      );

    return {
      event:
        event?.event,

      eventId:
        event?.id,

      entity,

      providerPaymentId:
        payment?.id ||
        entity?.payment_id ||
        null,

      providerOrderId:
        payment?.order_id ||
        paymentLink?.id ||
        entity?.order_id ||
        null,

      providerQrCodeId:
        qrCode?.id ||
        entity?.qr_code_id ||
        null,

      amountPaise:
        paymentAmount,

      method:
        entity?.method === "card"
          ? "card"
          : "upi",
    };
  }

  /*
   * --------------------------------------------------------------------------
   * SUCCESS EVENTS
   * --------------------------------------------------------------------------
   */

  isSuccessfulEvent(eventName) {
    return [
      "payment.captured",
      "qr_code.credited",
      "payment_link.paid",
    ].includes(eventName);
  }

  /*
   * --------------------------------------------------------------------------
   * FAILED EVENTS
   * --------------------------------------------------------------------------
   */

  isFailedEvent(eventName) {
    return [
      "payment.failed",
      "qr_code.closed",
      "payment_link.cancelled",
      "payment_link.expired",
    ].includes(eventName);
  }
}