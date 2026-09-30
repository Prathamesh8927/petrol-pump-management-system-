import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

import api from "../../services/api";

const SHIFT_OPTIONS = [
  {
    value: "morning",
    label: "Morning Shift",
  },
  {
    value: "evening",
    label: "Evening Shift",
  },
  {
    value: "night",
    label: "Night Shift",
  },
];

const ALLOWED_STAFF_ROLES = new Set([
  "owner",
  "manager",
  "staff",
]);

const PAYMENT_METHODS = [
  "cash",
  "upi",
  "card",
  "credit",
];

const getToday = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/*
 * Validate a calendar date using local
 * date components.
 *
 * Do NOT use toISOString() here because
 * the application is used in IST and UTC
 * conversion can move local midnight to
 * the previous calendar date.
 */
const isValidDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

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

  return (
    date.getFullYear() === year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() === day
  );
};

const normalizeListResponse = (
  data
) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.nozzles)) {
    return data.nozzles;
  }

  if (Array.isArray(data?.users)) {
    return data.users;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const normalizeRole = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeFuelType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const NozzleReading = () => {
  const [
    nozzles,
    setNozzles,
  ] = useState([]);

  const [
    staff,
    setStaff,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingStaff,
    setLoadingStaff,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    selectedNozzleId,
    setSelectedNozzleId,
  ] = useState("");

  const [
    form,
    setForm,
  ] = useState({
    shiftName: "morning",
    staffId: "",
    closingReading: "",
    readingDate: getToday(),
    paymentMethod: "cash",
    note: "",
  });

  const mountedRef =
    useRef(true);

  const loadingRef =
    useRef(false);

  const loadingStaffRef =
    useRef(false);

  const refreshTimerRef =
    useRef(null);

  /* =====================================================
     CLEANUP
  ===================================================== */

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (
        refreshTimerRef.current
      ) {
        window.clearTimeout(
          refreshTimerRef.current
        );
      }
    };
  }, []);

  /* =====================================================
     LOAD NOZZLES
  ===================================================== */

  const loadNozzles =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (
          loadingRef.current
        ) {
          return;
        }

        loadingRef.current = true;

        if (!silent) {
          setLoading(true);
        }

        try {
          const data =
            await getNozzles();

          if (
            !mountedRef.current
          ) {
            return;
          }

          const list =
            normalizeListResponse(
              data
            );

          const activeNozzles =
            list.filter(
              (item) =>
                item?.active !==
                  false &&
                String(
                  item?.status ||
                    "active"
                ).toLowerCase() !==
                  "inactive"
            );

          setNozzles(
            activeNozzles
          );

          setSelectedNozzleId(
            (previousId) => {
              const stillExists =
                activeNozzles.some(
                  (item) =>
                    String(
                      item?._id
                    ) ===
                    String(
                      previousId
                    )
                );

              if (
                stillExists
              ) {
                return previousId;
              }

              return String(
                activeNozzles[0]?._id ||
                  ""
              );
            }
          );
        } catch (error) {
          if (
            !mountedRef.current
          ) {
            return;
          }

          if (!silent) {
            toast.error(
              error?.response?.data
                ?.message ||
                "Unable to load nozzles"
            );
          }

          setNozzles([]);
          setSelectedNozzleId("");
        } finally {
          loadingRef.current = false;

          if (
            mountedRef.current
          ) {
            setLoading(false);
          }
        }
      },
      []
    );

  /* =====================================================
     LOAD STAFF
  ===================================================== */

  const loadStaff =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (
          loadingStaffRef.current
        ) {
          return;
        }

        loadingStaffRef.current =
          true;

        if (!silent) {
          setLoadingStaff(true);
        }

        try {
          const response =
            await api.get(
              "/settings/users"
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          const list =
            normalizeListResponse(
              response.data
            );

          const activeStaff =
            list.filter(
              (user) => {
                const role =
                  normalizeRole(
                    user?.role
                  );

                return (
                  user?.active !==
                    false &&
                  ALLOWED_STAFF_ROLES.has(
                    role
                  )
                );
              }
            );

          setStaff(
            activeStaff
          );

          setForm(
            (previous) => {
              const currentExists =
                activeStaff.some(
                  (user) =>
                    String(
                      user?._id
                    ) ===
                    String(
                      previous.staffId
                    )
                );

              return {
                ...previous,

                staffId:
                  currentExists
                    ? previous.staffId
                    : String(
                        activeStaff[0]?._id ||
                          ""
                      ),
              };
            }
          );
        } catch (error) {
          if (
            !mountedRef.current
          ) {
            return;
          }

          if (!silent) {
            toast.error(
              error?.response?.data
                ?.message ||
                "Unable to load staff"
            );
          }

          setStaff([]);

          setForm(
            (previous) => ({
              ...previous,
              staffId: "",
            })
          );
        } finally {
          loadingStaffRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setLoadingStaff(false);
          }
        }
      },
      []
    );

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadNozzles();
    loadStaff();
  }, [
    loadNozzles,
    loadStaff,
  ]);

  /* =====================================================
     REFRESH WHEN USER RETURNS
  ===================================================== */

  useEffect(() => {
    const refresh = () => {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        return;
      }

      /*
       * Never start a background refresh
       * while a reading is being saved.
       *
       * Otherwise the refresh can race with
       * the save operation and overwrite the
       * UI state with stale data.
       */
      if (saving) {
        return;
      }

      if (
        refreshTimerRef.current
      ) {
        window.clearTimeout(
          refreshTimerRef.current
        );
      }

      refreshTimerRef.current =
        window.setTimeout(() => {
          if (
            !mountedRef.current ||
            saving
          ) {
            return;
          }

          loadNozzles({
            silent: true,
          });

          loadStaff({
            silent: true,
          });
        }, 250);
    };

    window.addEventListener(
      "focus",
      refresh
    );

    document.addEventListener(
      "visibilitychange",
      refresh
    );

    return () => {
      window.removeEventListener(
        "focus",
        refresh
      );

      document.removeEventListener(
        "visibilitychange",
        refresh
      );

      if (
        refreshTimerRef.current
      ) {
        window.clearTimeout(
          refreshTimerRef.current
        );
      }
    };
  }, [
    loadNozzles,
    loadStaff,
    saving,
  ]);

  /* =====================================================
     SELECTED NOZZLE
  ===================================================== */

  const selectedNozzle =
    useMemo(
      () =>
        nozzles.find(
          (item) =>
            String(
              item?._id
            ) ===
            String(
              selectedNozzleId
            )
        ) || null,
      [
        nozzles,
        selectedNozzleId,
      ]
    );

  /* =====================================================
     SELECTED STAFF
  ===================================================== */

  const selectedStaff =
    useMemo(
      () =>
        staff.find(
          (item) =>
            String(
              item?._id
            ) ===
            String(
              form.staffId
            )
        ) || null,
      [
        staff,
        form.staffId,
      ]
    );

  /* =====================================================
     OPENING READING
  ===================================================== */

  const openingReading =
    Number(
      selectedNozzle?.currentReading ??
        0
    );

  /* =====================================================
     CLOSING READING
  ===================================================== */

  const closingReading =
    Number(
      form.closingReading
    );

  const hasValidClosing =
    form.closingReading !==
      "" &&
    Number.isFinite(
      closingReading
    ) &&
    closingReading >= 0;

  const isClosingReadingValid =
    hasValidClosing &&
    closingReading >
      openingReading;

  /* =====================================================
     LITRES SOLD
  ===================================================== */

  const litresSold =
    selectedNozzle &&
    isClosingReadingValid
      ? Number(
          (
            closingReading -
            openingReading
          ).toFixed(2)
        )
      : 0;

  /* =====================================================
     FORM VALIDITY
  ===================================================== */

  const canSubmit =
    !loading &&
    !loadingStaff &&
    !saving &&
    Boolean(
      selectedNozzle?._id
    ) &&
    SHIFT_OPTIONS.some(
      (shift) =>
        shift.value ===
        form.shiftName
    ) &&
    Boolean(form.staffId) &&
    Boolean(selectedStaff) &&
    isValidDate(
      form.readingDate
    ) &&
    isClosingReadingValid &&
    PAYMENT_METHODS.includes(
      form.paymentMethod
    ) &&
    String(
      form.note || ""
    ).trim().length <= 500;

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
          [name]: value,
        })
      );
    };

  /* =====================================================
     CHANGE NOZZLE
  ===================================================== */

  const selectNozzle =
    (event) => {
      const id =
        event.target.value;

      setSelectedNozzleId(id);

      setForm(
        (previous) => ({
          ...previous,
          closingReading: "",
        })
      );
    };

  /* =====================================================
     MANUAL REFRESH
  ===================================================== */

  const handleRefresh =
    async () => {
      if (
        loading ||
        loadingStaff ||
        saving
      ) {
        return;
      }

      await Promise.all([
        loadNozzles(),
        loadStaff(),
      ]);
    };

  /* =====================================================
     SAVE
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (saving) {
        return;
      }

      if (
        !selectedNozzle?._id
      ) {
        toast.error(
          "Please select an active nozzle."
        );
        return;
      }

      if (
        !SHIFT_OPTIONS.some(
          (shift) =>
            shift.value ===
            form.shiftName
        )
      ) {
        toast.error(
          "Please select a valid shift."
        );
        return;
      }

      if (
        !form.staffId ||
        !selectedStaff
      ) {
        toast.error(
          "Please select the staff member responsible for this shift."
        );
        return;
      }

      const staffRole =
        normalizeRole(
          selectedStaff.role
        );

      if (
        !ALLOWED_STAFF_ROLES.has(
          staffRole
        )
      ) {
        toast.error(
          "Selected user is not allowed for nozzle readings."
        );
        return;
      }

      if (
        !isValidDate(
          form.readingDate
        )
      ) {
        toast.error(
          "Please select a valid reading date."
        );
        return;
      }

      const finalReading =
        Number(
          form.closingReading
        );

      if (
        form.closingReading ===
          "" ||
        !Number.isFinite(
          finalReading
        ) ||
        finalReading < 0
      ) {
        toast.error(
          "Enter a valid closing reading."
        );
        return;
      }

      if (
        finalReading <=
        openingReading
      ) {
        toast.error(
          `Closing reading must be greater than ${openingReading.toFixed(
            2
          )}.`
        );
        return;
      }

      if (
        !PAYMENT_METHODS.includes(
          form.paymentMethod
        )
      ) {
        toast.error(
          "Please select a valid payment method."
        );
        return;
      }

      const trimmedNote =
        String(
          form.note || ""
        ).trim();

      if (
        trimmedNote.length >
        500
      ) {
        toast.error(
          "Note cannot exceed 500 characters."
        );
        return;
      }

      try {
        setSaving(true);

        const response =
          await addNozzleReading({
            nozzleId:
              selectedNozzle._id,

            shiftName:
              form.shiftName,

            staffId:
              form.staffId,

            closingReading:
              finalReading,

            readingDate:
              form.readingDate,

            paymentMethod:
              form.paymentMethod,

            note:
              trimmedNote,
          });

        if (
          !mountedRef.current
        ) {
          return;
        }

        const totalAmount =
          Number(
            response?.totalAmount ??
              response?.sale
                ?.totalAmount ??
              0
          );

        toast.success(
          `₹${totalAmount.toFixed(
            2
          )} sale recorded successfully`
        );

        setForm(
          (previous) => ({
            ...previous,
            closingReading: "",
            note: "",
          })
        );

        await loadNozzles({
          silent: true,
        });
      } catch (error) {
        if (
          !mountedRef.current
        ) {
          return;
        }

        const message =
          error?.response?.data
            ?.message ||
          error?.message ||
          "Unable to add reading";

        toast.error(message);
      } finally {
        if (
          mountedRef.current
        ) {
          setSaving(false);
        }
      }
    };

  return (
    <div className="page-container">

      {/* =============================
          HEADER
      ============================= */}

      <div className="page-header">

        <div>
          <h1>
            Add Nozzle Reading
          </h1>

          <p>
            Record the closing meter
            reading and fuel sale.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={
            handleRefresh
          }
          disabled={
            loading ||
            loadingStaff ||
            saving
          }
        >
          <RefreshCw
            size={17}
          />

          {loading ||
          loadingStaff
            ? "Loading..."
            : "Refresh"}
        </button>

      </div>

      {/* =============================
          MAIN PANEL
      ============================= */}

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
          noValidate
        >

          {/* =========================
              NOZZLE
          ========================= */}

          <div className="form-group">

            <label
              htmlFor="nozzle-select"
            >
              Nozzle *
            </label>

            <select
              id="nozzle-select"
              value={
                selectedNozzleId
              }
              onChange={
                selectNozzle
              }
              disabled={
                loading ||
                saving ||
                nozzles.length ===
                  0
              }
              required
            >

              <option
                value=""
                disabled
              >
                {loading
                  ? "Loading nozzles..."
                  : "Select Nozzle"}
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
                    {normalizeFuelType(
                      nozzle.fuelType
                    ) === "diesel"
                      ? "Diesel"
                      : "Petrol"}
                  </option>
                )
              )}

            </select>

          </div>

          {/* =========================
              SHIFT
          ========================= */}

          <div className="form-group">

            <label
              htmlFor="shift-name"
            >
              Shift *
            </label>

            <select
              id="shift-name"
              name="shiftName"
              value={
                form.shiftName
              }
              onChange={
                handleChange
              }
              disabled={
                loading ||
                saving
              }
              required
            >

              {SHIFT_OPTIONS.map(
                (shift) => (
                  <option
                    key={
                      shift.value
                    }
                    value={
                      shift.value
                    }
                  >
                    {
                      shift.label
                    }
                  </option>
                )
              )}

            </select>

          </div>

          {/* =========================
              STAFF
          ========================= */}

          <div className="form-group">

            <label
              htmlFor="staff-select"
            >
              Staff / Shift Responsible *
            </label>

            <select
              id="staff-select"
              name="staffId"
              value={
                form.staffId
              }
              onChange={
                handleChange
              }
              disabled={
                loadingStaff ||
                saving ||
                staff.length ===
                  0
              }
              required
            >

              <option
                value=""
                disabled
              >
                {loadingStaff
                  ? "Loading staff..."
                  : staff.length ===
                    0
                  ? "No active staff available"
                  : "Select Staff"}
              </option>

              {staff.map(
                (user) => (
                  <option
                    key={
                      user._id
                    }
                    value={
                      user._id
                    }
                  >
                    {user.name ||
                      user.email ||
                      "Unnamed User"}
                    {" - "}
                    {normalizeRole(
                      user.role
                    ).replace(
                      /^./,
                      (char) =>
                        char.toUpperCase()
                    )}
                  </option>
                )
              )}

            </select>

          </div>

          {/* =========================
              SHIFT INFORMATION
          ========================= */}

          {selectedStaff && (
            <div
              style={{
                marginBottom:
                  "20px",
                padding:
                  "12px 15px",
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                borderRadius:
                  "9px",
                fontSize:
                  "13px",
              }}
            >
              <strong>
                Reading responsibility
              </strong>

              <div
                style={{
                  marginTop:
                    "6px",
                  display:
                    "flex",
                  flexWrap:
                    "wrap",
                  gap:
                    "8px 18px",
                  color:
                    "#475569",
                }}
              >
                <span>
                  Shift:{" "}
                  <strong>
                    {
                      SHIFT_OPTIONS.find(
                        (shift) =>
                          shift.value ===
                          form.shiftName
                      )?.label ||
                      form.shiftName
                    }
                  </strong>
                </span>

                <span>
                  Staff:{" "}
                  <strong>
                    {selectedStaff.name ||
                      selectedStaff.email}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* =========================
              NO NOZZLES
          ========================= */}

          {!loading &&
            nozzles.length ===
              0 && (
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
                No active nozzles are
                configured for this
                pump.
              </div>
            )}

          {/* =========================
              NO STAFF
          ========================= */}

          {!loadingStaff &&
            staff.length ===
              0 && (
              <div
                style={{
                  marginBottom:
                    "20px",
                  padding:
                    "13px 15px",
                  border:
                    "1px solid #fed7aa",
                  borderRadius:
                    "8px",
                  background:
                    "#fff7ed",
                  color:
                    "#9a3412",
                  fontSize:
                    "13px",
                }}
              >
                No active owner,
                manager, or staff user
                is available for this
                nozzle reading.
              </div>
            )}

          {/* =========================
              NOZZLE INFORMATION
          ========================= */}

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
                    {
                      selectedNozzle.nozzleNumber
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
                        textTransform:
                          "capitalize",
                      }}
                    >
                      {
                        selectedNozzle.fuelType
                      }
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

          {/* =========================
              READING + DATE
          ========================= */}

          <div className="form-row">

            <div className="form-group">

              <label
                htmlFor="closing-reading"
              >
                Closing Reading *
              </label>

              <input
                id="closing-reading"
                type="number"
                name="closingReading"
                min={
                  selectedNozzle
                    ? openingReading +
                      0.01
                    : 0
                }
                step="0.01"
                value={
                  form.closingReading
                }
                onChange={
                  handleChange
                }
                placeholder={
                  selectedNozzle
                    ? `Greater than ${openingReading.toFixed(
                        2
                      )}`
                    : "Select nozzle first"
                }
                disabled={
                  !selectedNozzle ||
                  loading ||
                  saving
                }
                required
              />

            </div>

            <div className="form-group">

              <label
                htmlFor="reading-date"
              >
                Reading Date *
              </label>

              <input
                id="reading-date"
                type="date"
                name="readingDate"
                value={
                  form.readingDate
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading ||
                  saving
                }
                required
              />

            </div>

          </div>

          {/* =========================
              CALCULATION
          ========================= */}

          {form.closingReading !==
            "" &&
            selectedNozzle &&
            isClosingReadingValid && (
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

          {/* =========================
              PAYMENT METHOD
          ========================= */}

          <div className="form-group">

            <label
              htmlFor="payment-method"
            >
              Payment Method *
            </label>

            <select
              id="payment-method"
              name="paymentMethod"
              value={
                form.paymentMethod
              }
              onChange={
                handleChange
              }
              disabled={
                loading ||
                saving
              }
              required
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

          {/* =========================
              NOTE
          ========================= */}

          <div className="form-group">

            <label
              htmlFor="reading-note"
            >
              Note
            </label>

            <textarea
              id="reading-note"
              name="note"
              rows="3"
              placeholder="Optional note"
              value={
                form.note
              }
              onChange={
                handleChange
              }
              maxLength={500}
              disabled={
                loading ||
                saving
              }
            />

          </div>

          {/* =========================
              SAVE
          ========================= */}

          <button
            type="submit"
            className="primary-button"
            disabled={
              !canSubmit
            }
          >
            <Save
              size={17}
            />

            {saving
              ? "Saving..."
              : "Save Nozzle Reading"}
          </button>

        </form>

      </div>

    </div>
  );
};

export default NozzleReading;