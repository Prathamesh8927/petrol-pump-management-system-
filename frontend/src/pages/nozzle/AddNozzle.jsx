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
    name: "",
    fuelType: "petrol",
    currentReading: "",
  });

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

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      try {
        setLoading(true);

        await addNozzle({
          nozzleNumber:
            formData.nozzleNumber.trim(),

          name:
            formData.name.trim(),

          fuelType:
            formData.fuelType,

          currentReading:
            Number(
              formData.currentReading ||
                0
            ),
        });

        toast.success(
          "Nozzle added successfully"
        );

        navigate(
          "/nozzle"
        );
      } catch (error) {
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
          >

            <div className="form-row">

              <div className="form-group">

                <label>
                  Nozzle Number
                </label>

                <input
                  type="text"
                  name="nozzleNumber"
                  value={
                    formData.nozzleNumber
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: N1"
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Nozzle Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={
                    formData.name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: Petrol Nozzle 1"
                />

              </div>

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Fuel Type
                </label>

                <select
                  name="fuelType"
                  value={
                    formData.fuelType
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
                  Initial Meter Reading
                </label>

                <input
                  type="number"
                  name="currentReading"
                  min="0"
                  step="0.01"
                  value={
                    formData.currentReading
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </div>

            </div>

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

          </form>

        </div>

      </div>

    </div>
  );
};

export default AddNozzle;