import mongoose from "mongoose";
import DeletedRecord from "../models/DeletedRecord.js";

/*
=====================================================
RECOVERY SERVICE
=====================================================

Central service for Shivshambho deleted-data recovery.

Responsibilities:
- Create recovery copies before deletion.
- Keep strict pumpId isolation.
- Store deletedBy information.
- Store request metadata.
- Calculate recovery expiration.
- Support MongoDB transactions.
- Support grouped deletion/recovery.
- Provide reusable recovery helpers.

Grouped recovery example:

Client deletion:

deletionGroupId = SAME_ID

Client     -> DeletedRecord
Pump       -> DeletedRecord
Owner User -> DeletedRecord

All records can later be restored together.

IMPORTANT:

Controllers should call this service instead of
directly creating DeletedRecord documents.
=====================================================
*/

/*
=====================================================
DEFAULT CONFIGURATION
=====================================================
*/

const DEFAULT_RETENTION_DAYS = 30;

const MIN_RETENTION_DAYS = 1;

const MAX_RETENTION_DAYS = 365;

/*
=====================================================
GET RETENTION DAYS
=====================================================
*/

const getRetentionDays = () => {
  const configuredDays = Number(
    process.env.DELETED_DATA_RETENTION_DAYS
  );

  if (
    Number.isInteger(configuredDays) &&
    configuredDays >= MIN_RETENTION_DAYS &&
    configuredDays <= MAX_RETENTION_DAYS
  ) {
    return configuredDays;
  }

  return DEFAULT_RETENTION_DAYS;
};

/*
=====================================================
VALIDATE OBJECT ID
=====================================================
*/

const isValidObjectId = (value) => {
  return Boolean(
    value &&
      mongoose.Types.ObjectId.isValid(
        value
      )
  );
};

/*
=====================================================
GET OBJECT ID
=====================================================
*/

