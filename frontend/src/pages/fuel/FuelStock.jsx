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

const EMPTY_STOCK = [];

const EMPTY_EDIT_STOCK = null;

const FuelStock = () => {
  const [stock, setStock] =
    useState(EMPTY_STOCK);

  const [loading, setLoading] =
    useState(true);

  const [
    editingStock,
    setEditingStock,
  ] = useState(EMPTY_EDIT_STOCK);

  const [
    editLoading,
    setEditLoading,
  ] = useState(false);

  const [
    deleteLoading,
    setDeleteLoading,
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

        const nextStock =
          Array.isArray(
            data?.stock
          )
            ? data.stock
            : Array.isArray(
                data?.stocks
              )
            ? data.stocks
            : [];

        setStock(
          nextStock
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

        setStock([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    let mounted = true;

    const loadInitialStock =
      async () => {
        try {
          setLoading(true);

          const data =
            await getFuelStock();

          if (!mounted) {
            return;
          }

          const nextStock =
            Array.isArray(
              data?.stock
            )
              ? data.stock
              : Array.isArray(
                  data?.stocks
                )
              ? data.stocks
              : [];

          setStock(
            nextStock
          );
        } catch (error) {
          if (!mounted) {
            return;
          }

          console.error(
            "FUEL STOCK ERROR:",
            error
          );

          toast.error(
            error.response?.data
              ?.message ||
              "Unable to load fuel stock"
          );

          setStock([]);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadInitialStock();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================================
     PETROL / DIESEL
  ===================================== */

  const petrol =
    stock.find(
      (item) =>
        item?.fuelType ===
        "petrol"
    ) || {};

  const diesel =
    stock.find(
      (item) =>
        item?.fuelType ===
        "diesel"
    ) || {};

  /* =====================================
     FORMAT
  ===================================== */

  const formatLitres = (
    value
  ) => {
    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      )
    ) {
      return "0.00";
    }

    return number.toFixed(2);
  };

  /* =====================================
     NORMALIZE NUMBER
  ===================================== */

  const parseStockNumber = (
    value
  ) => {
    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      ) ||
      number < 0
    ) {
      return null;
    }

    return number;
  };

  /* =====================================
     OPEN EDIT MODAL
  ===================================== */

  const handleEdit = (
    fuel
  ) => {
    if (
      !fuel?._id ||
      !fuel?.fuelType
    ) {
      toast.error(
        "No stock available to edit"
      );

      return;
    }

    if (editLoading) {
      return;
    }

    setEditingStock({
      _id: fuel._id,

      fuelType:
        fuel.fuelType,

      openingStock:
        Number(
          fuel.openingStock ??
            0
        ),

      purchased:
        Number(
          fuel.purchased ??
            0
        ),

      sold:
        Number(
          fuel.sold ??
            0
        ),

      currentStock:
        Number(
          fuel.currentStock ??
            0
        ),

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
    (event) => {
      const {
        name,
        value,
      } = event.target;

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
    async (event) => {
      event.preventDefault();

      if (
        !editingStock ||
        editLoading
      ) {
        return;
      }

      const openingStock =
        parseStockNumber(
          editingStock.openingStock
        );

      const purchased =
        parseStockNumber(
          editingStock.purchased
        );

      const sold =
        parseStockNumber(
          editingStock.sold
        );

      const currentStock =
        parseStockNumber(
          editingStock.currentStock
        );

      if (
        openingStock ===
          null ||
        purchased ===
          null ||
        sold ===
          null ||
        currentStock ===
          null
      ) {
        toast.error(
          "Please enter valid non-negative stock values."
        );

        return;
      }

      if (
        !editingStock.fuelType
      ) {
        toast.error(
          "Invalid fuel type."
        );

        return;
      }

      try {
        setEditLoading(
          true
        );

        await updateFuelStock(
          editingStock.fuelType,
          {
            openingStock,

            purchased,

            sold,

            currentStock,

            lastSupplier:
              String(
                editingStock.lastSupplier ||
                  ""
              ).trim(),
          }
        );

        const fuelName =
          editingStock.fuelType ===
          "petrol"
            ? "Petrol"
            : "Diesel";

        toast.success(
          `${fuelName} stock updated successfully`
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
      if (
        deleteLoading
      ) {
        return;
      }

      if (
        fuelType !==
          "petrol" &&
        fuelType !==
          "diesel"
      ) {
        toast.error(
          "Invalid fuel type."
        );

        return;
      }

      const fuelName =
        fuelType ===
        "petrol"
          ? "Petrol"
          : "Diesel";

      const confirmed =
        window.confirm(
          `Are you sure you want to delete ${fuelName} stock? This data can be recovered from the recovery system according to the configured retention period.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeleteLoading(
          true
        );

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
      } finally {
        setDeleteLoading(
          false
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
          disabled={
            loading ||
            editLoading ||
            deleteLoading
          }
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
                            !data._id ||
                            editLoading ||
                            deleteLoading
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
                            !data._id ||
                            editLoading ||
                            deleteLoading
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

        <div
          className="modal-backdrop"
          onClick={() => {
            if (
              !editLoading
            ) {
              setEditingStock(
                null
              );
            }
          }}
        >

          <div
            className="stock-edit-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

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
                onClick={() => {
                  if (
                    !editLoading
                  ) {
                    setEditingStock(
                      null
                    );
                  }
                }}
                disabled={
                  editLoading
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

                <label
                  htmlFor="fuel-stock-supplier"
                >
                  Supplier Name
                </label>

                <input
                  id="fuel-stock-supplier"
                  type="text"
                  name="lastSupplier"
                  value={
                    editingStock.lastSupplier
                  }
                  onChange={
                    handleEditChange
                  }
                  placeholder="Supplier name"
                  maxLength={200}
                  disabled={
                    editLoading
                  }
                />

              </div>

              {/* OPENING / PURCHASED */}

              <div className="form-row">

                <div className="form-group">

                  <label
                    htmlFor="fuel-stock-opening"
                  >
                    Opening Stock
                  </label>

                  <input
                    id="fuel-stock-opening"
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
                    disabled={
                      editLoading
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label
                    htmlFor="fuel-stock-purchased"
                  >
                    Purchased
                  </label>

                  <input
                    id="fuel-stock-purchased"
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
                    disabled={
                      editLoading
                    }
                    required
                  />

                </div>

              </div>

              {/* SOLD / CURRENT */}

              <div className="form-row">

                <div className="form-group">

                  <label
                    htmlFor="fuel-stock-sold"
                  >
                    Sold
                  </label>

                  <input
                    id="fuel-stock-sold"
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
                    disabled={
                      editLoading
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label
                    htmlFor="fuel-stock-current"
                  >
                    Available Stock
                  </label>

                  <input
                    id="fuel-stock-current"
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
                    disabled={
                      editLoading
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
                  disabled={
                    editLoading
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