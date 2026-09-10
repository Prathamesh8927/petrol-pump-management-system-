import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Bell,
  Save,
} from "lucide-react";

import {
  getPumpSettings,
  updatePumpSettings,
} from "../../services/settingsService";

/* =========================================================
   SUPPORTED OIL COMPANIES

   Logo is automatically selected by the system
   from frontend assets according to companyName.
========================================================= */

const OIL_COMPANIES = [
  {
    value: "Indian Oil",
    label: "Indian Oil",
  },
  {
    value: "BPCL",
    label: "BPCL",
  },
  {
    value: "HPCL",
    label: "HPCL",
  },
  {
    value: "Nayara Energy",
    label: "Nayara Energy",
  },
  {
    value: "Reliance",
    label: "Reliance",
  },
  {
    value: "Shell",
    label: "Shell",
  },
];

/* =========================================================
   DEFAULT FORM
========================================================= */

const DEFAULT_FORM = {
  pumpName: "",
  ownerName: "",
  phone: "",
  email: "",

  companyName: "",

  dealerCode: "",
  gstin: "",

  address: "",
  city: "",
  state: "Maharashtra",
  pincode: "",

  lowStockAlert: 1000,
  enableLowStockAlert: true,
};

/* =========================================================
   COMPONENT
========================================================= */

