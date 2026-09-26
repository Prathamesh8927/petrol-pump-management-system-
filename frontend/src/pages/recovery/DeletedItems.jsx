
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getDeletedData,
  restoreDeletedData,
  permanentlyDeleteDeletedData,
} from "../../api/recoveryApi";

import "./DeletedItems.css";

/* =====================================================
   CONSTANTS
===================================================== */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const COLLECTION_OPTIONS = [
  {
    value: "",
    label: "All Modules",
  },
  {
    value: "clients",
    label: "Clients",
  },
  {
    value: "sales",
    label: "Sales",
  },
  {
    value: "expenses",
    label: "Expenses",
  },
  {
    value: "ledger",
    label: "Ledger",
  },
  {
    value: "fuelstocks",
    label: "Fuel Stock",
  },
  {
    value: "nozzles",
    label: "Nozzles",
  },
];

/* =====================================================
   HELPERS
===================================================== */

const getRecordId = (record) =>
  record?._id ||
  record?.id ||
  record?.deletedRecordId ||
  null;

const getGroupId = (record) =>
  record?.deletionGroupId || null;

/* =====================================================
   GET DELETED OBJECT NAME
===================================================== */

/*
 * Backend now returns:
 *
 * objectName
 * displayName
 * deletedObjectName
 *
 * We use all three for compatibility.
 *
 * If backend does not provide them, we also try to
 * identify the deleted object directly from its data.
 */

const getDeletedObjectName = (record) => {
  const directName =
    record?.objectName ||
    record?.displayName ||
    record?.deletedObjectName;

  if (
    directName &&
    String(directName).trim()
  ) {
    return String(directName).trim();
  }

  const data =
    record?.data;

  if (
    data &&
    typeof data === "object"
  ) {
    const directFields = [
      "name",
      "customerName",
      "fullName",
      "username",
      "title",
      "label",
      "displayName",
      "pumpName",
      "employeeName",
      "expenseName",
      "nozzleName",
      "fuelName",
      "clientName",
      "supplierName",
      "companyName",
    ];

    for (
      const field of directFields
    ) {
      const value =
        data?.[field];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim()
      ) {
        return String(value).trim();
      }
    }

    /*
     * Ledger customer fallback.
     */

    const vehicleNumber =
      data?.vehicleNumber;

    if (
      vehicleNumber !== undefined &&
      vehicleNumber !== null &&
      String(vehicleNumber).trim()
    ) {
      return `Customer - ${String(
        vehicleNumber
      ).trim()}`;
    }

    const phone =
      data?.phone;

    if (
      phone !== undefined &&
      phone !== null &&
      String(phone).trim()
    ) {
      return `Customer - ${String(
        phone
      ).trim()}`;
    }

    const email =
      data?.email;

    if (
      email !== undefined &&
      email !== null &&
      String(email).trim()
    ) {
      return String(email).trim();
    }
  }

  return null;
};

/* =====================================================
   MODULE NAME
===================================================== */

