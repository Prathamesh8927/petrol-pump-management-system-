import {
  useCallback,
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  RefreshCw,
} from "lucide-react";

import {
  getPaymentSummary,
} from "../../services/salesService";

const getToday = () => {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const EMPTY_SUMMARY = {
  cash: 0,
  upi: 0,
  card: 0,
  credit: 0,
  total: 0,
  transactions: 0,
};

const isValidDate = (
  value
) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  return (
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() ===
      day
  );
};

const PaymentSummary = () => {
  const [
    date,
    setDate,
  ] = useState(
    getToday()
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    summary,
    setSummary,
  ] = useState(
    EMPTY_SUMMARY
  );

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

  const loadSummary =
    useCallback(
      async () => {
        if (
          !isValidDate(
            date
          )
        ) {
          toast.error(
            "Please select a valid date."
          );

          return;
        }

        try {
          setLoading(true);

          const data =
            await getPaymentSummary(
              date
            );

          const result =
            data?.summary ||
            {};

          setSummary({
            cash:
              Number(
                result.cash ??
                  0
              ),

            upi:
              Number(
                result.upi ??
                  0
              ),

            card:
              Number(
                result.card ??
                  0
              ),

            credit:
              Number(
                result.credit ??
                  0
              ),

            total:
              Number(
                result.total ??
                  0
              ),

            transactions:
              Number(
                result.transactions ??
                  0
              ),
          });
        } catch (error) {
          console.error(
            "PAYMENT SUMMARY ERROR:",
            error
          );

          setSummary(
            EMPTY_SUMMARY
          );

          toast.error(
            error.response?.data
              ?.message ||
              "Unable to load payment summary"
          );
        } finally {
          setLoading(false);
        }
      },
      [date]
    );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const handleFocus =
      () => {
        loadSummary();
      };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadSummary]);

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

        <div
          style={{
            display:
              "flex",
            gap:
              "10px",
            alignItems:
              "center",
            flexWrap:
              "wrap",
          }}
        >

          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(
                event.target.value
              )
            }
            aria-label="Payment summary date"
          />

          <button
            type="button"
            className="secondary-button"
            onClick={
              loadSummary
            }
            disabled={
              loading
            }
          >

            <RefreshCw
              size={17}
            />

            {loading
              ? "Loading..."
              : "Refresh"}

          </button>

        </div>

      </div>

      <div className="stats-grid">

        <div className="stat-card">

          <h4>
            Cash
          </h4>

          <h2>
            ₹{" "}
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
            ₹{" "}
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
            ₹{" "}
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
            ₹{" "}
            {money(
              summary.credit
            )}
          </h2>

        </div>

      </div>

      <div
        className="content-panel"
        style={{
          marginTop:
            "20px",
        }}
      >

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
                ₹{" "}
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