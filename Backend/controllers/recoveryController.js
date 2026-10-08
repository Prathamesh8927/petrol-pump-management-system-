import mongoose from "mongoose";

import DeletedRecord from "../models/DeletedRecord.js";
import LedgerCustomer from "../models/LedgerCustomer.js";

import {
  findDeletedRecord,
  getDeletedRecordGroup,
  getDeletedRecords,
  permanentlyDeleteRecord,
} from "../services/recoveryService.js";

/*
=====================================================
RECOVERY CONTROLLER
=====================================================

Responsibilities:

- Show deleted records
- Show deleted object names
- Restore deleted records
- Restore LedgerCustomer correctly
- Restore grouped records
- Permanently delete recovery records
- Strict pumpId isolation
- Safe MongoDB transactions
- Reduced duplicate restore logic
=====================================================
*/

/*
=====================================================
CONSTANTS
=====================================================
*/

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const SUPERADMIN_ROLES = new Set([
  "superadmin",
  "super_admin",
]);

const ALLOWED_RESTORE_MODELS = new Set([
  "Client",
  "Pump",
  "User",
  "LedgerCustomer",
  "Expense",
  "Employee",
  "Nozzle",
  "FuelStock",
]);

const PROTECTED_RESTORE_FIELDS = new Set([
  "_id",
  "pumpId",
  "__v",
  "createdAt",
  "updatedAt",
]);

const LEDGER_CUSTOMER_RESTORE_FIELDS = [
  "name",
  "phone",
  "vehicleNumber",
  "address",
  "currentBalance",
  "note",
];

/*
=====================================================
ERROR HELPERS
=====================================================
*/

const createControllerError = (
  message,
  statusCode = 500
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getErrorMessage = (error) => {
  if (!error) {
    return "An unexpected error occurred.";
  }

  if (typeof error === "string") {
    return error;
  }

  return (
    error.message ||
    "An unexpected error occurred."
  );
};

/*
=====================================================
BASIC HELPERS
=====================================================
*/

const normalizeString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
};

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

