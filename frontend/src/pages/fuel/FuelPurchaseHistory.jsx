import {
  useEffect,
  useState,
} from "react";

import {
  NavLink,
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  Plus,
  RefreshCw,
  Fuel,
  Building2,
  CalendarDays,
  Receipt,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  getFuelPurchases,
} from "../../services/fuelService";

/* =====================================================
   FUEL PURCHASE HISTORY
===================================================== */

const FuelPurchaseHistory = () => {
  const [
    purchases,
    setPurchases,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /* ===================================================
     SUPPLIER HISTORY DROPDOWN
  =================================================== */

  const [
    openSupplierRowId,
    setOpenSupplierRowId,
  ] = useState(null);

  /* ===================================================
     LOAD PURCHASE HISTORY
  =================================================== */

  const loadPurchases =
    async () => {
      try {
        setLoading(true);

        const data =
          await getFuelPurchases();

        setPurchases(
          data?.purchases || []
        );
      } catch (error) {
        console.error(
          "LOAD PURCHASE HISTORY ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load fuel purchase history"
        );

        setPurchases([]);
      } finally {
        setLoading(false);
      }
    };

  /* ===================================================
     LOAD ON PAGE OPEN
  =================================================== */

  useEffect(() => {
    loadPurchases();
  }, []);

  /* ===================================================
     GET SUPPLIER NAME
  =================================================== */

  const getSupplierName = (
    purchase
  ) => {
    return String(
      purchase.supplierName ||
        purchase.supplier ||
        "-"
    ).trim();
  };

  /* ===================================================
     GET SUPPLIER HISTORY
  =================================================== */

  const getSupplierHistory = (
    supplierName
  ) => {
    const normalizedSupplier =
      String(
        supplierName || ""
      )
        .trim()
        .toLowerCase();

    return purchases
      .filter(
        (purchase) =>
          getSupplierName(
            purchase
          ).toLowerCase() ===
          normalizedSupplier
      )
      .sort(
        (a, b) => {
          const dateA =
            new Date(
              a.purchaseDate ||
                a.date ||
                a.createdAt ||
                0
            );

          const dateB =
            new Date(
              b.purchaseDate ||
                b.date ||
                b.createdAt ||
                0
            );

          return dateB - dateA;
        }
      );
  };

  /* ===================================================
     FORMAT CURRENCY
  =================================================== */

  const formatCurrency = (
    amount
  ) => {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }
    ).format(
      Number(amount || 0)
    );
  };

  /* ===================================================
     FORMAT NUMBER
  =================================================== */

  const formatNumber = (
    value
  ) => {
    return Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      }
    );
  };

  /* ===================================================
     FORMAT DATE
  =================================================== */

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "-";
    }

    const date =
      value.includes?.("T")
        ? new Date(value)
        : new Date(
            `${value}T00:00:00`
          );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /* ===================================================
     TOTALS
  =================================================== */

  const petrolPurchased =
    purchases
      .filter(
        (purchase) =>
          purchase.fuelType ===
          "petrol"
      )
      .reduce(
        (total, purchase) =>
          total +
          Number(
            purchase.quantity ||
              0
          ),
        0
      );

  const dieselPurchased =
    purchases
      .filter(
        (purchase) =>
          purchase.fuelType ===
          "diesel"
      )
      .reduce(
        (total, purchase) =>
          total +
          Number(
            purchase.quantity ||
              0
          ),
        0
      );

  const totalPurchaseAmount =
    purchases.reduce(
      (total, purchase) =>
        total +
        Number(
          purchase.totalAmount ||
            0
        ),
      0
    );

  /* ===================================================
     UI
  =================================================== */

  return (
    <div className="page-container">

      {/* ===============================================
          PAGE HEADER
      =============================================== */}

      <div className="page-header">

        <div>
          <h1>
            Fuel Purchase History
          </h1>

          <p>
            View petrol and diesel
            purchase records.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >

          <button
            type="button"
            className="secondary-button"
            onClick={
              loadPurchases
            }
            disabled={loading}
          >
            <RefreshCw
              size={17}
            />

            {loading
              ? "Loading..."
              : "Refresh"}
          </button>

          <NavLink
            to="/fuel/purchase"
            className="primary-button"
          >
            <Plus size={17} />

            Add Purchase
          </NavLink>

        </div>

      </div>

      {/* ===============================================
          SUMMARY CARDS
      =============================================== */}

      <div className="stats-grid">

        <div className="stat-card">

          <div
            className="stat-card-icon"
          >
            <Fuel size={22} />
          </div>

          <div>
            <h4>
              Petrol Purchased
            </h4>

            <h2>
              {formatNumber(
                petrolPurchased
              )}{" "}
              L
            </h2>
          </div>

        </div>

        <div className="stat-card">

          <div
            className="stat-card-icon"
          >
            <Fuel size={22} />
          </div>

          <div>
            <h4>
              Diesel Purchased
            </h4>

            <h2>
              {formatNumber(
                dieselPurchased
              )}{" "}
              L
            </h2>
          </div>

        </div>

        <div className="stat-card">

          <div
            className="stat-card-icon"
          >
            <Receipt
              size={22}
            />
          </div>

          <div>
            <h4>
              Purchase Amount
            </h4>

            <h2>
              {formatCurrency(
                totalPurchaseAmount
              )}
            </h2>
          </div>

        </div>

        <div className="stat-card">

          <div
            className="stat-card-icon"
          >
            <CalendarDays
              size={22}
            />
          </div>

          <div>
            <h4>
              Total Purchases
            </h4>

            <h2>
              {purchases.length}
            </h2>
          </div>

        </div>

      </div>

      {/* ===============================================
          PURCHASE TABLE
      =============================================== */}

      <div className="content-panel">

        <div
          className="content-panel-header"
        >

          <div>
            <h2>
              Purchase Records
            </h2>

            <p>
              All fuel purchase
              transactions.
            </p>
          </div>

        </div>

        {loading ? (

          <div
            style={{
              padding: "40px",
              textAlign: "center",
            }}
          >
            <p>
              Loading purchase
              history...
            </p>
          </div>

        ) : purchases.length ===
          0 ? (

          <div
            style={{
              padding: "50px 20px",
              textAlign: "center",
            }}
          >

            <Fuel
              size={40}
            />

            <h3
              style={{
                marginTop: "15px",
              }}
            >
              No Fuel Purchases
            </h3>

            <p>
              No petrol or diesel
              purchase has been
              recorded yet.
            </p>

            <NavLink
              to="/fuel/purchase"
              className="primary-button"
              style={{
                marginTop: "15px",
                display:
                  "inline-flex",
              }}
            >
              <Plus size={17} />

              Add First Purchase
            </NavLink>

          </div>

        ) : (

          <div className="table-container">

            <table>

              <thead>

                <tr>

                  <th>
                    Date
                  </th>

                  <th>
                    Fuel
                  </th>

                  <th>
                    Supplier
                  </th>

                  <th>
                    Quantity
                  </th>

                  <th>
                    Purchase Price
                  </th>

                  <th>
                    Total Amount
                  </th>

                  <th>
                    Invoice
                  </th>

                  <th>
                    Added By
                  </th>

                </tr>

              </thead>

              <tbody>

                {purchases.map(
                  (purchase) => {
                    const supplierName =
                      getSupplierName(
                        purchase
                      );

                    const isOpen =
                      openSupplierRowId ===
                      purchase._id;

                    const supplierHistory =
                      isOpen
                        ? getSupplierHistory(
                            supplierName
                          )
                        : [];

                    return (

                      <tr
                        key={
                          purchase._id
                        }
                      >

                        {/* DATE */}

                        <td>
                          {formatDate(
                            purchase.purchaseDate ||
                              purchase.date
                          )}
                        </td>

                        {/* FUEL */}

                        <td>

                          <span
                            className={`fuel-badge ${
                              purchase.fuelType ===
                              "petrol"
                                ? "petrol"
                                : "diesel"
                            }`}
                          >
                            {purchase.fuelType ===
                            "petrol"
                              ? "Petrol"
                              : "Diesel"}
                          </span>

                        </td>

                        {/* =================================
                            SUPPLIER + HISTORY DROPDOWN
                        ================================= */}

                        <td
                          style={{
                            position:
                              "relative",
                          }}
                        >

                          <button
                            type="button"
                            onClick={() =>
                              setOpenSupplierRowId(
                                isOpen
                                  ? null
                                  : purchase._id
                              )
                            }
                            style={{
                              border:
                                "none",

                              background:
                                "transparent",

                              padding: 0,

                              margin: 0,

                              cursor:
                                "pointer",

                              display:
                                "inline-flex",

                              alignItems:
                                "center",

                              gap:
                                "7px",

                              font:
                                "inherit",

                              color:
                                "inherit",

                              fontWeight:
                                "600",
                            }}
                          >

                            <Building2
                              size={15}
                            />

                            <span>
                              {
                                supplierName
                              }
                            </span>

                            {isOpen ? (
                              <ChevronUp
                                size={14}
                              />
                            ) : (
                              <ChevronDown
                                size={14}
                              />
                            )}

                          </button>

                          {/* ===============================
                              DROPDOWN
                          =============================== */}

                          {isOpen && (

                            <div
                              style={{
                                position:
                                  "absolute",

                                top:
                                  "calc(100% + 6px)",

                                left: 0,

                                zIndex:
                                  100,

                                width:
                                  "390px",

                                maxWidth:
                                  "90vw",

                                maxHeight:
                                  "320px",

                                overflowY:
                                  "auto",

                                background:
                                  "#ffffff",

                                border:
                                  "1px solid #e5e7eb",

                                borderRadius:
                                  "10px",

                                boxShadow:
                                  "0 12px 30px rgba(0, 0, 0, 0.14)",

                                padding:
                                  "12px",
                              }}
                            >

                              {/* HEADER */}

                              <div
                                style={{
                                  display:
                                    "flex",

                                  justifyContent:
                                    "space-between",

                                  alignItems:
                                    "center",

                                  gap:
                                    "10px",

                                  paddingBottom:
                                    "10px",

                                  marginBottom:
                                    "8px",

                                  borderBottom:
                                    "1px solid #e5e7eb",
                                }}
                              >

                                <div>

                                  <strong
                                    style={{
                                      display:
                                        "block",
                                    }}
                                  >
                                    {
                                      supplierName
                                    }
                                  </strong>

                                  <small
                                    style={{
                                      color:
                                        "#6b7280",
                                    }}
                                  >
                                    {
                                      supplierHistory.length
                                    }{" "}
                                    purchase
                                    {supplierHistory.length ===
                                    1
                                      ? ""
                                      : "s"}
                                  </small>

                                </div>

                                <Building2
                                  size={18}
                                />

                              </div>

                              {/* HISTORY */}

                              {supplierHistory.length >
                              0 ? (

                                supplierHistory.map(
                                  (
                                    history,
                                    index
                                  ) => (

                                    <div
                                      key={
                                        history._id ||
                                        index
                                      }
                                      style={{
                                        padding:
                                          "10px 4px",

                                        borderBottom:
                                          index ===
                                          supplierHistory.length -
                                            1
                                            ? "none"
                                            : "1px solid #f1f5f9",
                                      }}
                                    >

                                      <div
                                        style={{
                                          display:
                                            "flex",

                                          justifyContent:
                                            "space-between",

                                          alignItems:
                                            "center",

                                          gap:
                                            "12px",

                                          marginBottom:
                                            "6px",
                                        }}
                                      >

                                        <span
                                          className={`fuel-badge ${
                                            history.fuelType ===
                                            "petrol"
                                              ? "petrol"
                                              : "diesel"
                                          }`}
                                        >
                                          {history.fuelType ===
                                          "petrol"
                                            ? "Petrol"
                                            : "Diesel"}
                                        </span>

                                        <strong>
                                          {formatCurrency(
                                            history.totalAmount
                                          )}
                                        </strong>

                                      </div>

                                      <div
                                        style={{
                                          display:
                                            "grid",

                                          gridTemplateColumns:
                                            "1fr 1fr",

                                          gap:
                                            "4px 12px",

                                          fontSize:
                                            "13px",

                                          color:
                                            "#4b5563",
                                        }}
                                      >

                                        <span>
                                          Date:{" "}
                                          <strong>
                                            {formatDate(
                                              history.purchaseDate ||
                                                history.date
                                            )}
                                          </strong>
                                        </span>

                                        <span>
                                          Quantity:{" "}
                                          <strong>
                                            {formatNumber(
                                              history.quantity
                                            )}{" "}
                                            L
                                          </strong>
                                        </span>

                                        <span>
                                          Rate:{" "}
                                          <strong>
                                            {formatCurrency(
                                              history.purchasePrice
                                            )}
                                            /L
                                          </strong>
                                        </span>

                                        <span>
                                          Invoice:{" "}
                                          <strong>
                                            {history.invoiceNumber ||
                                              "-"}
                                          </strong>
                                        </span>

                                      </div>

                                    </div>

                                  )
                                )

                              ) : (

                                <div
                                  style={{
                                    padding:
                                      "16px",

                                    textAlign:
                                      "center",

                                    color:
                                      "#6b7280",
                                  }}
                                >
                                  No purchase
                                  history found.
                                </div>

                              )}

                            </div>

                          )}

                        </td>

                        {/* QUANTITY */}

                        <td>
                          <strong>
                            {formatNumber(
                              purchase.quantity
                            )}{" "}
                            L
                          </strong>
                        </td>

                        {/* PRICE */}

                        <td>
                          {formatCurrency(
                            purchase.purchasePrice
                          )}
                          /L
                        </td>

                        {/* TOTAL */}

                        <td>
                          <strong>
                            {formatCurrency(
                              purchase.totalAmount
                            )}
                          </strong>
                        </td>

                        {/* INVOICE */}

                        <td>
                          {purchase.invoiceNumber ||
                            "-"}
                        </td>

                        {/* CREATED BY */}

                        <td>
                          {purchase.createdBy
                            ?.name ||
                            "-"}
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

export default FuelPurchaseHistory;