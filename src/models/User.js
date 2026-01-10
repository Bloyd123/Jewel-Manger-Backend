// FILE: models/User.js
// User Model - Activity Logs Removed (Now separate model)

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // Basic User Information
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    profileImage: {
      type: String,
      default: null,
    },

    // SaaS Multi-tenant Fields
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required() {
        return this.role !== 'super_admin'; // Conditional
      },
      default: null,
      index: true,
    },

    // Role-based Access Control (RBAC) - Organization Level
    role: {
      type: String,
      enum: ['super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant', 'viewer'],
      default: 'viewer',
      required: true,
    },

    // Primary Shop (Default working location)
    primaryShop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      default: null,
    },

    // User Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // Security & Session Management
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: {
      type: Date,
      default: null,
    },
    lastLoginIP: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
    },

    // Two-Factor Authentication
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    backupCodes: {
      type: [String],
      select: false,
    },
    // 🆕 ADD THESE NEW FIELDS:
    backupCodesUsed: {
      type: [String],
      select: false,
    },

    // Additional Fields for Jewelry Business
    designation: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      enum: [
        'sales',
        'purchase',
        'inventory',
        'accounts',
        'management',
        'workshop',
        'quality_check',
        'customer_service',
        'other',
      ],
      default: 'other',
    },
    employeeId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    joiningDate: {
      type: Date,
      default: null,
    },

    // Sales Performance & Incentives
    salesTarget: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // User Preferences
    preferences: {
      language: {
        type: String,
        default: 'en',
        enum: ['en', 'hi', 'mr', 'gu', 'ta', 'te'],
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      },
      dateFormat: {
        type: String,
        default: 'DD/MM/YYYY',
        enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      },
      theme: {
        type: String,
        default: 'light',
        enum: ['light', 'dark', 'auto'],
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
    },

    // Tracking fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Metadata
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// INDEXES

userSchema.index({ organizationId: 1, email: 1 });
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ organizationId: 1, isActive: 1 });
// userSchema.index({ employeeId: 1 }, { unique: true, sparse: true });
userSchema.index({ primaryShop: 1 });
userSchema.index({ email: 1, isActive: 1 });

// VIRTUALS

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Virtual to check if user is super admin
userSchema.virtual('isSuperAdmin').get(function () {
  return this.role === 'super_admin';
});

// Virtual to check if user is organization admin
userSchema.virtual('isOrgAdmin').get(function () {
  return this.role === 'org_admin' || this.role === 'super_admin';
});

// Virtual to get shop accesses (from UserShopAccess model)
userSchema.virtual('shopAccesses', {
  ref: 'UserShopAccess',
  localField: '_id',
  foreignField: 'userId',
});

// Virtual to get activity logs (from ActivityLog model)
userSchema.virtual('activityLogs', {
  ref: 'ActivityLog',
  localField: '_id',
  foreignField: 'userId',
});

// MIDDLEWARES

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Soft delete middleware
userSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// INSTANCE METHODS

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Check if user has access to a specific shop
userSchema.methods.hasShopAccess = async function (shopId) {
  const UserShopAccess = mongoose.model('UserShopAccess');
  const access = await UserShopAccess.findOne({
    userId: this._id,
    shopId,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });
  return !!access;
};

// Get user's shop access details
userSchema.methods.getShopAccess = async function (shopId) {
  const UserShopAccess = mongoose.model('UserShopAccess');
  return await UserShopAccess.findOne({
    userId: this._id,
    shopId,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });
};

// Get user's shop permissions
userSchema.methods.getShopPermissions = async function (shopId) {
  const access = await this.getShopAccess(shopId);
  return access ? access.permissions : null;
};

// Check specific permission for a shop
userSchema.methods.hasPermission = async function (shopId, permission) {
  // Super admin has all permissions
  if (this.role === 'super_admin') return true;

  const access = await this.getShopAccess(shopId);
  return access ? access.hasPermission(permission) : false;
};

