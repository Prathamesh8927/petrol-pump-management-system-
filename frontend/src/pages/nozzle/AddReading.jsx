import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import toast from "react-hot-toast";

import Breadcrumbs from "../../components/Breadcrumbs";

import {
  getNozzles,
  addNozzleReading,
  getNozzleReadingHistory,
  updateNozzleReading,
} from "../../services/nozzleService";

import {
  createPayment,
  getPaymentStatus,
  cancelPayment,
} from "../../services/paymentService";

import {
  getFuelPrice,
} from "../../services/fuelService";

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

const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  credit: "Credit",
};

/* =====================================================
   TODAY
===================================================== */

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

/* =====================================================
   CURRENT TIME
===================================================== */

const getCurrentTime = () => {
  const now = new Date();

  const hours = String(
    now.getHours()
  ).padStart(2, "0");

  const minutes = String(
    now.getMinutes()
  ).padStart(2, "0");

  return `${hours}:${minutes}`;
};

/* =====================================================
   DATE VALIDATION
===================================================== */

const isValidDate = (
  value
) => {
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

/* =====================================================
   TIME VALIDATION
===================================================== */

const isValidTime = (
  value
) => {
  return (
    typeof value === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
      value
    )
  );
};

/* =====================================================
   ROUND MONEY
===================================================== */

const roundMoney = (
  value
) => {
  const number = Number(
    value
  );

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Number(
    number.toFixed(2)
  );
};

/* =====================================================
   NORMALIZE PAYMENT METHOD
===================================================== */

const normalizePaymentMethod = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
};

/* =====================================================
   NORMALIZE PAYMENT ARRAY
===================================================== */

const normalizePayments = (
  payments,
  fallbackMethod = "cash",
  fallbackAmount = 0
) => {
  if (
    Array.isArray(payments) &&
    payments.length > 0
  ) {
    const normalized =
      payments
        .map((payment) => ({
          method:
            normalizePaymentMethod(
              payment?.method
            ),
          amount: roundMoney(
            payment?.amount
          ),
        }))
        .filter(
          (payment) =>
            PAYMENT_METHODS.has(
              payment.method
            ) &&
            payment.amount > 0
        );

    if (
      normalized.length > 0
    ) {
      return normalized;
    }
  }

  const method =
    normalizePaymentMethod(
      fallbackMethod
    );

  const amount =
    roundMoney(
      fallbackAmount
    );

  if (
    PAYMENT_METHODS.has(
      method
    ) &&
    amount > 0
  ) {
    return [
      {
        method,
        amount,
      },
    ];
  }

  return [];
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

  if (
    Array.isArray(
      data?.results
    )
  ) {
    return data.results;
  }

  if (
    Array.isArray(
      data?.data?.results
    )
  ) {
    return data.data.results;
  }

  return [];
};

/* =====================================================
   NORMALIZE NOZZLES
===================================================== */

const normalizeNozzles = (
  data
) => {
  const list =
    Array.isArray(data)
      ? data
      : Array.isArray(
          data?.nozzles
        )
        ? data.nozzles
        : Array.isArray(
            data?.data
          )
          ? data.data
          : Array.isArray(
              data?.data?.nozzles
            )
            ? data.data.nozzles
            : [];

  if (
    !Array.isArray(list)
  ) {
    return [];
  }

  return list.filter(
    (item) =>
      item &&
      typeof item ===
        "object" &&
      item._id
  );
};

/* =====================================================
   NORMALIZE READING HISTORY
===================================================== */

const normalizeReadingHistory = (
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
      data?.readings
    )
  ) {
    return data.readings;
  }

  if (
    Array.isArray(
      data?.history
    )
  ) {
    return data.history;
  }

  if (
    Array.isArray(
      data?.data
    )
  ) {
    return data.data;
  }

  if (
    Array.isArray(
      data?.data?.readings
    )
  ) {
    return data.data.readings;
  }

  if (
    Array.isArray(
      data?.data?.history
    )
  ) {
    return data.data.history;
  }

  if (
    Array.isArray(
      data?.results
    )
  ) {
    return data.results;
  }

  return [];
};

/* =====================================================
   NORMALIZE ROLE
===================================================== */

const normalizeRole = (
  user
) => {
  return String(
    user?.role ||
      user?.userRole ||
      user?.accountRole ||
      ""
  )
    .trim()
    .toLowerCase();
};

/* =====================================================
   CHECK USER ACTIVE
===================================================== */

const isUserActive = (
  user
) => {
  if (
    user?.active === false ||
    user?.active === "false"
  ) {
    return false;
  }

  if (
    user?.isActive === false ||
    user?.isActive === "false"
  ) {
    return false;
  }

  const status =
    String(
      user?.status ||
        ""
    )
      .trim()
      .toLowerCase();

  if (
    status === "inactive" ||
    status === "disabled" ||
    status === "deactivated" ||
    status === "blocked"
  ) {
    return false;
  }

  return true;
};

/* =====================================================
   CHECK ELIGIBLE STAFF
===================================================== */

const isEligibleStaff = (
  user
) => {
  if (
    !user ||
    typeof user !==
      "object"
  ) {
    return false;
  }

  const role =
    normalizeRole(
      user
    );

  if (
    !ALLOWED_STAFF_ROLES.has(
      role
    )
  ) {
    return false;
  }

  return isUserActive(
    user
  );
};

/* =====================================================
   GET USER ID
===================================================== */

const getUserId = (
  user
) => {
  return (
    user?._id ||
    user?.id ||
    user?.userId ||
    null
  );
};

/* =====================================================
   GET USER DISPLAY NAME
===================================================== */

const getUserDisplayName = (
  user
) => {
  return (
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.email ||
    "Unnamed User"
  );
};

/* =====================================================
   GET AUTHENTICATED USER FALLBACK
===================================================== */

const getStoredAuthenticatedUser =
  () => {
    const possibleKeys = [
      "user",
      "currentUser",
      "authUser",
      "loggedInUser",
      "userData",
    ];

    for (
      const key of possibleKeys
    ) {
      try {
        const localValue =
          localStorage.getItem(
            key
          );

        if (localValue) {
          const parsed =
            JSON.parse(
              localValue
            );

          if (
            parsed &&
            typeof parsed ===
              "object"
          ) {
            return (
              parsed?.user ||
              parsed?.data?.user ||
              parsed
            );
          }
        }
      } catch {
        // Continue checking.
      }

      try {
        const sessionValue =
          sessionStorage.getItem(
            key
          );

        if (sessionValue) {
          const parsed =
            JSON.parse(
              sessionValue
            );

          if (
            parsed &&
            typeof parsed ===
              "object"
          ) {
            return (
              parsed?.user ||
              parsed?.data?.user ||
              parsed
            );
          }
        }
      } catch {
        // Continue checking.
      }
    }

    return null;
  };