const toObjectId = (value) => {
  if (!isValidObjectId(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
};

const toPlainObject = (value) => {
  if (!value) {
    return value;
  }

  if (
    typeof value.toObject === "function"
  ) {
    return value.toObject();
  }

  return value;
};

/*
=====================================================
AUTHENTICATED USER
=====================================================
*/

const getAuthenticatedUserId = (req) => {
  const userId =
    req?.user?._id ||
    req?.user?.id ||
    req?.user?.userId;

  if (!userId) {
    throw createControllerError(
      "Authenticated user not found.",
      401
    );
  }

  const objectId =
    toObjectId(userId);

  if (!objectId) {
    throw createControllerError(
      "Authenticated user ID is invalid.",
      401
    );
  }

  return objectId;
};

/*
=====================================================
USER ROLE
=====================================================
*/

const getUserRole = (req) => {
  return normalizeString(
    req?.user?.role ||
      req?.user?.userRole ||
      req?.user?.type
  ).toLowerCase();
};

/*
=====================================================
PUMP AUTHORIZATION
=====================================================
*/

const getAuthorizedPumpId = (req) => {
  const role = getUserRole(req);

  const requestedPumpId =
    req?.query?.pumpId ||
    req?.body?.pumpId ||
    req?.headers?.["x-pump-id"];

  const userPumpId =
    req?.user?.pumpId ||
    req?.user?.pumpID ||
    req?.user?.pump;

  /*
   * Superadmin must explicitly provide pumpId.
   */
  if (
    SUPERADMIN_ROLES.has(role)
  ) {
    if (!requestedPumpId) {
      throw createControllerError(
        "pumpId is required for superadmin recovery operations.",
        400
      );
    }

    const pumpId =
      toObjectId(requestedPumpId);

    if (!pumpId) {
      throw createControllerError(
        "Invalid pumpId.",
        400
      );
    }

    return pumpId;
  }

  /*
   * Normal users can ONLY access
   * their own pump.
   */
  if (!userPumpId) {
    throw createControllerError(
      "Your account is not associated with a pump.",
      403
    );
  }

  const pumpId =
    toObjectId(userPumpId);

  if (!pumpId) {
    throw createControllerError(
      "Your pump ID is invalid.",
      403
    );
  }

  return pumpId;
};

/*
=====================================================
MODEL HELPERS
=====================================================
*/

const isAllowedRestoreModel = (
  modelName
) => {
  return ALLOWED_RESTORE_MODELS.has(
    normalizeString(modelName)
  );
};

const isLedgerCustomerModel = (
  modelName
) => {
  return (
    normalizeString(modelName) ===
    "LedgerCustomer"
  );
};

const getRegisteredModel = (
  modelName
) => {
  const normalizedModel =
    normalizeString(modelName);

  if (
    !isAllowedRestoreModel(
      normalizedModel
    )
  ) {
    throw createControllerError(
      `Restoration of ${normalizedModel} records is not supported.`,
      400
    );
  }

  const Model =
    mongoose.models[normalizedModel];

  if (!Model) {
    throw createControllerError(
      `Mongoose model ${normalizedModel} is not registered.`,
      500
    );
  }

  return Model;
};

/*
=====================================================
OBJECT NAME
=====================================================
*/

const getObjectName = (
  data,
  originalModel,
  originalId = null
) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return (
      normalizeString(originalId) ||
      "Deleted record"
    );
  }

  const modelName =
    normalizeString(originalModel);

  /*
   * Generic name fields.
   */
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

  for (const field of directFields) {
    const value =
      normalizeString(data[field]);

    if (value) {
      return value;
    }
  }

  /*
   * Ledger Customer.
   */
  if (
    modelName ===
    "LedgerCustomer"
  ) {
    const vehicleNumber =
      normalizeString(
        data.vehicleNumber
      );

    if (vehicleNumber) {
      return `Customer - ${vehicleNumber}`;
    }

    const phone =
      normalizeString(data.phone);

    if (phone) {
      return `Customer - ${phone}`;
    }
  }

  /*
   * Employee.
   */
  if (modelName === "Employee") {
    const employeeName =
      normalizeString(
        data.name ||
          data.employeeName ||
          data.fullName
      );

    if (employeeName) {
      return employeeName;
    }
  }

  /*
   * Expense.
   */
  if (modelName === "Expense") {
    const expenseName =
      normalizeString(
        data.name ||
          data.expenseName ||
          data.description ||
          data.category
      );

    if (expenseName) {
      return expenseName;
    }
  }

  /*
   * Nozzle.
   */
  if (modelName === "Nozzle") {
    const nozzleName =
      normalizeString(
        data.name ||
          data.nozzleName ||
          data.nozzleNumber ||
          data.number
      );

    if (nozzleName) {
      return nozzleName;
    }
  }

  /*
   * Fuel Stock.
   */
  if (modelName === "FuelStock") {
    const fuelName =
      normalizeString(
        data.name ||
          data.fuelName ||
          data.fuelType ||
          data.type
      );

    if (fuelName) {
      return fuelName;
    }
  }

  /*
   * Client.
   */
  if (modelName === "Client") {
    const clientName =
      normalizeString(
        data.name ||
          data.clientName ||
          data.companyName
      );

    if (clientName) {
      return clientName;
    }
  }

  /*
   * Pump.
   */
  if (modelName === "Pump") {
    const pumpName =
      normalizeString(
        data.name ||
          data.pumpName ||
          data.companyName
      );

    if (pumpName) {
      return pumpName;
    }
  }

  /*
   * User.
   */
  if (modelName === "User") {
    const userName =
      normalizeString(
        data.name ||
          data.fullName ||
          data.username ||
          data.email
      );

    if (userName) {
      return userName;
    }
  }

  /*
   * Email fallback.
   */
  const email =
    normalizeString(data.email);

  if (email) {
    return email;
  }

  /*
   * Phone fallback.
   */
  const phone =
    normalizeString(data.phone);

  if (phone) {
    return phone;
  }

  /*
   * Vehicle fallback.
   */
  const vehicleNumber =
    normalizeString(
      data.vehicleNumber
    );

  if (vehicleNumber) {
    return vehicleNumber;
  }

  /*
   * MongoDB ID fallback.
   */
  if (data._id) {
    return String(data._id);
  }

  if (originalId) {
    return String(originalId);
  }

  return "Deleted record";
};

/*
=====================================================
FORMAT DELETED RECORD
=====================================================
*/

const formatDeletedRecord = (
  record
) => {
  if (!record) {
    return record;
  }

  const data =
    record.data &&
    typeof record.data === "object"
      ? record.data
      : {};

  const objectName =
    getObjectName(
      data,
      record.originalModel,
      record.originalId
    );

  return {
    ...record,

    objectName,

    displayName:
      objectName,

    deletedObjectName:
      objectName,

    objectType:
      record.originalModel ||
      "Unknown",
  };
};

const formatDeletedRecords = (
  records
) => {
  if (!Array.isArray(records)) {
    return [];
  }

  return records.map(
    formatDeletedRecord
  );
};

/*
=====================================================
PREPARE RESTORE DATA
=====================================================
*/

