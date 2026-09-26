import mongoose from "mongoose";

/* =====================================================
   CONSTANTS
===================================================== */

const DEFAULT_RETENTION_DAYS = 30;

const getRetentionDays = () => {
  const configuredDays = Number(
    process.env.DELETED_DATA_RETENTION_DAYS
  );

  if (
    Number.isFinite(configuredDays) &&
    configuredDays >= 1 &&
    configuredDays <= 365
  ) {
    return Math.floor(configuredDays);
  }

  return DEFAULT_RETENTION_DAYS;
};

/* =====================================================
   SCHEMA
===================================================== */

const deletedRecordSchema = new mongoose.Schema(
  {
    originalCollection: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    originalModel: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    originalId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    pumpId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    deletionGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },

    deletedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    action: {
      type: String,
      enum: ["DELETE", "SOFT_DELETE"],
      default: "DELETE",
      required: true,
    },

    deletionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

/* =====================================================
   TTL INDEX
===================================================== */

deletedRecordSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

/* =====================================================
   PERFORMANCE INDEXES
===================================================== */

deletedRecordSchema.index({
  pumpId: 1,
  deletedAt: -1,
});

deletedRecordSchema.index({
  pumpId: 1,
  originalCollection: 1,
  deletedAt: -1,
});

deletedRecordSchema.index({
  pumpId: 1,
  originalModel: 1,
  deletedAt: -1,
});

deletedRecordSchema.index({
  pumpId: 1,
  originalId: 1,
});

deletedRecordSchema.index({
  pumpId: 1,
  deletionGroupId: 1,
  deletedAt: -1,
});

deletedRecordSchema.index({
  deletionGroupId: 1,
  originalModel: 1,
});

/* =====================================================
   VALIDATION
===================================================== */

deletedRecordSchema.pre(
  "validate",
  function () {
    const retentionDays = getRetentionDays();

    if (!this.deletedAt) {
      this.deletedAt = new Date();
    }

    if (!this.expiresAt) {
      const expirationDate = new Date(
        this.deletedAt.getTime()
      );

      expirationDate.setDate(
        expirationDate.getDate() + retentionDays
      );

      this.expiresAt = expirationDate;
    }

    if (this.expiresAt <= this.deletedAt) {
      const expirationDate = new Date(
        this.deletedAt.getTime()
      );

      expirationDate.setDate(
        expirationDate.getDate() + retentionDays
      );

      this.expiresAt = expirationDate;
    }
  }
);

/* =====================================================
   MODEL
===================================================== */

const DeletedRecord =
  mongoose.models.DeletedRecord ||
  mongoose.model(
    "DeletedRecord",
    deletedRecordSchema
  );

export default DeletedRecord;