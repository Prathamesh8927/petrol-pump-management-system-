import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const DashboardLayout = () => {
  return (
    <div className="dashboard-layout">

      {/* MAIN SIDEBAR */}
      <Sidebar />

      {/* MAIN APPLICATION AREA */}
      <div className="dashboard-main">

        {/* TOP NAVBAR */}
        <Navbar />

        {/* PAGE CONTENT */}
        <main className="dashboard-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default DashboardLayout;