const prepareRestoreData = (
  deletedRecord
) => {
  if (!deletedRecord) {
    throw createControllerError(
      "Recovery record not found.",
      404
    );
  }

  const originalModel =
    normalizeString(
      deletedRecord.originalModel
    );

  if (
    !isAllowedRestoreModel(
      originalModel
    )
  ) {
    throw createControllerError(
      `Restoration of ${originalModel} records is not supported.`,
      400
    );
  }

  if (
    !deletedRecord.data ||
    typeof deletedRecord.data !==
      "object"
  ) {
    throw createControllerError(
      "Deleted record does not contain valid restore data.",
      400
    );
  }

  const restoreData = {
    ...deletedRecord.data,
  };

  /*
   * Always restore original ID.
   */
  restoreData._id =
    deletedRecord.originalId;

  /*
   * Always restore into authorized pump.
   */
  restoreData.pumpId =
    deletedRecord.pumpId;

  /*
   * Never restore Mongoose version.
   */
  delete restoreData.__v;

  return restoreData;
};

/*
=====================================================
START SESSION
=====================================================
*/

const withTransaction = async (
  callback
) => {
  const session =
    await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        result =
          await callback(session);
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};

/*
=====================================================
RESTORE LEDGER CUSTOMER
=====================================================
*/

const restoreLedgerCustomer = async ({
  deletedRecord,
  pumpId,
  session,
}) => {
  const restoreData =
    prepareRestoreData(
      deletedRecord
    );

  /*
   * IMPORTANT:
   * Never allow deleted recovery data
   * to restore a different pump.
   */
  restoreData.pumpId =
    new mongoose.Types.ObjectId(
      pumpId
    );

  const existingCustomer =
    await LedgerCustomer.findOne({
      _id: restoreData._id,
      pumpId,
    }).session(session);

  if (existingCustomer) {
    /*
     * Reactivate existing soft-deleted
     * customer and restore important fields.
     */
    existingCustomer.status =
      "active";

    for (const field of
      LEDGER_CUSTOMER_RESTORE_FIELDS) {
      if (
        restoreData[field] !==
        undefined
      ) {
        existingCustomer[field] =
          restoreData[field];
      }
    }

    return existingCustomer.save({
      session,
    });
  }

  /*
   * Original customer was physically
   * deleted, recreate it.
   */
  restoreData.status =
    "active";

  const [createdCustomer] =
    await LedgerCustomer.create(
      [restoreData],
      {
        session,
      }
    );

  return createdCustomer;
};

/*
=====================================================
RESTORE GENERIC DOCUMENT
=====================================================
*/