const PumpSettings = () => {
  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState(DEFAULT_FORM);

  /* =======================================================
     LOAD SETTINGS
  ======================================================= */

  const loadSettings =
    async () => {
      try {
        setLoading(true);

        const data =
          await getPumpSettings();

        const settings =
          data?.settings || {};

        setForm({
          ...DEFAULT_FORM,

          ...settings,

          lowStockAlert:
            settings.lowStockAlert ??
            1000,

          enableLowStockAlert:
            settings.enableLowStockAlert ??
            true,
        });
      } catch (error) {
        console.error(
          "LOAD PUMP SETTINGS ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load pump settings"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadSettings();
  }, []);

  /* =======================================================
     HANDLE CHANGE
  ======================================================= */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,

        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );
  };

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (!form.pumpName.trim()) {
        toast.error(
          "Pump name is required"
        );

        return;
      }

      if (!form.companyName.trim()) {
        toast.error(
          "Please select oil company"
        );

        return;
      }

      try {
        setSaving(true);

        await updatePumpSettings({
          ...form,

          pumpName:
            form.pumpName.trim(),

          ownerName:
            form.ownerName.trim(),

          phone:
            form.phone.trim(),

          email:
            form.email.trim(),

          companyName:
            form.companyName.trim(),

          dealerCode:
            form.dealerCode.trim(),

          gstin:
            form.gstin.trim(),

          address:
            form.address.trim(),

          city:
            form.city.trim(),

          state:
            form.state.trim(),

          pincode:
            form.pincode.trim(),

          lowStockAlert:
            Number(
              form.lowStockAlert || 0
            ),
        });

        toast.success(
          "Pump settings saved successfully"
        );
      } catch (error) {
        console.error(
          "SAVE PUMP SETTINGS ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to save pump settings"
        );
      } finally {
        setSaving(false);
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="page-container">
        Loading pump settings...
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="page-container">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="page-header">

        <div>
          <h1>
            Pump Settings
          </h1>

          <p>
            Manage your petrol pump
            profile and business
            information.
          </p>
        </div>

      </div>

      {/* =================================================
          SETTINGS FORM
      ================================================= */}

      <div className="content-panel">

        <div className="content-panel-body">

          <form
            onSubmit={
              handleSubmit
            }
            className="clean-form"
          >

            {/* =========================================
                PUMP INFORMATION
            ========================================= */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "18px",
              }}
            >
              <Building2
                size={20}
              />

              <h2
                style={{
                  margin: 0,
                }}
              >
                Pump Information
              </h2>
            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Pump Name *
                </label>

                <input
                  type="text"
                  name="pumpName"
                  value={
                    form.pumpName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter pump name"
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Owner Name
                </label>

                <input
                  type="text"
                  name="ownerName"
                  value={
                    form.ownerName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter owner name"
                />

              </div>

            </div>

            {/* =========================================
                CONTACT
            ========================================= */}

            <div className="form-row">

              <div className="form-group">

                <label>
                  <Phone
                    size={14}
                    style={{
                      verticalAlign:
                        "middle",
                      marginRight:
                        "5px",
                    }}
                  />

                  Phone
                </label>

                <input
                  type="text"
                  name="phone"
                  value={
                    form.phone
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter phone number"
                />

              </div>

              <div className="form-group">

                <label>
                  <Mail
                    size={14}
                    style={{
                      verticalAlign:
                        "middle",
                      marginRight:
                        "5px",
                    }}
                  />

                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter email"
                />

              </div>

            </div>

            {/* =========================================
                OIL COMPANY
            ========================================= */}

            <div
              style={{
                marginTop: "8px",
                marginBottom: "20px",
              }}
            >

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >

                <Building2
                  size={18}
                />

                <h3
                  style={{
                    margin: 0,
                  }}
                >
                  Oil Company
                </h3>

              </div>

              <div className="form-group">

                <label>
                  Oil Company *
                </label>

                <select
                  name="companyName"
                  value={
                    form.companyName
                  }
                  onChange={
                    handleChange
                  }
                  required
                >

                  <option value="">
                    Select Oil Company
                  </option>

                  {OIL_COMPANIES.map(
                    (company) => (
                      <option
                        key={
                          company.value
                        }
                        value={
                          company.value
                        }
                      >
                        {company.label}
                      </option>
                    )
                  )}

                </select>

                <small
                  style={{
                    display:
                      "block",
                    marginTop:
                      "7px",
                    color:
                      "#64748b",
                  }}
                >
                  The system automatically
                  uses the corresponding
                  company logo in reports
                  and PDF documents.
                </small>

              </div>

            </div>

            {/* =========================================
                DEALER DETAILS
            ========================================= */}

            <div className="form-row">

              <div className="form-group">

                <label>
                  Dealer Code
                </label>

                <input
                  type="text"
                  name="dealerCode"
                  value={
                    form.dealerCode
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter dealer code"
                />

              </div>

              <div className="form-group">

                <label>
                  GSTIN
                </label>

                <input
                  type="text"
                  name="gstin"
                  value={
                    form.gstin
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter GSTIN"
                />

              </div>

            </div>

            {/* =========================================
                ADDRESS
            ========================================= */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "18px",
                marginBottom: "12px",
              }}
            >

              <MapPin
                size={18}
              />

              <h3
                style={{
                  margin: 0,
                }}
              >
                Address
              </h3>

            </div>

            <div className="form-group">

              <label>
                Address
              </label>

              <input
                type="text"
                name="address"
                value={
                  form.address
                }
                onChange={
                  handleChange
                }
                placeholder="Enter address"
              />

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  City
                </label>

                <input
                  type="text"
                  name="city"
                  value={
                    form.city
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter city"
                />

              </div>

              <div className="form-group">

                <label>
                  State
                </label>

                <input
                  type="text"
                  name="state"
                  value={
                    form.state
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter state"
                />

              </div>

              <div className="form-group">

                <label>
                  Pincode
                </label>

                <input
                  type="text"
                  name="pincode"
                  value={
                    form.pincode
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter pincode"
                />

              </div>

            </div>

            {/* =========================================
                LOW STOCK
            ========================================= */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "22px",
                marginBottom: "12px",
              }}
            >

              <Bell
                size={18}
              />

              <h3
                style={{
                  margin: 0,
                }}
              >
                Notifications
              </h3>

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Low Stock Alert
                </label>

                <input
                  type="number"
                  min="0"
                  name="lowStockAlert"
                  value={
                    form.lowStockAlert
                  }
                  onChange={
                    handleChange
                  }
                />

              </div>

              <div
                className="form-group"
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  paddingTop:
                    "28px",
                }}
              >

                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "8px",
                    cursor:
                      "pointer",
                  }}
                >

                  <input
                    type="checkbox"
                    name="enableLowStockAlert"
                    checked={
                      Boolean(
                        form.enableLowStockAlert
                      )
                    }
                    onChange={
                      handleChange
                    }
                  />

                  Enable Low Stock Alert

                </label>

              </div>

            </div>

            {/* =========================================
                SAVE
            ========================================= */}

            <div
              style={{
                marginTop: "24px",
              }}
            >

              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >

                <Save
                  size={17}
                />

                {saving
                  ? "Saving..."
                  : "Save Settings"}

              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
};

export default PumpSettings;