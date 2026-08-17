import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  IndianRupee,
  Receipt,
  Fuel,
  WalletCards,
} from "lucide-react";

import {
  getDailyReport,
} from "../../services/reportService";

import ReportExportButtons from "../../components/ReportExportButtons";

const DailyReport = () => {
  const today =
    new Date().toLocaleDateString(
      "en-CA"
    );

  const [
    date,
    setDate,
  ] = useState(today);

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
          await getDailyReport(
            date
          );

        setReport(
          data.report
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load daily report"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadReport();
  }, [date]);

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
            Daily Report
          </h1>

          <p>
            Daily sales, expenses,
            stock and ledger summary.
          </p>
        </div>

        <div className="report-header-actions">

          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(
                e.target.value
              )
            }
          />

          <ReportExportButtons
            report={report}
            title="Daily Report"
          />

        </div>

      </div>

      {loading ? (

        <div className="content-panel">
          Loading report...
        </div>

      ) : (

        <>

          <div className="stats-grid">

            <div className="stat-card">
              <IndianRupee size={22} />

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
              <Receipt size={22} />

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
              <WalletCards size={22} />

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
              <Fuel size={22} />

              <h4>
                Fuel Sold
              </h4>

              <h2>
                {Number(
                  summary.totalLitresSold ||
                    0
                ).toFixed(2)}{" "}
                L
              </h2>
            </div>

          </div>

          <div className="content-panel">

            <div className="content-panel-header">
              <h2>
                Fuel Sales
              </h2>
            </div>

            <div className="table-container">

              <table>

                <thead>
                  <tr>
                    <th>
                      Fuel
                    </th>

                    <th>
                      Quantity
                    </th>

                    <th>
                      Sales Amount
                    </th>
                  </tr>
                </thead>

                <tbody>

                  <tr>
                    <td>
                      Petrol
                    </td>

                    <td>
                      {Number(
                        summary.petrolLitresSold ||
                          0
                      ).toFixed(2)}{" "}
                      L
                    </td>

                    <td>
                      ₹ {money(
                        summary.petrolSalesAmount
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Diesel
                    </td>

                    <td>
                      {Number(
                        summary.dieselLitresSold ||
                          0
                      ).toFixed(2)}{" "}
                      L
                    </td>

                    <td>
                      ₹ {money(
                        summary.dieselSalesAmount
                      )}
                    </td>
                  </tr>

                </tbody>

              </table>

            </div>

          </div>

        </>
      )}

    </div>
  );
};

export default DailyReport;