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

import api from "../../services/api";

/* =====================================================
   CONSTANTS
===================================================== */

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

const PAYMENT_METHODS = new Set([
  "cash",
  "upi",
  "card",
  "credit",
]);

/* =====================================================
   TODAY
===================================================== */

const getToday = () => {
  const now = new Date();

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

/* =====================================================
   DATE VALIDATION
===================================================== */

const isValidDate = (
  value
) => {
  if (
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

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  return (
    date.getFullYear() ===
      year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() ===
      day
  );
};

/* =====================================================
   NORMALIZE USERS RESPONSE
===================================================== */

const normalizeUsersResponse = (
  response
) => {
  const data =
    response?.data ??
    response;

  if (
    Array.isArray(data)
  ) {
    return data;
  }

  if (
    Array.isArray(
      data?.users
    )
  ) {
    return data.users;
  }

  if (
    Array.isArray(
      data?.data?.users
    )
  ) {
    return data.data.users;
  }

  if (
    Array.isArray(
      data?.data
    )
  ) {
    return data.data;
  }

  return [];
};

/* =====================================================
   NORMALIZE NOZZLES
===================================================== */

const normalizeNozzles = (
  data
) => {
  if (
    !Array.isArray(data)
  ) {
    return [];
  }

  return data.filter(
    (item) =>
      item &&
      typeof item ===
        "object" &&
      item._id
  );
};

/* =====================================================
   ADD READING
===================================================== */

const AddReading = () => {
  const navigate =
    useNavigate();

  /* ===================================================
     NOZZLES
  =================================================== */

  const [
    nozzles,
    setNozzles,
  ] = useState([]);

  const [
    nozzleId,
    setNozzleId,
  ] = useState("");

  const [
    nozzleLoading,
    setNozzleLoading,
  ] = useState(true);

  /* ===================================================
     SHIFT
  =================================================== */

  const [
    shiftName,
    setShiftName,
  ] = useState("");

  /* ===================================================
     STAFF
  =================================================== */

  const [
    staff,
    setStaff,
  ] = useState([]);

  const [
    staffId,
    setStaffId,
  ] = useState("");

  const [
    staffLoading,
    setStaffLoading,
  ] = useState(true);

  /* ===================================================
     FORM
  =================================================== */

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
    date,
    setDate,
  ] = useState(
    getToday()
  );

  /* ===================================================
     LOADING
  =================================================== */

  const [
    loading,
    setLoading,
  ] = useState(false);

  /* =====================================
     LOAD NOZZLES
  ===================================== */

  useEffect(() => {
    let mounted = true;

    const loadNozzles =
      async () => {
        try {
          setNozzleLoading(
            true
          );

          const data =
            await getNozzles();

          if (!mounted) {
            return;
          }

          const list =
            normalizeNozzles(
              data
            );

          const activeNozzles =
            list.filter(
              (item) => {
                const active =
                  item?.active;

                const status =
                  String(
                    item?.status ||
                      ""
                  ).toLowerCase();

                if (
                  active === false ||
                  active ===
                    "false"
                ) {
                  return false;
                }

                if (
                  status ===
                  "inactive"
                ) {
                  return false;
                }

                return true;
              }
            );

          console.log(
            "ADD READING - NOZZLES:",
            activeNozzles
          );

          setNozzles(
            activeNozzles
          );
        } catch (error) {
          if (!mounted) {
            return;
          }

          console.error(
            "LOAD NOZZLES ERROR:",
            error
          );

          toast.error(
            error?.response
              ?.data?.message ||
              error?.message ||
              "Unable to load nozzles."
          );

          setNozzles([]);
        } finally {
          if (mounted) {
            setNozzleLoading(
              false
            );
          }
        }
      };

    loadNozzles();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================================
     LOAD STAFF
  ===================================== */

  useEffect(() => {
    let mounted = true;

    const loadStaff =
      async () => {
        try {
          setStaffLoading(
            true
          );

          const response =
            await api.get(
              "/settings/users"
            );

          if (!mounted) {
            return;
          }

          const users =
            normalizeUsersResponse(
              response
            );

          console.log(
            "ADD READING - RAW STAFF:",
            users
          );

          const activeStaff =
            users.filter(
              (user) => {
                const role =
                  String(
                    user?.role ||
                      ""
                  ).toLowerCase();

                if (
                  !ALLOWED_STAFF_ROLES.has(
                    role
                  )
                ) {
                  return false;
                }

                if (
                  user?.active ===
                    false ||
                  user?.active ===
                    "false"
                ) {
                  return false;
                }

                const status =
                  String(
                    user?.status ||
                      ""
                  ).toLowerCase();

                if (
                  status ===
                  "inactive"
                ) {
                  return false;
                }

                return true;
              }
            );

          console.log(
            "ADD READING - ACTIVE STAFF:",
            activeStaff
          );

          setStaff(
            activeStaff
          );
        } catch (error) {
          if (!mounted) {
            return;
          }

          console.error(
            "LOAD STAFF ERROR:",
            error
          );

          setStaff([]);

          toast.error(
            error?.response
              ?.data?.message ||
              error?.message ||
              "Unable to load pump staff."
          );
        } finally {
          if (mounted) {
            setStaffLoading(
              false
            );
          }
        }
      };

    loadStaff();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================================
     SELECTED NOZZLE
  ===================================== */

  const selectedNozzle =
    useMemo(
      () =>
        nozzles.find(
          (item) =>
            String(
              item?._id
            ) ===
            String(
              nozzleId
            )
        ) || null,
      [
        nozzles,
        nozzleId,
      ]
    );

  /* =====================================
     SELECTED STAFF
  ===================================== */

  const selectedStaff =
    useMemo(
      () =>
        staff.find(
          (user) =>
            String(
              user?._id
            ) ===
            String(
              staffId
            )
        ) || null,
      [
        staff,
        staffId,
      ]
    );

  /* =====================================
     OPENING READING
  ===================================== */

  const opening =
    Number(
      selectedNozzle?.currentReading ??
        0
    );

  /* =====================================
     CLOSING READING
  ===================================== */

  const closing =
    Number(
      closingReading
    );

  const validClosing =
    closingReading !== "" &&
    Number.isFinite(
      closing
    );

  /* =====================================
     LITRES SOLD
  ===================================== */

  const litresSold =
    selectedNozzle &&
    validClosing &&
    closing >
      opening
      ? Number(
          (
            closing -
            opening
          ).toFixed(2)
        )
      : 0;

  /* =====================================
     NOZZLE CHANGE
  ===================================== */

  const handleNozzleChange =
    (event) => {
      setNozzleId(
        event.target.value
      );

      setClosingReading(
        ""
      );
    };

  /* =====================================
     SHIFT CHANGE
  ===================================== */

  const handleShiftChange =
    (event) => {
      setShiftName(
        event.target.value
      );
    };

  /* =====================================
     STAFF CHANGE
  ===================================== */

  const handleStaffChange =
    (event) => {
      setStaffId(
        event.target.value
      );
    };

  /* =====================================
     SUBMIT
  ===================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      if (!nozzleId) {
        toast.error(
          "Please select a nozzle."
        );

        return;
      }

      if (!selectedNozzle) {
        toast.error(
          "Selected nozzle was not found."
        );

        return;
      }

      if (!shiftName) {
        toast.error(
          "Please select a shift."
        );

        return;
      }

      const validShift =
        SHIFT_OPTIONS.some(
          (shift) =>
            shift.value ===
            shiftName
        );

      if (!validShift) {
        toast.error(
          "Please select a valid shift."
        );

        return;
      }

      if (!staffId) {
        toast.error(
          "Please select the staff member."
        );

        return;
      }

      if (!selectedStaff) {
        toast.error(
          "Selected staff member was not found."
        );

        return;
      }

      const selectedRole =
        String(
          selectedStaff?.role ||
            ""
        ).toLowerCase();

      if (
        !ALLOWED_STAFF_ROLES.has(
          selectedRole
        )
      ) {
        toast.error(
          "Selected user is not allowed to enter nozzle readings."
        );

        return;
      }

      if (!isValidDate(date)) {
        toast.error(
          "Please select a valid date."
        );

        return;
      }

      if (
        !Number.isFinite(
          opening
        ) ||
        opening < 0
      ) {
        toast.error(
          "Invalid opening reading."
        );

        return;
      }

      if (
        !validClosing ||
        closing < 0
      ) {
        toast.error(
          "Enter a valid closing reading."
        );

        return;
      }

      if (
        closing <= opening
      ) {
        toast.error(
          `Closing reading must be greater than ${opening.toFixed(
            2
          )}.`
        );

        return;
      }

      if (
        !PAYMENT_METHODS.has(
          paymentMethod
        )
      ) {
        toast.error(
          "Please select a valid payment method."
        );

        return;
      }

      const trimmedNote =
        String(
          note || ""
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
        setLoading(
          true
        );

        const response =
          await addNozzleReading({
            nozzleId,

            shiftName,

            staffId,

            closingReading:
              closing,

            readingDate:
              date,

            paymentMethod,

            note:
              trimmedNote,
          });

        const totalAmount =
          Number(
            response?.totalAmount ??
              response?.sale
                ?.totalAmount ??
              response?.data
                ?.totalAmount ??
              response?.data
                ?.sale
                ?.totalAmount ??
              0
          );

        toast.success(
          `₹${totalAmount.toFixed(
            2
          )} sale recorded successfully`
        );

        navigate(
          "/nozzle/readings"
        );
      } catch (error) {
        console.error(
          "SAVE READING ERROR:",
          error
        );

        toast.error(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Unable to save reading."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  /* =====================================
     RENDER
  ===================================== */

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
            Enter the shift closing
            meter reading to record
            fuel sales.
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
            noValidate
          >

            {/* =====================
                NOZZLE
            ===================== */}

            <div className="form-group">

              <label
                htmlFor="reading-nozzle"
                style={{
                  color:
                    "#2563eb",
                  fontWeight:
                    "600",
                }}
              >
                Nozzle *
              </label>

              <select
                id="reading-nozzle"
                value={
                  nozzleId
                }
                onChange={
                  handleNozzleChange
                }
                disabled={
                  nozzleLoading ||
                  loading ||
                  nozzles.length ===
                    0
                }
                required
                style={{
                  borderColor:
                    nozzleId
                      ? "#93c5fd"
                      : undefined,
                  backgroundColor:
                    nozzleId
                      ? "#eff6ff"
                      : undefined,
                }}
              >

                <option
                  value=""
                  disabled
                >
                  {nozzleLoading
                    ? "Loading nozzles..."
                    : "Select Nozzle"}
                </option>

                {nozzles.map(
                  (
                    nozzle
                  ) => (

                    <option
                      key={
                        nozzle._id
                      }
                      value={
                        nozzle._id
                      }
                    >
                      Nozzle{" "}
                      {
                        nozzle.nozzleNumber
                      }{" "}
                      -{" "}
                      {String(
                        nozzle.fuelType ||
                          ""
                      ).toLowerCase() ===
                      "diesel"
                        ? "Diesel"
                        : "Petrol"}
                    </option>

                  )
                )}

              </select>

              {!nozzleLoading &&
                nozzles.length ===
                  0 && (
                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "6px",
                      opacity:
                        0.7,
                    }}
                  >
                    No active nozzles
                    are available.
                  </small>
                )}

            </div>

            {/* =====================
                SHIFT / STAFF
            ===================== */}

            <div className="form-row">

              <div className="form-group">

                <label
                  htmlFor="reading-shift"
                >
                  Shift *
                </label>

                <select
                  id="reading-shift"
                  value={
                    shiftName
                  }
                  onChange={
                    handleShiftChange
                  }
                  disabled={
                    loading
                  }
                  required
                >

                  <option
                    value=""
                    disabled
                  >
                    Select Shift
                  </option>

                  {SHIFT_OPTIONS.map(
                    (
                      shift
                    ) => (

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

              <div className="form-group">

                <label
                  htmlFor="reading-staff"
                >
                  Staff *
                </label>

                <select
                  id="reading-staff"
                  value={
                    staffId
                  }
                  onChange={
                    handleStaffChange
                  }
                  disabled={
                    staffLoading ||
                    loading ||
                    staff.length ===
                      0
                  }
                  required
                >

                  <option
                    value=""
                    disabled
                  >
                    {staffLoading
                      ? "Loading staff..."
                      : "Select Staff"}
                  </option>

                  {staff.map(
                    (
                      user
                    ) => {

                      const role =
                        String(
                          user?.role ||
                            "staff"
                        );

                      const displayName =
                        user?.name ||
                        user?.email ||
                        "Unnamed User";

                      return (
                        <option
                          key={
                            user._id
                          }
                          value={
                            user._id
                          }
                        >
                          {
                            displayName
                          }{" "}
                          (
                          {role
                            .charAt(
                              0
                            )
                            .toUpperCase() +
                            role.slice(
                              1
                            )}
                          )
                        </option>
                      );
                    }
                  )}

                </select>

                {!staffLoading &&
                  staff.length ===
                    0 && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "6px",
                        opacity:
                          0.7,
                      }}
                    >
                      No active pump
                      staff are
                      available.
                    </small>
                  )}

              </div>

            </div>

            {/* =====================
                SELECTED STAFF
            ===================== */}

            {selectedStaff && (
              <div
                style={{
                  marginTop:
                    "-4px",
                  marginBottom:
                    "16px",
                  padding:
                    "10px 12px",
                  borderRadius:
                    "8px",
                  background:
                    "#f8fafc",
                  border:
                    "1px solid #e2e8f0",
                  fontSize:
                    "13px",
                }}
              >

                <strong>
                  Shift Staff:
                </strong>{" "}

                {
                  selectedStaff.name ||
                  selectedStaff.email ||
                  "Unnamed User"
                }

                {" • "}

                {String(
                  selectedStaff.role ||
                    "staff"
                )
                  .charAt(
                    0
                  )
                  .toUpperCase() +
                  String(
                    selectedStaff.role ||
                      "staff"
                  ).slice(
                    1
                  )}

              </div>
            )}

            {/* =====================
                SELECTED STATS
            ===================== */}

            {selectedNozzle && (

              <div className="stats-grid">

                {/* NOZZLE */}

                <div
                  className="stat-card"
                  style={{
                    border:
                      "1px solid #bfdbfe",
                    background:
                      "#eff6ff",
                  }}
                >

                  <h4
                    style={{
                      color:
                        "#2563eb",
                    }}
                  >
                    Nozzle
                  </h4>

                  <h2
                    style={{
                      color:
                        "#1d4ed8",
                    }}
                  >
                    {
                      selectedNozzle.nozzleNumber
                    }
                  </h2>

                </div>

                {/* FUEL */}

                <div
                  className="stat-card"
                  style={{
                    border:
                      String(
                        selectedNozzle.fuelType ||
                          ""
                      ).toLowerCase() ===
                      "diesel"
                        ? "1px solid #c4b5fd"
                        : "1px solid #bbf7d0",
                    background:
                      String(
                        selectedNozzle.fuelType ||
                          ""
                      ).toLowerCase() ===
                      "diesel"
                        ? "#f5f3ff"
                        : "#f0fdf4",
                  }}
                >

                  <h4
                    style={{
                      color:
                        String(
                          selectedNozzle.fuelType ||
                            ""
                        ).toLowerCase() ===
                        "diesel"
                          ? "#7c3aed"
                          : "#16a34a",
                    }}
                  >
                    Fuel
                  </h4>

                  <h2
                    style={{
                      color:
                        String(
                          selectedNozzle.fuelType ||
                            ""
                        ).toLowerCase() ===
                        "diesel"
                          ? "#6d28d9"
                          : "#15803d",
                      textTransform:
                        "capitalize",
                    }}
                  >
                    {
                      selectedNozzle.fuelType
                    }
                  </h2>

                </div>

                {/* OPENING READING */}

                <div
                  className="stat-card"
                  style={{
                    border:
                      "1px solid #fed7aa",
                    background:
                      "#fff7ed",
                  }}
                >

                  <h4
                    style={{
                      color:
                        "#ea580c",
                    }}
                  >
                    Opening Reading
                  </h4>

                  <h2
                    style={{
                      color:
                        "#c2410c",
                    }}
                  >
                    {opening.toFixed(
                      2
                    )}
                  </h2>

                </div>

                {/* FUEL SOLD / READING */}

                <div
                  className="stat-card"
                  style={{
                    border:
                      "1px solid #fecdd3",
                    background:
                      "#fff1f2",
                  }}
                >

                  <h4
                    style={{
                      color:
                        "#e11d48",
                    }}
                  >
                    Fuel Sold
                  </h4>

                  <h2
                    style={{
                      color:
                        "#be123c",
                    }}
                  >
                    {litresSold.toFixed(
                      2
                    )}{" "}
                    L
                  </h2>

                </div>

              </div>

            )}

            {/* =====================
                CLOSING / DATE
            ===================== */}

            <div className="form-row">

              <div className="form-group">

                <label
                  htmlFor="closing-reading"
                  style={{
                    color:
                      "#ea580c",
                    fontWeight:
                      "600",
                  }}
                >
                  Closing Meter Reading *
                </label>

                <input
                  id="closing-reading"
                  type="number"
                  step="0.01"
                  min={
                    selectedNozzle
                      ? opening +
                        0.01
                      : 0
                  }
                  value={
                    closingReading
                  }
                  onChange={(
                    event
                  ) =>
                    setClosingReading(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    !selectedNozzle ||
                    loading
                  }
                  placeholder={
                    selectedNozzle
                      ? `Greater than ${opening.toFixed(
                          2
                        )}`
                      : "Select nozzle first"
                  }
                  required
                  style={{
                    borderColor:
                      closingReading
                        ? "#fdba74"
                        : undefined,
                    backgroundColor:
                      closingReading
                        ? "#fff7ed"
                        : undefined,
                  }}
                />

              </div>

              <div className="form-group">

                <label
                  htmlFor="reading-date"
                >
                  Date *
                </label>

                <input
                  id="reading-date"
                  type="date"
                  value={
                    date
                  }
                  onChange={(
                    event
                  ) =>
                    setDate(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    loading
                  }
                  required
                />

              </div>

            </div>

            {/* =====================
                PAYMENT / NOTE
            ===================== */}

            <div className="form-row">

              <div className="form-group">

                <label
                  htmlFor="payment-method"
                >
                  Payment Method *
                </label>

                <select
                  id="payment-method"
                  value={
                    paymentMethod
                  }
                  onChange={(
                    event
                  ) =>
                    setPaymentMethod(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    loading
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

              <div className="form-group">

                <label
                  htmlFor="reading-note"
                >
                  Note
                </label>

                <input
                  id="reading-note"
                  type="text"
                  value={
                    note
                  }
                  onChange={(
                    event
                  ) =>
                    setNote(
                      event.target
                        .value
                    )
                  }
                  placeholder="Optional note"
                  maxLength={500}
                  disabled={
                    loading
                  }
                />

              </div>

            </div>

            {/* =====================
                SALE PREVIEW
            ===================== */}

            {selectedNozzle &&
              litresSold >
                0 && (

                <div
                  className="content-panel"
                  style={{
                    marginTop:
                      "16px",
                    padding:
                      "16px",
                  }}
                >

                  <h3>
                    Sale Preview
                  </h3>

                  <p>
                    <strong>
                      Shift:
                    </strong>{" "}
                    {
                      SHIFT_OPTIONS.find(
                        (
                          shift
                        ) =>
                          shift.value ===
                          shiftName
                      )?.label ||
                      "-"
                    }
                  </p>

                  <p>
                    <strong
                      style={{
                        color:
                          "#16a34a",
                      }}
                    >
                      Staff:
                    </strong>{" "}
                    {
                      selectedStaff?.name ||
                      selectedStaff?.email ||
                      "-"
                    }
                  </p>

                  <p>
                    <strong
                      style={{
                        color:
                          "#7c3aed",
                      }}
                    >
                      Fuel:
                    </strong>{" "}
                    {
                      selectedNozzle.fuelType
                    }
                  </p>

                  <p>
                    <strong
                      style={{
                        color:
                          "#2563eb",
                      }}
                    >
                      Opening:
                    </strong>{" "}
                    {opening.toFixed(
                      2
                    )}
                  </p>

                  <p>
                    <strong
                      style={{
                        color:
                          "#ea580c",
                      }}
                    >
                      Closing:
                    </strong>{" "}
                    {closing.toFixed(
                      2
                    )}
                  </p>

                  <p>
                    <strong
                      style={{
                        color:
                          "#e11d48",
                      }}
                    >
                      Litres:
                    </strong>{" "}
                    {litresSold.toFixed(
                      2
                    )}{" "}
                    L
                  </p>

                </div>
              )}

            {/* =====================
                ACTIONS
            ===================== */}

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate(
                    "/nozzle/readings"
                  )
                }
                disabled={
                  loading
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={
                  loading ||
                  !selectedNozzle ||
                  !shiftName ||
                  !selectedStaff ||
                  nozzles.length ===
                    0 ||
                  staff.length ===
                    0
                }
              >
                {loading
                  ? "Saving..."
                  : "Save Reading"}
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
};

export default AddReading;