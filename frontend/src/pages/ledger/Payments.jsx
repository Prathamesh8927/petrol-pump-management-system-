import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  getLedgerCustomers,
  addLedgerPayment,
} from "../../services/ledgerService";

const getToday = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
};

const Payments = () => {
  const [customers, setCustomers] = useState([]);

  const [form, setForm] = useState({
    customerId: "",
    amount: "",
    entryDate: getToday(),
    note: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadCustomers = useCallback(
    async ({ silent = false } = {}) => {
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;

      if (!silent && mountedRef.current) {
        setLoading(true);
      }

      try {
        const data = await getLedgerCustomers();

        const list = Array.isArray(data?.customers)
          ? data.customers
          : [];

        const pendingCustomers = list.filter((customer) => {
          const pending = Number(
            customer?.totalPending ??
              customer?.currentBalance ??
              0
          );

          return Number.isFinite(pending) && pending > 0;
        });

        if (mountedRef.current) {
          setCustomers(pendingCustomers);
        }
      } catch (error) {
        if (mountedRef.current) {
          toast.error(
            error?.response?.data?.message ||
              "Unable to load customers"
          );
        }
      } finally {
        loadingRef.current = false;

        if (!silent && mountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadCustomers();

    const handleVisibility = () => {
      if (
        document.visibilityState === "visible"
      ) {
        loadCustomers({ silent: true });
      }
    };

    const handleFocus = () => {
      loadCustomers({ silent: true });
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadCustomers]);

  const selectedCustomer = customers.find(
    (customer) =>
      customer?._id === form.customerId
  );

  const selectedPending = Number(
    selectedCustomer?.totalPending ??
      selectedCustomer?.currentBalance ??
      0
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.customerId) {
      toast.error("Select a customer.");
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    if (amount > selectedPending) {
      toast.error(
        "Payment cannot exceed the pending amount."
      );
      return;
    }

    if (!isValidDate(form.entryDate)) {
      toast.error("Select a valid payment date.");
      return;
    }

    const note = form.note.trim();

    if (note.length > 500) {
      toast.error("Note cannot exceed 500 characters.");
      return;
    }

    try {
      setSaving(true);

      await addLedgerPayment({
        customerId: form.customerId,
        amount,
        entryDate: form.entryDate,
        note,
      });

      toast.success(
        "Payment added successfully."
      );

      if (mountedRef.current) {
        setForm({
          customerId: "",
          amount: "",
          entryDate: getToday(),
          note: "",
        });
      }

      await loadCustomers();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to add payment."
      );
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Ledger Payment</h1>

          <p>
            Record payments received from
            credit customers.
          </p>
        </div>
      </div>

      <div
        className="content-panel"
        style={{
          width: "100%",
          maxWidth: "650px",
        }}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ledger-payment-customer">
              Customer *
            </label>

            <select
              id="ledger-payment-customer"
              value={form.customerId}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  customerId:
                    event.target.value,
                  amount: "",
                }))
              }
              disabled={loading || saving}
              required
            >
              <option value="">
                {loading
                  ? "Loading customers..."
                  : "Select Customer"}
              </option>

              {customers.map((customer) => {
                const pending = Number(
                  customer?.totalPending ??
                    customer?.currentBalance ??
                    0
                );

                return (
                  <option
                    key={customer._id}
                    value={customer._id}
                  >
                    {customer.name} - Pending ₹
                    {pending.toFixed(2)}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedCustomer && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 14px",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              Current Pending:{" "}
              <strong>
                ₹
                {selectedPending.toLocaleString(
                  "en-IN",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ledger-payment-amount">
                Payment Amount *
              </label>

              <input
                id="ledger-payment-amount"
                type="number"
                min="0.01"
                max={
                  selectedPending > 0
                    ? selectedPending
                    : undefined
                }
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    amount:
                      event.target.value,
                  }))
                }
                disabled={saving}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ledger-payment-date">
                Payment Date *
              </label>

              <input
                id="ledger-payment-date"
                type="date"
                value={form.entryDate}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    entryDate:
                      event.target.value,
                  }))
                }
                disabled={saving}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ledger-payment-note">
              Note
            </label>

            <textarea
              id="ledger-payment-note"
              rows="3"
              maxLength={500}
              value={form.note}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  note: event.target.value,
                }))
              }
              disabled={saving}
            />

            <small>
              {form.note.length}/500
            </small>
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={
              saving ||
              loading ||
              !selectedCustomer
            }
          >
            {saving
              ? "Saving..."
              : "Save Payment"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Payments;