/* =====================================================
   GET READING ID
===================================================== */

const getReadingId = (
  reading
) => {
  return (
    reading?._id ||
    reading?.id ||
    reading?.readingId ||
    null
  );
};

/* =====================================================
   GET READING NOZZLE ID
===================================================== */

const getReadingNozzleId = (
  reading
) => {
  return (
    reading?.nozzleId?._id ||
    reading?.nozzleId ||
    reading?.nozzle?._id ||
    reading?.nozzle?.id ||
    null
  );
};

/* =====================================================
   GET READING STAFF ID
===================================================== */

const getReadingStaffId = (
  reading
) => {
  return (
    reading?.staffId?._id ||
    reading?.staffId ||
    reading?.staff?._id ||
    reading?.staff?.id ||
    null
  );
};

/* =====================================================
   GET READING DATE
===================================================== */

const getReadingDate = (
  reading
) => {
  const value =
    reading?.readingDate ||
    reading?.date ||
    reading?.saleDate ||
    "";

  if (!value) {
    return "";
  }

  return String(
    value
  ).slice(0, 10);
};

/* =====================================================
   GET READING TIME
===================================================== */

const getReadingTime = (
  reading
) => {
  const directTime =
    String(
      reading?.readingTime ||
        ""
    ).trim();

  if (
    isValidTime(
      directTime
    )
  ) {
    return directTime;
  }

  const createdAt =
    reading?.createdAt;

  if (!createdAt) {
    return "";
  }

  const date =
    new Date(
      createdAt
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }
    );

  return formatter.format(
    date
  );
};

/* =====================================================
   GET READING PAYMENTS
===================================================== */

const getReadingPayments = (
  reading
) => {
  const totalAmount =
    Number(
      reading?.totalAmount ||
        0
    );

  return normalizePayments(
    reading?.payments,
    reading?.paymentMethod ||
      "cash",
    totalAmount
  );
};

/* =====================================================
   ADD READING
===================================================== */

