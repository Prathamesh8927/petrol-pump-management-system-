import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  RefreshCw,
} from "lucide-react";

import {
  getNozzleReadings,
} from "../../services/nozzleService";

const ReadingHistory = () => {
  const [
    readings,
    setReadings,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* =====================================================
     LOAD READING HISTORY
  ===================================================== */

  const loadReadings =
    async () => {
      try {
        setLoading(true);

        const data =
          await getNozzleReadings();

        const list =
          Array.isArray(data)
            ? data
            : data?.readings ||
              data?.data ||
              [];

        setReadings(list);
      } catch (error) {
        console.error(
          "READING HISTORY ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load reading history"
        );

        setReadings([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadReadings();
  }, []);

  /* =====================================================
     FORMAT DATE

     IMPORTANT:
     readingDate from backend is
     normally YYYY-MM-DD.

     We do not directly use
     new Date("YYYY-MM-DD")
     because timezone conversion can
     display the wrong date.
  ===================================================== */

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "-";
    }

    const cleanValue =
      String(value);

    /*
      Handle:
      2026-08-16
    */

    const simpleDate =
      cleanValue.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

    if (simpleDate) {
      const [
        ,
        year,
        month,
        day,
      ] = simpleDate;

      return `${day}/${month}/${year}`;
    }

    /*
      Handle timestamps:
      createdAt etc.
    */

    const date =
      new Date(cleanValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return cleanValue;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  /* =====================================================
     FORMAT NUMBER
  ===================================================== */

  const number = (
    value
  ) =>
    Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );

  /* =====================================================
     FUEL LABEL
  ===================================================== */

  const getFuelLabel =
    (value) => {
      const fuel =
        String(
          value || ""
        ).toLowerCase();

      if (
        fuel === "petrol"
      ) {
        return "Petrol";
      }

      if (
        fuel === "diesel"
      ) {
        return "Diesel";
      }

      return "-";
    };

  /* =====================================================
     PAYMENT METHOD
  ===================================================== */

  const getPaymentLabel =
    (value) => {
      const payment =
        String(
          value || ""
        ).toLowerCase();

      if (
        payment === "cash"
      ) {
        return "Cash";
      }

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

      return "-";
    };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="page-container">

      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>
            Reading History
          </h1>

          <p>
            View complete nozzle
            meter reading history.
          </p>

        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={
            loadReadings
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

      {/* TABLE */}

      <div className="content-panel">

        <div className="content-panel-header">

          <div>

            <h2>
              Nozzle Readings
            </h2>

            <p>
              Opening, closing and
              fuel sold records.
            </p>

          </div>

        </div>

        <div className="table-container">

          <table>

            <thead>

              <tr>

                <th>#</th>

                <th>
                  Date
                </th>

                <th>
                  Nozzle
                </th>

                <th>
                  Fuel Type
                </th>

                <th>
                  Opening Reading
                </th>

                <th>
                  Closing Reading
                </th>

                <th>
                  Litres Sold
                </th>

                <th>
                  Payment
                </th>

                <th>
                  Note
                </th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>

                  <td
                    colSpan="9"
                    className="empty-table"
                  >
                    Loading reading history...
                  </td>

                </tr>

              ) : readings.length ===
                0 ? (

                <tr>

                  <td
                    colSpan="9"
                    className="empty-table"
                  >
                    No reading history found.
                  </td>

                </tr>

              ) : (

                readings.map(
                  (
                    reading,
                    index
                  ) => {
                    const nozzle =
                      reading.nozzleId ||
                      {};

                    /*
                      IMPORTANT:
                      Prefer readingDate.
                    */

                    const displayDate =
                      reading.readingDate ||
                      reading.date ||
                      reading.createdAt;

                    return (
                      <tr
                        key={
                          reading._id ||
                          index
                        }
                      >

                        <td>
                          {index + 1}
                        </td>

                        {/* DATE */}

                        <td>
                          {formatDate(
                            displayDate
                          )}
                        </td>

                        {/* NOZZLE */}

                        <td>

                          <strong>
                            {nozzle.nozzleNumber ||
                              reading.nozzleNumber ||
                              "-"}
                          </strong>

                        </td>

                        {/* FUEL */}

                        <td>
                          {getFuelLabel(
                            reading.fuelType ||
                              nozzle.fuelType
                          )}
                        </td>

                        {/* OPENING */}

                        <td>
                          {number(
                            reading.openingReading
                          )}
                        </td>

                        {/* CLOSING */}

                        <td>
                          {number(
                            reading.closingReading
                          )}
                        </td>

                        {/* SOLD */}

                        <td>

                          <strong>
                            {number(
                              reading.litresSold
                            )}{" "}
                            L
                          </strong>

                        </td>

                        {/* PAYMENT */}

                        <td>
                          {getPaymentLabel(
                            reading.paymentMethod
                          )}
                        </td>

                        {/* NOTE */}

                        <td>
                          {reading.note ||
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

export default ReadingHistory;