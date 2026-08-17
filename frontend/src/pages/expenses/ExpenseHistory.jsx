import {
  useEffect,
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

const ExpenseHistory = () => {
  const [
    expenses,
    setExpenses,
  ] = useState([]);

  const [
    totalExpense,
    setTotalExpense,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const loadExpenses =
    async () => {
      try {
        setLoading(true);

        const data =
          await getExpenses();

        setExpenses(
          data.expenses ||
            []
        );

        setTotalExpense(
          data.totalExpense ||
            0
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load expenses"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleDelete =
    async (id) => {
      if (
        !window.confirm(
          "Delete this expense?"
        )
      ) {
        return;
      }

      try {
        await deleteExpense(
          id
        );

        toast.success(
          "Expense deleted"
        );

        await loadExpenses();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to delete expense"
        );
      }
    };

  return (
    <div className="page-container">

      <div className="page-header">

        <div>
          <h1>
            Expense History
          </h1>

          <p>
            General expenses and
            employee salary payments.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={
            loadExpenses
          }
        >
          <RefreshCw
            size={16}
          />

          Refresh
        </button>

      </div>

      <div className="stats-grid">

        <div className="stat-card">

          <h4>
            Total Expenses
          </h4>

          <h2>
            ₹
            {Number(
              totalExpense
            ).toLocaleString(
              "en-IN",
              {
                minimumFractionDigits:
                  2,
              }
            )}
          </h2>

        </div>

        <div className="stat-card">

          <h4>
            Expense Records
          </h4>

          <h2>
            {expenses.length}
          </h2>

        </div>

      </div>

      <div className="content-panel">

        <div className="content-panel-header">
          <h2>
            Expense Records
          </h2>
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
                    Loading...
                  </td>
                </tr>

              ) : expenses.length ===
                0 ? (

                <tr>
                  <td
                    colSpan="8"
                    className="empty-table"
                  >
                    No expenses
                    recorded.
                  </td>
                </tr>

              ) : (

                expenses.map(
                  (expense) => (

                    <tr
                      key={
                        expense._id
                      }
                    >

                      <td>
                        {
                          expense.expenseDate
                        }
                      </td>

                      <td>
                        {
                          expense.title
                        }
                      </td>

                      <td
                        style={{
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {
                          expense.category
                        }
                      </td>

                      <td>
                        {expense.employeeId
                          ?.name ||
                          "-"}
                      </td>

                      <td
                        style={{
                          textTransform:
                            "uppercase",
                        }}
                      >
                        {
                          expense.paymentMethod
                        }
                      </td>

                      <td>
                        <strong>
                          ₹
                          {Number(
                            expense.amount ||
                              0
                          ).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits:
                                2,
                            }
                          )}
                        </strong>
                      </td>

                      <td>
                        {expense.note ||
                          "-"}
                      </td>

                      <td>

                        <button
                          type="button"
                          className="action-delete"
                          onClick={() =>
                            handleDelete(
                              expense._id
                            )
                          }
                        >
                          <Trash2
                            size={16}
                          />
                        </button>

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
};

export default ExpenseHistory;