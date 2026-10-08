import {
  useContext,
  useEffect,
  useState,
} from "react";

import logo from "../assets/logo.png";

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

import {
  AuthContext,
} from "../context/AuthContext";

const Sidebar = ({
  isMobile = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    logout,
  } = useContext(AuthContext);

  const [
    activeMenu,
    setActiveMenu,
  ] = useState(null);

  const [
    isInnerOpen,
    setIsInnerOpen,
  ] = useState(false);

  /* =====================================================
     MENUS
  ===================================================== */

  const menus = [
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
      ],
    },

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
          name: "Payment Setup",
          path: "/settings/payment",
        },
        {
          name: "Users",
          path: "/settings/users",
        },
        {
          name: "Recovery / Deleted Items",
          path: "/settings/recovery",
        },
      ],
    },
  ];

  /* =====================================================
     CLOSE INNER SIDEBAR
  ===================================================== */

  const closeInnerSidebar = () => {
    setIsInnerOpen(false);

    window.setTimeout(() => {
      setActiveMenu(null);
    }, 350);
  };

  /* =====================================================
     CLOSE EVERYTHING
  ===================================================== */

  const closeAllMenus = () => {
    setIsInnerOpen(false);
    setActiveMenu(null);

    if (isMobile) {
      onCloseMobile?.();
    }
  };

  /* =====================================================
     OPEN / CLOSE MENU
  ===================================================== */

  const toggleMenu = (menuId) => {
    if (
      activeMenu === menuId &&
      isInnerOpen
    ) {
      closeInnerSidebar();
      return;
    }

    setActiveMenu(menuId);

    requestAnimationFrame(() => {
      setIsInnerOpen(true);
    });
  };

  /* =====================================================
     INNER NAVIGATION
  ===================================================== */

  const handleInnerNavigation = (
    path
  ) => {
    navigate(path);
    closeInnerSidebar();

    if (isMobile) {
      onCloseMobile?.();
    }
  };

  /* =====================================================
     DASHBOARD NAVIGATION
  ===================================================== */

  const handleDashboardNavigation = () => {
    closeAllMenus();
    navigate("/dashboard");
  };

  /* =====================================================
     SELECTED MENU
  ===================================================== */

  const selectedMenu = menus.find(
    (menu) =>
      menu.id === activeMenu
  );

  /* =====================================================
     ACTIVE MAIN MENU
  ===================================================== */

  const isMenuActive = (
    menu
  ) => {
    return menu.items.some(
      (item) => {
        if (
          location.pathname ===
          item.path
        ) {
          return true;
        }

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

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    closeAllMenus();
    logout();

    navigate("/login", {
      replace: true,
    });
  };

  /* =====================================================
     ESCAPE KEY SUPPORT
  ===================================================== */

  useEffect(() => {
    if (
      !isMobile ||
      !isMobileOpen
    ) {
      return undefined;
    }

    const handleEscape = (
      event
    ) => {
      if (
        event.key === "Escape"
      ) {
        closeAllMenus();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [
    isMobile,
    isMobileOpen,
  ]);

  /* =====================================================
     RESET SUBMENU WHEN SWITCHING TO DESKTOP
  ===================================================== */

  useEffect(() => {
    if (!isMobile) {
      setIsInnerOpen(false);
    }
  }, [isMobile]);

  /* =====================================================
     MOBILE SIDEBAR STYLES
  ===================================================== */

  const mobileSidebarStyle =
    isMobile
      ? {
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "280px",
          maxWidth: "86vw",
          height: "100vh",
          zIndex: 1200,
          transform:
            isMobileOpen
              ? "translateX(0)"
              : "translateX(-105%)",
          transition:
            "transform 0.28s ease",
          boxSizing: "border-box",
          overflow: "hidden",
          boxShadow:
            isMobileOpen
              ? "8px 0 30px rgba(15, 23, 42, 0.18)"
              : "none",
        }
      : undefined;

  /* =====================================================
     MOBILE BACKDROP
  ===================================================== */

  const mobileBackdrop =
    isMobile &&
    isMobileOpen ? (
      <div
        onClick={closeAllMenus}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1190,
          background:
            "rgba(15, 23, 42, 0.45)",
          backdropFilter:
            "blur(2px)",
        }}
      />
    ) : null;

  /* =====================================================
     UI
  ===================================================== */

  return (
    <>
      {/* MOBILE BACKDROP */}

      {mobileBackdrop}

      {/* MAIN SIDEBAR */}

      <aside
        className="main-sidebar"
        aria-label="Main navigation"
        style={
          mobileSidebarStyle
        }
      >
        {/* BRAND */}

        <button
          type="button"
          className="sidebar-brand"
          onClick={
            handleDashboardNavigation
          }
          aria-label="Go to dashboard"
          style={{
            flexShrink: 0,
          }}
        >
          <div
            className="brand-icon"
            style={{
              width: "42px",
              height: "42px",
              minWidth: "42px",
              minHeight: "42px",
              maxWidth: "42px",
              maxHeight: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              borderRadius: "50%",
              flexShrink: 0,
              padding: 0,
              margin: 0,
            }}
          >
            <img
              src={logo}
              alt="ShivShambho"
              style={{
                width: "42px",
                height: "42px",
                minWidth: "42px",
                minHeight: "42px",
                maxWidth: "42px",
                maxHeight: "42px",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
                borderRadius: "50%",
                margin: 0,
                padding: 0,
              }}
            />
          </div>

          <span>
            ShivShambho
          </span>
        </button>

        {/* NAVIGATION */}

        <nav
          className="sidebar-navigation"
          aria-label="Application navigation"
          style={{
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {/* DASHBOARD */}

          <NavLink
            to="/dashboard"
            onClick={closeAllMenus}
            className={({ isActive }) =>
              isActive
                ? "main-sidebar-item active"
                : "main-sidebar-item"
            }
          >
            <LayoutDashboard
              size={23}
              aria-hidden="true"
            />

            <span>
              Dashboard
            </span>
          </NavLink>

          {/* MAIN MODULES */}

          {menus.map((menu) => {
            const Icon = menu.icon;

            const routeActive =
              isMenuActive(menu);

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
                aria-expanded={opened}
                aria-controls={`sidebar-menu-${menu.id}`}
              >
                <Icon
                  size={23}
                  aria-hidden="true"
                />

                <span>
                  {menu.name}
                </span>

                <ChevronRight
                  size={16}
                  aria-hidden="true"
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

        <div
          className="sidebar-bottom"
          style={{
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="main-sidebar-item logout-sidebar"
            onClick={handleLogout}
          >
            <LogOut
              size={22}
              aria-hidden="true"
            />

            <span>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* INNER SIDEBAR */}

      <aside
        id={
          selectedMenu
            ? `sidebar-menu-${selectedMenu.id}`
            : undefined
        }
        className={
          isInnerOpen
            ? "inner-sidebar open"
            : "inner-sidebar"
        }
        aria-label={
          selectedMenu
            ? `${selectedMenu.name} menu`
            : "Secondary navigation"
        }
        style={
          isMobile
            ? {
                position: "fixed",
                top: 0,
                bottom: 0,
                left: "280px",
                width: "250px",
                maxWidth:
                  "calc(100vw - 280px)",
                height: "100vh",
                zIndex: 1210,
                transform:
                  isInnerOpen
                    ? "translateX(0)"
                    : "translateX(-105%)",
                transition:
                  "transform 0.28s ease",
                overflowY: "auto",
                boxSizing: "border-box",
              }
            : undefined
        }
      >
        {selectedMenu && (
          <>
            {/* HEADER */}

            <div className="inner-sidebar-header">
              <h2>
                {selectedMenu.name}
              </h2>

              <button
                type="button"
                className="inner-close-button"
                onClick={
                  closeInnerSidebar
                }
                aria-label="Close submenu"
              >
                <X
                  size={22}
                  aria-hidden="true"
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
                      key={item.path}
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
                      aria-current={
                        itemActive
                          ? "page"
                          : undefined
                      }
                    >
                      {item.name}
                    </button>
                  );
                }
              )}
            </div>
          </>
        )}
      </aside>

      {/* DESKTOP INNER SIDEBAR BACKDROP */}

      {!isMobile &&
        isInnerOpen && (
          <div
            className="sidebar-backdrop"
            onClick={
              closeInnerSidebar
            }
            aria-hidden="true"
          />
        )}
    </>
  );
};

export default Sidebar;