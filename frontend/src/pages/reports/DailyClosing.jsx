import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  LockKeyhole,
  RotateCcw,
} from "lucide-react";

import {
  getDashboardSummary,
} from "../../services/dashboardService";

import {
  getDailyClosing,
  closeBusinessDay,
  reopenBusinessDay,
} from "../../services/dailyClosingService";

const DailyClosing = () => {
  const today =
    new Date().toLocaleDateString(
      "en-CA"
    );

  const [
    date,
    setDate,
  ] = useState(
    today
  );

  const [
    summary,
    setSummary,
  ] = useState({});

  const [
    closing,
    setClosing,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    closingDay,
    setClosingDay,
  ] = useState(false);

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

  const loadData =
    async () => {
      try {
        setLoading(true);

        const [
          dashboardData,
          closingData,
        ] =
          await Promise.all([
            getDashboardSummary(
              date
            ),

            getDailyClosing(
              date
            ),
          ]);

        setSummary(
          dashboardData.summary ||
            {}
        );

        setClosing(
          closingData.closing ||
            null
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load daily closing"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadData();
  }, [date]);

  const handleClose =
    async () => {
      const confirmed =
        window.confirm(
          `Close business day ${date}?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setClosingDay(true);

        const data =
          await closeBusinessDay({
            businessDate:
              date,
          });

        setClosing(
          data.closing
        );

        toast.success(
          "Business day closed"
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to close day"
        );
      } finally {
        setClosingDay(false);
      }
    };

  const handleReopen =
    async () => {
      if (!closing?._id) {
        return;
      }

      const confirmed =
        window.confirm(
          "Reopen this business day?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const data =
          await reopenBusinessDay(
            closing._id
          );

        setClosing(
          data.closing
        );

        toast.success(
          "Business day reopened"
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to reopen day"
        );
      }
    };

  if (loading) {
    return (
      <div className="page-container">
        Loading daily closing...
      </div>
    );
  }

  return (
    <div className="page-container">

      <div className="page-header">

        <div>
          <h1>
            Daily Closing
          </h1>

          <p>
            Review and close daily
            petrol pump operations.
          </p>
        </div>

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

      <div className="stats-grid">

        <div className="stat-card">
          <h4>
            Total Sales
          </h4>

          <h2>
            ₹{" "}
            {money(
              summary.todaySales
            )}
          </h2>
        </div>

        <div className="stat-card">
          <h4>
            Credit Sales
          </h4>

          <h2>
            ₹{" "}
            {money(
              summary.creditSales
            )}
          </h2>
        </div>

        <div className="stat-card">
          <h4>
            Expenses
          </h4>

          <h2>
            ₹{" "}
            {money(
              summary.totalExpenses
            )}
          </h2>
        </div>

        <div className="stat-card">
          <h4>
            Net Collection
          </h4>

          <h2>
            ₹{" "}
            {money(
              summary.netCollection
            )}
          </h2>
        </div>

      </div>

      <div className="content-panel">

        <div className="table-container">

          <table>

            <tbody>

              <tr>
                <th>
                  Cash Sales
                </th>

                <td>
                  ₹{" "}
                  {money(
                    summary.cashSales
                  )}
                </td>
              </tr>

              <tr>
                <th>
                  UPI Sales
                </th>

                <td>
                  ₹{" "}
                  {money(
                    summary.upiSales
                  )}
                </td>
              </tr>

              <tr>
                <th>
                  Card Sales
                </th>

                <td>
                  ₹{" "}
                  {money(
                    summary.cardSales
                  )}
                </td>
              </tr>

              <tr>
                <th>
                  Pending Credit
                </th>

                <td>
                  ₹{" "}
                  {money(
                    summary.pendingCredit
                  )}
                </td>
              </tr>

              <tr>
                <th>
                  Petrol Stock
                </th>

                <td>
                  {Number(
                    summary.petrolStock ||
                      0
                  ).toFixed(
                    2
                  )}{" "}
                  L
                </td>
              </tr>

              <tr>
                <th>
                  Diesel Stock
                </th>

                <td>
                  {Number(
                    summary.dieselStock ||
                      0
                  ).toFixed(
                    2
                  )}{" "}
                  L
                </td>
              </tr>

            </tbody>

          </table>

        </div>

        <div
          style={{
            marginTop:
              "20px",
          }}
        >

          {closing?.status ===
          "closed" ? (

            <button
              className="secondary-button"
              onClick={
                handleReopen
              }
            >
              <RotateCcw
                size={17}
              />

              Reopen Day
            </button>

          ) : (

            <button
              className="primary-button"
              onClick={
                handleClose
              }
              disabled={
                closingDay
              }
            >
              <LockKeyhole
                size={17}
              />

              {closingDay
                ? "Closing..."
                : "Close Day"}
            </button>

          )}

        </div>

      </div>

    </div>
  );
};

export default DailyClosing;