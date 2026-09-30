import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  Fuel,
} from "lucide-react";

import ProfessionalSearch from "../../components/ProfessionalSearch";

import {
  addFuelPurchase,
  getFuelPurchases,
} from "../../services/fuelService";

/* =====================================================
   HELPERS
===================================================== */

const safeString = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
};

/* =====================================================
   SAME SUPPLIER LOGIC AS FUEL PURCHASE HISTORY
===================================================== */

const getSupplierName = (purchase) => {
  return safeString(
    purchase?.supplierName ||
      purchase?.supplier ||
      purchase?.vendorName ||
      "-"
  );
};

/* =====================================================
   COMPONENT
===================================================== */

const FuelPurchase = () => {
  const navigate = useNavigate();

  /* =====================================================
     FORM
  ===================================================== */

  const [
    form,
    setForm,
  ] = useState({
    fuelType:
      "petrol",

    supplierName:
      "",

    quantity:
      "",

    purchasePrice:
      "",

    totalAmount:
      "",

    purchaseDate:
      new Date().toLocaleDateString(
        "en-CA"
      ),

    invoiceNumber:
      "",

    note:
      "",
  });

  const [
    saving,
    setSaving,
  ] = useState(false);

  /* =====================================================
     PREVIOUS PURCHASES

     Uses the SAME getFuelPurchases()
     logic as FuelPurchaseHistory.
  ===================================================== */

  const [
    purchases,
    setPurchases,
  ] = useState([]);

  const [
    showSupplierSuggestions,
    setShowSupplierSuggestions,
  ] = useState(false);

  /* =====================================================
     LOAD PURCHASE HISTORY

     SAME LOGIC AS FUEL PURCHASE HISTORY
  ===================================================== */

  const loadPurchases = async () => {
    try {
      const data =
        await getFuelPurchases();

      const purchaseList =
        Array.isArray(
          data?.purchases
        )
          ? data.purchases
          : [];

      setPurchases(
        purchaseList
      );
    } catch (error) {
      console.error(
        "LOAD PURCHASE HISTORY ERROR:",
        error
      );

      setPurchases([]);
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadPurchases();
  }, []);

  /* =====================================================
     SUPPLIER LIST

     Derived directly from the SAME purchase
     history used by FuelPurchaseHistory.

     Duplicate suppliers are removed case-insensitively
     while preserving the original supplier name.
  ===================================================== */

  const previousSuppliers =
    useMemo(() => {
      const suppliers =
        new Map();

      purchases.forEach(
        (purchase) => {
          const supplier =
            getSupplierName(
              purchase
            );

          if (
            !supplier ||
            supplier === "-"
          ) {
            return;
          }

          const key =
            supplier
              .trim()
              .toLowerCase();

          if (
            !suppliers.has(
              key
            )
          ) {
            suppliers.set(
              key,
              supplier.trim()
            );
          }
        }
      );

      return Array.from(
        suppliers.values()
      );
    }, [
      purchases,
    ]);

  /* =====================================================
     SUPPLIER SUGGESTIONS

     Same supplier-name matching style used in
     FuelPurchaseHistory.
  ===================================================== */

  const supplierSuggestions =
    useMemo(() => {
      const value =
        String(
          form.supplierName ||
            ""
        )
          .trim()
          .toLowerCase();

      if (!value) {
        return [];
      }

      return previousSuppliers
        .filter(
          (supplier) =>
            supplier
              .toLowerCase()
              .includes(
                value
              )
        )
        .slice(
          0,
          8
        );
    }, [
      form.supplierName,
      previousSuppliers,
    ]);

  /* =====================================================
     CALCULATE TOTAL
  ===================================================== */

  const calculateTotal = (
    quantity,
    purchasePrice
  ) => {
    const qty =
      Number(
        quantity
      );

    const rate =
      Number(
        purchasePrice
      );

    if (
      !Number.isFinite(
        qty
      ) ||
      !Number.isFinite(
        rate
      ) ||
      qty <= 0 ||
      rate <= 0
    ) {
      return "";
    }

    return (
      qty *
      rate
    ).toFixed(2);
  };

  /* =====================================================
     INPUT CHANGE
  ===================================================== */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => {
        const updated = {
          ...previous,
          [name]:
            value,
        };

        if (
          name ===
            "quantity" ||
          name ===
            "purchasePrice"
        ) {
          updated.totalAmount =
            calculateTotal(
              name ===
                "quantity"
                ? value
                : previous.quantity,

              name ===
                "purchasePrice"
                ? value
                : previous.purchasePrice
            );
        }

        return updated;
      }
    );
  };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const supplierName =
        form.supplierName.trim();

      const quantity =
        Number(
          form.quantity
        );

      const purchasePrice =
        Number(
          form.purchasePrice
        );

      /* -----------------------------------------------
         VALIDATION
      ----------------------------------------------- */

      if (!supplierName) {
        toast.error(
          "Supplier name is required"
        );

        return;
      }

      if (
        ![
          "petrol",
          "diesel",
        ].includes(
          form.fuelType
        )
      ) {
        toast.error(
          "Select Petrol or Diesel"
        );

        return;
      }

      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      ) {
        toast.error(
          "Quantity must be greater than zero"
        );

        return;
      }

      if (
        !Number.isFinite(
          purchasePrice
        ) ||
        purchasePrice <= 0
      ) {
        toast.error(
          "Purchase price must be greater than zero"
        );

        return;
      }

      const totalAmount =
        Number(
          (
            quantity *
            purchasePrice
          ).toFixed(2)
        );

      try {
        setSaving(
          true
        );

        /* ---------------------------------------------
           ADD PURCHASE
        --------------------------------------------- */

        await addFuelPurchase({
          fuelType:
            form.fuelType,

          supplierName:
            supplierName,

          quantity,

          purchasePrice,

          /*
           * Compatibility with existing backend
           * controller versions.
           */
          pricePerLitre:
            purchasePrice,

          totalAmount,

          purchaseDate:
            form.purchaseDate,

          invoiceNumber:
            form.invoiceNumber.trim(),

          note:
            form.note.trim(),
        });

        toast.success(
          "Fuel purchase added successfully"
        );

        /* ---------------------------------------------
           IMPORTANT

           Reload using the SAME purchase-history
           service after saving.

           This keeps FuelPurchase and
           FuelPurchaseHistory using one source
           of truth.
        --------------------------------------------- */

        await loadPurchases();

        /* ---------------------------------------------
           RESET FORM
        --------------------------------------------- */

        setForm({
          fuelType:
            "petrol",

          supplierName:
            "",

          quantity:
            "",

          purchasePrice:
            "",

          totalAmount:
            "",

          purchaseDate:
            new Date().toLocaleDateString(
              "en-CA"
            ),

          invoiceNumber:
            "",

          note:
            "",
        });

        setShowSupplierSuggestions(
          false
        );
      } catch (
        error
      ) {
        console.error(
          "FUEL PURCHASE ERROR:",
          error
        );

        toast.error(
          error?.response?.data
            ?.message ||
            "Unable to add fuel purchase"
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="page-container">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-header">

        <div>

          <h1>
            Add Fuel Purchase
          </h1>

          <p>
            Record petrol or diesel
            received from supplier.
          </p>

        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            navigate(
              "/fuel/purchases"
            )
          }
        >
          Purchase History
        </button>

      </div>

      {/* =================================================
          FORM
      ================================================= */}

      <div
        className="content-panel"
        style={{
          maxWidth:
            "760px",
        }}
      >

        <form
          onSubmit={
            handleSubmit
          }
        >

          {/* =================================================
              FUEL TYPE + DATE
          ================================================= */}

          <div className="form-row">

            <div className="form-group">

              <label>
                Fuel Type *
              </label>

              <select
                name="fuelType"
                value={
                  form.fuelType
                }
                onChange={
                  handleChange
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
                name="purchaseDate"
                value={
                  form.purchaseDate
                }
                onChange={
                  handleChange
                }
              />

            </div>

          </div>

          {/* =================================================
              SUPPLIER SEARCH

              Uses the exact same supplier data source
              as FuelPurchaseHistory.
          ================================================= */}

          <div className="form-group">

            <label>
              Supplier Name *
            </label>

            <ProfessionalSearch
              type="supplier"

              value={
                form.supplierName
              }

              placeholder="Search or enter supplier name..."

              onChange={(value) => {
                setForm(
                  (previous) => ({
                    ...previous,

                    supplierName:
                      value,
                  })
                );

                setShowSupplierSuggestions(
                  Boolean(
                    value.trim()
                  )
                );
              }}

              suggestions={
                supplierSuggestions
              }

              showSuggestions={
                showSupplierSuggestions &&
                Boolean(
                  form.supplierName.trim()
                )
              }

              getTitle={(
                supplier
              ) =>
                supplier
              }

              getSubtitle={() =>
                "Previous supplier"
              }

              onFocus={() => {
                if (
                  form.supplierName.trim()
                ) {
                  setShowSupplierSuggestions(
                    true
                  );
                }
              }}

              onBlur={() => {
                setTimeout(
                  () =>
                    setShowSupplierSuggestions(
                      false
                    ),
                  150
                );
              }}

              onClear={() => {
                setForm(
                  (previous) => ({
                    ...previous,

                    supplierName:
                      "",
                  })
                );

                setShowSupplierSuggestions(
                  false
                );
              }}

              onSelect={(
                supplier
              ) => {
                setForm(
                  (previous) => ({
                    ...previous,

                    supplierName:
                      supplier,
                  })
                );

                setShowSupplierSuggestions(
                  false
                );
              }}
            />

          </div>

          {/* =================================================
              QUANTITY + PURCHASE PRICE
          ================================================= */}

          <div className="form-row">

            <div className="form-group">

              <label>
                Quantity (Litres) *
              </label>

              <input
                type="number"
                name="quantity"
                min="0.01"
                step="0.01"
                placeholder="Enter litres"
                value={
                  form.quantity
                }
                onChange={
                  handleChange
                }
              />

            </div>

            <div className="form-group">

              <label>
                Purchase Price / Litre *
              </label>

              <input
                type="number"
                name="purchasePrice"
                min="0.01"
                step="0.01"
                placeholder="₹ per litre"
                value={
                  form.purchasePrice
                }
                onChange={
                  handleChange
                }
              />

            </div>

          </div>

          {/* =================================================
              TOTAL + INVOICE
          ================================================= */}

          <div className="form-row">

            <div className="form-group">

              <label>
                Total Purchase Amount
              </label>

              <input
                type="number"
                value={
                  form.totalAmount
                }
                readOnly
              />

            </div>

            <div className="form-group">

              <label>
                Invoice Number
              </label>

              <input
                type="text"
                name="invoiceNumber"
                placeholder="Optional"
                value={
                  form.invoiceNumber
                }
                onChange={
                  handleChange
                }
              />

            </div>

          </div>

          {/* =================================================
              TOTAL PREVIEW
          ================================================= */}

          {Number(
            form.quantity ||
              0
          ) > 0 &&
            Number(
              form.purchasePrice ||
                0
            ) > 0 && (

              <div
                style={{
                  marginBottom:
                    "18px",

                  padding:
                    "14px 16px",

                  border:
                    "1px solid #e2e8f0",

                  borderRadius:
                    "9px",

                  background:
                    "#f8fafc",

                  fontSize:
                    "14px",
                }}
              >

                Total Purchase Amount:{" "}

                <strong>
                  ₹{" "}
                  {Number(
                    form.totalAmount ||
                      0
                  ).toLocaleString(
                    "en-IN",
                    {
                      minimumFractionDigits:
                        2,

                      maximumFractionDigits:
                        2,
                    }
                  )}
                </strong>

              </div>

            )}

          {/* =================================================
              NOTE
          ================================================= */}

          <div className="form-group">

            <label>
              Note
            </label>

            <textarea
              name="note"
              rows="3"
              placeholder="Optional purchase note"
              value={
                form.note
              }
              onChange={
                handleChange
              }
            />

          </div>

          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="submit"
            className="primary-button"
            disabled={
              saving
            }
          >

            <Fuel
              size={18}
            />

            {saving
              ? "Saving..."
              : "Add Fuel Purchase"}

          </button>

        </form>

      </div>

    </div>
  );
};

export default FuelPurchase;