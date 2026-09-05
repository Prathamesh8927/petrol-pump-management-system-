import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

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

const Customers = () => {
  const navigate =
    useNavigate();

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
    totals,
    setTotals,
  ] = useState({
    purchased: 0,
    paid: 0,
    pending: 0,
  });

  /* =====================================================
     LOAD
  ===================================================== */

  const loadCustomers =
    async () => {
      try {
        setLoading(true);

        const data =
          await getLedgerCustomers();

        setCustomers(
          data?.customers ||
            []
        );

        setTotals({
          purchased:
            Number(
              data?.totalPurchased ||
                0
            ),

          paid:
            Number(
              data?.totalPaid ||
                0
            ),

          pending:
            Number(
              data?.totalPending ||
                0
            ),
        });
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load ledger customers"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadCustomers();
  }, []);

  /* =====================================================
     SEARCH
  ===================================================== */

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
          const searchable =
            [
              customer.name,
              customer.phone,
              customer.vehicleNumber,
              customer.address,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            value
          );
        }
      );
    }, [
      customers,
      search,
    ]);

  /* =====================================================
     DELETE
  ===================================================== */

  const handleDelete =
    async (
      customer
    ) => {
      const confirmed =
        window.confirm(
          `Remove ${customer.name} from active ledger customers?`
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteLedgerCustomer(
          customer._id
        );

        toast.success(
          "Customer removed successfully"
        );

        loadCustomers();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to remove customer"
        );
      }
    };

  /* =====================================================
     PDF
  ===================================================== */

  const handleDownloadPDF =
    async (
      customer
    ) => {
      try {
        toast.loading(
          "Preparing customer ledger PDF...",
          {
            id: "ledger-pdf",
          }
        );

        /* ================================================
           GET CUSTOMER LEDGER HISTORY
        ================================================ */

        const data =
          await getCustomerLedgerHistory(
            customer._id
          );

        const pdfCustomer =
          data?.customer ||
          customer;

        const pdfEntries =
          data?.entries ||
          [];

        const pdfSummary =
          data?.summary ||
          {
            totalPurchased:
              Number(
                customer.totalPurchased ||
                  0
              ),

            totalPaid:
              Number(
                customer.totalPaid ||
                  0
              ),

            totalPending:
              Number(
                customer.totalPending ||
                  0
              ),

            purchaseCount:
              Number(
                customer.purchaseCount ||
                  0
              ),
          };

        /* ================================================
           GET ACTUAL PUMP SETTINGS

           The actual pump information comes from:
           GET /api/settings/pump
        ================================================ */

        const pumpResponse =
          await api.get(
            "/settings/pump"
          );

        /* ================================================
           SUPPORT DIFFERENT RESPONSE STRUCTURES
        ================================================ */

        const pumpData =
          pumpResponse?.data?.pump ||
          pumpResponse?.data?.settings ||
          pumpResponse?.data?.data ||
          pumpResponse?.data ||
          {};

        /* ================================================
           ACTUAL PUMP INFORMATION

           IMPORTANT:
           Pump ID / Dealer Code / MongoDB ID
           are intentionally NOT included.
        ================================================ */

        const pump = {
          pumpName:
            pumpData?.pumpName ||
            pumpData?.name ||
            pumpData?.pump?.pumpName ||
            "Petrol Pump",

          ownerName:
            pumpData?.ownerName ||
            pumpData?.owner ||
            pumpData?.pump?.ownerName ||
            "Pump Owner",

          companyName:
            pumpData?.companyName ||
            "",

          gstin:
            pumpData?.gstin ||
            "",

          address:
            pumpData?.address ||
            "",

          city:
            pumpData?.city ||
            "",

          state:
            pumpData?.state ||
            "",

          pincode:
            pumpData?.pincode ||
            "",

          phone:
            pumpData?.phone ||
            "",

          email:
            pumpData?.email ||
            "",
        };

        /* ================================================
           SAFETY CHECK
        ================================================ */

        if (
          !pump.pumpName ||
          pump.pumpName ===
            "Petrol Pump"
        ) {
          console.warn(
            "Actual pump name was not found in settings response.",
            pumpData
          );
        }

        if (
          !pump.ownerName ||
          pump.ownerName ===
            "Pump Owner"
        ) {
          console.warn(
            "Actual owner name was not found in settings response.",
            pumpData
          );
        }

        /* ================================================
           EXPORT PDF
        ================================================ */

        exportLedgerPDF({
          customer: {
            ...pdfCustomer,

            entries:
              pdfEntries,

            summary:
              pdfSummary,

            totalAmount:
              Number(
                pdfSummary?.totalPurchased ||
                  0
              ),

            paidAmount:
              Number(
                pdfSummary?.totalPaid ||
                  0
              ),

            currentBalance:
              Number(
                pdfSummary?.totalPending ||
                  0
              ),
          },

          pump,
        });

        toast.success(
          "Customer ledger PDF downloaded",
          {
            id: "ledger-pdf",
          }
        );

      } catch (error) {
        console.error(
          "Customer ledger PDF error:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to generate PDF",
          {
            id: "ledger-pdf",
          }
        );
      }
    };

  /* =====================================================
     MONEY
  ===================================================== */

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

  /* =====================================================
     STATUS
  ===================================================== */

  const getStatus =
    (customer) => {
      const pending =
        Number(
          customer.totalPending ||
            customer.currentBalance ||
            0
        );

      const paid =
        Number(
          customer.totalPaid ||
            0
        );

      if (pending <= 0) {
        return "Paid";
      }

      if (paid > 0) {
        return "Partially Paid";
      }

      return "Pending";
    };

  return (
    <div className="page-container">

      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>
            Customer Ledger
          </h1>

          <p>
            Manage customer purchases,
            payments and pending
            balances.
          </p>

        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() =>
            navigate(
              "/ledger/customer"
            )
          }
        >
          <Plus size={17} />

          Add Customer
        </button>

      </div>

      {/* SUMMARY */}

      <div className="stats-grid">

        <div className="stat-card">

          <h4>
            Customers
          </h4>

          <h2>
            {customers.length}
          </h2>

        </div>

        <div className="stat-card">

          <h4>
            Total Purchased
          </h4>

          <h2>
            ₹{" "}
            {money(
              totals.purchased
            )}
          </h2>

        </div>

        <div className="stat-card">

          <h4>
            Total Paid
          </h4>

          <h2>
            ₹{" "}
            {money(
              totals.paid
            )}
          </h2>

        </div>

        <div className="stat-card">

          <h4>
            Total Pending
          </h4>

          <h2>
            ₹{" "}
            {money(
              totals.pending
            )}
          </h2>

        </div>

      </div>

      {/* TABLE */}

      <div className="content-panel">

        <div className="content-panel-header">

          <div>

            <h2>
              Ledger Customers
            </h2>

            <p>
              Search by name, phone,
              vehicle or address.
            </p>

          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems:
                "center",
            }}
          >

            <div className="table-search-wrapper">

              <ProfessionalSearch
                value={search}
                onChange={
                  setSearch
                }
                placeholder="Search customers..."
                onClear={() =>
                  setSearch("")
                }
              />

            </div>

            <button
              type="button"
              className="secondary-button"
              title="Refresh"
              onClick={
                loadCustomers
              }
            >
              <RefreshCw
                size={17}
              />
            </button>

          </div>

        </div>

        <div className="table-container">

          <table>

            <thead>

              <tr>

                <th>#</th>

                <th>
                  Name
                </th>

                <th>
                  Vehicle
                </th>

                <th>
                  Purchases
                </th>

                <th>
                  Total Purchase
                </th>

                <th>
                  Total Paid
                </th>

                <th>
                  Pending
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>

                  <td
                    colSpan="9"
                    className="empty-table"
                  >
                    Loading ledger...
                  </td>

                </tr>

              ) : filteredCustomers
                  .length ===
                0 ? (

                <tr>

                  <td
                    colSpan="9"
                    className="empty-table"
                  >
                    No matching customers found.
                  </td>

                </tr>

              ) : (

                filteredCustomers.map(
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

                        <strong>
                          {customer.name}
                        </strong>

                        {customer.phone && (

                          <div
                            style={{
                              marginTop:
                                "3px",

                              color:
                                "#64748b",

                              fontSize:
                                "12px",
                            }}
                          >
                            {customer.phone}
                          </div>

                        )}

                      </td>

                      <td>
                        {customer.vehicleNumber ||
                          "-"}
                      </td>

                      <td>
                        {Number(
                          customer.purchaseCount ||
                            0
                        )}
                      </td>

                      <td>
                        ₹{" "}
                        {money(
                          customer.totalPurchased
                        )}
                      </td>

                      <td>
                        ₹{" "}
                        {money(
                          customer.totalPaid
                        )}
                      </td>

                      <td>

                        <strong
                          style={{
                            color:
                              Number(
                                customer.totalPending ||
                                  0
                              ) > 0
                                ? "#dc2626"
                                : "#16a34a",
                          }}
                        >
                          ₹{" "}
                          {money(
                            customer.totalPending
                          )}
                        </strong>

                      </td>

                      <td>
                        {getStatus(
                          customer
                        )}
                      </td>

                      <td>

                        <div className="row-actions">

                          <button
                            type="button"
                            className="action-view"
                            title="View Ledger"
                            onClick={() =>
                              navigate(
                                `/ledger/customer?id=${customer._id}`
                              )
                            }
                          >
                            <Eye
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            className="action-edit"
                            title="Edit Customer"
                            onClick={() =>
                              navigate(
                                `/ledger/customer?id=${customer._id}&edit=true`
                              )
                            }
                          >
                            <Pencil
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            className="action-view"
                            title="Download PDF"
                            onClick={() =>
                              handleDownloadPDF(
                                customer
                              )
                            }
                          >
                            <FileText
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            className="action-delete"
                            title="Remove Customer"
                            onClick={() =>
                              handleDelete(
                                customer
                              )
                            }
                          >
                            <Trash2
                              size={16}
                            />
                          </button>

                        </div>

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

export default Customers;