import {
  useEffect,
  useMemo,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Gauge,
  Save,
  RefreshCw,
} from "lucide-react";

import {
  getNozzles,
  addNozzleReading,
} from "../../services/nozzleService";

const NozzleReading = () => {
  const [
    nozzles,
    setNozzles,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    selectedNozzleNumber,
    setSelectedNozzleNumber,
  ] = useState("1");

  const [
    form,
    setForm,
  ] = useState({
    closingReading: "",

    readingDate:
      new Date().toLocaleDateString(
        "en-CA"
      ),

    note: "",
  });

  /* =====================================================
     LOAD NOZZLES
  ===================================================== */

  const loadNozzles =
    async () => {
      try {
        setLoading(true);

        const data =
          await getNozzles();

        const list =
          Array.isArray(data)
            ? data
            : data?.nozzles ||
              data?.data ||
              [];

        setNozzles(
          list.filter(
            (item) =>
              item.active !== false
          )
        );
      } catch (error) {
        console.error(
          "LOAD NOZZLES ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load nozzles"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadNozzles();
  }, []);

  /* =====================================================
     SELECT NOZZLE 1 OR NOZZLE 2
  ===================================================== */

  const selectedNozzle =
    useMemo(() => {
      return nozzles.find(
        (item) => {
          const number =
            String(
              item.nozzleNumber ||
                ""
            )
              .trim()
              .toLowerCase();

          /*
            Supports:
            1
            N1
            Nozzle 1
          */

          if (
            selectedNozzleNumber ===
            "1"
          ) {
            return (
              number === "1" ||
              number === "n1" ||
              number ===
                "nozzle 1" ||
              number ===
                "nozzle1"
            );
          }

          /*
            Supports:
            2
            N2
            Nozzle 2
          */

          return (
            number === "2" ||
            number === "n2" ||
            number ===
              "nozzle 2" ||
            number ===
              "nozzle2"
          );
        }
      );
    }, [
      nozzles,
      selectedNozzleNumber,
    ]);

  /* =====================================================
     OPENING READING
  ===================================================== */

  const openingReading =
    Number(
      selectedNozzle
        ?.currentReading ||
        0
    );

  /* =====================================================
     CLOSING READING
  ===================================================== */

  const closingReading =
    Number(
      form.closingReading ||
        0
    );

  /* =====================================================
     LITRES SOLD
  ===================================================== */

  const litresSold =
    form.closingReading !==
      "" &&
    Number.isFinite(
      closingReading
    ) &&
    closingReading >=
      openingReading
      ? closingReading -
        openingReading
      : 0;

  /* =====================================================
     INPUT CHANGE
  ===================================================== */

  const handleChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setForm(
        (previous) => ({
          ...previous,

          [name]:
            value,
        })
      );
    };

  /* =====================================================
     CHANGE NOZZLE
  ===================================================== */

  const selectNozzle =
    (number) => {
      setSelectedNozzleNumber(
        number
      );

      setForm(
        (previous) => ({
          ...previous,

          closingReading:
            "",
        })
      );
    };

  /* =====================================================
     SAVE
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !selectedNozzle?._id
      ) {
        toast.error(
          `Nozzle ${selectedNozzleNumber} not found`
        );

        return;
      }

      const finalReading =
        Number(
          form.closingReading
        );

      if (
        !Number.isFinite(
          finalReading
        )
      ) {
        toast.error(
          "Enter a valid closing reading"
        );

        return;
      }

      if (
        finalReading <
        openingReading
      ) {
        toast.error(
          "Closing reading cannot be lower than opening reading"
        );

        return;
      }

      try {
        setSaving(true);

        await addNozzleReading({
          nozzleId:
            selectedNozzle._id,

          closingReading:
            finalReading,

          readingDate:
            form.readingDate,

          note:
            form.note.trim(),
        });

        toast.success(
          `Nozzle ${selectedNozzleNumber} reading saved successfully`
        );

        setForm(
          (previous) => ({
            ...previous,

            closingReading:
              "",

            note:
              "",
          })
        );

        await loadNozzles();
      } catch (error) {
        console.error(
          "ADD NOZZLE READING ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to add reading"
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div className="page-container">

      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>
            Add Nozzle Reading
          </h1>

          <p>
            Record opening and closing
            meter readings.
          </p>

        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={
            loadNozzles
          }
        >
          <RefreshCw
            size={17}
          />

          Refresh
        </button>

      </div>

      <div
        className="content-panel"
        style={{
          maxWidth:
            "720px",
        }}
      >

        <form
          onSubmit={
            handleSubmit
          }
        >

          {/* =================================================
              NOZZLE 1 / NOZZLE 2
          ================================================= */}

          <div className="form-group">

            <label>
              Nozzle *
            </label>

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "1fr 1fr",

                gap:
                  "12px",
              }}
            >

              {/* NOZZLE 1 */}

              <button
                type="button"
                onClick={() =>
                  selectNozzle(
                    "1"
                  )
                }
                style={{
                  padding:
                    "15px 20px",

                  borderRadius:
                    "9px",

                  border:
                    selectedNozzleNumber ===
                    "1"
                      ? "2px solid #2563eb"
                      : "1px solid #dbe3ec",

                  background:
                    selectedNozzleNumber ===
                    "1"
                      ? "#eff6ff"
                      : "#ffffff",

                  color:
                    selectedNozzleNumber ===
                    "1"
                      ? "#1d4ed8"
                      : "#0f172a",

                  fontWeight:
                    "600",

                  fontSize:
                    "15px",

                  cursor:
                    "pointer",
                }}
              >
                Nozzle 1
              </button>

              {/* NOZZLE 2 */}

              <button
                type="button"
                onClick={() =>
                  selectNozzle(
                    "2"
                  )
                }
                style={{
                  padding:
                    "15px 20px",

                  borderRadius:
                    "9px",

                  border:
                    selectedNozzleNumber ===
                    "2"
                      ? "2px solid #2563eb"
                      : "1px solid #dbe3ec",

                  background:
                    selectedNozzleNumber ===
                    "2"
                      ? "#eff6ff"
                      : "#ffffff",

                  color:
                    selectedNozzleNumber ===
                    "2"
                      ? "#1d4ed8"
                      : "#0f172a",

                  fontWeight:
                    "600",

                  fontSize:
                    "15px",

                  cursor:
                    "pointer",
                }}
              >
                Nozzle 2
              </button>

            </div>

          </div>

          {/* =================================================
              NOZZLE INFORMATION
          ================================================= */}

          {!loading &&
            selectedNozzle && (

              <div
                style={{
                  marginBottom:
                    "20px",

                  padding:
                    "14px 16px",

                  background:
                    "#f8fafc",

                  border:
                    "1px solid #e2e8f0",

                  borderRadius:
                    "9px",
                }}
              >

                <div
                  style={{
                    display:
                      "flex",

                    alignItems:
                      "center",

                    gap:
                      "8px",

                    marginBottom:
                      "10px",
                  }}
                >
                  <Gauge
                    size={18}
                  />

                  <strong>
                    Nozzle{" "}
                    {
                      selectedNozzleNumber
                    }
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "1fr 1fr",

                    gap:
                      "10px",
                  }}
                >

                  <div>

                    <small>
                      Fuel
                    </small>

                    <div
                      style={{
                        marginTop:
                          "3px",

                        fontWeight:
                          "600",
                      }}
                    >
                      {String(
                        selectedNozzle.fuelType ||
                          ""
                      ).toLowerCase() ===
                      "petrol"
                        ? "Petrol"
                        : "Diesel"}
                    </div>

                  </div>

                  <div>

                    <small>
                      Current Reading
                    </small>

                    <div
                      style={{
                        marginTop:
                          "3px",

                        fontWeight:
                          "700",

                        fontSize:
                          "18px",
                      }}
                    >
                      {openingReading.toLocaleString(
                        "en-IN",
                        {
                          minimumFractionDigits:
                            2,

                          maximumFractionDigits:
                            2,
                        }
                      )}
                    </div>

                  </div>

                </div>

              </div>

            )}

          {/* NOZZLE NOT FOUND */}

          {!loading &&
            !selectedNozzle && (

              <div
                style={{
                  marginBottom:
                    "20px",

                  padding:
                    "13px 15px",

                  border:
                    "1px solid #fecaca",

                  borderRadius:
                    "8px",

                  background:
                    "#fef2f2",

                  color:
                    "#991b1b",

                  fontSize:
                    "13px",
                }}
              >
                Nozzle{" "}
                {
                  selectedNozzleNumber
                }{" "}
                is not configured or is
                inactive.
              </div>

            )}

          {/* =================================================
              READING + DATE
          ================================================= */}

          <div className="form-row">

            <div className="form-group">

              <label>
                Closing Reading *
              </label>

              <input
                type="number"
                name="closingReading"
                min={
                  openingReading
                }
                step="0.01"
                value={
                  form.closingReading
                }
                onChange={
                  handleChange
                }
                placeholder="Enter closing reading"
              />

            </div>

            <div className="form-group">

              <label>
                Reading Date *
              </label>

              <input
                type="date"
                name="readingDate"
                value={
                  form.readingDate
                }
                onChange={
                  handleChange
                }
              />

            </div>

          </div>

          {/* =================================================
              CALCULATION
          ================================================= */}

          {form.closingReading !==
            "" &&
            selectedNozzle &&
            closingReading >=
              openingReading && (

              <div
                style={{
                  marginBottom:
                    "20px",

                  padding:
                    "14px 16px",

                  border:
                    "1px solid #e2e8f0",

                  borderRadius:
                    "9px",

                  background:
                    "#f8fafc",
                }}
              >

                <div>
                  Opening Reading:{" "}

                  <strong>
                    {openingReading.toFixed(
                      2
                    )}
                  </strong>
                </div>

                <div>
                  Closing Reading:{" "}

                  <strong>
                    {closingReading.toFixed(
                      2
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    marginTop:
                      "8px",

                    fontSize:
                      "16px",
                  }}
                >
                  Fuel Sold:{" "}

                  <strong>
                    {litresSold.toFixed(
                      2
                    )}{" "}
                    L
                  </strong>
                </div>

              </div>

            )}

          {/* NOTE */}

          <div className="form-group">

            <label>
              Note
            </label>

            <textarea
              name="note"
              rows="3"
              placeholder="Optional note"
              value={
                form.note
              }
              onChange={
                handleChange
              }
            />

          </div>

          {/* SAVE */}

          <button
            type="submit"
            className="primary-button"
            disabled={
              loading ||
              saving ||
              !selectedNozzle
            }
          >
            <Save size={17} />

            {saving
              ? "Saving..."
              : `Save Nozzle ${selectedNozzleNumber} Reading`}
          </button>

        </form>

      </div>

    </div>
  );
};

export default NozzleReading;