import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";

import {
  getNozzles,
  addNozzle,
  updateNozzle,
  deleteNozzle,
} from "../../services/nozzleService";

const NozzleList = () => {
  const [
    nozzles,
    setNozzles,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingNozzle,
    setEditingNozzle,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState({
    nozzleNumber: "",
    fuelType: "petrol",
    machineName: "",
    openingReading: "",
    active: true,
  });

  /* =====================================================
     LOAD
  ===================================================== */

  const loadNozzles =
    async () => {
      try {
        setLoading(true);

        const data =
          await getNozzles();

        setNozzles(
          Array.isArray(data)
            ? data
            : data?.nozzles ||
              data?.data ||
              []
        );
      } catch (error) {
        console.error(
          "LOAD NOZZLES ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load nozzles"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadNozzles();
  }, []);

  /* =====================================================
     RESET
  ===================================================== */

  const resetForm = () => {
    setForm({
      nozzleNumber: "",
      fuelType: "petrol",
      machineName: "",
      openingReading: "",
      active: true,
    });

    setEditingNozzle(null);
    setShowForm(false);
  };

  /* =====================================================
     ADD
  ===================================================== */

  const openAdd = () => {
    setEditingNozzle(null);

    setForm({
      nozzleNumber: "",
      fuelType: "petrol",
      machineName: "",
      openingReading: "",
      active: true,
    });

    setShowForm(true);
  };

  /* =====================================================
     EDIT
  ===================================================== */

  const openEdit = (
    nozzle
  ) => {
    if (!nozzle?._id) {
      toast.error(
        "Nozzle ID is missing"
      );

      return;
    }

    setEditingNozzle(
      nozzle
    );

    setForm({
      nozzleNumber:
        nozzle.nozzleNumber ||
        "",

      fuelType:
        String(
          nozzle.fuelType ||
            "petrol"
        ).toLowerCase(),

      machineName:
        nozzle.machineName ||
        "",

      openingReading:
        String(
          nozzle.currentReading ??
            0
        ),

      active:
        nozzle.active !==
        false,
    });

    setShowForm(true);
  };

  /* =====================================================
     CHANGE
  ===================================================== */

  const handleChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setForm(
        (previous) => ({
          ...previous,

          [name]:
            value,
        })
      );
    };

  /* =====================================================
     SAVE
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !form.nozzleNumber.trim()
      ) {
        toast.error(
          "Nozzle number is required"
        );

        return;
      }

      try {
        setSaving(true);

        if (
          editingNozzle
        ) {
          /* ============================================
             UPDATE EXISTING NOZZLE

             Do NOT send:
             fuelType
             currentReading

             Reading should only change through
             nozzle reading entry.
          ============================================ */

          await updateNozzle(
            editingNozzle._id,
            {
              nozzleNumber:
                form.nozzleNumber.trim(),

              machineName:
                form.machineName.trim(),

              active:
                Boolean(
                  form.active
                ),
            }
          );

          toast.success(
            "Nozzle updated successfully"
          );
        } else {
          /* ============================================
             ADD NEW NOZZLE
          ============================================ */

          const openingReading =
            Number(
              form.openingReading ||
                0
            );

          if (
            !Number.isFinite(
              openingReading
            ) ||
            openingReading < 0
          ) {
            toast.error(
              "Enter a valid opening reading"
            );

            return;
          }

          await addNozzle({
            nozzleNumber:
              form.nozzleNumber.trim(),

            fuelType:
              form.fuelType,

            machineName:
              form.machineName.trim(),

            openingReading,
          });

          toast.success(
            "Nozzle added successfully"
          );
        }

        resetForm();

        await loadNozzles();
      } catch (error) {
        console.error(
          "SAVE NOZZLE ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            error.message ||
            "Unable to save nozzle"
        );
      } finally {
        setSaving(false);
      }
    };

  /* =====================================================
     DELETE
  ===================================================== */

  const handleDelete =
    async (
      nozzle
    ) => {
      if (!nozzle?._id) {
        toast.error(
          "Nozzle ID is missing"
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Delete nozzle ${nozzle.nozzleNumber}?`
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteNozzle(
          nozzle._id
        );

        toast.success(
          "Nozzle deleted successfully"
        );

        await loadNozzles();
      } catch (error) {
        console.error(
          "DELETE NOZZLE ERROR:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Unable to delete nozzle"
        );
      }
    };

  return (
    <div className="page-container">

      <div className="page-header">

        <div>

          <h1>
            Nozzles
          </h1>

          <p>
            Manage dispensing nozzles
            and their opening readings.
          </p>

        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >

          <button
            type="button"
            className="secondary-button"
            onClick={
              loadNozzles
            }
          >
            <RefreshCw
              size={17}
            />

            Refresh
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={
              openAdd
            }
          >
            <Plus
              size={17}
            />

            Add Nozzle
          </button>

        </div>

      </div>

      <div className="content-panel">

        <div className="table-container">

          <table>

            <thead>

              <tr>
                <th>#</th>
                <th>Nozzle</th>
                <th>Machine</th>
                <th>Fuel</th>
                <th>Current Reading</th>
                <th>Status</th>
                <th>Action</th>
              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="7"
                    className="empty-table"
                  >
                    Loading nozzles...
                  </td>
                </tr>

              ) : nozzles.length ===
                0 ? (

                <tr>
                  <td
                    colSpan="7"
                    className="empty-table"
                  >
                    No nozzles found.
                  </td>
                </tr>

              ) : (

                nozzles.map(
                  (
                    nozzle,
                    index
                  ) => (

                    <tr
                      key={
                        nozzle._id
                      }
                    >

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {
                            nozzle.nozzleNumber
                          }
                        </strong>
                      </td>

                      <td>
                        {nozzle.machineName ||
                          "-"}
                      </td>

                      <td>
                        {String(
                          nozzle.fuelType ||
                            ""
                        ).toLowerCase() ===
                        "petrol"
                          ? "Petrol"
                          : "Diesel"}
                      </td>

                      <td>
                        {Number(
                          nozzle.currentReading ||
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
                      </td>

                      <td>
                        {nozzle.active ===
                        false
                          ? "Inactive"
                          : "Active"}
                      </td>

                      <td>

                        <div className="row-actions">

                          <button
                            type="button"
                            className="action-edit"
                            title="Edit Nozzle"
                            onClick={() =>
                              openEdit(
                                nozzle
                              )
                            }
                          >
                            <Pencil
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            className="action-delete"
                            title="Delete Nozzle"
                            onClick={() =>
                              handleDelete(
                                nozzle
                              )
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
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      {showForm && (

        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              resetForm();
            }
          }}
        >

          <div className="stock-edit-modal">

            <div className="stock-edit-modal-header">

              <div>

                <h2>
                  {editingNozzle
                    ? "Edit Nozzle"
                    : "Add Nozzle"}
                </h2>

                <p>
                  {editingNozzle
                    ? "Update nozzle information."
                    : "Add a dispensing nozzle."}
                </p>

              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  resetForm
                }
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >

              {/* NOZZLE NUMBER */}

              <div className="form-group">

                <label>
                  Nozzle Number *
                </label>

                <input
                  type="text"
                  name="nozzleNumber"
                  value={
                    form.nozzleNumber
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: N1"
                />

              </div>

              <div className="form-row">

                {/* FUEL */}

                <div className="form-group">

                  <label>
                    Fuel Type
                  </label>

                  {editingNozzle ? (

                    <input
                      type="text"
                      value={
                        form.fuelType ===
                        "petrol"
                          ? "Petrol"
                          : "Diesel"
                      }
                      readOnly
                      style={{
                        background:
                          "#f8fafc",

                        cursor:
                          "not-allowed",
                      }}
                    />

                  ) : (

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

                  )}

                </div>

                {/* MACHINE */}

                <div className="form-group">

                  <label>
                    Machine Name
                  </label>

                  <input
                    type="text"
                    name="machineName"
                    value={
                      form.machineName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Example: Machine 1"
                  />

                </div>

              </div>

              {/* READING */}

              <div className="form-group">

                <label>
                  {editingNozzle
                    ? "Current Reading"
                    : "Opening Reading"}
                </label>

                <input
                  type="number"
                  name="openingReading"
                  min="0"
                  step="0.01"
                  value={
                    form.openingReading
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    Boolean(
                      editingNozzle
                    )
                  }
                  placeholder="0.00"
                />

                {editingNozzle && (

                  <small
                    style={{
                      display:
                        "block",

                      marginTop:
                        "6px",

                      color:
                        "#64748b",
                    }}
                  >
                    Update meter readings from
                    the nozzle reading entry,
                    not from Edit Nozzle.
                  </small>

                )}

              </div>

              {/* STATUS */}

              {editingNozzle && (

                <div className="form-group">

                  <label>
                    Status
                  </label>

                  <select
                    value={
                      form.active
                        ? "active"
                        : "inactive"
                    }
                    onChange={(event) =>
                      setForm(
                        (previous) => ({
                          ...previous,

                          active:
                            event.target
                              .value ===
                            "active",
                        })
                      )
                    }
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>

                </div>

              )}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: "10px",
                  marginTop:
                    "20px",
                }}
              >

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    resetForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "Saving..."
                    : editingNozzle
                    ? "Update Nozzle"
                    : "Add Nozzle"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default NozzleList;