const getModuleName = (record) => {
  const value =
    record?.originalCollection ||
    record?.originalModel ||
    "Unknown";

  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

/* =====================================================
   DISPLAY NAME
===================================================== */

const getDisplayName = (record) => {
  const objectName =
    getDeletedObjectName(record);

  if (objectName) {
    return objectName;
  }

  return getModuleName(record);
};

/* =====================================================
   DELETED DATE
===================================================== */

const getDeletedDate = (record) => {
  const value =
    record?.deletedAt ||
    record?.createdAt;

  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* =====================================================
   EXPIRY DATE
===================================================== */

const getExpiryDate = (record) => {
  if (!record?.expiresAt) {
    return "—";
  }

  const date = new Date(
    record.expiresAt
  );

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* =====================================================
   REMAINING DAYS
===================================================== */

const getRemainingDays = (record) => {
  if (!record?.expiresAt) {
    return null;
  }

  const expiryTime =
    new Date(record.expiresAt).getTime();

  if (Number.isNaN(expiryTime)) {
    return null;
  }

  const difference =
    expiryTime - Date.now();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference /
      (1000 * 60 * 60 * 24)
  );
};

/* =====================================================
   DELETED BY
===================================================== */

const getDeletedBy = (record) => {
  const deletedBy =
    record?.deletedBy;

  if (!deletedBy) {
    return "Unknown";
  }

  if (
    typeof deletedBy === "string"
  ) {
    return deletedBy;
  }

  return (
    deletedBy.name ||
    deletedBy.fullName ||
    deletedBy.username ||
    deletedBy.email ||
    "Unknown"
  );
};

/* =====================================================
   ERROR MESSAGE
===================================================== */

const getErrorMessage = (
  error,
  fallback
) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

/* =====================================================
   COMPONENT
===================================================== */

const DeletedItems = () => {
  /* ---------------------------------------------------
     DATA
  --------------------------------------------------- */

  const [records, setRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* ---------------------------------------------------
     PAGINATION
  --------------------------------------------------- */

  const [page, setPage] =
    useState(DEFAULT_PAGE);

  const [limit] =
    useState(DEFAULT_LIMIT);

  const [totalPages, setTotalPages] =
    useState(1);

  const [totalRecords, setTotalRecords] =
    useState(0);

  /* ---------------------------------------------------
     FILTERS
  --------------------------------------------------- */

  const [
    originalCollection,
    setOriginalCollection,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  /* ---------------------------------------------------
     ACTION STATES
  --------------------------------------------------- */

  const [
    actionRecordId,
    setActionRecordId,
  ] = useState(null);

  const [
    actionGroupId,
    setActionGroupId,
  ] = useState(null);

  const [
    permanentDeleteId,
    setPermanentDeleteId,
  ] = useState(null);

  /* ===================================================
     FETCH DATA
  =================================================== */

  const fetchDeletedData =
    useCallback(
      async ({
        showLoader = false,
        requestedPage = DEFAULT_PAGE,
      } = {}) => {
        try {
          if (showLoader) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          const params = {
            page: requestedPage,
            limit,
          };

          if (originalCollection) {
            params.originalCollection =
              originalCollection;
          }

          const response =
            await getDeletedData(params);

          /*
           * Expected backend response:
           *
           * {
           *   success: true,
           *   records: [],
           *   pagination: {}
           * }
           *
           * Also support wrapped response shapes
           * for compatibility.
           */

          const payload =
            response?.data &&
            typeof response.data === "object" &&
            !Array.isArray(response.data)
              ? response.data
              : response;

          const list =
            Array.isArray(
              payload?.records
            )
              ? payload.records
              : Array.isArray(
                  payload?.deletedRecords
                )
              ? payload.deletedRecords
              : Array.isArray(
                  payload?.items
                )
              ? payload.items
              : Array.isArray(
                  payload?.results
                )
              ? payload.results
              : Array.isArray(payload)
              ? payload
              : [];

          const pagination =
            payload?.pagination || {};

          const returnedTotalPages =
            Number(
              pagination.totalPages ?? 1
            );

          const returnedTotal =
            Number(
              pagination.total ??
                list.length
            );

          setRecords(list);

          setTotalPages(
            Number.isFinite(
              returnedTotalPages
            ) &&
              returnedTotalPages > 0
              ? returnedTotalPages
              : 1
          );

          setTotalRecords(
            Number.isFinite(
              returnedTotal
            )
              ? returnedTotal
              : list.length
          );
        } catch (requestError) {
          console.error(
            "[DELETED ITEMS] Fetch failed:",
            requestError
          );

          setError(
            getErrorMessage(
              requestError,
              "Unable to load deleted records."
            )
          );

          setRecords([]);
          setTotalRecords(0);
          setTotalPages(1);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        limit,
        originalCollection,
      ]
    );

  /* ===================================================
     INITIAL / FILTER FETCH
  =================================================== */

  useEffect(() => {
    fetchDeletedData({
      showLoader: true,
      requestedPage: page,
    });
  }, [
    page,
    originalCollection,
    fetchDeletedData,
  ]);

  /* ===================================================
     FILTERED RECORDS
  =================================================== */

  const filteredRecords =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return records;
      }

      return records.filter(
        (record) => {
          const searchableText =
            [
              getDeletedObjectName(record),
              getDisplayName(record),
              getModuleName(record),
              getDeletedBy(record),
              record?.originalId,
              record?.deletionReason,
              record?.action,

              /*
               * Search inside the original
               * deleted data as well.
               */
              record?.data?.name,
              record?.data?.customerName,
              record?.data?.fullName,
              record?.data?.username,
              record?.data?.vehicleNumber,
              record?.data?.phone,
              record?.data?.email,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchableText.includes(
            normalizedSearch
          );
        }
      );
    }, [records, search]);

  /* ===================================================
     REFRESH
  =================================================== */

  const handleRefresh = async () => {
    await fetchDeletedData({
      showLoader: false,
      requestedPage: page,
    });
  };

  /* ===================================================
     FILTER CHANGE
  =================================================== */

  const handleCollectionChange = (
    event
  ) => {
    setOriginalCollection(
      event.target.value
    );

    setPage(1);
  };

  /* ===================================================
     RESTORE
  =================================================== */

  const handleRestore = async (
    record
  ) => {
    const recordId =
      getRecordId(record);

    if (!recordId) {
      setError(
        "Unable to identify the deleted record."
      );

      return;
    }

    const itemName =
      getDisplayName(record);

    const confirmed =
      window.confirm(
        `Restore "${itemName}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      setActionRecordId(
        recordId
      );

      /*
       * Always restore the selected recovery
       * record individually.
       *
       * This is especially important for
       * LedgerCustomer because LedgerCustomer
       * is a soft-delete record.
       */

      await restoreDeletedData(
        recordId
      );

      await fetchDeletedData({
        showLoader: false,
        requestedPage: page,
      });
    } catch (restoreError) {
      console.error(
        "[DELETED ITEMS] Restore failed:",
        restoreError
      );

      setError(
        getErrorMessage(
          restoreError,
          `Unable to restore "${itemName}".`
        )
      );
    } finally {
      setActionRecordId(null);
      setActionGroupId(null);
    }
  };

  /* ===================================================
     PERMANENT DELETE
  =================================================== */

  const handlePermanentDelete =
    async () => {
      if (!permanentDeleteId) {
        return;
      }

      try {
        setError("");

        setActionRecordId(
          permanentDeleteId
        );

        await permanentlyDeleteDeletedData(
          permanentDeleteId
        );

        setPermanentDeleteId(null);

        await fetchDeletedData({
          showLoader: false,
          requestedPage: page,
        });
      } catch (deleteError) {
        console.error(
          "[DELETED ITEMS] Permanent deletion failed:",
          deleteError
        );

        setError(
          getErrorMessage(
            deleteError,
            "Unable to permanently delete the recovery record."
          )
        );
      } finally {
        setActionRecordId(null);
      }
    };

  /* ===================================================
     PAGINATION
  =================================================== */

  const handlePreviousPage =
    () => {
      if (page <= 1) {
        return;
      }

      setPage(
        (currentPage) =>
          currentPage - 1
      );
    };

  const handleNextPage =
    () => {
      if (page >= totalPages) {
        return;
      }

      setPage(
        (currentPage) =>
          currentPage + 1
      );
    };

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <div className="deleted-items-page">

      {/* ===============================================
          HEADER
      =============================================== */}

      <div className="deleted-items-header">
        <div>
          <h1>
            Deleted Items
          </h1>

          <p>
            Recover deleted records
            before their retention period
            expires.
          </p>
        </div>

        <button
          type="button"
          className="recovery-refresh-btn"
          onClick={handleRefresh}
          disabled={
            refreshing || loading
          }
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* ===============================================
          INFORMATION
      =============================================== */}

      <div className="recovery-info">
        <div>
          <strong>
            Recovery protection
          </strong>

          <p>
            Deleted records are kept
            temporarily so they can be
            recovered before their
            retention period expires.
          </p>
        </div>
      </div>

      {/* ===============================================
          ERROR
      =============================================== */}

      {error && (
        <div
          className="recovery-error"
          role="alert"
        >
          <span>
            {error}
          </span>

          <button
            type="button"
            className="recovery-error-close"
            onClick={() =>
              setError("")
            }
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      {/* ===============================================
          FILTERS
      =============================================== */}

      <div className="recovery-filters">

        <div className="recovery-filter-field">
          <label
            htmlFor="recovery-search"
          >
            Search
          </label>

          <input
            id="recovery-search"
            className="recovery-search"
            type="search"
            placeholder="Search deleted records..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </div>

        <div className="recovery-filter-field recovery-filter-module">
          <label
            htmlFor="recovery-module"
          >
            Module
          </label>

          <select
            id="recovery-module"
            className="recovery-module-filter"
            value={
              originalCollection
            }
            onChange={
              handleCollectionChange
            }
          >
            {COLLECTION_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </div>

      </div>

      {/* ===============================================
          SUMMARY
      =============================================== */}

      {!loading && (
        <div className="recovery-summary">
          <span>
            Showing{" "}
            <strong>
              {filteredRecords.length}
            </strong>{" "}
            record
            {filteredRecords.length === 1
              ? ""
              : "s"}
          </span>

          <span>
            Total:{" "}
            <strong>
              {totalRecords}
            </strong>
          </span>
        </div>
      )}

      {/* ===============================================
          LOADING
      =============================================== */}

      {loading && (
        <div className="recovery-loading">
          <div
            className="recovery-spinner"
            aria-hidden="true"
          />

          <p>
            Loading deleted records...
          </p>
        </div>
      )}

      {/* ===============================================
          EMPTY STATE
      =============================================== */}

      {!loading &&
        filteredRecords.length ===
          0 && (
          <div className="recovery-empty">

            <div
              className="recovery-empty-icon"
              aria-hidden="true"
            >
              ✓
            </div>

            <h3>
              No deleted records
            </h3>

            <p>
              There are currently no
              deleted records matching
              your filters.
            </p>

          </div>
        )}

      {/* ===============================================
          DESKTOP TABLE
      =============================================== */}

      {!loading &&
        filteredRecords.length >
          0 && (
          <div className="recovery-table-wrapper">

            <table className="recovery-table">

              <thead>
                <tr>
                  <th>
                    Deleted Item
                  </th>

                  <th>
                    Module
                  </th>

                  <th>
                    Deleted
                  </th>

                  <th>
                    Deleted By
                  </th>

                  <th>
                    Expires
                  </th>

                  <th>
                    Remaining
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map(
                  (record) => {
                    const recordId =
                      getRecordId(
                        record
                      );

                    const groupId =
                      getGroupId(
                        record
                      );

                    const remainingDays =
                      getRemainingDays(
                        record
                      );

                    const itemName =
                      getDisplayName(
                        record
                      );

                    const moduleName =
                      getModuleName(
                        record
                      );

                    const isRestoring =
                      Boolean(recordId) &&
                      actionRecordId ===
                        recordId;

                    const isGroupRestoring =
                      Boolean(groupId) &&
                      actionGroupId ===
                        groupId;

                    return (
                      <tr
                        key={
                          recordId ||
                          `${itemName}-${record.deletedAt}`
                        }
                      >

                        {/* =================================
                            DELETED ITEM
                        ================================= */}

                        <td>
                          <div className="recovery-item-name">
                            <strong>
                              {itemName}
                            </strong>

                            {record?.data?.vehicleNumber && (
                              <small>
                                Vehicle:{" "}
                                {
                                  record.data
                                    .vehicleNumber
                                }
                              </small>
                            )}

                            {record?.data?.phone && (
                              <small>
                                Phone:{" "}
                                {
                                  record.data
                                    .phone
                                }
                              </small>
                            )}
                          </div>

                          {groupId && (
                            <small className="recovery-group-badge">
                              Group
                            </small>
                          )}
                        </td>

                        {/* =================================
                            MODULE
                        ================================= */}

                        <td>
                          {moduleName}
                        </td>

                        {/* =================================
                            DELETED
                        ================================= */}

                        <td>
                          {getDeletedDate(
                            record
                          )}
                        </td>

                        {/* =================================
                            DELETED BY
                        ================================= */}

                        <td>
                          {getDeletedBy(
                            record
                          )}
                        </td>

                        {/* =================================
                            EXPIRES
                        ================================= */}

                        <td>
                          {getExpiryDate(
                            record
                          )}
                        </td>

                        {/* =================================
                            REMAINING
                        ================================= */}

                        <td>
                          <span
                            className={
                              remainingDays !==
                                null &&
                              remainingDays <=
                                3
                                ? "recovery-expiring"
                                : "recovery-active"
                            }
                          >
                            {remainingDays ===
                            null
                              ? "—"
                              : remainingDays ===
                                0
                              ? "Expired"
                              : `${remainingDays} day${
                                  remainingDays ===
                                  1
                                    ? ""
                                    : "s"
                                }`}
                          </span>
                        </td>

                        {/* =================================
                            TYPE
                        ================================= */}

                        <td>
                          {record.action ||
                            "DELETE"}
                        </td>

                        {/* =================================
                            ACTIONS
                        ================================= */}

                        <td>
                          <div className="recovery-actions">

                            <button
                              type="button"
                              className="recovery-btn recovery-btn-restore"
                              onClick={() =>
                                handleRestore(
                                  record
                                )
                              }
                              disabled={
                                !recordId ||
                                isRestoring ||
                                isGroupRestoring
                              }
                            >
                              {isRestoring
                                ? "Restoring..."
                                : "Recover"}
                            </button>

                            <button
                              type="button"
                              className="recovery-btn recovery-btn-delete"
                              onClick={() =>
                                setPermanentDeleteId(
                                  recordId
                                )
                              }
                              disabled={
                                !recordId ||
                                isRestoring ||
                                isGroupRestoring
                              }
                            >
                              Delete Forever
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  }
                )}
              </tbody>

            </table>
          </div>
        )}

      {/* ===============================================
          MOBILE CARDS
      =============================================== */}

      {!loading &&
        filteredRecords.length >
          0 && (
          <div className="recovery-mobile-list">

            {filteredRecords.map(
              (record) => {
                const recordId =
                  getRecordId(record);

                const groupId =
                  getGroupId(record);

                const remainingDays =
                  getRemainingDays(
                    record
                  );

                const itemName =
                  getDisplayName(
                    record
                  );

                const moduleName =
                  getModuleName(
                    record
                  );

                const isRestoring =
                  Boolean(recordId) &&
                  actionRecordId ===
                    recordId;

                const isGroupRestoring =
                  Boolean(groupId) &&
                  actionGroupId ===
                    groupId;

                return (
                  <article
                    className="recovery-card"
                    key={
                      recordId ||
                      `${itemName}-${record.deletedAt}`
                    }
                  >

                    {/* =================================
                        CARD HEADER
                    ================================= */}

                    <div className="recovery-card-header">

                      <div>
                        <h3>
                          {itemName}
                        </h3>

                        <span className="recovery-card-module">
                          {moduleName}
                        </span>

                        {groupId && (
                          <span className="recovery-group-badge">
                            Group
                          </span>
                        )}
                      </div>

                      <span className="recovery-card-action">
                        {record.action ||
                          "DELETE"}
                      </span>

                    </div>

                    {/* =================================
                        CARD DETAILS
                    ================================= */}

                    <div className="recovery-card-details">

                      {record?.data?.vehicleNumber && (
                        <div>
                          <span>
                            Vehicle
                          </span>

                          <strong>
                            {
                              record.data
                                .vehicleNumber
                            }
                          </strong>
                        </div>
                      )}

                      {record?.data?.phone && (
                        <div>
                          <span>
                            Phone
                          </span>

                          <strong>
                            {
                              record.data
                                .phone
                            }
                          </strong>
                        </div>
                      )}

                      <div>
                        <span>
                          Deleted
                        </span>

                        <strong>
                          {getDeletedDate(
                            record
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Deleted By
                        </span>

                        <strong>
                          {getDeletedBy(
                            record
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Expires
                        </span>

                        <strong>
                          {getExpiryDate(
                            record
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Remaining
                        </span>

                        <strong
                          className={
                            remainingDays !==
                              null &&
                            remainingDays <=
                              3
                              ? "recovery-expiring"
                              : "recovery-active"
                          }
                        >
                          {remainingDays ===
                          null
                            ? "—"
                            : remainingDays ===
                              0
                            ? "Expired"
                            : `${remainingDays} day${
                                remainingDays ===
                                1
                                  ? ""
                                  : "s"
                              }`}
                        </strong>
                      </div>

                    </div>

                    {/* =================================
                        CARD ACTIONS
                    ================================= */}

                    <div className="recovery-card-actions">

                      <button
                        type="button"
                        className="recovery-btn recovery-btn-restore"
                        onClick={() =>
                          handleRestore(
                            record
                          )
                        }
                        disabled={
                          !recordId ||
                          isRestoring ||
                          isGroupRestoring
                        }
                      >
                        {isRestoring
                          ? "Restoring..."
                          : "Recover"}
                      </button>

                      <button
                        type="button"
                        className="recovery-btn recovery-btn-delete"
                        onClick={() =>
                          setPermanentDeleteId(
                            recordId
                          )
                        }
                        disabled={
                          !recordId ||
                          isRestoring ||
                          isGroupRestoring
                        }
                      >
                        Delete Forever
                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      {/* ===============================================
          PAGINATION
      =============================================== */}

      {!loading &&
        totalPages > 1 && (
          <div className="recovery-pagination">

            <button
              type="button"
              className="recovery-btn recovery-btn-cancel"
              onClick={
                handlePreviousPage
              }
              disabled={page <= 1}
            >
              Previous
            </button>

            <span>
              Page{" "}
              <strong>
                {page}
              </strong>{" "}
              of{" "}
              <strong>
                {totalPages}
              </strong>
            </span>

            <button
              type="button"
              className="recovery-btn recovery-btn-cancel"
              onClick={
                handleNextPage
              }
              disabled={
                page >= totalPages
              }
            >
              Next
            </button>

          </div>
        )}

      {/* ===============================================
          PERMANENT DELETE MODAL
      =============================================== */}

      {permanentDeleteId && (
        <div
          className="recovery-modal-overlay"
          role="presentation"
          onClick={() =>
            setPermanentDeleteId(null)
          }
        >

          <div
            className="recovery-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="permanent-delete-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div
              className="recovery-modal-icon"
              aria-hidden="true"
            >
              !
            </div>

            <h3 id="permanent-delete-title">
              Delete Permanently?
            </h3>

            <p>
              This will permanently
              remove the recovery copy.
              This action cannot be
              undone through the
              application.
            </p>

            <div className="recovery-modal-actions">

              <button
                type="button"
                className="recovery-btn recovery-btn-cancel"
                onClick={() =>
                  setPermanentDeleteId(
                    null
                  )
                }
                disabled={
                  actionRecordId ===
                  permanentDeleteId
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="recovery-btn recovery-btn-delete"
                onClick={
                  handlePermanentDelete
                }
                disabled={
                  actionRecordId ===
                  permanentDeleteId
                }
              >
                {actionRecordId ===
                permanentDeleteId
                  ? "Deleting..."
                  : "Delete Permanently"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default DeletedItems;
