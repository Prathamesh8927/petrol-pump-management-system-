import {
  useContext,
  useEffect,
  useState,
} from "react";

import {
  LogOut,
  User,
  Menu,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  AuthContext,
} from "../context/AuthContext";

import api from "../services/api";

const Navbar = ({
  isMobile = false,
  onOpenMobileMenu,
}) => {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useContext(AuthContext);

  const [
    pump,
    setPump,
  ] = useState(null);

  /* =====================================================
     LOAD PUMP INFORMATION
  ===================================================== */

  useEffect(() => {
    let isMounted = true;

    const loadPump = async () => {
      if (!user) {
        if (isMounted) {
          setPump(null);
        }

        return;
      }

      const userRole = String(
        user.role || ""
      )
        .trim()
        .toLowerCase();

      /* ===============================================
         SUPER ADMIN
      =============================================== */

      if (userRole === "superadmin") {
        if (isMounted) {
          setPump(null);
        }

        return;
      }

      /* ===============================================
         NORMAL PUMP USER
      =============================================== */

      if (!user.pumpId) {
        if (isMounted) {
          setPump(null);
        }

        return;
      }

      try {
        const response =
          await api.get(
            "/settings/pump"
          );

        if (!isMounted) {
          return;
        }

        const data =
          response.data?.pump ||
          response.data?.settings ||
          response.data;

        setPump(
          data &&
            typeof data === "object"
            ? data
            : null
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (import.meta.env.DEV) {
          console.error(
            "NAVBAR PUMP ERROR:",
            error.response?.data
              ?.message ||
              error.message ||
              error
          );
        }

        setPump(null);
      }
    };

    loadPump();

    return () => {
      isMounted = false;
    };
  }, [user]);

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    logout();

    navigate("/login", {
      replace: true,
    });
  };

  /* =====================================================
     DISPLAY INFORMATION
  ===================================================== */

  const userRole = String(
    user?.role || ""
  )
    .trim()
    .toLowerCase();

  const isSuperAdmin =
    userRole === "superadmin";

  const displayName = isSuperAdmin
    ? "ShivShambho Super Admin"
    : pump?.pumpName ||
      "ShivShambho";

  const displayOwner = isSuperAdmin
    ? "ShivShambho Super Admin"
    : pump?.ownerName ||
      user?.name ||
      "Owner";

  const displayRole = isSuperAdmin
    ? "Super Admin"
    : user?.role ||
      "User";

  /* =====================================================
     UI
  ===================================================== */

  return (
    <header
      className="navbar"
      role="banner"
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {/* =================================================
          MOBILE MENU BUTTON
      ================================================= */}

      {isMobile && (
        <button
          type="button"
          onClick={
            onOpenMobileMenu
          }
          aria-label="Open navigation menu"
          aria-expanded="false"
          style={{
            width: "42px",
            height: "42px",
            minWidth: "42px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            borderRadius: "10px",
            background: "#f1f5f9",
            color: "#334155",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
          }}
        >
          <Menu
            size={23}
            aria-hidden="true"
          />
        </button>
      )}

      {/* =================================================
          PUMP / USER INFORMATION
      ================================================= */}

      <div
        className="navbar-info"
        style={{
          minWidth: 0,
          flex: 1,
          overflow: "hidden",
        }}
      >
        <h3
          title={displayName}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName}
        </h3>

        <small
          style={{
            display: "flex",
            alignItems: "center",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {displayOwner}
          </span>

          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
            }}
          >
            {" • "}
          </span>

          <span
            style={{
              flexShrink: 0,
            }}
          >
            {displayRole}
          </span>
        </small>
      </div>

      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      <div
        className="navbar-actions"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          minWidth: 0,
          flexShrink: 0,
        }}
      >
        {/* USER EMAIL */}

        {!isMobile && (
          <div
            className="navbar-user"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              color: "#475569",
              fontSize: "14px",
              minWidth: 0,
              maxWidth: "260px",
            }}
          >
            <User
              size={17}
              aria-hidden="true"
            />

            <span
              title={
                user?.email || ""
              }
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {user?.email || ""}
            </span>
          </div>
        )}

        {/* LOGOUT */}

        <button
          type="button"
          className="logout-button"
          onClick={
            handleLogout
          }
          aria-label="Logout"
          title="Logout"
          style={
            isMobile
              ? {
                  width: "42px",
                  height: "42px",
                  minWidth: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  gap: 0,
                }
              : undefined
          }
        >
          <LogOut
            size={17}
            aria-hidden="true"
          />

          {!isMobile && (
            <span>
              Logout
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Navbar;