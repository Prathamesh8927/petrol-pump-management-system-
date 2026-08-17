import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  getPendingCredit,
} from "../../services/ledgerService";

const PendingCredit = () => {
  const navigate =
    useNavigate();

  const [
    customers,
    setCustomers,
  ] = useState([]);

  const [
    totalPending,
    setTotalPending,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const money = (
    value
  ) =>
    Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          2,
        maximumFractionDigits:
          2,
      }
    );

  const loadPending =
    async () => {
      try {
        setLoading(true);

        const data =
          await getPendingCredit();

        setCustomers(
          data.customers ||
            []
        );

        setTotalPending(
          Number(
            data.totalPending ||
              0
          )
        );
      } catch (error) {
        toast.error(
          "Unable to load pending credit"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadPending();
  }, []);

  return (
    <div className="page-container">

      <div className="page-header">

        <div>

          <h1>
            Pending Credit
          </h1>

          <p>
            Customers with outstanding
            ledger balance.
          </p>

        </div>

      </div>

      <div className="stats-grid">

        <div className="stat-card">

          <h4>
            Pending Customers
          </h4>

          <h2>
            {customers.length}
          </h2>

        </div>

        <div className="stat-card">

          <h4>
            Total Pending
          </h4>

          <h2>
            ₹{" "}
            {money(
              totalPending
            )}
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

              ) : customers.length ===
                0 ? (

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
                  (
                    customer,
                    index
                  ) => (

                    <tr
                      key={
                        customer._id
                      }
                    >

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        {
                          customer.name
                        }
                      </td>

                      <td>
                        {
                          customer.phone ||
                          "-"
                        }
                      </td>

                      <td>
                        {
                          customer.vehicleNumber ||
                          "-"
                        }
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
                            customer.currentBalance
                          )}
                        </strong>

                      </td>

                      <td>

                        <button
                          type="button"
                          className="action-view"
                          onClick={() =>
                            navigate(
                              `/ledger/customer?id=${customer._id}`
                            )
                          }
                        >
                          View Ledger
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

export default PendingCredit;