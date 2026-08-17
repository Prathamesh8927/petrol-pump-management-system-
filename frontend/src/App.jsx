import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  Toaster,
} from "react-hot-toast";

/* =====================================================
   AUTH
===================================================== */

import Login from "./pages/auth/Login";

/* =====================================================
   LAYOUT
===================================================== */

import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

/* =====================================================
   DASHBOARD
===================================================== */

import Dashboard from "./pages/dashboard/Dashboard";

/* =====================================================
   FUEL
===================================================== */

import FuelStock from "./pages/fuel/FuelStock";
import AddFuelPurchase from "./pages/fuel/AddFuelPurchase";
import FuelPurchaseHistory from "./pages/fuel/FuelPurchaseHistory";
import FuelPrice from "./pages/fuel/FuelPrice";

/* =====================================================
   NOZZLES
===================================================== */

import NozzleList from "./pages/nozzle/NozzleList";
import AddReading from "./pages/nozzle/AddReading";
import ReadingHistory from "./pages/nozzle/ReadingHistory";

/* =====================================================
   SALES
===================================================== */

import DailySales from "./pages/sales/DailySales";
import SalesHistory from "./pages/sales/SalesHistory";
import PaymentSummary from "./pages/sales/PaymentSummary";

/* =====================================================
   EXPENSES
===================================================== */

import AddExpense from "./pages/expenses/AddExpense";
import ExpenseHistory from "./pages/expenses/ExpenseHistory";

/* =====================================================
   LEDGER
===================================================== */

import Customers from "./pages/ledger/Customers";
import CustomerLedger from "./pages/ledger/CustomerLedger";
import Payments from "./pages/ledger/Payments";
import PendingCredit from "./pages/ledger/PendingCredit";

/* =====================================================
   REPORTS
===================================================== */

import DailyReport from "./pages/reports/DailyReports.jsx";
import WeeklyReport from "./pages/reports/WeeklyReport";
import MonthlyReport from "./pages/reports/MonthlyReports.jsx";
import CustomReport from "./pages/reports/CustomerReport";
import DailyClosing from "./pages/reports/DailyClosing";

/* =====================================================
   SETTINGS
===================================================== */

import PumpSettings from "./pages/settings/PumpSettings";
import FuelSettings from "./pages/settings/FuelSettings";
import UserManagement from "./pages/settings/UserManagement";

