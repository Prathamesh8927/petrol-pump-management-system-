import {
  lazy,
  Suspense,
} from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { Toaster } from "react-hot-toast";

/* =====================================================
   LAZY LOADING
   ===================================================== */

/*
 * Layouts and route components are loaded only when
 * they are actually required.
 */

/* =====================================================
   SUPER ADMIN
===================================================== */

const SuperAdminRoute = lazy(() =>
  import("./components/SuperAdminRoute")
);

const SuperAdminLayout = lazy(() =>
  import("./layouts/SuperAdminLayout")
);

const SuperAdminDashboard = lazy(() =>
  import("./pages/superadmin/SuperAdminDashboard")
);

const Clients = lazy(() =>
  import("./pages/superadmin/Clients")
);

const SuperAdminUsers = lazy(() =>
  import("./pages/superadmin/SuperAdminUsers")
);

const SuperAdminRequests = lazy(() =>
  import("./pages/superadmin/SuperAdminRequests")
);

const SuperAdminPasswordRequests = lazy(() =>
  import("./pages/superadmin/SuperAdminPasswordRequests")
);

/* =====================================================
   AUTH
===================================================== */

const Login = lazy(() =>
  import("./pages/auth/Login")
);

const Register = lazy(() =>
  import("./pages/auth/Register")
);

const ForgotPassword = lazy(() =>
  import("./pages/auth/ForgotPassword")
);

const ResetPassword = lazy(() =>
  import("./pages/auth/ResetPassword")
);

/* =====================================================
   NORMAL APPLICATION LAYOUT
===================================================== */

const DashboardLayout = lazy(() =>
  import("./layouts/DashboardLayout")
);

const ProtectedRoute = lazy(() =>
  import("./components/ProtectedRoute")
);

const EmployeeRoute = lazy(() =>
  import("./components/EmployeeRoute")
);

const EmployeePayment = lazy(() =>
  import("./pages/employee/EmployeePayment")
);

/* =====================================================
   DASHBOARD
===================================================== */

const Dashboard = lazy(() =>
  import("./pages/dashboard/Dashboard")
);

/* =====================================================
   FUEL
===================================================== */

const FuelStock = lazy(() =>
  import("./pages/fuel/FuelStock")
);

const AddFuelPurchase = lazy(() =>
  import("./pages/fuel/AddFuelPurchase")
);

const FuelPurchaseHistory = lazy(() =>
  import("./pages/fuel/FuelPurchaseHistory")
);

const FuelPrice = lazy(() =>
  import("./pages/fuel/FuelPrice")
);

/* =====================================================
   NOZZLES
===================================================== */

const NozzleList = lazy(() =>
  import("./pages/nozzle/NozzleList")
);

const AddReading = lazy(() =>
  import("./pages/nozzle/AddReading")
);

const ReadingHistory = lazy(() =>
  import("./pages/nozzle/ReadingHistory")
);

/* =====================================================
   SALES
===================================================== */

const DailySales = lazy(() =>
  import("./pages/sales/DailySales")
);

const SalesHistory = lazy(() =>
  import("./pages/sales/SalesHistory")
);

const PaymentSummary = lazy(() =>
  import("./pages/sales/PaymentSummary")
);

/* =====================================================
   EXPENSES
===================================================== */

const AddExpense = lazy(() =>
  import("./pages/expenses/AddExpense")
);

const ExpenseHistory = lazy(() =>
  import("./pages/expenses/ExpenseHistory")
);

/* =====================================================
   LEDGER
===================================================== */

const Customers = lazy(() =>
  import("./pages/ledger/Customers")
);

const CustomerLedger = lazy(() =>
  import("./pages/ledger/CustomerLedger")
);

const Payments = lazy(() =>
  import("./pages/ledger/Payments")
);

const PendingCredit = lazy(() =>
  import("./pages/ledger/PendingCredit")
);

/* =====================================================
   REPORTS
===================================================== */

const DailyReport = lazy(() =>
  import("./pages/reports/DailyReports.jsx")
);

const WeeklyReport = lazy(() =>
  import("./pages/reports/WeeklyReport")
);

const MonthlyReport = lazy(() =>
  import("./pages/reports/MonthlyReports.jsx")
);

const CustomReport = lazy(() =>
  import("./pages/reports/CustomReport.jsx")
);

/* =====================================================
   SETTINGS
===================================================== */

const PumpSettings = lazy(() =>
  import("./pages/settings/PumpSettings")
);

const PaymentSettings = lazy(() =>
  import("./pages/settings/PaymentSettings")
);

const FuelSettings = lazy(() =>
  import("./pages/settings/FuelSettings")
);

