import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import toast from "react-hot-toast";

import Breadcrumbs from "../../components/Breadcrumbs";

import {
  addNozzle,
} from "../../services/nozzleService";

const AddNozzle = () => {
  const navigate =
    useNavigate();

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    formData,
    setFormData,
  ] = useState({
    nozzleNumber: "",
    fuelType: "petrol",
    openingReading: "",
    currentReading: "",
  });

  /* =====================================
     FORM CHANGE
  ===================================== */

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

  /* =====================================
     SUBMIT
  ===================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      const nozzleNumber =
        String(
          formData.nozzleNumber ||
            ""
        ).trim();

      const openingReading =
        Number(
          formData.openingReading
        );

      const currentReading =
        Number(
          formData.currentReading
        );

      if (!nozzleNumber) {
        toast.error(
          "Nozzle number is required."
        );

        return;
      }

      if (
        nozzleNumber.length >
        50
      ) {
        toast.error(
          "Nozzle number is too long."
        );

        return;
      }

      if (
        formData.fuelType !==
          "petrol" &&
        formData.fuelType !==
          "diesel"
      ) {
        toast.error(
          "Please select a valid fuel type."
        );

        return;
      }

      if (
        !Number.isFinite(
          openingReading
        ) ||
        openingReading < 0
      ) {
        toast.error(
          "Enter a valid opening reading."
        );

        return;
      }

      if (
        !Number.isFinite(
          currentReading
        ) ||
        currentReading < 0
      ) {
        toast.error(
          "Enter a valid current reading."
        );

        return;
      }

      if (
        currentReading <
        openingReading
      ) {
        toast.error(
          "Current reading cannot be lower than opening reading."
        );

        return;
      }

      try {
        setLoading(true);

        await addNozzle({
          nozzleNumber,

          fuelType:
            formData.fuelType,

          openingReading,

          currentReading,

          status: "active",

          active: true,
        });

        toast.success(
          "Nozzle added successfully."
        );

        navigate(
          "/nozzle"
        );
      } catch (error) {
        console.error(
          "ADD NOZZLE ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to add nozzle"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="page-container">

      {/* =============================
          BREADCRUMB
      ============================= */}

      <Breadcrumbs
        items={[
          {
            label:
              "Nozzles",
            path:
              "/nozzle",
          },
          {
            label:
              "Add Nozzle",
          },
        ]}
      />

      {/* =============================
          HEADER
      ============================= */}

      <div className="page-header">

        <div>
          <h1>
            Add Nozzle
          </h1>

          <p>
            Add a petrol or diesel
            dispensing nozzle.
          </p>
        </div>

      </div>

      {/* =============================
          FORM PANEL
      ============================= */}

      <div className="content-panel">

        <div className="content-panel-header">

          <h2>
            Nozzle Information
          </h2>

        </div>

        <div className="content-panel-body">

          <form
            className="clean-form"
            onSubmit={
              handleSubmit
            }
            noValidate
          >

            {/* =====================
                NOZZLE NUMBER
            ===================== */}

            <div className="form-group">

              <label
                htmlFor="nozzle-number"
              >
                Nozzle Number *
              </label>

              <input
                id="nozzle-number"
                type="text"
                name="nozzleNumber"
                value={
                  formData.nozzleNumber
                }
                onChange={
                  handleChange
                }
                placeholder="Example: N1"
                maxLength={50}
                disabled={
                  loading
                }
                required
              />

            </div>

            {/* =====================
                FUEL TYPE
            ===================== */}

            <div className="form-group">

              <label
                htmlFor="nozzle-fuel-type"
              >
                Fuel Type *
              </label>

              <select
                id="nozzle-fuel-type"
                name="fuelType"
                value={
                  formData.fuelType
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading
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

            {/* =====================
                READINGS
            ===================== */}

            <div className="form-row">

              <div className="form-group">

                <label
                  htmlFor="opening-reading"
                >
                  Opening Meter Reading *
                </label>

                <input
                  id="opening-reading"
                  type="number"
                  name="openingReading"
                  value={
                    formData.openingReading
                  }
                  onChange={
                    handleChange
                  }
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={
                    loading
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label
                  htmlFor="current-reading"
                >
                  Current Meter Reading *
                </label>

                <input
                  id="current-reading"
                  type="number"
                  name="currentReading"
                  value={
                    formData.currentReading
                  }
                  onChange={
                    handleChange
                  }
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled={
                    loading
                  }
                  required
                />

              </div>

            </div>

            {/* =====================
                ACTIONS
            ===================== */}

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigate(
                    "/nozzle"
                  )
                }
                disabled={
                  loading
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={
                  loading
                }
              >
                {loading
                  ? "Adding..."
                  : "Add Nozzle"}
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
};

export default AddNozzle;