import {
  useCallback,
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  RefreshCw,
  Gauge,
} from "lucide-react";

import {
  getNozzleReadingHistory,
} from "../../services/nozzleService";

const normalizeReadings = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.readings)) {
    return data.readings;
  }

  if (Array.isArray(data?.data?.readings)) {
    return data.data.readings;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const normalizeFuelType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

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
    useCallback(async () => {
      try {
        setLoading(true);

        const data =
          await getNozzleReadingHistory();

        console.log(
          "NOZZLE READING HISTORY:",
          data
        );

        const list =
          normalizeReadings(data);

        setReadings(list);
      } catch (error) {
        console.error(
          "READING HISTORY ERROR:",
          error
        );

        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load reading history";

        toast.error(message);

        setReadings([]);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  /* =====================================================
     DATE
  ===================================================== */

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "-";
    }

    /*
     * Handle YYYY-MM-DD separately.
     *
     * This avoids UTC conversion changing
     * the displayed calendar date in IST.
     */
    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
    ) {
      const [
        year,
        month,
        day,
      ] = value
        .split("-")
        .map(Number);

      const date = new Date(
        year,
        month - 1,
        day
      );

      if (
        !Number.isNaN(
          date.getTime()
        )
      ) {
        return date.toLocaleDateString(
          "en-IN"
        );
      }
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return date.toLocaleDateString(
      "en-IN"
    );
  };

  /* =====================================================
     NUMBER
  ===================================================== */

  const formatNumber = (
    value
  ) => {
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(
        numericValue
      )
    ) {
      return "0.00";
    }

    return numericValue.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="page-container">

      {/* =================================================
          HEADER
      ================================================= */}

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
          disabled={loading}
        >
          <RefreshCw
            size={17}
          />

          {loading
            ? "Loading..."
            : "Refresh"}
        </button>

      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}

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

      {/* =================================================
          TABLE
      ================================================= */}

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
                  Shift
                </th>

                <th>
                  Staff
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
                    colSpan="11"
                    className="empty-table"
                  >
                    Loading reading history...
                  </td>

                </tr>

              ) : readings.length ===
                0 ? (

                <tr>

                  <td
                    colSpan="11"
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
                      reading.nozzleId &&
                      typeof reading.nozzleId ===
                        "object"
                        ? reading.nozzleId
                        : {};

                    const staff =
                      reading.staffId &&
                      typeof reading.staffId ===
                        "object"
                        ? reading.staffId
                        : {};

                    const fuelType =
                      normalizeFuelType(
                        reading.fuelType ||
                          nozzle.fuelType
                      );

                    return (
                      <tr
                        key={
                          reading._id ||
                          `${reading.readingDate}-${reading.nozzleId}-${index}`
                        }
                      >

                        {/* NUMBER */}

                        <td>
                          {index + 1}
                        </td>

                        {/* DATE */}

                        <td>
                          {formatDate(
                            reading.readingDate ||
                              reading.createdAt
                          )}
                        </td>

                        {/* SHIFT */}

                        <td>
                          {reading.shiftName
                            ? String(
                                reading.shiftName
                              )
                                .replace(
                                  /^./,
                                  (
                                    char
                                  ) =>
                                    char.toUpperCase()
                                )
                                .replace(
                                  /-/g,
                                  " "
                                )
                            : "-"}
                        </td>

                        {/* STAFF */}

                        <td>
                          {staff.name ||
                            staff.email ||
                            reading.staffName ||
                            "-"}
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

                          {fuelType ===
                          "petrol"
                            ? "Petrol"
                            : fuelType ===
                              "diesel"
                            ? "Diesel"
                            : "-"}

                        </td>

                        {/* OPENING */}

                        <td>
                          {formatNumber(
                            reading.openingReading
                          )}
                        </td>

                        {/* CLOSING */}

                        <td>
                          {formatNumber(
                            reading.closingReading
                          )}
                        </td>

                        {/* SOLD */}

                        <td>

                          <strong>
                            {formatNumber(
                              reading.litresSold
                            )}{" "}
                            L
                          </strong>

                        </td>

                        {/* PAYMENT */}

                        <td>
                          {reading.paymentMethod
                            ? String(
                                reading.paymentMethod
                              )
                                .replace(
                                  /^./,
                                  (
                                    char
                                  ) =>
                                    char.toUpperCase()
                                )
                            : "-"}
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