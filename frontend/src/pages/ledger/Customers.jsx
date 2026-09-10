import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
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
import { exportLedgerPDF } from "../../utils/ledgerExport";

const Customers = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [totals, setTotals] = useState({
    totalCustomers: 0,
    totalCredit: 0,
    totalPaid: 0,
    totalPending: 0,
  });

  // =========================================================
  // LOAD CUSTOMERS
  // =========================================================
  const loadCustomers = async () => {
    try {
      setLoading(true);

      const data = await getLedgerCustomers();

      const customerList = data?.customers || [];

      setCustomers(customerList);

      setTotals({
        totalCustomers:
          data?.totalCustomers ?? customerList.length ?? 0,

        totalCredit:
          Number(data?.totalCredit ?? data?.totalPurchased ?? 0),

        totalPaid:
          Number(data?.totalPaid ?? 0),

        totalPending:
          Number(data?.totalPending ?? data?.totalCreditPending ?? 0),
      });
    } catch (error) {
      console.error("LOAD CUSTOMERS ERROR:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load customers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // =========================================================
  // SEARCH
  // =========================================================
  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return customers;

    return customers.filter((customer) => {
      return (
        String(customer?.name || "")
          .toLowerCase()
          .includes(value) ||
        String(customer?.phone || "")
          .toLowerCase()
          .includes(value) ||
        String(customer?.vehicleNumber || "")
          .toLowerCase()
          .includes(value) ||
        String(customer?.address || "")
          .toLowerCase()
          .includes(value)
      );
    });
  }, [customers, search]);

  // =========================================================
  // DELETE CUSTOMER
  // =========================================================
  const handleDelete = async (customer) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${customer?.name}"?`
    );

    if (!confirmed) return;

    try {
      await deleteLedgerCustomer(customer._id);

      toast.success("Customer deleted successfully");

      await loadCustomers();
    } catch (error) {
      console.error("DELETE CUSTOMER ERROR:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete customer"
      );
    }
  };

  // =========================================================
  // DOWNLOAD CUSTOMER LEDGER PDF
  // =========================================================
  const handleDownloadPDF = async (customer) => {
    try {
      const loadingToast = toast.loading("Preparing customer ledger PDF...");

      const historyResponse = await getCustomerLedgerHistory(
        customer._id
      );

      const pdfCustomer =
        historyResponse?.customer ||
        historyResponse?.data?.customer ||
        customer;

      const entries =
        historyResponse?.entries ||
        historyResponse?.transactions ||
        historyResponse?.data?.entries ||
        historyResponse?.data?.transactions ||
        [];

      const summary =
        historyResponse?.summary ||
        historyResponse?.data?.summary ||
        {};

      // -------------------------------------------------------
      // PUMP SETTINGS
      // -------------------------------------------------------
      let pumpSettings = {};

      try {
        const pumpResponse = await api.get("/settings/pump");

        pumpSettings =
          pumpResponse?.settings ||
          pumpResponse?.data?.settings ||
          pumpResponse?.data ||
          {};
      } catch (pumpError) {
        console.error("PUMP SETTINGS PDF ERROR:", pumpError);
      }

      const pump = {
        pumpName:
          pumpSettings?.pumpName ||
          pumpSettings?.name ||
          "Shivshambho",

        ownerName:
          pumpSettings?.ownerName ||
          "",

        companyName:
          pumpSettings?.companyName ||
          "",

        gstin:
          pumpSettings?.gstin ||
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
          "",

        phone:
          pumpSettings?.phone ||
          "",

        email:
          pumpSettings?.email ||
          "",
      };

      // -------------------------------------------------------
      // BILL DATE
      // -------------------------------------------------------
      const latestEntry =
        entries?.length > 0
          ? entries[entries.length - 1]
          : null;

      const billDate =
        pdfCustomer?.billDate ||
        pdfCustomer?.invoiceDate ||
        pdfCustomer?.createdAt ||
        latestEntry?.date ||
        latestEntry?.transactionDate ||
        latestEntry?.createdAt ||
        new Date();

      // -------------------------------------------------------
      // BILL NUMBER
      // -------------------------------------------------------
      const billNo =
        pdfCustomer?.billNo ||
        pdfCustomer?.billNumber ||
        pdfCustomer?.invoiceNo ||
        pdfCustomer?.invoiceNumber ||
        pdfCustomer?.ledgerNo ||
        pdfCustomer?.ledgerNumber ||
        (customer?._id
          ? `LED-${String(customer._id).slice(-6).toUpperCase()}`
          : `LED-${Date.now()}`);

      // -------------------------------------------------------
      // BILL FROM
      // -------------------------------------------------------
      const billFrom =
        pdfCustomer?.billFrom ||
        "";

      // -------------------------------------------------------
      // EXPORT PDF
      // -------------------------------------------------------
      exportLedgerPDF({
        customer: {
          ...pdfCustomer,

          entries,

          summary,

          totalAmount:
            summary?.totalPurchased ??
            summary?.totalPurchase ??
            summary?.totalAmount ??
            pdfCustomer?.totalAmount ??
            0,

          paidAmount:
            summary?.totalPaid ??
            summary?.paidAmount ??
            pdfCustomer?.paidAmount ??
            0,

          currentBalance:
            summary?.totalPending ??
            summary?.pendingAmount ??
            pdfCustomer?.currentBalance ??
            0,
        },

        pump,

        billNo,

        billDate,

        billFrom,
      });

      toast.update(loadingToast, {
        render: "Customer ledger PDF generated successfully",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });
    } catch (error) {
      console.error("CUSTOMER LEDGER PDF ERROR:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to generate customer ledger PDF"
      );
    }
  };

  // =========================================================
  // MONEY FORMAT
  // =========================================================
  const formatMoney = (value) => {
    const amount = Number(value || 0);

    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // =========================================================
  // STATUS
  // =========================================================
  const getStatus = (customer) => {
    const pending = Number(
      customer?.currentBalance ??
        customer?.pendingAmount ??
        customer?.totalPending ??
        0
    );

    return pending > 0 ? "Pending" : "Paid";
  };

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div
      style={{
        padding: "24px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 800,
              color: "#0f3d56",
            }}
          >
            Customer Ledger
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Manage customer credit, payments and ledger history
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/ledger/customer")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "none",
            borderRadius: "8px",
            padding: "11px 16px",
            background: "#0f3d56",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {/* =====================================================
          SEARCH + REFRESH
      ===================================================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <div style={{ flex: 1 }}>
          <ProfessionalSearch
            value={search}
            onChange={setSearch}
            placeholder="Search customer by name, phone, vehicle or address..."
          />
        </div>

        <button
          type="button"
          onClick={loadCustomers}
          disabled={loading}
          title="Refresh Customers"
          style={{
            width: "44px",
            height: "44px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw
            size={18}
            style={{
              animation: loading ? "spin 1s linear infinite" : "none",
            }}
          />
        </button>
      </div>

      {/* =====================================================
          STATS
      ===================================================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "22px",
        }}
      >
        <div
          style={{
            padding: "18px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            background: "#fff",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            TOTAL CUSTOMERS
          </div>

          <div
            style={{
              marginTop: "6px",
              fontSize: "24px",
              fontWeight: 800,
              color: "#0f3d56",
            }}
          >
            {totals.totalCustomers}
          </div>
        </div>

        <div
          style={{
            padding: "18px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            background: "#fff",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            TOTAL CREDIT
          </div>

          <div
            style={{
              marginTop: "6px",
              fontSize: "24px",
              fontWeight: 800,
              color: "#0f3d56",
            }}
          >
            {formatMoney(totals.totalCredit)}
          </div>
        </div>

        <div
          style={{
            padding: "18px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            background: "#fff",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            TOTAL PAID
          </div>

          <div
            style={{
              marginTop: "6px",
              fontSize: "24px",
              fontWeight: 800,
              color: "#15803d",
            }}
          >
            {formatMoney(totals.totalPaid)}
          </div>
        </div>

        <div
          style={{
            padding: "18px",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            background: "#fff",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            TOTAL PENDING
          </div>

          <div
            style={{
              marginTop: "6px",
              fontSize: "24px",
              fontWeight: 800,
              color: "#dc2626",
            }}
          >
            {formatMoney(totals.totalPending)}
          </div>
        </div>
      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "850px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#0f3d56",
                  color: "#fff",
                }}
              >
                <th
                  style={{
                    padding: "13px 14px",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  #
                </th>

                <th
                  style={{
                    padding: "13px 14px",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  Customer
                </th>

                <th
                  style={{
                    padding: "13px 14px",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  Vehicle
                </th>

                <th
                  style={{
                    padding: "13px 14px",
                    textAlign: "right",
                    fontSize: "13px",
                  }}
                >
                  Credit
                </th>

                <th
                  style={{
                    padding: "13px 14px",
                    textAlign: "right",
                    fontSize: "13px",
                  }}
                >
                  Paid
                </th>

                <th
                  style={{
                    padding: "13px 14px",
                    textAlign: "right",
                    fontSize: "13px",
                  }}
                >
                  Pending
                </th>

                <th
                  style={{
                    padding: "13px 14px",
                    textAlign: "center",
                    fontSize: "13px",
                  }}
                >
                  Status
                </th>

                <th
                  style={{
                    padding: "13px 14px",
                    textAlign: "center",
                    fontSize: "13px",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, index) => {
                  const credit = Number(
                    customer?.totalPurchased ??
                      customer?.totalCredit ??
                      customer?.creditAmount ??
                      customer?.totalAmount ??
                      0
                  );

                  const paid = Number(
                    customer?.totalPaid ??
                      customer?.paidAmount ??
                      0
                  );

                  const pending = Number(
                    customer?.currentBalance ??
                      customer?.pendingAmount ??
                      customer?.totalPending ??
                      Math.max(credit - paid, 0)
                  );

                  const status = getStatus(customer);

                  return (
                    <tr
                      key={customer._id}
                      style={{
                        borderTop: "1px solid #e2e8f0",
                      }}
                    >
                      <td
                        style={{
                          padding: "14px",
                          fontSize: "13px",
                          color: "#64748b",
                        }}
                      >
                        {index + 1}
                      </td>

                      {/* =================================================
                          CUSTOMER NAME
                          CLICKING NAME OPENS SAME LEDGER AS EYE BUTTON
                      ================================================= */}
                      <td
                        style={{
                          padding: "14px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/ledger/customer?id=${customer._id}`
                            )
                          }
                          title="Open Customer Ledger"
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            margin: 0,
                            cursor: "pointer",
                            textAlign: "left",
                            color: "#0f3d56",
                            fontWeight: 700,
                            fontSize: "14px",
                          }}
                        >
                          {customer.name}
                        </button>

                        {customer.phone && (
                          <div
                            style={{
                              marginTop: "3px",
                              color: "#64748b",
                              fontSize: "12px",
                            }}
                          >
                            {customer.phone}
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          fontSize: "13px",
                          color: "#334155",
                        }}
                      >
                        {customer.vehicleNumber || "-"}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          textAlign: "right",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {formatMoney(credit)}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          textAlign: "right",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#15803d",
                        }}
                      >
                        {formatMoney(paid)}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          textAlign: "right",
                          fontSize: "13px",
                          fontWeight: 700,
                          color:
                            pending > 0 ? "#dc2626" : "#15803d",
                        }}
                      >
                        {formatMoney(pending)}
                      </td>

                      <td
                        style={{
                          padding: "14px",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "5px 9px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background:
                              status === "Pending"
                                ? "#fee2e2"
                                : "#dcfce7",
                            color:
                              status === "Pending"
                                ? "#b91c1c"
                                : "#15803d",
                          }}
                        >
                          {status}
                        </span>
                      </td>

                      {/* =================================================
                          ACTIONS
                      ================================================= */}
                      <td
                        style={{
                          padding: "14px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          {/* VIEW */}
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/ledger/customer?id=${customer._id}`
                              )
                            }
                            title="View Customer Ledger"
                            style={{
                              width: "34px",
                              height: "34px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "7px",
                              background: "#fff",
                              color: "#0f3d56",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Eye size={16} />
                          </button>

                          {/* EDIT */}
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/ledger/customer?id=${customer._id}&edit=true`
                              )
                            }
                            title="Edit Customer"
                            style={{
                              width: "34px",
                              height: "34px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "7px",
                              background: "#fff",
                              color: "#0f3d56",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Pencil size={16} />
                          </button>

                          {/* PDF */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadPDF(customer)
                            }
                            title="Download Customer Ledger PDF"
                            style={{
                              width: "34px",
                              height: "34px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "7px",
                              background: "#fff",
                              color: "#0f3d56",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <FileText size={16} />
                          </button>

                          {/* DELETE */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(customer)
                            }
                            title="Delete Customer"
                            style={{
                              width: "34px",
                              height: "34px",
                              border: "1px solid #fecaca",
                              borderRadius: "7px",
                              background: "#fff",
                              color: "#dc2626",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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

          @media (max-width: 768px) {
            .customers-page {
              padding: 16px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Customers;