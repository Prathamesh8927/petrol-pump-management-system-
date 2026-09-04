import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search, RefreshCw, Check, X } from "lucide-react";

import api from "../../services/api";

const SuperAdminPasswordRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");

  const loadRequests = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = {};

      if (status) {
        params.status = status;
      }

      if (search.trim()) {
        params.search = search.trim();
      }

      const response = await api.get(
        "/superadmin/password-requests",
        {
          params,
        }
      );

      console.log(
        "PASSWORD REQUESTS RESPONSE:",
        response.data
      );

      const data = response.data;

      if (data?.success === false) {
        throw new Error(
          data?.message || "Unable to load requests."
        );
      }

      setRequests(
        Array.isArray(data?.requests)
          ? data.requests
          : []
      );
    } catch (error) {
      console.error(
        "LOAD PASSWORD REQUESTS ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load password requests."
      );

      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [status]);

  const approveRequest = async (id) => {
    if (!window.confirm("Approve this password reset request?")) {
      return;
    }

    try {
      await api.patch(
        `/superadmin/password-requests/${id}/approve`
      );

      toast.success("Password reset request approved.");

      await loadRequests(true);
    } catch (error) {
      console.error(
        "APPROVE PASSWORD REQUEST ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Unable to approve request."
      );
    }
  };

  const rejectRequest = async (id) => {
    const reason = window.prompt(
      "Enter rejection reason:"
    );

    if (reason === null) {
      return;
    }

    try {
      await api.patch(
        `/superadmin/password-requests/${id}/reject`,
        {
          reason: reason.trim(),
        }
      );

      toast.success("Password reset request rejected.");

      await loadRequests(true);
    } catch (error) {
      console.error(
        "REJECT PASSWORD REQUEST ERROR:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Unable to reject request."
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserName = (request) => {
    return (
      request?.userId?.name ||
      request?.email ||
      "Unknown User"
    );
  };

  const getUserEmail = (request) => {
    return (
      request?.email ||
      request?.userId?.email ||
      "-"
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadRequests();
  };

  return (
    <div
      style={{
        padding: "24px",
        width: "100%",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            Password Requests
          </h1>

          <p
            style={{
              marginTop: "6px",
              color: "#64748b",
            }}
          >
            Review client password recovery requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadRequests(true)}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            background: "#fff",
            cursor: refreshing
              ? "not-allowed"
              : "pointer",
          }}
        >
          <RefreshCw
            size={17}
            style={{
              animation: refreshing
                ? "spin 1s linear infinite"
                : "none",
            }}
          />

          Refresh
        </button>
      </div>

      {/* FILTERS */}

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
          style={{
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#fff",
            minWidth: "150px",
          }}
        >
          <option value="pending">
            Pending
          </option>

          <option value="approved">
            Approved
          </option>

          <option value="rejected">
            Rejected
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="">
            All Requests
          </option>
        </select>

        <form
          onSubmit={handleSearch}
          style={{
            display: "flex",
            gap: "8px",
            flex: 1,
            minWidth: "250px",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: 1,
            }}
          >
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search by email..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px 10px 40px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* TABLE */}

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          overflow: "auto",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "50px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            Loading password requests...
          </div>
        ) : requests.length === 0 ? (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <h3
              style={{
                marginBottom: "8px",
                color: "#334155",
              }}
            >
              No password requests found
            </h3>

            <p style={{ margin: 0 }}>
              There are no requests matching the
              selected filter.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "850px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom:
                    "1px solid #e5e7eb",
                  background: "#f8fafc",
                }}
              >
                <th style={thStyle}>#</th>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Requested</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((request, index) => (
                <tr
                  key={request._id}
                  style={{
                    borderBottom:
                      "1px solid #f1f5f9",
                  }}
                >
                  <td style={tdStyle}>
                    {index + 1}
                  </td>

                  <td style={tdStyle}>
                    <strong>
                      {getUserName(request)}
                    </strong>
                  </td>

                  <td style={tdStyle}>
                    {getUserEmail(request)}
                  </td>

                  <td style={tdStyle}>
                    <span
                      style={getStatusStyle(
                        request.status
                      )}
                    >
                      {request.status}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    {formatDate(
                      request.createdAt
                    )}
                  </td>

                  <td style={tdStyle}>
                    {request.status === "pending" ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            approveRequest(
                              request._id
                            )
                          }
                          style={{
                            ...actionButton,
                            background:
                              "#16a34a",
                          }}
                        >
                          <Check size={15} />
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            rejectRequest(
                              request._id
                            )
                          }
                          style={{
                            ...actionButton,
                            background:
                              "#dc2626",
                          }}
                        >
                          <X size={15} />
                          Reject
                        </button>
                      </div>
                    ) : request.status ===
                      "rejected" ? (
                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "13px",
                        }}
                      >
                        {request.rejectionReason ||
                          "Rejected"}
                      </span>
                    ) : request.status ===
                      "approved" ? (
                      <span
                        style={{
                          color: "#15803d",
                          fontSize: "13px",
                        }}
                      >
                        Approved
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "13px",
                        }}
                      >
                        Completed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const thStyle = {
  padding: "14px 16px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: 600,
  color: "#475569",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "14px 16px",
  fontSize: "14px",
  color: "#334155",
};

const actionButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "8px 12px",
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "13px",
  cursor: "pointer",
};

const getStatusStyle = (status) => {
  const base = {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "capitalize",
  };

  if (status === "pending") {
    return {
      ...base,
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (status === "approved") {
    return {
      ...base,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "rejected") {
    return {
      ...base,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    ...base,
    background: "#e0e7ff",
    color: "#3730a3",
  };
};

export default SuperAdminPasswordRequests;