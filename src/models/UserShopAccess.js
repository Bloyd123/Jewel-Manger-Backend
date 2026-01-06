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

    // ALL PERMISSIONS - 237 Total
    permissions: {
      // Customer Management (13)
      canCreateCustomer: { type: Boolean, default: false },
      canSearchCustomer: { type: Boolean, default: true },
      canViewCustomers: { type: Boolean, default: true },
      canGetSingleCustomer: { type: Boolean, default: true },
      canUpdateCustomer: { type: Boolean, default: false },
      canDeleteCustomers: { type: Boolean, default: false },
      canBlacklistCustomer: { type: Boolean, default: false },
      canRemoveCustomerBlacklist: { type: Boolean, default: false },
      canAddLoyaltyPoints: { type: Boolean, default: false },
      canRedeemLoyaltyPoints: { type: Boolean, default: false },
      canViewCustomerAnalytics: { type: Boolean, default: false },
      canManageCustomers: { type: Boolean, default: false },
      canViewCustomerHistory: { type: Boolean, default: true },

      // Product Management (24)
      canCreateProduct: { type: Boolean, default: false },
      canViewProducts: { type: Boolean, default: true },
      canSearchProducts: { type: Boolean, default: true },
      canGetSingleProduct: { type: Boolean, default: true },
      canUpdateProduct: { type: Boolean, default: false },
      canDeleteProducts: { type: Boolean, default: false },
      canUpdateStock: { type: Boolean, default: false },
      canReserveProduct: { type: Boolean, default: false },
      canCancelReservation: { type: Boolean, default: false },
      canMarkAsSold: { type: Boolean, default: false },
      canCalculatePrice: { type: Boolean, default: false },
      canGetLowStock: { type: Boolean, default: false },
      canViewProductHistory: { type: Boolean, default: false },
      canViewProductAnalytics: { type: Boolean, default: false },
      canBulkDeleteProducts: { type: Boolean, default: false },
      canBulkUpdateStatus: { type: Boolean, default: false },
      canManageProducts: { type: Boolean, default: false },
      canManageInventory: { type: Boolean, default: false },
      canViewInventory: { type: Boolean, default: true },
      canEditInventory: { type: Boolean, default: false },
      canImportProducts: { type: Boolean, default: false },
      canExportProducts: { type: Boolean, default: false },

      // Shop Management (11)
      canCreateShop: { type: Boolean, default: false },
      canViewShops: { type: Boolean, default: true },
      canViewSingleShop: { type: Boolean, default: true },
      canUpdateShop: { type: Boolean, default: false },
      canDeleteShop: { type: Boolean, default: false },
      canUpdateSettings: { type: Boolean, default: false },
      canUpdateMetalRates: { type: Boolean, default: false },
      canViewShopStatistics: { type: Boolean, default: false },
      canManageShopSettings: { type: Boolean, default: false },
      canManageMetalRates: { type: Boolean, default: false },
      canTransferInventory: { type: Boolean, default: false },

      // Supplier Management (14)
      canCreateSupplier: { type: Boolean, default: false },
      canViewSuppliers: { type: Boolean, default: true },
      canGetSingleSupplier: { type: Boolean, default: true },
      canUpdateSupplier: { type: Boolean, default: false },
      canDeleteSuppliers: { type: Boolean, default: false },
      canRestoreSupplier: { type: Boolean, default: false },
      canUpdateSupplierRating: { type: Boolean, default: false },
      canBlacklistSupplier: { type: Boolean, default: false },
      canRemoveSupplierBlacklist: { type: Boolean, default: false },
      canMarkPreferredSupplier: { type: Boolean, default: false },
      canRemovePreferredSupplier: { type: Boolean, default: false },
      canUpdateSupplierBalance: { type: Boolean, default: false },
      canViewSupplierStatistics: { type: Boolean, default: false },
      canViewTopSuppliers: { type: Boolean, default: false },
      canManageSuppliers: { type: Boolean, default: false },

      // Metal Rate Management (11)
      canCreateUpdateRate: { type: Boolean, default: false },
      canGetCurrentRate: { type: Boolean, default: true },
      canGetRateHistory: { type: Boolean, default: false },
      canGetRateByDate: { type: Boolean, default: false },
      canCompareRates: { type: Boolean, default: false },
      canGetTrendData: { type: Boolean, default: false },
      canGetRateForPurity: { type: Boolean, default: true },
      canGetAverageRate: { type: Boolean, default: false },
      canSyncToAllShops: { type: Boolean, default: false },
      canDeactivateRate: { type: Boolean, default: false },
      canDeleteRate: { type: Boolean, default: false },

      // Purchase Management (21)
      canCreatePurchase: { type: Boolean, default: false },
      canViewPurchases: { type: Boolean, default: true },
      canGetSinglePurchase: { type: Boolean, default: true },
      canUpdatePurchase: { type: Boolean, default: false },
      canDeletePurchases: { type: Boolean, default: false },
      canUpdatePurchaseStatus: { type: Boolean, default: false },
      canMarkAsReceived: { type: Boolean, default: false },
      canCancelPurchase: { type: Boolean, default: false },
      canApprovePurchases: { type: Boolean, default: false },
      canRejectPurchase: { type: Boolean, default: false },
      canAddPurchasePayment: { type: Boolean, default: false },
      canGetPurchasePayments: { type: Boolean, default: false },
      canGetBySupplier: { type: Boolean, default: false },
      canViewPurchaseAnalytics: { type: Boolean, default: false },
      canViewPendingPurchases: { type: Boolean, default: false },
      canViewUnpaidPurchases: { type: Boolean, default: false },
      canBulkDeletePurchases: { type: Boolean, default: false },
      canBulkApprovePurchases: { type: Boolean, default: false },
      canUploadPurchaseDocuments: { type: Boolean, default: false },
      canGetPurchaseDocuments: { type: Boolean, default: false },
      canManagePurchases: { type: Boolean, default: false },

      // Sale Management (35)
      canCreateSale: { type: Boolean, default: false },
      canViewSales: { type: Boolean, default: true },
      canGetSingleSale: { type: Boolean, default: true },
      canUpdateSale: { type: Boolean, default: false },
      canDeleteSales: { type: Boolean, default: false },
      canUpdateSaleStatus: { type: Boolean, default: false },
      canConfirmSale: { type: Boolean, default: false },
      canMarkAsDelivered: { type: Boolean, default: false },
      canCompleteSale: { type: Boolean, default: false },
      canCancelSale: { type: Boolean, default: false },
      canAddSalePayment: { type: Boolean, default: false },
      canGetSalePayments: { type: Boolean, default: false },
      canGenerateInvoices: { type: Boolean, default: false },
      canSendInvoice: { type: Boolean, default: false },
      canPrintInvoice: { type: Boolean, default: false },
      canProcessReturn: { type: Boolean, default: false },
      canAddOldGold: { type: Boolean, default: false },
      canRemoveOldGold: { type: Boolean, default: false },
      canApplyDiscounts: { type: Boolean, default: false },
      canRemoveDiscount: { type: Boolean, default: false },
      canGetByCustomer: { type: Boolean, default: false },
      canViewSalesPersonSales: { type: Boolean, default: false },
      canViewSalesAnalytics: { type: Boolean, default: false },
      canViewSalesDashboard: { type: Boolean, default: true },
      canViewTodaysSales: { type: Boolean, default: false },
      canViewPendingSales: { type: Boolean, default: false },
      canViewUnpaidSales: { type: Boolean, default: false },
      canViewOverdueSales: { type: Boolean, default: false },
      canApproveSales: { type: Boolean, default: false },
      canRejectSale: { type: Boolean, default: false },
      canBulkDeleteSales: { type: Boolean, default: false },
      canBulkPrintInvoices: { type: Boolean, default: false },
      canSendReminders: { type: Boolean, default: false },
      canManageSales: { type: Boolean, default: false },
      canCancelInvoices: { type: Boolean, default: false },
      canAccessPOS: { type: Boolean, default: false },

      // Payment Management (38)
      canCreatePayment: { type: Boolean, default: false },
      canGetPaymentsList: { type: Boolean, default: false },
      canGetSinglePayment: { type: Boolean, default: false },
      canUpdatePayment: { type: Boolean, default: false },
      canDeletePayment: { type: Boolean, default: false },
      canUpdatePaymentStatus: { type: Boolean, default: false },
      canCompletePayment: { type: Boolean, default: false },
      canCancelPayment: { type: Boolean, default: false },
      canViewPendingCheques: { type: Boolean, default: false },
      canClearCheque: { type: Boolean, default: false },
      canBounceCheque: { type: Boolean, default: false },
      canViewBouncedCheques: { type: Boolean, default: false },
      canViewClearedCheques: { type: Boolean, default: false },
      canReconcilePayment: { type: Boolean, default: false },
      canViewPendingReconciliation: { type: Boolean, default: false },
      canViewReconciliationSummary: { type: Boolean, default: false },
      canGenerateReceipt: { type: Boolean, default: false },
      canSendReceipt: { type: Boolean, default: false },
      canGetByParty: { type: Boolean, default: false },
      canGetByReference: { type: Boolean, default: false },
      canViewPaymentByMode: { type: Boolean, default: false },
      canViewCashCollection: { type: Boolean, default: false },
      canViewDigitalCollection: { type: Boolean, default: false },
      canViewPaymentAnalytics: { type: Boolean, default: false },
      canViewPaymentDashboard: { type: Boolean, default: false },
      canViewTodaysPayments: { type: Boolean, default: false },
      canViewPendingPayments: { type: Boolean, default: false },
      canViewFailedPayments: { type: Boolean, default: false },
      canApprovePayment: { type: Boolean, default: false },
      canRejectPayment: { type: Boolean, default: false },
      canProcessRefund: { type: Boolean, default: false },
      canGetRefunds: { type: Boolean, default: false },
      canBulkReconcile: { type: Boolean, default: false },
      canBulkExportPayments: { type: Boolean, default: false },
      canBulkPrintReceipts: { type: Boolean, default: false },
      canViewPayments: { type: Boolean, default: false },
      canReceivePayments: { type: Boolean, default: false },
      canMakePayments: { type: Boolean, default: false },

      // Order Management (42)
      canCreateOrder: { type: Boolean, default: false },
      canViewOrders: { type: Boolean, default: true },
      canGetSingleOrder: { type: Boolean, default: true },
      canUpdateOrder: { type: Boolean, default: false },
      canCancelOrders: { type: Boolean, default: false },
      canUpdateOrderStatus: { type: Boolean, default: false },
      canConfirmOrder: { type: Boolean, default: false },
      canStartOrder: { type: Boolean, default: false },
      canHoldOrder: { type: Boolean, default: false },
      canResumeOrder: { type: Boolean, default: false },
      canMarkAsReady: { type: Boolean, default: false },
      canMarkOrderAsDelivered: { type: Boolean, default: false },
      canCompleteOrder: { type: Boolean, default: false },
      canAssignOrder: { type: Boolean, default: false },
      canReassignOrder: { type: Boolean, default: false },
      canGetAssignedOrders: { type: Boolean, default: false },
      canAddProgressUpdate: { type: Boolean, default: false },
      canGetProgress: { type: Boolean, default: false },
      canQualityCheck: { type: Boolean, default: false },
      canGetQualityCheck: { type: Boolean, default: false },
      canAddOrderPayment: { type: Boolean, default: false },
      canGetOrderPayments: { type: Boolean, default: false },
      canGenerateBill: { type: Boolean, default: false },
      canAddFeedback: { type: Boolean, default: false },
      canGetFeedback: { type: Boolean, default: false },
      canViewOverdueOrders: { type: Boolean, default: false },
      canViewDueSoonOrders: { type: Boolean, default: false },
      canViewPendingOrders: { type: Boolean, default: false },
      canViewCompletedOrders: { type: Boolean, default: false },
      canViewOrdersByType: { type: Boolean, default: false },
      canViewOrdersByPriority: { type: Boolean, default: false },
      canViewOrderAnalytics: { type: Boolean, default: false },
      canViewOrderDashboard: { type: Boolean, default: false },
      canViewCustomerOrders: { type: Boolean, default: false },
      canApproveOrder: { type: Boolean, default: false },
      canRejectOrder: { type: Boolean, default: false },
      canUploadDocuments: { type: Boolean, default: false },
      canGetDocuments: { type: Boolean, default: false },
      canDeleteDocument: { type: Boolean, default: false },
      canSendReminder: { type: Boolean, default: false },
      canBulkStatusUpdate: { type: Boolean, default: false },
      canBulkAssign: { type: Boolean, default: false },
      canBulkExportOrders: { type: Boolean, default: false },
      canManageOrders: { type: Boolean, default: false },
      canManageRepairs: { type: Boolean, default: false },
      canManageCustomOrders: { type: Boolean, default: false },

      // Parties & Billing (4)
      canManageParties: { type: Boolean, default: false },
      canViewPartyLedger: { type: Boolean, default: false },
      canManageBilling: { type: Boolean, default: false },
      canViewBilling: { type: Boolean, default: false },

      // Financial (3)
      canViewFinancials: { type: Boolean, default: false },
      canViewProfitLoss: { type: Boolean, default: false },
      canApproveTransactions: { type: Boolean, default: false },

      // Expenses (1)
      canManageExpenses: { type: Boolean, default: false },

      // Schemes (5)
      canManageSchemes: { type: Boolean, default: false },
      canViewSchemes: { type: Boolean, default: true },
      canCreateSchemes: { type: Boolean, default: false },
      canEditSchemes: { type: Boolean, default: false },
      canDeleteSchemes: { type: Boolean, default: false },

      // Reports & Analytics (6)
      canManageReports: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
      canGenerateReports: { type: Boolean, default: false },
      canExportReports: { type: Boolean, default: false },
      canViewAnalytics: { type: Boolean, default: false },
      canViewDashboard: { type: Boolean, default: true },

      // Users (6)
      canManageUsers: { type: Boolean, default: false },
      canViewUsers: { type: Boolean, default: false },
      canCreateUsers: { type: Boolean, default: false },
      canEditUsers: { type: Boolean, default: false },
      canDeleteUsers: { type: Boolean, default: false },
      canAssignRoles: { type: Boolean, default: false },

      // Settings (1)
      canManageTaxSettings: { type: Boolean, default: false },

      // Advanced Features (2)
      canManageHallmarking: { type: Boolean, default: false },
      canManageOldGold: { type: Boolean, default: false },

      // System (7)
      canManageSettings: { type: Boolean, default: false },
      canExportData: { type: Boolean, default: false },
      canDeleteRecords: { type: Boolean, default: false },
      canViewAuditLog: { type: Boolean, default: false },
      canBackupData: { type: Boolean, default: false },
      canRestoreData: { type: Boolean, default: false },
    },

    // Access Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Access Period
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

