import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  getFuelSettings,
  updateFuelSettings,
} from "../../services/settingsService";

const FuelSettings = () => {
  const [
    formData,
    setFormData,
  ] = useState({
    petrolPrice: "",
    dieselPrice: "",
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  /* =====================================================
     LOAD
  ===================================================== */

  const loadSettings =
    async () => {
      try {
        setLoading(true);

        const data =
          await getFuelSettings();

        console.log(
          "FUEL SETTINGS:",
          data
        );

        const settings =
          data?.settings ||
          {};

        setFormData({
          petrolPrice:
            settings.petrolPrice ??
            data?.petrolPrice ??
            "",

          dieselPrice:
            settings.dieselPrice ??
            data?.dieselPrice ??
            "",
        });
      } catch (error) {
        console.error(
          "LOAD FUEL SETTINGS ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load fuel settings"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadSettings();
  }, []);

  /* =====================================================
     CHANGE
  ===================================================== */

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

  /* =====================================================
     SAVE
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const petrolPrice =
        Number(
          formData.petrolPrice
        );

      const dieselPrice =
        Number(
          formData.dieselPrice
        );

      if (
        !Number.isFinite(
          petrolPrice
        ) ||
        petrolPrice <= 0
      ) {
        toast.error(
          "Enter valid petrol price"
        );

        return;
      }

      if (
        !Number.isFinite(
          dieselPrice
        ) ||
        dieselPrice <= 0
      ) {
        toast.error(
          "Enter valid diesel price"
        );

        return;
      }

      try {
        setSaving(true);

        const response =
          await updateFuelSettings({
            petrolPrice,
            dieselPrice,
          });

        console.log(
          "UPDATE FUEL SETTINGS RESPONSE:",
          response
        );

        toast.success(
          "Fuel prices updated successfully"
        );

        await loadSettings();
      } catch (error) {
        console.error(
          "UPDATE FUEL SETTINGS ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to update fuel settings"
        );
      } finally {
        setSaving(false);
      }
    };

  /* =====================================================
     UI
  ===================================================== */

  if (loading) {
    return (
      <div className="page-container">
        Loading fuel settings...
      </div>
    );
  }

  return (
    <div className="page-container">

      <div className="page-header">

        <div>

          <h1>
            Fuel Settings
          </h1>

          <p>
            Set current petrol and
            diesel selling prices.
          </p>

        </div>

      </div>

      <div className="content-panel">

        <div className="content-panel-header">

          <h2>
            Selling Prices
          </h2>

        </div>

        <div className="content-panel-body">

          <form
            className="clean-form"
            onSubmit={
              handleSubmit
            }
          >

            <div className="form-row">

              <div className="form-group">

                <label>
                  Petrol Price / Litre
                </label>

                <input
                  type="number"
                  name="petrolPrice"
                  min="0.01"
                  step="0.01"
                  value={
                    formData.petrolPrice
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: 104.50"
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Diesel Price / Litre
                </label>

                <input
                  type="number"
                  name="dieselPrice"
                  min="0.01"
                  step="0.01"
                  value={
                    formData.dieselPrice
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: 92.30"
                  required
                />

              </div>

            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={
                saving
              }
            >
              {saving
                ? "Saving..."
                : "Save Fuel Prices"}
            </button>

          </form>

        </div>

      </div>

    </div>
  );
};

export default FuelSettings;