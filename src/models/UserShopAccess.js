import mongoose from 'mongoose';
import { getPermissionsByRole } from '../config/permissions.config.js';

const userShopAccessSchema = new mongoose.Schema(
  {
    // References
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      required: [true, 'Shop ID is required'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },

    // Role within the shop
    role: {
      type: String,
      enum: ['shop_admin', 'manager', 'staff', 'viewer', 'accountant'],
      default: 'staff',
      required: true,
    },

    // Permissions
    permissions: {
      // Inventory & Product Management
      canViewInventory: { type: Boolean, default: true },
      canEditInventory: { type: Boolean, default: false },
      canManageProducts: { type: Boolean, default: false },
      canDeleteProducts: { type: Boolean, default: false },
      canImportProducts: { type: Boolean, default: false },
      canExportProducts: { type: Boolean, default: false },

      // Purchase Management
      canViewPurchases: { type: Boolean, default: true },
      canCreatePurchases: { type: Boolean, default: false },
      canEditPurchases: { type: Boolean, default: false },
      canDeletePurchases: { type: Boolean, default: false },
      canApprovePurchases: { type: Boolean, default: false },

      // Sales Management
      canViewSales: { type: Boolean, default: true },
      canCreateSales: { type: Boolean, default: false },
      canEditSales: { type: Boolean, default: false },
      canDeleteSales: { type: Boolean, default: false },
      canApproveSales: { type: Boolean, default: false },
      canGenerateInvoices: { type: Boolean, default: false },
      canCancelInvoices: { type: Boolean, default: false },
      canApplyDiscounts: { type: Boolean, default: false },

      // Order Management
      canManageOrders: { type: Boolean, default: false },
      canViewOrders: { type: Boolean, default: true },
      canCreateOrders: { type: Boolean, default: false },
      canEditOrders: { type: Boolean, default: false },
      canCancelOrders: { type: Boolean, default: false },

      // Customer Management
      canManageCustomers: { type: Boolean, default: false },
      canViewCustomers: { type: Boolean, default: true },
      canCreateCustomers: { type: Boolean, default: false },
      canEditCustomers: { type: Boolean, default: false },
      canDeleteCustomers: { type: Boolean, default: false },
      canViewCustomerHistory: { type: Boolean, default: true },

      // Supplier Management
      canManageSuppliers: { type: Boolean, default: false },
      canViewSuppliers: { type: Boolean, default: true },
      canCreateSuppliers: { type: Boolean, default: false },
      canEditSuppliers: { type: Boolean, default: false },
      canDeleteSuppliers: { type: Boolean, default: false },

      // Party Management (Customers + Suppliers)
      canManageParties: { type: Boolean, default: false },
      canViewPartyLedger: { type: Boolean, default: false },

      // Financial & Billing
      canViewBilling: { type: Boolean, default: false },
      canViewFinancials: { type: Boolean, default: false },
      canApproveTransactions: { type: Boolean, default: false },
      canViewPayments: { type: Boolean, default: false },
      canReceivePayments: { type: Boolean, default: false },
      canMakePayments: { type: Boolean, default: false },
      canViewProfitLoss: { type: Boolean, default: false },

      // Schemes & Offers
      canManageSchemes: { type: Boolean, default: false },
      canViewSchemes: { type: Boolean, default: true },
      canCreateSchemes: { type: Boolean, default: false },
      canEditSchemes: { type: Boolean, default: false },
      canDeleteSchemes: { type: Boolean, default: false },

      // Reports & Analytics
      canViewReports: { type: Boolean, default: false },
      canGenerateReports: { type: Boolean, default: false },
      canExportReports: { type: Boolean, default: false },
      canViewAnalytics: { type: Boolean, default: false },
      canViewDashboard: { type: Boolean, default: true },

      // User Management
      canManageUsers: { type: Boolean, default: false },
      canViewUsers: { type: Boolean, default: true },
      canCreateUsers: { type: Boolean, default: false },
      canEditUsers: { type: Boolean, default: false },
      canDeleteUsers: { type: Boolean, default: false },
      canAssignRoles: { type: Boolean, default: false },

      // Shop Settings
      canManageShopSettings: { type: Boolean, default: false },
      canUpdateMetalRates: { type: Boolean, default: false },
      canManageTaxSettings: { type: Boolean, default: false },

      // Advanced Features
      canManageRepairs: { type: Boolean, default: false },
      canManageCustomOrders: { type: Boolean, default: false },
      canManageHallmarking: { type: Boolean, default: false },
      canManageOldGold: { type: Boolean, default: false },

      // System
      canViewAuditLog: { type: Boolean, default: false },
      canBackupData: { type: Boolean, default: false },
      canRestoreData: { type: Boolean, default: false },
      // Composite/High-Level Permissions
      canManageInventory: { type: Boolean, default: false },
      canManageSales: { type: Boolean, default: false },
      canManagePurchases: { type: Boolean, default: false },
      canManageExpenses: { type: Boolean, default: false },
      canManageReports: { type: Boolean, default: false },
      canManageSettings: { type: Boolean, default: false },

      // Additional System Permissions
      canExportData: { type: Boolean, default: false },
      canDeleteRecords: { type: Boolean, default: false },
      canManageMetalRates: { type: Boolean, default: false },
      canAccessPOS: { type: Boolean, default: false },
      canManageBilling: { type: Boolean, default: false },
      canBlacklistCustomer: { type: Boolean, default: false },
      canRemoveCustomerBlacklist: { type: Boolean, default: false },
      canAddLoyaltyPoints: { type: Boolean, default: false },
      canRedeemLoyaltyPoints: { type: Boolean, default: false },
      canViewCustomerAnalytics: { type: Boolean, default: false },

      // Supplier (9)
      canRestoreSupplier: { type: Boolean, default: false },
      canUpdateSupplierRating: { type: Boolean, default: false },
      canBlacklistSupplier: { type: Boolean, default: false },
      canRemoveSupplierBlacklist: { type: Boolean, default: false },
      canMarkPreferredSupplier: { type: Boolean, default: false },
      canRemovePreferredSupplier: { type: Boolean, default: false },
      canUpdateSupplierBalance: { type: Boolean, default: false },
      canViewSupplierStatistics: { type: Boolean, default: false },
      canViewTopSuppliers: { type: Boolean, default: false },

      // Shop (7)
      canCreateShop: { type: Boolean, default: false },
      canViewShops: { type: Boolean, default: true },
      canViewSingleShop: { type: Boolean, default: true },
      canUpdateShop: { type: Boolean, default: false },
      canDeleteShop: { type: Boolean, default: false },
      canViewShopStatistics: { type: Boolean, default: false },
      canTransferInventory: { type: Boolean, default: false },
    },

    // Access Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Access Period (Optional - for temporary access)
    accessStartDate: {
      type: Date,
      default: Date.now,
    },
    accessEndDate: {
      type: Date,
      default: null,
    },

    // Assignment Details
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },

    // Last Access Tracking
    lastAccessedAt: {
      type: Date,
      default: null,
    },
    lastAccessIP: {
      type: String,
      default: null,
    },

    // Revocation Details
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revocationReason: {
      type: String,
      trim: true,
    },

    // Additional Settings
    canAccessOutsideBusinessHours: {
      type: Boolean,
      default: false,
    },
    allowedIPAddresses: [
      {
        type: String,
        trim: true,
      },
    ],

    // Notes
    notes: {
      type: String,
      maxlength: 500,
    },

    // Audit Trail
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

// Compound Indexes
userShopAccessSchema.index({ userId: 1, shopId: 1 }, { unique: true });
userShopAccessSchema.index({ userId: 1, organizationId: 1 });
userShopAccessSchema.index({ shopId: 1, isActive: 1 });
userShopAccessSchema.index({ organizationId: 1, role: 1 });
userShopAccessSchema.index({ userId: 1, isActive: 1 });
userShopAccessSchema.index({ assignedBy: 1 });

// Virtuals
userShopAccessSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

userShopAccessSchema.virtual('shop', {
  ref: 'JewelryShop',
  localField: 'shopId',
  foreignField: '_id',
  justOne: true,
});

userShopAccessSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});