const toObjectId = (value) => {
  if (!value) {
    return null;
  }

  if (!isValidObjectId(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(
    value
  );
};

/*
=====================================================
NORMALIZE MODEL/COLLECTION NAME
=====================================================
*/

const normalizeName = (
  value,
  fieldName
) => {
  if (
    !value ||
    typeof value !== "string"
  ) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  if (normalized.length > 100) {
    throw new Error(
      `${fieldName} is too long.`
    );
  }

  if (
    !/^[A-Za-z0-9_-]+$/.test(
      normalized
    )
  ) {
    throw new Error(
      `Invalid ${fieldName}.`
    );
  }

  return normalized;
};

/*
=====================================================
NORMALIZE DELETION GROUP ID
=====================================================

Optional.

When supplied, all documents deleted as part of
one logical operation receive the same group ID.

Example:

Client deletion:

Client     -> group X
Pump       -> group X
Owner User -> group X
=====================================================
*/

const normalizeDeletionGroupId = (
  deletionGroupId
) => {
  if (
    deletionGroupId ===
      null ||
    deletionGroupId ===
      undefined ||
    deletionGroupId === ""
  ) {
    return null;
  }

  const normalized =
    toObjectId(
      deletionGroupId
    );

  if (!normalized) {
    throw new Error(
      "Invalid deletionGroupId."
    );
  }

  return normalized;
};

/*
=====================================================
GENERATE DELETION GROUP ID
=====================================================

Controllers can either provide a group ID or let
this service generate one.

This is useful for multi-document deletions.
=====================================================
*/

export const generateDeletionGroupId =
  () => {
    return new mongoose.Types.ObjectId();
  };

/*
=====================================================
CALCULATE EXPIRATION
=====================================================
*/

const calculateExpirationDate = (
  deletedAt = new Date()
) => {
  const retentionDays =
    getRetentionDays();

  return new Date(
    deletedAt.getTime() +
      retentionDays *
        24 *
        60 *
        60 *
        1000
  );
};

/*
=====================================================
GET REQUEST IP
=====================================================
*/

const getRequestIp = (req) => {
  if (!req) {
    return null;
  }

  const ip =
    req.ip ||
    req.headers?.[
      "x-forwarded-for"
    ] ||
    req.socket?.remoteAddress ||
    null;

  if (!ip) {
    return null;
  }

  return String(ip)
    .split(",")[0]
    .trim()
    .slice(0, 100);
};

/*
=====================================================
GET USER AGENT
=====================================================
*/

const getUserAgent = (req) => {
  if (!req) {
    return null;
  }

  const userAgent =
    req.headers?.[
      "user-agent"
    ] || null;

  if (!userAgent) {
    return null;
  }

  return String(userAgent)
    .slice(0, 1000);
};

/*
=====================================================
NORMALIZE PUMP ID
=====================================================

pumpId is mandatory for business-data recovery.

This is one of the primary protections against
cross-pump data access.
=====================================================
*/

const normalizePumpId = (
  pumpId
) => {
  const normalized =
    toObjectId(pumpId);

  if (!normalized) {
    throw new Error(
      "A valid pumpId is required for deleted-data recovery."
    );
  }

  return normalized;
};

/*
=====================================================
NORMALIZE USER ID
=====================================================
*/

const normalizeUserId = (
  userId
) => {
  const normalized =
    toObjectId(userId);

  if (!normalized) {
    throw new Error(
      "A valid deletedBy user ID is required."
    );
  }

  return normalized;
};

/*
=====================================================
VALIDATE SESSION
=====================================================
*/

const normalizeSession = (
  session
) => {
  if (
    session === null ||
    session === undefined
  ) {
    return null;
  }

  if (
    !session ||
    typeof session.withTransaction !==
      "function"
  ) {
    throw new Error(
      "Invalid MongoDB transaction session."
    );
  }

  return session;
};

/*
=====================================================
CREATE DELETED RECORD
=====================================================

Creates the temporary recovery copy.

IMPORTANT:

This function DOES NOT delete the original document.

The controller remains responsible for deleting
the original document.

Transaction flow:

1. Start transaction.
2. Create recovery snapshot.
3. Delete/update original.
4. Commit.

If any transaction step fails, MongoDB rolls back
both the recovery record and original deletion.
=====================================================
*/

export const createDeletedRecord =
  async ({
    document,
    originalCollection,
    originalModel,
    pumpId,
    deletedBy,
    req = null,
    deletionReason = null,
    deletionGroupId = null,
    session = null,
  }) => {
    /*
    -------------------------------------------------
    BASIC DOCUMENT VALIDATION
    -------------------------------------------------
    */

    if (!document) {
      throw new Error(
        "Cannot create recovery record without the original document."
      );
    }

    /*
    -------------------------------------------------
    NORMALIZE MODEL INFORMATION
    -------------------------------------------------
    */

    const normalizedCollection =
      normalizeName(
        originalCollection,
        "originalCollection"
      );

    const normalizedModel =
      normalizeName(
        originalModel,
        "originalModel"
      );

    /*
    -------------------------------------------------
    NORMALIZE SESSION
    -------------------------------------------------
    */

    const normalizedSession =
      normalizeSession(
        session
      );

    /*
    -------------------------------------------------
    NORMALIZE IDS
    -------------------------------------------------
    */

    const normalizedPumpId =
      normalizePumpId(
        pumpId
      );

    const normalizedDeletedBy =
      normalizeUserId(
        deletedBy
      );

    const normalizedGroupId =
      normalizeDeletionGroupId(
        deletionGroupId
      );

    /*
    -------------------------------------------------
    ORIGINAL DOCUMENT ID
    -------------------------------------------------
    */

    const originalDocumentId =
      document._id;

    if (
      !isValidObjectId(
        originalDocumentId
      )
    ) {
      throw new Error(
        "Original document must contain a valid _id."
      );
    }

    /*
    -------------------------------------------------
    TIMESTAMPS
    -------------------------------------------------
    */

    const deletedAt =
      new Date();

    const expiresAt =
      calculateExpirationDate(
        deletedAt
      );

    /*
    -------------------------------------------------
    SAFE DOCUMENT COPY
    -------------------------------------------------
    */

    let originalData;

    if (
      typeof document.toObject ===
      "function"
    ) {
      originalData =
        document.toObject({
          depopulate: true,
          flattenMaps: true,
          minimize: false,
        });
    } else if (
      typeof document ===
      "object"
    ) {
      originalData = {
        ...document,
      };
    } else {
      throw new Error(
        "Original document data is invalid."
      );
    }

    /*
    -------------------------------------------------
    SANITIZE INTERNAL MONGOOSE PROPERTIES
    -------------------------------------------------
    */

    if (
      originalData &&
      typeof originalData ===
        "object"
    ) {
      delete originalData.$__;

      /*
       * Mongoose will manage __v when the
       * document is restored.
       */
      delete originalData.__v;
    }

    /*
    -------------------------------------------------
    RECOVERY PAYLOAD
    -------------------------------------------------
    */

    const recoveryPayload = {
      originalCollection:
        normalizedCollection,

      originalModel:
        normalizedModel,

      originalId:
        originalDocumentId,

      pumpId:
        normalizedPumpId,

      /*
       * Same group ID is used for every document
       * participating in one logical deletion.
       *
       * Null means this is an independent deletion.
       */
      deletionGroupId:
        normalizedGroupId,

      data:
        originalData,

      deletedBy:
        normalizedDeletedBy,

      deletedAt,

      expiresAt,

      action:
        "DELETE",

      deletionReason:
        deletionReason
          ? String(
              deletionReason
            )
              .trim()
              .slice(0, 500)
          : null,

      ipAddress:
        getRequestIp(req),

      userAgent:
        getUserAgent(req),
    };

    /*
    -------------------------------------------------
    CREATE RECOVERY RECORD
    -------------------------------------------------
    */

    let deletedRecord;

    if (normalizedSession) {
      /*
       * Transaction-safe creation.
       */
      const createdRecords =
        await DeletedRecord.create(
          [recoveryPayload],
          {
            session:
              normalizedSession,
          }
        );

      deletedRecord =
        createdRecords[0];
    } else {
      /*
       * Normal non-transaction operation.
       */
      deletedRecord =
        await DeletedRecord.create(
          recoveryPayload
        );
    }

    return deletedRecord;
  };

/*
=====================================================
FIND RECOVERY RECORD
=====================================================

Always requires pumpId.

This prevents one pump from retrieving another
pump's deleted records.
=====================================================
*/

export const findDeletedRecord =
  async ({
    deletedRecordId,
    pumpId,
  }) => {
    if (
      !deletedRecordId ||
      !isValidObjectId(
        deletedRecordId
      )
    ) {
      throw new Error(
        "Invalid deleted record ID."
      );
    }

    const normalizedPumpId =
      normalizePumpId(
        pumpId
      );

    return DeletedRecord.findOne({
      _id:
        deletedRecordId,

      pumpId:
        normalizedPumpId,
    });
  };

/*
=====================================================
GET DELETED GROUP
=====================================================

Returns all recovery records belonging to the same
logical deletion operation.

Example:

Client deletion group:

[
  Client,
  Pump,
  User
]

This will be used by grouped restoration.
=====================================================
*/

export const getDeletedRecordGroup =
  async ({
    deletionGroupId,
    pumpId,
  }) => {
    const normalizedPumpId =
      normalizePumpId(
        pumpId
      );

    const normalizedGroupId =
      normalizeDeletionGroupId(
        deletionGroupId
      );

    if (!normalizedGroupId) {
      throw new Error(
        "A valid deletionGroupId is required."
      );
    }

    return DeletedRecord.find({
      deletionGroupId:
        normalizedGroupId,

      pumpId:
        normalizedPumpId,
    })
      .sort({
        createdAt: 1,
      })
      .lean();
  };

/*
=====================================================
LIST DELETED RECORDS
=====================================================

Supports:

- pumpId isolation
- collection filtering
- pagination
- maximum page size
=====================================================
*/

export const getDeletedRecords =
  async ({
    pumpId,
    originalCollection = null,
    page = 1,
    limit = 25,
  }) => {
    const normalizedPumpId =
      normalizePumpId(
        pumpId
      );

    const safePage =
      Math.max(
        Number(page) || 1,
        1
      );

    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 25,
          1
        ),
        100
      );

    const skip =
      (safePage - 1) *
      safeLimit;

    const query = {
      pumpId:
        normalizedPumpId,
    };

    if (
      originalCollection &&
      typeof originalCollection ===
        "string"
    ) {
      const normalizedCollection =
        originalCollection.trim();

      if (
        normalizedCollection.length >
        0
      ) {
        query.originalCollection =
          normalizedCollection;
      }
    }

    const [
      records,
      total,
    ] = await Promise.all([
      DeletedRecord.find(
        query
      )
        .sort({
          deletedAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean(),

      DeletedRecord.countDocuments(
        query
      ),
    ]);

    return {
      records,

      pagination: {
        page:
          safePage,

        limit:
          safeLimit,

        total,

        totalPages:
          Math.ceil(
            total /
              safeLimit
          ),
      },
    };
  };

/*
=====================================================
PERMANENTLY DELETE RECOVERY RECORD
=====================================================

This means:

"Delete Forever"

It only removes the recovery copy.

It does NOT modify the original business
collection.
=====================================================
*/

export const permanentlyDeleteRecord =
  async ({
    deletedRecordId,
    pumpId,
  }) => {
    if (
      !deletedRecordId ||
      !isValidObjectId(
        deletedRecordId
      )
    ) {
      throw new Error(
        "Invalid deleted record ID."
      );
    }

    const normalizedPumpId =
      normalizePumpId(
        pumpId
      );

    const deletedRecord =
      await DeletedRecord.findOneAndDelete(
        {
          _id:
            deletedRecordId,

          pumpId:
            normalizedPumpId,
        }
      );

    return deletedRecord;
  };

/*
=====================================================
PERMANENTLY DELETE RECOVERY GROUP
=====================================================

Used when an entire logical deletion group should
be permanently removed.

Example:

Client group:

Client + Pump + Owner User
=====================================================
*/

export const permanentlyDeleteRecordGroup =
  async ({
    deletionGroupId,
    pumpId,
  }) => {
    const normalizedPumpId =
      normalizePumpId(
        pumpId
      );

    const normalizedGroupId =
      normalizeDeletionGroupId(
        deletionGroupId
      );

    if (!normalizedGroupId) {
      throw new Error(
        "A valid deletionGroupId is required."
      );
    }

    return DeletedRecord.deleteMany({
      deletionGroupId:
        normalizedGroupId,

      pumpId:
        normalizedPumpId,
    });
  };

/*
=====================================================
RETENTION INFORMATION
=====================================================
*/

export const getRecoveryRetentionDays =
  () => {
    return getRetentionDays();
  };