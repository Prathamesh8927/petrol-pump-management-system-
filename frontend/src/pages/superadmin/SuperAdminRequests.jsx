import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import api from "../../services/api";

import "./SuperAdminRequests.css";

const SuperAdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");

  const [selectedRequest, setSelectedRequest] =
    useState(null);

  const [rejectingRequest, setRejectingRequest] =
    useState(null);

  const [rejectionReason, setRejectionReason] =
    useState("");

  /* =====================================================
     LOAD REQUESTS
  ===================================================== */

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/superadmin/requests",
        {
          params: {
            status,
            search: search.trim(),
          },
        }
      );

      const data = response.data;

      setRequests(
        Array.isArray(data)
          ? data
          : data?.requests || []
      );
    } catch (error) {
      console.error(
        "REQUESTS LOAD ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to load registration requests."
      );
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRequests();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadRequests]);

  /* =====================================================
     COUNTS
  ===================================================== */

  const currentCount = requests.length;

  const pendingCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "pending"
      ).length,
    [requests]
  );

  const approvedCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "approved"
      ).length,
    [requests]
  );

  const rejectedCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "rejected"
      ).length,
    [requests]
  );

  /* =====================================================
     APPROVE REQUEST
  ===================================================== */

  const approveRequest = async (request) => {
    const confirmed = window.confirm(
      `Approve registration for ${request.name}?`
    );

    if (!confirmed) return;

    try {
      setProcessingId(request._id);

      await api.patch(
        `/superadmin/requests/${request._id}/approve`
      );

      toast.success(
        "Registration approved successfully."
      );

      setSelectedRequest(null);

      await loadRequests();
    } catch (error) {
      console.error(
        "APPROVE ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to approve request."
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* =====================================================
     REJECT REQUEST
  ===================================================== */

  const rejectRequest = async () => {
    if (!rejectingRequest) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      toast.error(
        "Please enter a rejection reason."
      );
      return;
    }

    try {
      setProcessingId(
        rejectingRequest._id
      );

      await api.patch(
        `/superadmin/requests/${rejectingRequest._id}/reject`,
        {
          reason,
        }
      );

      toast.success(
        "Registration rejected successfully."
      );

      setRejectingRequest(null);
      setRejectionReason("");

      await loadRequests();
    } catch (error) {
      console.error(
        "REJECT ERROR:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to reject request."
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* =====================================================
     FORMAT DATE
  ===================================================== */

  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatStatus = (value) => {
    if (!value) return "";

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="superadmin-requests-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="sar-page-header">

        <div className="sar-header-content">

          <div className="sar-header-icon">
            <Building2 size={25} />
          </div>

          <div>
            <div className="sar-breadcrumb">
              Super Admin
              <span>/</span>
              Registration Requests
            </div>

            <h1>
              Registration Requests
            </h1>

            <p>
              Review and manage new petrol
              pump account registrations.
            </p>
          </div>

        </div>

        {/* REFRESH BUTTON */}

        <button
          type="button"
          className="sar-refresh-btn"
          onClick={loadRequests}
          disabled={loading}
          aria-label="Refresh registration requests"
          title="Refresh registration requests"
        >
          <RefreshCw
            size={17}
            strokeWidth={2.2}
            className={
              loading
                ? "sar-spin"
                : ""
            }
          />

          <span>
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </span>
        </button>

      </div>

      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div className="sar-stats-grid">

        <div className="sar-stat-card pending-card">

          <div className="sar-stat-top">

            <div className="sar-stat-icon">
              <Clock3 size={21} />
            </div>

            <span className="sar-stat-label">
              Pending
            </span>

          </div>

          <strong>
            {pendingCount}
          </strong>

          <p>
            Awaiting approval
          </p>

        </div>

        <div className="sar-stat-card approved-card">

          <div className="sar-stat-top">

            <div className="sar-stat-icon">
              <CheckCircle2 size={21} />
            </div>

            <span className="sar-stat-label">
              Approved
            </span>

          </div>

          <strong>
            {approvedCount}
          </strong>

          <p>
            Approved accounts
          </p>

        </div>

        <div className="sar-stat-card rejected-card">

          <div className="sar-stat-top">

            <div className="sar-stat-icon">
              <XCircle size={21} />
            </div>

            <span className="sar-stat-label">
              Rejected
            </span>

          </div>

          <strong>
            {rejectedCount}
          </strong>

          <p>
            Rejected registrations
          </p>

        </div>

        <div className="sar-stat-card total-card">

          <div className="sar-stat-top">

            <div className="sar-stat-icon">
              <Building2 size={21} />
            </div>

            <span className="sar-stat-label">
              Showing
            </span>

          </div>

          <strong>
            {currentCount}
          </strong>

          <p>
            Requests in this view
          </p>

        </div>

      </div>

      {/* =================================================
          TOOLBAR
      ================================================= */}

      <div className="sar-toolbar">

        <div className="sar-search-box">

          <Search size={19} />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search owner, email, pump or city..."
          />

          {search && (
            <button
              type="button"
              className="sar-clear-search"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}

        </div>

        <div className="sar-tabs">

          {[
            {
              value: "pending",
              label: "Pending",
              icon: Clock3,
            },
            {
              value: "approved",
              label: "Approved",
              icon: CheckCircle2,
            },
            {
              value: "rejected",
              label: "Rejected",
              icon: XCircle,
            },
          ].map(
            ({
              value,
              label,
              icon: Icon,
            }) => (
              <button
                key={value}
                type="button"
                className={
                  status === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setStatus(value)
                }
              >
                <Icon size={16} />
                {label}
              </button>
            )
          )}

        </div>

      </div>

      {/* =================================================
          REQUEST TABLE
      ================================================= */}

      <div className="sar-table-card">

        <div className="sar-table-header">

          <div>

            <h2>
              {formatStatus(status)} Requests
            </h2>

            <p>
              {loading
                ? "Loading requests..."
                : `${currentCount} request${
                    currentCount !== 1
                      ? "s"
                      : ""
                  } found`}
            </p>

          </div>

          <span className="sar-results-badge">
            {currentCount}
          </span>

        </div>

        {/* LOADING */}

        {loading ? (
          <div className="sar-state">

            <div className="sar-loading-icon">
              <RefreshCw
                size={28}
                className="sar-spin"
              />
            </div>

            <h3>
              Loading requests
            </h3>

            <p>
              Please wait while we fetch
              registration requests.
            </p>

          </div>

        ) : requests.length === 0 ? (

          /* EMPTY */

          <div className="sar-state">

            <div className="sar-empty-icon">
              <CheckCircle2 size={34} />
            </div>

            <h3>
              No {status} requests
            </h3>

            <p>
              There are currently no
              registration requests in this
              category.
            </p>

            {search && (
              <button
                type="button"
                className="sar-reset-btn"
                onClick={() =>
                  setSearch("")
                }
              >
                Clear search
              </button>
            )}

          </div>

        ) : (

          /* TABLE */

          <div className="sar-table-wrapper">

            <table className="sar-table">

              <thead>

                <tr>
                  <th>Applicant</th>
                  <th>Petrol Pump</th>
                  <th>Contact</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th className="sar-action-head">
                    Action
                  </th>
                </tr>

              </thead>

              <tbody>

                {requests.map(
                  (request) => (
                    <tr
                      key={request._id}
                    >

                      {/* APPLICANT */}

                      <td>

                        <div className="sar-person">

                          <div className="sar-avatar">
                            <UserRound
                              size={18}
                            />
                          </div>

                          <div className="sar-person-info">

                            <strong>
                              {request.name ||
                                "Unknown"}
                            </strong>

                            <span>
                              {request.email ||
                                "-"}
                            </span>

                          </div>

                        </div>

                      </td>

                      {/* PETROL PUMP */}

                      <td>

                        <div className="sar-pump">

                          <div className="sar-pump-name">

                            <Building2
                              size={16}
                            />

                            <strong>
                              {request.pumpName ||
                                "Unnamed Pump"}
                            </strong>

                          </div>

                          <span>

                            <MapPin size={13} />

                            {request.city ||
                              "Location not provided"}

                          </span>

                        </div>

                      </td>

                      {/* CONTACT */}

                      <td>

                        <div className="sar-contact">

                          <span>
                            <Phone size={14} />
                            {request.phone ||
                              "-"}
                          </span>

                          <span>
                            <Mail size={14} />
                            {request.email ||
                              "-"}
                          </span>

                        </div>

                      </td>

                      {/* DATE */}

                      <td>

                        <span className="sar-date">
                          {formatDate(
                            request.createdAt
                          )}
                        </span>

                      </td>

                      {/* STATUS */}

                      <td>

                        <span
                          className={`sar-status ${request.status}`}
                        >

                          {request.status ===
                            "pending" && (
                            <Clock3 size={14} />
                          )}

                          {request.status ===
                            "approved" && (
                            <CheckCircle2
                              size={14}
                            />
                          )}

                          {request.status ===
                            "rejected" && (
                            <XCircle size={14} />
                          )}

                          {formatStatus(
                            request.status
                          )}

                        </span>

                      </td>

                      {/* ACTIONS */}

                      <td>

                        <div className="sar-actions">

                          <button
                            type="button"
                            className="view-action"
                            title="View details"
                            onClick={() =>
                              setSelectedRequest(
                                request
                              )
                            }
                          >
                            <Eye size={16} />
                            <span>
                              View
                            </span>
                          </button>

                          {request.status ===
                            "pending" && (
                            <>

                              <button
                                type="button"
                                className="approve-action"
                                title="Approve"
                                disabled={
                                  processingId ===
                                  request._id
                                }
                                onClick={() =>
                                  approveRequest(
                                    request
                                  )
                                }
                              >
                                <CheckCircle2
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                className="reject-action"
                                title="Reject"
                                disabled={
                                  processingId ===
                                  request._id
                                }
                                onClick={() => {
                                  setRejectingRequest(
                                    request
                                  );

                                  setRejectionReason(
                                    ""
                                  );
                                }}
                              >
                                <XCircle
                                  size={16}
                                />
                              </button>

                            </>
                          )}

                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =================================================
          DETAILS MODAL
      ================================================= */}

      {selectedRequest && (
        <div
          className="sar-modal-overlay"
          onClick={() =>
            setSelectedRequest(null)
          }
        >

          <div
            className="sar-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="sar-modal-header">

              <div className="sar-modal-title">

                <div className="sar-modal-icon">
                  <Building2 size={20} />
                </div>

                <div>

                  <h2>
                    Registration Details
                  </h2>

                  <p>
                    Review applicant and
                    petrol pump information.
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="sar-close-btn"
                onClick={() =>
                  setSelectedRequest(null)
                }
                aria-label="Close details"
              >
                <X size={20} />
              </button>

            </div>

            <div className="sar-detail-body">

              <div className="sar-detail-section">

                <div className="sar-section-title">
                  Applicant Information
                </div>

                <div className="sar-detail-grid">

                  <div>
                    <span>
                      Owner Name
                    </span>

                    <strong>
                      {selectedRequest.name ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Email
                    </span>

                    <strong>
                      {selectedRequest.email ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Phone
                    </span>

                    <strong>
                      {selectedRequest.phone ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Plan
                    </span>

                    <strong>
                      {selectedRequest.plan ||
                        "Standard"}
                    </strong>
                  </div>

                </div>

              </div>

              <div className="sar-detail-section">

                <div className="sar-section-title">
                  Petrol Pump Information
                </div>

                <div className="sar-detail-grid">

                  <div>
                    <span>
                      Petrol Pump
                    </span>

                    <strong>
                      {selectedRequest.pumpName ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Company
                    </span>

                    <strong>
                      {selectedRequest.companyName ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Dealer Code
                    </span>

                    <strong>
                      {selectedRequest.dealerCode ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      GSTIN
                    </span>

                    <strong>
                      {selectedRequest.gstin ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      City
                    </span>

                    <strong>
                      {selectedRequest.city ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      State
                    </span>

                    <strong>
                      {selectedRequest.state ||
                        "-"}
                    </strong>
                  </div>

                  <div className="full">

                    <span>
                      Address
                    </span>

                    <strong>
                      {selectedRequest.address ||
                        "-"}
                    </strong>

                  </div>

                </div>

              </div>

              <div className="sar-detail-section">

                <div className="sar-section-title">
                  Registration Status
                </div>

                <div className="sar-status-row">

                  <span
                    className={`sar-status ${selectedRequest.status}`}
                  >

                    {selectedRequest.status ===
                      "pending" && (
                      <Clock3 size={14} />
                    )}

                    {selectedRequest.status ===
                      "approved" && (
                      <CheckCircle2
                        size={14}
                      />
                    )}

                    {selectedRequest.status ===
                      "rejected" && (
                      <XCircle size={14} />
                    )}

                    {formatStatus(
                      selectedRequest.status
                    )}

                  </span>

                  <span className="sar-submitted">
                    Submitted{" "}
                    {formatDate(
                      selectedRequest.createdAt
                    )}
                  </span>

                </div>

                {selectedRequest.status ===
                  "rejected" && (
                  <div className="sar-rejection-info">

                    <span>
                      Rejection Reason
                    </span>

                    <p>
                      {selectedRequest.rejectionReason ||
                        "No reason provided."}
                    </p>

                  </div>
                )}

              </div>

            </div>

            {selectedRequest.status ===
              "pending" && (
              <div className="sar-modal-footer">

                <button
                  type="button"
                  className="sar-modal-reject"
                  disabled={
                    processingId ===
                    selectedRequest._id
                  }
                  onClick={() => {
                    setRejectingRequest(
                      selectedRequest
                    );

                    setSelectedRequest(
                      null
                    );

                    setRejectionReason(
                      ""
                    );
                  }}
                >
                  <XCircle size={17} />
                  Reject
                </button>

                <button
                  type="button"
                  className="sar-modal-approve"
                  disabled={
                    processingId ===
                    selectedRequest._id
                  }
                  onClick={() =>
                    approveRequest(
                      selectedRequest
                    )
                  }
                >
                  <CheckCircle2 size={17} />
                  Approve Account
                </button>

              </div>
            )}

          </div>

        </div>
      )}

      {/* =================================================
          REJECTION MODAL
      ================================================= */}

      {rejectingRequest && (
        <div
          className="sar-modal-overlay"
          onClick={() =>
            setRejectingRequest(null)
          }
        >

          <div
            className="sar-modal sar-reject-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="sar-modal-header">

              <div className="sar-modal-title">

                <div className="sar-modal-icon rejection-icon">
                  <XCircle size={20} />
                </div>

                <div>

                  <h2>
                    Reject Registration
                  </h2>

                  <p>
                    {rejectingRequest.name}
                    {" — "}
                    {rejectingRequest.pumpName}
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="sar-close-btn"
                onClick={() =>
                  setRejectingRequest(
                    null
                  )
                }
                aria-label="Close rejection dialog"
              >
                <X size={20} />
              </button>

            </div>

            <div className="sar-reject-content">

              <div className="sar-warning-box">

                <XCircle size={20} />

                <p>
                  This registration will be
                  marked as rejected. The
                  reason will be saved with
                  the registration record.
                </p>

              </div>

              <label className="sar-form-label">

                Rejection Reason
                <span>*</span>

              </label>

              <textarea
                value={rejectionReason}
                onChange={(e) =>
                  setRejectionReason(
                    e.target.value
                  )
                }
                rows={5}
                placeholder="Enter a clear reason for rejecting this registration..."
                autoFocus
              />

            </div>

            <div className="sar-modal-footer">

              <button
                type="button"
                className="sar-cancel-btn"
                onClick={() =>
                  setRejectingRequest(
                    null
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="sar-modal-reject"
                disabled={
                  processingId ===
                    rejectingRequest._id ||
                  !rejectionReason.trim()
                }
                onClick={
                  rejectRequest
                }
              >

                <XCircle size={17} />

                {processingId ===
                rejectingRequest._id
                  ? "Rejecting..."
                  : "Reject Request"}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default SuperAdminRequests;