import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  NavLink,
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  Plus,
  RefreshCw,
  Gauge,
  Fuel,
  Receipt,
  CalendarDays,
  FileDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  jsPDF,
} from "jspdf";

import autoTable from "jspdf-autotable";

import {
  getNozzleReadingHistory,
} from "../../services/nozzleService";

import api from "../../services/api";

/* =====================================================
   CONSTANTS
===================================================== */

const SHIFT_OPTIONS = [
  {
    value: "",
    label: "All Shifts",
  },
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

const PAYMENT_OPTIONS = [
  {
    value: "",
    label: "All Payments",
  },
  {
    value: "cash",
    label: "Cash",
  },
  {
    value: "upi",
    label: "UPI",
  },
  {
    value: "card",
    label: "Card",
  },
  {
    value: "credit",
    label: "Credit",
  },
];

const DEFAULT_FILTERS = {
  date: "",
  shift: "",
  staffId: "",
  nozzleId: "",
  paymentMethod: "",
};

/* =====================================================
   BASIC HELPERS
===================================================== */

const safeString = (
  value,
  fallback = ""
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const text = String(value).trim();

  return text || fallback;
};

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

/* =====================================================
   RESPONSE NORMALIZER

   Supports all common response structures:
   1. []
   2. { readings: [] }
   3. { data: [] }
   4. { data: { readings: [] } }
   5. { data: { data: [] } }
   6. { history: [] }
===================================================== */

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.readings)) {
    return data.readings;
  }

  if (Array.isArray(data?.history)) {
    return data.history;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.readings)) {
    return data.data.readings;
  }

  if (Array.isArray(data?.data?.history)) {
    return data.data.history;
  }

  if (Array.isArray(data?.data?.data)) {
    return data.data.data;
  }

  return [];
};

/* =====================================================
   DATE HELPERS
===================================================== */

const getReadingDate = (reading) => {
  return (
    reading?.readingDate ||
    reading?.date ||
    reading?.transactionDate ||
    reading?.entryDate ||
    reading?.createdAt ||
    null
  );
};

