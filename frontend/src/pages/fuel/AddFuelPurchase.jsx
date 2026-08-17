import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  Building2,
  Fuel,
  Search,
} from "lucide-react";

import {
  addFuelPurchase,
  getFuelPurchases,
} from "../../services/fuelService";

const AddFuelPurchase = () => {
  const navigate = useNavigate();
  const supplierBoxRef = useRef(null);

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

  const [formData, setFormData] =
    useState({
      fuelType: "petrol",
      purchaseDate: getToday(),
      supplierName: "",
      quantity: "",
      purchasePrice: "",
      invoiceNumber: "",
      note: "",
    });

  const [saving, setSaving] =
    useState(false);

  const [purchases, setPurchases] =
    useState([]);

  const [
    supplierLoading,
    setSupplierLoading,
  ] = useState(false);

  const [
    showSupplierDropdown,
    setShowSupplierDropdown,
  ] = useState(false);

  useEffect(() => {
    const loadPreviousPurchases =
      async () => {
        try {
          setSupplierLoading(true);

          const data =
            await getFuelPurchases();

          setPurchases(
            Array.isArray(
              data?.purchases
            )
              ? data.purchases
              : []
          );
        } catch (error) {
          console.error(
            "LOAD SUPPLIERS ERROR:",
            error
          );

          setPurchases([]);
        } finally {
          setSupplierLoading(false);
        }
      };

    loadPreviousPurchases();
  }, []);

  useEffect(() => {
    const handleClickOutside =
      (event) => {
        if (
          supplierBoxRef.current &&
          !supplierBoxRef.current.contains(
            event.target
          )
        ) {
          setShowSupplierDropdown(
            false
          );
        }
      };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const suppliers =
    useMemo(() => {
      const map = new Map();

      purchases.forEach(
        (purchase) => {
          const name =
            String(
              purchase.supplierName ||
                purchase.supplier ||
                ""
            ).trim();

          if (!name) {
            return;
          }

          const key =
            name.toLowerCase();

          if (map.has(key)) {
            const existing =
              map.get(key);

            existing.purchaseCount +=
              1;

            return;
          }

          map.set(key, {
            name,
            purchaseCount: 1,
          });
        }
      );

      return Array.from(
        map.values()
      ).sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );
    }, [purchases]);

  const filteredSuppliers =
    useMemo(() => {
      const keyword =
        formData.supplierName
          .trim()
          .toLowerCase();

      if (!keyword) {
        return suppliers.slice(
          0,
          8
        );
      }

      return suppliers
        .filter((supplier) =>
          supplier.name
            .toLowerCase()
            .includes(keyword)
        )
        .slice(0, 8);
    }, [
      suppliers,
      formData.supplierName,
    ]);

  const totalPurchaseAmount =
    Number(
      (
        Number(
          formData.quantity ||
            0
        ) *
        Number(
          formData.purchasePrice ||
            0
        )
      ).toFixed(2)
    );

  const handleChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setFormData(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );
    };

  const handleSupplierChange =
    (event) => {
      const value =
        event.target.value;

      setFormData(
        (previous) => ({
          ...previous,
          supplierName: value,
        })
      );

      setShowSupplierDropdown(true);
    };

  const selectSupplier =
    (supplierName) => {
      setFormData(
        (previous) => ({
          ...previous,
          supplierName,
        })
      );

      setShowSupplierDropdown(false);
    };

  const handleNumberWheel =
    (event) => {
      event.currentTarget.blur();
    };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const supplierName =
        formData.supplierName.trim();

      const quantity =
        Number(
          formData.quantity
        );

      const purchasePrice =
        Number(
          formData.purchasePrice
        );

      if (!supplierName) {
        toast.error(
          "Supplier name is required"
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

      try {
        setSaving(true);

        await addFuelPurchase({
          fuelType:
            formData.fuelType,

          purchaseDate:
            formData.purchaseDate,

          supplierName,

          quantity,

          purchasePrice,

          totalAmount:
            totalPurchaseAmount,

          invoiceNumber:
            formData.invoiceNumber.trim(),

          note:
            formData.note.trim(),
        });

        toast.success(
          "Fuel purchase added successfully"
        );

        navigate("/fuel");
      } catch (error) {
        console.error(
          "ADD FUEL PURCHASE ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to add fuel purchase"
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div className="page-container fuel-purchase-page">

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

        <NavLink
          to="/fuel/history"
          className="secondary-button"
        >
          Purchase History
        </NavLink>
      </div>

      <div className="fuel-purchase-center">

        <div className="content-panel fuel-purchase-box">

          <div className="content-panel-body">

            <form
              className="clean-form fuel-purchase-form"
              onSubmit={handleSubmit}
            >

              <div className="form-row">

                <div className="form-group">
                  <label>
                    Fuel Type *
                  </label>

                  <select
                    name="fuelType"
                    value={
                      formData.fuelType
                    }
                    onChange={
                      handleChange
                    }
                    required
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
                      formData.purchaseDate
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />
                </div>

              </div>

              <div
                className="form-group supplier-field"
                ref={supplierBoxRef}
              >
                <label>
                  Supplier Name *
                </label>

                <div className="supplier-search-wrapper">

                  <Search
                    size={18}
                    className="supplier-search-icon"
                  />

                  <input
                    type="text"
                    name="supplierName"
                    value={
                      formData.supplierName
                    }
                    onChange={
                      handleSupplierChange
                    }
                    onFocus={() =>
                      setShowSupplierDropdown(
                        true
                      )
                    }
                    placeholder="Search or enter supplier name..."
                    autoComplete="off"
                    required
                  />

                  {showSupplierDropdown && (
                    <div className="supplier-dropdown">

                      {supplierLoading ? (
                        <div className="supplier-empty">
                          Loading previous suppliers...
                        </div>
                      ) : filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map(
                          (supplier) => (
                            <div
                              key={
                                supplier.name
                                  .trim()
                                  .toLowerCase()
                              }
                              className="supplier-option"
                              role="button"
                              tabIndex={0}
                              onMouseDown={(event) => {
                                event.preventDefault();

                                selectSupplier(
                                  supplier.name
                                );
                              }}
                            >
                              <div className="supplier-option-icon">
                                <Building2
                                  size={18}
                                />
                              </div>

                              <div className="supplier-option-content">
                                <div className="supplier-option-name">
                                  {
                                    supplier.name
                                  }
                                </div>

                                <div className="supplier-option-meta">
                                  Previous supplier
                                  {supplier.purchaseCount >
                                    1 &&
                                    ` • ${supplier.purchaseCount} purchases`}
                                </div>
                              </div>
                            </div>
                          )
                        )
                      ) : formData.supplierName.trim() ? (
                        <div className="supplier-new">
                          <div className="supplier-option-icon new">
                            <Building2
                              size={18}
                            />
                          </div>

                          <div>
                            <strong>
                              New Supplier
                            </strong>

                            <p>
                              Continue with "
                              {
                                formData.supplierName
                              }
                              "
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="supplier-empty">
                          Start typing to search previous suppliers.
                        </div>
                      )}

                    </div>
                  )}

                </div>
              </div>

              <div className="form-row">

                <div className="form-group">
                  <label>
                    Quantity (Litres) *
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    value={
                      formData.quantity
                    }
                    onChange={
                      handleChange
                    }
                    onWheel={
                      handleNumberWheel
                    }
                    min="0.01"
                    step="0.01"
                    placeholder="Enter litres"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Purchase Price / Litre *
                  </label>

                  <input
                    type="number"
                    name="purchasePrice"
                    value={
                      formData.purchasePrice
                    }
                    onChange={
                      handleChange
                    }
                    onWheel={
                      handleNumberWheel
                    }
                    min="0.01"
                    step="0.01"
                    placeholder="₹ per litre"
                    required
                  />
                </div>

              </div>

              <div className="form-row">

                <div className="form-group">
                  <label>
                    Total Purchase Amount
                  </label>

                  <input
                    type="text"
                    value={
                      totalPurchaseAmount > 0
                        ? `₹ ${totalPurchaseAmount.toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits:
                                2,
                              maximumFractionDigits:
                                2,
                            }
                          )}`
                        : ""
                    }
                    placeholder="Automatically calculated"
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
                    value={
                      formData.invoiceNumber
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Optional"
                  />
                </div>

              </div>

              <div className="form-group">
                <label>
                  Note
                </label>

                <textarea
                  name="note"
                  value={
                    formData.note
                  }
                  onChange={
                    handleChange
                  }
                  rows="4"
                  placeholder="Optional purchase note"
                />
              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                <Fuel size={17} />

                {saving
                  ? "Adding..."
                  : "Add Fuel Purchase"}
              </button>

            </form>

          </div>

        </div>

      </div>

    </div>
  );
};

export default AddFuelPurchase;