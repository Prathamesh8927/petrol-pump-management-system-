import {
  useContext,
  useEffect,
  useState,
} from "react";

import {
  LogOut,
  User,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  AuthContext,
} from "../context/AuthContext";

import api from "../services/api";

const Navbar = () => {
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
    const loadPump = async () => {
      if (!user) {
        return;
      }

      /* ===============================================
         SUPER ADMIN
      =============================================== */

      if (user.role === "superadmin") {
        setPump(null);
        return;
      }

      /* ===============================================
         NORMAL PUMP USER
      =============================================== */

      if (!user.pumpId) {
        setPump(null);
        return;
      }

      try {
        const response = await api.get(
          "/settings/pump"
        );

        const data =
          response.data?.pump ||
          response.data?.settings ||
          response.data;

        setPump(data || null);
      } catch (error) {
        console.error(
          "NAVBAR PUMP ERROR:",
          error
        );

        setPump(null);
      }
    };

    loadPump();
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

  const displayName =
    user?.role === "superadmin"
      ? "MyPump Super Admin"
      : pump?.pumpName ||
        "ShivShambho";

  const displayOwner =
    user?.role === "superadmin"
      ? "MyPump Super Admin"
      : pump?.ownerName ||
        user?.name ||
        "Owner";

  const displayRole =
    user?.role === "superadmin"
      ? "Super Admin"
      : user?.role || "User";

  /* =====================================================
     UI
  ===================================================== */

  return (
    <header className="navbar">

      <div>

        <h3>
          {displayName}
        </h3>

        <small>
          {displayOwner} • {displayRole}
        </small>

      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            color: "#475569",
            fontSize: "14px",
          }}
        >

          <User size={17} />

          <span>
            {user?.email || ""}
          </span>

        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >

          <LogOut size={17} />

          <span>
            Logout
          </span>

        </button>

      </div>

    </header>
  );
};

export default Navbar;