// Virtual to check if access is expired
userShopAccessSchema.virtual('isExpired').get(function () {
  if (!this.accessEndDate) return false;
  return new Date() > this.accessEndDate;
});

// Virtual to check if access is currently valid
userShopAccessSchema.virtual('isValid').get(function () {
  if (!this.isActive || this.deletedAt || this.revokedAt) return false;
  if (this.isExpired) return false;
  return true;
});

// Soft delete middleware
userShopAccessSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null, revokedAt: null });
  }
  next();
});

// Instance Methods

// Check if user has specific permission
userShopAccessSchema.methods.hasPermission = function (permission) {
  if (!this.isValid) return false;
  return this.permissions[permission] || false;
};

// Check if user has any of the specified permissions
userShopAccessSchema.methods.hasAnyPermission = function (permissionArray) {
  if (!this.isValid) return false;
  return permissionArray.some(permission => this.permissions[permission]);
};

// Check if user has all specified permissions
userShopAccessSchema.methods.hasAllPermissions = function (permissionArray) {
  if (!this.isValid) return false;
  return permissionArray.every(permission => this.permissions[permission]);
};

// Update last access
userShopAccessSchema.methods.updateLastAccess = function (ipAddress = null) {
  this.lastAccessedAt = new Date();
  if (ipAddress) this.lastAccessIP = ipAddress;
  return this.save();
};

