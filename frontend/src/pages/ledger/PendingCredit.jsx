import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import {
  getPendingCredit,
} from "../../services/ledgerService";

const PendingCredit = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [totalPending, setTotalPending] =
    useState(0);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =====================================================
     HELPERS
  ===================================================== */

  const money = (value) => {
    const amount = Number(value ?? 0);

    return (
      Number.isFinite(amount) ? amount : 0
    ).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const openCustomerLedger = useCallback(
    (customerId) => {
      if (!customerId) {
        toast.error(
          "Customer information is unavailable."
        );
        return;
      }

      navigate(
        `/ledger/customer?id=${encodeURIComponent(
          customerId
        )}`
      );
    },
    [navigate]
  );

  /* =====================================================
     LOAD PENDING CREDIT
  ===================================================== */

  const loadPending = useCallback(
    async ({ silent = false } = {}) => {
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;

      if (!silent && mountedRef.current) {
        setLoading(true);
      }

      try {
        const data =
          await getPendingCredit();

        const customerList =
          Array.isArray(data?.customers)
            ? data.customers
            : [];

        const total = Number(
          data?.totalPending ?? 0
        );

        if (mountedRef.current) {
          setCustomers(customerList);

          setTotalPending(
            Number.isFinite(total)
              ? total
              : 0
          );
        }
      } catch (error) {
        if (mountedRef.current) {
          toast.error(
            error?.response?.data?.message ||
              error?.message ||
              "Unable to load pending credit."
          );
        }
      } finally {
        loadingRef.current = false;

        if (!silent && mountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  /* =====================================================
     INITIAL LOAD + REFRESH
  ===================================================== */

  useEffect(() => {
    loadPending();

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadPending({
          silent: true,
        });
      }
    };

    const handleFocus = () => {
      loadPending({
        silent: true,
      });
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadPending]);

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="page-container">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-header">
        <div>
          <h1>Pending Credit</h1>

          <p>
            Customers with outstanding
            ledger balance.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => loadPending()}
          disabled={loading}
        >
          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div
        className="stats-grid"
        style={{
          marginBottom: "24px",
        }}
      >
        <div className="stat-card">
          <h4>Pending Customers</h4>

          <h2>{customers.length}</h2>

          <p
            style={{
              marginTop: "6px",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            Customers with unpaid credit
          </p>
        </div>

        <div className="stat-card">
          <h4>Total Pending</h4>

          <h2
            style={{
              color: "#dc2626",
            }}
          >
            ₹ {money(totalPending)}
          </h2>

          <p
            style={{
              marginTop: "6px",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            Outstanding ledger amount
          </p>
        </div>
      </div>

      {/* =================================================
          CUSTOMER LIST
      ================================================= */}

      <div className="content-panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "18px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              Outstanding Customers
            </h3>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              Tap any customer to open
              their ledger.
            </p>
          </div>

          <div
            style={{
              padding: "7px 12px",
              borderRadius: "999px",
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {customers.length}{" "}
            {customers.length === 1
              ? "Customer"
              : "Customers"}
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: "50px 20px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                marginBottom: "5px",
              }}
            >
              Loading pending credit...
            </div>

            <div
              style={{
                fontSize: "13px",
              }}
            >
              Please wait.
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div
            style={{
              padding: "55px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                margin: "0 auto 14px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f0fdf4",
                color: "#16a34a",
                fontSize: "25px",
                fontWeight: 700,
              }}
            >
              ✓
            </div>

            <h3
              style={{
                margin: "0 0 6px",
                fontSize: "17px",
              }}
            >
              No Pending Credit
            </h3>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              All customer balances are
              cleared.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(290px, 1fr))",
              gap: "14px",
            }}
          >
            {customers.map(
              (customer, index) => {
                const pending =
                  Number(
                    customer?.currentBalance ??
                      customer?.totalPending ??
                      0
                  );

                const customerId =
                  customer?._id;

                return (
                  <div
                    key={customerId}
                    role="button"
                    tabIndex={
                      customerId ? 0 : -1
                    }
                    onClick={() =>
                      openCustomerLedger(
                        customerId
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key ===
                          "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();

                        openCustomerLedger(
                          customerId
                        );
                      }
                    }}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "16px",
                      background: "#ffffff",
                      cursor: customerId
                        ? "pointer"
                        : "default",
                      transition:
                        "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                    }}
                    onMouseEnter={(event) => {
                      if (!customerId) {
                        return;
                      }

                      event.currentTarget.style.transform =
                        "translateY(-2px)";

                      event.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(15, 23, 42, 0.08)";

                      event.currentTarget.style.borderColor =
                        "#cbd5e1";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.transform =
                        "translateY(0)";

                      event.currentTarget.style.boxShadow =
                        "none";

                      event.currentTarget.style.borderColor =
                        "#e2e8f0";
                    }}
                  >
                    {/* =================================
                        CARD HEADER
                    ================================= */}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "space-between",
                        gap: "12px",
                        marginBottom: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "11px",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            minWidth: "42px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            background:
                              "#eff6ff",
                            color: "#2563eb",
                            fontSize: "16px",
                            fontWeight: 700,
                          }}
                        >
                          {(
                            customer?.name ||
                            "C"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "15px",
                              fontWeight: 700,
                              color:
                                "#0f172a",
                              whiteSpace:
                                "nowrap",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {customer.name ||
                              "Unknown Customer"}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "3px",
                              fontSize:
                                "12px",
                              color:
                                "#64748b",
                            }}
                          >
                            Customer #
                            {index + 1}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          padding:
                            "5px 9px",
                          borderRadius:
                            "999px",
                          background:
                            "#fef2f2",
                          color:
                            "#dc2626",
                          fontSize:
                            "11px",
                          fontWeight: 700,
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        PENDING
                      </span>
                    </div>

                    {/* =================================
                        CUSTOMER DETAILS
                    ================================= */}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: "10px",
                        marginBottom:
                          "15px",
                      }}
                    >
                      <div
                        style={{
                          padding:
                            "10px",
                          borderRadius:
                            "9px",
                          background:
                            "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "11px",
                            color:
                              "#64748b",
                            marginBottom:
                              "4px",
                          }}
                        >
                          Phone
                        </div>

                        <div
                          style={{
                            fontSize:
                              "13px",
                            fontWeight: 600,
                            color:
                              "#334155",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {customer.phone ||
                            "-"}
                        </div>
                      </div>

                      <div
                        style={{
                          padding:
                            "10px",
                          borderRadius:
                            "9px",
                          background:
                            "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "11px",
                            color:
                              "#64748b",
                            marginBottom:
                              "4px",
                          }}
                        >
                          Vehicle
                        </div>

                        <div
                          style={{
                            fontSize:
                              "13px",
                            fontWeight: 600,
                            color:
                              "#334155",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {customer.vehicleNumber ||
                            "-"}
                        </div>
                      </div>
                    </div>

                    {/* =================================
                        PENDING AMOUNT
                    ================================= */}

                    <div
                      style={{
                        padding: "13px",
                        borderRadius: "10px",
                        background:
                          "#fff7ed",
                        border:
                          "1px solid #fed7aa",
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "space-between",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              "11px",
                            color:
                              "#9a3412",
                            marginBottom:
                              "3px",
                          }}
                        >
                          Outstanding
                        </div>

                        <div
                          style={{
                            fontSize:
                              "19px",
                            fontWeight: 800,
                            color:
                              "#dc2626",
                          }}
                        >
                          ₹{" "}
                          {money(
                            pending
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize:
                            "20px",
                          color:
                            "#dc2626",
                          fontWeight: 700,
                        }}
                      >
                        →
                      </div>
                    </div>

                    {/* =================================
                        ACTION
                    ================================= */}

                    <div
                      style={{
                        marginTop: "11px",
                        fontSize: "12px",
                        color: "#64748b",
                        textAlign: "center",
                      }}
                    >
                      Click anywhere to
                      view ledger
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingCredit;