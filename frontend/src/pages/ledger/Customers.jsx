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
     RESOLVE PROFILE LOGO
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

    return resolved ? resolved.trim() : null;
  };

  /* =========================================================
     LOAD CUSTOMERS
  ========================================================= */

  const loadCustomers = async () => {
    try {
      setLoading(true);

      const data = await getLedgerCustomers();

      const customerList = data?.customers || [];

      setCustomers(customerList);

      setTotals({
        totalCustomers:
          data?.totalCustomers ??
          customerList.length ??
          0,

        totalCredit: Number(
          data?.totalCredit ??
            data?.totalPurchased ??
            0
        ),

        totalPaid: Number(
          data?.totalPaid ?? 0
        ),

        totalPending: Number(
          data?.totalPending ??
            data?.totalCreditPending ??
            0
        ),
      });
    } catch (error) {
      console.error(
        "LOAD CUSTOMERS ERROR:",
        error
      );

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

  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredCustomers = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        String(customer?.name || "")
          .toLowerCase()
          .includes(value) ||

        String(customer?.phone || "")
          .toLowerCase()
          .includes(value) ||

        String(
          customer?.vehicleNumber || ""
        )
          .toLowerCase()
          .includes(value) ||

        String(customer?.address || "")
          .toLowerCase()
          .includes(value)
      );
    });
  }, [customers, search]);

  /* =========================================================
     OPEN CUSTOMER LEDGER
     
     Clicking anywhere on the customer row uses
     exactly the same route as the View/Eye button.
  ========================================================= */

  const handleCustomerRowClick = (customer) => {
    if (!customer?._id) {
      return;
    }

    navigate(
      `/ledger/customer?id=${customer._id}`
    );
  };

  /* =========================================================
     DELETE CUSTOMER
  ========================================================= */

  const handleDelete = async (customer) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${customer?.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteLedgerCustomer(
        customer._id
      );

      toast.success(
        "Customer deleted successfully"
      );

      await loadCustomers();
    } catch (error) {
      console.error(
        "DELETE CUSTOMER ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete customer"
      );
    }
  };

  /* =========================================================
     DOWNLOAD CUSTOMER LEDGER PDF
  ========================================================= */

  const handleDownloadPDF = async (
    customer
  ) => {
    let loadingToast = null;

    try {
      loadingToast = toast.loading(
        "Preparing customer ledger PDF..."
      );

      const historyResponse =
        await getCustomerLedgerHistory(
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

      /* -------------------------------------------------------
         LOAD PUMP PROFILE
      ------------------------------------------------------- */

      let pumpSettings = {};

      try {
        const pumpResponse =
          await api.get("/settings/pump");

        pumpSettings =
          pumpResponse?.settings ||
          pumpResponse?.data?.settings ||
          pumpResponse?.data ||
          {};
      } catch (pumpError) {
        console.error(
          "PUMP SETTINGS PDF ERROR:",
          pumpError
        );
      }

      /* -------------------------------------------------------
         PROFILE LOGO
      ------------------------------------------------------- */

      const logoUrl =
        resolveLogoUrl(pumpSettings);

      /* -------------------------------------------------------
         NORMALIZED PUMP PROFILE
      ------------------------------------------------------- */

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
          pumpSettings?.oilCompanyName ||
          pumpSettings?.oilCompany ||
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
          pumpSettings?.mobileNumber ||
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

      /* -------------------------------------------------------
         BILL DATE
      ------------------------------------------------------- */

      const latestEntry =
        entries?.length > 0
          ? entries[
              entries.length - 1
            ]
          : null;

      const billDate =
        pdfCustomer?.billDate ||
        pdfCustomer?.invoiceDate ||
        pdfCustomer?.createdAt ||
        latestEntry?.date ||
        latestEntry?.transactionDate ||
        latestEntry?.createdAt ||
        new Date();

      /* -------------------------------------------------------
         BILL NUMBER
      ------------------------------------------------------- */

      const billNo =
        pdfCustomer?.billNo ||
        pdfCustomer?.billNumber ||
        pdfCustomer?.invoiceNo ||
        pdfCustomer?.invoiceNumber ||
        pdfCustomer?.ledgerNo ||
        pdfCustomer?.ledgerNumber ||
        (customer?._id
          ? `LED-${String(
              customer._id
            )
              .slice(-6)
              .toUpperCase()}`
          : `LED-${Date.now()}`);

      /* -------------------------------------------------------
         BILL FROM
      ------------------------------------------------------- */

      const billFrom =
        pdfCustomer?.billFrom ||
        "";

      /* -------------------------------------------------------
         EXPORT PDF
      ------------------------------------------------------- */

      await exportLedgerPDF({
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

        logoUrl:
          logoUrl || null,
      });

      if (loadingToast) {
        toast.update(
          loadingToast,
          {
            render:
              "Customer ledger PDF generated successfully",

            type: "success",

            isLoading: false,

            autoClose: 2500,
          }
        );
      }
    } catch (error) {
      console.error(
        "CUSTOMER LEDGER PDF ERROR:",
        error
      );

      if (loadingToast) {
        toast.update(
          loadingToast,
          {
            render:
              error?.response?.data?.message ||
              error?.message ||
              "Failed to generate customer ledger PDF",

            type: "error",

            isLoading: false,

            autoClose: 3000,
          }
        );
      } else {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to generate customer ledger PDF"
        );
      }
    }
  };

  /* =========================================================
     MONEY FORMAT
  ========================================================= */

  const formatMoney = (value) => {
    const amount = Number(value || 0);

    return `₹${amount.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  /* =========================================================
     STATUS
  ========================================================= */

  const getStatus = (customer) => {
    const pending = Number(
      customer?.currentBalance ??
        customer?.pendingAmount ??
        customer?.totalPending ??
        0
    );

    return pending > 0
      ? "Pending"
      : "Paid";
  };

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

            borderRadius:
              "9px",

            padding:
              "0 20px",

            background:
              COLORS.primary,

            color:
              COLORS.white,

            fontSize:
              "16px",

            fontWeight:
              700,

            cursor:
              "pointer",

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
          onClick={
            loadCustomers
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

            borderRadius:
              "9px",

            background:
              COLORS.white,

            color:
              COLORS.text,

            display:
              "flex",

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
            {totals.totalCustomers}
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
                  Pending
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
                      "110px",
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
                    const credit =
                      Number(
                        customer?.totalPurchased ??
                          customer?.totalCredit ??
                          customer?.creditAmount ??
                          customer?.totalAmount ??
                          0
                      );

                    const paid =
                      Number(
                        customer?.totalPaid ??
                          customer?.paidAmount ??
                          0
                      );

                    const pending =
                      Number(
                        customer?.currentBalance ??
                          customer?.pendingAmount ??
                          customer?.totalPending ??
                          Math.max(
                            credit -
                              paid,
                            0
                          )
                      );

                    const status =
                      getStatus(
                        customer
                      );

                    return (
                      <tr
                        key={
                          customer._id
                        }

                        /* =================================================
                           ENTIRE ROW IS CLICKABLE
                        ================================================= */
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
                        {/* =================================================
                            NUMBER
                        ================================================= */}

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

                        {/* =================================================
                            CUSTOMER
                        ================================================= */}

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
                            {customer.name}
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

                        {/* =================================================
                            VEHICLE
                        ================================================= */}

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

                        {/* =================================================
                            CREDIT
                        ================================================= */}

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

                        {/* =================================================
                            PAID
                        ================================================= */}

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

                        {/* =================================================
                            PENDING
                        ================================================= */}

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
                              pending > 0
                                ? COLORS.danger
                                : COLORS.success,

                            verticalAlign:
                              "middle",
                          }}
                        >
                          {formatMoney(
                            pending
                          )}
                        </td>

                        {/* =================================================
                            STATUS
                        ================================================= */}

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
                                "66px",

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
                                  : COLORS.successBackground,

                              color:
                                status ===
                                "Pending"
                                  ? COLORS.dangerDark
                                  : COLORS.success,
                            }}
                          >
                            {status}
                          </span>
                        </td>

                        {/* =================================================
                            ACTIONS

                            IMPORTANT:
                            Stop row click propagation so these buttons
                            perform only their own action.
                        ================================================= */}

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
                            {/* =================================================
                                VIEW
                            ================================================= */}

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
                                size={
                                  17
                                }
                              />
                            </button>

                            {/* =================================================
                                EDIT
                            ================================================= */}

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/ledger/customer?id=${customer._id}&edit=true`
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
                                size={
                                  17
                                }
                              />
                            </button>

                            {/* =================================================
                                PDF
                            ================================================= */}

                            <button
                              type="button"
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
                              <FileText
                                size={
                                  17
                                }
                              />
                            </button>

                            {/* =================================================
                                DELETE
                            ================================================= */}

                            <button
                              type="button"
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
                                  "pointer",

                                transition:
                                  "all 0.15s ease",
                              }}

                              onMouseEnter={(
                                e
                              ) => {
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
                              <Trash2
                                size={
                                  17
                                }
                              />
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
          }

          @media (max-width: 768px) {
            .customers-page {
              padding: 16px !important;
            }
          }

          @media (max-width: 600px) {
            .customers-page {
              padding: 12px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Customers;