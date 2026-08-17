import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import toast from "react-hot-toast";

import Breadcrumbs from "../../components/Breadcrumbs";

import {
  getNozzles,
  addNozzleReading,
} from "../../services/nozzleService";

const AddReading = () => {
  const navigate =
    useNavigate();

  const [
    nozzles,
    setNozzles,
  ] = useState([]);

  const [
    nozzleId,
    setNozzleId,
  ] = useState("");

  const [
    closingReading,
    setClosingReading,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("cash");

  const [
    note,
    setNote,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    nozzleLoading,
    setNozzleLoading,
  ] = useState(true);

  const getToday = () => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        now.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const [
    date,
    setDate,
  ] = useState(
    getToday()
  );

  /* =====================================================
     LOAD
  ===================================================== */

  const loadNozzles =
    async () => {
      try {
        setNozzleLoading(
          true
        );

        const data =
          await getNozzles();

        const list =
          data?.nozzles ||
          [];

        setNozzles(
          list.filter(
            (item) =>
              item.active !==
              false
          )
        );
      } catch (error) {
        console.error(
          "LOAD NOZZLES:",
          error
        );

        toast.error(
          "Unable to load nozzles"
        );
      } finally {
        setNozzleLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadNozzles();
  }, []);

  /* =====================================================
     SELECTED
  ===================================================== */

  const selectedNozzle =
    useMemo(
      () =>
        nozzles.find(
          (item) =>
            item._id ===
            nozzleId
        ) || null,
      [
        nozzles,
        nozzleId,
      ]
    );

  const opening =
    Number(
      selectedNozzle
        ?.currentReading ||
        0
    );

  const closing =
    Number(
      closingReading ||
        0
    );

  const litresSold =
    selectedNozzle &&
    closingReading !== "" &&
    closing >= opening
      ? Number(
          (
            closing -
            opening
          ).toFixed(2)
        )
      : 0;

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (!nozzleId) {
        toast.error(
          "Please select a nozzle"
        );

        return;
      }

      if (
        !Number.isFinite(
          closing
        )
      ) {
        toast.error(
          "Enter a valid closing reading"
        );

        return;
      }

      if (
        closing <= opening
      ) {
        toast.error(
          `Closing reading must be greater than ${opening}`
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await addNozzleReading({
            nozzleId,

            closingReading:
              closing,

            readingDate:
              date,

            paymentMethod,

            note:
              note.trim(),
          });

        console.log(
          "READING RESPONSE:",
          response
        );

        toast.success(
          `₹${Number(
            response.totalAmount ||
              0
          ).toFixed(
            2
          )} sale recorded`
        );

        navigate(
          "/nozzle/readings"
        );
      } catch (error) {
        console.error(
          "SAVE READING:",
          error
        );

        console.error(
          "SERVER:",
          error.response?.data
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to save reading"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="page-container">

      <Breadcrumbs
        items={[
          {
            label:
              "Nozzles",
            path:
              "/nozzle",
          },

          {
            label:
              "Add Reading",
          },
        ]}
      />

      <div className="page-header">

        <div>

          <h1>
            Add Reading
          </h1>

          <p>
            Enter closing meter
            reading to record fuel
            sale.
          </p>

        </div>

      </div>

      <div className="content-panel">

        <div className="content-panel-header">

          <h2>
            Meter Reading
          </h2>

        </div>

        <div className="content-panel-body">

          <form
            className="clean-form"
            onSubmit={
              handleSubmit
            }
          >

            {/* NOZZLE */}

            <div className="form-group">

              <label>
                Nozzle *
              </label>

              <select
                value={
                  nozzleId
                }
                onChange={(event) => {
                  setNozzleId(
                    event.target
                      .value
                  );

                  setClosingReading(
                    ""
                  );
                }}
                disabled={
                  nozzleLoading ||
                  nozzles.length ===
                    0
                }
                required
              >

                <option
                  value=""
                  disabled
                >
                  Select Nozzle
                </option>

                {nozzles.map(
                  (nozzle) => (

                    <option
                      key={
                        nozzle._id
                      }
                      value={
                        nozzle._id
                      }
                    >
                      {
                        nozzle.nozzleNumber
                      }{" "}
                      -{" "}
                      {nozzle.fuelType ===
                      "diesel"
                        ? "Diesel"
                        : "Petrol"}
                    </option>

                  )
                )}

              </select>

            </div>

            {/* STATS */}

            {selectedNozzle && (

              <div className="stats-grid">

                <div className="stat-card">

                  <h4>
                    Nozzle
                  </h4>

                  <h2>
                    {
                      selectedNozzle.nozzleNumber
                    }
                  </h2>

                </div>

                <div className="stat-card">

                  <h4>
                    Fuel
                  </h4>

                  <h2
                    style={{
                      textTransform:
                        "capitalize",
                    }}
                  >
                    {
                      selectedNozzle.fuelType
                    }
                  </h2>

                </div>

                <div className="stat-card">

                  <h4>
                    Opening Reading
                  </h4>

                  <h2>
                    {opening.toFixed(
                      2
                    )}
                  </h2>

                </div>

                <div className="stat-card">

                  <h4>
                    Fuel Sold
                  </h4>

                  <h2>
                    {litresSold.toFixed(
                      2
                    )}{" "}
                    L
                  </h2>

                </div>

              </div>

            )}

            <div className="form-row">

              <div className="form-group">

                <label>
                  Closing Meter Reading *
                </label>

                <input
                  type="number"
                  step="0.01"
                  min={
                    selectedNozzle
                      ? opening
                      : 0
                  }
                  value={
                    closingReading
                  }
                  onChange={(event) =>
                    setClosingReading(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    !selectedNozzle
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Date *
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(
                      event.target
                        .value
                    )
                  }
                  required
                />

              </div>

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Payment Method
                </label>

                <select
                  value={
                    paymentMethod
                  }
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target
                        .value
                    )
                  }
                >

                  <option value="cash">
                    Cash
                  </option>

                  <option value="upi">
                    UPI
                  </option>

                  <option value="card">
                    Card
                  </option>

                  <option value="credit">
                    Credit
                  </option>

                </select>

              </div>

              <div className="form-group">

                <label>
                  Note
                </label>

                <input
                  type="text"
                  value={note}
                  onChange={(event) =>
                    setNote(
                      event.target
                        .value
                    )
                  }
                  placeholder="Optional note"
                />

              </div>

            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={
                loading ||
                !selectedNozzle
              }
            >

              {loading
                ? "Saving..."
                : "Save Reading"}

            </button>

          </form>

        </div>

      </div>

    </div>
  );
};

export default AddReading;