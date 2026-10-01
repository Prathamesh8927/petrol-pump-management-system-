export default class BankProvider {
  constructor(config = {}) {
    this.config = config;
  }

  unavailable() {
    const error = new Error(
      "Bank provider integration requires official bank/acquirer API configuration."
    );
    error.code = "BANK_PROVIDER_NOT_CONFIGURED";
    throw error;
  }

  createDynamicQr() { return this.unavailable(); }
  getPaymentStatus() { return this.unavailable(); }
  verifyWebhook() { return this.unavailable(); }
  handleWebhook() { return this.unavailable(); }
  cancelPayment() { return this.unavailable(); }
  reconcilePayment() { return this.unavailable(); }
}