const UserManagement = lazy(() =>
  import("./pages/settings/UserManagement")
);

/* =====================================================
   RECOVERY
===================================================== */

const DeletedItems = lazy(() =>
  import("./pages/recovery/DeletedItems")
);

/* =====================================================
   PAGE LOADER
===================================================== */

function PageLoader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            border: "4px solid #e2e8f0",
            borderTop: "4px solid #2563eb",
            borderRadius: "50%",
            animation: "shivshambho-spin 0.8s linear infinite",
          }}
        />

        <span
          style={{
            fontSize: "14px",
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          Loading...
        </span>
      </div>

      <style>
        {`
          @keyframes shivshambho-spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}

/* =====================================================
   APP
===================================================== */

function App() {
  return (
    <>
      {/* =================================================
          GLOBAL TOAST
      ================================================= */}

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
        }}
      />

      {/* =================================================
          LAZY LOADED ROUTES
      ================================================= */}

      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* =================================================
              PUBLIC AUTH ROUTES
          ================================================= */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password/:requestId"
            element={<ResetPassword />}
          />

          {/* =================================================
              EMPLOYEE PAYMENT
          ================================================= */}

          <Route
            path="/employee/payment"
            element={
              <EmployeeRoute>
                <EmployeePayment />
              </EmployeeRoute>
            }
          />

          {/* =================================================
              NORMAL PUMP APPLICATION
          ================================================= */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  "owner",
                  "manager",
                ]}
              >
                <DashboardLayout />
              </ProtectedRoute>
            }
          >

            {/* =================================================
                DASHBOARD
            ================================================= */}

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* =================================================
                FUEL
            ================================================= */}

            <Route
              path="/fuel"
              element={<FuelStock />}
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
              element={<AddFuelPurchase />}
            />

            <Route
              path="/fuel/purchases"
              element={<FuelPurchaseHistory />}
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
              element={<FuelPrice />}
            />

            {/* =================================================
                NOZZLES
            ================================================= */}

            <Route
              path="/nozzle"
              element={<NozzleList />}
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
              element={<AddReading />}
            />

            <Route
              path="/nozzle/readings"
              element={<ReadingHistory />}
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

            {/* =================================================
                SALES
            ================================================= */}

            <Route
              path="/sales"
              element={<DailySales />}
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
              element={<SalesHistory />}
            />

            <Route
              path="/sales/payments"
              element={<PaymentSummary />}
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

            {/* =================================================
                EXPENSES
            ================================================= */}

            <Route
              path="/expenses"
              element={<AddExpense />}
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
              element={<ExpenseHistory />}
            />

            {/* =================================================
                LEDGER
            ================================================= */}

            <Route
              path="/ledger"
              element={<Customers />}
            />

            <Route
              path="/ledger/customers"
              element={<Customers />}
            />

            <Route
              path="/ledger/customer/:customerId"
              element={<CustomerLedger />}
            />

            {/* Backward-compatible route */}

            <Route
              path="/ledger/customer"
              element={<CustomerLedger />}
            />

            <Route
              path="/ledger/payment"
              element={<Payments />}
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
              element={<PendingCredit />}
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

            {/* =================================================
                REPORTS
            ================================================= */}

            <Route
              path="/reports"
              element={<DailyReport />}
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
              element={<WeeklyReport />}
            />

            <Route
              path="/reports/monthly"
              element={<MonthlyReport />}
            />

            <Route
              path="/reports/custom"
              element={<CustomReport />}
            />

            {/* =================================================
                SETTINGS
            ================================================= */}

            <Route
              path="/settings"
              element={<PumpSettings />}
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
              element={<FuelSettings />}
            />

            <Route
              path="/settings/payment"
              element={<PaymentSettings />}
            />

            <Route
              path="/settings/users"
              element={<UserManagement />}
            />

            {/* =================================================
                RECOVERY
            ================================================= */}

            <Route
              path="/settings/recovery"
              element={<DeletedItems />}
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

            {/* Super Admin Dashboard */}

            <Route
              path="/superadmin"
              element={<SuperAdminDashboard />}
            />

            {/* Registration Requests */}

            <Route
              path="/superadmin/requests"
              element={<SuperAdminRequests />}
            />

            {/* Password Reset Requests */}

            <Route
              path="/superadmin/password-requests"
              element={
                <SuperAdminPasswordRequests />
              }
            />

            {/* Clients */}

            <Route
              path="/superadmin/clients"
              element={<Clients />}
            />

            {/* Users */}

            <Route
              path="/superadmin/users"
              element={<SuperAdminUsers />}
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
              UNKNOWN ROUTES
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
      </Suspense>
    </>
  );
}

export default App;