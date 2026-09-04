import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  Building2,
  ClipboardCheck,
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
  const navigate =
    useNavigate();

  const [pendingCount, setPendingCount] =
    useState(0);

  const [loadingCount, setLoadingCount] =
    useState(false);

  const loadPendingCount =
    useCallback(async () => {
      try {
        setLoadingCount(true);

        const response =
          await api.get(
            "/superadmin/requests/pending-count"
          );

        setPendingCount(
          Number(
            response.data?.count || 0
          )
        );
      } catch (error) {
        console.error(
          "PENDING COUNT ERROR:",
          error
        );
      } finally {
        setLoadingCount(false);
      }
    }, []);

  useEffect(() => {
    loadPendingCount();

    const interval =
      setInterval(
        loadPendingCount,
        30000
      );

    return () =>
      clearInterval(interval);
  }, [loadPendingCount]);

  const logout = () => {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    navigate("/login", {
      replace: true,
    });

    window.location.reload();
  };

  return (
    <div className="super-admin-layout">

      <aside className="super-admin-sidebar">

        <div className="super-admin-brand">

          <div className="super-admin-logo">
            MP
          </div>

          <div>
            <strong>
              MyPump
            </strong>

            <span>
              Super Admin
            </span>
          </div>

        </div>

        <nav className="super-admin-nav">

          <NavLink
            to="/superadmin"
            end
          >
            <LayoutDashboard
              size={19}
            />

            Dashboard
          </NavLink>

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
              <span className="super-admin-request-badge">
                {pendingCount > 99
                  ? "99+"
                  : pendingCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/superadmin/clients"
          >
            <Building2
              size={19}
            />

            Clients
          </NavLink>

          <NavLink
            to="/superadmin/users"
          >
            <Users
              size={19}
            />

            Users
          </NavLink>

        </nav>

        <button
          type="button"
          className="super-admin-logout"
          onClick={logout}
        >
          <LogOut
            size={18}
          />

          Logout
        </button>

      </aside>

      <main className="super-admin-main">

        <header className="super-admin-topbar">

          <div>
            <h2>
              Super Admin
            </h2>

            <p>
              MyPump Client Management
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

        <div className="super-admin-content">

          <Outlet />

        </div>

      </main>

    </div>
  );
};

export default SuperAdminLayout;