/* =====================================================
   APP
===================================================== */

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
        }}
      />

      <Routes>

        {/* =================================================
            PUBLIC
        ================================================= */}

        <Route
          path="/login"
          element={
            <Login />
          }
        />

        {/* =================================================
            PROTECTED APPLICATION
        ================================================= */}

        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >

          {/* ===============================================
              DASHBOARD
          =============================================== */}

          <Route
            path="/dashboard"
            element={
              <Dashboard />
            }
          />

          {/* ===============================================
              FUEL
          =============================================== */}

          <Route
            path="/fuel"
            element={
              <FuelStock />
            }
          />

          <Route
            path="/fuel/stock"
            element={
              <Navigate
                to="/fuel"
                replace
              />
            }
          />

          {/* ADD FUEL PURCHASE */}

          <Route
            path="/fuel/purchase"
            element={
              <AddFuelPurchase />
            }
          />

          {/* PURCHASE HISTORY */}

          <Route
            path="/fuel/purchases"
            element={
              <FuelPurchaseHistory />
            }
          />

          {/* OLD / ALTERNATIVE PURCHASE HISTORY URL */}

          <Route
            path="/fuel/history"
            element={
              <Navigate
                to="/fuel/purchases"
                replace
              />
            }
          />

          {/* FUEL PRICE */}

          <Route
            path="/fuel/price"
            element={
              <FuelPrice />
            }
          />

          {/* ===============================================
              NOZZLES
          =============================================== */}

          <Route
            path="/nozzle"
            element={
              <NozzleList />
            }
          />

          <Route
            path="/nozzles"
            element={
              <Navigate
                to="/nozzle"
                replace
              />
            }
          />

          {/* ADD READING */}

          <Route
            path="/nozzle/readings/add"
            element={
              <AddReading />
            }
          />

          {/* READING HISTORY */}

          <Route
            path="/nozzle/readings"
            element={
              <ReadingHistory />
            }
          />

          {/* OLD NOZZLE URLS */}

          <Route
            path="/nozzle/reading"
            element={
              <Navigate
                to="/nozzle/readings/add"
                replace
              />
            }
          />

          <Route
            path="/nozzle/history"
            element={
              <Navigate
                to="/nozzle/readings"
                replace
              />
            }
          />

          <Route
            path="/nozzles/readings"
            element={
              <Navigate
                to="/nozzle/readings"
                replace
              />
            }
          />

          <Route
            path="/nozzles/readings/add"
            element={
              <Navigate
                to="/nozzle/readings/add"
                replace
              />
            }
          />

          {/* ===============================================
              SALES
          =============================================== */}

          <Route
            path="/sales"
            element={
              <DailySales />
            }
          />

          <Route
            path="/sales/daily"
            element={
              <Navigate
                to="/sales"
                replace
              />
            }
          />

          <Route
            path="/sales/history"
            element={
              <SalesHistory />
            }
          />

          <Route
            path="/sales/payments"
            element={
              <PaymentSummary />
            }
          />

          <Route
            path="/sales/payment-summary"
            element={
              <Navigate
                to="/sales/payments"
                replace
              />
            }
          />

          {/* ===============================================
              EXPENSES
          =============================================== */}

          <Route
            path="/expenses"
            element={
              <AddExpense />
            }
          />

          <Route
            path="/expenses/add"
            element={
              <Navigate
                to="/expenses"
                replace
              />
            }
          />

          <Route
            path="/expenses/history"
            element={
              <ExpenseHistory />
            }
          />

          {/* ===============================================
              LEDGER
          =============================================== */}

          {/* CUSTOMER LIST / ADD CUSTOMER */}

          <Route
            path="/ledger"
            element={
              <Customers />
            }
          />

          <Route
            path="/ledger/customers"
            element={
              <Customers />
            }
          />

          {/* INDIVIDUAL CUSTOMER LEDGER */}

          <Route
            path="/ledger/customer"
            element={
              <CustomerLedger />
            }
          />

          {/* PAYMENT */}

          <Route
            path="/ledger/payment"
            element={
              <Payments />
            }
          />

          <Route
            path="/ledger/payments"
            element={
              <Navigate
                to="/ledger/payment"
                replace
              />
            }
          />

          {/* PENDING CREDIT */}

          <Route
            path="/ledger/pending"
            element={
              <PendingCredit />
            }
          />

          <Route
            path="/ledger/pending-credit"
            element={
              <Navigate
                to="/ledger/pending"
                replace
              />
            }
          />

          {/* ===============================================
              REPORTS
          =============================================== */}

          <Route
            path="/reports"
            element={
              <DailyReport />
            }
          />

          <Route
            path="/reports/daily"
            element={
              <Navigate
                to="/reports"
                replace
              />
            }
          />

          <Route
            path="/reports/weekly"
            element={
              <WeeklyReport />
            }
          />

          <Route
            path="/reports/monthly"
            element={
              <MonthlyReport />
            }
          />

          <Route
            path="/reports/custom"
            element={
              <CustomReport />
            }
          />

          {/* DAILY CLOSING */}

          <Route
            path="/reports/closing"
            element={
              <DailyClosing />
            }
          />

          {/* ===============================================
              SETTINGS
          =============================================== */}

          <Route
            path="/settings"
            element={
              <PumpSettings />
            }
          />

          <Route
            path="/settings/pump"
            element={
              <Navigate
                to="/settings"
                replace
              />
            }
          />

          <Route
            path="/settings/fuel"
            element={
              <FuelSettings />
            }
          />

          <Route
            path="/settings/users"
            element={
              <UserManagement />
            }
          />

        </Route>

        {/* =================================================
            ROOT
        ================================================= */}

        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        {/* =================================================
            UNKNOWN ROUTE
        ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>
    </>
  );
}

export default App;