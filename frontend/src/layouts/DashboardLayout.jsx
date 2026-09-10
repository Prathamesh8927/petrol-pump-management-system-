import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";


const DashboardLayout = () => {

  /* =========================================================
     DISABLE MOUSE-WHEEL CHANGES ON NUMBER INPUTS

     Prevents the browser from increasing/decreasing
     number input values when the mouse wheel is used.

     This applies to all number inputs inside the
     DashboardLayout.

     No main.jsx modification required.
  ========================================================= */

  useEffect(() => {
    const handleNumberWheel = (event) => {
      const target = event.target;

      if (
        target instanceof HTMLInputElement &&
        target.type === "number"
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener(
      "wheel",
      handleNumberWheel,
      {
        passive: false,
      }
    );

    return () => {
      document.removeEventListener(
        "wheel",
        handleNumberWheel
      );
    };
  }, []);


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