import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Building2,
  CreditCard,
  Save,
  ShieldCheck,
} from "lucide-react";

import api from "../../services/api";

/* =========================================================
   DEFAULT FORM
========================================================= */

const DEFAULT_FORM = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  branchName: "",
  accountType: "",
};

/* =========================================================
   OWNER BANK ACCOUNT SETTINGS

   IMPORTANT:
   - This section is part of the existing Pump Settings page.
   - It does NOT create a new sidebar item or route.
   - The backend masks the saved account number on GET.
   - A new account number is sent only when the owner enters one.
   - Bank details do not independently generate a verified QR.
     Razorpay remains the payment/QR provider in the current flow.
========================================================= */

const BankAccountSettings = () => {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    hasAccountNumber,
    setHasAccountNumber,
  ] = useState(false);

  const [
    maskedAccountNumber,
    setMaskedAccountNumber,
  ] = useState("");

  const [
    verified,
    setVerified,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState(DEFAULT_FORM);

  /* =======================================================
     LOAD BANK ACCOUNT
  ======================================================= */

  const loadBankAccount = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/settings/bank"
      );

      const bankAccount =
        response?.data?.bankAccount ||
        response?.bankAccount ||
        {};

      setForm({
        accountHolderName:
          bankAccount.accountHolderName ||
          "",

        bankName:
          bankAccount.bankName ||
          "",

        /*
         * Never put the masked account number into the
         * editable accountNumber field. If the owner does
         * not enter a new number, the existing one remains
         * unchanged on the backend.
         */
        accountNumber: "",

        ifsc:
          bankAccount.ifsc ||
          "",

        branchName:
          bankAccount.branchName ||
          "",

        accountType:
          bankAccount.accountType ||
          "",
      });

      setHasAccountNumber(
        bankAccount.hasAccountNumber === true
      );

      setMaskedAccountNumber(
        bankAccount.accountNumber ||
        ""
      );

      setVerified(
        bankAccount.verified === true
      );
    } catch (error) {
      console.error(
        "LOAD BANK ACCOUNT SETTINGS ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Unable to load bank account settings"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBankAccount();
  }, []);

  /* =======================================================
     HANDLE CHANGE
  ======================================================= */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =======================================================
     SAVE BANK ACCOUNT
  ======================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const accountHolderName =
      form.accountHolderName.trim();

    const bankName =
      form.bankName.trim();

    const accountNumber =
      form.accountNumber
        .trim()
        .replace(/\s+/g, "");

    const ifsc =
      form.ifsc
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

    const branchName =
      form.branchName.trim();

    const accountType =
      form.accountType.trim().toLowerCase();

    if (!accountHolderName) {
      toast.error(
        "Account holder name is required"
      );
      return;
    }

    if (!bankName) {
      toast.error(
        "Bank name is required"
      );
      return;
    }

    /*
     * Account number is required only when there is no
     * previously saved account number. When an account
     * already exists, leaving this field blank preserves it.
     */
    if (!hasAccountNumber && !accountNumber) {
      toast.error(
        "Account number is required"
      );
      return;
    }

    if (
      accountNumber &&
      !/^\d{6,30}$/.test(accountNumber)
    ) {
      toast.error(
        "Account number must contain 6 to 30 digits"
      );
      return;
    }

    if (!ifsc) {
      toast.error(
        "IFSC code is required"
      );
      return;
    }

    if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)
    ) {
      toast.error(
        "Please provide a valid IFSC code"
      );
      return;
    }

    if (
      !["savings", "current"].includes(
        accountType
      )
    ) {
      toast.error(
        "Select savings or current account"
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        accountHolderName,
        bankName,
        ifsc,
        branchName,
        accountType,
      };

      /*
       * Do not send the masked value back to the backend.
       * Only send accountNumber when the owner actually
       * entered a new one.
       */
      if (accountNumber) {
        payload.accountNumber =
          accountNumber;
      }

      const response = await api.put(
        "/settings/bank",
        payload
      );

      const savedAccount =
        response?.data?.bankAccount ||
        response?.bankAccount ||
        {};

      setHasAccountNumber(
        savedAccount.hasAccountNumber === true ||
          Boolean(accountNumber) ||
          hasAccountNumber
      );

      setMaskedAccountNumber(
        savedAccount.accountNumber ||
          (accountNumber
            ? `••••••••${accountNumber.slice(-4)}`
            : maskedAccountNumber)
      );

      setVerified(
        savedAccount.verified === true
      );

      setForm((previous) => ({
        ...previous,
        accountHolderName:
          savedAccount.accountHolderName ||
          accountHolderName,
        bankName:
          savedAccount.bankName ||
          bankName,
        accountNumber: "",
        ifsc:
          savedAccount.ifsc ||
          ifsc,
        branchName:
          savedAccount.branchName ||
          branchName,
        accountType:
          savedAccount.accountType ||
          accountType,
      }));

      toast.success(
        "Owner bank details saved successfully"
      );
    } catch (error) {
      console.error(
        "SAVE BANK ACCOUNT SETTINGS ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Unable to save bank account settings"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="content-panel"
        style={{
          marginTop: "24px",
        }}
      >
        <div className="content-panel-body">
          Loading owner bank details...
        </div>
      </div>
    );
  }

  return (
    <div
      className="content-panel"
      style={{
        marginTop: "24px",
      }}
    >
      <div className="content-panel-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CreditCard size={20} />

          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              Owner Bank Account
            </h2>

            <p
              style={{
                margin: "4px 0 0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              Settlement bank details used for payment configuration.
            </p>
          </div>
        </div>
      </div>

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
              marginBottom: "14px",
            }}
          >
            <Building2 size={18} />

            <h3
              style={{
                margin: 0,
              }}
            >
              Bank Details
            </h3>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Account Holder Name *
              </label>

              <input
                type="text"
                name="accountHolderName"
                value={
                  form.accountHolderName
                }
                onChange={handleChange}
                placeholder="Enter account holder name"
                autoComplete="off"
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
                value={form.bankName}
                onChange={handleChange}
                placeholder="Example: State Bank of India"
                autoComplete="off"
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
                type="password"
                name="accountNumber"
                value={form.accountNumber}
                onChange={handleChange}
                placeholder={
                  hasAccountNumber
                    ? maskedAccountNumber ||
                      "Enter new account number to change"
                    : "Enter account number"
                }
                inputMode="numeric"
                autoComplete="new-password"
              />

              {hasAccountNumber && (
                <small
                  style={{
                    display: "block",
                    marginTop: "7px",
                    color: "#64748b",
                  }}
                >
                  Saved account: {maskedAccountNumber}. Leave blank to keep it unchanged.
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
                value={form.ifsc}
                onChange={handleChange}
                placeholder="Example: SBIN0001234"
                autoComplete="off"
                maxLength={11}
                style={{
                  textTransform: "uppercase",
                }}
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
                value={form.branchName}
                onChange={handleChange}
                placeholder="Enter branch name"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label>
                Account Type *
              </label>

              <select
                name="accountType"
                value={form.accountType}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select account type
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
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              marginTop: "18px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <ShieldCheck
              size={18}
              style={{
                flexShrink: 0,
                marginTop: "1px",
              }}
            />

            <div>
              <strong>
                Security & QR payment note
              </strong>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                The full account number is never returned by the API. Only the last four digits are displayed after saving. These bank details do not independently generate a verified QR; the current QR payment flow uses the configured Razorpay provider.
              </p>
            </div>
          </div>

          {verified && (
            <div
              style={{
                marginTop: "12px",
                color: "#166534",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Bank account is marked as verified by the backend verification flow.
            </div>
          )}

          <div
            style={{
              marginTop: "20px",
            }}
          >
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              <Save size={17} />

              {saving
                ? "Saving..."
                : "Save Bank Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankAccountSettings;
