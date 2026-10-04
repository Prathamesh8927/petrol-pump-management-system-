import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  FileText,
} from "lucide-react";

import ProfessionalSearch from "../../components/ProfessionalSearch";

import {
  getLedgerCustomers,
  deleteLedgerCustomer,
  getCustomerLedgerHistory,
} from "../../services/ledgerService";

import api from "../../services/api";

import {
  exportLedgerPDF,
} from "../../utils/ledgerExport";

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  pageBackground: "#f5f7fa",

  primary: "#124b68",
  primaryDark: "#0d3f59",
  primaryText: "#0f4663",

  text: "#102a43",
  muted: "#64748b",

  white: "#ffffff",

  border: "#dfe5eb",
  borderDark: "#cbd5e1",

  success: "#15803d",
  successBackground: "#dcfce7",

  danger: "#dc2626",
  dangerDark: "#b91c1c",
  dangerBackground: "#fee2e2",

  hover: "#f8fafc",
};

/* =========================================================
   HELPERS
========================================================= */

const resolveLogoUrl = (settings = {}) => {
  const candidates = [
    settings?.logoUrl,
    settings?.logoURL,
    settings?.companyLogo,
    settings?.pumpLogo,
    settings?.logo?.url,
    settings?.logo?.secure_url,
    settings?.logo?.secureUrl,
    settings?.logo?.path,
    settings?.logo?.src,
    settings?.logo,
  ];

  const resolved = candidates.find(
    (value) =>
      typeof value === "string" &&
      value.trim().length > 0
  );

  return resolved
    ? resolved.trim()
    : null;
};

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

/* =========================================================
   COMPONENT
========================================================= */

