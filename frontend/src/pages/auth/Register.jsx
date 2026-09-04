import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import api from "../../services/api";

import "./Register.css";

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",

    pumpName: "",
    companyName: "",
    dealerCode: "",
    gstin: "",

    address: "",
    city: "",
    state: "",
    pincode: "",

    plan: "standard",
  });

  /* =====================================================
     HANDLE CHANGE
  ===================================================== */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanForm = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      pumpName: form.pumpName.trim(),
      companyName: form.companyName.trim(),
      dealerCode: form.dealerCode.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
    };

    /* ================================================
       REQUIRED VALIDATION
    ================================================ */

    if (
      !cleanForm.name ||
      !cleanForm.email ||
      !cleanForm.password ||
      !cleanForm.phone ||
      !cleanForm.pumpName
    ) {
      toast.error(
        "Please fill all required fields."
      );

      return;
    }

    if (cleanForm.password.length < 6) {
      toast.error(
        "Password must contain at least 6 characters."
      );

      return;
    }

    /* ================================================
       EMAIL VALIDATION
    ================================================ */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanForm.email)) {
      toast.error(
        "Please enter a valid email address."
      );

      return;
    }

    /* ================================================
       PHONE VALIDATION
    ================================================ */

    const phoneDigits =
      cleanForm.phone.replace(/\D/g, "");

    if (phoneDigits.length !== 10) {
      toast.error(
        "Please enter a valid 10-digit phone number."
      );

      return;
    }

    /* ================================================
       SUBMIT REQUEST
    ================================================ */

    try {
      setLoading(true);

      const response = await api.post(
        "/auth/register",
        cleanForm
      );

      if (response.data?.success) {
        setSubmitted(true);

        toast.success(
          "Registration request submitted!"
        );
      } else {
        toast.error(
          response.data?.message ||
            "Registration request could not be submitted."
        );
      }
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     SUCCESS SCREEN
  ===================================================== */

  if (submitted) {
    return (
      <div className="register-page">

        <div className="register-success-card">

          <div className="register-success-icon">
            <CheckCircle2 size={52} />
          </div>

          <div className="register-success-brand">
            <div className="register-logo">
              MP
            </div>

            <div>
              <h2>MyPump</h2>

              <span>
                Petrol Pump Management
              </span>
            </div>
          </div>

          <h1>
            Request Submitted
          </h1>

          <p className="register-success-description">
            Your MyPump account registration
            request has been submitted successfully.
          </p>

          <div className="register-info-box">

            <div className="register-info-icon">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <strong>
                Waiting for approval
              </strong>

              <span>
                Super Admin will review your
                registration and approve your
                petrol pump account.
              </span>
            </div>

          </div>

          <Link
            to="/login"
            className="register-login-button"
          >
            Go to Login
          </Link>

        </div>

      </div>
    );
  }

  /* =====================================================
     REGISTER PAGE
  ===================================================== */

  return (
    <div className="register-page">

      <div className="register-card">

        {/* ============================================
            TOP
        ============================================ */}

        <div className="register-top">

          <Link
            to="/login"
            className="register-back"
          >
            <ArrowLeft size={17} />

            <span>
              Back to Login
            </span>
          </Link>

        </div>

        {/* ============================================
            HEADER
        ============================================ */}

        <div className="register-header">

          <div className="register-brand">

            <div className="register-logo">
              MP
            </div>

            <div>
              <h1>
                MyPump
              </h1>

              <span>
                Petrol Pump Management
              </span>
            </div>

          </div>

          <div className="register-heading">

            <h2>
              Create Account
            </h2>

            <p>
              Register your petrol pump and
              submit your account for Super
              Admin approval.
            </p>

          </div>

        </div>

        {/* ============================================
            FORM
        ============================================ */}

        <form
          onSubmit={handleSubmit}
          className="register-form"
        >

          {/* ==========================================
              OWNER INFORMATION
          ========================================== */}

          <section className="register-section">

            <div className="register-section-header">

              <div className="register-section-icon">
                <User size={19} />
              </div>

              <div>
                <h3>
                  Owner Information
                </h3>

                <p>
                  Enter the primary account holder details.
                </p>
              </div>

            </div>

            <div className="register-grid">

              {/* OWNER NAME */}

              <div className="register-field">

                <label>
                  Owner Name
                  <span>*</span>
                </label>

                <div className="register-input-wrapper">

                  <User size={18} />

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter owner name"
                    autoComplete="name"
                    disabled={loading}
                  />

                </div>

              </div>

              {/* EMAIL */}

              <div className="register-field">

                <label>
                  Email
                  <span>*</span>
                </label>

                <div className="register-input-wrapper">

                  <Mail size={18} />

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="owner@example.com"
                    autoComplete="email"
                    disabled={loading}
                  />

                </div>

              </div>

              {/* PHONE */}

              <div className="register-field">

                <label>
                  Phone
                  <span>*</span>
                </label>

                <div className="register-input-wrapper">

                  <Phone size={18} />

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                    maxLength={10}
                    disabled={loading}
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div className="register-field">

                <label>
                  Password
                  <span>*</span>
                </label>

                <div className="register-input-wrapper">

                  <Lock size={18} />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </div>

            </div>

          </section>

          {/* ==========================================
              PETROL PUMP INFORMATION
          ========================================== */}

          <section className="register-section">

            <div className="register-section-header">

              <div className="register-section-icon">
                <Building2 size={19} />
              </div>

              <div>
                <h3>
                  Petrol Pump Information
                </h3>

                <p>
                  Provide your petrol pump business details.
                </p>
              </div>

            </div>

            <div className="register-grid">

              {/* PUMP NAME */}

              <div className="register-field">

                <label>
                  Pump Name
                  <span>*</span>
                </label>

                <div className="register-input-wrapper">

                  <Building2 size={18} />

                  <input
                    name="pumpName"
                    value={form.pumpName}
                    onChange={handleChange}
                    placeholder="Enter petrol pump name"
                    disabled={loading}
                  />

                </div>

              </div>

              {/* COMPANY */}

              <div className="register-field">

                <label>
                  Company Name
                </label>

                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="e.g. HPCL, BPCL, IOCL"
                  disabled={loading}
                />

              </div>

              {/* DEALER CODE */}

              <div className="register-field">

                <label>
                  Dealer Code
                </label>

                <input
                  name="dealerCode"
                  value={form.dealerCode}
                  onChange={handleChange}
                  placeholder="Enter dealer code"
                  disabled={loading}
                />

              </div>

              {/* GSTIN */}

              <div className="register-field">

                <label>
                  GSTIN
                </label>

                <input
                  name="gstin"
                  value={form.gstin}
                  onChange={handleChange}
                  placeholder="Enter GSTIN"
                  disabled={loading}
                />

              </div>

            </div>

          </section>

          {/* ==========================================
              ADDRESS
          ========================================== */}

          <section className="register-section">

            <div className="register-section-header">

              <div className="register-section-icon">
                <MapPin size={19} />
              </div>

              <div>
                <h3>
                  Address
                </h3>

                <p>
                  Enter the petrol pump location.
                </p>
              </div>

            </div>

            <div className="register-grid">

              {/* ADDRESS */}

              <div className="register-field register-full">

                <label>
                  Full Address
                </label>

                <div className="register-input-wrapper">

                  <MapPin size={18} />

                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter complete address"
                    disabled={loading}
                  />

                </div>

              </div>

              {/* CITY */}

              <div className="register-field">

                <label>
                  City
                </label>

                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  disabled={loading}
                />

              </div>

              {/* STATE */}

              <div className="register-field">

                <label>
                  State
                </label>

                <input
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                  disabled={loading}
                />

              </div>

              {/* PINCODE */}

              <div className="register-field">

                <label>
                  Pincode
                </label>

                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  disabled={loading}
                />

              </div>

            </div>

          </section>

          {/* ==========================================
              APPROVAL INFORMATION
          ========================================== */}

          <div className="register-approval-box">

            <div className="register-approval-icon">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <strong>
                Super Admin Approval Required
              </strong>

              <p>
                Your account will remain pending
                until a Super Admin reviews and
                approves your registration.
              </p>
            </div>

          </div>

          {/* ==========================================
              SUBMIT
          ========================================== */}

          <button
            type="submit"
            className="register-submit-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="register-spinner"></span>
                Submitting Registration...
              </>
            ) : (
              <>
                <CheckCircle2 size={19} />
                Submit Registration Request
              </>
            )}
          </button>

          {/* ==========================================
              LOGIN
          ========================================== */}

          <p className="register-footer">

            Already have an account?

            <Link to="/login">
              Login
            </Link>

          </p>

        </form>

      </div>

    </div>
  );
};

export default Register;