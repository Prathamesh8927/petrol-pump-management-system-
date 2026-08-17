import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  ArrowLeft,
  Plus,
  IndianRupee,
} from "lucide-react";

import ProfessionalSearch from "../../components/ProfessionalSearch";

import {
  addLedgerCustomer,
  getLedgerCustomers,
  getCustomerLedgerHistory,
  addCustomerPurchase,
  addLedgerPayment,
  updateLedgerCustomer,
} from "../../services/ledgerService";

const CustomerLedger = () => {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const customerId =
    searchParams.get("id");

  const editMode =
    searchParams.get("edit") === "true";

  const isExistingCustomer =
    Boolean(customerId);

  /* =====================================================
     PREVIOUS CUSTOMERS
  ===================================================== */

  const [
    previousCustomers,
    setPreviousCustomers,
  ] = useState([]);

  const [
    showNameSuggestions,
    setShowNameSuggestions,
  ] = useState(false);

  const [
    selectedExistingCustomer,
    setSelectedExistingCustomer,
  ] = useState(null);

  /* =====================================================
     CUSTOMER
  ===================================================== */

  const [
    customer,
    setCustomer,
  ] = useState(null);

  const [
    customerForm,
    setCustomerForm,
  ] = useState({
    name: "",
    phone: "",
    vehicleNumber: "",
    address: "",
    note: "",
  });

  /* =====================================================
     LEDGER HISTORY
  ===================================================== */

  const [
    entries,
    setEntries,
  ] = useState([]);

  const [
    summary,
    setSummary,
  ] = useState({
    totalPurchased: 0,
    totalPaid: 0,
    totalPending: 0,
    purchaseCount: 0,
  });

  /* =====================================================
     PURCHASE
  ===================================================== */

  const [
    purchaseForm,
    setPurchaseForm,
  ] = useState({
    fuelType: "petrol",
    totalAmount: "",
    paidAmount: "0",

    entryDate:
      new Date().toLocaleDateString(
        "en-CA"
      ),

    note: "",
  });

  /* =====================================================
     PAYMENT
  ===================================================== */

  const [
    paymentForm,
    setPaymentForm,
  ] = useState({
    amount: "",

    entryDate:
      new Date().toLocaleDateString(
        "en-CA"
      ),

    note: "",
  });

  /* =====================================================
     UI
  ===================================================== */

  const [
    showPurchase,
    setShowPurchase,
  ] = useState(false);

  const [
    showPayment,
    setShowPayment,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(
    isExistingCustomer
  );

  /* =====================================================
     MONEY
  ===================================================== */

  const money = (value) =>
    Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );

  /* =====================================================
     LOAD PREVIOUS CUSTOMERS
  ===================================================== */

  const loadPreviousCustomers =
    async () => {
      try {
        const data =
          await getLedgerCustomers();

        setPreviousCustomers(
          data?.customers || []
        );
      } catch (error) {
        console.error(
          "CUSTOMER SUGGESTION ERROR:",
          error
        );
      }
    };

  useEffect(() => {
    loadPreviousCustomers();
  }, []);

  /* =====================================================
     CUSTOMER SUGGESTIONS
  ===================================================== */

  const customerSuggestions =
    useMemo(() => {
      const value =
        customerForm.name
          .trim()
          .toLowerCase();

      if (!value) {
        return [];
      }

      return previousCustomers
        .filter(
          (item) =>
            String(
              item.name || ""
            )
              .toLowerCase()
              .includes(value)
        )
        .slice(0, 8);
    }, [
      customerForm.name,
      previousCustomers,
    ]);

  /* =====================================================
     LOAD CUSTOMER LEDGER
  ===================================================== */

  const loadLedger =
    async () => {
      if (!customerId) {
        return;
      }

      try {
        setLoading(true);

        const data =
          await getCustomerLedgerHistory(
            customerId
          );

        setCustomer(
          data?.customer || null
        );

        setEntries(
          data?.entries || []
        );

        setSummary({
          totalPurchased:
            Number(
              data?.summary
                ?.totalPurchased || 0
            ),

          totalPaid:
            Number(
              data?.summary
                ?.totalPaid || 0
            ),

          totalPending:
            Number(
              data?.summary
                ?.totalPending || 0
            ),

          purchaseCount:
            Number(
              data?.summary
                ?.purchaseCount || 0
            ),
        });

        setCustomerForm({
          name:
            data?.customer
              ?.name || "",

          phone:
            data?.customer
              ?.phone || "",

          vehicleNumber:
            data?.customer
              ?.vehicleNumber || "",

          address:
            data?.customer
              ?.address || "",

          note:
            data?.customer
              ?.note || "",
        });
      } catch (error) {
        console.error(
          "LOAD CUSTOMER LEDGER ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load customer ledger"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadLedger();
  }, [customerId]);

  /* =====================================================
     CREATE CUSTOMER
  ===================================================== */

  const handleCreateCustomer =
    async (event) => {
      event.preventDefault();

      if (!customerForm.name.trim()) {
        toast.error(
          "Customer name is required"
        );

        return;
      }

      if (
        selectedExistingCustomer?._id
      ) {
        navigate(
          `/ledger/customer?id=${selectedExistingCustomer._id}`
        );

        return;
      }

      const duplicate =
        previousCustomers.find(
          (item) => {
            const sameName =
              String(
                item.name || ""
              )
                .trim()
                .toLowerCase() ===
              customerForm.name
                .trim()
                .toLowerCase();

            const samePhone =
              customerForm.phone
                ?.trim() &&
              item.phone?.trim() &&
              customerForm.phone.trim() ===
                item.phone.trim();

            return (
              sameName ||
              samePhone
            );
          }
        );

      if (duplicate) {
        const openExisting =
          window.confirm(
            `${duplicate.name} already exists.\n\nOpen existing ledger?`
          );

        if (openExisting) {
          navigate(
            `/ledger/customer?id=${duplicate._id}`
          );
        }

        return;
      }

      try {
        const data =
          await addLedgerCustomer(
            customerForm
          );

        toast.success(
          "Customer added successfully"
        );

        await loadPreviousCustomers();

        navigate(
          `/ledger/customer?id=${data.customer._id}`,
          {
            replace: true,
          }
        );
      } catch (error) {
        const existing =
          error.response?.data
            ?.customer;

        if (
          error.response?.status ===
            409 &&
          existing?._id
        ) {
          toast.error(
            "Customer already exists"
          );

          navigate(
            `/ledger/customer?id=${existing._id}`
          );

          return;
        }

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to add customer"
        );
      }
    };

  /* =====================================================
     UPDATE CUSTOMER
  ===================================================== */

  const handleUpdateCustomer =
    async (event) => {
      event.preventDefault();

      try {
        await updateLedgerCustomer(
          customerId,
          customerForm
        );

        toast.success(
          "Customer updated successfully"
        );

        await loadPreviousCustomers();

        navigate(
          `/ledger/customer?id=${customerId}`,
          {
            replace: true,
          }
        );

        await loadLedger();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to update customer"
        );
      }
    };

  /* =====================================================
     ADD PURCHASE
  ===================================================== */

  const handleAddPurchase =
    async (event) => {
      event.preventDefault();

      const total =
        Number(
          purchaseForm.totalAmount
        );

      const paid =
        Number(
          purchaseForm.paidAmount ||
            0
        );

      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {
        toast.error(
          "Enter valid total amount"
        );

        return;
      }

      if (
        !Number.isFinite(paid) ||
        paid < 0 ||
        paid > total
      ) {
        toast.error(
          "Paid amount cannot exceed total amount"
        );

        return;
      }

      try {
        await addCustomerPurchase(
          customerId,
          purchaseForm
        );

        toast.success(
          "Purchase added successfully"
        );

        setPurchaseForm({
          fuelType: "petrol",
          totalAmount: "",
          paidAmount: "0",

          entryDate:
            new Date().toLocaleDateString(
              "en-CA"
            ),

          note: "",
        });

        setShowPurchase(false);

        await loadLedger();

        await loadPreviousCustomers();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to add purchase"
        );
      }
    };

  /* =====================================================
     ADD PAYMENT
  ===================================================== */

  const handleAddPayment =
    async (event) => {
      event.preventDefault();

      const amount =
        Number(
          paymentForm.amount
        );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        toast.error(
          "Enter valid payment amount"
        );

        return;
      }

      try {
        await addLedgerPayment({
          customerId,

          amount,

          entryDate:
            paymentForm.entryDate,

          note:
            paymentForm.note,
        });

        toast.success(
          "Payment added successfully"
        );

        setPaymentForm({
          amount: "",

          entryDate:
            new Date().toLocaleDateString(
              "en-CA"
            ),

          note: "",
        });

        setShowPayment(false);

        await loadLedger();

        await loadPreviousCustomers();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to add payment"
        );
      }
    };

  /* =====================================================
     NEW CUSTOMER PAGE
  ===================================================== */

  if (!isExistingCustomer) {
    return (
      <div className="page-container">

        {/* PAGE HEADER */}

        <div className="page-header">

          <div>
            <h1>
              Add Ledger Customer
            </h1>

            <p>
              Add a new customer or
              select an existing customer
              from suggestions.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate("/ledger")
            }
          >
            <ArrowLeft size={17} />
            Back
          </button>

        </div>

        {/* =================================================
            CENTERED CUSTOMER FORM
        ================================================= */}

        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            boxSizing: "border-box",
          }}
        >

          <div
            className="content-panel"
            style={{
              width: "100%",
              maxWidth: "650px",
              marginLeft: "auto",
              marginRight: "auto",
              boxSizing: "border-box",
            }}
          >

            <div className="content-panel-body">

              <form
                onSubmit={
                  handleCreateCustomer
                }
                className="clean-form"
                style={{
                  width: "100%",
                  maxWidth: "none",
                  margin: 0,
                }}
              >

                {/* CUSTOMER NAME */}

                <div className="form-group">

                  <label>
                    Customer Name *
                  </label>

                  <ProfessionalSearch
                    type="customer"

                    value={
                      customerForm.name
                    }

                    placeholder="Enter customer name..."

                    onChange={(value) => {
                      setCustomerForm(
                        (previous) => ({
                          ...previous,

                          name: value,
                        })
                      );

                      setSelectedExistingCustomer(
                        null
                      );

                      setShowNameSuggestions(
                        Boolean(
                          value.trim()
                        )
                      );
                    }}

                    showSuggestions={
                      showNameSuggestions &&
                      Boolean(
                        customerForm.name.trim()
                      )
                    }

                    suggestions={
                      customerSuggestions
                    }

                    getTitle={(item) =>
                      item.name
                    }

                    getSubtitle={(item) =>
                      [
                        item.phone,
                        item.vehicleNumber,
                      ]
                        .filter(Boolean)
                        .join(" • ")
                    }

                    onFocus={() => {
                      if (
                        customerForm.name.trim()
                      ) {
                        setShowNameSuggestions(
                          true
                        );
                      }
                    }}

                    onBlur={() => {
                      setTimeout(
                        () =>
                          setShowNameSuggestions(
                            false
                          ),
                        150
                      );
                    }}

                    onClear={() => {
                      setCustomerForm(
                        (previous) => ({
                          ...previous,

                          name: "",
                        })
                      );

                      setSelectedExistingCustomer(
                        null
                      );

                      setShowNameSuggestions(
                        false
                      );
                    }}

                    onSelect={(item) => {
                      setCustomerForm({
                        name:
                          item.name ||
                          "",

                        phone:
                          item.phone ||
                          "",

                        vehicleNumber:
                          item.vehicleNumber ||
                          "",

                        address:
                          item.address ||
                          "",

                        note:
                          item.note ||
                          "",
                      });

                      setSelectedExistingCustomer(
                        item
                      );

                      setShowNameSuggestions(
                        false
                      );
                    }}
                  />

                </div>

                {/* SELECTED EXISTING CUSTOMER */}

                {selectedExistingCustomer && (

                  <div
                    style={{
                      marginBottom:
                        "16px",

                      padding:
                        "12px 14px",

                      border:
                        "1px solid #bbf7d0",

                      borderRadius:
                        "9px",

                      background:
                        "#f0fdf4",

                      color:
                        "#166534",

                      fontSize:
                        "13px",
                    }}
                  >
                    Existing customer selected:{" "}

                    <strong>
                      {
                        selectedExistingCustomer.name
                      }
                    </strong>

                    . Continue to open the
                    existing ledger.
                  </div>

                )}

                {/* PHONE + VEHICLE */}

                <div className="form-row">

                  <div className="form-group">

                    <label>
                      Phone
                    </label>

                    <input
                      type="text"
                      value={
                        customerForm.phone
                      }
                      onChange={(e) =>
                        setCustomerForm(
                          (previous) => ({
                            ...previous,

                            phone:
                              e.target
                                .value,
                          })
                        )
                      }
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Vehicle Number
                    </label>

                    <input
                      type="text"
                      value={
                        customerForm.vehicleNumber
                      }
                      onChange={(e) =>
                        setCustomerForm(
                          (previous) => ({
                            ...previous,

                            vehicleNumber:
                              e.target
                                .value,
                          })
                        )
                      }
                    />

                  </div>

                </div>

                {/* ADDRESS */}

                <div className="form-group">

                  <label>
                    Address
                  </label>

                  <input
                    type="text"
                    value={
                      customerForm.address
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,

                          address:
                            e.target
                              .value,
                        })
                      )
                    }
                  />

                </div>

                {/* NOTE */}

                <div className="form-group">

                  <label>
                    Note
                  </label>

                  <textarea
                    rows="3"
                    value={
                      customerForm.note
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,

                          note:
                            e.target
                              .value,
                        })
                      )
                    }
                  />

                </div>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {selectedExistingCustomer
                    ? "Open Existing Ledger"
                    : "Add Customer"}
                </button>

              </form>

            </div>

          </div>

        </div>

      </div>
    );
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="page-container">
        Loading customer ledger...
      </div>
    );
  }

  /* =====================================================
     EXISTING CUSTOMER
  ===================================================== */

  return (
    <div className="page-container">

      {/* HEADER */}

      <div className="page-header">

        <div>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate("/ledger")
            }
            style={{
              marginBottom: "10px",
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <h1>
            {customer?.name ||
              "Customer Ledger"}
          </h1>

          <p>
            Complete purchase and
            payment history.
          </p>

        </div>

        {!editMode && (

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setShowPurchase(
                  !showPurchase
                );

                setShowPayment(false);
              }}
            >
              <Plus size={17} />
              Add Purchase
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={
                summary.totalPending <= 0
              }
              onClick={() => {
                setShowPayment(
                  !showPayment
                );

                setShowPurchase(false);
              }}
            >
              <IndianRupee size={17} />
              Add Payment
            </button>

          </div>

        )}

      </div>

      {/* =================================================
          EDIT CUSTOMER
      ================================================= */}

      {editMode && (

        <div className="content-panel">

          <div className="content-panel-body">

            <h2>
              Edit Customer
            </h2>

            <form
              onSubmit={
                handleUpdateCustomer
              }
            >

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Name
                  </label>

                  <input
                    value={
                      customerForm.name
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,

                          name:
                            e.target
                              .value,
                        })
                      )
                    }
                  />

                </div>

                <div className="form-group">

                  <label>
                    Phone
                  </label>

                  <input
                    value={
                      customerForm.phone
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,

                          phone:
                            e.target
                              .value,
                        })
                      )
                    }
                  />

                </div>

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Vehicle Number
                  </label>

                  <input
                    value={
                      customerForm.vehicleNumber
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,

                          vehicleNumber:
                            e.target
                              .value,
                        })
                      )
                    }
                  />

                </div>

                <div className="form-group">

                  <label>
                    Address
                  </label>

                  <input
                    value={
                      customerForm.address
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,

                          address:
                            e.target
                              .value,
                        })
                      )
                    }
                  />

                </div>

              </div>

              <button
                type="submit"
                className="primary-button"
              >
                Save Changes
              </button>

            </form>

          </div>

        </div>

      )}

      {!editMode && (
        <>

          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="stats-grid">

            <div className="stat-card">
              <h4>Purchases</h4>

              <h2>
                {
                  summary.purchaseCount
                }
              </h2>
            </div>

            <div className="stat-card">
              <h4>
                Total Purchase
              </h4>

              <h2>
                ₹{" "}
                {money(
                  summary.totalPurchased
                )}
              </h2>
            </div>

            <div className="stat-card">
              <h4>
                Total Paid
              </h4>

              <h2>
                ₹{" "}
                {money(
                  summary.totalPaid
                )}
              </h2>
            </div>

            <div className="stat-card">
              <h4>
                Pending
              </h4>

              <h2>
                ₹{" "}
                {money(
                  summary.totalPending
                )}
              </h2>
            </div>

          </div>

          {/* =================================================
              ADD PURCHASE
          ================================================= */}

          {showPurchase && (

            <div className="content-panel">

              <div className="content-panel-body">

                <h2>
                  Add New Purchase
                </h2>

                <p
                  style={{
                    marginBottom: "20px",
                  }}
                >
                  Customer:{" "}

                  <strong>
                    {customer?.name}
                  </strong>
                </p>

                <form
                  onSubmit={
                    handleAddPurchase
                  }
                >

                  <div className="form-row">

                    <div className="form-group">

                      <label>
                        Fuel Type *
                      </label>

                      <select
                        value={
                          purchaseForm.fuelType
                        }
                        onChange={(e) =>
                          setPurchaseForm(
                            (previous) => ({
                              ...previous,

                              fuelType:
                                e.target
                                  .value,
                            })
                          )
                        }
                      >
                        <option value="petrol">
                          Petrol
                        </option>

                        <option value="diesel">
                          Diesel
                        </option>
                      </select>

                    </div>

                    <div className="form-group">

                      <label>
                        Purchase Date *
                      </label>

                      <input
                        type="date"
                        value={
                          purchaseForm.entryDate
                        }
                        onChange={(e) =>
                          setPurchaseForm(
                            (previous) => ({
                              ...previous,

                              entryDate:
                                e.target
                                  .value,
                            })
                          )
                        }
                      />

                    </div>

                  </div>

                  <div className="form-row">

                    <div className="form-group">

                      <label>
                        Total Amount *
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          purchaseForm.totalAmount
                        }
                        onChange={(e) =>
                          setPurchaseForm(
                            (previous) => ({
                              ...previous,

                              totalAmount:
                                e.target
                                  .value,
                            })
                          )
                        }
                      />

                    </div>

                    <div className="form-group">

                      <label>
                        Paid Amount
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          purchaseForm.paidAmount
                        }
                        onChange={(e) =>
                          setPurchaseForm(
                            (previous) => ({
                              ...previous,

                              paidAmount:
                                e.target
                                  .value,
                            })
                          )
                        }
                      />

                    </div>

                  </div>

                  {Number(
                    purchaseForm.totalAmount ||
                      0
                  ) > 0 && (

                    <div
                      style={{
                        marginBottom:
                          "16px",

                        padding:
                          "13px 15px",

                        background:
                          "#f8fafc",

                        border:
                          "1px solid #e2e8f0",

                        borderRadius:
                          "9px",
                      }}
                    >
                      Pending for this purchase:{" "}

                      <strong>
                        ₹{" "}
                        {money(
                          Math.max(
                            Number(
                              purchaseForm.totalAmount ||
                                0
                            ) -
                              Number(
                                purchaseForm.paidAmount ||
                                  0
                              ),
                            0
                          )
                        )}
                      </strong>
                    </div>

                  )}

                  <div className="form-group">

                    <label>
                      Note
                    </label>

                    <textarea
                      rows="3"
                      value={
                        purchaseForm.note
                      }
                      onChange={(e) =>
                        setPurchaseForm(
                          (previous) => ({
                            ...previous,

                            note:
                              e.target
                                .value,
                          })
                        )
                      }
                    />

                  </div>

                  <button
                    type="submit"
                    className="primary-button"
                  >
                    Save Purchase
                  </button>

                </form>

              </div>

            </div>

          )}

          {/* =================================================
              ADD PAYMENT
          ================================================= */}

          {showPayment && (

            <div className="content-panel">

              <div className="content-panel-body">

                <h2>
                  Add Payment
                </h2>

                <p
                  style={{
                    marginBottom: "20px",
                  }}
                >
                  Current Pending:{" "}

                  <strong>
                    ₹{" "}
                    {money(
                      summary.totalPending
                    )}
                  </strong>
                </p>

                <form
                  onSubmit={
                    handleAddPayment
                  }
                >

                  <div className="form-row">

                    <div className="form-group">

                      <label>
                        Payment Amount *
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        max={
                          summary.totalPending
                        }
                        step="0.01"
                        value={
                          paymentForm.amount
                        }
                        onChange={(e) =>
                          setPaymentForm(
                            (previous) => ({
                              ...previous,

                              amount:
                                e.target
                                  .value,
                            })
                          )
                        }
                      />

                    </div>

                    <div className="form-group">

                      <label>
                        Payment Date *
                      </label>

                      <input
                        type="date"
                        value={
                          paymentForm.entryDate
                        }
                        onChange={(e) =>
                          setPaymentForm(
                            (previous) => ({
                              ...previous,

                              entryDate:
                                e.target
                                  .value,
                            })
                          )
                        }
                      />

                    </div>

                  </div>

                  <div className="form-group">

                    <label>
                      Note
                    </label>

                    <textarea
                      rows="3"
                      value={
                        paymentForm.note
                      }
                      onChange={(e) =>
                        setPaymentForm(
                          (previous) => ({
                            ...previous,

                            note:
                              e.target
                                .value,
                          })
                        )
                      }
                    />

                  </div>

                  <button
                    type="submit"
                    className="primary-button"
                  >
                    Save Payment
                  </button>

                </form>

              </div>

            </div>

          )}

          {/* =================================================
              COMPLETE LEDGER
          ================================================= */}

          <div className="content-panel">

            <div className="content-panel-header">

              <div>
                <h2>
                  Complete Ledger
                </h2>

                <p>
                  Complete customer purchase
                  and payment history.
                </p>
              </div>

            </div>

            <div className="table-container">

              <table>

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Fuel</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Payment</th>
                    <th>Note</th>
                  </tr>
                </thead>

                <tbody>

                  {entries.length === 0 ? (

                    <tr>
                      <td
                        colSpan="9"
                        className="empty-table"
                      >
                        No transactions found.
                      </td>
                    </tr>

                  ) : (

                    entries.map(
                      (
                        entry,
                        index
                      ) => (

                        <tr
                          key={
                            entry._id
                          }
                        >

                          <td>
                            {index + 1}
                          </td>

                          <td>
                            {entry.entryDate ||
                              "-"}
                          </td>

                          <td>
                            {entry.entryType ===
                            "purchase"
                              ? "Purchase"
                              : "Payment"}
                          </td>

                          <td>
                            {entry.entryType ===
                            "purchase"
                              ? String(
                                  entry.fuelType ||
                                    ""
                                ).toLowerCase() ===
                                "petrol"
                                ? "Petrol"
                                : "Diesel"
                              : "-"}
                          </td>

                          <td>
                            {entry.entryType ===
                            "purchase"
                              ? `₹ ${money(
                                  entry.totalAmount
                                )}`
                              : "-"}
                          </td>

                          <td>
                            {entry.entryType ===
                            "purchase"
                              ? `₹ ${money(
                                  entry.paidAmount
                                )}`
                              : "-"}
                          </td>

                          <td>
                            {entry.entryType ===
                            "purchase"
                              ? `₹ ${money(
                                  entry.pendingAmount
                                )}`
                              : "-"}
                          </td>

                          <td>
                            {entry.entryType ===
                            "payment"
                              ? `₹ ${money(
                                  entry.paymentAmount
                                )}`
                              : "-"}
                          </td>

                          <td>
                            {entry.note ||
                              "-"}
                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </>
      )}

    </div>
  );
};

export default CustomerLedger;