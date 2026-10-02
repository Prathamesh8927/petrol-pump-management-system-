import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { AuthContext } from "../../context/AuthContext";
import {
  cancelEmployeePayment,
  createEmployeePayment,
  getEmployeePaymentStatus,
} from "../../services/paymentService";

const STORAGE_KEY = "shivshambho_active_payment";
const POLL_INTERVAL = 2500;

const getStoredPayment = () => {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const EmployeePayment = () => {
  const navigate = useNavigate();
  const { logout, user } = useContext(AuthContext);

  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState(getStoredPayment);
  const [loading, setLoading] = useState(false);

  const requestRef = useRef(false);
  const mountedRef = useRef(true);

  const status = payment?.status || "idle";

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (payment?.id) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(payment)
      );
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [payment]);

  /*
   * Poll backend while payment is pending.
   *
   * IMPORTANT:
   * We never mark a payment as paid from the frontend.
   * The backend verifies Razorpay status.
   */
  useEffect(() => {
    if (!payment?.id || payment.status !== "pending") {
      return undefined;
    }

    let active = true;

    const checkStatus = async () => {
      if (requestRef.current) return;

      requestRef.current = true;

      try {
        // FIX:
        // "awaitgetEmployeePaymentStatus" was invalid.
        const response = await getEmployeePaymentStatus(
          payment.id
        );

        if (
          active &&
          mountedRef.current &&
          response?.payment
        ) {
          const nextPayment = response.payment;

          setPayment(nextPayment);

          if (nextPayment.status === "paid") {
            toast.success("Payment received successfully.");
          } else if (
            nextPayment.status === "expired"
          ) {
            toast.error("Payment expired.");
          } else if (
            nextPayment.status === "cancelled"
          ) {
            toast.error("Payment cancelled.");
          } else if (
            nextPayment.status === "failed"
          ) {
            toast.error(
              nextPayment.failureReason ||
                "Payment failed."
            );
          }
        }
      } catch (error) {
        console.error(
          "EMPLOYEE PAYMENT STATUS ERROR:",
          error
        );

        if (active && mountedRef.current) {
          const responseStatus =
            error?.response?.status;

          if (
            [401, 403, 404].includes(
              responseStatus
            )
          ) {
            setPayment(null);

            toast.error(
              "This payment is no longer available."
            );
          }
        }
      } finally {
        requestRef.current = false;
      }
    };

    checkStatus();

    const timer = window.setInterval(
      checkStatus,
      POLL_INTERVAL
    );

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [payment?.id, payment?.status]);

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);

    logout();

    navigate("/login", {
      replace: true,
    });
  };

  const handleCreatePayment = async (event) => {
    event.preventDefault();

    if (
      loading ||
      payment?.status === "pending"
    ) {
      return;
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (numericAmount > 1000000) {
      toast.error(
        "Amount cannot exceed ₹10,00,000."
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await createEmployeePayment(
          numericAmount
        );

      if (!response?.payment?.id) {
        throw new Error(
          "Invalid payment response."
        );
      }

      setPayment(response.payment);

      toast.success(
        "Payment QR generated."
      );
    } catch (error) {
      console.error(
        "EMPLOYEE PAYMENT ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Unable to create payment. Please try again."
      );
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCancel = async () => {
    if (!payment?.id || loading) {
      return;
    }

    try {
      setLoading(true);

      await cancelEmployeePayment(
        payment.id
      );

      setPayment(null);
      setAmount("");

      toast.success(
        "Payment cancelled."
      );
    } catch (error) {
      console.error(
        "CANCEL EMPLOYEE PAYMENT ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Unable to cancel payment."
      );
    } finally {
      setLoading(false);
    }
  };

  const receiveAnother = () => {
    setPayment(null);
    setAmount("");
  };

  return (
    <main className="employee-payment-page">
      <header className="employee-payment-header">
        <div>
          <p className="employee-brand">
            SHIVSHAMBHO
          </p>

          <p className="employee-subtitle">
            Receive Payment
          </p>
        </div>

        <button
          type="button"
          className="employee-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <section
        className="employee-payment-card"
        aria-live="polite"
      >
        {status === "idle" && (
          <form onSubmit={handleCreatePayment}>
            <label htmlFor="employee-payment-amount">
              Amount
            </label>

            <div className="employee-amount-input">
              <span>₹</span>

              <input
                id="employee-payment-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                max="1000000"
                step="0.01"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="0.00"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="employee-primary-button"
              disabled={loading}
            >
              {loading
                ? "Creating payment..."
                : "Generate QR"}
            </button>
          </form>
        )}

        {status === "pending" && (
          <div className="employee-payment-active">
            <p className="employee-section-label">
              PAYMENT
            </p>

            <h1>
              ₹{formatAmount(payment.amount)}
            </h1>

            {payment.qrImageUrl ? (
              <img
                className="employee-payment-qr"
                src={payment.qrImageUrl}
                alt="Dynamic payment QR code"
              />
            ) : (
              <p className="employee-error">
                QR is unavailable. Please cancel
                and try again.
              </p>
            )}

            <h2>
              Scan &amp; Pay using UPI
            </h2>

            <p className="employee-waiting">
              Checking payment...
            </p>

            <p className="employee-payment-id">
              Payment ID:{" "}
              {payment.id}
            </p>

            <button
              type="button"
              className="employee-secondary-button"
              onClick={handleCancel}
              disabled={loading}
            >
              {loading
                ? "Cancelling..."
                : "Cancel"}
            </button>
          </div>
        )}

        {status === "paid" && (
          <div className="employee-success">
            <div className="employee-success-icon">
              ✓
            </div>

            <p className="employee-section-label">
              PAYMENT SUCCESSFUL
            </p>

            <h1>
              ₹{formatAmount(payment.amount)}
            </h1>

            <p>
              Payment received successfully.
            </p>

            <p className="employee-transaction">
              Transaction ID:{" "}
              {payment.providerPaymentId ||
                "Confirmed"}
            </p>

            <button
              type="button"
              className="employee-primary-button"
              onClick={receiveAnother}
            >
              Receive Another Payment
            </button>
          </div>
        )}

        {![
          "idle",
          "pending",
          "paid",
        ].includes(status) && (
          <div className="employee-error-state">
            <h2>
              {status === "expired"
                ? "Payment Expired"
                : status === "cancelled"
                ? "Payment Cancelled"
                : "Payment Failed"}
            </h2>

            <p>
              {status === "expired"
                ? "Please generate a new QR."
                : payment?.failureReason ||
                  "Please try again."}
            </p>

            <button
              type="button"
              className="employee-primary-button"
              onClick={receiveAnother}
            >
              Generate Another Payment
            </button>
          </div>
        )}
      </section>

      <p className="employee-user-label">
        {user?.name ||
          user?.email ||
          "Employee"}
      </p>
    </main>
  );
};

export default EmployeePayment;