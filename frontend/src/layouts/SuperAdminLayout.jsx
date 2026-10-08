import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import logo from "../assets/logo.png";

import {
  Building2,
  ClipboardCheck,
  KeyRound,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Users,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const SuperAdminLayout = () => {
  const navigate = useNavigate();

  const [
    pendingCount,
    setPendingCount,
  ] = useState(0);

  const [
    loadingCount,
    setLoadingCount,
  ] = useState(false);

  /* =====================================
     LOAD PENDING REQUEST COUNT
  ===================================== */

  const loadPendingCount =
    useCallback(async () => {
      try {
        setLoadingCount(true);

        const response =
          await api.get(
            "/superadmin/requests/pending-count"
          );

        const count = Number(
          response.data?.count || 0
        );

        setPendingCount(
          Number.isFinite(count)
            ? Math.max(0, count)
            : 0
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            "PENDING COUNT ERROR:",
            error.response?.data
              ?.message ||
              error.message ||
              error
          );
        }
      } finally {
        setLoadingCount(false);
      }
    }, []);

  /* =====================================
     INITIAL LOAD + AUTO REFRESH
  ===================================== */

  useEffect(() => {
    loadPendingCount();

    const interval = setInterval(
      loadPendingCount,
      30000
    );

    return () => {
      clearInterval(interval);
    };
  }, [loadPendingCount]);

  /* =====================================
     LOGOUT
  ===================================== */

  const logout = () => {
    try {
      /*
       * AuthContext uses sessionStorage.
       * Clear both storage locations so any
       * legacy localStorage authentication
       * cannot remain.
       */
      sessionStorage.removeItem(
        "token"
      );

      sessionStorage.removeItem(
        "user"
      );

      sessionStorage.removeItem(
        "passwordResetRequestId"
      );

      sessionStorage.removeItem(
        "shivshambho_active_payment"
      );

      sessionStorage.removeItem(
        "activePayment"
      );

      /*
       * Clear legacy localStorage values too.
       */
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );
    } catch (error) {
      console.error(
        "SUPER ADMIN LOGOUT ERROR:",
        error
      );
    }

    navigate("/login", {
      replace: true,
    });

    /*
     * Force a clean application state.
     * This also resets AuthContext immediately.
     */
    window.location.reload();
  };

  return (
    <div className="super-admin-layout">

      {/* =================================
          SIDEBAR
      ================================= */}

      <aside className="super-admin-sidebar">

        {/* =================================
            BRAND
        ================================= */}

        <div className="super-admin-brand">

          <div
            className="super-admin-logo"
            style={{
              width: "42px",
              height: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              borderRadius: "50%",
              flexShrink: 0,
            }}
          >
            <img
              src={logo}
              alt="ShivShambho Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          <div>
            <strong>
              ShivShambho
            </strong>

            <span>
              Super Admin
            </span>
          </div>

        </div>

        {/* =================================
            NAVIGATION
        ================================= */}

        <nav
          className="super-admin-nav"
          aria-label="Super admin navigation"
        >

          {/* DASHBOARD */}

          <NavLink
            to="/superadmin"
            end
          >
            <LayoutDashboard
              size={19}
            />

            <span>
              Dashboard
            </span>
          </NavLink>

          {/* REGISTRATION REQUESTS */}

          <NavLink
            to="/superadmin/requests"
          >
            <ClipboardCheck
              size={19}
            />

            <span>
              Requests
            </span>

            {pendingCount > 0 && (
              <span
                className="super-admin-request-badge"
                aria-label={`${pendingCount} pending requests`}
              >
                {pendingCount > 99
                  ? "99+"
                  : pendingCount}
              </span>
            )}
          </NavLink>

          {/* PASSWORD REQUESTS */}

          <NavLink
            to="/superadmin/password-requests"
          >
            <KeyRound
              size={19}
            />

            <span>
              Password Requests
            </span>
          </NavLink>

          {/* CLIENTS */}

          <NavLink
            to="/superadmin/clients"
          >
            <Building2
              size={19}
            />

            <span>
              Clients
            </span>
          </NavLink>

          {/* USERS */}

          <NavLink
            to="/superadmin/users"
          >
            <Users
              size={19}
            />

            <span>
              Users
            </span>
          </NavLink>

        </nav>

        {/* =================================
            LOGOUT
        ================================= */}

        <button
          type="button"
          className="super-admin-logout"
          onClick={logout}
        >
          <LogOut
            size={18}
          />

          <span>
            Logout
          </span>
        </button>

      </aside>

      {/* =================================
          MAIN CONTENT
      ================================= */}

      <main className="super-admin-main">

        {/* TOPBAR */}

        <header className="super-admin-topbar">

          <div>
            <h2>
              Super Admin
            </h2>

            <p>
              ShivShambho Client Management
            </p>
          </div>

          <button
            type="button"
            className="super-admin-refresh"
            onClick={
              loadPendingCount
            }
            disabled={
              loadingCount
            }
            title="Refresh requests"
            aria-label="Refresh pending requests"
          >
            <RefreshCw
              size={17}
              className={
                loadingCount
                  ? "spin"
                  : ""
              }
            />
          </button>

        </header>

        {/* PAGE CONTENT */}

        <div className="super-admin-content">
          <Outlet />
        </div>

      </main>

    </div>
  );
};

export default SuperAdminLayout;