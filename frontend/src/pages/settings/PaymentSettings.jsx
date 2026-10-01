import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  Building2,
  CreditCard,
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  getPaymentSettings,
  updatePaymentSettings,
  getBankAccountSettings,
  updateBankAccountSettings,
} from "../../services/settingsService";

const DEFAULT_CONFIG = {
  provider: "razorpay",
  enabled: true,
  merchantId: "",
  terminalId: "",
  merchantVpa: "",
  dynamicQrEnabled: true,
  webhookEnabled: false,
  status: "connected",
};

const DEFAULT_BANK_ACCOUNT = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  branchName: "",
  accountType: "",
  verified: false,
  verifiedAt: null,
  hasAccountNumber: false,
};

const PaymentSettings = () => {
  const [config, setConfig] =
    useState(DEFAULT_CONFIG);

  const [bankAccount, setBankAccount] =
    useState(DEFAULT_BANK_ACCOUNT);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [savingBank, setSavingBank] =
    useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const [
        paymentResponse,
        bankResponse,
      ] = await Promise.all([
        getPaymentSettings(),
        getBankAccountSettings(),
      ]);

      setConfig({
        ...DEFAULT_CONFIG,
        ...(paymentResponse?.paymentConfig || {}),
      });

      setBankAccount({
        ...DEFAULT_BANK_ACCOUNT,
        ...(bankResponse?.bankAccount || {}),
      });
    } catch (error) {
      console.error(
        "LOAD PAYMENT SETTINGS ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Unable to load payment settings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);

        const [
          paymentResponse,
          bankResponse,
        ] = await Promise.all([
          getPaymentSettings(),
          getBankAccountSettings(),
        ]);

        if (!mounted) {
          return;
        }

        setConfig({
          ...DEFAULT_CONFIG,
          ...(paymentResponse?.paymentConfig || {}),
        });

        setBankAccount({
          ...DEFAULT_BANK_ACCOUNT,
          ...(bankResponse?.bankAccount || {}),
        });
      } catch (error) {
        if (mounted) {
          console.error(
            "LOAD PAYMENT SETTINGS ERROR:",
            error
          );

          toast.error(
            error?.response?.data?.message ||
              "Unable to load payment settings."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setConfig((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const updateBankField = (event) => {
    const {
      name,
      value,
    } = event.target;

    setBankAccount((previous) => ({
      ...previous,
      [name]:
        name === "ifsc"
          ? value
              .toUpperCase()
              .replace(/\s+/g, "")
          : value,
    }));
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    try {
      setSaving(true);

      const response =
        await updatePaymentSettings(
          config
        );

      setConfig((previous) => ({
        ...previous,
        ...(response?.paymentConfig ||
          {}),
      }));

      toast.success(
        "Payment settings saved."
      );
    } catch (error) {
      console.error(
        "SAVE PAYMENT SETTINGS ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Unable to save payment settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBankSubmit =
    async (event) => {
      event.preventDefault();

      const accountHolderName =
        bankAccount.accountHolderName.trim();

      const bankName =
        bankAccount.bankName.trim();

      const accountNumber =
        bankAccount.accountNumber
          .trim()
          .replace(/\s+/g, "");

      const ifsc =
        bankAccount.ifsc
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "");

      const branchName =
        bankAccount.branchName.trim();

      const accountType =
        bankAccount.accountType
          .trim()
          .toLowerCase();

      if (!accountHolderName) {
        toast.error(
          "Account holder name is required."
        );
        return;
      }

      if (!bankName) {
        toast.error(
          "Bank name is required."
        );
        return;
      }

      /*
       * If the backend returned a masked number,
       * don't send that masked value back.
       *
       * The user only needs to enter the account
       * number when adding/changing it.
       */
      const isMaskedAccountNumber =
        accountNumber.includes("•") ||
        accountNumber.includes("*");

      if (
        !accountNumber ||
        isMaskedAccountNumber
      ) {
        toast.error(
          "Please enter the full account number."
        );
        return;
      }

      if (
        !/^\d{6,30}$/.test(
          accountNumber
        )
      ) {
        toast.error(
          "Account number must contain 6 to 30 digits."
        );
        return;
      }

      if (
        !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
          ifsc
        )
      ) {
        toast.error(
          "Please provide a valid IFSC code."
        );
        return;
      }

      if (
        !["savings", "current"].includes(
          accountType
        )
      ) {
        toast.error(
          "Please select account type."
        );
        return;
      }

      try {
        setSavingBank(true);

        const response =
          await updateBankAccountSettings({
            accountHolderName,
            bankName,
            accountNumber,
            ifsc,
            branchName,
            accountType,
          });

        setBankAccount({
          ...DEFAULT_BANK_ACCOUNT,
          ...(response?.bankAccount || {}),
        });

        toast.success(
          "Bank account details saved successfully."
        );

        /*
         * Reload once more so the UI always displays
         * the backend's masked account number.
         */
        const refreshed =
          await getBankAccountSettings();

        setBankAccount({
          ...DEFAULT_BANK_ACCOUNT,
          ...(refreshed?.bankAccount || {}),
        });
      } catch (error) {
        console.error(
          "SAVE BANK ACCOUNT ERROR:",
          error
        );

        toast.error(
          error?.response?.data?.message ||
            "Unable to save bank account details."
        );
      } finally {
        setSavingBank(false);
      }
    };

  if (loading) {
    return (
      <div className="page-container">
        Loading payment settings...
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>
            Payment Setup
          </h1>

          <p>
            Configure the payment provider
            and owner bank account for
            this pump.
          </p>
        </div>
      </div>

      {/* =================================================
          PAYMENT PROVIDER
      ================================================= */}

      <div className="content-panel">
        <div className="content-panel-body">
          <form
            className="clean-form"
            onSubmit={handleSubmit}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "18px",
              }}
            >
              <CreditCard
                size={20}
              />

              <h2
                style={{
                  margin: 0,
                }}
              >
                Payment Provider
              </h2>
            </div>

            <div className="form-group">
              <label htmlFor="payment-provider">
                Provider
              </label>

              <select
                id="payment-provider"
                name="provider"
                value={config.provider}
                onChange={updateField}
              >
                <option value="razorpay">
                  Razorpay
                </option>

                <option value="bank">
                  Bank / Acquirer
                  (official adapter
                  required)
                </option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="payment-merchant-id">
                  Merchant ID
                </label>

                <input
                  id="payment-merchant-id"
                  name="merchantId"
                  value={
                    config.merchantId
                  }
                  onChange={updateField}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label htmlFor="payment-terminal-id">
                  Terminal ID
                </label>

                <input
                  id="payment-terminal-id"
                  name="terminalId"
                  value={
                    config.terminalId
                  }
                  onChange={updateField}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="payment-merchant-vpa">
                Merchant UPI ID
              </label>

              <input
                id="payment-merchant-vpa"
                name="merchantVpa"
                value={
                  config.merchantVpa
                }
                onChange={updateField}
                placeholder="pump@bank"
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <input
                type="checkbox"
                name="enabled"
                checked={config.enabled}
                onChange={updateField}
              />

              Enable payments
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <input
                type="checkbox"
                name="dynamicQrEnabled"
                checked={
                  config.dynamicQrEnabled
                }
                onChange={updateField}
              />

              Enable dynamic QR
            </label>

            <p>
              Merchant status:{" "}
              <strong>
                {config.status}
              </strong>
            </p>

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              <Save size={17} />

              {saving
                ? "Saving..."
                : "Save Payment Setup"}
            </button>
          </form>
        </div>
      </div>

      {/* =================================================
          OWNER BANK ACCOUNT
      ================================================= */}

      <div
        className="content-panel"
        style={{
          marginTop: "24px",
        }}
      >
        <div className="content-panel-body">
          <form
            className="clean-form"
            onSubmit={
              handleBankSubmit
            }
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <Building2
                size={20}
              />

              <h2
                style={{
                  margin: 0,
                }}
              >
                Owner Bank Account
              </h2>
            </div>

            <p
              style={{
                color: "#64748b",
                marginBottom: "20px",
              }}
            >
              Add the bank account details
              used for the pump owner's
              settlement configuration.
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Account Holder Name *
                </label>

                <input
                  type="text"
                  name="accountHolderName"
                  value={
                    bankAccount.accountHolderName
                  }
                  onChange={
                    updateBankField
                  }
                  placeholder="Enter account holder name"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Bank Name *
                </label>

                <input
                  type="text"
                  name="bankName"
                  value={
                    bankAccount.bankName
                  }
                  onChange={
                    updateBankField
                  }
                  placeholder="Example: State Bank of India"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Account Number *
                </label>

                <input
                  type="text"
                  name="accountNumber"
                  value={
                    bankAccount.accountNumber
                  }
                  onChange={
                    updateBankField
                  }
                  placeholder={
                    bankAccount.hasAccountNumber
                      ? "Enter again to change account number"
                      : "Enter account number"
                  }
                  inputMode="numeric"
                  autoComplete="off"
                  required
                />

                {bankAccount.hasAccountNumber &&
                  bankAccount.accountNumber &&
                  bankAccount.accountNumber.includes(
                    "•"
                  ) && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "7px",
                        color:
                          "#64748b",
                      }}
                    >
                      Existing account:
                      {" "}
                      {
                        bankAccount.accountNumber
                      }
                    </small>
                  )}
              </div>

              <div className="form-group">
                <label>
                  IFSC Code *
                </label>

                <input
                  type="text"
                  name="ifsc"
                  value={
                    bankAccount.ifsc
                  }
                  onChange={
                    updateBankField
                  }
                  placeholder="Example: SBIN0001234"
                  maxLength={11}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  Branch Name
                </label>

                <input
                  type="text"
                  name="branchName"
                  value={
                    bankAccount.branchName
                  }
                  onChange={
                    updateBankField
                  }
                  placeholder="Enter branch name"
                />
              </div>

              <div className="form-group">
                <label>
                  Account Type *
                </label>

                <select
                  name="accountType"
                  value={
                    bankAccount.accountType
                  }
                  onChange={
                    updateBankField
                  }
                  required
                >
                  <option value="">
                    Select Account Type
                  </option>

                  <option value="savings">
                    Savings
                  </option>

                  <option value="current">
                    Current
                  </option>
                </select>
              </div>
            </div>

            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                borderRadius: "8px",
                background:
                  "#f8fafc",
                display: "flex",
                alignItems:
                  "flex-start",
                gap: "10px",
              }}
            >
              <ShieldCheck
                size={20}
              />

              <div>
                <strong>
                  Account Security
                </strong>

                <p
                  style={{
                    margin:
                      "5px 0 0",
                    color:
                      "#64748b",
                    fontSize:
                      "14px",
                  }}
                >
                  The full account number
                  is stored on the backend
                  and returned to the
                  frontend in masked form
                  after saving.
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: "20px",
                display: "flex",
                alignItems:
                  "center",
                gap: "12px",
              }}
            >
              <button
                type="submit"
                className="primary-button"
                disabled={
                  savingBank
                }
              >
                <Save size={17} />

                {savingBank
                  ? "Saving..."
                  : "Save Bank Details"}
              </button>

              {bankAccount.verified ===
                true && (
                <span
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: "5px",
                    color:
                      "#16a34a",
                    fontWeight:
                      600,
                  }}
                >
                  <ShieldCheck
                    size={17}
                  />

                  Verified
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;