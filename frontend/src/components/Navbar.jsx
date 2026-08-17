import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } =
    useContext(AuthContext);

  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div>
        <h3>
          {user?.pumpName ||
            "Petrol Pump"}
        </h3>

        <small>
          Welcome, {user?.name}
        </small>
      </div>

      
    </header>
  );
};

export default Navbar;