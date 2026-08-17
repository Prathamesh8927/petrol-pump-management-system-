import {
  useEffect,
  useState,
} from "react";

import {
  RefreshCw,
  Fuel,
  IndianRupee,
  Banknote,
  Smartphone,
  CreditCard,
  WalletCards,
} from "lucide-react";

import toast from "react-hot-toast";

import {
  getDailySales,
} from "../../services/salesService";

const DailySales = () => {
  /* =====================================================
     DATE
  ===================================================== */

  const getToday = () => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;
  };

  const [
    date,
    setDate,
  ] = useState(
    getToday()
  );

  /* =====================================================
     SALES
  ===================================================== */

  const [
    sales,
    setSales,
  ] = useState([]);

  const [
    summary,
    setSummary,
  ] = useState({
    totalSale: 0,
    totalLitres: 0,

    petrolSale: 0,
    dieselSale: 0,

    petrolLitres: 0,
    dieselLitres: 0,

    cash: 0,
    upi: 0,
    card: 0,
    credit: 0,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* =====================================================
     HELPERS
  ===================================================== */

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
      return value;
    }

    return parsed.toLocaleDateString(
      "en-IN"
    );
  };

  const paymentLabel = (
    value
  ) => {
    const payment =
      String(
        value || ""
      ).toLowerCase();

    if (
      payment === "upi"
    ) {
      return "UPI";
    }

    if (
      payment === "card"
    ) {
      return "Card";
    }

    if (
      payment === "credit"
    ) {
      return "Credit";
    }

    return "Cash";
  };

  /* =====================================================
     LOAD DAILY SALES
  ===================================================== */

  const loadSales =
    async () => {
      try {
        setLoading(true);

        const response =
          await getDailySales(
            date
          );

        console.log(
          "DAILY SALES RESPONSE:",
          response
        );

        const saleList =
          Array.isArray(
            response?.sales
          )
            ? response.sales
            : [];

        const data =
          response?.summary ||
          {};

        setSales(
          saleList
        );

        setSummary({
          totalSale:
            Number(
              data.totalSale ||
                0
            ),

          totalLitres:
            Number(
              data.totalLitres ||
                0
            ),

          petrolSale:
            Number(
              data.petrolSale ||
                0
            ),

          dieselSale:
            Number(
              data.dieselSale ||
                0
            ),

          petrolLitres:
            Number(
              data.petrolLitres ||
                0
            ),

          dieselLitres:
            Number(
              data.dieselLitres ||
                0
            ),

          cash:
            Number(
              data.cash ||
                0
            ),

          upi:
            Number(
              data.upi ||
                0
            ),

          card:
            Number(
              data.card ||
                0
            ),

          credit:
            Number(
              data.credit ||
                0
            ),
        });
      } catch (error) {
        console.error(
          "LOAD DAILY SALES ERROR:",
          error
        );

        console.error(
          "SERVER RESPONSE:",
          error.response?.data
        );

        setSales([]);

        setSummary({
          totalSale: 0,
          totalLitres: 0,

          petrolSale: 0,
          dieselSale: 0,

          petrolLitres: 0,
          dieselLitres: 0,

          cash: 0,
          upi: 0,
          card: 0,
          credit: 0,
        });

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load daily sales"
        );
      } finally {
        setLoading(false);
      }
    };

  /* =====================================================
     REFRESH WHEN DATE CHANGES
  ===================================================== */

  useEffect(() => {
    loadSales();
  }, [date]);

  /* =====================================================
     REFRESH WHEN RETURNING TO PAGE
  ===================================================== */

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
  }, [date]);

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="page-container">

      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>
            Daily Sales
          </h1>

          <p>
            View petrol and diesel
            sales for the selected
            date.
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
          }}
        >

          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(
                event.target
                  .value
              )
            }
          />

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

      </div>

      {/* =================================================
          MAIN SUMMARY
      ================================================= */}

      <div className="stats-grid">

        <div className="stat-card">

          <IndianRupee
            size={24}
          />

          <h4>
            Total Sale
          </h4>

          <h2>
            ₹{" "}
            {money(
              summary.totalSale
            )}
          </h2>

        </div>

        <div className="stat-card">

          <Fuel
            size={24}
          />

          <h4>
            Fuel Sold
          </h4>

          <h2>
            {number(
              summary.totalLitres
            )}{" "}
            L
          </h2>

        </div>

        <div className="stat-card">

          <Fuel
            size={24}
          />

          <h4>
            Petrol Sold
          </h4>

          <h2>
            {number(
              summary.petrolLitres
            )}{" "}
            L
          </h2>

          <p>
            ₹{" "}
            {money(
              summary.petrolSale
            )}
          </p>

        </div>

        <div className="stat-card">

          <Fuel
            size={24}
          />

          <h4>
            Diesel Sold
          </h4>

          <h2>
            {number(
              summary.dieselLitres
            )}{" "}
            L
          </h2>

          <p>
            ₹{" "}
            {money(
              summary.dieselSale
            )}
          </p>

        </div>

      </div>

      {/* =================================================
          PAYMENT SUMMARY
      ================================================= */}

      <div
        className="content-panel"
        style={{
          marginTop:
            "20px",
        }}
      >

        <div className="content-panel-header">

          <div>

            <h2>
              Payment Summary
            </h2>

            <p>
              Collection by payment
              method.
            </p>

          </div>

        </div>

        <div className="content-panel-body">

          <div className="stats-grid">

            <div className="stat-card">

              <Banknote
                size={23}
              />

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

              <Smartphone
                size={23}
              />

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

              <CreditCard
                size={23}
              />

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

              <WalletCards
                size={23}
              />

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

        </div>

      </div>

      {/* =================================================
          SALES TABLE
      ================================================= */}

      <div
        className="content-panel"
        style={{
          marginTop:
            "20px",
        }}
      >

        <div className="content-panel-header">

          <div>

            <h2>
              Sales Transactions
            </h2>

            <p>
              {sales.length} transaction
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
                  #
                </th>

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
                  Quantity
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
                  Source
                </th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>

                  <td
                    colSpan="9"
                    style={{
                      textAlign:
                        "center",

                      padding:
                        "30px",
                    }}
                  >
                    Loading sales...
                  </td>

                </tr>

              ) : sales.length ===
                0 ? (

                <tr>

                  <td
                    colSpan="9"
                    style={{
                      textAlign:
                        "center",

                      padding:
                        "30px",
                    }}
                  >
                    No sales found for{" "}
                    {formatDate(
                      date
                    )}.
                  </td>

                </tr>

              ) : (

                sales.map(
                  (
                    sale,
                    index
                  ) => {

                    const nozzle =
                      sale.nozzleId ||
                      {};

                    return (
                      <tr
                        key={
                          sale._id ||
                          `${date}-${index}`
                        }
                      >

                        <td>
                          {index + 1}
                        </td>

                        <td>
                          {formatDate(
                            sale.saleDate ||
                              sale.readingDate ||
                              date
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

                        <td
                          style={{
                            textTransform:
                              "capitalize",
                          }}
                        >
                          {sale.source ||
                            "nozzle"}
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

export default DailySales;