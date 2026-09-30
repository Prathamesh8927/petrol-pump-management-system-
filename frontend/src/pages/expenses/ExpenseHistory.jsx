import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Trash2,
  RefreshCw,
} from "lucide-react";

import {
  getExpenses,
  deleteExpense,
} from "../../services/expenseService";

const EMPTY_STATE = {
  expenses: [],
  totalExpense: 0,
};

const formatMoney = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0.00";
  }

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ExpenseHistory = () => {
  const [expenses, setExpenses] = useState(
    EMPTY_STATE.expenses
  );

  const [totalExpense, setTotalExpense] =
    useState(EMPTY_STATE.totalExpense);

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  const loadExpenses = useCallback(
    async ({ silent = false } = {}) => {
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;

      if (!silent && mountedRef.current) {
        setLoading(true);
      }

      try {
        const data = await getExpenses();

        if (!mountedRef.current) {
          return;
        }

        setExpenses(
          Array.isArray(data?.expenses)
            ? data.expenses
            : []
        );

        setTotalExpense(
          Number.isFinite(Number(data?.totalExpense))
            ? Number(data.totalExpense)
            : 0
        );
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        toast.error(
          error.response?.data?.message ||
            "Unable to load expenses"
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

  useEffect(() => {
    mountedRef.current = true;

    loadExpenses();

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible"
      ) {
        loadExpenses({ silent: true });
      }
    };

    const handleFocus = () => {
      loadExpenses({ silent: true });
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      mountedRef.current = false;

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadExpenses]);

  const handleDelete = async (id) => {
    if (!id || deletingId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this expense? It can be recovered during the configured recovery period."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      await deleteExpense(id);

      if (!mountedRef.current) {
        return;
      }

      toast.success(
        "Expense deleted and moved to recovery storage."
      );

      await loadExpenses();
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      toast.error(
        error.response?.data?.message ||
          "Unable to delete expense"
      );
    } finally {
      if (mountedRef.current) {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Expense History</h1>

          <p>
            General expenses and employee salary
            payments.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => loadExpenses()}
          disabled={loading}
          aria-label="Refresh expense history"
        >
          <RefreshCw
            size={16}
            className={loading ? "spin" : ""}
          />

          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Expenses</h4>

          <h2>{formatMoney(totalExpense)}</h2>
        </div>

        <div className="stat-card">
          <h4>Expense Records</h4>

          <h2>{expenses.length}</h2>
        </div>
      </div>

      <div className="content-panel">
        <div className="content-panel-header">
          <div>
            <h2>Expense Records</h2>

            <p>
              All expenses recorded for this pump.
            </p>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Employee</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Note</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="empty-table"
                  >
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="empty-table"
                  >
                    No expenses recorded.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td>
                      {formatDate(
                        expense.expenseDate
                      )}
                    </td>

                    <td>
                      <strong>
                        {expense.title || "-"}
                      </strong>
                    </td>

                    <td
                      style={{
                        textTransform:
                          "capitalize",
                      }}
                    >
                      {expense.category || "-"}
                    </td>

                    <td>
                      {expense.employeeId?.name ||
                        "-"}
                    </td>

                    <td
                      style={{
                        textTransform:
                          "uppercase",
                      }}
                    >
                      {expense.paymentMethod ||
                        "-"}
                    </td>

                    <td>
                      <strong>
                        {formatMoney(
                          expense.amount
                        )}
                      </strong>
                    </td>

                    <td>
                      {expense.note || "-"}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="action-delete"
                        title="Delete expense"
                        aria-label={`Delete ${
                          expense.title ||
                          "expense"
                        }`}
                        disabled={
                          deletingId ===
                          expense._id
                        }
                        onClick={() =>
                          handleDelete(
                            expense._id
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseHistory;