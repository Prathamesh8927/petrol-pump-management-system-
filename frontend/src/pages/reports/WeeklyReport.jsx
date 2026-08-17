import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  getWeeklyReport,
} from "../../services/reportService";

import ReportExportButtons from "../../components/ReportExportButtons";

const WeeklyReport = () => {
  const now =
    new Date();

  const start =
    new Date();

  start.setDate(
    start.getDate() - 6
  );

  const [
    from,
    setFrom,
  ] = useState(
    start.toLocaleDateString(
      "en-CA"
    )
  );

  const [
    to,
    setTo,
  ] = useState(
    now.toLocaleDateString(
      "en-CA"
    )
  );

  const [
    report,
    setReport,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const loadReport =
    async () => {
      try {
        setLoading(true);

        const data =
          await getWeeklyReport({
            from,
            to,
          });

        setReport(
          data.report
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load weekly report"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadReport();
  }, []);

  const summary =
    report?.summary ||
    {};

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
      }
    );

  return (
    <div className="page-container">

      <div className="page-header">

        <div>
          <h1>
            Weekly Report
          </h1>

          <p>
            Weekly business
            performance summary.
          </p>
        </div>

        <div className="report-header-actions">

          <input
            type="date"
            value={from}
            onChange={(e) =>
              setFrom(
                e.target.value
              )
            }
          />

          <input
            type="date"
            value={to}
            onChange={(e) =>
              setTo(
                e.target.value
              )
            }
          />

          <button
            className="primary-button"
            onClick={
              loadReport
            }
          >
            Generate
          </button>

          <ReportExportButtons
            report={report}
            title="Weekly Report"
          />

        </div>

      </div>

      {loading ? (

        <div className="content-panel">
          Loading report...
        </div>

      ) : (

        <div className="stats-grid">

          <div className="stat-card">
            <h4>
              Total Sales
            </h4>

            <h2>
              ₹ {money(
                summary.totalSales
              )}
            </h2>
          </div>

          <div className="stat-card">
            <h4>
              Total Expenses
            </h4>

            <h2>
              ₹ {money(
                summary.totalExpenses
              )}
            </h2>
          </div>

          <div className="stat-card">
            <h4>
              Net Amount
            </h4>

            <h2>
              ₹ {money(
                summary.netAmount
              )}
            </h2>
          </div>

          <div className="stat-card">
            <h4>
              Pending Ledger
            </h4>

            <h2>
              ₹ {money(
                summary.pendingLedger
              )}
            </h2>
          </div>

          <div className="stat-card">
            <h4>
              Petrol Sold
            </h4>

            <h2>
              {Number(
                summary.petrolLitresSold ||
                  0
              ).toFixed(2)}{" "}
              L
            </h2>
          </div>

          <div className="stat-card">
            <h4>
              Diesel Sold
            </h4>

            <h2>
              {Number(
                summary.dieselLitresSold ||
                  0
              ).toFixed(2)}{" "}
              L
            </h2>
          </div>

        </div>

      )}

    </div>
  );
};

export default WeeklyReport;