// Check if user has any shop access
userSchema.methods.hasAnyShopAccess = async function () {
  const UserShopAccess = mongoose.model('UserShopAccess');
  const count = await UserShopAccess.countDocuments({
    userId: this._id,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });
  return count > 0;
};

// Get all shop IDs user has access to
userSchema.methods.getAccessibleShops = async function () {
  const UserShopAccess = mongoose.model('UserShopAccess');
  const accesses = await UserShopAccess.find({
    userId: this._id,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  }).select('shopId');
  return accesses.map(access => access.shopId);
};

// Check if user is admin for any shop or specific shop
userSchema.methods.isShopAdmin = async function (shopId = null) {
  const UserShopAccess = mongoose.model('UserShopAccess');

  if (shopId) {
    const access = await UserShopAccess.findOne({
      userId: this._id,
      shopId,
      role: 'shop_admin',
      isActive: true,
      deletedAt: null,
      revokedAt: null,
    });
    return !!access;
  }

  const count = await UserShopAccess.countDocuments({
    userId: this._id,
    role: 'shop_admin',
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });
  return count > 0;
};

// Get shop role
userSchema.methods.getShopRole = async function (shopId) {
  const access = await this.getShopAccess(shopId);
  return access ? access.role : null;
};

// Log user activity (now saves to ActivityLog model)
userSchema.methods.logActivity = async function (
  action,
  module,
  description = '',
  metadata = {},
  ipAddress = null
) {
  try {
    const ActivityLog = mongoose.model('ActivityLog');
    return await ActivityLog.create({
      userId: this._id,
      organizationId: this.organizationId,
      shopId: this.primaryShop,
      action,
      module,
      description,
      metadata,
      ipAddress,
      level: 'info',
      status: 'success',
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    return null;
  }
};

// Get user's recent activity logs (from ActivityLog model)
userSchema.methods.getActivityLogs = async function (limit = 50, options = {}) {
  try {
    const ActivityLog = mongoose.model('ActivityLog');
    return await ActivityLog.findByUser(this._id, { limit, ...options });
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    return [];
  }
};

// Soft delete user
userSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Restore soft deleted user
userSchema.methods.restore = function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Update last login
userSchema.methods.updateLastLogin = function (ipAddress) {
  this.lastLogin = new Date();
  this.lastLoginIP = ipAddress;
  return this.save();
};

// Hide sensitive data in JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.twoFactorSecret;
  delete userObject.backupCodes;
  delete userObject.__v;
  delete userObject.deletedAt;
  return userObject;
};

// STATIC METHODS

// Find user by credentials
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email, isActive: true }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  return user;
};

// Find users by organization
userSchema.statics.findByOrganization = function (organizationId, options = {}) {
  return this.find({
    organizationId,
    ...options,
  });
};

// Find users by shop
userSchema.statics.findByShop = async function (shopId) {
  const UserShopAccess = mongoose.model('UserShopAccess');
  const accesses = await UserShopAccess.find({
    shopId,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  }).select('userId');

  const userIds = accesses.map(access => access.userId);
  return this.find({
    _id: { $in: userIds },
    isActive: true,
  });
};

// Find users by department
userSchema.statics.findByDepartment = function (organizationId, department) {
  return this.find({
    organizationId,
    department,
    isActive: true,
  });
};

// Find users by role
userSchema.statics.findByRole = function (organizationId, role) {
  return this.find({
    organizationId,
    role,
    isActive: true,
  });
};

// Find deleted users (for super admin)
userSchema.statics.findDeleted = function (organizationId = null) {
  const query = { deletedAt: { $ne: null } };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query).setOptions({ includeDeleted: true });
};

// Find users with specific permission in a shop
userSchema.statics.findByPermission = async function (shopId, permission) {
  const UserShopAccess = mongoose.model('UserShopAccess');
  const accesses = await UserShopAccess.find({
    shopId,
    [`permissions.${permission}`]: true,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  }).select('userId');

  const userIds = accesses.map(access => access.userId);
  return this.find({
    _id: { $in: userIds },
    isActive: true,
  });
};

export default mongoose.model('User', userSchema);
