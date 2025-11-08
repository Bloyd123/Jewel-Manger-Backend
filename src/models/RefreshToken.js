import mongoose from 'mongoose';

/**
 * RefreshToken Schema
 * Stores refresh tokens for JWT authentication
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    // User Reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

// Organization Reference (Multi-tenant)
organizationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Organization',
  required: false,           // ✅ Changed to false
  default: null,             // ✅ Added default
  index: true,
},

    // Token Information
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
      index: true,
    },

    tokenId: {
      type: String,
      required: [true, 'Token ID is required'],
      unique: true,
      index: true,
    },

    // Token Status
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revokedReason: {
      type: String,
      default: null,
    },

    // Token Expiry
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
      // index: true,
    },

    // Session Information
    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    // Device Information (parsed from userAgent)
    device: {
      type: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'unknown'],
        default: 'unknown',
      },
      browser: {
        type: String,
        default: 'Unknown',
      },
      os: {
        type: String,
        default: 'Unknown',
      },
    },

    // Usage Tracking
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },

    lastUsedIP: {
      type: String,
      default: null,
    },

    usageCount: {
      type: Number,
      default: 1,
      min: 0,
    },

    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =====================================
// INDEXES
// =====================================

// Compound indexes for efficient queries
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
// refreshTokenSchema.index({ userId: 1, expiresAt: 1 });
// Only index organizationId if it exists (sparse index for super_admins)
refreshTokenSchema.index(
  { organizationId: 1, isRevoked: 1 }, 
  { sparse: true }  // ✅ Skip null values
);
refreshTokenSchema.index({ tokenId: 1, isRevoked: 1 });
// refreshTokenSchema.index({ expiresAt: 1 }); // For cleanup jobs

// TTL Index - Automatically delete expired tokens after 30 days
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// =====================================
// VIRTUALS
// =====================================

// Check if token is expired
refreshTokenSchema.virtual('isExpired').get(function () {
  return this.expiresAt < new Date();
});

// Check if token is valid (not expired and not revoked)
refreshTokenSchema.virtual('isValid').get(function () {
  return !this.isExpired && !this.isRevoked;
});

// Time until expiry
refreshTokenSchema.virtual('expiresIn').get(function () {
  const now = new Date();
  const diff = this.expiresAt - now;
  return Math.max(0, Math.floor(diff / 1000)); // seconds
});

// Days since creation
refreshTokenSchema.virtual('age').get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24)); // days
});

// =====================================
// MIDDLEWARE
// =====================================

// Parse user agent before saving
refreshTokenSchema.pre('save', function (next) {
  if (this.isModified('userAgent') && this.userAgent) {
    this.device = parseUserAgent(this.userAgent);
  }
  next();
});

// Filter out revoked and expired tokens by default
refreshTokenSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeInvalid) {
    this.where({ isRevoked: false });
    this.where({ expiresAt: { $gt: new Date() } });
  }
  next();
});

// =====================================
// INSTANCE METHODS
// =====================================

/**
 * Revoke the refresh token
 * @param {String} reason - Reason for revocation
 * @returns {Promise<RefreshToken>}
 */
refreshTokenSchema.methods.revoke = function (reason = 'Manual revocation') {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  return this.save();
};

/**
 * Update last used timestamp and IP
 * @param {String} ipAddress - User's IP address
 * @returns {Promise<RefreshToken>}
 */
refreshTokenSchema.methods.updateLastUsed = function (ipAddress = null) {
  this.lastUsedAt = new Date();
  this.usageCount += 1;
  if (ipAddress) {
    this.lastUsedIP = ipAddress;
  }
  return this.save();
};

/**
 * Check if token belongs to user
 * @param {String} userId - User ID to check
 * @returns {Boolean}
 */
refreshTokenSchema.methods.belongsTo = function (userId) {
  return this.userId.toString() === userId.toString();
};

/**
 * Get token info (sanitized)
 * @returns {Object}
 */
refreshTokenSchema.methods.getInfo = function () {
  return {
    tokenId: this.tokenId,
    createdAt: this.createdAt,
    expiresAt: this.expiresAt,
    lastUsedAt: this.lastUsedAt,
    isValid: this.isValid,
    isExpired: this.isExpired,
    isRevoked: this.isRevoked,
    device: this.device,
    ipAddress: this.ipAddress,
    usageCount: this.usageCount,
  };
};

// =====================================
// STATIC METHODS
// =====================================

/**
 * Find valid token by token string
 * @param {String} token - Token string
 * @returns {Promise<RefreshToken>}
 */
refreshTokenSchema.statics.findValidToken = function (token) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Find valid token by token ID
 * @param {String} tokenId - Token ID
 * @returns {Promise<RefreshToken>}
 */
