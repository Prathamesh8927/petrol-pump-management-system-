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

  const handleChange = (event) => {
    const { name, value } = event.target;

    let nextValue = value;

    /* ===============================================
       PHONE
    =============================================== */

    if (name === "phone") {
      nextValue = value
        .replace(/\D/g, "")
        .slice(0, 10);
    }

    /* ===============================================
       PINCODE
    =============================================== */

    if (name === "pincode") {
      nextValue = value
        .replace(/\D/g, "")
        .slice(0, 6);
    }

    /* ===============================================
       GSTIN
    =============================================== */

    if (name === "gstin") {
      nextValue = value
        .replace(/\s/g, "")
        .toUpperCase()
        .slice(0, 15);
    }

    setForm((previous) => ({
      ...previous,
      [name]: nextValue,
    }));
  };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || submitted) {
      return;
    }

    /* ================================================
       NORMALIZE FORM
    ================================================ */

    const cleanForm = {
      ...form,

      name: form.name.trim(),

      email: form.email.trim().toLowerCase(),

      password: form.password,

      phone: form.phone.replace(/\D/g, ""),

      pumpName: form.pumpName.trim(),

      companyName: form.companyName.trim(),

      dealerCode: form.dealerCode
        .trim()
        .toUpperCase(),

      gstin: form.gstin
        .trim()
        .toUpperCase(),

      address: form.address.trim(),

      city: form.city.trim(),

      state: form.state.trim(),

      pincode: form.pincode.replace(/\D/g, ""),

      // Registration always starts on the standard plan.
      // Any paid-plan assignment must be controlled by Super Admin/backend.
      plan: "standard",
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
      toast.error("Please fill all required fields.");
      return;
    }

    /* ================================================
       LENGTH VALIDATION
    ================================================ */

    if (cleanForm.name.length > 100) {
      toast.error("Owner name is too long.");
      return;
    }

    if (cleanForm.email.length > 254) {
      toast.error("Email address is too long.");
      return;
    }

    if (
      cleanForm.password.length < 6 ||
      cleanForm.password.length > 128
    ) {
      toast.error(
        "Password must contain 6 to 128 characters."
      );
      return;
    }

    if (cleanForm.pumpName.length > 200) {
      toast.error("Pump name is too long.");
      return;
    }

    if (cleanForm.companyName.length > 200) {
      toast.error("Company name is too long.");
      return;
    }

    if (cleanForm.dealerCode.length > 50) {
      toast.error("Dealer code is too long.");
      return;
    }

    if (cleanForm.gstin.length > 15) {
      toast.error("GSTIN cannot exceed 15 characters.");
      return;
    }

    if (cleanForm.address.length > 500) {
      toast.error("Address is too long.");
      return;
    }

    if (cleanForm.city.length > 100) {
      toast.error("City name is too long.");
      return;
    }

    if (cleanForm.state.length > 100) {
      toast.error("State name is too long.");
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

    if (cleanForm.phone.length !== 10) {
      toast.error(
        "Please enter a valid 10-digit phone number."
      );
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanForm.phone)) {
      toast.error(
        "Please enter a valid Indian mobile number."
      );
      return;
    }

    /* ================================================
       PINCODE VALIDATION
    ================================================ */

    if (
      cleanForm.pincode &&
      !/^[1-9]\d{5}$/.test(cleanForm.pincode)
    ) {
      toast.error(
        "Please enter a valid 6-digit pincode."
      );
      return;
    }

    /* ================================================
       GSTIN VALIDATION
    ================================================ */

    if (cleanForm.gstin) {
      const gstinRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

      if (!gstinRegex.test(cleanForm.gstin)) {
        toast.error("Please enter a valid GSTIN.");
        return;
      }
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
        error.response?.data?.message ||
          error.message ||
          error
      );

      const errorCode =
        error.response?.data?.code;

      if (
        errorCode === "REGISTRATION_PENDING"
      ) {
        toast.error(
          "A registration request for this email is already pending."
        );
        return;
      }

      if (errorCode === "ACCOUNT_EXISTS") {
        toast.error(
          "An account with this email already exists."
        );
        return;
      }

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
              SS
            </div>

            <div>
              <h2>ShivShambho</h2>

              <span>
                Petrol Pump Management
              </span>
            </div>
          </div>

          <h1>
            Request Submitted
          </h1>

          <p className="register-success-description">
            Your ShivShambho account registration
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
              SS
            </div>

            <div>
              <h1>
                ShivShambho
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
          noValidate
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
                <label htmlFor="register-name">
                  Owner Name
                  <span>*</span>
                </label>

                <div className="register-input-wrapper">
                  <User size={18} />

                  <input
                    id="register-name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter owner name"
                    autoComplete="name"
                    maxLength={100}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* EMAIL */}

              <div className="register-field">
                <label htmlFor="register-email">
                  Email
                  <span>*</span>
                </label>

                <div className="register-input-wrapper">
                  <Mail size={18} />

                  <input
                    id="register-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="owner@example.com"
                    autoComplete="email"
                    maxLength={254}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* PHONE */}

              <div className="register-field">
                <label htmlFor="register-phone">
                  Phone
                  <span>*</span>
                </label>

                <div className="register-input-wrapper">
                  <Phone size={18} />

                  <input
                    id="register-phone"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={10}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}

              <div className="register-field">
                <label htmlFor="register-password">
                  Password
                  <span>*</span>
                </label>

                <div className="register-input-wrapper">
                  <Lock size={18} />

                  <input
                    id="register-password"
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
                    minLength={6}
                    maxLength={128}
                    disabled={loading}
                    required
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
                <label htmlFor="register-pump-name">
                  Pump Name
                  <span>*</span>
                </label>

                <div className="register-input-wrapper">
                  <Building2 size={18} />

                  <input
                    id="register-pump-name"
                    name="pumpName"
                    value={form.pumpName}
                    onChange={handleChange}
                    placeholder="Enter petrol pump name"
                    maxLength={200}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* COMPANY */}

              <div className="register-field">
                <label htmlFor="register-company">
                  Company Name
                </label>

                <input
                  id="register-company"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="e.g. HPCL, BPCL, IOCL"
                  maxLength={200}
                  disabled={loading}
                />
              </div>

              {/* DEALER CODE */}

              <div className="register-field">
                <label htmlFor="register-dealer-code">
                  Dealer Code
                </label>

                <input
                  id="register-dealer-code"
                  name="dealerCode"
                  value={form.dealerCode}
                  onChange={handleChange}
                  placeholder="Enter dealer code"
                  maxLength={50}
                  disabled={loading}
                />
              </div>

              {/* GSTIN */}

              <div className="register-field">
                <label htmlFor="register-gstin">
                  GSTIN
                </label>

                <input
                  id="register-gstin"
                  name="gstin"
                  value={form.gstin}
                  onChange={handleChange}
                  placeholder="Enter GSTIN"
                  maxLength={15}
                  autoComplete="off"
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
                <label htmlFor="register-address">
                  Full Address
                </label>

                <div className="register-input-wrapper">
                  <MapPin size={18} />

                  <input
                    id="register-address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter complete address"
                    maxLength={500}
                    autoComplete="street-address"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* CITY */}

              <div className="register-field">
                <label htmlFor="register-city">
                  City
                </label>

                <input
                  id="register-city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  maxLength={100}
                  autoComplete="address-level2"
                  disabled={loading}
                />
              </div>

              {/* STATE */}

              <div className="register-field">
                <label htmlFor="register-state">
                  State
                </label>

                <input
                  id="register-state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                  maxLength={100}
                  autoComplete="address-level1"
                  disabled={loading}
                />
              </div>

              {/* PINCODE */}

              <div className="register-field">
                <label htmlFor="register-pincode">
                  Pincode
                </label>

                <input
                  id="register-pincode"
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="postal-code"
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
            disabled={loading || submitted}
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