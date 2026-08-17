import { useState } from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  Fuel,
  Gauge,
  IndianRupee,
  Receipt,
  Users,
  FileText,
  Settings,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeMenu, setActiveMenu] =
    useState(null);

  const [isInnerOpen, setIsInnerOpen] =
    useState(false);

  /* =====================================
     MENUS
  ===================================== */

  const menus = [
    /* ===============================
       FUEL
    =============================== */

    {
      id: "fuel",
      name: "Fuel",
      icon: Fuel,

      items: [
        {
          name: "Current Stock",
          path: "/fuel",
        },

        {
          name: "Fuel Purchase",
          path: "/fuel/purchase",
        },

        {
          name: "Purchase History",
          path: "/fuel/purchases",
        },

        {
          name: "Fuel Price",
          path: "/fuel/price",
        },
      ],
    },

    /* ===============================
       NOZZLES
    =============================== */

    {
      id: "nozzle",
      name: "Nozzles",
      icon: Gauge,

      items: [
        {
          name: "All Nozzles",
          path: "/nozzle",
        },

        {
          name: "Add Reading",
          path: "/nozzle/readings/add",
        },

        {
          name: "Reading History",
          path: "/nozzle/readings",
        },
      ],
    },

    /* ===============================
       SALES
    =============================== */

    {
      id: "sales",
      name: "Sales",
      icon: IndianRupee,

      items: [
        {
          name: "Daily Sales",
          path: "/sales",
        },

        {
          name: "Sales History",
          path: "/sales/history",
        },

        {
          name: "Payment Summary",
          path: "/sales/payments",
        },
      ],
    },

    /* ===============================
       EXPENSES
    =============================== */

    {
      id: "expenses",
      name: "Expenses",
      icon: Receipt,

      items: [
        {
          name: "Add Expense",
          path: "/expenses",
        },

        {
          name: "Expense History",
          path: "/expenses/history",
        },
      ],
    },

    /* ===============================
       LEDGER
    =============================== */

    {
      id: "ledger",
      name: "Ledger",
      icon: Users,

      items: [
        {
          name: "Customers",
          path: "/ledger",
        },

        {
          name: "Customer Ledger",
          path: "/ledger/customer",
        },

        {
          name: "Add Payment",
          path: "/ledger/payment",
        },

        {
          name: "Pending Credit",
          path: "/ledger/pending",
        },
      ],
    },

    /* ===============================
       REPORTS
    =============================== */

    {
      id: "reports",
      name: "Reports",
      icon: FileText,

      items: [
        {
          name: "Daily Report",
          path: "/reports",
        },

        {
          name: "Weekly Report",
          path: "/reports/weekly",
        },

        {
          name: "Monthly Report",
          path: "/reports/monthly",
        },

        {
          name: "Custom Report",
          path: "/reports/custom",
        },
      ],
    },

    /* ===============================
       SETTINGS
    =============================== */

    {
      id: "settings",
      name: "Settings",
      icon: Settings,

      items: [
        {
          name: "Pump Details",
          path: "/settings",
        },

        {
          name: "Fuel Settings",
          path: "/settings/fuel",
        },

        {
          name: "Users",
          path: "/settings/users",
        },
      ],
    },
  ];

  /* =====================================
     CLOSE INNER SIDEBAR
  ===================================== */

  const closeInnerSidebar = () => {
    setIsInnerOpen(false);

    /*
      Wait until slide-out animation
      completes before clearing content.
    */

    setTimeout(() => {
      setActiveMenu(null);
    }, 350);
  };

  /* =====================================
     OPEN / CLOSE MENU
  ===================================== */

  const toggleMenu = (menuId) => {
    /*
      Clicking same menu again
      closes the inner sidebar.
    */

    if (
      activeMenu === menuId &&
      isInnerOpen
    ) {
      closeInnerSidebar();
      return;
    }

    /*
      If another menu is already open,
      replace its content.
    */

    setActiveMenu(menuId);

    requestAnimationFrame(() => {
      setIsInnerOpen(true);
    });
  };

  /* =====================================
     INNER NAVIGATION
  ===================================== */

  const handleInnerNavigation = (
    path
  ) => {
    /*
      Navigate to selected page.
    */

    navigate(path);

    /*
      Automatically close inner sidebar.
    */

    closeInnerSidebar();
  };

  /* =====================================
     SELECTED MENU
  ===================================== */

  const selectedMenu =
    menus.find(
      (menu) =>
        menu.id === activeMenu
    );

  /* =====================================
     ACTIVE MAIN MENU
  ===================================== */

  const isMenuActive = (menu) => {
    return menu.items.some(
      (item) => {
        /*
          Exact route.
        */

        if (
          location.pathname ===
          item.path
        ) {
          return true;
        }

        /*
          Nested routes.
        */

        if (
          item.path !== "/" &&
          location.pathname.startsWith(
            `${item.path}/`
          )
        ) {
          return true;
        }

        return false;
      }
    );
  };

  /* =====================================
     LOGOUT
  ===================================== */

  const handleLogout = () => {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    setIsInnerOpen(false);
    setActiveMenu(null);

    navigate("/login");
  };

  /* =====================================
     UI
  ===================================== */

  return (
    <>
      {/* =================================
          MAIN SIDEBAR
      ================================= */}

      <aside className="main-sidebar">

        {/* BRAND */}

        <div
          className="sidebar-brand"
          onClick={() => {
            closeInnerSidebar();

            navigate(
              "/dashboard"
            );
          }}
          style={{
            cursor: "pointer",
          }}
        >
          <div className="brand-icon">
            MP
          </div>

          <span>
            MyPump
          </span>
        </div>

        {/* NAVIGATION */}

        <nav className="sidebar-navigation">

          {/* DASHBOARD */}

          <NavLink
            to="/dashboard"
            onClick={
              closeInnerSidebar
            }
            className={({
              isActive,
            }) =>
              isActive
                ? "main-sidebar-item active"
                : "main-sidebar-item"
            }
          >
            <LayoutDashboard
              size={23}
            />

            <span>
              Dashboard
            </span>
          </NavLink>

          {/* MAIN MODULES */}

          {menus.map((menu) => {
            const Icon =
              menu.icon;

            const routeActive =
              isMenuActive(
                menu
              );

            const opened =
              activeMenu ===
                menu.id &&
              isInnerOpen;

            return (
              <button
                key={menu.id}
                type="button"
                onClick={() =>
                  toggleMenu(
                    menu.id
                  )
                }
                className={
                  routeActive ||
                  opened
                    ? "main-sidebar-item active"
                    : "main-sidebar-item"
                }
              >
                <Icon
                  size={23}
                />

                <span>
                  {menu.name}
                </span>

                <ChevronRight
                  size={16}
                  className={
                    opened
                      ? "menu-arrow opened"
                      : "menu-arrow"
                  }
                />
              </button>
            );
          })}

        </nav>

        {/* LOGOUT */}

        <div className="sidebar-bottom">

          <button
            type="button"
            className="main-sidebar-item logout-sidebar"
            onClick={
              handleLogout
            }
          >
            <LogOut
              size={22}
            />

            <span>
              Logout
            </span>
          </button>

        </div>

      </aside>

      {/* =================================
          INNER SIDEBAR
      ================================= */}

      <aside
        className={
          isInnerOpen
            ? "inner-sidebar open"
            : "inner-sidebar"
        }
      >

        {selectedMenu && (
          <>
            {/* HEADER */}

            <div className="inner-sidebar-header">

              <h2>
                {
                  selectedMenu.name
                }
              </h2>

              <button
                type="button"
                className="inner-close-button"
                onClick={
                  closeInnerSidebar
                }
                aria-label="Close sidebar"
              >
                <X
                  size={22}
                />
              </button>

            </div>

            {/* LINKS */}

            <div className="inner-sidebar-menu">

              {selectedMenu.items.map(
                (item) => {
                  const itemActive =
                    location.pathname ===
                    item.path;

                  return (
                    <button
                      key={
                        item.path
                      }
                      type="button"
                      onClick={() =>
                        handleInnerNavigation(
                          item.path
                        )
                      }
                      className={
                        itemActive
                          ? "inner-sidebar-link active"
                          : "inner-sidebar-link"
                      }
                    >
                      {
                        item.name
                      }
                    </button>
                  );
                }
              )}

            </div>

          </>
        )}

      </aside>

      {/* =================================
          MOBILE BACKDROP
      ================================= */}

      {isInnerOpen && (
        <div
          className="sidebar-backdrop"
          onClick={
            closeInnerSidebar
          }
        />
      )}
    </>
  );
};

export default Sidebar;