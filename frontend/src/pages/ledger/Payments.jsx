import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  getLedgerCustomers,
  addLedgerPayment,
} from "../../services/ledgerService";

const Payments = () => {
  const [
    customers,
    setCustomers,
  ] = useState([]);

  const [
    form,
    setForm,
  ] = useState({
    customerId: "",
    amount: "",

    entryDate:
      new Date().toLocaleDateString(
        "en-CA"
      ),

    note: "",
  });

  const [
    saving,
    setSaving,
  ] = useState(false);

  /* =====================================================
     LOAD CUSTOMERS
  ===================================================== */

  const loadCustomers =
    async () => {
      try {
        const data =
          await getLedgerCustomers();

        setCustomers(
          (
            data.customers ||
            []
          ).filter(
            (customer) =>
              Number(
                customer.totalPending ||
                  customer.currentBalance ||
                  0
              ) > 0
          )
        );
      } catch (error) {
        toast.error(
          "Unable to load customers"
        );
      }
    };

  useEffect(() => {
    loadCustomers();
  }, []);

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer._id ===
        form.customerId
    );

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      if (
        !form.customerId
      ) {
        toast.error(
          "Select customer"
        );

        return;
      }

      if (
        Number(
          form.amount
        ) <= 0
      ) {
        toast.error(
          "Enter payment amount"
        );

        return;
      }

      try {
        setSaving(true);

        await addLedgerPayment({
          customerId:
            form.customerId,

          amount:
            Number(
              form.amount
            ),

          entryDate:
            form.entryDate,

          note:
            form.note,
        });

        toast.success(
          "Payment added successfully"
        );

        setForm({
          customerId: "",

          amount: "",

          entryDate:
            new Date().toLocaleDateString(
              "en-CA"
            ),

          note: "",
        });

        loadCustomers();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to add payment"
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div className="page-container">

      <div className="page-header">

        <div>

          <h1>
            Ledger Payment
          </h1>

          <p>
            Record payments received
            from credit customers.
          </p>

        </div>

      </div>

      <div
        className="content-panel"
        style={{
          maxWidth:
            "650px",
        }}
      >

        <form
          onSubmit={
            handleSubmit
          }
        >

          <div className="form-group">

            <label>
              Customer *
            </label>

            <select
              value={
                form.customerId
              }
              onChange={(e) =>
                setForm({
                  ...form,

                  customerId:
                    e.target.value,
                })
              }
            >

              <option value="">
                Select Customer
              </option>

              {customers.map(
                (customer) => (

                  <option
                    key={
                      customer._id
                    }
                    value={
                      customer._id
                    }
                  >
                    {customer.name}
                    {" - Pending ₹"}
                    {Number(
                      customer.totalPending ||
                        customer.currentBalance ||
                        0
                    ).toFixed(2)}
                  </option>

                )
              )}

            </select>

          </div>

          {selectedCustomer && (

            <p>
              Current Pending:{" "}
              <strong>
                ₹
                {Number(
                  selectedCustomer.totalPending ||
                    selectedCustomer.currentBalance ||
                    0
                ).toLocaleString(
                  "en-IN"
                )}
              </strong>
            </p>

          )}

          <div className="form-row">

            <div className="form-group">

              <label>
                Payment Amount *
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  form.amount
                }
                onChange={(e) =>
                  setForm({
                    ...form,

                    amount:
                      e.target.value,
                  })
                }
              />

            </div>

            <div className="form-group">

              <label>
                Payment Date *
              </label>

              <input
                type="date"
                value={
                  form.entryDate
                }
                onChange={(e) =>
                  setForm({
                    ...form,

                    entryDate:
                      e.target.value,
                  })
                }
              />

            </div>

          </div>

          <div className="form-group">

            <label>
              Note
            </label>

            <input
              value={
                form.note
              }
              onChange={(e) =>
                setForm({
                  ...form,

                  note:
                    e.target.value,
                })
              }
            />

          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={
              saving
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