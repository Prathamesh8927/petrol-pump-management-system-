import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  getPaymentSummary,
} from "../../services/salesService";

const PaymentSummary = () => {
  const today =
    new Date()
      .toLocaleDateString(
        "en-CA"
      );

  const [
    date,
    setDate,
  ] = useState(today);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    summary,
    setSummary,
  ] = useState({
    cash: 0,
    upi: 0,
    card: 0,
    credit: 0,
    total: 0,
    transactions: 0,
  });

  const loadSummary =
    async () => {
      try {
        setLoading(true);

        const data =
          await getPaymentSummary(
            date
          );

        setSummary(
          data.summary || {
            cash: 0,
            upi: 0,
            card: 0,
            credit: 0,
            total: 0,
            transactions: 0,
          }
        );
      } catch (error) {
        console.error(
          "PAYMENT SUMMARY ERROR:",
          error.response?.data ||
            error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load payment summary"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadSummary();
  }, [date]);

  const money = (
    value
  ) =>
    Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          2,
        maximumFractionDigits:
          2,
      }
    );

  return (
    <div className="page-container">

      <div className="page-header">

        <div>
          <h1>
            Payment Summary
          </h1>

          <p>
            Daily sales collection
            by payment method.
          </p>
        </div>

        <div className="form-group">

          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(
                e.target.value
              )
            }
          />

        </div>

      </div>

      <div className="stats-grid">

        <div className="stat-card">
          <h4>
            Cash
          </h4>

          <h2>
            ₹
            {money(
              summary.cash
            )}
          </h2>
        </div>

        <div className="stat-card">
          <h4>
            UPI
          </h4>

          <h2>
            ₹
            {money(
              summary.upi
            )}
          </h2>
        </div>

        <div className="stat-card">
          <h4>
            Card
          </h4>

          <h2>
            ₹
            {money(
              summary.card
            )}
          </h2>
        </div>

        <div className="stat-card">
          <h4>
            Credit
          </h4>

          <h2>
            ₹
            {money(
              summary.credit
            )}
          </h2>
        </div>

      </div>

      <div className="content-panel">

        <div className="content-panel-header">
          <h2>
            Total Collection
          </h2>
        </div>

        <div className="content-panel-body">

          {loading ? (
            <p>
              Loading...
            </p>
          ) : (
            <>
              <h1>
                ₹
                {money(
                  summary.total
                )}
              </h1>

              <p>
                Total Transactions:{" "}
                {
                  summary.transactions
                }
              </p>
            </>
          )}

        </div>

      </div>

    </div>
  );
};

export default PaymentSummary;