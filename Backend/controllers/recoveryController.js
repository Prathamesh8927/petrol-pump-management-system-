
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
- Delete recovery records forever
- Strict pumpId isolation
- Safe MongoDB transactions

IMPORTANT:

The service exports used here MUST match
recoveryService.js exactly.
=====================================================
*/

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

  if (!isValidObjectId(userId)) {
    throw createControllerError(
      "Authenticated user ID is invalid.",
      401
    );
  }

  return new mongoose.Types.ObjectId(
    userId
  );
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
    role === "superadmin" ||
    role === "super_admin"
  ) {
    if (!requestedPumpId) {
      throw createControllerError(
        "pumpId is required for superadmin recovery operations.",
        400
      );
    }

    if (!isValidObjectId(requestedPumpId)) {
      throw createControllerError(
        "Invalid pumpId.",
        400
      );
    }

    return new mongoose.Types.ObjectId(
      requestedPumpId
    );
  }

  if (!userPumpId) {
    throw createControllerError(
      "Your account is not associated with a pump.",
      403
    );
  }

  if (!isValidObjectId(userPumpId)) {
    throw createControllerError(
      "Your pump ID is invalid.",
      403
    );
  }

  return new mongoose.Types.ObjectId(
    userPumpId
  );
};

/*
=====================================================
SUPPORTED MODELS
=====================================================
*/

const ALLOWED_RESTORE_MODELS =
  new Set([
    "Client",
    "Pump",
    "User",
    "LedgerCustomer",
    "Expense",
    "Employee",
    "Nozzle",
    "FuelStock",
  ]);

const isAllowedRestoreModel = (
  modelName
) => {
  return ALLOWED_RESTORE_MODELS.has(
    normalizeString(modelName)
  );
};

/*
=====================================================
MODEL NAME CHECK
=====================================================
*/

const isLedgerCustomerModel = (
  modelName
) => {
  return (
    normalizeString(modelName) ===
    "LedgerCustomer"
  );
};

/*
=====================================================
OBJECT NAME
=====================================================

Creates the human-readable name displayed
inside the Recovery page.

Examples:

LedgerCustomer -> ABC Traders
Employee       -> Rahul Patil
Expense        -> Diesel Transport
Nozzle         -> Nozzle 1
FuelStock      -> Petrol
Client         -> XYZ Client
Pump           -> Shivshambho Pump
User           -> admin@example.com
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
    const value = normalizeString(
      data[field]
    );

    if (value) {
      return value;
    }
  }

  /*
   * Ledger Customer.
   */
  if (modelName === "LedgerCustomer") {
    const name = normalizeString(
      data.name
    );

    if (name) {
      return name;
    }

    const vehicleNumber =
      normalizeString(
        data.vehicleNumber
      );

    if (vehicleNumber) {
      return `Customer - ${vehicleNumber}`;
    }

    const phone = normalizeString(
      data.phone
    );

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
  const email = normalizeString(
    data.email
  );

  if (email) {
    return email;
  }

  /*
   * Phone fallback.
   */
  const phone = normalizeString(
    data.phone
  );

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
   * Original MongoDB ID fallback.
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
FORMAT SINGLE RECORD
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

    /*
     * Main frontend field.
     */
    objectName,

    /*
     * Compatibility fields.
     */
    displayName:
      objectName,

    deletedObjectName:
      objectName,

    objectType:
      record.originalModel ||
      "Unknown",
  };
};

/*
=====================================================
FORMAT RECORD LIST
=====================================================
*/

const formatDeletedRecords =
  (records) => {
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
   * Restore using the original ID.
   */
  restoreData._id =
    deletedRecord.originalId;

  /*
   * Restore into the original pump.
   */
  restoreData.pumpId =
    deletedRecord.pumpId;

  /*
   * Remove Mongoose version field.
   */
  delete restoreData.__v;

  return restoreData;
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

      const result =
        await getDeletedRecords({
          pumpId,

          originalCollection:
            req.query
              ?.originalCollection,

          page:
            req.query?.page,

          limit:
            req.query?.limit,
        });

      return res.status(200).json({
        success: true,

        records:
          formatDeletedRecords(
            result?.records
          ),

        pagination:
          result?.pagination || {
            page: 1,
            limit: 25,
            total: 0,
            totalPages: 0,
          },
      });
    } catch (error) {
      console.error(
        "GET DELETED DATA ERROR:",
        error
      );

      return res.status(
        error.statusCode || 500
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

      return res.status(200).json({
        success: true,

        data:
          formatDeletedRecord(
            deletedRecord.toObject
              ? deletedRecord.toObject()
              : deletedRecord
          ),
      });
    } catch (error) {
      console.error(
        "GET DELETED RECORD ERROR:",
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        message:
          getErrorMessage(error),
      });
    }
  };

