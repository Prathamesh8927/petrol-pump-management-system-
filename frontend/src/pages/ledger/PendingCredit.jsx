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
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
        const data = await getPendingCredit();

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

  useEffect(() => {
    loadPending();

    const handleVisibility = () => {
      if (
        document.visibilityState === "visible"
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

  return (
    <div className="page-container">
      {/* ================= HEADER ================= */}

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

      {/* ================= STATS ================= */}

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

      {/* ================= TABLE ================= */}

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
              Click anywhere on a customer row
              to open their ledger.
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
              All customer balances are cleared.
            </p>
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "760px",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom:
                      "1px solid #e2e8f0",
                  }}
                >
                  <th
                    style={{
                      padding: "13px 14px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    #
                  </th>

                  <th
                    style={{
                      padding: "13px 14px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Customer
                  </th>

                  <th
                    style={{
                      padding: "13px 14px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Phone
                  </th>

                  <th
                    style={{
                      padding: "13px 14px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Vehicle
                  </th>

                  <th
                    style={{
                      padding: "13px 14px",
                      textAlign: "right",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Outstanding
                  </th>

                  <th
                    style={{
                      padding: "13px 14px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Status
                  </th>

                  <th
                    style={{
                      padding: "13px 14px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {customers.map(
                  (customer, index) => {
                    const pending = Number(
                      customer?.currentBalance ??
                        customer?.totalPending ??
                        0
                    );

                    const customerId =
                      customer?._id;

                    return (
                      <tr
                        key={customerId || index}
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
                          borderBottom:
                            "1px solid #e2e8f0",
                          cursor: customerId
                            ? "pointer"
                            : "default",
                          transition:
                            "background 0.15s ease",
                        }}
                        onMouseEnter={(
                          event
                        ) => {
                          if (!customerId) {
                            return;
                          }

                          event.currentTarget.style.background =
                            "#f8fafc";
                        }}
                        onMouseLeave={(
                          event
                        ) => {
                          event.currentTarget.style.background =
                            "transparent";
                        }}
                      >
                        {/* NUMBER */}

                        <td
                          style={{
                            padding: "14px",
                            fontSize: "13px",
                            color: "#64748b",
                          }}
                        >
                          {index + 1}
                        </td>

                        {/* CUSTOMER */}

                        <td
                          style={{
                            padding: "14px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: "10px",
                              minWidth: "180px",
                            }}
                          >
                            <div
                              style={{
                                width: "38px",
                                height: "38px",
                                minWidth: "38px",
                                borderRadius:
                                  "50%",
                                display: "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                background:
                                  "#eff6ff",
                                color: "#2563eb",
                                fontSize:
                                  "14px",
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
                                    "14px",
                                  fontWeight: 700,
                                  color:
                                    "#0f172a",
                                  whiteSpace:
                                    "nowrap",
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                  maxWidth:
                                    "180px",
                                }}
                              >
                                {customer?.name ||
                                  "Unknown Customer"}
                              </div>

                              
                            </div>
                          </div>
                        </td>

                        {/* PHONE */}

                        <td
                          style={{
                            padding: "14px",
                            fontSize: "13px",
                            color: "#334155",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {customer?.phone || "-"}
                        </td>

                        {/* VEHICLE */}

                        <td
                          style={{
                            padding: "14px",
                            fontSize: "13px",
                            color: "#334155",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {customer?.vehicleNumber ||
                            "-"}
                        </td>

                        {/* OUTSTANDING */}

                        <td
                          style={{
                            padding: "14px",
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "15px",
                              fontWeight: 800,
                              color: "#dc2626",
                            }}
                          >
                            ₹ {money(pending)}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td
                          style={{
                            padding: "14px",
                            textAlign: "center",
                          }}
                        >
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "5px 10px",
                              borderRadius:
                                "999px",
                              background:
                                "#fef2f2",
                              color: "#dc2626",
                              fontSize:
                                "10px",
                              fontWeight: 700,
                              letterSpacing:
                                "0.3px",
                            }}
                          >
                            PENDING
                          </span>
                        </td>

                        {/* ACTION */}

                        <td
                          style={{
                            padding: "14px",
                            textAlign: "center",
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
                              width: "32px",
                              height: "32px",
                              borderRadius:
                                "8px",
                              background:
                                "#eff6ff",
                              color: "#2563eb",
                              fontSize:
                                "18px",
                              fontWeight: 700,
                            }}
                          >
                            →
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingCredit;