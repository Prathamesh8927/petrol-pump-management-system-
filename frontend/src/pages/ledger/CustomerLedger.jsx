import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

import api from "../../services/api";

import {
  addLedgerCustomer,
  getLedgerCustomers,
  getCustomerLedgerHistory,
  addCustomerPurchase,
  addCustomerPayment,
  updateLedgerCustomer,
} from "../../services/ledgerService";

import {
  exportLedgerPDF,
} from "../../utils/ledgerExport";

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_SUMMARY = {
  totalPurchased: 0,
  totalPaid: 0,
  totalPending: 0,
  purchaseCount: 0,
};

/* =========================================================
   HELPERS
========================================================= */

const getToday = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isValidDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const money = (value) =>
  safeNumber(value).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

const getErrorMessage = (
  error,
  fallback
) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

/* =========================================================
   LOGO RESOLVER
========================================================= */

const resolveLogoUrl = (
  settings = {}
) => {
  const candidates = [
    settings?.logoUrl,
    settings?.logoURL,
    settings?.companyLogo,
    settings?.pumpLogo,
    settings?.logo?.url,
    settings?.logo?.secure_url,
    settings?.logo?.secureUrl,
    settings?.logo?.path,
    settings?.logo?.src,
    settings?.logo,
  ];

  const resolved = candidates.find(
    (value) =>
      typeof value === "string" &&
      value.trim().length > 0
  );

  return resolved
    ? resolved.trim()
    : null;
};

/* =========================================================
   COMPONENT
========================================================= */

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

  const mountedRef = useRef(true);

  const loadingLedgerRef = useRef(false);
  const loadingCustomersRef =
    useRef(false);
  const submittingRef = useRef(false);

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
  ] = useState(
    EMPTY_SUMMARY
  );

  /* =====================================================
     PUMP SETTINGS
  ===================================================== */

  const [
    pumpSettings,
    setPumpSettings,
  ] = useState(null);

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
    entryDate: getToday(),
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
    entryDate: getToday(),
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

  const [
    saving,
    setSaving,
  ] = useState(false);

  /* =====================================================
     LOAD PUMP SETTINGS
  ===================================================== */

  const loadPumpSettings =
    useCallback(async () => {
      try {
        const response =
          await api.get(
            "/settings/pump"
          );

        const settings =
          response?.settings ||
          response?.data?.settings ||
          response?.data ||
          {};

        const logoUrl =
          resolveLogoUrl(settings);

        const normalizedSettings = {
          ...settings,

          pumpName:
            settings?.pumpName ||
            settings?.name ||
            "Shivshambho",

          ownerName:
            settings?.ownerName ||
            settings?.owner ||
            "",

          companyName:
            settings?.companyName ||
            settings?.oilCompanyName ||
            settings?.oilCompany ||
            "",

          gstin:
            settings?.gstin ||
            settings?.gstNo ||
            "",

          address:
            settings?.address ||
            "",

          city:
            settings?.city ||
            "",

          state:
            settings?.state ||
            "",

          pincode:
            settings?.pincode ||
            settings?.pinCode ||
            "",

          phone:
            settings?.phone ||
            settings?.mobile ||
            settings?.mobileNumber ||
            "",

          email:
            settings?.email ||
            "",

          logoUrl:
            logoUrl || null,

          logo:
            settings?.logo ||
            logoUrl ||
            null,
        };

        if (mountedRef.current) {
          setPumpSettings(
            normalizedSettings
          );
        }
      } catch (error) {
        if (mountedRef.current) {
          setPumpSettings(null);
        }
      }
    }, []);

  /* =====================================================
     LOAD PREVIOUS CUSTOMERS
  ===================================================== */

  const loadPreviousCustomers =
    useCallback(async () => {
      if (
        loadingCustomersRef.current
      ) {
        return;
      }

      loadingCustomersRef.current =
        true;

      try {
        const data =
          await getLedgerCustomers();

        if (!mountedRef.current) {
          return;
        }

        setPreviousCustomers(
          Array.isArray(
            data?.customers
          )
            ? data.customers
            : []
        );
      } catch (error) {
        if (mountedRef.current) {
          setPreviousCustomers([]);
        }
      } finally {
        loadingCustomersRef.current =
          false;
      }
    }, []);

  /* =====================================================
     LOAD CUSTOMER LEDGER
  ===================================================== */

  const loadLedger =
    useCallback(async () => {
      if (!customerId) {
        return;
      }

      if (loadingLedgerRef.current) {
        return;
      }

      loadingLedgerRef.current =
        true;

      if (mountedRef.current) {
        setLoading(true);
      }

      try {
        const data =
          await getCustomerLedgerHistory(
            customerId
          );

        if (!mountedRef.current) {
          return;
        }

        const loadedCustomer =
          data?.customer || null;

        const loadedEntries =
          Array.isArray(
            data?.entries
          )
            ? data.entries
            : [];

        const loadedSummary =
          data?.summary || {};

        setCustomer(
          loadedCustomer
        );

        setEntries(
          loadedEntries
        );

        setSummary({
          totalPurchased:
            safeNumber(
              loadedSummary.totalPurchased
            ),

          totalPaid:
            safeNumber(
              loadedSummary.totalPaid
            ),

          totalPending:
            safeNumber(
              loadedSummary.totalPending
            ),

          purchaseCount:
            safeNumber(
              loadedSummary.purchaseCount
            ),
        });

        setCustomerForm({
          name:
            loadedCustomer?.name ||
            "",

          phone:
            loadedCustomer?.phone ||
            "",

          vehicleNumber:
            loadedCustomer?.vehicleNumber ||
            "",

          address:
            loadedCustomer?.address ||
            "",

          note:
            loadedCustomer?.note ||
            "",
        });
      } catch (error) {
        if (mountedRef.current) {
          toast.error(
            getErrorMessage(
              error,
              "Unable to load customer ledger"
            )
          );
        }
      } finally {
        loadingLedgerRef.current =
          false;

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, [customerId]);

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    mountedRef.current = true;

    loadPumpSettings();
    loadPreviousCustomers();

    if (customerId) {
      loadLedger();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [
    customerId,
    loadLedger,
    loadPreviousCustomers,
    loadPumpSettings,
  ]);

  /* =====================================================
     REFRESH WHEN PAGE BECOMES ACTIVE
  ===================================================== */

  useEffect(() => {
    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          loadPreviousCustomers();

          if (customerId) {
            loadLedger();
          }

          loadPumpSettings();
        }
      };

    const handleFocus = () => {
      loadPreviousCustomers();

      if (customerId) {
        loadLedger();
      }

      loadPumpSettings();
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [
    customerId,
    loadLedger,
    loadPreviousCustomers,
    loadPumpSettings,
  ]);

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
        .filter((item) => {
          const name =
            String(
              item?.name || ""
            )
              .trim()
              .toLowerCase();

          return name.includes(
            value
          );
        })
        .slice(0, 8);
    }, [
      customerForm.name,
      previousCustomers,
    ]);

  /* =====================================================
     EXPORT LEDGER PDF
  ===================================================== */

  const handleExportPDF =
    useCallback(async () => {
      if (!customer) {
        toast.error(
          "Customer ledger is not loaded"
        );

        return;
      }

      if (!pumpSettings) {
        toast.error(
          "Unable to load pump profile"
        );

        return;
      }

      if (saving) {
        return;
      }

      try {
        setSaving(true);

        const logoUrl =
          resolveLogoUrl(
            pumpSettings
          );

        const pump = {
          ...pumpSettings,

          pumpName:
            pumpSettings?.pumpName ||
            pumpSettings?.name ||
            "Shivshambho",

          ownerName:
            pumpSettings?.ownerName ||
            pumpSettings?.owner ||
            "",

          companyName:
            pumpSettings?.companyName ||
            pumpSettings?.oilCompanyName ||
            pumpSettings?.oilCompany ||
            "",

          gstin:
            pumpSettings?.gstin ||
            pumpSettings?.gstNo ||
            "",

          address:
            pumpSettings?.address ||
            "",

          city:
            pumpSettings?.city ||
            "",

          state:
            pumpSettings?.state ||
            "",

          pincode:
            pumpSettings?.pincode ||
            pumpSettings?.pinCode ||
            "",

          phone:
            pumpSettings?.phone ||
            pumpSettings?.mobile ||
            pumpSettings?.mobileNumber ||
            "",

          email:
            pumpSettings?.email ||
            "",

          logoUrl:
            logoUrl || null,

          logo:
            pumpSettings?.logo ||
            logoUrl ||
            null,
        };

        await exportLedgerPDF({
          customer: {
            ...customer,

            entries,

            totalPurchases:
              summary.totalPurchased,

            totalAmount:
              summary.totalPurchased,

            totalPaid:
              summary.totalPaid,

            paidAmount:
              summary.totalPaid,

            totalPending:
              summary.totalPending,

            currentBalance:
              summary.totalPending,
          },

          pump,

          billNo:
            customer?.billNo ||
            customer?.billNumber ||
            customer?.invoiceNo ||
            customer?.invoiceNumber ||
            "",

          billDate:
            customer?.billDate ||
            customer?.invoiceDate ||
            customer?.createdAt ||
            "",

          billFrom:
            customer?.billFrom ||
            "",

          logoUrl:
            logoUrl || null,
        });

        if (mountedRef.current) {
          toast.success(
            "Ledger PDF exported successfully"
          );
        }
      } catch (error) {
        if (mountedRef.current) {
          toast.error(
            getErrorMessage(
              error,
              "Unable to export ledger PDF"
            )
          );
        }
      } finally {
        if (mountedRef.current) {
          setSaving(false);
        }
      }
    }, [
      customer,
      entries,
      pumpSettings,
      saving,
      summary,
    ]);

  /* =====================================================
     CREATE CUSTOMER
  ===================================================== */

  const handleCreateCustomer =
    async (event) => {
      event.preventDefault();

      if (submittingRef.current) {
        return;
      }

      const name =
        customerForm.name.trim();

      const phone =
        customerForm.phone.trim();

      const vehicleNumber =
        customerForm.vehicleNumber
          .trim()
          .toUpperCase();

      const address =
        customerForm.address.trim();

      const note =
        customerForm.note.trim();

      if (!name) {
        toast.error(
          "Customer name is required"
        );

        return;
      }

      if (name.length > 100) {
        toast.error(
          "Customer name must be 100 characters or less"
        );

        return;
      }

      if (
        phone &&
        !/^[0-9]{10}$/.test(phone)
      ) {
        toast.error(
          "Enter a valid 10-digit mobile number"
        );

        return;
      }

      if (vehicleNumber.length > 30) {
        toast.error(
          "Vehicle number must be 30 characters or less"
        );

        return;
      }

      if (address.length > 250) {
        toast.error(
          "Address must be 250 characters or less"
        );

        return;
      }

      if (note.length > 500) {
        toast.error(
          "Note must be 500 characters or less"
        );

        return;
      }

      if (
        selectedExistingCustomer?._id
      ) {
        navigate(
          `/ledger/customer?id=${encodeURIComponent(
            selectedExistingCustomer._id
          )}`
        );

        return;
      }

      const normalizedName =
        name.toLowerCase();

      const duplicate =
        previousCustomers.find(
          (item) => {
            const existingName =
              String(
                item?.name || ""
              )
                .trim()
                .toLowerCase();

            const existingPhone =
              String(
                item?.phone || ""
              ).trim();

            const sameName =
              existingName ===
              normalizedName;

            const samePhone =
              Boolean(phone) &&
              Boolean(existingPhone) &&
              phone ===
                existingPhone;

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
            `/ledger/customer?id=${encodeURIComponent(
              duplicate._id
            )}`
          );
        }

        return;
      }

      submittingRef.current = true;

      try {
        setSaving(true);

        const payload = {
          name,
          phone,
          vehicleNumber,
          address,
          note,
        };

        const data =
          await addLedgerCustomer(
            payload
          );

        const createdCustomer =
          data?.customer ||
          data?.data?.customer ||
          (
            data?.data?._id
              ? data.data
              : null
          );

        const createdCustomerId =
          createdCustomer?._id ||
          createdCustomer?.id ||
          data?.customerId ||
          data?.data?.customerId;

        if (!createdCustomerId) {
          await loadPreviousCustomers();

          let refreshedData;

          try {
            refreshedData =
              await getLedgerCustomers();
          } catch {
            refreshedData = null;
          }

          const refreshedCustomers =
            Array.isArray(
              refreshedData?.customers
            )
              ? refreshedData.customers
              : [];

          const createdFromList =
            refreshedCustomers.find(
              (item) => {
                const itemName =
                  String(
                    item?.name || ""
                  )
                    .trim()
                    .toLowerCase();

                const itemPhone =
                  String(
                    item?.phone || ""
                  ).trim();

                return (
                  itemName ===
                    normalizedName &&
                  (
                    !phone ||
                    itemPhone === phone
                  )
                );
              }
            );

          if (
            createdFromList?._id
          ) {
            toast.success(
              "Customer added successfully"
            );

            navigate(
              `/ledger/customer?id=${encodeURIComponent(
                createdFromList._id
              )}`,
              {
                replace: true,
              }
            );

            return;
          }

          toast.success(
            "Customer added successfully"
          );

          navigate(
            "/ledger",
            {
              replace: true,
            }
          );

          return;
        }

        toast.success(
          "Customer added successfully"
        );

        await loadPreviousCustomers();

        navigate(
          `/ledger/customer?id=${encodeURIComponent(
            createdCustomerId
          )}`,
          {
            replace: true,
          }
        );
      } catch (error) {
        const existing =
          error?.response?.data
            ?.customer;

        if (
          error?.response?.status ===
            409 &&
          existing?._id
        ) {
          toast.error(
            "Customer already exists"
          );

          navigate(
            `/ledger/customer?id=${encodeURIComponent(
              existing._id
            )}`
          );

          return;
        }

        toast.error(
          getErrorMessage(
            error,
            "Unable to add customer"
          )
        );
      } finally {
        submittingRef.current = false;

        if (mountedRef.current) {
          setSaving(false);
        }
      }
    };

  /* =====================================================
     UPDATE CUSTOMER
  ===================================================== */

  const handleUpdateCustomer =
    async (event) => {
      event.preventDefault();

      if (
        submittingRef.current ||
        !customerId
      ) {
        return;
      }

      const name =
        customerForm.name.trim();

      const phone =
        customerForm.phone.trim();

      const vehicleNumber =
        customerForm.vehicleNumber
          .trim()
          .toUpperCase();

      const address =
        customerForm.address.trim();

      const note =
        customerForm.note.trim();

      if (!name) {
        toast.error(
          "Customer name is required"
        );

        return;
      }

      if (name.length > 100) {
        toast.error(
          "Customer name must be 100 characters or less"
        );

        return;
      }

      if (
        phone &&
        !/^[0-9]{10}$/.test(phone)
      ) {
        toast.error(
          "Enter a valid 10-digit mobile number"
        );

        return;
      }

      if (vehicleNumber.length > 30) {
        toast.error(
          "Vehicle number must be 30 characters or less"
        );

        return;
      }

      if (address.length > 250) {
        toast.error(
          "Address must be 250 characters or less"
        );

        return;
      }

      if (note.length > 500) {
        toast.error(
          "Note must be 500 characters or less"
        );

        return;
      }

      submittingRef.current = true;

      try {
        setSaving(true);

        await updateLedgerCustomer(
          customerId,
          {
            name,
            phone,
            vehicleNumber,
            address,
            note,
          }
        );

        toast.success(
          "Customer updated successfully"
        );

        await loadPreviousCustomers();

        navigate(
          `/ledger/customer?id=${encodeURIComponent(
            customerId
          )}`,
          {
            replace: true,
          }
        );

        await loadLedger();
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            "Unable to update customer"
          )
        );
      } finally {
        submittingRef.current = false;

        if (mountedRef.current) {
          setSaving(false);
        }
      }
    };

  /* =====================================================
     ADD PURCHASE
  ===================================================== */

  const handleAddPurchase =
    async (event) => {
      event.preventDefault();

      if (
        submittingRef.current ||
        !customerId
      ) {
        return;
      }

      const total =
        Number(
          purchaseForm.totalAmount
        );

      const paid =
        Number(
          purchaseForm.paidAmount || 0
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

      if (
        !isValidDate(
          purchaseForm.entryDate
        )
      ) {
        toast.error(
          "Select a valid purchase date"
        );

        return;
      }

      if (
        !["petrol", "diesel"].includes(
          purchaseForm.fuelType
        )
      ) {
        toast.error(
          "Select a valid fuel type"
        );

        return;
      }

      if (
        purchaseForm.note.length > 500
      ) {
        toast.error(
          "Note must be 500 characters or less"
        );

        return;
      }

      submittingRef.current = true;

      try {
        setSaving(true);

        await addCustomerPurchase(
          customerId,
          {
            fuelType:
              purchaseForm.fuelType,

            totalAmount: total,

            paidAmount: paid,

            entryDate:
              purchaseForm.entryDate,

            note:
              purchaseForm.note.trim(),
          }
        );

        toast.success(
          "Purchase added successfully"
        );

        setPurchaseForm({
          fuelType: "petrol",
          totalAmount: "",
          paidAmount: "0",
          entryDate: getToday(),
          note: "",
        });

        setShowPurchase(false);

        await loadLedger();
        await loadPreviousCustomers();
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            "Unable to add purchase"
          )
        );
      } finally {
        submittingRef.current = false;

        if (mountedRef.current) {
          setSaving(false);
        }
      }
    };

  /* =====================================================
     ADD PAYMENT
  ===================================================== */

  const handleAddPayment =
    async (event) => {
      event.preventDefault();

      if (
        submittingRef.current ||
        !customerId
      ) {
        return;
      }

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

      if (
        !isValidDate(
          paymentForm.entryDate
        )
      ) {
        toast.error(
          "Select a valid payment date"
        );

        return;
      }

      if (
        amount >
        safeNumber(
          summary.totalPending
        )
      ) {
        toast.error(
          "Payment cannot exceed pending amount"
        );

        return;
      }

      if (
        paymentForm.note.length > 500
      ) {
        toast.error(
          "Note must be 500 characters or less"
        );

        return;
      }

      submittingRef.current = true;

      try {
        setSaving(true);

        /*
         * Backend ledger payment uses paymentAmount.
         *
         * addCustomerPayment(customerId, data)
         * automatically injects customerId.
         */
        await addCustomerPayment(
          customerId,
          {
            paymentAmount: amount,

            entryDate:
              paymentForm.entryDate,

            note:
              paymentForm.note.trim(),
          }
        );

        toast.success(
          "Payment added successfully"
        );

        setPaymentForm({
          amount: "",
          entryDate: getToday(),
          note: "",
        });

        setShowPayment(false);

        await loadLedger();
        await loadPreviousCustomers();
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            "Unable to add payment"
          )
        );
      } finally {
        submittingRef.current = false;

        if (mountedRef.current) {
          setSaving(false);
        }
      }
    };

  /* =====================================================
     NEW CUSTOMER PAGE
  ===================================================== */

  if (!isExistingCustomer) {
    return (
      <div className="page-container">

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
            disabled={saving}
          >
            <ArrowLeft size={17} />
            Back
          </button>

        </div>

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
                noValidate
              >

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
                      item?.name ||
                      "Unnamed Customer"
                    }
                    getSubtitle={(item) =>
                      [
                        item?.phone,
                        item?.vehicleNumber,
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
                          item?.name || "",

                        phone:
                          item?.phone || "",

                        vehicleNumber:
                          item?.vehicleNumber ||
                          "",

                        address:
                          item?.address || "",

                        note:
                          item?.note || "",
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

                {selectedExistingCustomer && (
                  <div
                    style={{
                      marginBottom: "16px",
                      padding:
                        "12px 14px",
                      border:
                        "1px solid #bbf7d0",
                      borderRadius: "9px",
                      background:
                        "#f0fdf4",
                      color: "#166534",
                      fontSize: "13px",
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

                <div className="form-row">

                  <div className="form-group">

                    <label>
                      Phone
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      value={
                        customerForm.phone
                      }
                      onChange={(e) =>
                        setCustomerForm(
                          (previous) => ({
                            ...previous,
                            phone:
                              e.target.value.replace(
                                /\D/g,
                                ""
                              ),
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
                      maxLength={30}
                      value={
                        customerForm.vehicleNumber
                      }
                      onChange={(e) =>
                        setCustomerForm(
                          (previous) => ({
                            ...previous,
                            vehicleNumber:
                              e.target.value.toUpperCase(),
                          })
                        )
                      }
                    />

                  </div>

                </div>

                <div className="form-group">

                  <label>
                    Address
                  </label>

                  <input
                    type="text"
                    maxLength={250}
                    value={
                      customerForm.address
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,
                          address:
                            e.target.value,
                        })
                      )
                    }
                  />

                </div>

                <div className="form-group">

                  <label>
                    Note
                  </label>

                  <textarea
                    rows="3"
                    maxLength={500}
                    value={
                      customerForm.note
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,
                          note:
                            e.target.value,
                        })
                      )
                    }
                  />

                </div>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : selectedExistingCustomer
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
     CUSTOMER NOT FOUND
  ===================================================== */

  if (!customer) {
    return (
      <div className="page-container">

        <div className="page-header">

          <div>
            <h1>
              Customer Not Found
            </h1>

            <p>
              The requested ledger customer
              could not be loaded.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              navigate("/ledger")
            }
          >
            <ArrowLeft size={16} />
            Back
          </button>

        </div>

      </div>
    );
  }

  /* =====================================================
     EXISTING CUSTOMER
  ===================================================== */

  return (
    <div className="page-container">

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
                  (previous) =>
                    !previous
                );

                setShowPayment(false);
              }}
              disabled={saving}
            >
              <Plus size={17} />
              Add Purchase
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={
                saving ||
                safeNumber(
                  summary.totalPending
                ) <= 0
              }
              onClick={() => {
                setShowPayment(
                  (previous) =>
                    !previous
                );

                setShowPurchase(false);
              }}
            >
              <IndianRupee size={17} />
              Add Payment
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={
                saving ||
                !pumpSettings
              }
              onClick={
                handleExportPDF
              }
            >
              {saving
                ? "Processing..."
                : "Export PDF"}
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
              noValidate
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
                    maxLength={100}
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,
                          name:
                            e.target.value,
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
                    inputMode="numeric"
                    maxLength={10}
                    value={
                      customerForm.phone
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,
                          phone:
                            e.target.value.replace(
                              /\D/g,
                              ""
                            ),
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
                    maxLength={30}
                    value={
                      customerForm.vehicleNumber
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,
                          vehicleNumber:
                            e.target.value.toUpperCase(),
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
                    maxLength={250}
                    value={
                      customerForm.address
                    }
                    onChange={(e) =>
                      setCustomerForm(
                        (previous) => ({
                          ...previous,
                          address:
                            e.target.value,
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
                  maxLength={500}
                  value={
                    customerForm.note
                  }
                  onChange={(e) =>
                    setCustomerForm(
                      (previous) => ({
                        ...previous,
                        note:
                          e.target.value,
                      })
                    )
                  }
                />

              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
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

              <h4>
                Purchases
              </h4>

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
                    marginBottom:
                      "20px",
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
                  noValidate
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
                                e.target.value,
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
                                e.target.value,
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
                                e.target.value,
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
                                e.target.value,
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
                      maxLength={500}
                      value={
                        purchaseForm.note
                      }
                      onChange={(e) =>
                        setPurchaseForm(
                          (previous) => ({
                            ...previous,
                            note:
                              e.target.value,
                          })
                        )
                      }
                    />

                  </div>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Purchase"}
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
                    marginBottom:
                      "20px",
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
                  noValidate
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
                                e.target.value,
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
                                e.target.value,
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
                      maxLength={500}
                      value={
                        paymentForm.note
                      }
                      onChange={(e) =>
                        setPaymentForm(
                          (previous) => ({
                            ...previous,
                            note:
                              e.target.value,
                          })
                        )
                      }
                    />

                  </div>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Payment"}
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

                    <th>
                      #
                    </th>

                    <th>
                      Date
                    </th>

                    <th>
                      Type
                    </th>

                    <th>
                      Fuel
                    </th>

                    <th>
                      Total
                    </th>

                    <th>
                      Paid
                    </th>

                    <th>
                      Pending
                    </th>

                    <th>
                      Payment
                    </th>

                    <th>
                      Note
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {entries.length ===
                  0 ? (
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
                            entry?._id ||
                            `${entry?.entryDate}-${index}`
                          }
                        >

                          <td>
                            {index + 1}
                          </td>

                          <td>
                            {
                              entry?.entryDate ||
                              "-"
                            }
                          </td>

                          <td>
                            {
                              entry?.entryType ===
                              "purchase"
                                ? "Purchase"
                                : "Payment"
                            }
                          </td>

                          <td>
                            {
                              entry?.entryType ===
                              "purchase"
                                ? String(
                                    entry?.fuelType ||
                                      ""
                                  ).toLowerCase() ===
                                  "petrol"
                                  ? "Petrol"
                                  : "Diesel"
                                : "-"
                            }
                          </td>

                          <td>
                            {
                              entry?.entryType ===
                              "purchase"
                                ? `₹ ${money(
                                    entry?.totalAmount
                                  )}`
                                : "-"
                            }
                          </td>

                          <td>
                            {
                              entry?.entryType ===
                              "purchase"
                                ? `₹ ${money(
                                    entry?.paidAmount
                                  )}`
                                : "-"
                            }
                          </td>

                          <td>
                            {
                              entry?.entryType ===
                              "purchase"
                                ? `₹ ${money(
                                    entry?.pendingAmount
                                  )}`
                                : "-"
                            }
                          </td>

                          <td>
                            {
                              entry?.entryType ===
                              "payment"
                                ? `₹ ${money(
                                    entry?.paymentAmount
                                  )}`
                                : "-"
                            }
                          </td>

                          <td>
                            {
                              entry?.note ||
                              "-"
                            }
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