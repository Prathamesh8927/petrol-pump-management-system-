import {
  useEffect,
  useMemo,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Eye,
  Pencil,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";

import Breadcrumbs from "../../components/Breadcrumbs";

import {
  getNozzles,
  addNozzle,
  updateNozzle,
  deleteNozzle,
} from "../../services/nozzleService";

const DEFAULT_PAGE_SIZE = 10;

const Nozzles = () => {
  const [nozzles, setNozzles] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [pageSize, setPageSize] =
    useState(DEFAULT_PAGE_SIZE);

  const [editingNozzle, setEditingNozzle] =
    useState(null);

  const [viewingNozzle, setViewingNozzle] =
    useState(null);

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [formLoading, setFormLoading] =
    useState(false);

  const [deleteLoading, setDeleteLoading] =
    useState(false);

  const [formData, setFormData] =
    useState({
      nozzleNumber: "",
      fuelType: "petrol",
      openingReading: "",
      currentReading: "",
      status: "active",
    });

  /* =====================================
     LOAD NOZZLES
  ===================================== */

  const loadNozzles = async () => {
    try {
      setLoading(true);

      const data =
        await getNozzles();

      const nextNozzles =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.nozzles)
          ? data.nozzles
          : Array.isArray(data?.data)
          ? data.data
          : [];

      setNozzles(
        nextNozzles
      );
    } catch (error) {
      console.error(
        "NOZZLE LOAD ERROR:",
        error
      );

      toast.error(
        error.response?.data
          ?.message ||
          "Unable to load nozzles"
      );

      setNozzles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialNozzles =
      async () => {
        try {
          setLoading(true);

          const data =
            await getNozzles();

          if (!mounted) {
            return;
          }

          const nextNozzles =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data?.nozzles
                )
              ? data.nozzles
              : Array.isArray(
                  data?.data
                )
              ? data.data
              : [];

          setNozzles(
            nextNozzles
          );
        } catch (error) {
          if (!mounted) {
            return;
          }

          console.error(
            "NOZZLE LOAD ERROR:",
            error
          );

          toast.error(
            error.response?.data
              ?.message ||
              "Unable to load nozzles"
          );

          setNozzles([]);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadInitialNozzles();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================================
     SEARCH / FILTER
  ===================================== */

  const filteredNozzles =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return nozzles;
      }

      return nozzles.filter(
        (nozzle) => {
          const nozzleNumber =
            String(
              nozzle?.nozzleNumber ??
                ""
            ).toLowerCase();

          const fuelType =
            String(
              nozzle?.fuelType ??
                ""
            ).toLowerCase();

          const status =
            String(
              nozzle?.status ??
                (nozzle?.active
                  ? "active"
                  : "inactive")
            ).toLowerCase();

          const tank =
            String(
              nozzle?.tank ??
                nozzle?.tankName ??
                ""
            ).toLowerCase();

          return (
            nozzleNumber.includes(
              query
            ) ||
            fuelType.includes(
              query
            ) ||
            status.includes(
              query
            ) ||
            tank.includes(
              query
            )
          );
        }
      );
    }, [
      nozzles,
      search,
    ]);

  const visibleNozzles =
    filteredNozzles.slice(
      0,
      Number(pageSize)
    );

  /* =====================================
     FORM HELPERS
  ===================================== */

  const resetForm = () => {
    setFormData({
      nozzleNumber: "",
      fuelType: "petrol",
      openingReading: "",
      currentReading: "",
      status: "active",
    });
  };

  const handleFormChange = (
    event
  ) => {
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
     OPEN ADD
  ===================================== */

  const handleOpenAdd = () => {
    if (
      formLoading ||
      deleteLoading
    ) {
      return;
    }

    resetForm();
    setEditingNozzle(null);
    setViewingNozzle(null);
    setShowAddModal(true);
  };

  /* =====================================
     OPEN EDIT
  ===================================== */

  const handleEdit = (
    nozzle
  ) => {
    if (!nozzle?._id) {
      toast.error(
        "Invalid nozzle."
      );

      return;
    }

    if (
      formLoading ||
      deleteLoading
    ) {
      return;
    }

    setEditingNozzle(
      nozzle
    );

    setViewingNozzle(
      null
    );

    setShowAddModal(
      false
    );

    setFormData({
      nozzleNumber:
        nozzle.nozzleNumber ??
        "",
      fuelType:
        nozzle.fuelType ===
        "diesel"
          ? "diesel"
          : "petrol",
      openingReading:
        nozzle.openingReading ??
        0,
      currentReading:
        nozzle.currentReading ??
        nozzle.openingReading ??
        0,
      status:
        nozzle.status ||
        (nozzle.active ===
        false
          ? "inactive"
          : "active"),
    });
  };

  /* =====================================
     VIEW NOZZLE
  ===================================== */

  const handleView = (
    nozzle
  ) => {
    if (!nozzle?._id) {
      toast.error(
        "Invalid nozzle."
      );

      return;
    }

    setEditingNozzle(
      null
    );

    setShowAddModal(
      false
    );

    setViewingNozzle(
      nozzle
    );
  };

  /* =====================================
     CLOSE MODALS
  ===================================== */

  const closeModals = () => {
    if (formLoading) {
      return;
    }

    setShowAddModal(
      false
    );

    setEditingNozzle(
      null
    );

    setViewingNozzle(
      null
    );

    resetForm();
  };

  /* =====================================
     VALIDATE FORM
  ===================================== */

  const validateForm = () => {
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

      return false;
    }

    if (
      nozzleNumber.length >
      50
    ) {
      toast.error(
        "Nozzle number is too long."
      );

      return false;
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

      return false;
    }

    if (
      !Number.isFinite(
        openingReading
      ) ||
      openingReading < 0
    ) {
      toast.error(
        "Opening reading must be a valid non-negative number."
      );

      return false;
    }

    if (
      !Number.isFinite(
        currentReading
      ) ||
      currentReading < 0
    ) {
      toast.error(
        "Current reading must be a valid non-negative number."
      );

      return false;
    }

    if (
      currentReading <
      openingReading
    ) {
      toast.error(
        "Current reading cannot be lower than opening reading."
      );

      return false;
    }

    if (
      formData.status !==
        "active" &&
      formData.status !==
        "inactive"
    ) {
      toast.error(
        "Invalid nozzle status."
      );

      return false;
    }

    return true;
  };

  /* =====================================
     ADD / UPDATE NOZZLE
  ===================================== */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      formLoading ||
      !validateForm()
    ) {
      return;
    }

    const payload = {
      nozzleNumber:
        String(
          formData.nozzleNumber
        ).trim(),

      fuelType:
        formData.fuelType,

      openingReading:
        Number(
          formData.openingReading
        ),

      currentReading:
        Number(
          formData.currentReading
        ),

      status:
        formData.status,

      active:
        formData.status ===
        "active",
    };

    try {
      setFormLoading(
        true
      );

      if (editingNozzle?._id) {
        await updateNozzle(
          editingNozzle._id,
          payload
        );

        toast.success(
          "Nozzle updated successfully."
        );
      } else {
        await addNozzle(
          payload
        );

        toast.success(
          "Nozzle added successfully."
        );
      }

      closeModals();

      await loadNozzles();
    } catch (error) {
      console.error(
        "NOZZLE SAVE ERROR:",
        error
      );

      toast.error(
        error.response?.data
          ?.message ||
          "Unable to save nozzle"
      );
    } finally {
      setFormLoading(
        false
      );
    }
  };

  /* =====================================
     DELETE NOZZLE
  ===================================== */

  const handleDelete = async (
    nozzle
  ) => {
    if (
      !nozzle?._id ||
      deleteLoading ||
      formLoading
    ) {
      return;
    }

    const nozzleName =
      nozzle.nozzleNumber
        ? `Nozzle ${nozzle.nozzleNumber}`
        : "this nozzle";

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${nozzleName}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleteLoading(
        true
      );

      await deleteNozzle(
        nozzle._id
      );

      toast.success(
        "Nozzle deleted successfully."
      );

      if (
        viewingNozzle?._id ===
        nozzle._id
      ) {
        setViewingNozzle(
          null
        );
      }

      await loadNozzles();
    } catch (error) {
      console.error(
        "NOZZLE DELETE ERROR:",
        error
      );

      toast.error(
        error.response?.data
          ?.message ||
          "Unable to delete nozzle"
      );
    } finally {
      setDeleteLoading(
        false
      );
    }
  };

  /* =====================================
     DISPLAY HELPERS
  ===================================== */

  const getFuelName = (
    fuelType
  ) => {
    return fuelType ===
      "diesel"
      ? "Diesel"
      : "Petrol";
  };

  const getStatus = (
    nozzle
  ) => {
    if (
      nozzle?.status
    ) {
      return String(
        nozzle.status
      ).toLowerCase();
    }

    return nozzle?.active ===
      false
      ? "inactive"
      : "active";
  };

  const getCurrentReading = (
    nozzle
  ) => {
    const value =
      Number(
        nozzle?.currentReading
      );

    return Number.isFinite(
      value
    )
      ? value.toFixed(2)
      : "0.00";
  };

  return (
    <div className="page-container">

      {/* =============================
          BREADCRUMB
      ============================= */}

      <Breadcrumbs
        items={[
          {
            label: "Nozzles",
          },
          {
            label: "All Nozzles",
          },
        ]}
      />

      {/* =============================
          CONTENT
      ============================= */}

      <div className="content-panel">

        <div className="content-panel-header">

          <div>
            <h2>
              Nozzles
            </h2>

            <p>
              Manage fuel dispensing
              nozzles and their readings.
            </p>
          </div>

          <button
            type="button"
            className="panel-action-button"
            onClick={
              handleOpenAdd
            }
            disabled={
              formLoading ||
              deleteLoading
            }
          >
            Add Nozzle
          </button>

        </div>

        {/* =============================
            TOOLBAR
        ============================= */}

        <div className="table-toolbar">

          <div>
            Show{" "}

            <select
              value={
                pageSize
              }
              onChange={(
                event
              ) =>
                setPageSize(
                  Number(
                    event.target.value
                  )
                )
              }
              aria-label="Number of entries to show"
            >
              <option value="10">
                10
              </option>

              <option value="25">
                25
              </option>

              <option value="50">
                50
              </option>

              <option value="100">
                100
              </option>
            </select>{" "}

            entries
          </div>

          <div className="table-search">

            <label
              htmlFor="nozzle-search"
            >
              Search:
            </label>

            <input
              id="nozzle-search"
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search nozzles..."
              maxLength={100}
            />

          </div>

        </div>

        {/* =============================
            REFRESH
        ============================= */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            marginBottom:
              "12px",
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={
              loadNozzles
            }
            disabled={
              loading ||
              formLoading ||
              deleteLoading
            }
          >
            <RefreshCw
              size={15}
            />

            {loading
              ? "Loading..."
              : "Refresh"}
          </button>
        </div>

        {/* =============================
            TABLE
        ============================= */}

        <div className="table-container">

          <table>

            <thead>

              <tr>

                <th>
                  Nozzle
                </th>

                <th>
                  Fuel
                </th>

                <th>
                  Tank
                </th>

                <th>
                  Current Reading
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign:
                        "center",
                      padding:
                        "30px",
                    }}
                  >
                    Loading nozzles...
                  </td>
                </tr>

              ) : visibleNozzles.length ===
                0 ? (

                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign:
                        "center",
                      padding:
                        "30px",
                    }}
                  >
                    {search
                      ? "No nozzles found matching your search."
                      : "No nozzles available."}
                  </td>
                </tr>

              ) : (

                visibleNozzles.map(
                  (nozzle) => {

                    const status =
                      getStatus(
                        nozzle
                      );

                    return (
                      <tr
                        key={
                          nozzle._id
                        }
                      >

                        <td>
                          <strong>
                            Nozzle{" "}
                            {
                              nozzle.nozzleNumber
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            getFuelName(
                              nozzle.fuelType
                            )
                          }
                        </td>

                        <td>
                          {nozzle.tank ||
                          nozzle.tankName
                            ? nozzle.tank ||
                              nozzle.tankName
                            : "—"}
                        </td>

                        <td>
                          {
                            getCurrentReading(
                              nozzle
                            )}{" "}
                          L
                        </td>

                        <td>

                          <span
                            className={`status-badge ${
                              status ===
                              "active"
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {status ===
                            "active"
                              ? "Active"
                              : "Inactive"}
                          </span>

                        </td>

                        <td>

                          <div className="row-actions">

                            <button
                              type="button"
                              className="action-edit"
                              title="Edit nozzle"
                              onClick={() =>
                                handleEdit(
                                  nozzle
                                )
                              }
                              disabled={
                                formLoading ||
                                deleteLoading
                              }
                            >
                              <Pencil
                                size={
                                  16
                                }
                              />
                            </button>

                            <button
                              type="button"
                              className="action-view"
                              title="View nozzle"
                              onClick={() =>
                                handleView(
                                  nozzle
                                )
                              }
                              disabled={
                                formLoading ||
                                deleteLoading
                              }
                            >
                              <Eye
                                size={
                                  16
                                }
                              />
                            </button>

                            <button
                              type="button"
                              className="action-delete"
                              title="Delete nozzle"
                              onClick={() =>
                                handleDelete(
                                  nozzle
                                )
                              }
                              disabled={
                                formLoading ||
                                deleteLoading
                              }
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )

              )}

            </tbody>

          </table>

        </div>

        {/* =============================
            RESULT COUNT
        ============================= */}

        {!loading &&
          filteredNozzles.length >
            0 && (
            <div
              style={{
                marginTop:
                  "12px",
                fontSize:
                  "13px",
                opacity:
                  0.7,
              }}
            >
              Showing{" "}
              {Math.min(
                filteredNozzles.length,
                Number(
                  pageSize
                )
              )}{" "}
              of{" "}
              {
                filteredNozzles.length
              }{" "}
              nozzle
              {filteredNozzles.length !==
              1
                ? "s"
                : ""}
            </div>
          )}

      </div>

      {/* =============================
          ADD / EDIT MODAL
      ============================= */}

      {(showAddModal ||
        editingNozzle) && (

        <div
          className="modal-backdrop"
          onClick={() => {
            if (
              !formLoading
            ) {
              closeModals();
            }
          }}
        >

          <div
            className="stock-edit-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

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
                    : "Add a new fuel dispensing nozzle."}
                </p>

              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeModals
                }
                disabled={
                  formLoading
                }
                aria-label="Close modal"
              >
                <X
                  size={
                    20
                  }
                />
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >

              {/* NOZZLE NUMBER */}

              <div className="form-group">

                <label
                  htmlFor="nozzle-number"
                >
                  Nozzle Number
                </label>

                <input
                  id="nozzle-number"
                  type="text"
                  name="nozzleNumber"
                  value={
                    formData.nozzleNumber
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="e.g. 1"
                  maxLength={
                    50
                  }
                  disabled={
                    formLoading
                  }
                  required
                />

              </div>

              {/* FUEL TYPE */}

              <div className="form-group">

                <label
                  htmlFor="nozzle-fuel"
                >
                  Fuel Type
                </label>

                <select
                  id="nozzle-fuel"
                  name="fuelType"
                  value={
                    formData.fuelType
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    formLoading ||
                    Boolean(
                      editingNozzle
                    )
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

                {editingNozzle && (
                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                      opacity:
                        0.65,
                    }}
                  >
                    Fuel type cannot
                    be changed after
                    readings exist.
                  </small>
                )}

              </div>

              {/* OPENING READING */}

              <div className="form-group">

                <label
                  htmlFor="nozzle-opening-reading"
                >
                  Opening Reading
                </label>

                <input
                  id="nozzle-opening-reading"
                  type="number"
                  name="openingReading"
                  value={
                    formData.openingReading
                  }
                  onChange={
                    handleFormChange
                  }
                  min="0"
                  step="0.01"
                  disabled={
                    formLoading
                  }
                  required
                />

              </div>

              {/* CURRENT READING */}

              <div className="form-group">

                <label
                  htmlFor="nozzle-current-reading"
                >
                  Current Reading
                </label>

                <input
                  id="nozzle-current-reading"
                  type="number"
                  name="currentReading"
                  value={
                    formData.currentReading
                  }
                  onChange={
                    handleFormChange
                  }
                  min="0"
                  step="0.01"
                  disabled={
                    formLoading
                  }
                  required
                />

              </div>

              {/* STATUS */}

              <div className="form-group">

                <label
                  htmlFor="nozzle-status"
                >
                  Status
                </label>

                <select
                  id="nozzle-status"
                  name="status"
                  value={
                    formData.status
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    formLoading
                  }
                  required
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>

              </div>

              {/* ACTIONS */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeModals
                  }
                  disabled={
                    formLoading
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    formLoading
                  }
                >
                  {formLoading
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

      {/* =============================
          VIEW MODAL
      ============================= */}

      {viewingNozzle && (

        <div
          className="modal-backdrop"
          onClick={() =>
            setViewingNozzle(
              null
            )
          }
        >

          <div
            className="stock-edit-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="stock-edit-modal-header">

              <div>

                <h2>
                  Nozzle{" "}
                  {
                    viewingNozzle.nozzleNumber
                  }
                </h2>

                <p>
                  Nozzle details and
                  current reading.
                </p>

              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setViewingNozzle(
                    null
                  )
                }
                aria-label="Close nozzle details"
              >
                <X
                  size={
                    20
                  }
                />
              </button>

            </div>

            <div
              style={{
                display:
                  "grid",
                gap:
                  "14px",
              }}
            >

              <div>
                <strong>
                  Nozzle Number
                </strong>

                <div>
                  {
                    viewingNozzle.nozzleNumber ||
                    "—"
                  }
                </div>
              </div>

              <div>
                <strong>
                  Fuel Type
                </strong>

                <div>
                  {
                    getFuelName(
                      viewingNozzle.fuelType
                    )
                  }
                </div>
              </div>

              <div>
                <strong>
                  Opening Reading
                </strong>

                <div>
                  {Number(
                    viewingNozzle.openingReading ??
                      0
                  ).toFixed(
                    2
                  )}{" "}
                  L
                </div>
              </div>

              <div>
                <strong>
                  Current Reading
                </strong>

                <div>
                  {
                    getCurrentReading(
                      viewingNozzle
                    )
                  }{" "}
                  L
                </div>
              </div>

              <div>
                <strong>
                  Status
                </strong>

                <div
                  style={{
                    marginTop:
                      "5px",
                  }}
                >
                  <span
                    className={`status-badge ${
                      getStatus(
                        viewingNozzle
                      ) ===
                      "active"
                        ? "active"
                        : "inactive"
                    }`}
                  >
                    {getStatus(
                      viewingNozzle
                    ) ===
                    "active"
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              </div>

            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setViewingNozzle(
                    null
                  )
                }
              >
                Close
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  handleEdit(
                    viewingNozzle
                  )
                }
              >
                <Pencil
                  size={
                    15
                  }
                />

                Edit Nozzle
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default Nozzles;