userShopAccessSchema.virtual('isExpired').get(function () {
  if (!this.accessEndDate) return false;
  return new Date() > this.accessEndDate;
});

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
userShopAccessSchema.methods.hasPermission = function (permission) {
  if (!this.isValid) return false;
  return this.permissions[permission] || false;
};

userShopAccessSchema.methods.hasAnyPermission = function (permissionArray) {
  if (!this.isValid) return false;
  return permissionArray.some(permission => this.permissions[permission]);
};

userShopAccessSchema.methods.hasAllPermissions = function (permissionArray) {
  if (!this.isValid) return false;
  return permissionArray.every(permission => this.permissions[permission]);
};

userShopAccessSchema.methods.updateLastAccess = function (ipAddress = null) {
  this.lastAccessedAt = new Date();
  if (ipAddress) this.lastAccessIP = ipAddress;
  return this.save();
};

userShopAccessSchema.methods.revoke = function (revokedBy, reason = '') {
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revocationReason = reason;
  this.isActive = false;
  return this.save();
};

userShopAccessSchema.methods.restoreAccess = function () {
  this.revokedAt = null;
  this.revokedBy = null;
  this.revocationReason = null;
  this.isActive = true;
  return this.save();
};

userShopAccessSchema.methods.extendAccess = function (days) {
  if (this.accessEndDate) {
    this.accessEndDate = new Date(this.accessEndDate.getTime() + days * 24 * 60 * 60 * 1000);
  } else {
    this.accessEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  return this.save();
};

userShopAccessSchema.methods.updatePermissions = function (permissions) {
  Object.assign(this.permissions, permissions);
  return this.save();
};

userShopAccessSchema.methods.updateRole = function (newRole) {
  this.role = newRole;
  this.permissions = this.constructor.getDefaultPermissions(newRole);
  return this.save();
};

userShopAccessSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

userShopAccessSchema.methods.restore = function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

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
userShopAccessSchema.statics.getDefaultPermissions = function (role) {
  return getPermissionsByRole(role);
};

userShopAccessSchema.statics.findByUser = function (userId, options = {}) {
  return this.find({
    userId,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
    ...options,
  });
};

userShopAccessSchema.statics.findByShop = function (shopId, options = {}) {
  return this.find({
    shopId,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
    ...options,
  });
};

userShopAccessSchema.statics.findByOrganization = function (organizationId, options = {}) {
  return this.find({
    organizationId,
    deletedAt: null,
    revokedAt: null,
    ...options,
  });
};

userShopAccessSchema.statics.findByRole = function (shopId, role) {
  return this.find({
    shopId,
    role,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });
};

userShopAccessSchema.statics.findByPermission = function (shopId, permission) {
  return this.find({
    shopId,
    [`permissions.${permission}`]: true,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });
};

userShopAccessSchema.statics.findExpired = function () {
  return this.find({
    accessEndDate: { $lte: new Date() },
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });
};

userShopAccessSchema.statics.findRevoked = function (shopId = null) {
  const query = {
    revokedAt: { $ne: null },
  };
  if (shopId) query.shopId = shopId;
  return this.find(query).setOptions({ includeDeleted: true });
};

userShopAccessSchema.statics.findDeleted = function (shopId = null) {
  const query = {
    deletedAt: { $ne: null },
  };
  if (shopId) query.shopId = shopId;
  return this.find(query).setOptions({ includeDeleted: true });
};

userShopAccessSchema.statics.grantAccess = async function (
  userId,
  shopId,
  organizationId,
  role,
  assignedBy = null
) {
  const existing = await this.findOne({ userId, shopId });

  if (existing) {
    if (existing.deletedAt || existing.revokedAt) {
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

    existing.role = role;
    existing.permissions = this.getDefaultPermissions(role);
    existing.updatedBy = assignedBy;
    return existing.save();
  }

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