// Revoke access
userShopAccessSchema.methods.revoke = function (revokedBy, reason = '') {
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revocationReason = reason;
  this.isActive = false;
  return this.save();
};

// Restore access
userShopAccessSchema.methods.restoreAccess = function () {
  this.revokedAt = null;
  this.revokedBy = null;
  this.revocationReason = null;
  this.isActive = true;
  return this.save();
};

// Extend access period
userShopAccessSchema.methods.extendAccess = function (days) {
  if (this.accessEndDate) {
    this.accessEndDate = new Date(this.accessEndDate.getTime() + days * 24 * 60 * 60 * 1000);
  } else {
    this.accessEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  return this.save();
};

// Update permissions
userShopAccessSchema.methods.updatePermissions = function (permissions) {
  Object.assign(this.permissions, permissions);
  return this.save();
};

// Update role with default permissions
userShopAccessSchema.methods.updateRole = function (newRole) {
  this.role = newRole;
  this.permissions = this.constructor.getDefaultPermissions(newRole);
  return this.save();
};

// Soft delete
userShopAccessSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Restore
userShopAccessSchema.methods.restore = function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Get permission summary
userShopAccessSchema.methods.getPermissionSummary = function () {
  const granted = [];
  const denied = [];

  Object.entries(this.permissions).forEach(([key, value]) => {
    if (value) {
      granted.push(key);
    } else {
      denied.push(key);
    }
  });

  return { granted, denied, total: granted.length };
};

// Static Methods

// Get default permissions based on role
userShopAccessSchema.statics.getDefaultPermissions = function (role) {
  return getPermissionsByRole(role);
};

// Find user's shop accesses
userShopAccessSchema.statics.findByUser = function (userId, options = {}) {
  return this.find({
    userId,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
    ...options,
  });
};

// Find shop's user accesses
userShopAccessSchema.statics.findByShop = function (shopId, options = {}) {
  return this.find({
    shopId,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
    ...options,
  });
};

// Find by organization
userShopAccessSchema.statics.findByOrganization = function (organizationId, options = {}) {
  return this.find({
    organizationId,
    deletedAt: null,
    revokedAt: null,
    ...options,
  });
};

// Find by role
userShopAccessSchema.statics.findByRole = function (shopId, role) {
  return this.find({
    shopId,
    role,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });
};

// Find users with specific permission
userShopAccessSchema.statics.findByPermission = function (shopId, permission) {
  return this.find({
    shopId,
    [`permissions.${permission}`]: true,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });
};

// Find expired accesses
userShopAccessSchema.statics.findExpired = function () {
  return this.find({
    accessEndDate: { $lte: new Date() },
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });
};

// Find revoked accesses
userShopAccessSchema.statics.findRevoked = function (shopId = null) {
  const query = {
    revokedAt: { $ne: null },
  };
  if (shopId) query.shopId = shopId;
  return this.find(query).setOptions({ includeDeleted: true });
};

// Find deleted accesses
userShopAccessSchema.statics.findDeleted = function (shopId = null) {
  const query = {
    deletedAt: { $ne: null },
  };
  if (shopId) query.shopId = shopId;
  return this.find(query).setOptions({ includeDeleted: true });
};

// Grant access to user
userShopAccessSchema.statics.grantAccess = async function (
  userId,
  shopId,
  organizationId,
  role,
  assignedBy = null
) {
  // Check if access already exists
  const existing = await this.findOne({ userId, shopId });

  if (existing) {
    if (existing.deletedAt || existing.revokedAt) {
      // Restore and update
      existing.deletedAt = null;
      existing.revokedAt = null;
      existing.revokedBy = null;
      existing.revocationReason = null;
      existing.isActive = true;
      existing.role = role;
      existing.permissions = this.getDefaultPermissions(role);
      existing.assignedBy = assignedBy;
      existing.assignedAt = new Date();
      return existing.save();
    }

    // Update existing active access
    existing.role = role;
    existing.permissions = this.getDefaultPermissions(role);
    existing.updatedBy = assignedBy;
    return existing.save();
  }

  // Create new access
  return this.create({
    userId,
    shopId,
    organizationId,
    role,
    permissions: this.getDefaultPermissions(role),
    assignedBy,
  });
};

export default mongoose.model('UserShopAccess', userShopAccessSchema);