refreshTokenSchema.statics.findValidTokenById = function (tokenId) {
  return this.findOne({
    tokenId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Get all valid tokens for a user
 * @param {String} userId - User ID
 * @returns {Promise<Array>}
 */
refreshTokenSchema.statics.findUserTokens = function (userId) {
  return this.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

/**
 * Revoke all tokens for a user
 * @param {String} userId - User ID
 * @param {String} reason - Revocation reason
 * @returns {Promise<Object>}
 */
refreshTokenSchema.statics.revokeAllUserTokens = async function (userId, reason = 'Logout all') {
  const result = await this.updateMany(
    { userId, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    }
  );

  return {
    modifiedCount: result.modifiedCount,
    success: true,
  };
};

/**
 * Revoke all tokens for an organization
 * @param {String} organizationId - Organization ID
 * @param {String} reason - Revocation reason
 * @returns {Promise<Object>}
 */
refreshTokenSchema.statics.revokeOrgTokens = async function (
  organizationId,
  reason = 'Organization deactivated'
) {
  if (!organizationId) {
    return { modifiedCount: 0, success: false, error: 'Organization ID required' };
  }
  
  const result = await this.updateMany(
    { organizationId, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    }
  );

  return {
    modifiedCount: result.modifiedCount,
    success: true,
  };
};

/**
 * Clean up expired tokens (for scheduled jobs)
 * @param {Number} olderThanDays - Delete tokens older than X days (default: 30)
 * @returns {Promise<Object>}
 */
refreshTokenSchema.statics.cleanExpiredTokens = async function (olderThanDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await this.deleteMany({
    expiresAt: { $lt: cutoffDate },
  });

  return {
    deletedCount: result.deletedCount,
    success: true,
  };
};

/**
 * Get token statistics for a user
 * @param {String} userId - User ID
 * @returns {Promise<Object>}
 */
refreshTokenSchema.statics.getUserStats = async function (userId) {
  const total = await this.countDocuments({ userId });
  const active = await this.countDocuments({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
  const revoked = await this.countDocuments({ userId, isRevoked: true });
  const expired = await this.countDocuments({
    userId,
    expiresAt: { $lt: new Date() },
  });

  return {
    total,
    active,
    revoked,
    expired,
  };
};

/**
 * Get organization token statistics
 * @param {String} organizationId - Organization ID
 * @returns {Promise<Object>}
 */
refreshTokenSchema.statics.getOrgStats = async function (organizationId) {
  const total = await this.countDocuments({ organizationId });
  const active = await this.countDocuments({
    organizationId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
  const uniqueUsers = await this.distinct('userId', {
    organizationId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });

  return {
    total,
    active,
    activeUsers: uniqueUsers.length,
  };
};

/**
 * Find tokens by IP address
 * @param {String} ipAddress - IP address
 * @returns {Promise<Array>}
 */
refreshTokenSchema.statics.findByIP = function (ipAddress) {
  return this.find({
    ipAddress,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

/**
 * Find suspicious activity (multiple IPs for same user)
 * @param {String} userId - User ID
 * @returns {Promise<Array>}
 */
refreshTokenSchema.statics.findSuspiciousActivity = async function (userId) {
  const tokens = await this.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).select('ipAddress lastUsedIP createdAt lastUsedAt');

  const uniqueIPs = new Set();
  tokens.forEach(token => {
    if (token.ipAddress) uniqueIPs.add(token.ipAddress);
    if (token.lastUsedIP) uniqueIPs.add(token.lastUsedIP);
  });

  return {
    uniqueIPs: Array.from(uniqueIPs),
    activeTokens: tokens.length,
    suspicious: uniqueIPs.size > 3, // More than 3 different IPs might be suspicious
  };
};

// =====================================
// HELPER FUNCTIONS
// =====================================

/**
 * Parse user agent string to extract device info
 * @param {String} userAgent - User agent string
 * @returns {Object} Device information
 */
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return {
      type: 'unknown',
      browser: 'Unknown',
      os: 'Unknown',
    };
  }

  const ua = userAgent.toLowerCase();

  // Device type
  let type = 'desktop';
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
    type = 'mobile';
  } else if (/tablet|ipad/.test(ua)) {
    type = 'tablet';
  }

  // Browser
  let browser = 'Unknown';
  if (/chrome|chromium|crios/.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/.test(ua)) browser = 'Firefox';
  else if (/safari/.test(ua)) browser = 'Safari';
  else if (/edge|edg/.test(ua)) browser = 'Edge';
  else if (/opera|opr/.test(ua)) browser = 'Opera';

  // Operating System
  let os = 'Unknown';
  if (/windows/.test(ua)) os = 'Windows';
  else if (/mac/.test(ua)) os = 'macOS';
  else if (/linux/.test(ua)) os = 'Linux';
  else if (/android/.test(ua)) os = 'Android';
  else if (/ios|iphone|ipad/.test(ua)) os = 'iOS';

  return { type, browser, os };
}

// =====================================
// EXPORT MODEL
// =====================================

export default mongoose.model('RefreshToken', refreshTokenSchema);
