import {
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  getPumpUsers,
  addPumpUser,
  updatePumpUser,
  deletePumpUser,
} from "../../services/settingsService";

const UserManagement = () => {
  const [
    users,
    setUsers,
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
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
  });

  /* =====================================
     LOAD USERS
  ===================================== */

  const loadUsers =
    async () => {
      try {
        setLoading(true);

        const data =
          await getPumpUsers();

        setUsers(
          data.users || []
        );
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to load users"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadUsers();
  }, []);

  /* =====================================
     ADD USER
  ===================================== */

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      try {
        setSaving(true);

        await addPumpUser(
          form
        );

        toast.success(
          "User added successfully"
        );

        setForm({
          name: "",
          email: "",
          password: "",
          role: "staff",
        });

        setShowModal(false);

        await loadUsers();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to add user"
        );
      } finally {
        setSaving(false);
      }
    };

  /* =====================================
     STATUS
  ===================================== */

  const toggleStatus =
    async (user) => {
      try {
        await updatePumpUser(
          user._id,
          {
            active:
              user.active ===
              false,
          }
        );

        toast.success(
          "User status updated"
        );

        await loadUsers();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to update user"
        );
      }
    };

  /* =====================================
     DELETE
  ===================================== */

  const handleDelete =
    async (user) => {
      if (
        !window.confirm(
          `Delete ${user.name}?`
        )
      ) {
        return;
      }

      try {
        await deletePumpUser(
          user._id
        );

        toast.success(
          "User deleted"
        );

        await loadUsers();
      } catch (error) {
        toast.error(
          error.response?.data
            ?.message ||
            "Unable to delete user"
        );
      }
    };

  return (
    <div className="page-container">

      <div className="page-header">

        <div>
          <h1>
            User Management
          </h1>

          <p>
            Manage pump staff
            accounts and access.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() =>
            setShowModal(true)
          }
        >
          <Plus size={17} />
          Add User
        </button>

      </div>

      <div className="content-panel">

        <div className="table-container">

          <table>

            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="6"
                    className="empty-table"
                  >
                    Loading users...
                  </td>
                </tr>

              ) : users.length ===
                0 ? (

                <tr>
                  <td
                    colSpan="6"
                    className="empty-table"
                  >
                    No users found.
                  </td>
                </tr>

              ) : (

                users.map(
                  (
                    user,
                    index
                  ) => (

                    <tr
                      key={
                        user._id
                      }
                    >

                      <td>
                        {index + 1}
                      </td>

                      <td>

                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap:
                              "8px",
                          }}
                        >
                          <UserRound
                            size={17}
                          />

                          <strong>
                            {
                              user.name
                            }
                          </strong>
                        </div>

                      </td>

                      <td>
                        {
                          user.email
                        }
                      </td>

                      <td
                        style={{
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {
                          user.role
                        }
                      </td>

                      <td>

                        <button
                          type="button"
                          className={
                            user.active ===
                            false
                              ? "secondary-button"
                              : "primary-button"
                          }
                          onClick={() =>
                            toggleStatus(
                              user
                            )
                          }
                        >
                          {user.active ===
                          false
                            ? "Inactive"
                            : "Active"}
                        </button>

                      </td>

                      <td>

                        <button
                          type="button"
                          className="action-delete"
                          title="Delete User"
                          onClick={() =>
                            handleDelete(
                              user
                            )
                          }
                        >
                          <Trash2
                            size={16}
                          />
                        </button>

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ADD USER MODAL */}

      {showModal && (

        <div className="modal-backdrop">

          <div className="stock-edit-modal">

            <div className="stock-edit-modal-header">

              <div>
                <h2>
                  Add User
                </h2>

                <p>
                  Create a staff
                  account.
                </p>
              </div>

              <button
                className="modal-close-button"
                type="button"
                onClick={() =>
                  setShowModal(false)
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

              <div className="form-group">

                <label>
                  Name
                </label>

                <input
                  value={
                    form.name
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name:
                        e.target
                          .value,
                    })
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Email
                </label>

                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email:
                        e.target
                          .value,
                    })
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Password
                </label>

                <input
                  type="password"
                  value={
                    form.password
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password:
                        e.target
                          .value,
                    })
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Role
                </label>

                <select
                  value={
                    form.role
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role:
                        e.target
                          .value,
                    })
                  }
                >
                  <option value="staff">
                    Staff
                  </option>

                  <option value="manager">
                    Manager
                  </option>
                </select>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowModal(false)
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
                    ? "Creating..."
                    : "Create User"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default UserManagement;