const Customers = () => {
  const navigate = useNavigate();

  /* =======================================================
     STATE
  ======================================================= */

  const [
    customers,
    setCustomers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    exportingId,
    setExportingId,
  ] = useState(null);

  const [
    totals,
    setTotals,
  ] = useState({
    totalCustomers: 0,
    totalCredit: 0,
    totalPaid: 0,
    totalPending: 0,
  });

  /* =======================================================
     REFS
  ======================================================= */

  const mountedRef =
    useRef(true);

  const loadingRef =
    useRef(false);

  const deletingRef =
    useRef(false);

  const exportingRef =
    useRef(false);

  /* =======================================================
     MOUNT / UNMOUNT
  ======================================================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =========================================================
     LOAD CUSTOMERS
  ========================================================= */

  const loadCustomers = useCallback(
    async (options = {}) => {
      const {
        silent = false,
      } = options;

      if (
        loadingRef.current &&
        !silent
      ) {
        return;
      }

      loadingRef.current = true;

      if (
        !silent &&
        mountedRef.current
      ) {
        setLoading(true);
      }

      try {
        const data =
          await getLedgerCustomers();

        if (!mountedRef.current) {
          return;
        }

        const customerList =
          Array.isArray(
            data?.customers
          )
            ? data.customers
            : [];

        setCustomers(
          customerList
        );

        setTotals({
          totalCustomers:
            Number.isFinite(
              Number(
                data?.totalCustomers
              )
            )
              ? Number(
                  data.totalCustomers
                )
              : customerList.length,

          totalCredit:
            safeNumber(
              data?.totalCredit ??
                data?.totalPurchased
            ),

          totalPaid:
            safeNumber(
              data?.totalPaid
            ),

          totalPending:
            safeNumber(
              data?.totalPending ??
                data?.totalCreditPending
            ),
        });
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        toast.error(
          getErrorMessage(
            error,
            "Failed to load customers"
          )
        );
      } finally {
        loadingRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  /* =========================================================
     REFRESH WHEN TAB / WINDOW BECOMES ACTIVE
  ========================================================= */

  useEffect(() => {
    let refreshTimer = null;

    const refresh = () => {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        return;
      }

      clearTimeout(
        refreshTimer
      );

      refreshTimer = setTimeout(
        () => {
          loadCustomers({
            silent: true,
          });
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
      clearTimeout(
        refreshTimer
      );

      window.removeEventListener(
        "focus",
        refresh
      );

      document.removeEventListener(
        "visibilitychange",
        refresh
      );
    };
  }, [loadCustomers]);

  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredCustomers =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return customers;
      }

      return customers.filter(
        (customer) => {
          return (
            String(
              customer?.name || ""
            )
              .toLowerCase()
              .includes(value) ||

            String(
              customer?.phone || ""
            )
              .toLowerCase()
              .includes(value) ||

            String(
              customer?.vehicleNumber ||
                ""
            )
              .toLowerCase()
              .includes(value) ||

            String(
              customer?.address || ""
            )
              .toLowerCase()
              .includes(value)
          );
        }
      );
    }, [
      customers,
      search,
    ]);

  /* =========================================================
     OPEN CUSTOMER LEDGER
  ========================================================= */

  const handleCustomerRowClick =
    useCallback(
      (customer) => {
        if (!customer?._id) {
          return;
        }

        navigate(
          `/ledger/customer?id=${encodeURIComponent(
            customer._id
          )}`
        );
      },
      [navigate]
    );

  /* =========================================================
     DELETE CUSTOMER
  ========================================================= */

  const handleDelete =
    useCallback(
      async (customer) => {
        if (
          !customer?._id ||
          deletingRef.current
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            `Are you sure you want to delete "${customer?.name}"?\n\nThe customer will be moved to recovery storage according to the configured retention period.`
          );

        if (!confirmed) {
          return;
        }

        deletingRef.current =
          true;

        if (mountedRef.current) {
          setDeletingId(
            customer._id
          );
        }

        try {
          await deleteLedgerCustomer(
            customer._id
          );

          if (!mountedRef.current) {
            return;
          }

          toast.success(
            "Customer moved to recovery storage"
          );

          await loadCustomers({
            silent: true,
          });
        } catch (error) {
          if (!mountedRef.current) {
            return;
          }

          toast.error(
            getErrorMessage(
              error,
              "Failed to delete customer"
            )
          );
        } finally {
          deletingRef.current =
            false;

          if (mountedRef.current) {
            setDeletingId(null);
          }
        }
      },
      [loadCustomers]
    );

  /* =========================================================
     DOWNLOAD CUSTOMER LEDGER PDF
  ========================================================= */

  const handleDownloadPDF =
    useCallback(
      async (customer) => {
        if (
          !customer?._id ||
          exportingRef.current
        ) {
          return;
        }

        exportingRef.current =
          true;

        if (mountedRef.current) {
          setExportingId(
            customer._id
          );
        }

        const loadingToast =
          toast.loading(
            "Preparing customer ledger PDF..."
          );

        try {
          const historyResponse =
            await getCustomerLedgerHistory(
              customer._id
            );

          const pdfCustomer =
            historyResponse?.customer ||
            historyResponse
              ?.data?.customer ||
            customer;

          const entries =
            historyResponse?.entries ||
            historyResponse?.transactions ||
            historyResponse
              ?.data?.entries ||
            historyResponse
              ?.data?.transactions ||
            [];

          const summary =
            historyResponse?.summary ||
            historyResponse
              ?.data?.summary ||
            {};

          /* ==============================================
             LOAD PUMP PROFILE
          ============================================== */

          let pumpSettings = {};

          try {
            const pumpResponse =
              await api.get(
                "/settings/pump"
              );

            pumpSettings =
              pumpResponse?.settings ||
              pumpResponse
                ?.data?.settings ||
              pumpResponse?.data ||
              {};
          } catch {
            pumpSettings = {};
          }

          /* ==============================================
             PROFILE LOGO
          ============================================== */

          const logoUrl =
            resolveLogoUrl(
              pumpSettings
            );

          /* ==============================================
             NORMALIZED PUMP PROFILE
          ============================================== */

          const pump = {
            ...pumpSettings,

            pumpName:
              pumpSettings?.pumpName ||
              pumpSettings?.name ||
              "Shivshambho",

            ownerName:
              pumpSettings?.ownerName ||
              pumpSettings?.owner ||
              "",

            companyName:
              pumpSettings?.companyName ||
              pumpSettings
                ?.oilCompanyName ||
              pumpSettings
                ?.oilCompany ||
              "",

            gstin:
              pumpSettings?.gstin ||
              pumpSettings?.gstNo ||
              "",

            address:
              pumpSettings?.address ||
              "",

            city:
              pumpSettings?.city ||
              "",

            state:
              pumpSettings?.state ||
              "",

            pincode:
              pumpSettings?.pincode ||
              pumpSettings?.pinCode ||
              "",

            phone:
              pumpSettings?.phone ||
              pumpSettings?.mobile ||
              pumpSettings
                ?.mobileNumber ||
              "",

            email:
              pumpSettings?.email ||
              "",

            logoUrl:
              logoUrl || null,

            logo:
              pumpSettings?.logo ||
              logoUrl ||
              null,
          };

          /* ==============================================
             BILL DATE
          ============================================== */

          const latestEntry =
            entries.length > 0
              ? entries[
                  entries.length - 1
                ]
              : null;

          const billDate =
            pdfCustomer?.billDate ||
            pdfCustomer?.invoiceDate ||
            pdfCustomer?.createdAt ||
            latestEntry?.entryDate ||
            latestEntry?.date ||
            latestEntry?.transactionDate ||
            latestEntry?.createdAt ||
            new Date();

          /* ==============================================
             BILL NUMBER
          ============================================== */

          const billNo =
            pdfCustomer?.billNo ||
            pdfCustomer?.billNumber ||
            pdfCustomer?.invoiceNo ||
            pdfCustomer?.invoiceNumber ||
            pdfCustomer?.ledgerNo ||
            pdfCustomer?.ledgerNumber ||
            `LED-${String(
              customer._id
            )
              .slice(-6)
              .toUpperCase()}`;

          /* ==============================================
             EXPORT
          ============================================== */

          await exportLedgerPDF({
            customer: {
              ...pdfCustomer,

              entries,

              summary,

              totalPurchases:
                safeNumber(
                  summary?.totalPurchased ??
                    summary?.totalPurchase
                ),

              totalAmount:
                safeNumber(
                  summary?.totalPurchased ??
                    summary?.totalPurchase ??
                    summary?.totalAmount ??
                    pdfCustomer?.totalAmount
                ),

              paidAmount:
                safeNumber(
                  summary?.totalPaid ??
                    summary?.paidAmount ??
                    pdfCustomer?.paidAmount
                ),

              totalPaid:
                safeNumber(
                  summary?.totalPaid ??
                    summary?.paidAmount
                ),

              totalPending:
                safeNumber(
                  summary?.totalPending ??
                    summary?.pendingAmount
                ),

              currentBalance:
                safeNumber(
                  summary?.totalPending ??
                    summary?.pendingAmount ??
                    pdfCustomer?.currentBalance
                ),
            },

            pump,

            billNo,

            billDate,

            billFrom:
              pdfCustomer?.billFrom ||
              "",

            logoUrl:
              logoUrl || null,
          });

          toast.dismiss(
            loadingToast
          );

          if (mountedRef.current) {
            toast.success(
              "Customer ledger PDF generated successfully"
            );
          }
        } catch (error) {
          toast.dismiss(
            loadingToast
          );

          if (mountedRef.current) {
            toast.error(
              getErrorMessage(
                error,
                "Failed to generate customer ledger PDF"
              )
            );
          }
        } finally {
          exportingRef.current =
            false;

          if (mountedRef.current) {
            setExportingId(null);
          }
        }
      },
      []
    );

  /* =========================================================
     MONEY FORMAT
  ========================================================= */

  const formatMoney =
    useCallback(
      (value) => {
        const amount =
          safeNumber(value);

        return `₹${amount.toLocaleString(
          "en-IN",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )}`;
      },
      []
    );

  /* =========================================================
     STATUS
  ========================================================= */

  const getStatus =
    useCallback(
      (customer) => {
        const pending =
          Math.max(
            safeNumber(
              customer?.currentBalance ??
                customer?.pendingAmount ??
                customer?.totalPending
            ),
            0
          );

        const advanceBalance =
          Math.max(
            safeNumber(
              customer?.advanceBalance ??
                customer?.remainingAdvance ??
                customer?.advanceRemaining
            ),
            0
          );

        const advanceApplied =
          Math.max(
            safeNumber(
              customer?.advanceAppliedAmount ??
                customer?.totalAdvanceApplied ??
                customer?.advanceApplied
            ),
            0
          );

        const advanceReceived =
          Math.max(
            safeNumber(
              customer?.advanceAmount ??
                customer?.totalAdvanceReceived ??
                customer?.totalAdvance
            ),
            0
          );

        /* ==============================================
           PARTIALLY ADVANCED
        ============================================== */

        if (
          advanceApplied > 0 &&
          pending > 0
        ) {
          return "Advanced";
        }

        /* ==============================================
           ADVANCED - UNUSED ADVANCE
        ============================================== */

        if (
          advanceBalance > 0 &&
          pending <= 0
        ) {
          return "Advanced";
        }

        /* ==============================================
           ADVANCED - ADVANCE FULLY CONSUMED
        ============================================== */

        if (
          advanceApplied > 0 &&
          pending <= 0
        ) {
          return "Advanced";
        }

        /* ==============================================
           PENDING
        ============================================== */

        if (
          pending > 0
        ) {
          return "Pending";
        }

        /* ==============================================
           ADVANCED - RECEIVED BUT FULLY CONSUMED
        ============================================== */

        if (
          advanceReceived > 0 &&
          advanceBalance <= 0 &&
          pending <= 0
        ) {
          return "Advanced";
        }

        /* ==============================================
           OK
        ============================================== */

        if (
          advanceBalance <= 0 &&
          advanceApplied <= 0 &&
          advanceReceived <= 0 &&
          pending <= 0
        ) {
          return "OK";
        }

        return "OK";
      },
      []
    );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className="customers-page"
      style={{
        minHeight: "100%",
        width: "100%",
        padding: "24px",
        boxSizing: "border-box",
        background:
          COLORS.pageBackground,
        color: COLORS.text,
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "28px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              lineHeight: "1.2",
              fontWeight: 800,
              color:
                COLORS.primaryText,
              letterSpacing:
                "-0.5px",
            }}
          >
            Customer Ledger
          </h1>

          <p
            style={{
              margin:
                "7px 0 0",
              color:
                COLORS.primaryText,
              fontSize: "16px",
              fontWeight: 400,
            }}
          >
            Manage customer credit,
            payments and ledger history
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/ledger/customer"
            )
          }
          style={{
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            gap: "8px",

            minHeight: "46px",

            border:
              "1px solid " +
              COLORS.primaryDark,

            borderRadius: "9px",

            padding:
              "0 20px",

            background:
              COLORS.primary,

            color:
              COLORS.white,

            fontSize:
              "16px",

            fontWeight: 700,

            cursor: "pointer",

            transition:
              "all 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              COLORS.primaryDark;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              COLORS.primary;
          }}
        >
          <Plus size={19} />

          Add Customer
        </button>
      </div>

      {/* =====================================================
          SEARCH + REFRESH
      ===================================================== */}

      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: "12px",
          marginBottom:
            "22px",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <ProfessionalSearch
            value={search}
            onChange={setSearch}
            placeholder="Search customer by name, phone, vehicle or address..."
          />
        </div>

        <button
          type="button"
          onClick={() =>
            loadCustomers()
          }
          disabled={loading}
          title="Refresh Customers"
          style={{
            flexShrink: 0,

            width: "50px",
            height: "50px",

            border:
              "1px solid " +
              COLORS.borderDark,

            borderRadius: "9px",

            background:
              COLORS.white,

            color:
              COLORS.text,

            display: "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            cursor: loading
              ? "not-allowed"
              : "pointer",

            opacity: loading
              ? 0.65
              : 1,
          }}
        >
          <RefreshCw
            size={20}
            style={{
              animation: loading
                ? "spin 1s linear infinite"
                : "none",
            }}
          />
        </button>
      </div>

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: "16px",
          marginBottom:
            "26px",
        }}
      >
        {/* TOTAL CUSTOMERS */}

        <div
          style={{
            padding:
              "20px 21px",

            border:
              "1px solid " +
              COLORS.border,

            borderRadius:
              "11px",

            background:
              COLORS.white,

            minHeight:
              "104px",
          }}
        >
          <div
            style={{
              fontSize:
                "13px",

              color:
                COLORS.primaryText,

              fontWeight:
                700,

              letterSpacing:
                "0.3px",
            }}
          >
            TOTAL CUSTOMERS
          </div>

          <div
            style={{
              marginTop:
                "8px",

              fontSize:
                "27px",

              lineHeight:
                "1.1",

              fontWeight:
                800,

              color:
                COLORS.primaryText,
            }}
          >
            {
              totals.totalCustomers
            }
          </div>
        </div>

        {/* TOTAL CREDIT */}

        <div
          style={{
            padding:
              "20px 21px",

            border:
              "1px solid " +
              COLORS.border,

            borderRadius:
              "11px",

            background:
              COLORS.white,

            minHeight:
              "104px",
          }}
        >
          <div
            style={{
              fontSize:
                "13px",

              color:
                COLORS.primaryText,

              fontWeight:
                700,

              letterSpacing:
                "0.3px",
            }}
          >
            TOTAL CREDIT
          </div>

          <div
            style={{
              marginTop:
                "8px",

              fontSize:
                "27px",

              lineHeight:
                "1.1",

              fontWeight:
                800,

              color:
                COLORS.primaryText,
            }}
          >
            {formatMoney(
              totals.totalCredit
            )}
          </div>
        </div>

        {/* TOTAL PAID */}

        <div
          style={{
            padding:
              "20px 21px",

            border:
              "1px solid " +
              COLORS.border,

            borderRadius:
              "11px",

            background:
              COLORS.white,

            minHeight:
              "104px",
          }}
        >
          <div
            style={{
              fontSize:
                "13px",

              color:
                COLORS.primaryText,

              fontWeight:
                700,

              letterSpacing:
                "0.3px",
            }}
          >
            TOTAL PAID
          </div>

          <div
            style={{
              marginTop:
                "8px",

              fontSize:
                "27px",

              lineHeight:
                "1.1",

              fontWeight:
                800,

              color:
                COLORS.success,
            }}
          >
            {formatMoney(
              totals.totalPaid
            )}
          </div>
        </div>

        {/* TOTAL PENDING */}

        <div
          style={{
            padding:
              "20px 21px",

            border:
              "1px solid " +
              COLORS.border,

            borderRadius:
              "11px",

            background:
              COLORS.white,

            minHeight:
              "104px",
          }}
        >
          <div
            style={{
              fontSize:
                "13px",

              color:
                COLORS.primaryText,

              fontWeight:
                700,

              letterSpacing:
                "0.3px",
            }}
          >
            TOTAL PENDING
          </div>

          <div
            style={{
              marginTop:
                "8px",

              fontSize:
                "27px",

              lineHeight:
                "1.1",

              fontWeight:
                800,

              color:
                COLORS.danger,
            }}
          >
            {formatMoney(
              totals.totalPending
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          CUSTOMER TABLE
      ===================================================== */}

      <div
        style={{
          background:
            COLORS.white,

          border:
            "1px solid " +
            COLORS.border,

          borderRadius:
            "11px",

          overflow:
            "hidden",

          boxShadow:
            "0 1px 2px rgba(15,23,42,0.03)",
        }}
      >
        <div
          style={{
            overflowX:
              "auto",
          }}
        >
          <table
            style={{
              width:
                "100%",

              borderCollapse:
                "collapse",

              minWidth:
                "980px",
            }}
          >
            {/* =================================================
                TABLE HEADER
            ================================================= */}

            <thead>
              <tr
                style={{
                  background:
                    COLORS.primary,

                  color:
                    COLORS.white,
                }}
              >
                <th
                  style={{
                    padding:
                      "15px 16px",
                    textAlign:
                      "left",
                    fontSize:
                      "14px",
                    fontWeight:
                      700,
                    width:
                      "55px",
                  }}
                >
                  #
                </th>

                <th
                  style={{
                    padding:
                      "15px 16px",
                    textAlign:
                      "left",
                    fontSize:
                      "14px",
                    fontWeight:
                      700,
                    minWidth:
                      "220px",
                  }}
                >
                  Customer
                </th>

                <th
                  style={{
                    padding:
                      "15px 16px",
                    textAlign:
                      "left",
                    fontSize:
                      "14px",
                    fontWeight:
                      700,
                    minWidth:
                      "130px",
                  }}
                >
                  Vehicle
                </th>

                <th
                  style={{
                    padding:
                      "15px 16px",
                    textAlign:
                      "right",
                    fontSize:
                      "14px",
                    fontWeight:
                      700,
                    minWidth:
                      "120px",
                  }}
                >
                  Credit
                </th>

                <th
                  style={{
                    padding:
                      "15px 16px",
                    textAlign:
                      "right",
                    fontSize:
                      "14px",
                    fontWeight:
                      700,
                    minWidth:
                      "120px",
                  }}
                >
                  Paid
                </th>

                {/* NET AMOUNT */}

                <th
                  style={{
                    padding:
                      "15px 16px",
                    textAlign:
                      "right",
                    fontSize:
                      "14px",
                    fontWeight:
                      700,
                    minWidth:
                      "140px",
                  }}
                >
                  Net Amount
                </th>

                <th
                  style={{
                    padding:
                      "15px 16px",
                    textAlign:
                      "center",
                    fontSize:
                      "14px",
                    fontWeight:
                      700,
                    minWidth:
                      "150px",
                  }}
                >
                  Status
                </th>

                <th
                  style={{
                    padding:
                      "15px 16px",
                    textAlign:
                      "center",
                    fontSize:
                      "14px",
                    fontWeight:
                      700,
                    minWidth:
                      "180px",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            {/* =================================================
                TABLE BODY
            ================================================= */}

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      padding:
                        "55px 20px",
                      textAlign:
                        "center",
                      color:
                        COLORS.muted,
                      fontSize:
                        "14px",
                    }}
                  >
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      padding:
                        "55px 20px",
                      textAlign:
                        "center",
                      color:
                        COLORS.muted,
                      fontSize:
                        "14px",
                    }}
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(
                  (
                    customer,
                    index
                  ) => {
                    /* ========================================
                       CREDIT
                    ======================================== */

                    const credit =
                      safeNumber(
                        customer?.totalPurchased ??
                          customer?.totalCredit ??
                          customer?.creditAmount ??
                          customer?.totalAmount
                      );

                    /* ========================================
                       PAID
                    ======================================== */

                    const paid =
                      safeNumber(
                        customer?.totalPaid ??
                          customer?.paidAmount
                      );

                    /* ========================================
                       CALCULATED PENDING
                    ======================================== */

                    const calculatedPending =
                      Math.max(
                        credit -
                          paid,
                        0
                      );

                    /* ========================================
                       PENDING
                    ======================================== */

                    const pending =
                      Math.max(
                        safeNumber(
                          customer?.currentBalance ??
                            customer?.pendingAmount ??
                            customer?.totalPending ??
                            calculatedPending
                        ),
                        0
                      );

                    /* ========================================
                       ADVANCE BALANCE
                    ======================================== */

                    const advanceBalance =
                      Math.max(
                        safeNumber(
                          customer?.advanceBalance ??
                            customer?.remainingAdvance ??
                            customer?.advanceRemaining
                        ),
                        0
                      );

                    /* ========================================
                       ADVANCE APPLIED
                    ======================================== */

                    const advanceApplied =
                      Math.max(
                        safeNumber(
                          customer?.advanceAppliedAmount ??
                            customer?.totalAdvanceApplied ??
                            customer?.advanceApplied
                        ),
                        0
                      );

                    /* ========================================
                       ADVANCE RECEIVED
                    ======================================== */

                    const advanceReceived =
                      Math.max(
                        safeNumber(
                          customer?.advanceAmount ??
                            customer?.totalAdvanceReceived ??
                            customer?.totalAdvance
                        ),
                        0
                      );

                    /* ========================================
                       STATUS
                    ======================================== */

                    const status =
                      getStatus(
                        customer
                      );

                    /* ========================================
                       NET AMOUNT

                       ADVANCED:
                       Remaining advance balance.

                       PARTIALLY ADVANCED:
                       Advance amount - pending amount.

                       PENDING:
                       Pending amount.

                       OK:
                       Zero.

                       ONLY THE AMOUNT IS DISPLAYED.
                    ======================================== */

                    let netAmount = 0;

                    if (
                      status ===
                      "Advanced"
                    ) {
                      netAmount =
                        advanceBalance;
                    } else if (
                      status ===
                      "Partially Advanced"
                    ) {
                      netAmount =
                        Math.max(
                          advanceReceived -
                            pending,
                          0
                        );
                    } else if (
                      status ===
                      "Pending"
                    ) {
                      netAmount =
                        pending;
                    } else {
                      netAmount = 0;
                    }

                    const isDeleting =
                      deletingId ===
                      customer._id;

                    const isExporting =
                      exportingId ===
                      customer._id;

                    return (
                      <tr
                        key={
                          customer._id
                        }
                        onClick={() =>
                          handleCustomerRowClick(
                            customer
                          )
                        }
                        style={{
                          borderTop:
                            "1px solid " +
                            COLORS.border,

                          background:
                            COLORS.white,

                          cursor:
                            "pointer",

                          transition:
                            "background 0.15s ease",
                        }}
                        onMouseEnter={(
                          e
                        ) => {
                          e.currentTarget.style.background =
                            COLORS.hover;
                        }}
                        onMouseLeave={(
                          e
                        ) => {
                          e.currentTarget.style.background =
                            COLORS.white;
                        }}
                      >
                        {/* NUMBER */}

                        <td
                          style={{
                            padding:
                              "15px 16px",

                            fontSize:
                              "13px",

                            color:
                              COLORS.muted,

                            verticalAlign:
                              "middle",
                          }}
                        >
                          {index + 1}
                        </td>

                        {/* CUSTOMER */}

                        <td
                          style={{
                            padding:
                              "15px 16px",

                            verticalAlign:
                              "middle",
                          }}
                        >
                          <div
                            style={{
                              color:
                                COLORS.text,

                              fontWeight:
                                700,

                              fontSize:
                                "14px",

                              lineHeight:
                                "1.3",
                            }}
                          >
                            {
                              customer.name
                            }
                          </div>

                          {customer.phone && (
                            <div
                              style={{
                                marginTop:
                                  "4px",

                                color:
                                  COLORS.muted,

                                fontSize:
                                  "12px",

                                lineHeight:
                                  "1.2",
                              }}
                            >
                              {
                                customer.phone
                              }
                            </div>
                          )}
                        </td>

                        {/* VEHICLE */}

                        <td
                          style={{
                            padding:
                              "15px 16px",

                            fontSize:
                              "13px",

                            color:
                              "#334155",

                            verticalAlign:
                              "middle",
                          }}
                        >
                          {customer.vehicleNumber ||
                            "-"}
                        </td>

                        {/* CREDIT */}

                        <td
                          style={{
                            padding:
                              "15px 16px",

                            textAlign:
                              "right",

                            fontSize:
                              "13px",

                            fontWeight:
                              700,

                            color:
                              COLORS.text,

                            verticalAlign:
                              "middle",
                          }}
                        >
                          {formatMoney(
                            credit
                          )}
                        </td>

                        {/* PAID */}

                        <td
                          style={{
                            padding:
                              "15px 16px",

                            textAlign:
                              "right",

                            fontSize:
                              "13px",

                            fontWeight:
                              700,

                            color:
                              COLORS.success,

                            verticalAlign:
                              "middle",
                          }}
                        >
                          {formatMoney(
                            paid
                          )}
                        </td>

                        {/* NET AMOUNT */}

                        <td
                          style={{
                            padding:
                              "15px 16px",

                            textAlign:
                              "right",

                            verticalAlign:
                              "middle",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "13px",

                              fontWeight:
                                800,

                              color:
                                status ===
                                "Advanced" ||
                                status ===
                                  "Partially Advanced"
                                  ? COLORS.success
                                  : status ===
                                      "Pending" 
                                  ? COLORS.danger
                                  : COLORS.muted,
                            }}
                          >
                            {formatMoney(
                              netAmount
                            )}
                          </div>
                        </td>

                        {/* STATUS */}

                        <td
                          style={{
                            padding:
                              "15px 16px",

                            textAlign:
                              "center",

                            verticalAlign:
                              "middle",
                          }}
                        >
                          <span
                            style={{
                              display:
                                "inline-flex",

                              alignItems:
                                "center",

                              justifyContent:
                                "center",

                              minWidth:
                                status ===
                                "Partially Advanced"
                                  ? "130px"
                                  : status ===
                                      "Advanced"
                                  ? "80px"
                                  : "66px",

                              padding:
                                "5px 11px",

                              borderRadius:
                                "999px",

                              fontSize:
                                "11px",

                              fontWeight:
                                700,

                              background:
                                status ===
                                  "Pending"
                                  ? COLORS.dangerBackground
                                  : status ===
                                      "Partially Advanced"
                                  ? "#fff7ed"
                                  : COLORS.successBackground,

                              color:
                                status ===
                                  "Pending"
                                  ? COLORS.dangerDark
                                  : status ===
                                      "Partially Advanced"
                                  ? "#c2410c"
                                  : COLORS.success,
                            }}
                          >
                            {status}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                          style={{
                            padding:
                              "15px 16px",

                            textAlign:
                              "center",

                            verticalAlign:
                              "middle",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "center",

                              justifyContent:
                                "center",

                              gap:
                                "7px",
                            }}
                          >
                            {/* VIEW */}

                            <button
                              type="button"
                              onClick={() =>
                                handleCustomerRowClick(
                                  customer
                                )
                              }
                              title="View Customer Ledger"
                              style={{
                                width:
                                  "39px",

                                height:
                                  "39px",

                                border:
                                  "1px solid " +
                                  COLORS.borderDark,

                                borderRadius:
                                  "8px",

                                background:
                                  COLORS.white,

                                color:
                                  COLORS.primary,

                                display:
                                  "flex",

                                alignItems:
                                  "center",

                                justifyContent:
                                  "center",

                                cursor:
                                  "pointer",

                                transition:
                                  "all 0.15s ease",
                              }}
                              onMouseEnter={(
                                e
                              ) => {
                                e.currentTarget.style.background =
                                  "#f1f5f9";

                                e.currentTarget.style.borderColor =
                                  COLORS.primary;
                              }}
                              onMouseLeave={(
                                e
                              ) => {
                                e.currentTarget.style.background =
                                  COLORS.white;

                                e.currentTarget.style.borderColor =
                                  COLORS.borderDark;
                              }}
                            >
                              <Eye
                                size={17}
                              />
                            </button>

                            {/* EDIT */}

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/ledger/customer?id=${encodeURIComponent(
                                    customer._id
                                  )}&edit=true`
                                )
                              }
                              title="Edit Customer"
                              style={{
                                width:
                                  "39px",

                                height:
                                  "39px",

                                border:
                                  "1px solid " +
                                  COLORS.borderDark,

                                borderRadius:
                                  "8px",

                                background:
                                  COLORS.white,

                                color:
                                  COLORS.primary,

                                display:
                                  "flex",

                                alignItems:
                                  "center",

                                justifyContent:
                                  "center",

                                cursor:
                                  "pointer",

                                transition:
                                  "all 0.15s ease",
                              }}
                              onMouseEnter={(
                                e
                              ) => {
                                e.currentTarget.style.background =
                                  "#f1f5f9";

                                e.currentTarget.style.borderColor =
                                  COLORS.primary;
                              }}
                              onMouseLeave={(
                                e
                              ) => {
                                e.currentTarget.style.background =
                                  COLORS.white;

                                e.currentTarget.style.borderColor =
                                  COLORS.borderDark;
                              }}
                            >
                              <Pencil
                                size={17}
                              />
                            </button>

                            {/* PDF */}

                            <button
                              type="button"
                              disabled={
                                isExporting ||
                                exportingRef.current
                              }
                              onClick={() =>
                                handleDownloadPDF(
                                  customer
                                )
                              }
                              title="Download Customer Ledger PDF"
                              style={{
                                width:
                                  "39px",

                                height:
                                  "39px",

                                border:
                                  "1px solid " +
                                  COLORS.borderDark,

                                borderRadius:
                                  "8px",

                                background:
                                  COLORS.white,

                                color:
                                  COLORS.primary,

                                display:
                                  "flex",

                                alignItems:
                                  "center",

                                justifyContent:
                                  "center",

                                cursor:
                                  isExporting
                                    ? "not-allowed"
                                    : "pointer",

                                opacity:
                                  isExporting
                                    ? 0.55
                                    : 1,

                                transition:
                                  "all 0.15s ease",
                              }}
                              onMouseEnter={(
                                e
                              ) => {
                                if (
                                  isExporting
                                ) {
                                  return;
                                }

                                e.currentTarget.style.background =
                                  "#f1f5f9";

                                e.currentTarget.style.borderColor =
                                  COLORS.primary;
                              }}
                              onMouseLeave={(
                                e
                              ) => {
                                e.currentTarget.style.background =
                                  COLORS.white;

                                e.currentTarget.style.borderColor =
                                  COLORS.borderDark;
                              }}
                            >
                              {isExporting ? (
                                <RefreshCw
                                  size={17}
                                  style={{
                                    animation:
                                      "spin 1s linear infinite",
                                  }}
                                />
                              ) : (
                                <FileText
                                  size={17}
                                />
                              )}
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              disabled={
                                isDeleting ||
                                deletingRef.current
                              }
                              onClick={() =>
                                handleDelete(
                                  customer
                                )
                              }
                              title="Delete Customer"
                              style={{
                                width:
                                  "39px",

                                height:
                                  "39px",

                                border:
                                  "1px solid #fecaca",

                                borderRadius:
                                  "8px",

                                background:
                                  COLORS.white,

                                color:
                                  COLORS.danger,

                                display:
                                  "flex",

                                alignItems:
                                  "center",

                                justifyContent:
                                  "center",

                                cursor:
                                  isDeleting
                                    ? "not-allowed"
                                    : "pointer",

                                opacity:
                                  isDeleting
                                    ? 0.55
                                    : 1,

                                transition:
                                  "all 0.15s ease",
                              }}
                              onMouseEnter={(
                                e
                              ) => {
                                if (
                                  isDeleting
                                ) {
                                  return;
                                }

                                e.currentTarget.style.background =
                                  "#fef2f2";

                                e.currentTarget.style.borderColor =
                                  COLORS.danger;
                              }}
                              onMouseLeave={(
                                e
                              ) => {
                                e.currentTarget.style.background =
                                  COLORS.white;

                                e.currentTarget.style.borderColor =
                                  "#fecaca";
                              }}
                            >
                              {isDeleting ? (
                                <RefreshCw
                                  size={17}
                                  style={{
                                    animation:
                                      "spin 1s linear infinite",
                                  }}
                                />
                              ) : (
                                <Trash2
                                  size={17}
                                />
                              )}
                            </button>
                          </div>
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

      {/* =====================================================
          RESPONSIVE + ANIMATION
      ===================================================== */}

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 1100px) {
            .customers-page {
              padding: 20px !important;
            }

            .customers-page
              > div:nth-child(4) {
              grid-template-columns:
                repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 768px) {
            .customers-page {
              padding: 16px !important;
            }

            .customers-page
              > div:nth-child(4) {
              grid-template-columns:
                repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 600px) {
            .customers-page {
              padding: 12px !important;
            }

            .customers-page
              > div:nth-child(4) {
              grid-template-columns:
                1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Customers;