const AddReading = () => {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  /* ===================================================
     EDIT MODE
  =================================================== */

  const editReadingId =
    searchParams.get(
      "edit"
    );

  const isEditMode =
    Boolean(
      editReadingId
    );

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

  const [
    readingTime,
    setReadingTime,
  ] = useState(
    getCurrentTime()
  );

  /* ===================================================
     SPLIT PAYMENT
  =================================================== */

  const [
    splitPaymentEnabled,
    setSplitPaymentEnabled,
  ] = useState(false);

  const [
    payments,
    setPayments,
  ] = useState([
    {
      method: "cash",
      amount: "",
    },
  ]);

  /* ===================================================
     EDIT READING
  =================================================== */

  const [
    existingReading,
    setExistingReading,
  ] = useState(null);

  const [
    editLoading,
    setEditLoading,
  ] = useState(
    isEditMode
  );

  /* ===================================================
     LOADING
  =================================================== */

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    payment,
    setPayment,
  ] = useState(() => {
    try {
      const saved =
        sessionStorage.getItem(
          "activePayment"
        );

      return saved
        ? JSON.parse(saved)
        : null;
    } catch {
      return null;
    }
  });

  const [
    paymentLoading,
    setPaymentLoading,
  ] = useState(false);

  const paymentPollRequest =
    useRef(0);

  const [
    fuelPrices,
    setFuelPrices,
  ] = useState(null);

  /* ===================================================
     PAYMENT STORAGE
  =================================================== */

  useEffect(() => {
    try {
      if (payment?.id) {
        sessionStorage.setItem(
          "activePayment",
          JSON.stringify(
            payment
          )
        );
      } else {
        sessionStorage.removeItem(
          "activePayment"
        );
      }
    } catch (error) {
      console.error(
        "PAYMENT RECOVERY STORAGE ERROR:",
        error
      );
    }
  }, [payment]);

  /* ===================================================
     LOAD FUEL PRICES
  =================================================== */

  useEffect(() => {
    let mounted = true;

    const loadFuelPrices =
      async () => {
        try {
          const response =
            await getFuelPrice();

          if (mounted) {
            setFuelPrices(
              response?.fuelPrice ||
                response?.data
                  ?.fuelPrice ||
                null
            );
          }
        } catch (error) {
          if (mounted) {
            console.error(
              "LOAD FUEL PRICES ERROR:",
              error
            );
          }
        }
      };

    loadFuelPrices();

    return () => {
      mounted = false;
    };
  }, []);

  /* ===================================================
     LOAD NOZZLES
  =================================================== */

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

  /* ===================================================
     LOAD STAFF
  =================================================== */

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

          let activeStaff =
            users.filter(
              isEligibleStaff
            );

          const uniqueStaff =
            new Map();

          activeStaff.forEach(
            (user) => {
              const id =
                getUserId(
                  user
                );

              if (id) {
                uniqueStaff.set(
                  String(id),
                  user
                );
              }
            }
          );

          activeStaff =
            Array.from(
              uniqueStaff.values()
            );

          if (
            activeStaff.length ===
            0
          ) {
            const currentUser =
              getStoredAuthenticatedUser();

            if (
              currentUser &&
              isEligibleStaff(
                currentUser
              )
            ) {
              const currentId =
                getUserId(
                  currentUser
                );

              if (
                currentId
              ) {
                activeStaff = [
                  currentUser,
                ];
              }
            }
          }

          setStaff(
            activeStaff
          );

          if (
            activeStaff.length ===
              1 &&
            !staffId
          ) {
            const onlyStaff =
              activeStaff[0];

            const onlyStaffId =
              getUserId(
                onlyStaff
              );

            if (
              onlyStaffId
            ) {
              setStaffId(
                String(
                  onlyStaffId
                )
              );
            }
          }
        } catch (error) {
          if (!mounted) {
            return;
          }

          console.error(
            "LOAD STAFF ERROR:",
            error
          );

          const status =
            error?.response
              ?.status;

          if (
            status === 401
          ) {
            toast.error(
              "Authentication required. Please log in again."
            );
          } else if (
            status === 403
          ) {
            toast.error(
              error?.response
                ?.data
                ?.message ||
                "You are not authorized to view pump staff."
            );
          } else {
            toast.error(
              error?.response
                ?.data
                ?.message ||
                error?.message ||
                "Unable to load pump staff."
            );
          }

          const currentUser =
            getStoredAuthenticatedUser();

          if (
            currentUser &&
            isEligibleStaff(
              currentUser
            )
          ) {
            const currentId =
              getUserId(
                currentUser
              );

            if (
              currentId
            ) {
              setStaff([
                currentUser,
              ]);

              setStaffId(
                String(
                  currentId
                )
              );
            } else {
              setStaff([]);
            }
          } else {
            setStaff([]);
          }
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

  /* ===================================================
     LOAD EXISTING READING FOR EDIT
  =================================================== */

  useEffect(() => {
    if (!isEditMode) {
      setEditLoading(
        false
      );

      return undefined;
    }

    let mounted = true;

    const loadExistingReading =
      async () => {
        try {
          setEditLoading(
            true
          );

          const response =
            await getNozzleReadingHistory();

          if (!mounted) {
            return;
          }

          const readings =
            normalizeReadingHistory(
              response
            );

          const foundReading =
            readings.find(
              (item) =>
                String(
                  getReadingId(
                    item
                  )
                ) ===
                String(
                  editReadingId
                )
            );

          if (!foundReading) {
            toast.error(
              "The nozzle reading could not be found."
            );

            navigate(
              "/nozzle/readings",
              {
                replace: true,
              }
            );

            return;
          }

          setExistingReading(
            foundReading
          );

          const existingNozzleId =
            getReadingNozzleId(
              foundReading
            );

          const existingStaffId =
            getReadingStaffId(
              foundReading
            );

          const existingShift =
            String(
              foundReading?.shiftName ||
                foundReading?.shift ||
                ""
            )
              .trim()
              .toLowerCase();

          const existingClosing =
            foundReading?.closingReading ??
            foundReading?.closing ??
            "";

          const existingPayment =
            normalizePaymentMethod(
              foundReading?.paymentMethod ||
                "cash"
            );

          const existingNote =
            foundReading?.note ||
            "";

          const existingDate =
            getReadingDate(
              foundReading
            );

          const existingTime =
            getReadingTime(
              foundReading
            );

          const existingPayments =
            getReadingPayments(
              foundReading
            );

          if (
            existingNozzleId
          ) {
            setNozzleId(
              String(
                existingNozzleId
              )
            );
          }

          if (
            existingStaffId
          ) {
            setStaffId(
              String(
                existingStaffId
              )
            );
          }

          if (
            SHIFT_OPTIONS.some(
              (item) =>
                item.value ===
                existingShift
            )
          ) {
            setShiftName(
              existingShift
            );
          }

          setClosingReading(
            existingClosing !==
              null &&
            existingClosing !==
              undefined
              ? String(
                  existingClosing
                )
              : ""
          );

          if (
            PAYMENT_METHODS.has(
              existingPayment
            )
          ) {
            setPaymentMethod(
              existingPayment
            );
          } else {
            setPaymentMethod(
              "cash"
            );
          }

          if (
            existingPayments.length >
              1
          ) {
            setSplitPaymentEnabled(
              true
            );

            setPayments(
              existingPayments.map(
                (paymentItem) => ({
                  method:
                    paymentItem.method,
                  amount:
                    String(
                      paymentItem.amount
                    ),
                })
              )
            );
          } else if (
            existingPayments.length ===
            1
          ) {
            setSplitPaymentEnabled(
              false
            );

            setPayments([
              {
                method:
                  existingPayments[0]
                    .method,
                amount:
                  String(
                    existingPayments[0]
                      .amount
                  ),
              },
            ]);
          } else {
            setSplitPaymentEnabled(
              false
            );

            setPayments([
              {
                method:
                  PAYMENT_METHODS.has(
                    existingPayment
                  )
                    ? existingPayment
                    : "cash",
                amount: "",
              },
            ]);
          }

          setNote(
            String(
              existingNote ||
                ""
            )
          );

          if (
            isValidDate(
              existingDate
            )
          ) {
            setDate(
              existingDate
            );
          }

          if (
            isValidTime(
              existingTime
            )
          ) {
            setReadingTime(
              existingTime
            );
          } else {
            setReadingTime(
              getCurrentTime()
            );
          }
        } catch (error) {
          if (!mounted) {
            return;
          }

          console.error(
            "LOAD EXISTING READING ERROR:",
            error
          );

          toast.error(
            error?.response
              ?.data?.message ||
              error?.message ||
              "Unable to load the reading."
          );

          navigate(
            "/nozzle/readings",
            {
              replace: true,
            }
          );
        } finally {
          if (mounted) {
            setEditLoading(
              false
            );
          }
        }
      };

    loadExistingReading();

    return () => {
      mounted = false;
    };
  }, [
    isEditMode,
    editReadingId,
    navigate,
  ]);

  /* ===================================================
     SELECTED NOZZLE
  =================================================== */

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

  /* ===================================================
     SELECTED STAFF
  =================================================== */

  const selectedStaff =
    useMemo(
      () =>
        staff.find(
          (user) =>
            String(
              getUserId(
                user
              )
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

  /* ===================================================
     OPENING READING
  =================================================== */

  const opening =
    isEditMode &&
    existingReading
      ? Number(
          existingReading?.openingReading ??
            existingReading?.opening ??
            0
        )
      : Number(
          selectedNozzle?.currentReading ??
            0
        );

  /* ===================================================
     CLOSING READING
  =================================================== */

  const closing =
    Number(
      closingReading
    );

  const validClosing =
    closingReading !== "" &&
    Number.isFinite(
      closing
    );

  /* ===================================================
     LITRES SOLD
  =================================================== */

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

  /* ===================================================
     PRICE
  =================================================== */

  const historicalPrice =
    Number(
      existingReading?.pricePerLitre
    );

  const currentPrice =
    Number(
      String(
        selectedNozzle?.fuelType ||
          ""
      ).toLowerCase() ===
        "diesel"
        ? fuelPrices?.dieselPrice
        : fuelPrices?.petrolPrice
    );

  const pricePerLitre =
    isEditMode &&
    Number.isFinite(
      historicalPrice
    )
      ? historicalPrice
      : currentPrice;

  const previewAmount =
    Number.isFinite(
      pricePerLitre
    )
      ? Number(
          (
            litresSold *
            pricePerLitre
          ).toFixed(2)
        )
      : 0;

  /* ===================================================
     PAYMENT TOTAL
  =================================================== */

  const paymentTotal =
    useMemo(() => {
      if (
        !splitPaymentEnabled
      ) {
        return 0;
      }

      return roundMoney(
        payments.reduce(
          (
            total,
            paymentItem
          ) =>
            total +
            Number(
              paymentItem?.amount ||
                0
            ),
          0
        )
      );
    }, [
      payments,
      splitPaymentEnabled,
    ]);

  /* ===================================================
     PAYMENT REMAINING
  =================================================== */

  const paymentRemaining =
    useMemo(() => {
      if (
        !splitPaymentEnabled
      ) {
        return 0;
      }

      return roundMoney(
        previewAmount -
          paymentTotal
      );
    }, [
      previewAmount,
      paymentTotal,
      splitPaymentEnabled,
    ]);

  /* ===================================================
     PAYMENT TOTAL VALID
  =================================================== */

  const paymentTotalMatches =
    splitPaymentEnabled &&
    previewAmount > 0 &&
    Math.abs(
      paymentRemaining
    ) < 0.01;

  /* ===================================================
     NOZZLE CHANGE
  =================================================== */

  const handleNozzleChange =
    (event) => {
      if (isEditMode) {
        return;
      }

      setNozzleId(
        event.target.value
      );

      setClosingReading(
        ""
      );

      if (
        !splitPaymentEnabled
      ) {
        setPayments([
          {
            method:
              paymentMethod ===
                "qr"
                ? "cash"
                : paymentMethod,
            amount: "",
          },
        ]);
      }
    };

  /* ===================================================
     SHIFT CHANGE
  =================================================== */

  const handleShiftChange =
    (event) => {
      if (isEditMode) {
        return;
      }

      setShiftName(
        event.target.value
      );
    };

  /* ===================================================
     STAFF CHANGE
  =================================================== */

  const handleStaffChange =
    (event) => {
      setStaffId(
        event.target.value
      );
    };

  /* ===================================================
     PAYMENT METHOD CHANGE
  =================================================== */

  const handlePaymentMethodChange =
    (event) => {
      const nextMethod =
        normalizePaymentMethod(
          event.target.value
        );

      setPaymentMethod(
        nextMethod
      );

      if (
        !splitPaymentEnabled &&
        nextMethod !== "qr"
      ) {
        setPayments([
          {
            method:
              nextMethod,
            amount:
              previewAmount > 0
                ? String(
                    previewAmount
                  )
                : "",
          },
        ]);
      }
    };

  /* ===================================================
     ENABLE SPLIT PAYMENT
  =================================================== */

  const handleSplitPaymentToggle =
    (event) => {
      const enabled =
        event.target.checked;

      if (
        paymentMethod ===
        "qr"
      ) {
        return;
      }

      setSplitPaymentEnabled(
        enabled
      );

      if (enabled) {
        const currentMethod =
          PAYMENT_METHODS.has(
            paymentMethod
          )
            ? paymentMethod
            : "cash";

        setPayments([
          {
            method:
              currentMethod,
            amount:
              previewAmount > 0
                ? String(
                    previewAmount
                  )
                : "",
          },
        ]);
      } else {
        const firstPayment =
          payments[0];

        const nextMethod =
          PAYMENT_METHODS.has(
            firstPayment?.method
          )
            ? firstPayment.method
            : "cash";

        setPaymentMethod(
          nextMethod
        );

        setPayments([
          {
            method:
              nextMethod,
            amount:
              previewAmount > 0
                ? String(
                    previewAmount
                  )
                : "",
          },
        ]);
      }
    };

  /* ===================================================
     ADD PAYMENT ROW
  =================================================== */

  const addPaymentRow =
    () => {
      if (
        payments.length >= 4
      ) {
        toast.error(
          "Maximum 4 payment methods are allowed."
        );

        return;
      }

      const usedMethods =
        new Set(
          payments.map(
            (paymentItem) =>
              paymentItem.method
          )
        );

      const availableMethod =
        Array.from(
          PAYMENT_METHODS
        ).find(
          (method) =>
            !usedMethods.has(
              method
            )
        );

      if (
        !availableMethod
      ) {
        toast.error(
          "All payment methods are already added."
        );

        return;
      }

      setPayments(
        (current) => [
          ...current,
          {
            method:
              availableMethod,
            amount: "",
          },
        ]
      );
    };

  /* ===================================================
     REMOVE PAYMENT ROW
  =================================================== */

  const removePaymentRow =
    (index) => {
      if (
        payments.length <= 1
      ) {
        toast.error(
          "At least one payment method is required."
        );

        return;
      }

      setPayments(
        (current) =>
          current.filter(
            (
              _,
              paymentIndex
            ) =>
              paymentIndex !==
              index
          )
      );
    };

  /* ===================================================
     CHANGE PAYMENT ROW METHOD
  =================================================== */

  const changePaymentRowMethod =
    (
      index,
      value
    ) => {
      const method =
        normalizePaymentMethod(
          value
        );

      if (
        !PAYMENT_METHODS.has(
          method
        )
      ) {
        return;
      }

      const duplicate =
        payments.some(
          (
            paymentItem,
            paymentIndex
          ) =>
            paymentIndex !==
              index &&
            paymentItem.method ===
              method
        );

      if (duplicate) {
        toast.error(
          "This payment method is already selected."
        );

        return;
      }

      setPayments(
        (current) =>
          current.map(
            (
              paymentItem,
              paymentIndex
            ) =>
              paymentIndex ===
              index
                ? {
                    ...paymentItem,
                    method,
                  }
                : paymentItem
          )
      );
    };

  /* ===================================================
     CHANGE PAYMENT ROW AMOUNT
  =================================================== */

  const changePaymentRowAmount =
    (
      index,
      value
    ) => {
      if (
        value !== "" &&
        (!/^\d*\.?\d*$/.test(
          value
        ) ||
          Number(value) <
            0)
      ) {
        return;
      }

      setPayments(
        (current) =>
          current.map(
            (
              paymentItem,
              paymentIndex
            ) =>
              paymentIndex ===
              index
                ? {
                    ...paymentItem,
                    amount:
                      value,
                  }
                : paymentItem
          )
      );
    };

  /* ===================================================
     VERIFIED QR PAYMENT POLLING
  =================================================== */

  useEffect(() => {
    if (
      !payment?.id ||
      payment.status !==
        "pending"
    ) {
      return undefined;
    }

    let active = true;

    const timer =
      window.setInterval(
        async () => {
          if (
            paymentPollRequest.current !==
            0
          ) {
            return;
          }

          const requestId =
            Date.now();

          paymentPollRequest.current =
            requestId;

          try {
            const response =
              await getPaymentStatus(
                payment.id
              );

            const nextPayment =
              response?.payment;

            if (
              active &&
              paymentPollRequest.current ===
                requestId &&
              nextPayment
            ) {
              setPayment(
                nextPayment
              );
            }
          } catch (error) {
            if (active) {
              console.error(
                "PAYMENT STATUS ERROR:",
                error
              );

              const status =
                error?.response
                  ?.status;

              if (
                status === 401 ||
                status === 403 ||
                status === 404
              ) {
                setPayment(
                  null
                );

                toast.error(
                  "This payment is no longer available. Please generate a new QR."
                );
              }
            }
          } finally {
            if (
              paymentPollRequest.current ===
              requestId
            ) {
              paymentPollRequest.current =
                0;
            }
          }
        },
        2500
      );

    return () => {
      active = false;

      window.clearInterval(
        timer
      );

      paymentPollRequest.current =
        0;
    };
  }, [
    payment?.id,
    payment?.status,
  ]);

  /* ===================================================
     SUBMIT
  =================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      if (editLoading) {
        toast.error(
          "Please wait while the reading is loading."
        );

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
        normalizeRole(
          selectedStaff
        );

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

      if (
        !isUserActive(
          selectedStaff
        )
      ) {
        toast.error(
          "Selected staff member is inactive."
        );

        return;
      }

      if (
        !isValidDate(
          date
        )
      ) {
        toast.error(
          "Please select a valid date."
        );

        return;
      }

      if (
        !isValidTime(
          readingTime
        )
      ) {
        toast.error(
          "Please enter a valid reading time."
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
        isEditMode &&
        paymentMethod ===
          "qr"
      ) {
        toast.error(
          "QR payment cannot be selected while editing a reading."
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

      /* =================================================
         PAYMENT VALIDATION
      ================================================= */

      let finalPayments =
        [];

      if (
        splitPaymentEnabled
      ) {
        if (
          paymentMethod ===
          "qr"
        ) {
          toast.error(
            "Split payment is not available with Digital QR Payment."
          );

          return;
        }

        if (
          payments.length ===
          0
        ) {
          toast.error(
            "Please add at least one payment method."
          );

          return;
        }

        if (
          payments.length >
          4
        ) {
          toast.error(
            "Maximum 4 payment methods are allowed."
          );

          return;
        }

        const usedMethods =
          new Set();

        finalPayments =
          payments.map(
            (paymentItem) => {
              const method =
                normalizePaymentMethod(
                  paymentItem?.method
                );

              const amount =
                Number(
                  paymentItem?.amount
                );

              if (
                !PAYMENT_METHODS.has(
                  method
                )
              ) {
                throw new Error(
                  "Please select a valid payment method for every payment."
                );
              }

              if (
                usedMethods.has(
                  method
                )
              ) {
                throw new Error(
                  `Payment method "${PAYMENT_METHOD_LABELS[method]}" cannot be added more than once.`
                );
              }

              usedMethods.add(
                method
              );

              if (
                !Number.isFinite(
                  amount
                ) ||
                amount <= 0
              ) {
                throw new Error(
                  "Each payment amount must be greater than zero."
                );
              }

              return {
                method,
                amount:
                  roundMoney(
                    amount
                  ),
              };
            }
          );

        const calculatedPaymentTotal =
          roundMoney(
            finalPayments.reduce(
              (
                total,
                paymentItem
              ) =>
                total +
                paymentItem.amount,
              0
            )
          );

        if (
          Math.round(
            calculatedPaymentTotal *
              100
          ) !==
          Math.round(
            previewAmount *
              100
          )
        ) {
          toast.error(
            `Payment total ₹${calculatedPaymentTotal.toFixed(
              2
            )} must exactly match sale total ₹${previewAmount.toFixed(
              2
            )}.`
          );

          return;
        }
      } else {
        if (
          paymentMethod ===
          "qr"
        ) {
          finalPayments =
            [];
        } else {
          finalPayments = [
            {
              method:
                paymentMethod,
              amount:
                roundMoney(
                  previewAmount
                ),
            },
          ];
        }
      }

      try {
        setLoading(
          true
        );

        /* =================================================
           EDIT EXISTING READING
        ================================================= */

        if (isEditMode) {
          const requestBody = {
            closingReading:
              closing,

            staffId,

            readingTime,

            note:
              trimmedNote,
          };

          /*
            When split payment is enabled,
            explicitly send the complete breakdown.
          */

          if (
            splitPaymentEnabled
          ) {
            requestBody.payments =
              finalPayments;
          } else {
            /*
              Single payment mode.
              Explicit paymentMethod tells
              backend to use one payment for
              the updated sale total.
            */

            requestBody.paymentMethod =
              paymentMethod;
          }

          const response =
            await updateNozzleReading(
              editReadingId,
              requestBody
            );

          const updatedAmount =
            Number(
              response?.totalAmount ??
                response?.reading
                  ?.totalAmount ??
                response?.sale
                  ?.totalAmount ??
                response?.data
                  ?.totalAmount ??
                response?.data
                  ?.sale
                  ?.totalAmount ??
                previewAmount ??
                0
            );

          toast.success(
            `₹${updatedAmount.toFixed(
              2
            )} reading updated successfully`
          );

          navigate(
            "/nozzle/readings"
          );

          return;
        }

        /* =================================================
           NEW QR PAYMENT
        ================================================= */

        if (
          paymentMethod ===
          "qr"
        ) {
          setPaymentLoading(
            true
          );

          const response =
            await createPayment({
              nozzleId,

              shiftName,

              staffId,

              closingReading:
                closing,

              readingDate:
                date,

              readingTime,

              note:
                trimmedNote,
            });

          setPayment(
            response?.payment ||
              null
          );

          toast.success(
            "Dynamic payment QR generated."
          );

          return;
        }

        /* =================================================
           NEW NORMAL READING
        ================================================= */

        const response =
          await addNozzleReading({
            nozzleId,

            shiftName,

            staffId,

            closingReading:
              closing,

            readingDate:
              date,

            readingTime,

            paymentMethod:
              finalPayments[0]
                ?.method ||
              paymentMethod,

            payments:
              finalPayments,

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
              previewAmount ??
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
          "SAVE / UPDATE READING ERROR:",
          error
        );

        const backendMessage =
          error?.response
            ?.data?.message ||
          error?.response
            ?.data?.error ||
          error?.message ||
          (isEditMode
            ? "Unable to update reading."
            : "Unable to save reading.");

        toast.error(
          backendMessage
        );
      } finally {
        setLoading(
          false
        );

        setPaymentLoading(
          false
        );
      }
    };

  /* ===================================================
     CANCEL PAYMENT
  =================================================== */

  const handleCancelPayment =
    async () => {
      if (!payment?.id) {
        setPayment(null);

        return;
      }

      try {
        setPaymentLoading(
          true
        );

        const response =
          await cancelPayment(
            payment.id
          );

        setPayment(
          response?.payment ||
            null
        );
      } catch (error) {
        toast.error(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Unable to cancel payment."
        );
      } finally {
        setPaymentLoading(
          false
        );
      }
    };

  /* =====================================================
     RENDER
  ===================================================== */

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
              isEditMode
                ? "Edit Reading"
                : "Add Reading",
          },
        ]}
      />

      <div className="page-header">

        <div>

          <h1>
            {isEditMode
              ? "Edit Reading"
              : "Add Reading"}
          </h1>

          <p>
            {isEditMode
              ? "Update the saved shift reading and its sale details."
              : "Enter the shift closing meter reading to record fuel sales."}
          </p>

        </div>

      </div>

      {/* =================================================
          EDIT MODE INFORMATION
      ================================================= */}

      {isEditMode &&
        existingReading && (
          <div
            className="content-panel"
            style={{
              marginBottom:
                "16px",
              border:
                "1px solid #bfdbfe",
              background:
                "#eff6ff",
            }}
          >
            <div
              className="content-panel-body"
              style={{
                padding:
                  "14px 16px",
              }}
            >
              <strong
                style={{
                  color:
                    "#1d4ed8",
                }}
              >
                Editing existing nozzle
                reading
              </strong>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  fontSize:
                    "13px",
                  opacity:
                    0.75,
                }}
              >
                Nozzle, shift, date and
                opening reading are locked.
                Closing reading, staff,
                reading time, payment details
                and note can be updated.
              </p>
            </div>
          </div>
        )}

      {/* =================================================
          PAYMENT
      ================================================= */}

      {payment && (
        <div className="content-panel payment-step-card">

          <div className="content-panel-header">

            <h2>
              {payment.status ===
              "paid"
                ? "✓ Payment Successful"
                : payment.status ===
                    "pending"
                  ? "Scan & Pay"
                  : `Payment ${payment.status}`}
            </h2>

          </div>

          <div className="content-panel-body payment-step-body">

            <p className="payment-amount">
              ₹
              {Number(
                payment.amount ||
                  0
              ).toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits:
                    2,
                  maximumFractionDigits:
                    2,
                }
              )}
            </p>

            <p>
              {String(
                payment.fuelType ||
                  ""
              ).toUpperCase()}{" "}
              ·{" "}
              {Number(
                payment.quantity ||
                  0
              ).toFixed(
                2
              )}{" "}
              L · Nozzle{" "}
              {selectedNozzle?.nozzleNumber ||
                "-"}
            </p>

            {payment.status ===
              "pending" &&
              payment.qrImageUrl && (
                <img
                  className="payment-qr-image"
                  src={
                    payment.qrImageUrl
                  }
                  alt="Dynamic Razorpay payment QR code"
                />
              )}

            {payment.status ===
              "pending" &&
              !payment.qrImageUrl && (
                <p className="payment-status payment-status-failed">
                  QR information is unavailable.
                  Please cancel and generate a
                  new QR.
                </p>
              )}

            <p
              className={`payment-status payment-status-${payment.status}`}
            >
              {payment.status ===
                "pending" &&
                "Waiting for payment..."}

              {payment.status ===
                "paid" &&
                "Sale recorded successfully."}

              {payment.status ===
                "failed" &&
                (payment.failureReason ||
                  "Payment failed.")}

              {payment.status ===
                "expired" &&
                "Payment expired. Generate a new QR to retry."}

              {payment.status ===
                "cancelled" &&
                "Payment cancelled."}
            </p>

            {payment.status ===
              "paid" && (
              <p>
                Payment:{" "}
                {String(
                  payment.method ||
                    "upi"
                ).toUpperCase()}{" "}
                · Transaction ID:{" "}
                {payment.providerPaymentId ||
                  "-"}
              </p>
            )}

            <div className="modal-actions">

              {payment.status ===
                "pending" && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    handleCancelPayment
                  }
                  disabled={
                    paymentLoading
                  }
                >
                  Cancel
                </button>
              )}

              {payment.status ===
              "paid" ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setPayment(
                      null
                    );

                    navigate(
                      "/nozzle/readings"
                    );
                  }}
                >
                  Continue
                </button>
              ) : payment.status !==
                "pending" ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    setPayment(
                      null
                    )
                  }
                >
                  Generate New QR
                </button>
              ) : null}

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          MAIN FORM
      ================================================= */}

      <div
        className="content-panel"
        style={{
          display:
            payment
              ? "none"
              : undefined,
        }}
      >

        <div className="content-panel-header">

          <h2>
            {isEditMode
              ? "Update Meter Reading"
              : "Meter Reading"}
          </h2>

        </div>

        <div className="content-panel-body">

          {editLoading ? (
            <div
              style={{
                padding:
                  "30px 10px",
                textAlign:
                  "center",
                opacity:
                  0.7,
              }}
            >
              Loading existing
              reading...
            </div>
          ) : (
            <form
              className="clean-form"
              onSubmit={
                handleSubmit
              }
              noValidate
            >

              {/* =================================================
                  NOZZLE
              ================================================= */}

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
                      0 ||
                    isEditMode
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

                {isEditMode && (
                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "6px",
                      opacity:
                        0.65,
                    }}
                  >
                    Nozzle cannot be
                    changed while editing
                    a saved reading.
                  </small>
                )}

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

              {/* =================================================
                  SHIFT / STAFF
              ================================================= */}

              <div className="form-row">

                {/* SHIFT */}

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
                      loading ||
                      isEditMode
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

                  {isEditMode && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "6px",
                        opacity:
                          0.65,
                      }}
                    >
                      Shift is locked for
                      this saved reading.
                    </small>
                  )}

                </div>

                {/* STAFF */}

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
                        : staff.length ===
                            0
                          ? "No active staff available"
                          : "Select Staff"}
                    </option>

                    {staff.map(
                      (
                        user
                      ) => {

                        const role =
                          normalizeRole(
                            user
                          ) ||
                          "staff";

                        const displayName =
                          getUserDisplayName(
                            user
                          );

                        const userId =
                          getUserId(
                            user
                          );

                        return (
                          <option
                            key={
                              userId
                            }
                            value={
                              userId
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
                          color:
                            "#dc2626",
                          opacity:
                            0.85,
                        }}
                      >
                        No active staff are
                        available for nozzle
                        reading.
                      </small>
                    )}

                  {!staffLoading &&
                    staff.length >
                      0 && (
                      <small
                        style={{
                          display:
                            "block",
                          marginTop:
                            "6px",
                          opacity:
                            0.65,
                        }}
                      >
                        {
                          staff.length
                        }{" "}
                        eligible employee
                        {staff.length !==
                        1
                          ? "s"
                          : ""}{" "}
                        available.
                      </small>
                    )}

                </div>

              </div>

              {/* =================================================
                  SELECTED STAFF
              ================================================= */}

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
                    getUserDisplayName(
                      selectedStaff
                    )
                  }

                  {" • "}

                  {(
                    normalizeRole(
                      selectedStaff
                    ) ||
                    "staff"
                  )
                    .charAt(
                      0
                    )
                    .toUpperCase() +
                    (
                      normalizeRole(
                        selectedStaff
                      ) ||
                      "staff"
                    ).slice(
                      1
                    )}

                </div>
              )}

              {/* =================================================
                  SELECTED STATS
              ================================================= */}

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

                  {/* OPENING */}

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

                  {/* SOLD */}

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

              {/* =================================================
                  CLOSING / DATE / TIME
              ================================================= */}

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

                  {isEditMode && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "6px",
                        opacity:
                          0.65,
                      }}
                    >
                      Changing the closing
                      reading updates the
                      corresponding fuel stock
                      and sale automatically.
                    </small>
                  )}

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
                      loading ||
                      isEditMode
                    }
                    required
                  />

                  {isEditMode && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "6px",
                        opacity:
                          0.65,
                      }}
                    >
                      Date is locked for
                      this saved reading.
                    </small>
                  )}

                </div>

                <div className="form-group">

                  <label
                    htmlFor="reading-time"
                  >
                    Reading Time *
                  </label>

                  <input
                    id="reading-time"
                    type="time"
                    value={
                      readingTime
                    }
                    onChange={(
                      event
                    ) =>
                      setReadingTime(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      loading
                    }
                    required
                  />

                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "6px",
                      opacity:
                        0.65,
                    }}
                  >
                    Time recorded for this
                    meter reading.
                  </small>

                </div>

              </div>

              {/* =================================================
                  PAYMENT / NOTE
              ================================================= */}

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
                    onChange={
                      handlePaymentMethodChange
                    }
                    disabled={
                      loading ||
                      splitPaymentEnabled
                    }
                    required
                  >

                    <option value="cash">
                      Cash
                    </option>

                    {!isEditMode && (
                      <option value="qr">
                        Digital QR Payment
                      </option>
                    )}

                    <option value="upi">
                      UPI (manual)
                    </option>

                    <option value="card">
                      Card
                    </option>

                    <option value="credit">
                      Credit
                    </option>

                  </select>

                  {splitPaymentEnabled && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "6px",
                        opacity:
                          0.65,
                      }}
                    >
                      Payment method is controlled
                      below by the split-payment
                      rows.
                    </small>
                  )}

                  {isEditMode && (
                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "6px",
                        opacity:
                          0.65,
                      }}
                    >
                      QR payment is not
                      available when editing
                      an existing sale.
                    </small>
                  )}

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
                    maxLength={
                      500
                    }
                    disabled={
                      loading
                    }
                  />

                </div>

              </div>

              {/* =================================================
                  SPLIT PAYMENT TOGGLE
              ================================================= */}

              {paymentMethod !==
                "qr" && (
                <div
                  style={{
                    marginTop:
                      "4px",
                    marginBottom:
                      "16px",
                    padding:
                      "14px 16px",
                    border:
                      "1px solid #cbd5e1",
                    borderRadius:
                      "10px",
                    background:
                      "#f8fafc",
                  }}
                >

                  <label
                    htmlFor="split-payment"
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap:
                        "10px",
                      cursor:
                        loading
                          ? "default"
                          : "pointer",
                      fontWeight:
                        "600",
                    }}
                  >

                    <input
                      id="split-payment"
                      type="checkbox"
                      checked={
                        splitPaymentEnabled
                      }
                      onChange={
                        handleSplitPaymentToggle
                      }
                      disabled={
                        loading
                      }
                      style={{
                        width:
                          "18px",
                        height:
                          "18px",
                      }}
                    />

                    Split Payment
                  </label>

                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "6px",
                      marginLeft:
                        "28px",
                      opacity:
                        0.7,
                    }}
                  >
                    Use multiple payment methods
                    for one sale, for example
                    Cash + UPI + Card.
                  </small>

                </div>
              )}

              {/* =================================================
                  SPLIT PAYMENT ROWS
              ================================================= */}

              {splitPaymentEnabled && (
                <div
                  className="content-panel"
                  style={{
                    marginTop:
                      "12px",
                    marginBottom:
                      "16px",
                    border:
                      paymentTotalMatches
                        ? "1px solid #86efac"
                        : "1px solid #cbd5e1",
                    background:
                      paymentTotalMatches
                        ? "#f0fdf4"
                        : "#f8fafc",
                  }}
                >

                  <div
                    className="content-panel-header"
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap:
                        "12px",
                      flexWrap:
                        "wrap",
                    }}
                  >

                    <h3
                      style={{
                        margin:
                          0,
                      }}
                    >
                      Payment Breakdown
                    </h3>

                    <span
                      style={{
                        fontSize:
                          "13px",
                        fontWeight:
                          "600",
                      }}
                    >
                      Total: ₹
                      {previewAmount.toFixed(
                        2
                      )}
                    </span>

                  </div>

                  <div className="content-panel-body">

                    {payments.map(
                      (
                        paymentItem,
                        index
                      ) => {

                        const usedMethods =
                          new Set(
                            payments
                              .filter(
                                (
                                  _,
                                  paymentIndex
                                ) =>
                                  paymentIndex !==
                                  index
                              )
                              .map(
                                (
                                  item
                                ) =>
                                  item.method
                              )
                          );

                        return (
                          <div
                            key={
                              `${paymentItem.method}-${index}`
                            }
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "minmax(130px, 1fr) minmax(130px, 1fr) auto",
                              gap:
                                "10px",
                              alignItems:
                                "end",
                              marginBottom:
                                "12px",
                            }}
                          >

                            <div className="form-group">
                              <label
                                htmlFor={`payment-method-${index}`}
                              >
                                Method
                              </label>

                              <select
                                id={`payment-method-${index}`}
                                value={
                                  paymentItem.method
                                }
                                onChange={(
                                  event
                                ) =>
                                  changePaymentRowMethod(
                                    index,
                                    event.target
                                      .value
                                  )
                                }
                                disabled={
                                  loading
                                }
                              >

                                {Array.from(
                                  PAYMENT_METHODS
                                ).map(
                                  (
                                    method
                                  ) => (
                                    <option
                                      key={
                                        method
                                      }
                                      value={
                                        method
                                      }
                                      disabled={usedMethods.has(
                                        method
                                      )}
                                    >
                                      {
                                        PAYMENT_METHOD_LABELS[
                                          method
                                        ]
                                      }
                                    </option>
                                  )
                                )}

                              </select>
                            </div>

                            <div className="form-group">
                              <label
                                htmlFor={`payment-amount-${index}`}
                              >
                                Amount
                              </label>

                              <input
                                id={`payment-amount-${index}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  paymentItem.amount
                                }
                                onChange={(
                                  event
                                ) =>
                                  changePaymentRowAmount(
                                    index,
                                    event.target
                                      .value
                                  )
                                }
                                disabled={
                                  loading
                                }
                                placeholder="0.00"
                              />
                            </div>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                removePaymentRow(
                                  index
                                )
                              }
                              disabled={
                                loading ||
                                payments.length <=
                                  1
                              }
                              style={{
                                minHeight:
                                  "42px",
                                marginBottom:
                                  "0",
                              }}
                            >
                              Remove
                            </button>

                          </div>
                        );
                      }
                    )}

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        addPaymentRow
                      }
                      disabled={
                        loading ||
                        payments.length >=
                          4
                      }
                    >
                      + Add Payment Method
                    </button>

                    {/* PAYMENT SUMMARY */}

                    <div
                      style={{
                        marginTop:
                          "16px",
                        padding:
                          "14px",
                        borderRadius:
                          "8px",
                        background:
                          "#ffffff",
                        border:
                          "1px solid #e2e8f0",
                      }}
                    >

                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap:
                            "12px",
                          marginBottom:
                            "6px",
                        }}
                      >
                        <span>
                          Sale Total
                        </span>

                        <strong>
                          ₹
                          {previewAmount.toFixed(
                            2
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap:
                            "12px",
                          marginBottom:
                            "6px",
                        }}
                      >
                        <span>
                          Payment Total
                        </span>

                        <strong>
                          ₹
                          {paymentTotal.toFixed(
                            2
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap:
                            "12px",
                          fontWeight:
                            "700",
                          color:
                            Math.abs(
                              paymentRemaining
                            ) <
                            0.01
                              ? "#15803d"
                              : "#dc2626",
                        }}
                      >
                        <span>
                          {paymentRemaining >
                          0
                            ? "Remaining"
                            : paymentRemaining <
                                0
                              ? "Excess"
                              : "Remaining"}
                        </span>

                        <span>
                          ₹
                          {Math.abs(
                            paymentRemaining
                          ).toFixed(
                            2
                          )}
                        </span>
                      </div>

                    </div>

                    {previewAmount >
                      0 &&
                      !paymentTotalMatches && (
                        <p
                          style={{
                            margin:
                              "12px 0 0",
                            color:
                              "#dc2626",
                            fontSize:
                              "13px",
                            fontWeight:
                              "600",
                          }}
                        >
                          Payment amounts must
                          exactly match the sale
                          total before saving.
                        </p>
                      )}

                    {paymentTotalMatches && (
                      <p
                        style={{
                          margin:
                            "12px 0 0",
                          color:
                            "#15803d",
                          fontSize:
                            "13px",
                          fontWeight:
                            "600",
                        }}
                      >
                        ✓ Payment breakdown
                        matches the sale total.
                      </p>
                    )}

                  </div>

                </div>
              )}

              {/* =================================================
                  SALE PREVIEW
              ================================================= */}

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
                      {isEditMode
                        ? "Updated Sale Preview"
                        : "Sale Preview"}
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
                        selectedStaff
                          ? getUserDisplayName(
                              selectedStaff
                            )
                          : "-"
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

                    <p>
                      <strong
                        style={{
                          color:
                            "#0891b2",
                        }}
                      >
                        Reading Time:
                      </strong>{" "}
                      {readingTime ||
                        "-"}
                    </p>

                    <p>
                      <strong
                        style={{
                          color:
                            "#0891b2",
                        }}
                      >
                        Price per Litre:
                      </strong>{" "}
                      {Number.isFinite(
                        pricePerLitre
                      )
                        ? `₹${pricePerLitre.toFixed(
                            2
                          )}`
                        : "Loading..."}
                    </p>

                    <p>
                      <strong
                        style={{
                          color:
                            "#1d4ed8",
                        }}
                      >
                        Estimated Total:
                      </strong>{" "}
                      {Number.isFinite(
                        pricePerLitre
                      )
                        ? `₹${previewAmount.toFixed(
                            2
                          )}`
                        : "Backend will calculate the amount"}
                    </p>

                    {splitPaymentEnabled && (
                      <div
                        style={{
                          marginTop:
                            "12px",
                          padding:
                            "12px",
                          borderRadius:
                            "8px",
                          background:
                            "#f8fafc",
                          border:
                            "1px solid #e2e8f0",
                        }}
                      >

                        <strong>
                          Payment Breakdown
                        </strong>

                        {payments.map(
                          (
                            paymentItem,
                            index
                          ) => (
                            <div
                              key={
                                index
                              }
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                gap:
                                  "12px",
                                marginTop:
                                  "6px",
                                fontSize:
                                  "13px",
                              }}
                            >
                              <span>
                                {PAYMENT_METHOD_LABELS[
                                  paymentItem
                                    .method
                                ] ||
                                  paymentItem.method}
                              </span>

                              <strong>
                                ₹
                                {Number(
                                  paymentItem.amount ||
                                    0
                                ).toFixed(
                                  2
                                )}
                              </strong>
                            </div>
                          )
                        )}

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            borderTop:
                              "1px solid #e2e8f0",
                            marginTop:
                              "8px",
                            paddingTop:
                              "8px",
                            fontWeight:
                              "700",
                          }}
                        >
                          <span>
                            Payment Total
                          </span>

                          <span>
                            ₹
                            {paymentTotal.toFixed(
                              2
                            )}
                          </span>
                        </div>

                      </div>
                    )}

                    {isEditMode && (
                      <small>
                        The backend will
                        recalculate stock,
                        litres and sale amount
                        transactionally.
                      </small>
                    )}

                    {!isEditMode &&
                      paymentMethod ===
                        "qr" && (
                        <small>
                          Final amount is
                          calculated and verified
                          by the backend.
                        </small>
                      )}

                  </div>
                )}

              {/* =================================================
                  ACTIONS
              ================================================= */}

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
                    editLoading ||
                    !selectedNozzle ||
                    !shiftName ||
                    !selectedStaff ||
                    nozzles.length ===
                      0 ||
                    staff.length ===
                      0 ||
                    !isValidTime(
                      readingTime
                    ) ||
                    (splitPaymentEnabled &&
                      !paymentTotalMatches)
                  }
                >
                  {loading
                    ? isEditMode
                      ? "Updating..."
                      : paymentMethod ===
                          "qr"
                        ? "Generating QR..."
                        : "Saving..."
                    : isEditMode
                      ? "Update Reading"
                      : paymentMethod ===
                          "qr"
                        ? "Generate QR & Pay"
                        : "Save Reading"}
                </button>

              </div>

            </form>
          )}

        </div>

      </div>

    </div>
  );
};

export default AddReading;