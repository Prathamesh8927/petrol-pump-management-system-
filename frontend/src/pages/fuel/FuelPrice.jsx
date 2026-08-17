import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import toast from "react-hot-toast";

import Breadcrumbs from "../../components/Breadcrumbs";

import {
  getFuelPrice,
  updateFuelPrice,
} from "../../services/fuelService";

const FuelPrice = () => {
  const navigate = useNavigate();

  const [
    petrolPrice,
    setPetrolPrice,
  ] = useState("");

  const [
    dieselPrice,
    setDieselPrice,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    loadingPrice,
    setLoadingPrice,
  ] = useState(true);

  /* ============================
     LOAD CURRENT FUEL PRICE
  ============================ */

  useEffect(() => {
    const loadFuelPrice =
      async () => {
        try {
          const data =
            await getFuelPrice();

          if (data.fuelPrice) {
            setPetrolPrice(
              data.fuelPrice
                .petrolPrice
            );

            setDieselPrice(
              data.fuelPrice
                .dieselPrice
            );
          }
        } catch (error) {
          console.error(
            "Fuel price error:",
            error
          );

          toast.error(
            error.response?.data
              ?.message ||
              "Unable to load fuel price"
          );
        } finally {
          setLoadingPrice(
            false
          );
        }
      };

    loadFuelPrice();
  }, []);

  /* ============================
     UPDATE PRICE
  ============================ */

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      try {
        setLoading(true);

        await updateFuelPrice({
          petrolPrice:
            Number(
              petrolPrice
            ),

          dieselPrice:
            Number(
              dieselPrice
            ),
        });

        toast.success(
          "Fuel prices updated successfully"
        );

        // Redirect directly to dashboard
        navigate("/dashboard");
      } catch (error) {
        console.error(
          "Update price error:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to update fuel prices"
        );
      } finally {
        setLoading(false);
      }
    };

  /* ============================
     PAGE
  ============================ */

  return (
    <div className="page-container">

      <Breadcrumbs
        items={[
          {
            label: "Fuel",
            path: "/fuel",
          },
          {
            label:
              "Fuel Price",
          },
        ]}
      />

      <div className="content-panel">

        <div className="content-panel-header">
          <h2>
            Fuel Selling Price
          </h2>
        </div>

        <div className="content-panel-body">

          {loadingPrice ? (
            <p>
              Loading prices...
            </p>
          ) : (
            <form
              className="form-card clean-form"
              onSubmit={
                handleSubmit
              }
            >

              <div className="form-row">

                {/* PETROL PRICE */}

                <div className="form-group">

                  <label>
                    Petrol Price /
                    Litre
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      petrolPrice
                    }
                    onChange={(e) =>
                      setPetrolPrice(
                        e.target
                          .value
                      )
                    }
                    placeholder="Enter petrol price"
                    required
                  />

                </div>

                {/* DIESEL PRICE */}

                <div className="form-group">

                  <label>
                    Diesel Price /
                    Litre
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      dieselPrice
                    }
                    onChange={(e) =>
                      setDieselPrice(
                        e.target
                          .value
                      )
                    }
                    placeholder="Enter diesel price"
                    required
                  />

                </div>

              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading
                  ? "Updating..."
                  : "Update Price"}
              </button>

            </form>
          )}

        </div>

      </div>

    </div>
  );
};

export default FuelPrice;