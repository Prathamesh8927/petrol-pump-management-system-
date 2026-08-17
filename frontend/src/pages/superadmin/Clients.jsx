import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from "lucide-react";

import toast from "react-hot-toast";

import {
  addClient,
  deleteClient,
  getClients,
  updateClient,
  updateClientStatus,
} from "../../services/superAdminService";

const Clients = () => {
  const [
    clients,
    setClients,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    editingClient,
    setEditingClient,
  ] = useState(null);

  const emptyForm = {
    pumpName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    plan: "standard",
    subscriptionStart: "",
    subscriptionEnd: "",
    status: "active",
    notes: "",
  };

  const [
    formData,
    setFormData,
  ] = useState(
    emptyForm
  );

  const loadClients =
    async () => {
      try {
        setLoading(true);

        const data =
          await getClients();

        setClients(
          data?.clients ||
            []
        );
      } catch (error) {
        toast.error(
          "Unable to load clients"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return clients;
      }

      return clients.filter(
        (client) =>
          [
            client.pumpName,
            client.ownerName,
            client.email,
            client.phone,
            client.pumpCode,
          ].some(
            (field) =>
              String(
                field || ""
              )
                .toLowerCase()
                .includes(
                  value
                )
          )
      );
    }, [
      clients,
      search,
    ]);

  const handleChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setFormData(
        (previous) => ({
          ...previous,

          [name]:
            value,
        })
      );
    };

  const openCreate =
    () => {
      setEditingClient(
        null
      );

      setFormData(
        emptyForm
      );

      setShowModal(
        true
      );
    };

  const openEdit =
    (client) => {
      setEditingClient(
        client
      );

      setFormData({
        pumpName:
          client.pumpName ||
          "",

        ownerName:
          client.ownerName ||
          "",

        email:
          client.email ||
          "",

        phone:
          client.phone ||
          "",

        address:
          client.address ||
          "",

        plan:
          client.plan ||
          "standard",

        subscriptionStart:
          client.subscriptionStart
            ? String(
                client.subscriptionStart
              ).slice(
                0,
                10
              )
            : "",

        subscriptionEnd:
          client.subscriptionEnd
            ? String(
                client.subscriptionEnd
              ).slice(
                0,
                10
              )
            : "",

        status:
          client.status ||
          "active",

        notes:
          client.notes ||
          "",
      });

      setShowModal(
        true
      );
    };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      try {
        if (
          editingClient?._id
        ) {
          await updateClient(
            editingClient._id,
            formData
          );

          toast.success(
            "Client updated"
          );
        } else {
          await addClient(
            formData
          );

          toast.success(
            "Client created"
          );
        }

        setShowModal(
          false
        );

        await loadClients();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to save client"
        );
      }
    };

  const toggleStatus =
    async (client) => {
      const status =
        client.status ===
        "active"
          ? "inactive"
          : "active";

      try {
        await updateClientStatus(
          client._id,
          status
        );

        toast.success(
          `Client ${status}`
        );

        await loadClients();
      } catch (error) {
        toast.error(
          "Unable to change status"
        );
      }
    };

  const removeClient =
    async (client) => {
      const confirmed =
        window.confirm(
          `Delete ${client.pumpName}?`
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteClient(
          client._id
        );

        toast.success(
          "Client deleted"
        );

        await loadClients();
      } catch (error) {
        toast.error(
          "Unable to delete client"
        );
      }
    };

  return (
    <div className="super-client-page">

      <div className="super-client-header">

        <div>
          <h1>
            Clients
          </h1>

          <p>
            Manage all petrol pump
            customers using MyPump.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={
            openCreate
          }
        >
          <Plus size={17} />

          Add Client
        </button>

      </div>

      <div className="content-panel">

        <div className="super-client-toolbar">

          <div className="super-search-box">

            <Search
              size={17}
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search pump, owner, email, phone..."
            />

          </div>

        </div>

        <div className="table-container">

          <table>

            <thead>

              <tr>
                <th>#</th>
                <th>Pump</th>
                <th>Owner</th>
                <th>Contact</th>
                <th>Plan</th>
                <th>Subscription End</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="8"
                    className="empty-table"
                  >
                    Loading clients...
                  </td>
                </tr>

              ) : filteredClients.length ===
                0 ? (

                <tr>
                  <td
                    colSpan="8"
                    className="empty-table"
                  >
                    No clients found.
                  </td>
                </tr>

              ) : (

                filteredClients.map(
                  (
                    client,
                    index
                  ) => (

                    <tr
                      key={
                        client._id
                      }
                    >

                      <td>
                        {index + 1}
                      </td>

                      <td>

                        <strong>
                          {
                            client.pumpName
                          }
                        </strong>

                        <div className="client-small">
                          {
                            client.pumpCode
                          }
                        </div>

                      </td>

                      <td>
                        {
                          client.ownerName
                        }
                      </td>

                      <td>

                        <div>
                          {
                            client.phone ||
                            "-"
                          }
                        </div>

                        <div className="client-small">
                          {
                            client.email
                          }
                        </div>

                      </td>

                      <td>

                        <span className="client-plan">
                          {
                            client.plan
                          }
                        </span>

                      </td>

                      <td>

                        {client.subscriptionEnd
                          ? new Date(
                              client.subscriptionEnd
                            ).toLocaleDateString(
                              "en-IN"
                            )
                          : "-"}

                      </td>

                      <td>

                        <span
                          className={`status-badge ${client.status}`}
                        >
                          {
                            client.status
                          }
                        </span>

                      </td>

                      <td>

                        <div className="row-actions">

                          <button
                            type="button"
                            className="action-edit"
                            onClick={() =>
                              openEdit(
                                client
                              )
                            }
                            title="Edit"
                          >
                            <Pencil
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            className={
                              client.status ===
                              "active"
                                ? "action-delete"
                                : "action-view"
                            }
                            onClick={() =>
                              toggleStatus(
                                client
                              )
                            }
                            title="Change status"
                          >
                            <Power
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            className="action-delete"
                            onClick={() =>
                              removeClient(
                                client
                              )
                            }
                            title="Delete"
                          >
                            <Trash2
                              size={15}
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

      {showModal && (

        <div className="modal-backdrop">

          <div className="super-client-modal">

            <div className="super-client-modal-header">

              <div>
                <h2>
                  {editingClient
                    ? "Edit Client"
                    : "Add New Client"}
                </h2>

                <p>
                  Petrol pump client
                  information.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setShowModal(
                    false
                  )
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

              <div className="form-row">

                <div className="form-group">
                  <label>
                    Pump Name *
                  </label>

                  <input
                    name="pumpName"
                    value={
                      formData.pumpName
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Owner Name *
                  </label>

                  <input
                    name="ownerName"
                    value={
                      formData.ownerName
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />
                </div>

              </div>

              <div className="form-row">

                <div className="form-group">
                  <label>
                    Email *
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={
                      formData.email
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Phone
                  </label>

                  <input
                    name="phone"
                    value={
                      formData.phone
                    }
                    onChange={
                      handleChange
                    }
                  />
                </div>

              </div>

              <div className="form-group">
                <label>
                  Address
                </label>

                <textarea
                  name="address"
                  rows="3"
                  value={
                    formData.address
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className="form-row">

                <div className="form-group">
                  <label>
                    Plan
                  </label>

                  <select
                    name="plan"
                    value={
                      formData.plan
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="basic">
                      Basic
                    </option>

                    <option value="standard">
                      Standard
                    </option>

                    <option value="premium">
                      Premium
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={
                      formData.status
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>

                    <option value="expired">
                      Expired
                    </option>
                  </select>
                </div>

              </div>

              <div className="form-row">

                <div className="form-group">
                  <label>
                    Start Date
                  </label>

                  <input
                    type="date"
                    name="subscriptionStart"
                    value={
                      formData.subscriptionStart
                    }
                    onChange={
                      handleChange
                    }
                  />
                </div>

                <div className="form-group">
                  <label>
                    End Date
                  </label>

                  <input
                    type="date"
                    name="subscriptionEnd"
                    value={
                      formData.subscriptionEnd
                    }
                    onChange={
                      handleChange
                    }
                  />
                </div>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowModal(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingClient
                    ? "Update Client"
                    : "Add Client"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default Clients;