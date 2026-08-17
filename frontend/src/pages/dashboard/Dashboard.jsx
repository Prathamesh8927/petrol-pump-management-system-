import {
  useContext,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Fuel,
  IndianRupee,
  Receipt,
  Users,
  Gauge,
  WalletCards,
  Droplets,
  Building2,
  X,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

import {
  AuthContext,
} from "../../context/AuthContext";

import {
  getDashboardSummary,
} from "../../services/dashboardService";

import {
  getPumpSettings,
} from "../../services/settingsService";

/* =====================================================
   DASHBOARD
===================================================== */

const Dashboard = () => {
  const {
    user,
  } = useContext(
    AuthContext
  );

  const navigate =
    useNavigate();

  /* =====================================================
     DASHBOARD SUMMARY
  ===================================================== */

  const [
    summary,
    setSummary,
  ] = useState({
    todaySales: 0,

    creditSales: 0,

    cashSales: 0,
    upiSales: 0,
    cardSales: 0,

    totalExpenses: 0,

    pendingCredit: 0,

    petrolStock: 0,
    dieselStock: 0,
    totalFuelStock: 0,

    petrolSold: 0,
    dieselSold: 0,
    totalFuelSold: 0,

    netCollection: 0,

    saleCount: 0,
  });

  const [
    dashboardLoading,
    setDashboardLoading,
  ] = useState(true);

  /* =====================================================
     SETTINGS
  ===================================================== */

const [
    pumpSettings,
    setPumpSettings,
  ] = useState({
    pumpName: "",
    ownerName: "",

    phone: "",
    email: "",

    companyName: "",
    dealerCode: "",
    gstin: "",

    address: "",
    city: "",
    state: "",
    pincode: "",

    lowStockAlert: 1000,

    enableLowStockAlert:
      true,
  });

  const [
    settingsLoading,
    setSettingsLoading,
  ] = useState(true);

  /* =====================================================
     PUMP INFO MODAL
  ===================================================== */

  const [
    showPumpInfo,
    setShowPumpInfo,
  ] = useState(false);

  /* =====================================================
     LOCAL DATE

     Avoid UTC date shifting.
  ===================================================== */

  const getToday = () => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2  ,
        "0"
      );

    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;
  };

  /* =====================================================
     RESET SUMMARY
  ===================================================== */

  const emptySummary = {
    todaySales: 0,

    creditSales: 0,

    cashSales: 0,
    upiSales: 0,
    cardSales: 0,

    totalExpenses: 0,

    pendingCredit: 0,

    petrolStock: 0,
    dieselStock: 0,
    totalFuelStock: 0,

    petrolSold: 0,
    dieselSold: 0,
    totalFuelSold: 0,

    netCollection: 0,

    saleCount: 0,
  };

  /* =====================================================
     LOAD DASHBOARD
  ===================================================== */

  const loadDashboardSummary =
    async () => {
      try {
        setDashboardLoading(
          true
        );

        const today =
          getToday();

        const data =
          await getDashboardSummary(
            today
          );

        console.log(
          "DASHBOARD RESPONSE:",
          data
        );

        const dashboardData =
          data?.summary ||
          {};

        /*
          Primary fields correspond
          to finalized backend.

          Compatibility fallbacks are
          kept so older API responses
          don't break the UI.
        */

        const todaySales =
          Number(
            dashboardData.todaySales ??
              dashboardData.todaySale ??
              data?.todaySales ??
              data?.todaySale ??
              data?.todaysSale ??
              0
          );

        const creditSales =
          Number(
            dashboardData.creditSales ??
              dashboardData.payment
                ?.credit ??
              data?.creditSales ??
              data?.creditSale ??
              0
          );

        const cashSales =
          Number(
            dashboardData.cashSales ??
              dashboardData.payment
                ?.cash ??
              data?.cashSales ??
              data?.cashSale ??
              0
          );

        const upiSales =
          Number(
            dashboardData.upiSales ??
              dashboardData.payment
                ?.upi ??
              data?.upiSales ??
              data?.upiSale ??
              0
          );

        const cardSales =
          Number(
            dashboardData.cardSales ??
              dashboardData.payment
                ?.card ??
              data?.cardSales ??
              data?.cardSale ??
              0
          );

        const totalExpenses =
          Number(
            dashboardData.totalExpenses ??
              dashboardData.todayExpense ??
              data?.totalExpenses ??
              data?.todayExpense ??
              0
          );

        const pendingCredit =
          Number(
            dashboardData.pendingCredit ??
              data?.pendingCredit ??
              0
          );

        const petrolStock =
          Number(
            dashboardData.petrolStock ??
              dashboardData.stock
                ?.petrol ??
              data?.petrolStock ??
              0
          );

        const dieselStock =
          Number(
            dashboardData.dieselStock ??
              dashboardData.stock
                ?.diesel ??
              data?.dieselStock ??
              0
          );

        const petrolSold =
          Number(
            dashboardData.petrolSold ??
              dashboardData.fuelSales
                ?.petrolLitres ??
              0
          );

        const dieselSold =
          Number(
            dashboardData.dieselSold ??
              dashboardData.fuelSales
                ?.dieselLitres ??
              0
          );

        const totalFuelStock =
          Number(
            dashboardData.totalFuelStock ??
              (
                petrolStock +
                dieselStock
              )
          );

        const totalFuelSold =
          Number(
            dashboardData.totalFuelSold ??
              (
                petrolSold +
                dieselSold
              )
          );

        /*
          Credit sales are not counted
          as collected money.

          Net Collection =
          Cash + UPI + Card - Expenses
        */

        const calculatedNetCollection =
          Number(
            (
              cashSales +
              upiSales +
              cardSales -
              totalExpenses
            ).toFixed(2)
          );

        const netCollection =
          Number(
            dashboardData.netCollection ??
              calculatedNetCollection
          );

        const saleCount =
          Number(
            dashboardData.saleCount ??
              0
          );

        setSummary({
          todaySales,

          creditSales,

          cashSales,
          upiSales,
          cardSales,

          totalExpenses,

          pendingCredit,

          petrolStock,
          dieselStock,

          totalFuelStock:
            Number(
              totalFuelStock.toFixed(
                2
              )
            ),

          petrolSold,

          dieselSold,

          totalFuelSold:
            Number(
              totalFuelSold.toFixed(
                2
              )
            ),

          netCollection,

          saleCount,
        });
      } catch (error) {
        console.error(
          "DASHBOARD SUMMARY ERROR:",
          error
        );

        setSummary(
          emptySummary
        );
      } finally {
        setDashboardLoading(
          false
        );
      }
    };

  /* =====================================================
     LOAD SETTINGS
  ===================================================== */

 const loadPumpSettings =
  async () => {
    try {
      setSettingsLoading(
        true
      );

      const response =
        await getPumpSettings();

      console.log(
        "DASHBOARD PUMP SETTINGS:",
        response
      );

      const settings =
        response?.settings ||
        response?.pump ||
        {};

      setPumpSettings({
        pumpName:
          settings.pumpName ||
          "",

        ownerName:
          settings.ownerName ||
          "",

        phone:
          settings.phone ||
          "",

        email:
          settings.email ||
          "",

        companyName:
          settings.companyName ||
          "",

        dealerCode:
          settings.dealerCode ||
          "",

        gstin:
          settings.gstin ||
          "",

        address:
          settings.address ||
          "",

        city:
          settings.city ||
          "",

        state:
          settings.state ||
          "",

        pincode:
          settings.pincode ||
          "",

        lowStockAlert:
          Number(
            settings.lowStockAlert ??
              1000
          ),

        enableLowStockAlert:
          settings.enableLowStockAlert ??
          true,
      });
    } catch (error) {
      console.error(
        "DASHBOARD SETTINGS ERROR:",
        error
      );
    } finally {
      setSettingsLoading(
        false
      );
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadDashboardSummary();
    loadPumpSettings();
  }, []);

  /* =====================================================
     REFRESH WHEN USER RETURNS TO TAB
  ===================================================== */

  useEffect(() => {
    const refreshDashboard =
      () => {
        loadDashboardSummary();
      };

    window.addEventListener(
      "focus",
      refreshDashboard
    );

    document.addEventListener(
      "visibilitychange",
      refreshDashboard
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshDashboard
      );

      document.removeEventListener(
        "visibilitychange",
        refreshDashboard
      );
    };
  }, []);

  /* =====================================================
     PUMP INFORMATION
  ===================================================== */

  const displayPumpName =
    pumpSettings.pumpName ||
    user?.pumpName ||
    "My Petrol Pump";

  const displayOwnerName =
    pumpSettings.ownerName ||
    user?.name ||
    "Pump Owner";

  /* =====================================================
     LOW STOCK
  ===================================================== */

  const lowStockLevel =
    Number(
      pumpSettings.lowStockAlert ||
        1000
    );

  const petrolLow =
    pumpSettings.enableLowStockAlert &&
    summary.petrolStock <=
      lowStockLevel;

  const dieselLow =
    pumpSettings.enableLowStockAlert &&
    summary.dieselStock <=
      lowStockLevel;

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
     MAIN CARDS
  ===================================================== */

  const cards = [
    {
      title:
        "Today's Sale",

      value:
        dashboardLoading
          ? "Loading..."
          : `₹ ${money(
              summary.todaySales
            )}`,

      icon:
        IndianRupee,

      path:
        "/sales",

      className:
        "dashboard-card blue-card",
    },

    {
      title:
        "Credit Sale",

      value:
        dashboardLoading
          ? "Loading..."
          : `₹ ${money(
              summary.creditSales
            )}`,

      icon:
        WalletCards,

      path:
        "/ledger",

      className:
        "dashboard-card red-card",
    },

    {
      title:
        "Total Fuel Stock",

      value:
        dashboardLoading
          ? "Loading..."
          : `${summary.totalFuelStock.toFixed(
              2
            )} L`,

      icon:
        Fuel,

      path:
        "/fuel",

      className:
        "dashboard-card green-card",
    },

    {
      title:
        "Expense",

      value:
        dashboardLoading
          ? "Loading..."
          : `₹ ${money(
              summary.totalExpenses
            )}`,

      icon:
        Receipt,

      path:
        "/expenses/history",

      className:
        "dashboard-card yellow-card",
    },
  ];

  return (
    <div className="dashboard-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="dashboard-heading">

        <div>

          <h1>
            {settingsLoading
              ? "Loading..."
              : displayPumpName}
          </h1>

          <p>
            Welcome back,{" "}
            {displayOwnerName}
          </p>

        </div>

        <div
          className="dashboard-pump-name"
          onClick={() =>
            setShowPumpInfo(
              true
            )
          }
          style={{
            cursor:
              "pointer",
          }}
          title="View Pump Information"
        >

          <Building2
            size={17}
          />

          <strong>
            {displayPumpName}
          </strong>

        </div>

      </div>

      {/* =================================================
          LOW STOCK
      ================================================= */}

      {!dashboardLoading &&
        (petrolLow ||
          dieselLow) && (

          <div
            style={{
              marginBottom:
                "20px",

              padding:
                "13px 18px",

              border:
                "1px solid #fdba74",

              borderRadius:
                "9px",

              background:
                "#fff7ed",

              color:
                "#c2410c",

              fontSize:
                "14px",

              fontWeight:
                "600",
            }}
          >

            <strong>
              Low Stock Alert:
            </strong>{" "}

            {petrolLow &&
              `Petrol ${summary.petrolStock.toFixed(
                2
              )} L`}

            {petrolLow &&
              dieselLow &&
              " • "}

            {dieselLow &&
              `Diesel ${summary.dieselStock.toFixed(
                2
              )} L`}

          </div>

        )}

      {/* =================================================
          MAIN CARDS
      ================================================= */}

      <div className="dashboard-card-grid">

        {cards.map(
          (card) => {
            const Icon =
              card.icon;

            return (
              <div
                key={
                  card.title
                }
                className={
                  card.className
                }
                onClick={() =>
                  navigate(
                    card.path
                  )
                }
              >

                <div className="dashboard-card-top">

                  <div>

                    <h2>
                      {card.value}
                    </h2>

                    <p>
                      {card.title}
                    </p>

                  </div>

                  <Icon
                    size={50}
                    className="dashboard-card-icon"
                  />

                </div>

                <div className="dashboard-card-footer">
                  View Details →
                </div>

              </div>
            );
          }
        )}

      </div>

      {/* =================================================
          SMALL CARDS
      ================================================= */}

      <div className="dashboard-small-grid">

        {/* PETROL */}

        <div
          className="dashboard-small-card"
          onClick={() =>
            navigate(
              "/fuel"
            )
          }
        >

          <Fuel size={30} />

          <div>

            <span>
              Petrol Available
            </span>

            <h3>
              {dashboardLoading
                ? "..."
                : `${summary.petrolStock.toFixed(
                    2
                  )} L`}
            </h3>

            {!dashboardLoading &&
              petrolLow && (

                <small
                  style={{
                    color:
                      "#dc2626",

                    fontWeight:
                      "600",
                  }}
                >
                  Low Stock
                </small>

              )}

          </div>

        </div>

        {/* DIESEL */}

        <div
          className="dashboard-small-card"
          onClick={() =>
            navigate(
              "/fuel"
            )
          }
        >

          <Droplets
            size={30}
          />

          <div>

            <span>
              Diesel Available
            </span>

            <h3>
              {dashboardLoading
                ? "..."
                : `${summary.dieselStock.toFixed(
                    2
                  )} L`}
            </h3>

            {!dashboardLoading &&
              dieselLow && (

                <small
                  style={{
                    color:
                      "#dc2626",

                    fontWeight:
                      "600",
                  }}
                >
                  Low Stock
                </small>

              )}

          </div>

        </div>

        {/* FUEL SOLD */}

        <div
          className="dashboard-small-card"
          onClick={() =>
            navigate(
              "/nozzle/readings"
            )
          }
        >

          <Gauge size={30} />

          <div>

            <span>
              Fuel Sold
            </span>

            <h3>
              {dashboardLoading
                ? "..."
                : `${summary.totalFuelSold.toFixed(
                    2
                  )} L`}
            </h3>

          </div>

        </div>

        {/* PENDING */}

        <div
          className="dashboard-small-card"
          onClick={() =>
            navigate(
              "/ledger/pending"
            )
          }
        >

          <Users size={30} />

          <div>

            <span>
              Pending Credit
            </span>

            <h3>
              {dashboardLoading
                ? "..."
                : `₹ ${money(
                    summary.pendingCredit
                  )}`}
            </h3>

          </div>

        </div>

      </div>

      {/* =================================================
          FUEL SUMMARY
      ================================================= */}

      <div
        className="dashboard-section"
        style={{
          marginTop:
            "24px",
        }}
      >

        <div className="dashboard-section-title">

          <h2>
            Fuel Summary
          </h2>

          <p>
            Today's fuel sales and
            available stock
          </p>

        </div>

        <div className="table-container">

          <table>

            <thead>

              <tr>
                <th>
                  Fuel
                </th>

                <th>
                  Sold
                </th>

                <th>
                  Available
                </th>

                <th>
                  Stock Status
                </th>
              </tr>

            </thead>

            <tbody>

              <tr>

                <td>
                  <strong>
                    Petrol
                  </strong>
                </td>

                <td>
                  {summary.petrolSold.toFixed(
                    2
                  )}{" "}
                  L
                </td>

                <td>
                  <strong>
                    {summary.petrolStock.toFixed(
                      2
                    )}{" "}
                    L
                  </strong>
                </td>

                <td>
                  {petrolLow
                    ? "Low Stock"
                    : "Available"}
                </td>

              </tr>

              <tr>

                <td>
                  <strong>
                    Diesel
                  </strong>
                </td>

                <td>
                  {summary.dieselSold.toFixed(
                    2
                  )}{" "}
                  L
                </td>

                <td>
                  <strong>
                    {summary.dieselStock.toFixed(
                      2
                    )}{" "}
                    L
                  </strong>
                </td>

                <td>
                  {dieselLow
                    ? "Low Stock"
                    : "Available"}
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

      {/* =================================================
          PAYMENT SUMMARY
      ================================================= */}

      <div
        className="dashboard-section"
        style={{
          marginTop:
            "24px",
        }}
      >

        <div className="dashboard-section-title">

          <h2>
            Today's Collection
          </h2>

          <p>
            Payment method summary
          </p>

        </div>

        <div className="table-container">

          <table>

            <tbody>

              <tr>
                <th>
                  Cash
                </th>

                <td>
                  ₹{" "}
                  {money(
                    summary.cashSales
                  )}
                </td>
              </tr>

              <tr>
                <th>
                  UPI
                </th>

                <td>
                  ₹{" "}
                  {money(
                    summary.upiSales
                  )}
                </td>
              </tr>

              <tr>
                <th>
                  Card
                </th>

                <td>
                  ₹{" "}
                  {money(
                    summary.cardSales
                  )}
                </td>
              </tr>

              <tr>
                <th>
                  Credit
                </th>

                <td>
                  ₹{" "}
                  {money(
                    summary.creditSales
                  )}
                </td>
              </tr>

              <tr>
                <th>
                  Expenses
                </th>

                <td>
                  ₹{" "}
                  {money(
                    summary.totalExpenses
                  )}
                </td>
              </tr>

              <tr>

                <th>
                  Net Collection
                </th>

                <td>
                  <strong>
                    ₹{" "}
                    {money(
                      summary.netCollection
                    )}
                  </strong>
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

      {/* =================================================
          QUICK ACTIONS
      ================================================= */}

      <div
        className="dashboard-section"
        style={{
          marginTop:
            "24px",
        }}
      >

        <div className="dashboard-section-title">

          <h2>
            Quick Actions
          </h2>

          <p>
            Frequently used
            operations
          </p>

        </div>

        <div className="quick-action-grid">

          <button
            onClick={() =>
              navigate(
                "/fuel/purchase"
              )
            }
          >
            <Fuel size={22} />

            Add Fuel Purchase
          </button>

          <button
            onClick={() =>
              navigate(
                "/nozzle/readings/add"
              )
            }
          >
            <Gauge size={22} />

            Open Nozzle Reading
          </button>

          <button
            onClick={() =>
              navigate(
                "/expenses"
              )
            }
          >
            <Receipt size={22} />

            Add Expense
          </button>

          <button
            onClick={() =>
              navigate(
                "/ledger/payment"
              )
            }
          >
            <IndianRupee
              size={22}
            />

            Add Payment
          </button>

          <button
            onClick={() =>
              navigate(
                "/reports/closing"
              )
            }
          >
            <Receipt size={22} />

            Daily Closing
          </button>

        </div>

      </div>

      {/* =================================================
          PUMP INFORMATION
      ================================================= */}

      {showPumpInfo && (

        <div
          className="modal-backdrop"
          onClick={() =>
            setShowPumpInfo(
              false
            )
          }
        >

          <div
            className="stock-edit-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="stock-edit-modal-header">

              <div>

                <h2>
                  Pump Information
                </h2>

                <p>
                  Business and dealer
                  details
                </p>

              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setShowPumpInfo(
                    false
                  )
                }
              >
                <X size={20} />
              </button>

            </div>

            <div
              style={{
                display:
                  "grid",

                gap:
                  "15px",
              }}
            >

              {/* PUMP */}

              <div>

                <small>
                  Pump Name
                </small>

                <div
                  style={{
                    marginTop:
                      "3px",

                    fontWeight:
                      "700",
                  }}
                >
                  {displayPumpName}
                </div>

              </div>

              {/* OWNER */}

              <div>

                <small>
                  Owner Name
                </small>

                <div
                  style={{
                    marginTop:
                      "3px",

                    fontWeight:
                      "600",
                  }}
                >
                  {displayOwnerName}
                </div>

              </div>

              {/* COMPANY */}

              {pumpSettings.companyName && (

                <div>

                  <small>
                    Oil Company
                  </small>

                  <div
                    style={{
                      marginTop:
                        "3px",

                      fontWeight:
                        "600",
                    }}
                  >
                    {
                      pumpSettings.companyName
                    }
                  </div>

                </div>

              )}

              {/* DEALER */}

              {pumpSettings.dealerCode && (

                <div>

                  <small>
                    Dealer Code
                  </small>

                  <div
                    style={{
                      marginTop:
                        "3px",

                      fontWeight:
                        "600",
                    }}
                  >
                    {
                      pumpSettings.dealerCode
                    }
                  </div>

                </div>

              )}

              {/* PHONE */}

              {pumpSettings.phone && (

                <div
                  style={{
                    display:
                      "flex",

                    gap:
                      "9px",

                    alignItems:
                      "center",
                  }}
                >

                  <Phone
                    size={17}
                  />

                  {
                    pumpSettings.phone
                  }

                </div>

              )}

              {/* EMAIL */}

              {pumpSettings.email && (

                <div
                  style={{
                    display:
                      "flex",

                    gap:
                      "9px",

                    alignItems:
                      "center",
                  }}
                >

                  <Mail
                    size={17}
                  />

                  {
                    pumpSettings.email
                  }

                </div>

              )}

              {/* ADDRESS */}

              {(pumpSettings.address ||
                pumpSettings.city ||
                pumpSettings.state ||
                pumpSettings.pincode) && (

                <div
                  style={{
                    display:
                      "flex",

                    gap:
                      "9px",

                    alignItems:
                      "flex-start",
                  }}
                >

                  <MapPin
                    size={17}
                  />

                  <div>

                    {pumpSettings.address && (

                      <div>
                        {
                          pumpSettings.address
                        }
                      </div>

                    )}

                    <div>
                      {[
                        pumpSettings.city,
                        pumpSettings.state,
                        pumpSettings.pincode,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          ", "
                        )}
                    </div>

                  </div>

                </div>

              )}

              {/* GST */}

              {pumpSettings.gstin && (

                <div>

                  <small>
                    GSTIN
                  </small>

                  <div
                    style={{
                      marginTop:
                        "3px",

                      fontWeight:
                        "600",
                    }}
                  >
                    {
                      pumpSettings.gstin
                    }
                  </div>

                </div>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default Dashboard;