import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  getMonthlyReport,
} from "../../services/reportService";

import ReportExportButtons from "../../components/ReportExportButtons";

const MonthlyReport = () => {
  const now =
    new Date();

  const [
    month,
    setMonth,
  ] = useState(
    now.getMonth() + 1
  );

  const [
    year,
    setYear,
  ] = useState(
    now.getFullYear()
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
          await getMonthlyReport(
            month,
            year
          );

        setReport(
          data.report
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load monthly report"
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

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="page-container">

      <div className="page-header">

        <div>
          <h1>
            Monthly Report
          </h1>

          <p>
            Monthly financial and
            operational summary.
          </p>
        </div>

        <div className="report-header-actions">

          <select
            value={month}
            onChange={(e) =>
              setMonth(
                Number(
                  e.target.value
                )
              )
            }
          >

            {months.map(
              (
                name,
                index
              ) => (
                <option
                  key={name}
                  value={
                    index + 1
                  }
                >
                  {name}
                </option>
              )
            )}

          </select>

          <input
            type="number"
            value={year}
            onChange={(e) =>
              setYear(
                Number(
                  e.target.value
                )
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
            title="Monthly Report"
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

          </div>

          <div className="content-panel">

            <div className="table-container">

              <table>

                <tbody>

                  <tr>
                    <th>
                      Petrol Sales
                    </th>

                    <td>
                      ₹ {money(
                        summary.petrolSalesAmount
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th>
                      Diesel Sales
                    </th>

                    <td>
                      ₹ {money(
                        summary.dieselSalesAmount
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th>
                      Fuel Purchase Cost
                    </th>

                    <td>
                      ₹ {money(
                        summary.totalFuelPurchaseAmount
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th>
                      Salary Expenses
                    </th>

                    <td>
                      ₹ {money(
                        summary.salaryExpenses
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th>
                      Current Petrol Stock
                    </th>

                    <td>
                      {Number(
                        summary.currentPetrolStock ||
                          0
                      ).toFixed(2)}{" "}
                      L
                    </td>
                  </tr>

                  <tr>
                    <th>
                      Current Diesel Stock
                    </th>

                    <td>
                      {Number(
                        summary.currentDieselStock ||
                          0
                      ).toFixed(2)}{" "}
                      L
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

export default MonthlyReport;