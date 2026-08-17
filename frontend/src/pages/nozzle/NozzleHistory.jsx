import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  RefreshCw,
  Gauge,
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
     LOAD READINGS
  ===================================================== */

  const loadReadings =
    async () => {
      try {
        setLoading(true);

        const data =
          await getNozzleReadings();

        console.log(
          "NOZZLE READING HISTORY:",
          data
        );

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
     DATE
  ===================================================== */

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "-";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-IN"
    );
  };

  /* =====================================================
     NUMBER
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

  return (
    <div className="page-container">

      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>
            Reading History
          </h1>

          <p>
            View opening, closing and
            sold quantity for each
            nozzle.
          </p>

        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={
            loadReadings
          }
        >
          <RefreshCw
            size={17}
          />

          Refresh
        </button>

      </div>

      {/* SUMMARY */}

      <div className="stats-grid">

        <div className="stat-card">

          <Gauge size={26} />

          <h4>
            Total Readings
          </h4>

          <h2>
            {readings.length}
          </h2>

        </div>

      </div>

      {/* TABLE */}

      <div className="content-panel">

        <div className="content-panel-header">

          <div>

            <h2>
              Nozzle Reading History
            </h2>

            <p>
              Complete nozzle transaction
              history.
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
                  Fuel
                </th>

                <th>
                  Opening Reading
                </th>

                <th>
                  Closing Reading
                </th>

                <th>
                  Fuel Sold
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
                    colSpan="8"
                    className="empty-table"
                  >
                    Loading reading history...
                  </td>

                </tr>

              ) : readings.length ===
                0 ? (

                <tr>

                  <td
                    colSpan="8"
                    className="empty-table"
                  >
                    No nozzle readings found.
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

                        <td>
                          {formatDate(
                            reading.readingDate ||
                              reading.createdAt
                          )}
                        </td>

                        <td>

                          <strong>
                            {nozzle.nozzleNumber ||
                              reading.nozzleNumber ||
                              "-"}
                          </strong>

                        </td>

                        <td>

                          {String(
                            reading.fuelType ||
                              nozzle.fuelType ||
                              ""
                          ).toLowerCase() ===
                          "petrol"
                            ? "Petrol"
                            : String(
                                reading.fuelType ||
                                  nozzle.fuelType ||
                                  ""
                              ).toLowerCase() ===
                              "diesel"
                            ? "Diesel"
                            : "-"}

                        </td>

                        <td>
                          {number(
                            reading.openingReading
                          )}
                        </td>

                        <td>
                          {number(
                            reading.closingReading
                          )}
                        </td>

                        <td>

                          <strong>
                            {number(
                              reading.litresSold
                            )}{" "}
                            L
                          </strong>

                        </td>

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