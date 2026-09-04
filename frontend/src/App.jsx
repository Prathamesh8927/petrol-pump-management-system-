import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  Toaster,
} from "react-hot-toast";

/* =====================================================
   SUPER ADMIN
===================================================== */

import SuperAdminRoute
  from "./components/SuperAdminRoute";

import SuperAdminLayout
  from "./layouts/SuperAdminLayout";

import SuperAdminDashboard
  from "./pages/superadmin/SuperAdminDashboard";

import Clients
  from "./pages/superadmin/Clients";

import SuperAdminUsers
  from "./pages/superadmin/SuperAdminUsers";

import SuperAdminRequests
  from "./pages/superadmin/SuperAdminRequests";

/* =====================================================
   AUTH
===================================================== */

import Login
  from "./pages/auth/Login";

import Register
  from "./pages/auth/Register";

/* =====================================================
   LAYOUT
===================================================== */

import DashboardLayout
  from "./layouts/DashboardLayout";

import ProtectedRoute
  from "./components/ProtectedRoute";

/* =====================================================
   DASHBOARD
===================================================== */

import Dashboard
  from "./pages/dashboard/Dashboard";

/* =====================================================
   FUEL
===================================================== */

import FuelStock
  from "./pages/fuel/FuelStock";

import AddFuelPurchase
  from "./pages/fuel/AddFuelPurchase";

import FuelPurchaseHistory
  from "./pages/fuel/FuelPurchaseHistory";

import FuelPrice
  from "./pages/fuel/FuelPrice";

/* =====================================================
   NOZZLES
===================================================== */

import NozzleList
  from "./pages/nozzle/NozzleList";

import AddReading
  from "./pages/nozzle/AddReading";

import ReadingHistory
  from "./pages/nozzle/ReadingHistory";

/* =====================================================
   SALES
===================================================== */

import DailySales
  from "./pages/sales/DailySales";

import SalesHistory
  from "./pages/sales/SalesHistory";

import PaymentSummary
  from "./pages/sales/PaymentSummary";

/* =====================================================
   EXPENSES
===================================================== */

import AddExpense
  from "./pages/expenses/AddExpense";

import ExpenseHistory
  from "./pages/expenses/ExpenseHistory";

/* =====================================================
   LEDGER
===================================================== */

import Customers
  from "./pages/ledger/Customers";

import CustomerLedger
  from "./pages/ledger/CustomerLedger";

import Payments
  from "./pages/ledger/Payments";

import PendingCredit
  from "./pages/ledger/PendingCredit";

/* =====================================================
   REPORTS
===================================================== */

import DailyReport
  from "./pages/reports/DailyReports.jsx";

import WeeklyReport
  from "./pages/reports/WeeklyReport";

import MonthlyReport
  from "./pages/reports/MonthlyReports.jsx";

import CustomReport
  from "./pages/reports/CustomerReport";

import DailyClosing
  from "./pages/reports/DailyClosing";

/* =====================================================
   SETTINGS
===================================================== */

import PumpSettings
  from "./pages/settings/PumpSettings";

import FuelSettings
  from "./pages/settings/FuelSettings";

import UserManagement
  from "./pages/settings/UserManagement";

/* =====================================================
   APP
===================================================== */

function App() {
  return (
    <>
      {/* =================================================
          TOAST
      ================================================= */}

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

        <Route
          path="/register"
          element={
            <Register />
          }
        />

        {/* =================================================
            NORMAL PUMP APPLICATION
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

          <Route
            path="/fuel/purchase"
            element={
              <AddFuelPurchase />
            }
          />

          <Route
            path="/fuel/purchases"
            element={
              <FuelPurchaseHistory />
            }
          />

          <Route
            path="/fuel/history"
            element={
              <Navigate
                to="/fuel/purchases"
                replace
              />
            }
          />

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

          <Route
            path="/nozzle/readings/add"
            element={
              <AddReading />
            }
          />

          <Route
            path="/nozzle/readings"
            element={
              <ReadingHistory />
            }
          />

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

          <Route
            path="/ledger/customer"
            element={
              <CustomerLedger />
            }
          />

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
            SUPER ADMIN APPLICATION
        ================================================= */}

        <Route
          element={
            <SuperAdminRoute>
              <SuperAdminLayout />
            </SuperAdminRoute>
          }
        >

          {/* ===============================================
              SUPER ADMIN DASHBOARD
          =============================================== */}

          <Route
            path="/superadmin"
            element={
              <SuperAdminDashboard />
            }
          />

          {/* ===============================================
              REGISTRATION REQUESTS
          =============================================== */}

          <Route
            path="/superadmin/requests"
            element={
              <SuperAdminRequests />
            }
          />

          {/* ===============================================
              CLIENT MANAGEMENT
          =============================================== */}

          <Route
            path="/superadmin/clients"
            element={
              <Clients />
            }
          />

          {/* ===============================================
              USER MANAGEMENT
          =============================================== */}

          <Route
            path="/superadmin/users"
            element={
              <SuperAdminUsers />
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