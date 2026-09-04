import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";

import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

const SuperAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const getUsers = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/superadmin/users");

      const data = response?.data;

      if (Array.isArray(data)) {
        setUsers(data);
      } else if (Array.isArray(data?.users)) {
        setUsers(data.users);
      } else if (Array.isArray(data?.data)) {
        setUsers(data.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Failed to load super admin users:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to load users.";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await getUsers();
  };

  const filteredUsers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !searchValue ||
        user?.name?.toLowerCase().includes(searchValue) ||
        user?.email?.toLowerCase().includes(searchValue) ||
        user?.phone?.toLowerCase().includes(searchValue) ||
        user?.role?.toLowerCase().includes(searchValue) ||
        user?.pumpName?.toLowerCase().includes(searchValue) ||
        user?.pump?.pumpName?.toLowerCase().includes(searchValue);

      const matchesRole =
        roleFilter === "all" ||
        String(user?.role || "").toLowerCase() === roleFilter;

      const isActive =
        user?.active === true ||
        user?.active === "true" ||
        user?.status === "active";

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) =>
      user?.active === true ||
      user?.active === "true" ||
      user?.status === "active"
  ).length;

  const inactiveUsers = totalUsers - activeUsers;

  const ownerUsers = users.filter(
    (user) => String(user?.role || "").toLowerCase() === "owner"
  ).length;

  const getRoleLabel = (role) => {
    if (!role) return "Unknown";

    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getRoleClass = (role) => {
    switch (String(role || "").toLowerCase()) {
      case "superadmin":
        return "superadmin-users-role superadmin";

      case "owner":
        return "superadmin-users-role owner";

      case "manager":
        return "superadmin-users-role manager";

      case "staff":
        return "superadmin-users-role staff";

      default:
        return "superadmin-users-role";
    }
  };

  const isUserActive = (user) =>
    user?.active === true ||
    user?.active === "true" ||
    user?.status === "active";

  const getPumpName = (user) => {
    return (
      user?.pumpName ||
      user?.pump?.pumpName ||
      user?.pump?.name ||
      user?.pumpId?.pumpName ||
      "—"
    );
  };

  return (
    <div className="superadmin-users-page">
      <style>{`
        .superadmin-users-page {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        .superadmin-users-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .superadmin-users-title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.4px;
        }

        .superadmin-users-subtitle {
          margin: 7px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .superadmin-users-refresh {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #374151;
          border-radius: 9px;
          padding: 10px 15px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .superadmin-users-refresh:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .superadmin-users-refresh:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .superadmin-users-refresh svg.spinning {
          animation: superadmin-users-spin 0.8s linear infinite;
        }

        @keyframes superadmin-users-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .superadmin-users-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .superadmin-users-stat {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .superadmin-users-stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #374151;
          flex-shrink: 0;
        }

        .superadmin-users-stat-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .superadmin-users-stat-value {
          font-size: 23px;
          line-height: 1;
          font-weight: 700;
          color: #111827;
        }

        .superadmin-users-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
          overflow: hidden;
        }

        .superadmin-users-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .superadmin-users-search {
          position: relative;
          flex: 1;
        }

        .superadmin-users-search svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }

        .superadmin-users-search input {
          width: 100%;
          box-sizing: border-box;
          height: 40px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 12px 0 38px;
          font-size: 14px;
          outline: none;
          color: #111827;
        }

        .superadmin-users-search input:focus {
          border-color: #6b7280;
          box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
        }

        .superadmin-users-filter {
          height: 40px;
          min-width: 135px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 12px;
          background: #ffffff;
          color: #374151;
          font-size: 14px;
          outline: none;
        }

        .superadmin-users-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .superadmin-users-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 850px;
        }

        .superadmin-users-table th {
          text-align: left;
          padding: 13px 16px;
          background: #f9fafb;
          color: #6b7280;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 700;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        .superadmin-users-table td {
          padding: 15px 16px;
          border-bottom: 1px solid #f0f0f0;
          color: #374151;
          font-size: 14px;
          vertical-align: middle;
        }

        .superadmin-users-table tbody tr:hover {
          background: #fafafa;
        }

        .superadmin-users-table tbody tr:last-child td {
          border-bottom: none;
        }

        .superadmin-users-user {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .superadmin-users-avatar {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #374151;
          font-weight: 700;
          flex-shrink: 0;
        }

        .superadmin-users-name {
          font-weight: 600;
          color: #111827;
        }

        .superadmin-users-email {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #6b7280;
          white-space: nowrap;
        }

        .superadmin-users-contact {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #6b7280;
          white-space: nowrap;
        }

        .superadmin-users-role {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          background: #f3f4f6;
          color: #4b5563;
          font-size: 12px;
          font-weight: 700;
        }

        .superadmin-users-role.superadmin {
          background: #ede9fe;
          color: #6d28d9;
        }

        .superadmin-users-role.owner {
          background: #e0f2fe;
          color: #0369a1;
        }

        .superadmin-users-role.manager {
          background: #fef3c7;
          color: #92400e;
        }

        .superadmin-users-role.staff {
          background: #ecfdf5;
          color: #047857;
        }

        .superadmin-users-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
        }

        .superadmin-users-status.active {
          color: #047857;
        }

        .superadmin-users-status.inactive {
          color: #dc2626;
        }

        .superadmin-users-empty {
          padding: 55px 20px;
          text-align: center;
          color: #6b7280;
        }

        .superadmin-users-empty-icon {
          margin: 0 auto 12px;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #6b7280;
        }

        .superadmin-users-empty-title {
          color: #111827;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .superadmin-users-error {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          padding: 13px 15px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
          border-radius: 9px;
          font-size: 14px;
        }

        .superadmin-users-loading {
          padding: 65px 20px;
          text-align: center;
          color: #6b7280;
        }

        .superadmin-users-loading-spinner {
          margin: 0 auto 12px;
          width: 28px;
          height: 28px;
          border: 3px solid #e5e7eb;
          border-top-color: #6b7280;
          border-radius: 50%;
          animation: superadmin-users-spin 0.8s linear infinite;
        }

        .superadmin-users-result-count {
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        }

        @media (max-width: 1000px) {
          .superadmin-users-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .superadmin-users-header {
            flex-direction: column;
          }

          .superadmin-users-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .superadmin-users-filter {
            width: 100%;
          }

          .superadmin-users-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="superadmin-users-header">
        <div>
          <h1 className="superadmin-users-title">Users</h1>
          <p className="superadmin-users-subtitle">
            Manage users and their access across MyPump clients.
          </p>
        </div>

        <button
          type="button"
          className="superadmin-users-refresh"
          onClick={handleRefresh}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "spinning" : ""}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="superadmin-users-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="superadmin-users-stats">
        <div className="superadmin-users-stat">
          <div className="superadmin-users-stat-icon">
            <UsersIcon />
          </div>

          <div>
            <div className="superadmin-users-stat-label">
              Total Users
            </div>
            <div className="superadmin-users-stat-value">
              {totalUsers}
            </div>
          </div>
        </div>

        <div className="superadmin-users-stat">
          <div className="superadmin-users-stat-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <div className="superadmin-users-stat-label">
              Active Users
            </div>
            <div className="superadmin-users-stat-value">
              {activeUsers}
            </div>
          </div>
        </div>

        <div className="superadmin-users-stat">
          <div className="superadmin-users-stat-icon">
            <XCircle size={20} />
          </div>

          <div>
            <div className="superadmin-users-stat-label">
              Inactive Users
            </div>
            <div className="superadmin-users-stat-value">
              {inactiveUsers}
            </div>
          </div>
        </div>

        <div className="superadmin-users-stat">
          <div className="superadmin-users-stat-icon">
            <ShieldCheck size={20} />
          </div>

          <div>
            <div className="superadmin-users-stat-label">
              Pump Owners
            </div>
            <div className="superadmin-users-stat-value">
              {ownerUsers}
            </div>
          </div>
        </div>
      </div>

      <div className="superadmin-users-card">
        <div className="superadmin-users-toolbar">
          <div className="superadmin-users-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search by name, email, phone, role or pump..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="superadmin-users-filter"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="superadmin">Super Admin</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>

          <select
            className="superadmin-users-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="superadmin-users-loading">
            <div className="superadmin-users-loading-spinner" />
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="superadmin-users-empty">
            <div className="superadmin-users-empty-icon">
              <UserRound size={21} />
            </div>

            <div className="superadmin-users-empty-title">
              No users found
            </div>

            <div>
              {users.length === 0
                ? "There are no users available yet."
                : "Try changing your search or filters."}
            </div>
          </div>
        ) : (
          <>
            <div className="superadmin-users-table-wrapper">
              <table className="superadmin-users-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Pump</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user, index) => {
                    const active = isUserActive(user);

                    return (
                      <tr key={user?._id || user?.id || index}>
                        <td>{index + 1}</td>

                        <td>
                          <div className="superadmin-users-user">
                            <div className="superadmin-users-avatar">
                              {String(user?.name || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <div className="superadmin-users-name">
                                {user?.name || "Unnamed User"}
                              </div>

                              <div className="superadmin-users-email">
                                <Mail size={13} />
                                {user?.email || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="superadmin-users-contact">
                            <Phone size={13} />
                            {user?.phone || user?.mobile || "—"}
                          </div>
                        </td>

                        <td>
                          <span className={getRoleClass(user?.role)}>
                            {getRoleLabel(user?.role)}
                          </span>
                        </td>

                        <td>{getPumpName(user)}</td>

                        <td>
                          {active ? (
                            <span className="superadmin-users-status active">
                              <CheckCircle2 size={14} />
                              Active
                            </span>
                          ) : (
                            <span className="superadmin-users-status inactive">
                              <XCircle size={14} />
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="superadmin-users-result-count">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const UsersIcon = () => {
  return <UserRound size={20} />;
};

export default SuperAdminUsers;