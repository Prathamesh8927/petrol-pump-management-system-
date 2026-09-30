import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  RefreshCw,
} from "lucide-react";

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

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "-";
    }

    const match =
      String(
        value
      ).match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

    if (match) {
      const [
        ,
        year,
        month,
        day,
      ] = match;

      return `${day}/${month}/${year}`;
    }

    const parsed =
      new Date(value);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return String(
        value
      );
    }

    return parsed.toLocaleDateString(
      "en-IN"
    );
  };

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

  const number = (
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

  const paymentLabel = (
    value
  ) => {
    const payment =
      String(
        value || ""
      ).toLowerCase();

    switch (payment) {
      case "upi":
        return "UPI";

      case "card":
        return "Card";

      case "credit":
        return "Credit";

      case "cash":
      default:
        return "Cash";
    }
  };

  const loadSales =
    useCallback(
      async () => {
        try {
          setLoading(true);

          const data =
            await getSalesHistory();

          const saleList =
            Array.isArray(
              data?.sales
            )
              ? data.sales
              : [];

          setSales(
            saleList
          );
        } catch (error) {
          console.error(
            "SALES HISTORY ERROR:",
            error
          );

          setSales([]);

          toast.error(
            error.response?.data
              ?.message ||
              "Unable to load sales history"
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    const handleFocus =
      () => {
        loadSales();
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
  }, [loadSales]);

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
          className="secondary-button"
          onClick={
            loadSales
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

      <div className="content-panel">

        <div className="content-panel-header">

          <div>

            <h2>
              Sales Records
            </h2>

            <p>
              {sales.length} record
              {sales.length === 1
                ? ""
                : "s"}{" "}
              found.
            </p>

          </div>

        </div>

        <div className="table-container">

          <table>

            <thead>

              <tr>

                <th>
                  Date
                </th>

                <th>
                  Nozzle
                </th>

                <th>
                  Fuel
                </th>

                <th>
                  Litres
                </th>

                <th>
                  Rate
                </th>

                <th>
                  Amount
                </th>

                <th>
                  Payment
                </th>

                <th>
                  Added By
                </th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>

                  <td
                    colSpan="8"
                    className="empty-table"
                  >
                    Loading sales history...
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
                  (sale) => {

                    const nozzle =
                      sale.nozzleId ||
                      {};

                    const createdBy =
                      sale.createdBy ||
                      {};

                    return (
                      <tr
                        key={
                          sale._id
                        }
                      >

                        <td>
                          {formatDate(
                            sale.saleDate ||
                              sale.readingDate
                          )}
                        </td>

                        <td>
                          {nozzle.nozzleNumber ||
                            sale.nozzleNumber ||
                            "-"}
                        </td>

                        <td
                          style={{
                            textTransform:
                              "capitalize",
                          }}
                        >
                          {sale.fuelType ||
                            "-"}
                        </td>

                        <td>
                          {number(
                            sale.quantity ??
                              sale.litresSold ??
                              0
                          )}{" "}
                          L
                        </td>

                        <td>
                          ₹{" "}
                          {money(
                            sale.pricePerLitre
                          )}
                        </td>

                        <td>
                          <strong>
                            ₹{" "}
                            {money(
                              sale.totalAmount
                            )}
                          </strong>
                        </td>

                        <td>
                          {paymentLabel(
                            sale.paymentMethod
                          )}
                        </td>

                        <td>
                          {createdBy.name ||
                            createdBy.email ||
                            sale.createdByName ||
                            "-"}
                        </td>

                      </tr>
                    );
                  }
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