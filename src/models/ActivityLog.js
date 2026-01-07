// ============================================================================
// FILE: models/ActivityLog.js
// Activity Log Model - Separated from User Model
// ============================================================================

import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    // User Information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Some system events may not have a user
      index: true,
    },

    // Organization & Shop Context
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      // required: [true, 'Organization ID is required'],
        required: false, // Change from true to false
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      default: null,
      index: true,
    },

    // Activity Details
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      index: true,
      // Examples: 'create', 'update', 'delete', 'login', 'logout', 'view', 'export', etc.
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
      trim: true,
      index: true,
      // Examples: 'auth', 'product', 'sale', 'purchase', 'customer', 'user_management', 'financial', 'system'
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Log Level & Status
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'success', 'debug'],
      default: 'info',
      index: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending', 'cancelled'],
      default: 'success',
      index: true,
    },

    // Request Information
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      default: null,
    },

    // Additional Metadata (flexible JSON storage)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Can store any additional context like:
      // - productId, saleId, customerId, etc.
      // - before/after values for updates
      // - error details
      // - custom data specific to the action
    },

    // Timestamp (auto-managed by timestamps: true)
    // createdAt and updatedAt will be added automatically
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Compound indexes for common queries
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ organizationId: 1, createdAt: -1 });
activityLogSchema.index({ shopId: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, action: 1, createdAt: -1 });
activityLogSchema.index({ level: 1, createdAt: -1 });
activityLogSchema.index({ status: 1, createdAt: -1 });

// TTL index to auto-delete old logs (optional - adjust as needed)
// Uncomment to auto-delete logs older than 90 days
// activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// ============================================================================
// VIRTUALS
// ============================================================================

// Virtual to check if activity was successful
activityLogSchema.virtual('isSuccessful').get(function () {
  return this.status === 'success';
});

// Virtual to check if activity failed
activityLogSchema.virtual('isFailed').get(function () {
  return this.status === 'failed';
});

// Virtual to get formatted timestamp
activityLogSchema.virtual('formattedDate').get(function () {
  return this.createdAt.toLocaleString();
});

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find activity logs by user
 */
activityLogSchema.statics.findByUser = function (userId, options = {}) {
  const { limit = 50, skip = 0, module, action, startDate, endDate } = options;

  const query = { userId };

  if (module) query.module = module;
  if (action) query.action = action;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'firstName lastName email username')
    .populate('shopId', 'name shopCode')
    .lean();
};

/**
 * Find activity logs by organization
 */
activityLogSchema.statics.findByOrganization = function (organizationId, options = {}) {
  const { limit = 100, skip = 0, module, action, level, startDate, endDate } = options;

  const query = { organizationId };

  if (module) query.module = module;
  if (action) query.action = action;
  if (level) query.level = level;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'firstName lastName email username')
    .populate('shopId', 'name shopCode')
    .lean();
};

/**
 * Find activity logs by shop
 */
activityLogSchema.statics.findByShop = function (shopId, options = {}) {
  const { limit = 100, skip = 0, module, action, startDate, endDate } = options;

  const query = { shopId };

  if (module) query.module = module;
  if (action) query.action = action;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'firstName lastName email username')
    .lean();
};

/**
 * Find activity logs by module
 */
activityLogSchema.statics.findByModule = function (module, organizationId, options = {}) {
  const { limit = 100, skip = 0, action, startDate, endDate } = options;

  const query = { module, organizationId };

  if (action) query.action = action;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'firstName lastName email username')
    .populate('shopId', 'name shopCode')
    .lean();
};

/**
 * Find error logs
 */
activityLogSchema.statics.findErrors = function (organizationId, options = {}) {
  const { limit = 50, skip = 0, startDate, endDate } = options;

  const query = {
    organizationId,
    $or: [{ level: 'error' }, { status: 'failed' }],
  };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'firstName lastName email username')
    .lean();
};

/**
 * Get activity statistics
 */
activityLogSchema.statics.getStatistics = async function (organizationId, options = {}) {
  const { startDate, endDate, groupBy = 'day' } = options;

  const matchStage = { organizationId };

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  // Date grouping format based on groupBy parameter
  let dateFormat;
  switch (groupBy) {
    case 'hour':
      dateFormat = '%Y-%m-%d %H:00';
      break;
    case 'day':
      dateFormat = '%Y-%m-%d';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
    case 'year':
      dateFormat = '%Y';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          module: '$module',
          action: '$action',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': -1 } },
  ]);
};

/**
 * Get user activity summary
 */
activityLogSchema.statics.getUserActivitySummary = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { module: '$module', action: '$action' },
        count: { $sum: 1 },
        lastActivity: { $max: '$createdAt' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

/**
 * Clean old activity logs
 */
activityLogSchema.statics.cleanOldLogs = async function (daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  return result.deletedCount;
};

/**
 * Get recent activities (last N records)
 */
activityLogSchema.statics.getRecentActivities = function (
  organizationId,
  limit = 50,
  shopId = null
) {
  const query = { organizationId };
  if (shopId) query.shopId = shopId;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email username profileImage')
    .populate('shopId', 'name shopCode')
    .lean();
};

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Check if log is recent (within last hour)
 */
activityLogSchema.methods.isRecent = function () {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  return this.createdAt >= oneHourAgo;
};

/**
 * Get formatted log message
 */
activityLogSchema.methods.getFormattedMessage = function () {
  return `[${this.module.toUpperCase()}] ${this.action} - ${this.description}`;
};

// ============================================================================
// EXPORT MODEL
// ============================================================================

export default mongoose.model('ActivityLog', activityLogSchema);