const getDateOnly = (value) => {
  if (!value) {
    return null;
  }

  const stringValue = String(value);

  const simpleDate = stringValue.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (simpleDate) {
    const [
      ,
      year,
      month,
      day,
    ] = simpleDate;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};

const getDateValue = (value) => {
  const date = getDateOnly(value);

  if (!date) {
    return "";
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const stringValue = String(value);

  const simpleDate = stringValue.match(
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

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return stringValue;
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

const getTodayString = () => {
  const today = new Date();

  return [
    today.getFullYear(),
    String(
      today.getMonth() + 1
    ).padStart(2, "0"),
    String(
      today.getDate()
    ).padStart(2, "0"),
  ].join("-");
};

/* =====================================================
   FUEL
===================================================== */

const getFuelType = (reading) => {
  const fuel = String(
    reading?.fuelType ||
      reading?.fuel ||
      reading?.fuelName ||
      reading?.nozzleId?.fuelType ||
      ""
  )
    .trim()
    .toLowerCase();

  if (fuel === "petrol") {
    return "Petrol";
  }

  if (
    fuel === "diesel" ||
    fuel === "disel"
  ) {
    return "Diesel";
  }

  return "-";
};

/* =====================================================
   NOZZLE
===================================================== */

const getNozzleId = (reading) => {
  if (
    reading?.nozzleId &&
    typeof reading.nozzleId === "object"
  ) {
    return (
      reading.nozzleId?._id ||
      ""
    );
  }

  return reading?.nozzleId || "";
};

const getNozzleNumber = (reading) => {
  return (
    reading?.nozzleNumber ||
    reading?.nozzleId?.nozzleNumber ||
    reading?.nozzleId?.machineName ||
    reading?.nozzleId?.name ||
    "-"
  );
};

/* =====================================================
   STAFF
===================================================== */

const getStaffId = (reading) => {
  if (
    reading?.staffId &&
    typeof reading.staffId === "object"
  ) {
    return (
      reading.staffId?._id ||
      ""
    );
  }

  return reading?.staffId || "";
};

const getStaffName = (reading) => {
  return (
    reading?.staffName ||
    reading?.staffId?.name ||
    reading?.staffId?.fullName ||
    reading?.staffId?.email ||
    "-"
  );
};

/* =====================================================
   CREATED BY
===================================================== */

const getCreatedBy = (reading) => {
  if (
    typeof reading?.createdBy === "string"
  ) {
    return (
      reading.createdBy || "-"
    );
  }

  return (
    reading?.createdBy?.name ||
    reading?.createdBy?.fullName ||
    reading?.createdBy?.username ||
    reading?.createdBy?.email ||
    reading?.createdByName ||
    reading?.addedBy?.name ||
    reading?.addedBy?.username ||
    "-"
  );
};

/* =====================================================
   SHIFT
===================================================== */

const getShiftValue = (reading) => {
  return String(
    reading?.shift ||
      reading?.shiftName ||
      ""
  )
    .trim()
    .toLowerCase();
};

const getShiftLabel = (reading) => {
  const value =
    getShiftValue(reading);

  const found =
    SHIFT_OPTIONS.find(
      (item) =>
        item.value === value
    );

  if (found) {
    return found.label.replace(
      " Shift",
      ""
    );
  }

  if (!value) {
    return "-";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
};

/* =====================================================
   PAYMENT
===================================================== */

const getPaymentValue = (reading) => {
  return String(
    reading?.paymentMethod ||
      ""
  )
    .trim()
    .toLowerCase();
};

const getPaymentLabel = (reading) => {
  const value =
    getPaymentValue(reading);

  const found =
    PAYMENT_OPTIONS.find(
      (item) =>
        item.value === value
    );

  if (found) {
    return found.label;
  }

  if (!value) {
    return "-";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
};

/* =====================================================
   FORMATTERS
===================================================== */

const formatNumber = (value) => {
  return toNumber(value).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(toNumber(value));
};

const formatPdfMoney = (value) => {
  return `INR ${toNumber(
    value
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

/* =====================================================
   PUMP HELPERS
===================================================== */

const getPumpName = (pump = {}) => {
  return safeString(
    pump?.pumpName ||
      pump?.name ||
      pump?.petrolPumpName ||
      "Petrol Pump"
  );
};

const getOwnerName = (pump = {}) => {
  return safeString(
    pump?.ownerName ||
      pump?.owner ||
      ""
  );
};

const getCompanyName = (pump = {}) => {
  return safeString(
    pump?.companyName ||
      pump?.oilCompanyName ||
      pump?.oilCompany ||
      ""
  );
};

const getPumpPhone = (pump = {}) => {
  return safeString(
    pump?.phone ||
      pump?.mobile ||
      pump?.mobileNumber ||
      ""
  );
};

const getPumpEmail = (pump = {}) => {
  return safeString(
    pump?.email || ""
  );
};

const getPumpGstin = (pump = {}) => {
  return safeString(
    pump?.gstin ||
      pump?.gstNo ||
      ""
  );
};

const getPumpAddress = (pump = {}) => {
  return safeString(
    pump?.address || ""
  );
};

const getPumpCity = (pump = {}) => {
  return safeString(
    pump?.city || ""
  );
};

const getPumpState = (pump = {}) => {
  return safeString(
    pump?.state || ""
  );
};

const getPumpPincode = (pump = {}) => {
  return safeString(
    pump?.pincode ||
      pump?.pinCode ||
      ""
  );
};

/* =====================================================
   DATE RANGE
===================================================== */

const getThisMonthRange = () => {
  const today = new Date();

  const year =
    today.getFullYear();

  const month =
    today.getMonth();

  return {
    from: new Date(
      year,
      month,
      1
    ),

    to: new Date(
      year,
      month,
      today.getDate()
    ),
  };
};

const getThisYearRange = () => {
  const today = new Date();

  const year =
    today.getFullYear();

  return {
    from: new Date(
      year,
      0,
      1
    ),

    to: new Date(
      year,
      today.getMonth(),
      today.getDate()
    ),
  };
};

/* =====================================================
   COMPONENT
===================================================== */

const ReadingHistory = () => {
  const [
    readings,
    setReadings,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    filters,
    setFilters,
  ] = useState(
    DEFAULT_FILTERS
  );

  const [
    pumpSettings,
    setPumpSettings,
  ] = useState({});

  const [
    showPdfOptions,
    setShowPdfOptions,
  ] = useState(false);

  const [
    pdfLoading,
    setPdfLoading,
  ] = useState(false);

  const [
    customFromDate,
    setCustomFromDate,
  ] = useState("");

  const [
    customToDate,
    setCustomToDate,
  ] = useState("");

  const mountedRef =
    useRef(true);

  const loadingRef =
    useRef(false);

  const refreshTimerRef =
    useRef(null);

  /* ===================================================
     CLEANUP
  =================================================== */

  useEffect(() => {
    return () => {
      mountedRef.current =
        false;

      if (
        refreshTimerRef.current
      ) {
        window.clearTimeout(
          refreshTimerRef.current
        );
      }
    };
  }, []);

  /* ===================================================
     LOAD COMPLETE HISTORY

     THIS IS THE IMPORTANT PART.

     ReadingHistory NEVER calls:
     getNozzleReadings()

     It ONLY calls:
     getNozzleReadingHistory()

     The returned complete collection is stored in
     `readings`.

     Every filter/table/PDF calculation works from
     this same collection.
  =================================================== */

  const loadReadings =
    useCallback(
      async ({
        silent = false,
        manualRefresh = false,
      } = {}) => {
        if (
          loadingRef.current
        ) {
          return;
        }

        loadingRef.current =
          true;

        if (
          manualRefresh
        ) {
          setRefreshing(true);
        } else if (!silent) {
          setLoading(true);
        }

        try {
          const response =
            await getNozzleReadingHistory();

          if (
            !mountedRef.current
          ) {
            return;
          }

          const completeHistory =
            normalizeListResponse(
              response
            );

          /*
           * IMPORTANT:
           * Replace the entire local history.
           *
           * Do NOT append.
           * Do NOT slice.
           * Do NOT paginate.
           */
          setReadings(
            Array.isArray(
              completeHistory
            )
              ? completeHistory
              : []
          );
        } catch (error) {
          if (
            !mountedRef.current
          ) {
            return;
          }

          console.error(
            "LOAD COMPLETE NOZZLE READING HISTORY ERROR:",
            error
          );

          if (!silent) {
            toast.error(
              error?.response?.data?.message ||
                error?.message ||
                "Unable to load nozzle reading history"
            );
          }

          setReadings([]);
        } finally {
          loadingRef.current =
            false;

          if (
            !mountedRef.current
          ) {
            return;
          }

          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  /* ===================================================
     LOAD PUMP SETTINGS
  =================================================== */

  const loadPumpSettings =
    useCallback(
      async () => {
        try {
          const response =
            await api.get(
              "/settings/pump"
            );

          const settings =
            response?.settings ||
            response?.data?.settings ||
            response?.data?.pump ||
            response?.data ||
            {};

          if (
            mountedRef.current
          ) {
            setPumpSettings(
              settings || {}
            );
          }
        } catch (error) {
          console.warn(
            "LOAD PUMP SETTINGS ERROR:",
            error
          );

          if (
            mountedRef.current
          ) {
            setPumpSettings({});
          }
        }
      },
      []
    );

  /* ===================================================
     INITIAL LOAD
  =================================================== */

  useEffect(() => {
    loadReadings();
    loadPumpSettings();
  }, [
    loadReadings,
    loadPumpSettings,
  ]);

  /* ===================================================
     REFRESH ON FOCUS / VISIBILITY
  =================================================== */

  useEffect(() => {
    const refresh = () => {
      if (
        document.visibilityState ===
        "hidden"
      ) {
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
        window.setTimeout(
          () => {
            if (
              mountedRef.current
            ) {
              loadReadings({
                silent: true,
              });
            }
          },
          250
        );
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
    loadReadings,
  ]);

  /* ===================================================
     MANUAL REFRESH
  =================================================== */

  const handleRefresh =
    useCallback(() => {
      loadReadings({
        manualRefresh: true,
      });
    }, [
      loadReadings,
    ]);

  /* ===================================================
     NOZZLE OPTIONS
  =================================================== */

  const nozzleOptions =
    useMemo(() => {
      const map = new Map();

      readings.forEach(
        (reading) => {
          const nozzle =
            reading?.nozzleId &&
            typeof reading.nozzleId ===
              "object"
              ? reading.nozzleId
              : {};

          const id = String(
            nozzle?._id ||
              getNozzleId(
                reading
              ) ||
              ""
          );

          const name =
            nozzle?.nozzleNumber ||
            reading?.nozzleNumber ||
            nozzle?.machineName ||
            nozzle?.name ||
            "-";

          if (
            id &&
            id !==
              "[object Object]" &&
            !map.has(id)
          ) {
            map.set(
              id,
              {
                id,
                name,
              }
            );
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          String(
            a.name
          ).localeCompare(
            String(
              b.name
            ),
            undefined,
            {
              numeric: true,
            }
          )
      );
    }, [
      readings,
    ]);

  /* ===================================================
     STAFF OPTIONS
  =================================================== */

  const staffOptions =
    useMemo(() => {
      const map = new Map();

      readings.forEach(
        (reading) => {
          const staff =
            reading?.staffId &&
            typeof reading.staffId ===
              "object"
              ? reading.staffId
              : {};

          const id = String(
            staff?._id ||
              getStaffId(
                reading
              ) ||
              ""
          );

          const name =
            reading?.staffName ||
            staff?.name ||
            staff?.fullName ||
            staff?.email ||
            "Unknown Staff";

          if (
            id &&
            id !==
              "[object Object]" &&
            !map.has(id)
          ) {
            map.set(
              id,
              {
                id,
                name,
              }
            );
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          String(
            a.name
          ).localeCompare(
            String(
              b.name
            )
          )
      );
    }, [
      readings,
    ]);

  /* ===================================================
     FILTER HANDLER
  =================================================== */

  const handleFilterChange =
    useCallback(
      (event) => {
        const {
          name,
          value,
        } = event.target;

        setFilters(
          (previous) => ({
            ...previous,
            [name]: value,
          })
        );
      },
      []
    );

  /* ===================================================
     CLEAR FILTERS
  =================================================== */

  const clearFilters =
    useCallback(() => {
      setFilters({
        ...DEFAULT_FILTERS,
      });
    }, []);

  /* ===================================================
     CLIENT-SIDE FILTERING

     NEVER CALL API HERE.

     This works against the COMPLETE `readings`
     collection loaded above.
  =================================================== */

  const filteredReadings =
    useMemo(() => {
      return readings.filter(
        (reading) => {
          const readingDate =
            getDateValue(
              getReadingDate(
                reading
              )
            );

          const shift =
            getShiftValue(
              reading
            );

          const payment =
            getPaymentValue(
              reading
            );

          const nozzleId =
            String(
              getNozzleId(
                reading
              ) || ""
            );

          const staffId =
            String(
              getStaffId(
                reading
              ) || ""
            );

          if (
            filters.date &&
            readingDate !==
              filters.date
          ) {
            return false;
          }

          if (
            filters.shift &&
            shift !==
              filters.shift
          ) {
            return false;
          }

          if (
            filters.staffId &&
            staffId !==
              filters.staffId
          ) {
            return false;
          }

          if (
            filters.nozzleId &&
            nozzleId !==
              filters.nozzleId
          ) {
            return false;
          }

          if (
            filters.paymentMethod &&
            payment !==
              filters.paymentMethod
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      readings,
      filters,
    ]);

  /* ===================================================
     TOTALS
  =================================================== */

  const totals =
    useMemo(() => {
      return filteredReadings.reduce(
        (
          result,
          reading
        ) => {
          result.litres +=
            toNumber(
              reading?.litresSold
            );

          result.amount +=
            toNumber(
              reading?.totalAmount
            );

          return result;
        },
        {
          litres: 0,
          amount: 0,
        }
      );
    }, [
      filteredReadings,
    ]);

  const petrolLitres =
    useMemo(() => {
      return filteredReadings.reduce(
        (
          total,
          reading
        ) => {
          if (
            getFuelType(
              reading
            ) ===
            "Petrol"
          ) {
            return (
              total +
              toNumber(
                reading?.litresSold
              )
            );
          }

          return total;
        },
        0
      );
    }, [
      filteredReadings,
    ]);

  const dieselLitres =
    useMemo(() => {
      return filteredReadings.reduce(
        (
          total,
          reading
        ) => {
          if (
            getFuelType(
              reading
            ) ===
            "Diesel"
          ) {
            return (
              total +
              toNumber(
                reading?.litresSold
              )
            );
          }

          return total;
        },
        0
      );
    }, [
      filteredReadings,
    ]);

  /* ===================================================
     PDF DATE FILTER

     PDF ALSO USES THE COMPLETE LOCAL HISTORY.

     NO EXTRA API REQUEST.
  =================================================== */

  const filterReadingsByDate =
    useCallback(
      (
        from,
        to
      ) => {
        const start =
          getDateOnly(from);

        const end =
          getDateOnly(to);

        if (
          !start ||
          !end
        ) {
          return [];
        }

        return readings
          .filter(
            (reading) => {
              const readingDate =
                getDateOnly(
                  getReadingDate(
                    reading
                  )
                );

              if (
                !readingDate
              ) {
                return false;
              }

              return (
                readingDate >=
                  start &&
                readingDate <=
                  end
              );
            }
          )
          .sort(
            (a, b) => {
              const dateA =
                getDateOnly(
                  getReadingDate(
                    a
                  )
                )?.getTime() || 0;

              const dateB =
                getDateOnly(
                  getReadingDate(
                    b
                  )
                )?.getTime() || 0;

              return (
                dateA -
                dateB
              );
            }
          );
      },
      [
        readings,
      ]
    );

  /* ===================================================
     PDF GENERATION
  =================================================== */

  const generateReadingPDF =
    useCallback(
      (
        reportReadings,
        fromDate,
        toDate,
        reportTitle
      ) => {
        const doc =
          new jsPDF({
            orientation:
              "landscape",
            unit: "mm",
            format: "a4",
          });

        const pageWidth =
          doc.internal.pageSize.getWidth();

        const pumpName =
          getPumpName(
            pumpSettings
          );

        const ownerName =
          getOwnerName(
            pumpSettings
          );

        const companyName =
          getCompanyName(
            pumpSettings
          );

        const phone =
          getPumpPhone(
            pumpSettings
          );

        const email =
          getPumpEmail(
            pumpSettings
          );

        const gstin =
          getPumpGstin(
            pumpSettings
          );

        const address =
          getPumpAddress(
            pumpSettings
          );

        const location =
          [
            getPumpCity(
              pumpSettings
            ),
            getPumpState(
              pumpSettings
            ),
            getPumpPincode(
              pumpSettings
            ),
          ]
            .filter(Boolean)
            .join(", ");

        const periodLabel =
          `${formatDate(
            fromDate
          )} - ${formatDate(
            toDate
          )}`;

        /* ==========================================
           HEADER
        ========================================== */

        doc.setFillColor(
          15,
          61,
          86
        );

        doc.rect(
          0,
          0,
          pageWidth,
          12,
          "F"
        );

        doc.setTextColor(
          255,
          255,
          255
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(13);

        doc.text(
          "SHIVSHAMBHO",
          14,
          8
        );

        doc.setFontSize(9);

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.text(
          "NOZZLE READING REPORT",
          pageWidth - 14,
          8,
          {
            align: "right",
          }
        );

        doc.setTextColor(
          17,
          24,
          39
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(15);

        doc.text(
          pumpName,
          14,
          23
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8.5);

        let infoY = 29;

        if (companyName) {
          doc.text(
            `Dealer: ${companyName}`,
            14,
            infoY
          );

          infoY += 5;
        }

        if (
          address ||
          location
        ) {
          doc.text(
            [
              address,
              location,
            ]
              .filter(Boolean)
              .join(" | "),
            14,
            infoY,
            {
              maxWidth: 145,
            }
          );

          infoY += 5;
        }

        if (ownerName) {
          doc.text(
            `Owner: ${ownerName}`,
            14,
            infoY
          );

          infoY += 5;
        }

        if (gstin) {
          doc.text(
            `GSTIN: ${gstin}`,
            14,
            infoY
          );
        }

        if (
          phone ||
          email
        ) {
          const rightInfo =
            [
              phone
                ? `Phone: ${phone}`
                : "",
              email
                ? `Email: ${email}`
                : "",
            ]
              .filter(Boolean)
              .join(" | ");

          doc.text(
            rightInfo,
            pageWidth - 14,
            29,
            {
              align: "right",
              maxWidth: 105,
            }
          );
        }

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(10);

        doc.text(
          reportTitle,
          pageWidth - 14,
          39,
          {
            align: "right",
          }
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(8.5);

        doc.text(
          periodLabel,
          pageWidth - 14,
          45,
          {
            align: "right",
          }
        );

        /* ==========================================
           SUMMARY
        ========================================== */

        const summaryY =
          Math.max(
            52,
            infoY + 8
          );

        const reportPetrol =
          reportReadings.reduce(
            (
              total,
              reading
            ) =>
              total +
              (
                getFuelType(
                  reading
                ) ===
                "Petrol"
                  ? toNumber(
                      reading?.litresSold
                    )
                  : 0
              ),
            0
          );

        const reportDiesel =
          reportReadings.reduce(
            (
              total,
              reading
            ) =>
              total +
              (
                getFuelType(
                  reading
                ) ===
                "Diesel"
                  ? toNumber(
                      reading?.litresSold
                    )
                  : 0
              ),
            0
          );

        const reportAmount =
          reportReadings.reduce(
            (
              total,
              reading
            ) =>
              total +
              toNumber(
                reading?.totalAmount
              ),
            0
          );

        const summaryItems = [
          [
            "Records",
            String(
              reportReadings.length
            ),
          ],
          [
            "Petrol Sold",
            `${formatNumber(
              reportPetrol
            )} L`,
          ],
          [
            "Diesel Sold",
            `${formatNumber(
              reportDiesel
            )} L`,
          ],
          [
            "Total Sales",
            formatPdfMoney(
              reportAmount
            ),
          ],
        ];

        const cardWidth =
          (
            pageWidth -
            28 -
            18
          ) / 4;

        summaryItems.forEach(
          (
            item,
            index
          ) => {
            const x =
              14 +
              index *
                (
                  cardWidth +
                  6
                );

            doc.setFillColor(
              244,
              247,
              250
            );

            doc.roundedRect(
              x,
              summaryY,
              cardWidth,
              18,
              2,
              2,
              "F"
            );

            doc.setTextColor(
              100,
              116,
              139
            );

            doc.setFontSize(7.5);

            doc.setFont(
              "helvetica",
              "normal"
            );

            doc.text(
              item[0],
              x + 4,
              summaryY + 6
            );

            doc.setTextColor(
              15,
              61,
              86
            );

            doc.setFont(
              "helvetica",
              "bold"
            );

            doc.setFontSize(10);

            doc.text(
              item[1],
              x + 4,
              summaryY + 13
            );
          }
        );

        /* ==========================================
           TABLE
        ========================================== */

        const tableData =
          reportReadings.map(
            (
              reading,
              index
            ) => [
              index + 1,

              formatDate(
                getReadingDate(
                  reading
                )
              ),

              getNozzleNumber(
                reading
              ),

              getFuelType(
                reading
              ),

              getShiftLabel(
                reading
              ),

              getStaffName(
                reading
              ),

              formatNumber(
                reading?.openingReading
              ),

              formatNumber(
                reading?.closingReading
              ),

              `${formatNumber(
                reading?.litresSold
              )} L`,

              formatPdfMoney(
                reading?.totalAmount
              ),

              getPaymentLabel(
                reading
              ),

              getCreatedBy(
                reading
              ),
            ]
          );

        autoTable(
          doc,
          {
            startY:
              summaryY + 27,

            head: [
              [
                "#",
                "Date",
                "Nozzle",
                "Fuel",
                "Shift",
                "Staff",
                "Opening",
                "Closing",
                "Litres Sold",
                "Amount",
                "Payment",
                "Added By",
              ],
            ],

            body:
              tableData,

            theme:
              "grid",

            styles: {
              font:
                "helvetica",
              fontSize:
                7,
              cellPadding:
                2.5,
              textColor:
                [
                  17,
                  24,
                  39,
                ],
              lineColor:
                [
                  203,
                  213,
                  225,
                ],
              lineWidth:
                0.15,
              valign:
                "middle",
            },

            headStyles: {
              fillColor:
                [
                  15,
                  61,
                  86,
                ],
              textColor:
                [
                  255,
                  255,
                  255,
                ],
              fontStyle:
                "bold",
              fontSize:
                7,
            },

            alternateRowStyles: {
              fillColor:
                [
                  248,
                  250,
                  252,
                ],
            },

            columnStyles: {
              0: {
                halign:
                  "center",
                cellWidth:
                  8,
              },

              1: {
                cellWidth:
                  22,
              },

              2: {
                cellWidth:
                  18,
              },

              3: {
                cellWidth:
                  18,
              },

              4: {
                cellWidth:
                  20,
              },

              5: {
                cellWidth:
                  30,
                overflow:
                  "linebreak",
              },

              6: {
                halign:
                  "right",
                cellWidth:
                  22,
              },

              7: {
                halign:
                  "right",
                cellWidth:
                  22,
              },

              8: {
                halign:
                  "right",
                cellWidth:
                  24,
              },

              9: {
                halign:
                  "right",
                cellWidth:
                  27,
              },

              10: {
                cellWidth:
                  20,
              },

              11: {
                cellWidth:
                  30,
                overflow:
                  "linebreak",
              },
            },

            didDrawPage:
              (data) => {
                const pageHeight =
                  doc.internal.pageSize.getHeight();

                doc.setDrawColor(
                  203,
                  213,
                  225
                );

                doc.line(
                  14,
                  pageHeight - 15,
                  pageWidth - 14,
                  pageHeight - 15
                );

                doc.setTextColor(
                  100,
                  116,
                  139
                );

                doc.setFontSize(7);

                doc.setFont(
                  "helvetica",
                  "normal"
                );

                doc.text(
                  `Petrol Pump Management System | ${pumpName}`,
                  14,
                  pageHeight - 9
                );

                doc.text(
                  `Page ${data.pageNumber}`,
                  pageWidth - 14,
                  pageHeight - 9,
                  {
                    align: "right",
                  }
                );
              },
          }
        );

        /* ==========================================
           FILE NAME
        ========================================== */

        const safePumpName =
          String(
            pumpName
          )
            .replace(
              /[^a-zA-Z0-9]+/g,
              "_"
            )
            .replace(
              /^_+|_+$/g,
              ""
            ) ||
          "Petrol_Pump";

        doc.save(
          `Nozzle_Reading_Report_${safePumpName}_${getTodayString()}.pdf`
        );
      },
      [
        pumpSettings,
      ]
    );

  /* ===================================================
     RUN PDF
  =================================================== */

  const runPdfGeneration =
    useCallback(
      (
        from,
        to,
        title
      ) => {
        try {
          setPdfLoading(true);

          const filtered =
            filterReadingsByDate(
              from,
              to
            );

          generateReadingPDF(
            filtered,
            from,
            to,
            title
          );

          toast.success(
            "Nozzle reading PDF generated successfully."
          );

          setShowPdfOptions(false);
        } catch (error) {
          console.error(
            "NOZZLE PDF GENERATION ERROR:",
            error
          );

          toast.error(
            error?.message ||
              "Failed to generate nozzle reading PDF"
          );
        } finally {
          setPdfLoading(false);
        }
      },
      [
        filterReadingsByDate,
        generateReadingPDF,
      ]
    );

  /* ===================================================
     THIS MONTH PDF
  =================================================== */

  const handleThisMonthPDF =
    useCallback(() => {
      const {
        from,
        to,
      } =
        getThisMonthRange();

      runPdfGeneration(
        from,
        to,
        "This Month"
      );
    }, [
      runPdfGeneration,
    ]);

  /* ===================================================
     THIS YEAR PDF
  =================================================== */

  const handleThisYearPDF =
    useCallback(() => {
      const {
        from,
        to,
      } =
        getThisYearRange();

      runPdfGeneration(
        from,
        to,
        "This Year"
      );
    }, [
      runPdfGeneration,
    ]);

  /* ===================================================
     CUSTOM PDF
  =================================================== */

  const handleCustomPDF =
    useCallback(() => {
      if (
        !customFromDate ||
        !customToDate
      ) {
        toast.error(
          "Please select both From and To dates."
        );

        return;
      }

      const from =
        new Date(
          `${customFromDate}T00:00:00`
        );

      const to =
        new Date(
          `${customToDate}T23:59:59`
        );

      if (
        Number.isNaN(
          from.getTime()
        ) ||
        Number.isNaN(
          to.getTime()
        )
      ) {
        toast.error(
          "Please select valid dates."
        );

        return;
      }

      if (from > to) {
        toast.error(
          "From date cannot be after To date."
        );

        return;
      }

      const today =
        new Date();

      today.setHours(
        23,
        59,
        59,
        999
      );

      if (to > today) {
        toast.error(
          "To date cannot be in the future."
        );

        return;
      }

      runPdfGeneration(
        from,
        to,
        "Custom Date Range"
      );
    }, [
      customFromDate,
      customToDate,
      runPdfGeneration,
    ]);

  /* ===================================================
     UI
  =================================================== */

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

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >

          {/* REFRESH */}

          <button
            type="button"
            className="secondary-button"
            onClick={
              handleRefresh
            }
            disabled={
              loading ||
              refreshing
            }
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          {/* ADD READING */}

          <NavLink
            to="/nozzle/readings/add"
            className="primary-button"
          >
            <Plus size={17} />
            Add Reading
          </NavLink>

          {/* PDF */}

          <div
            style={{
              position: "relative",
            }}
          >

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setShowPdfOptions(
                  (previous) =>
                    !previous
                )
              }
              disabled={
                loading ||
                pdfLoading
              }
            >
              {pdfLoading ? (
                <RefreshCw
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <FileDown
                  size={17}
                />
              )}

              Download PDF

              {showPdfOptions ? (
                <ChevronUp
                  size={15}
                />
              ) : (
                <ChevronDown
                  size={15}
                />
              )}
            </button>

            {showPdfOptions && (
              <div
                style={{
                  position:
                    "absolute",
                  top:
                    "calc(100% + 8px)",
                  right: 0,
                  zIndex: 200,
                  width: "310px",
                  maxWidth:
                    "calc(100vw - 30px)",
                  background:
                    "#ffffff",
                  border:
                    "1px solid #e5e7eb",
                  borderRadius:
                    "12px",
                  boxShadow:
                    "0 14px 35px rgba(0, 0, 0, 0.16)",
                  padding: "14px",
                }}
              >

                <div
                  style={{
                    marginBottom:
                      "12px",
                    paddingBottom:
                      "10px",
                    borderBottom:
                      "1px solid #e5e7eb",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: "15px",
                    }}
                  >
                    Download Reading Report
                  </strong>

                  <small
                    style={{
                      color: "#6b7280",
                      display: "block",
                      marginTop: "4px",
                    }}
                  >
                    Select the period
                    for the PDF report.
                  </small>
                </div>

                <button
                  type="button"
                  onClick={
                    handleThisMonthPDF
                  }
                  disabled={
                    pdfLoading ||
                    readings.length ===
                      0
                  }
                  style={{
                    width: "100%",
                    border:
                      "1px solid #e5e7eb",
                    background:
                      "#ffffff",
                    borderRadius:
                      "8px",
                    padding:
                      "10px 12px",
                    cursor:
                      pdfLoading
                        ? "not-allowed"
                        : "pointer",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "10px",
                    textAlign:
                      "left",
                    marginBottom:
                      "8px",
                  }}
                >
                  <CalendarDays
                    size={17}
                  />

                  <span>
                    <strong
                      style={{
                        display:
                          "block",
                      }}
                    >
                      This Month
                    </strong>

                    <small
                      style={{
                        color:
                          "#6b7280",
                      }}
                    >
                      Download current
                      month's readings
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={
                    handleThisYearPDF
                  }
                  disabled={
                    pdfLoading ||
                    readings.length ===
                      0
                  }
                  style={{
                    width: "100%",
                    border:
                      "1px solid #e5e7eb",
                    background:
                      "#ffffff",
                    borderRadius:
                      "8px",
                    padding:
                      "10px 12px",
                    cursor:
                      pdfLoading
                        ? "not-allowed"
                        : "pointer",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "10px",
                    textAlign:
                      "left",
                    marginBottom:
                      "12px",
                  }}
                >
                  <CalendarDays
                    size={17}
                  />

                  <span>
                    <strong
                      style={{
                        display:
                          "block",
                      }}
                    >
                      This Year
                    </strong>

                    <small
                      style={{
                        color:
                          "#6b7280",
                      }}
                    >
                      Download current
                      year's readings
                    </small>
                  </span>
                </button>

                <div
                  style={{
                    borderTop:
                      "1px solid #e5e7eb",
                    paddingTop:
                      "12px",
                  }}
                >

                  <strong
                    style={{
                      display:
                        "block",
                      fontSize:
                        "14px",
                      marginBottom:
                        "9px",
                    }}
                  >
                    Custom Date Range
                  </strong>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: "8px",
                    }}
                  >

                    <div>
                      <label
                        style={{
                          display:
                            "block",
                          fontSize:
                            "12px",
                          color:
                            "#6b7280",
                          marginBottom:
                            "4px",
                        }}
                      >
                        From
                      </label>

                      <input
                        type="date"
                        value={
                          customFromDate
                        }
                        max={
                          customToDate ||
                          getTodayString()
                        }
                        onChange={(
                          event
                        ) =>
                          setCustomFromDate(
                            event
                              .target
                              .value
                          )
                        }
                        style={{
                          width:
                            "100%",
                          boxSizing:
                            "border-box",
                          padding:
                            "8px",
                          border:
                            "1px solid #d1d5db",
                          borderRadius:
                            "7px",
                          fontSize:
                            "12px",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display:
                            "block",
                          fontSize:
                            "12px",
                          color:
                            "#6b7280",
                          marginBottom:
                            "4px",
                        }}
                      >
                        To
                      </label>

                      <input
                        type="date"
                        value={
                          customToDate
                        }
                        min={
                          customFromDate ||
                          undefined
                        }
                        max={
                          getTodayString()
                        }
                        onChange={(
                          event
                        ) =>
                          setCustomToDate(
                            event
                              .target
                              .value
                          )
                        }
                        style={{
                          width:
                            "100%",
                          boxSizing:
                            "border-box",
                          padding:
                            "8px",
                          border:
                            "1px solid #d1d5db",
                          borderRadius:
                            "7px",
                          fontSize:
                            "12px",
                        }}
                      />
                    </div>

                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      handleCustomPDF
                    }
                    disabled={
                      pdfLoading ||
                      !customFromDate ||
                      !customToDate ||
                      readings.length ===
                        0
                    }
                    style={{
                      width: "100%",
                      justifyContent:
                        "center",
                      marginTop:
                        "10px",
                    }}
                  >
                    <FileDown
                      size={16}
                    />

                    {pdfLoading
                      ? "Generating..."
                      : "Download Custom PDF"}
                  </button>

                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* FILTERS */}

      <div
        className="content-panel"
        style={{
          marginBottom:
            "18px",
        }}
      >

        <div className="content-panel-header">

          <div>
            <h2>
              Reading Filters
            </h2>

            <p>
              Filter loaded readings
              by date, shift, staff,
              nozzle and payment.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={
              clearFilters
            }
            disabled={
              loading
            }
          >
            Clear Filters
          </button>

        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            padding:
              "0 18px 18px",
          }}
        >

          <div className="form-group">
            <label htmlFor="reading-filter-date">
              Date
            </label>

            <input
              id="reading-filter-date"
              type="date"
              name="date"
              value={
                filters.date
              }
              onChange={
                handleFilterChange
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="reading-filter-shift">
              Shift
            </label>

            <select
              id="reading-filter-shift"
              name="shift"
              value={
                filters.shift
              }
              onChange={
                handleFilterChange
              }
            >
              {SHIFT_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reading-filter-staff">
              Staff
            </label>

            <select
              id="reading-filter-staff"
              name="staffId"
              value={
                filters.staffId
              }
              onChange={
                handleFilterChange
              }
            >
              <option value="">
                All Staff
              </option>

              {staffOptions.map(
                (staff) => (
                  <option
                    key={
                      staff.id
                    }
                    value={
                      staff.id
                    }
                  >
                    {
                      staff.name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reading-filter-nozzle">
              Nozzle
            </label>

            <select
              id="reading-filter-nozzle"
              name="nozzleId"
              value={
                filters.nozzleId
              }
              onChange={
                handleFilterChange
              }
            >
              <option value="">
                All Nozzles
              </option>

              {nozzleOptions.map(
                (nozzle) => (
                  <option
                    key={
                      nozzle.id
                    }
                    value={
                      nozzle.id
                    }
                  >
                    {
                      nozzle.name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reading-filter-payment">
              Payment
            </label>

            <select
              id="reading-filter-payment"
              name="paymentMethod"
              value={
                filters.paymentMethod
              }
              onChange={
                handleFilterChange
              }
            >
              {PAYMENT_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </div>

        </div>

      </div>

      {/* SUMMARY */}

      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-card-icon">
            <Fuel size={22} />
          </div>

          <div>
            <h4>
              Petrol Sold
            </h4>

            <h2>
              {formatNumber(
                petrolLitres
              )}{" "}
              L
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">
            <Fuel size={22} />
          </div>

          <div>
            <h4>
              Diesel Sold
            </h4>

            <h2>
              {formatNumber(
                dieselLitres
              )}{" "}
              L
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">
            <Receipt size={22} />
          </div>

          <div>
            <h4>
              Total Sales
            </h4>

            <h2>
              {formatCurrency(
                totals.amount
              )}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon">
            <Gauge size={22} />
          </div>

          <div>
            <h4>
              Total Readings
            </h4>

            <h2>
              {
                filteredReadings.length
              }
            </h2>
          </div>
        </div>

      </div>

      {/* TABLE */}

      <div className="content-panel">

        <div className="content-panel-header">

          <div>
            <h2>
              Reading Records
            </h2>

            <p>
              Nozzle meter readings,
              shifts, staff and fuel
              sales.
            </p>
          </div>

          {readings.length > 0 && (
            <div
              style={{
                fontSize:
                  "13px",
                color:
                  "#64748b",
              }}
            >
              Showing{" "}
              <strong>
                {
                  filteredReadings.length
                }
              </strong>{" "}
              of{" "}
              <strong>
                {
                  readings.length
                }
              </strong>{" "}
              readings
            </div>
          )}

        </div>

        {loading ? (

          <div
            style={{
              padding:
                "40px",
              textAlign:
                "center",
            }}
          >
            <RefreshCw
              size={30}
              className="animate-spin"
            />

            <p
              style={{
                marginTop:
                  "12px",
              }}
            >
              Loading reading
              history...
            </p>
          </div>

        ) : readings.length === 0 ? (

          <div
            style={{
              padding:
                "50px 20px",
              textAlign:
                "center",
            }}
          >
            <Gauge size={40} />

            <h3
              style={{
                marginTop:
                  "15px",
              }}
            >
              No Reading Records
            </h3>

            <p>
              No nozzle meter
              reading has been
              recorded yet.
            </p>

            <NavLink
              to="/nozzle/readings/add"
              className="primary-button"
              style={{
                marginTop:
                  "15px",
                display:
                  "inline-flex",
              }}
            >
              <Plus size={17} />
              Add First Reading
            </NavLink>
          </div>

        ) : filteredReadings.length === 0 ? (

          <div
            style={{
              padding:
                "50px 20px",
              textAlign:
                "center",
            }}
          >
            <Gauge size={40} />

            <h3
              style={{
                marginTop:
                  "15px",
              }}
            >
              No Matching Readings
            </h3>

            <p>
              No readings match
              the selected filters.
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={
                clearFilters
              }
              style={{
                marginTop:
                  "15px",
              }}
            >
              Clear Filters
            </button>
          </div>

        ) : (

          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Nozzle</th>
                  <th>Fuel</th>
                  <th>Shift</th>
                  <th>Staff</th>
                  <th>Opening</th>
                  <th>Closing</th>
                  <th>Litres Sold</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Added By</th>
                  <th>Note</th>
                </tr>
              </thead>

              <tbody>

                {filteredReadings.map(
                  (
                    reading,
                    index
                  ) => (
                    <tr
                      key={
                        reading?._id ||
                        reading?.id ||
                        `reading-${index}`
                      }
                    >

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        {formatDate(
                          getReadingDate(
                            reading
                          )
                        )}
                      </td>

                      <td>
                        <strong>
                          {
                            getNozzleNumber(
                              reading
                            )
                          }
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`fuel-badge ${
                            getFuelType(
                              reading
                            ) ===
                            "Petrol"
                              ? "petrol"
                              : "diesel"
                          }`}
                        >
                          {
                            getFuelType(
                              reading
                            )
                          }
                        </span>
                      </td>

                      <td>
                        <span
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            padding:
                              "4px 9px",
                            borderRadius:
                              "999px",
                            background:
                              "#f1f5f9",
                            fontSize:
                              "12px",
                            fontWeight:
                              "600",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            getShiftLabel(
                              reading
                            )
                          }
                        </span>
                      </td>

                      <td>
                        <strong>
                          {
                            getStaffName(
                              reading
                            )
                          }
                        </strong>
                      </td>

                      <td>
                        {formatNumber(
                          reading?.openingReading
                        )}
                      </td>

                      <td>
                        {formatNumber(
                          reading?.closingReading
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatNumber(
                            reading?.litresSold
                          )}{" "}
                          L
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            reading?.totalAmount
                          )}
                        </strong>
                      </td>

                      <td>
                        {
                          getPaymentLabel(
                            reading
                          )
                        }
                      </td>

                      <td>
                        {
                          getCreatedBy(
                            reading
                          )
                        }
                      </td>

                      <td>
                        {
                          reading?.note ||
                          "-"
                        }
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
};

export default ReadingHistory;