const restoreGenericDocument = async ({
  deletedRecord,
  pumpId,
  session,
}) => {
  const modelName =
    normalizeString(
      deletedRecord.originalModel
    );

  const Model =
    getRegisteredModel(
      modelName
    );

  const restoreData =
    prepareRestoreData(
      deletedRecord
    );

  /*
   * Force authorized pump.
   */
  restoreData.pumpId =
    new mongoose.Types.ObjectId(
      pumpId
    );

  const existingDocument =
    await Model.findOne({
      _id: restoreData._id,
      pumpId,
    }).session(session);

  let restoredDocument;

  if (existingDocument) {
    /*
     * Existing soft-deleted document.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        existingDocument.toObject(),
        "status"
      )
    ) {
      existingDocument.status =
        "active";
    }

    for (const [
      key,
      value,
    ] of Object.entries(
      restoreData
    )) {
      if (
        PROTECTED_RESTORE_FIELDS.has(
          key
        )
      ) {
        continue;
      }

      if (value !== undefined) {
        existingDocument[key] =
          value;
      }
    }

    restoredDocument =
      await existingDocument.save({
        session,
      });
  } else {
    /*
     * Original document no longer exists.
     * Recreate it.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        restoreData,
        "status"
      )
    ) {
      restoreData.status =
        "active";
    }

    const [createdDocument] =
      await Model.create(
        [restoreData],
        {
          session,
        }
      );

    restoredDocument =
      createdDocument;
  }

  return restoredDocument;
};

/*
=====================================================
DELETE RECOVERY RECORD INSIDE TRANSACTION
=====================================================
*/

const deleteRecoveryRecord = async ({
  recoveryId,
  pumpId,
  session,
}) => {
  const deleteResult =
    await DeletedRecord.deleteOne(
      {
        _id: recoveryId,
        pumpId,
      },
      {
        session,
      }
    );

  if (
    deleteResult.deletedCount !==
    1
  ) {
    throw createControllerError(
      "Recovery record changed before restoration completed.",
      409
    );
  }

  return true;
};

/*
=====================================================
RESTORE ONE RECORD
=====================================================
*/

const restoreOneRecord = async ({
  deletedRecord,
  pumpId,
}) => {
  const modelName =
    normalizeString(
      deletedRecord.originalModel
    );

  return withTransaction(
    async (session) => {
      let restoredDocument;

      if (
        isLedgerCustomerModel(
          modelName
        )
      ) {
        restoredDocument =
          await restoreLedgerCustomer({
            deletedRecord,
            pumpId,
            session,
          });
      } else {
        restoredDocument =
          await restoreGenericDocument({
            deletedRecord,
            pumpId,
            session,
          });
      }

      /*
       * Delete recovery entry ONLY after
       * restoration succeeded.
       */
      await deleteRecoveryRecord({
        recoveryId:
          deletedRecord._id,
        pumpId,
        session,
      });

      return restoredDocument;
    }
  );
};

/*
=====================================================
GET DELETED DATA
=====================================================
*/

export const getDeletedData =
  async (req, res) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      /*
       * Normalize pagination before passing
       * it to the service.
       */
      const page = Math.max(
        Number(req.query?.page) ||
          DEFAULT_PAGE,
        1
      );

      const limit = Math.min(
        Math.max(
          Number(req.query?.limit) ||
            DEFAULT_LIMIT,
          1
        ),
        MAX_LIMIT
      );

      const result =
        await getDeletedRecords({
          pumpId,

          originalCollection:
            normalizeString(
              req.query
                ?.originalCollection
            ) || undefined,

          page,

          limit,
        });

      return res.status(200).json({
        success: true,

        records:
          formatDeletedRecords(
            result?.records
          ),

        pagination:
          result?.pagination || {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
      });
    } catch (error) {
      console.error(
        "GET DELETED DATA ERROR:",
        {
          message:
            getErrorMessage(error),
          statusCode:
            error?.statusCode,
        }
      );

      return res.status(
        error?.statusCode || 500
      ).json({
        success: false,
        message:
          getErrorMessage(error),
      });
    }
  };

/*
=====================================================
GET SINGLE DELETED RECORD
=====================================================
*/

export const getDeletedDataById =
  async (req, res) => {
    try {
      const pumpId =
        getAuthorizedPumpId();

      const deletedRecordId =
        req.params?.id;

      if (
        !isValidObjectId(
          deletedRecordId
        )
      ) {
        throw createControllerError(
          "Invalid recovery record ID.",
          400
        );
      }

      const deletedRecord =
        await findDeletedRecord({
          deletedRecordId,
          pumpId,
        });

      if (!deletedRecord) {
        throw createControllerError(
          "Deleted record not found or it has expired.",
          404
        );
      }

      const plainRecord =
        toPlainObject(
          deletedRecord
        );

      return res.status(200).json({
        success: true,

        data:
          formatDeletedRecord(
            plainRecord
          ),
      });
    } catch (error) {
      console.error(
        "GET DELETED RECORD ERROR:",
        {
          message:
            getErrorMessage(error),
          statusCode:
            error?.statusCode,
        }
      );

      return res.status(
        error?.statusCode || 500
      ).json({
        success: false,
        message:
          getErrorMessage(error),
      });
    }
  };

/*
=====================================================
RESTORE SINGLE DELETED RECORD
=====================================================
*/

export const restoreDeletedData =
  async (req, res) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const deletedRecordId =
        req.params?.id;

      if (
        !isValidObjectId(
          deletedRecordId
        )
      ) {
        throw createControllerError(
          "Invalid recovery record ID.",
          400
        );
      }

      const deletedRecord =
        await findDeletedRecord({
          deletedRecordId,
          pumpId,
        });

      if (!deletedRecord) {
        throw createControllerError(
          "Deleted record not found or it has expired.",
          404
        );
      }

      const modelName =
        normalizeString(
          deletedRecord.originalModel
        );

      /*
       * Restore using centralized logic.
       */
      const restoredDocument =
        await restoreOneRecord({
          deletedRecord,
          pumpId,
        });

      const restoredObject =
        toPlainObject(
          restoredDocument
        );

      return res.status(200).json({
        success: true,

        message:
          isLedgerCustomerModel(
            modelName
          )
            ? "Ledger customer restored successfully."
            : `${modelName} restored successfully.`,

        objectName:
          getObjectName(
            restoredObject,
            modelName,
            deletedRecord.originalId
          ),

        data:
          restoredObject,
      });
    } catch (error) {
      console.error(
        "RESTORE DELETED DATA ERROR:",
        {
          message:
            getErrorMessage(error),
          statusCode:
            error?.statusCode,
          code:
            error?.code,
        }
      );

      return res.status(
        error?.statusCode || 500
      ).json({
        success: false,
        message:
          getErrorMessage(error),
      });
    }
  };

