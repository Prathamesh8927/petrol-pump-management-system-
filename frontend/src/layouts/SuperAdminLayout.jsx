import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  Building2,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";

const SuperAdminLayout =
  () => {
    const navigate =
      useNavigate();

    const logout =
      () => {
        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "user"
        );

        navigate(
          "/login",
          {
            replace: true,
          }
        );

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

          </header>

          <div className="super-admin-content">

            <Outlet />

          </div>

        </main>

      </div>
    );
  };

export default SuperAdminLayout;