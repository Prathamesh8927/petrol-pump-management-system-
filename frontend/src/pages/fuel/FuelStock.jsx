import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Pencil,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";

import Breadcrumbs from "../../components/Breadcrumbs";

import {
  getFuelStock,
  updateFuelStock,
  deleteFuelStock,
} from "../../services/fuelService";

const FuelStock = () => {
  const [stock, setStock] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    editingStock,
    setEditingStock,
  ] = useState(null);

  const [
    editLoading,
    setEditLoading,
  ] = useState(false);

  /* =====================================
     LOAD STOCK
  ===================================== */

  const loadFuelStock =
    async () => {
      try {
        setLoading(true);

        const data =
          await getFuelStock();

        /*
          Supports both old and new
          backend response names.
        */

        setStock(
          data.stock ||
            data.stocks ||
            []
        );
      } catch (error) {
        console.error(
          "FUEL STOCK ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load fuel stock"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadFuelStock();
  }, []);

  /* =====================================
     PETROL / DIESEL
  ===================================== */

  const petrol =
    stock.find(
      (item) =>
        item.fuelType ===
        "petrol"
    ) || {};

  const diesel =
    stock.find(
      (item) =>
        item.fuelType ===
        "diesel"
    ) || {};

  /* =====================================
     FORMAT
  ===================================== */

  const formatLitres = (
    value
  ) => {
    return Number(
      value || 0
    ).toFixed(2);
  };

  /* =====================================
     OPEN EDIT MODAL
  ===================================== */

  const handleEdit = (
    fuel
  ) => {
    if (!fuel?._id) {
      toast.error(
        "No stock available to edit"
      );

      return;
    }

    setEditingStock({
      _id: fuel._id,

      fuelType:
        fuel.fuelType,

      openingStock:
        fuel.openingStock ||
        0,

      purchased:
        fuel.purchased ||
        0,

      sold:
        fuel.sold ||
        0,

      currentStock:
        fuel.currentStock ||
        0,

      lastSupplier:
        fuel.lastSupplier ||
        fuel.supplierName ||
        "",
    });
  };

  /* =====================================
     EDIT INPUT
  ===================================== */

  const handleEditChange =
    (e) => {
      const {
        name,
        value,
      } = e.target;

      setEditingStock(
        (previous) => ({
          ...previous,

          [name]:
            value,
        })
      );
    };

  /* =====================================
     UPDATE STOCK
  ===================================== */

  const handleUpdate =
    async (e) => {
      e.preventDefault();

      try {
        setEditLoading(
          true
        );

        await updateFuelStock(
          editingStock.fuelType,
          {
            openingStock:
              Number(
                editingStock.openingStock
              ),

            purchased:
              Number(
                editingStock.purchased
              ),

            sold:
              Number(
                editingStock.sold
              ),

            currentStock:
              Number(
                editingStock.currentStock
              ),

            lastSupplier:
              editingStock.lastSupplier,
          }
        );

        toast.success(
          `${
            editingStock.fuelType ===
            "petrol"
              ? "Petrol"
              : "Diesel"
          } stock updated successfully`
        );

        setEditingStock(
          null
        );

        await loadFuelStock();
      } catch (error) {
        console.error(
          "UPDATE STOCK ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to update stock"
        );
      } finally {
        setEditLoading(
          false
        );
      }
    };

  /* =====================================
     DELETE STOCK
  ===================================== */

  const handleDelete =
    async (
      fuelType
    ) => {
      const fuelName =
        fuelType ===
        "petrol"
          ? "Petrol"
          : "Diesel";

      const confirmed =
        window.confirm(
          `Are you sure you want to delete ${fuelName} stock?`
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteFuelStock(
          fuelType
        );

        toast.success(
          `${fuelName} stock deleted successfully`
        );

        await loadFuelStock();
      } catch (error) {
        console.error(
          "DELETE STOCK ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to delete stock"
        );
      }
    };

  /* =====================================
     TABLE ROWS
  ===================================== */

  const rows = [
    {
      name: "Petrol",
      data: petrol,
    },

    {
      name: "Diesel",
      data: diesel,
    },
  ];

  return (
    <div className="page-container">

      {/* =============================
          BREADCRUMB
      ============================= */}

      <Breadcrumbs
        items={[
          {
            label: "Fuel",
          },

          {
            label:
              "Current Stock",
          },
        ]}
      />

      {/* =============================
          HEADER
      ============================= */}

      <div className="page-header">

        <div>
          <h1>
            Current Fuel Stock
          </h1>

          <p>
            Manage petrol and diesel
            stock details.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={
            loadFuelStock
          }
          disabled={loading}
        >
          <RefreshCw
            size={16}
          />

          {loading
            ? "Loading..."
            : "Refresh"}
        </button>

      </div>

      {/* =============================
          TOP CARDS
      ============================= */}

      <div className="stats-grid">

        <div className="stat-card">

          <h4>
            Petrol Available
          </h4>

          <h2>
            {formatLitres(
              petrol.currentStock
            )}{" "}
            L
          </h2>

        </div>

        <div className="stat-card">

          <h4>
            Diesel Available
          </h4>

          <h2>
            {formatLitres(
              diesel.currentStock
            )}{" "}
            L
          </h2>

        </div>

        <div className="stat-card">

          <h4>
            Petrol Supplier
          </h4>

          <h2 className="supplier-card-name">
            {petrol.lastSupplier ||
              petrol.supplierName ||
              "-"}
          </h2>

        </div>

        <div className="stat-card">

          <h4>
            Diesel Supplier
          </h4>

          <h2 className="supplier-card-name">
            {diesel.lastSupplier ||
              diesel.supplierName ||
              "-"}
          </h2>

        </div>

      </div>

      {/* =============================
          STOCK TABLE
      ============================= */}

      <div className="content-panel">

        <div className="content-panel-header">

          <h2>
            Fuel Stock Details
          </h2>

        </div>

        <div className="table-container">

          <table>

            <thead>

              <tr>

                <th>
                  Fuel
                </th>

                <th>
                  Supplier Name
                </th>

                <th>
                  Opening Stock
                </th>

                <th>
                  Purchased
                </th>

                <th>
                  Sold
                </th>

                <th>
                  Available
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {rows.map(
                ({
                  name,
                  data,
                }) => (

                  <tr
                    key={name}
                  >

                    <td>
                      <strong>
                        {name}
                      </strong>
                    </td>

                    <td>
                      {data.lastSupplier ||
                        data.supplierName ||
                        "-"}
                    </td>

                    <td>
                      {formatLitres(
                        data.openingStock
                      )}{" "}
                      L
                    </td>

                    <td>
                      {formatLitres(
                        data.purchased
                      )}{" "}
                      L
                    </td>

                    <td>
                      {formatLitres(
                        data.sold
                      )}{" "}
                      L
                    </td>

                    <td>
                      <strong>
                        {formatLitres(
                          data.currentStock
                        )}{" "}
                        L
                      </strong>
                    </td>

                    <td>

                      <div className="row-actions">

                        <button
                          type="button"
                          className="action-edit"
                          title={`Edit ${name}`}
                          onClick={() =>
                            handleEdit(
                              data
                            )
                          }
                          disabled={
                            !data._id
                          }
                        >
                          <Pencil
                            size={16}
                          />
                        </button>

                        <button
                          type="button"
                          className="action-delete"
                          title={`Delete ${name}`}
                          onClick={() =>
                            handleDelete(
                              name.toLowerCase()
                            )
                          }
                          disabled={
                            !data._id
                          }
                        >
                          <Trash2
                            size={16}
                          />
                        </button>

                      </div>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =============================
          EDIT MODAL
      ============================= */}

      {editingStock && (

        <div className="modal-backdrop">

          <div className="stock-edit-modal">

            <div className="stock-edit-modal-header">

              <div>

                <h2>
                  Edit{" "}
                  {editingStock.fuelType ===
                  "petrol"
                    ? "Petrol"
                    : "Diesel"}{" "}
                  Stock
                </h2>

                <p>
                  Update fuel stock
                  information.
                </p>

              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setEditingStock(
                    null
                  )
                }
              >
                <X
                  size={20}
                />
              </button>

            </div>

            <form
              onSubmit={
                handleUpdate
              }
            >

              {/* SUPPLIER */}

              <div className="form-group">

                <label>
                  Supplier Name
                </label>

                <input
                  type="text"
                  name="lastSupplier"
                  value={
                    editingStock.lastSupplier
                  }
                  onChange={
                    handleEditChange
                  }
                  placeholder="Supplier name"
                />

              </div>

              {/* OPENING / PURCHASED */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Opening Stock
                  </label>

                  <input
                    type="number"
                    name="openingStock"
                    min="0"
                    step="0.01"
                    value={
                      editingStock.openingStock
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Purchased
                  </label>

                  <input
                    type="number"
                    name="purchased"
                    min="0"
                    step="0.01"
                    value={
                      editingStock.purchased
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                  />

                </div>

              </div>

              {/* SOLD / CURRENT */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Sold
                  </label>

                  <input
                    type="number"
                    name="sold"
                    min="0"
                    step="0.01"
                    value={
                      editingStock.sold
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Available Stock
                  </label>

                  <input
                    type="number"
                    name="currentStock"
                    min="0"
                    step="0.01"
                    value={
                      editingStock.currentStock
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                  />

                </div>

              </div>

              {/* ACTIONS */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setEditingStock(
                      null
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    editLoading
                  }
                >
                  {editLoading
                    ? "Updating..."
                    : "Update Stock"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default FuelStock;