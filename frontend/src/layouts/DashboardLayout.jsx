import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
  useLocation,
} from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const MOBILE_BREAKPOINT = 768;

const DashboardLayout = () => {
  const location = useLocation();

  const [
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  ] = useState(false);

  const [
    isMobile,
    setIsMobile,
  ] = useState(() =>
    typeof window !== "undefined"
      ? window.innerWidth <= MOBILE_BREAKPOINT
      : false
  );

  /* =========================================================
     RESPONSIVE SCREEN DETECTION
  ========================================================= */

  useEffect(() => {
    const handleResize = () => {
      const mobile =
        window.innerWidth <= MOBILE_BREAKPOINT;

      setIsMobile(mobile);

      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    handleResize();

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  /* =========================================================
     CLOSE MOBILE SIDEBAR AFTER ROUTE CHANGE
  ========================================================= */

  useEffect(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [
    location.pathname,
    isMobile,
  ]);

  /* =========================================================
     LOCK BODY SCROLL WHEN MOBILE SIDEBAR IS OPEN
  ========================================================= */

  useEffect(() => {
    if (!isMobile || !isMobileMenuOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    isMobile,
    isMobileMenuOpen,
  ]);

  /* =========================================================
     DISABLE MOUSE-WHEEL CHANGES ON NUMBER INPUTS

     Prevents accidental number changes while scrolling.
  ========================================================= */

  useEffect(() => {
    const handleNumberWheel = (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const numberInput =
        target.closest(
          'input[type="number"]'
        );

      if (!numberInput) {
        return;
      }

      event.preventDefault();
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

  /* =========================================================
     MOBILE SIDEBAR CONTROLS
  ========================================================= */

  const openMobileMenu = () => {
    if (!isMobile) {
      return;
    }

    setIsMobileMenuOpen(true);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className="dashboard-layout"
      style={{
        width: "100%",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar
        isMobile={isMobile}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={closeMobileMenu}
      />

      {/* =====================================================
          MAIN APPLICATION AREA
      ===================================================== */}

      <div
        className="dashboard-main"
        style={
          isMobile
            ? {
                width: "100%",
                minWidth: 0,
                marginLeft: 0,
              }
            : undefined
        }
      >
        {/* =================================================
            TOP NAVBAR
        ================================================= */}

        <Navbar
          isMobile={isMobile}
          onOpenMobileMenu={openMobileMenu}
        />

        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <main
          className="dashboard-content"
          role="main"
          style={
            isMobile
              ? {
                  width: "100%",
                  minWidth: 0,
                  maxWidth: "100%",
                  overflowX: "hidden",
                  boxSizing: "border-box",
                }
              : undefined
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;