import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  getSalesHistory,
} from "../../services/salesService";

const SalesHistory = () => {
  const [
    sales,
    setSales,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const loadSales =
    async () => {
      try {
        setLoading(true);

        const data =
          await getSalesHistory();

        setSales(
          data.sales || []
        );
      } catch (error) {
        console.error(
          "SALES HISTORY ERROR:",
          error.response?.data ||
            error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load sales history"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadSales();
  }, []);

  return (
    <div className="page-container">

      <div className="page-header">

        <div>
          <h1>
            Sales History
          </h1>

          <p>
            Complete fuel sales
            history.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={
            loadSales
          }
        >
          Refresh
        </button>

      </div>

      <div className="content-panel">

        <div className="content-panel-header">
          <h2>
            Sales Records
          </h2>
        </div>

        <div className="table-container">

          <table>

            <thead>
              <tr>
                <th>Date</th>
                <th>Nozzle</th>
                <th>Fuel</th>
                <th>Litres</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Added By</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="8"
                    className="empty-table"
                  >
                    Loading...
                  </td>
                </tr>

              ) : sales.length ===
                0 ? (

                <tr>
                  <td
                    colSpan="8"
                    className="empty-table"
                  >
                    No sales records
                    found.
                  </td>
                </tr>

              ) : (

                sales.map(
                  (sale) => (

                    <tr
                      key={
                        sale._id
                      }
                    >

                      <td>
                        {
                          sale.businessDate
                        }
                      </td>

                      <td>
                        {sale
                          .nozzleId
                          ?.nozzleNumber ||
                          "-"}
                      </td>

                      <td
                        style={{
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {
                          sale.fuelType
                        }
                      </td>

                      <td>
                        {Number(
                          sale.litresSold
                        ).toFixed(
                          2
                        )}{" "}
                        L
                      </td>

                      <td>
                        ₹
                        {Number(
                          sale.pricePerLitre
                        ).toFixed(
                          2
                        )}
                      </td>

                      <td>
                        <strong>
                          ₹
                          {Number(
                            sale.totalAmount
                          ).toFixed(
                            2
                          )}
                        </strong>
                      </td>

                      <td
                        style={{
                          textTransform:
                            "uppercase",
                        }}
                      >
                        {
                          sale.paymentMethod
                        }
                      </td>

                      <td>
                        {sale
                          .createdBy
                          ?.name ||
                          "-"}
                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
};

export default SalesHistory;