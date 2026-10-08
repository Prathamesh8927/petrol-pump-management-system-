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

  useEffect(() => {
    loadPending();

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadPending({ silent: true });
      }
    };

    const handleFocus = () => {
      loadPending({ silent: true });
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

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Pending Customers</h4>

          <h2>{customers.length}</h2>
        </div>

        <div className="stat-card">
          <h4>Total Pending</h4>

          <h2>
            ₹ {money(totalPending)}
          </h2>
        </div>
      </div>

      <div className="content-panel">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>Pending</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="empty-table"
                  >
                    Loading...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="empty-table"
                  >
                    No pending credit.
                  </td>
                </tr>
              ) : (
                customers.map(
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
                      <tr
                        key={customerId}
                        onClick={() =>
                          openCustomerLedger(
                            customerId
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key ===
                              "Enter" ||
                            event.key ===
                              " "
                          ) {
                            event.preventDefault();

                            openCustomerLedger(
                              customerId
                            );
                          }
                        }}
                        tabIndex={
                          customerId
                            ? 0
                            : -1
                        }
                        role="link"
                        style={{
                          cursor: customerId
                            ? "pointer"
                            : "default",
                        }}
                      >
                        <td>
                          {index + 1}
                        </td>

                        <td>
                          {customer.name ||
                            "-"}
                        </td>

                        <td>
                          {customer.phone ||
                            "-"}
                        </td>

                        <td>
                          {customer.vehicleNumber ||
                            "-"}
                        </td>

                        <td>
                          <strong
                            style={{
                              color:
                                "#dc2626",
                            }}
                          >
                            ₹{" "}
                            {money(
                              pending
                            )}
                          </strong>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="action-view"
                            onClick={(event) => {
                              event.stopPropagation();

                              openCustomerLedger(
                                customerId
                              );
                            }}
                          >
                            View Ledger
                          </button>
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

export default PendingCredit;