/*
=====================================================
RESTORE LEDGER CUSTOMER
=====================================================
*/

const restoreLedgerCustomer =
  async ({
    deletedRecord,
    pumpId,
    session,
  }) => {
    const restoreData =
      prepareRestoreData(
        deletedRecord
      );

    let restoredCustomer;

    /*
     * Check whether the soft-deleted
     * LedgerCustomer still exists.
     */
    const existingCustomer =
      await LedgerCustomer.findOne({
        _id:
          restoreData._id,

        pumpId,
      }).session(session);

    if (existingCustomer) {
      /*
       * Reactivate existing customer.
       */
      existingCustomer.status =
        "active";

      const fieldsToRestore = [
        "name",
        "phone",
        "vehicleNumber",
        "address",
        "currentBalance",
        "note",
      ];

      for (const field of fieldsToRestore) {
        if (
          restoreData[field] !==
          undefined
        ) {
          existingCustomer[field] =
            restoreData[field];
        }
      }

      restoredCustomer =
        await existingCustomer.save({
          session,
        });
    } else {
      /*
       * If the original customer was
       * physically removed, recreate it.
       */
      restoreData.pumpId =
        new mongoose.Types.ObjectId(
          pumpId
        );

      restoreData.status =
        "active";

      const created =
        await LedgerCustomer.create(
          [restoreData],
          {
            session,
          }
        );

      restoredCustomer =
        created[0];
    }

    return restoredCustomer;
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

      /*
       * IMPORTANT:
       * Use the actual service export:
       *
       * findDeletedRecord()
       */
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

      const deletedModel =
        normalizeString(
          deletedRecord.originalModel
        );

      /*
       * LedgerCustomer requires special
       * soft-delete restoration.
       */
      if (
        isLedgerCustomerModel(
          deletedModel
        )
      ) {
        const session =
          await mongoose.startSession();

        let restoredCustomer;

        try {
          await session.withTransaction(
            async () => {
              restoredCustomer =
                await restoreLedgerCustomer({
                  deletedRecord,
                  pumpId,
                  session,
                });

              const deleteResult =
                await DeletedRecord.deleteOne(
                  {
                    _id:
                      deletedRecord._id,

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
            }
          );
        } finally {
          await session.endSession();
        }

        const restoredObject =
          restoredCustomer?.toObject
            ? restoredCustomer.toObject()
            : restoredCustomer;

        return res.status(200).json({
          success: true,

          message:
            "Ledger customer restored successfully.",

          objectName:
            getObjectName(
              restoredObject,
              "LedgerCustomer",
              deletedRecord.originalId
            ),

          data:
            restoredObject,
        });
      }

      /*
       * Generic model restoration.
       */
      const restoreData =
        prepareRestoreData(
          deletedRecord
        );

      if (
        !mongoose.models[
          deletedModel
        ]
      ) {
        throw createControllerError(
          `Mongoose model ${deletedModel} is not registered.`,
          500
        );
      }

      const Model =
        mongoose.models[
          deletedModel
        ];

      const session =
        await mongoose.startSession();

      let restoredDocument;

      try {
        await session.withTransaction(
          async () => {
            /*
             * Check whether document already exists.
             */
            const existingDocument =
              await Model.findOne({
                _id:
                  restoreData._id,

                pumpId,
              }).session(session);

            if (existingDocument) {
              /*
               * Restore existing soft-deleted
               * document.
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

              const protectedFields =
                new Set([
                  "_id",
                  "pumpId",
                  "__v",
                  "createdAt",
                  "updatedAt",
                ]);

              for (const [
                key,
                value,
              ] of Object.entries(
                restoreData
              )) {
                if (
                  protectedFields.has(
                    key
                  )
                ) {
                  continue;
                }

                if (
                  value !== undefined
                ) {
                  existingDocument[
                    key
                  ] = value;
                }
              }

              restoredDocument =
                await existingDocument.save({
                  session,
                });
            } else {
              /*
               * Original document no longer
               * exists, so recreate it.
               */
              restoreData.pumpId =
                new mongoose.Types.ObjectId(
                  pumpId
                );

              if (
                Object.prototype.hasOwnProperty.call(
                  restoreData,
                  "status"
                )
              ) {
                restoreData.status =
                  "active";
              }

              const created =
                await Model.create(
                  [restoreData],
                  {
                    session,
                  }
                );

              restoredDocument =
                created[0];
            }

            /*
             * Remove recovery record only after
             * successful restoration.
             */
            const deleteResult =
              await DeletedRecord.deleteOne(
                {
                  _id:
                    deletedRecord._id,

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
          }
        );
      } finally {
        await session.endSession();
      }

      const restoredObject =
        restoredDocument?.toObject
          ? restoredDocument.toObject()
          : restoredDocument;

      return res.status(200).json({
        success: true,

        message:
          `${deletedModel} restored successfully.`,

        objectName:
          getObjectName(
            restoredObject,
            deletedModel,
            deletedRecord.originalId
          ),

        data:
          restoredObject,
      });
    } catch (error) {
      console.error(
        "RESTORE DELETED DATA ERROR:",
        error
      );

      return res.status(
        error.statusCode || 500
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

      /*
       * IMPORTANT:
       * Use the actual service export:
       *
       * getDeletedRecordGroup()
       */
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
       * If group contains only one record,
       * restore it normally.
       */
      if (records.length === 1) {
        const record =
          records[0];

        req.params.id =
          String(record._id);

        return restoreDeletedData(
          req,
          res
        );
      }

      /*
       * Restore grouped records one by one.
       *
       * Each record is protected by its own
       * transaction.
       */
      const restored = [];

      for (const record of records) {
        const recordId =
          String(record._id);

        const restoreData =
          prepareRestoreData(
            record
          );

        const modelName =
          normalizeString(
            record.originalModel
          );

        /*
         * LedgerCustomer can participate in
         * a group, so use the same special
         * restoration logic.
         */
        if (
          isLedgerCustomerModel(
            modelName
          )
        ) {
          const session =
            await mongoose.startSession();

          let restoredCustomer;

          try {
            await session.withTransaction(
              async () => {
                restoredCustomer =
                  await restoreLedgerCustomer({
                    deletedRecord:
                      record,

                    pumpId,

                    session,
                  });

                const deleteResult =
                  await DeletedRecord.deleteOne(
                    {
                      _id:
                        record._id,

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
                    "Recovery record changed during group restoration.",
                    409
                  );
                }
              }
            );
          } finally {
            await session.endSession();
          }

          const restoredObject =
            restoredCustomer?.toObject
              ? restoredCustomer.toObject()
              : restoredCustomer;

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

          continue;
        }

        /*
         * Generic model.
         */
        if (
          !mongoose.models[
            modelName
          ]
        ) {
          throw createControllerError(
            `Mongoose model ${modelName} is not registered.`,
            500
          );
        }

        const Model =
          mongoose.models[
            modelName
          ];

        const session =
          await mongoose.startSession();

        let restoredDocument;

        try {
          await session.withTransaction(
            async () => {
              const existingDocument =
                await Model.findOne({
                  _id:
                    restoreData._id,

                  pumpId,
                }).session(session);

              if (existingDocument) {
                if (
                  Object.prototype.hasOwnProperty.call(
                    existingDocument.toObject(),
                    "status"
                  )
                ) {
                  existingDocument.status =
                    "active";
                }

                const protectedFields =
                  new Set([
                    "_id",
                    "pumpId",
                    "__v",
                    "createdAt",
                    "updatedAt",
                  ]);

                for (const [
                  key,
                  value,
                ] of Object.entries(
                  restoreData
                )) {
                  if (
                    protectedFields.has(
                      key
                    )
                  ) {
                    continue;
                  }

                  if (
                    value !== undefined
                  ) {
                    existingDocument[
                      key
                    ] = value;
                  }
                }

                restoredDocument =
                  await existingDocument.save({
                    session,
                  });
              } else {
                restoreData.pumpId =
                  new mongoose.Types.ObjectId(
                    pumpId
                  );

                if (
                  Object.prototype.hasOwnProperty.call(
                    restoreData,
                    "status"
                  )
                ) {
                  restoreData.status =
                    "active";
                }

                const created =
                  await Model.create(
                    [restoreData],
                    {
                      session,
                    }
                  );

                restoredDocument =
                  created[0];
              }

              const deleteResult =
                await DeletedRecord.deleteOne(
                  {
                    _id:
                      record._id,

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
                  "Recovery record changed during group restoration.",
                  409
                );
              }
            }
          );
        } finally {
          await session.endSession();
        }

        const restoredObject =
          restoredDocument?.toObject
            ? restoredDocument.toObject()
            : restoredDocument;

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
        error
      );

      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        message:
          getErrorMessage(error),
      });
    }
  };

/*
=====================================================
DELETE FOREVER
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
       * Find record first so we can return
       * the object name in the response.
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

      const recordObject =
        deletedRecord.toObject
          ? deletedRecord.toObject()
          : deletedRecord;

      const objectName =
        getObjectName(
          recordObject.data,
          recordObject.originalModel,
          recordObject.originalId
        );

      /*
       * IMPORTANT:
       * Use the actual service export:
       *
       * permanentlyDeleteRecord()
       */
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
        error
      );

      return res.status(
        error.statusCode || 500
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