/*
=====================================================
RESTORE GROUP
=====================================================
*/

export const restoreDeletedGroup =
  async (req, res) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const groupId =
        req.params?.groupId;

      if (
        !isValidObjectId(groupId)
      ) {
        throw createControllerError(
          "Invalid deletion group ID.",
          400
        );
      }

      const records =
        await getDeletedRecordGroup({
          deletionGroupId:
            groupId,

          pumpId,
        });

      if (
        !records ||
        records.length === 0
      ) {
        throw createControllerError(
          "Recovery group not found or it has expired.",
          404
        );
      }

      /*
       * Single record:
       * use the normal restore response.
       */
      if (records.length === 1) {
        const record =
          records[0];

        const restoredDocument =
          await restoreOneRecord({
            deletedRecord:
              record,
            pumpId,
          });

        const restoredObject =
          toPlainObject(
            restoredDocument
          );

        const modelName =
          normalizeString(
            record.originalModel
          );

        return res.status(200).json({
          success: true,

          message:
            isLedgerCustomerModel(
              modelName
            )
              ? "Ledger customer restored successfully."
              : `${modelName} restored successfully.`,

          objectName:
            getObjectName(
              restoredObject,
              modelName,
              record.originalId
            ),

          data:
            restoredObject,
        });
      }

      /*
       * Restore multiple records.
       *
       * Each record receives its own transaction.
       *
       * This keeps failures isolated and prevents
       * one bad record from corrupting another restore.
       */
      const restored = [];

      for (const record of records) {
        const modelName =
          normalizeString(
            record.originalModel
          );

        const restoredDocument =
          await restoreOneRecord({
            deletedRecord:
              record,

            pumpId,
          });

        const restoredObject =
          toPlainObject(
            restoredDocument
          );

        restored.push({
          model:
            modelName,

          objectName:
            getObjectName(
              restoredObject,
              modelName,
              record.originalId
            ),

          data:
            restoredObject,
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Deleted records restored successfully.",

        count:
          restored.length,

        data:
          restored,
      });
    } catch (error) {
      console.error(
        "RESTORE DELETED GROUP ERROR:",
        {
          message:
            getErrorMessage(error),
          statusCode:
            error?.statusCode,
          code:
            error?.code,
        }
      );

      return res.status(
        error?.statusCode || 500
      ).json({
        success: false,
        message:
          getErrorMessage(error),
      });
    }
  };

/*
=====================================================
PERMANENT DELETE
=====================================================
*/

export const permanentlyDeleteDeletedData =
  async (req, res) => {
    try {
      const pumpId =
        getAuthorizedPumpId(req);

      const deletedRecordId =
        req.params?.id;

      if (
        !isValidObjectId(
          deletedRecordId
        )
      ) {
        throw createControllerError(
          "Invalid recovery record ID.",
          400
        );
      }

      /*
       * Fetch first so we can return
       * the deleted object's name.
       */
      const deletedRecord =
        await findDeletedRecord({
          deletedRecordId,
          pumpId,
        });

      if (!deletedRecord) {
        throw createControllerError(
          "Deleted record not found or it has already been permanently deleted.",
          404
        );
      }

      const plainRecord =
        toPlainObject(
          deletedRecord
        );

      const objectName =
        getObjectName(
          plainRecord.data,
          plainRecord.originalModel,
          plainRecord.originalId
        );

      const deletedResult =
        await permanentlyDeleteRecord({
          deletedRecordId,
          pumpId,
        });

      if (!deletedResult) {
        throw createControllerError(
          "Deleted record was not found or was already removed.",
          404
        );
      }

      return res.status(200).json({
        success: true,

        message:
          "Deleted record permanently removed.",

        objectName,

        deletedRecordId,
      });
    } catch (error) {
      console.error(
        "PERMANENT DELETE RECOVERY ERROR:",
        {
          message:
            getErrorMessage(error),
          statusCode:
            error?.statusCode,
        }
      );

      return res.status(
        error?.statusCode || 500
      ).json({
        success: false,
        message:
          getErrorMessage(error),
      });
    }
  };

/*
=====================================================
DEFAULT EXPORT
=====================================================
*/

export default {
  getDeletedData,
  getDeletedDataById,
  restoreDeletedData,
  restoreDeletedGroup,
  permanentlyDeleteDeletedData,
};