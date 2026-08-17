import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Save,
  Building2,
  MapPin,
  Phone,
  Mail,
  Bell,
} from "lucide-react";

import {
  getPumpSettings,
  updatePumpSettings,
} from "../../services/settingsService";

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
  ] = useState({
    pumpName: "",
    ownerName: "",
    phone: "",
    email: "",
    companyName: "",
    dealerCode: "",
    gstin: "",
    address: "",
    city: "",
    state:
      "Maharashtra",
    pincode: "",
    lowStockAlert:
      1000,
    enableLowStockAlert:
      true,
  });

  /* =====================================
     LOAD
  ===================================== */

  const loadSettings =
    async () => {
      try {
        setLoading(true);

        const data =
          await getPumpSettings();

        const settings =
          data.settings || {};

        setForm({
          pumpName:
            settings.pumpName ||
            "",

          ownerName:
            settings.ownerName ||
            "",

          phone:
            settings.phone ||
            "",

          email:
            settings.email ||
            "",

          companyName:
            settings.companyName ||
            "",

          dealerCode:
            settings.dealerCode ||
            "",

          gstin:
            settings.gstin ||
            "",

          address:
            settings.address ||
            "",

          city:
            settings.city ||
            "",

          state:
            settings.state ||
            "Maharashtra",

          pincode:
            settings.pincode ||
            "",

          lowStockAlert:
            settings.lowStockAlert ??
            1000,

          enableLowStockAlert:
            settings.enableLowStockAlert ??
            true,
        });
      } catch (error) {
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

  const handleChange =
    (e) => {
      const {
        name,
        value,
        type,
        checked,
      } = e.target;

      setForm(
        (previous) => ({
          ...previous,

          [name]:
            type ===
            "checkbox"
              ? checked
              : value,
        })
      );
    };

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      try {
        setSaving(true);

        await updatePumpSettings({
          ...form,

          lowStockAlert:
            Number(
              form.lowStockAlert ||
                0
            ),
        });

        toast.success(
          "Pump settings saved successfully"
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to save pump settings"
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <div className="page-container">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="page-container">

      <div className="page-header">

        <div>
          <h1>
            Pump Settings
          </h1>

          <p>
            Configure petrol pump
            business information.
          </p>
        </div>

      </div>

      <div className="content-panel">

        <div className="content-panel-body">

          <form
            className="clean-form"
            onSubmit={
              handleSubmit
            }
          >

            <h3>
              <Building2
                size={18}
              />{" "}
              Business Information
            </h3>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Pump Name
                </label>

                <input
                  name="pumpName"
                  value={
                    form.pumpName
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Owner Name
                </label>

                <input
                  name="ownerName"
                  value={
                    form.ownerName
                  }
                  onChange={
                    handleChange
                  }
                />

              </div>

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  <Phone
                    size={14}
                  />
                  Phone
                </label>

                <input
                  name="phone"
                  value={
                    form.phone
                  }
                  onChange={
                    handleChange
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  <Mail
                    size={14}
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
                />

              </div>

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Oil Company
                </label>

                <input
                  name="companyName"
                  value={
                    form.companyName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Indian Oil / BPCL / HPCL"
                />

              </div>

              <div className="form-group">

                <label>
                  Dealer Code
                </label>

                <input
                  name="dealerCode"
                  value={
                    form.dealerCode
                  }
                  onChange={
                    handleChange
                  }
                />

              </div>

            </div>

            <div className="form-group">

              <label>
                GSTIN
              </label>

              <input
                name="gstin"
                value={
                  form.gstin
                }
                onChange={
                  handleChange
                }
              />

            </div>

            <h3>
              <MapPin
                size={18}
              />{" "}
              Address
            </h3>

            <div className="form-group">

              <label>
                Address
              </label>

              <textarea
                name="address"
                value={
                  form.address
                }
                onChange={
                  handleChange
                }
                rows="3"
              />

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  City
                </label>

                <input
                  name="city"
                  value={
                    form.city
                  }
                  onChange={
                    handleChange
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  State
                </label>

                <input
                  name="state"
                  value={
                    form.state
                  }
                  onChange={
                    handleChange
                  }
                />

              </div>

            </div>

            <div className="form-group">

              <label>
                Pincode
              </label>

              <input
                name="pincode"
                value={
                  form.pincode
                }
                onChange={
                  handleChange
                }
              />

            </div>

            <h3>
              <Bell
                size={18}
              />{" "}
              Stock Alerts
            </h3>

            <div className="form-group">

              <label>
                Low Stock Alert
                Level (Litres)
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

            <label
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: "8px",
                marginBottom:
                  "20px",
              }}
            >
              <input
                type="checkbox"
                name="enableLowStockAlert"
                checked={
                  form.enableLowStockAlert
                }
                onChange={
                  handleChange
                }
              />

              Enable low stock alert
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={
                saving
              }
            >
              <Save size={17} />

              {saving
                ? "Saving..."
                : "Save Settings"}
            </button>

          </form>

        </div>

      </div>

    </div>
  );
};

export default PumpSettings;