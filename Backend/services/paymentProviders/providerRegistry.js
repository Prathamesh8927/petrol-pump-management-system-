import BankProvider from "./bankProvider.js";
import RazorpayProvider from "./razorpayProvider.js";

export const getPaymentProvider = (pump) => {
  const provider = String(
    pump?.paymentConfig?.provider || "razorpay"
  ).trim().toLowerCase();

  if (provider === "bank") {
    return new BankProvider(pump?.paymentConfig || {});
  }

  if (provider === "razorpay") {
    return new RazorpayProvider();
  }

  const error = new Error(`Unsupported payment provider: ${provider}`);
  error.code = "UNSUPPORTED_PAYMENT_PROVIDER";
  throw error;
};

export const supportedPaymentProviders = ["razorpay", "bank"];
