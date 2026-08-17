import {
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  getCustomReport,
} from "../../services/reportService";

import ReportExportButtons from "../../components/ReportExportButtons";

const CustomReport = () => {
  const today =
    new Date().toLocaleDateString(
      "en-CA"
    );

  const [
    from,
    setFrom,
  ] = useState(today);

  const [
    to,
    setTo,
  ] = useState(today);

  const [
    report,
    setReport,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const generateReport =
    async () => {
      if (
        !from ||
        !to
      ) {
        toast.error(
          "Select both dates"
        );

        return;
      }

      if (from > to) {
        toast.error(
          "Start date cannot be after end date"
        );

        return;
      }

      try {
        setLoading(true);

        const data =
          await getCustomReport(
            from,
            to
          );

        setReport(
          data.report
        );

        toast.success(
          "Report generated successfully"
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to generate report"
        );
      } finally {
        setLoading(false);
      }
    };

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
            Custom Report
          </h1>

          <p>
            Generate reports for
            any selected date range.
          </p>
        </div>

        <ReportExportButtons
          report={report}
          title="Custom Report"
        />

      </div>

      <div className="content-panel">

        <div className="content-panel-body">

          <div className="form-row">

            <div className="form-group">

              <label>
                From Date
              </label>

              <input
                type="date"
                value={from}
                onChange={(e) =>
                  setFrom(
                    e.target.value
                  )
                }
              />

            </div>

            <div className="form-group">

              <label>
                To Date
              </label>

              <input
                type="date"
                value={to}
                onChange={(e) =>
                  setTo(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <button
            type="button"
            className="primary-button"
            disabled={
              loading
            }
            onClick={
              generateReport
            }
          >
            {loading
              ? "Generating..."
              : "Generate Report"}
          </button>

        </div>

      </div>

      {report && (

        <div
          className="stats-grid"
          style={{
            marginTop:
              "20px",
          }}
        >

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
              Expenses
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

        </div>

      )}

    </div>
  );
};

export default CustomReport;