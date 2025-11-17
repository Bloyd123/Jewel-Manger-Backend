// ============================================================================
// FILE: src/config/permissions.config.js
// Centralized Role-Based Permissions Configuration
// ============================================================================

/**
 * 🎯 ROLE-BASED PERMISSIONS MATRIX
 * 
 * Roles Hierarchy:
 * 1. super_admin   - Platform owner (full access across all organizations)
 * 2. org_admin     - Organization owner (full access within organization)
 * 3. shop_admin    - Shop owner (full access within shop)
 * 4. manager       - Shop manager (most permissions except critical operations)
 * 5. staff         - Sales staff (POS, customer creation, view-only mostly)
 * 6. accountant    - Finance team (billing, reports, no inventory management)
 * 7. viewer        - Read-only access
 */

export const PERMISSIONS = {
  // ============================================================================
  // SHOP ADMIN - Full Shop Access
  // ============================================================================
  shop_admin: {
    // Inventory & Products
    canManageInventory: true,
    canViewInventory: true,
    canEditInventory: true,
    canManageProducts: true,
    canDeleteProducts: true,
    canImportProducts: true,
    canExportProducts: true,

    // Purchases
    canManagePurchases: true,
    canViewPurchases: true,
    canCreatePurchases: true,
    canEditPurchases: true,
    canDeletePurchases: true,
    canApprovePurchases: true,

    // Sales
    canManageSales: true,
    canViewSales: true,
    canCreateSales: true,
    canEditSales: true,
    canDeleteSales: true,
    canApproveSales: true,
    canGenerateInvoices: true,
    canCancelInvoices: true,
    canApplyDiscounts: true,

    // Orders
    canManageOrders: true,
    canViewOrders: true,
    canCreateOrders: true,
    canEditOrders: true,
    canCancelOrders: true,

    // Customers
    canManageCustomers: true,
    canViewCustomers: true,
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canViewCustomerHistory: true,
        canBlacklistCustomer: true,          //   NEW
    canRemoveCustomerBlacklist: true,    //   NEW
    canAddLoyaltyPoints: true,           //   NEW
    canRedeemLoyaltyPoints: true,        //   NEW
    canViewCustomerAnalytics: true,      //   NEW

    // Suppliers
    canManageSuppliers: true,
    canViewSuppliers: true,
    canCreateSuppliers: true,
    canEditSuppliers: true,
    canDeleteSuppliers: true,
    canRestoreSupplier: true,            //   NEW
    canUpdateSupplierRating: true,       //   NEW
    canBlacklistSupplier: true,          //   NEW
    canRemoveSupplierBlacklist: true,    //   NEW
    canMarkPreferredSupplier: true,      //   NEW
    canRemovePreferredSupplier: true,    //   NEW
    canUpdateSupplierBalance: true,      //   NEW
    canViewSupplierStatistics: true,     //   NEW
    canViewTopSuppliers: true,           //   NEW

    // Parties & Billing
    canManageParties: true,
    canViewPartyLedger: true,
    canManageBilling: true,
    canViewBilling: true,

    // Financial
    canViewFinancials: true,
    canViewPayments: true,
    canReceivePayments: true,
    canMakePayments: true,
    canViewProfitLoss: true,
    canApproveTransactions: true,

    // Expenses
    canManageExpenses: true,

    // Schemes
    canManageSchemes: true,
    canViewSchemes: true,
    canCreateSchemes: true,
    canEditSchemes: true,
    canDeleteSchemes: true,

    // Reports & Analytics
    canManageReports: true,
    canViewReports: true,
    canGenerateReports: true,
    canExportReports: true,
    canViewAnalytics: true,
    canViewDashboard: true,

    // POS
    canAccessPOS: true,

    // Users
    canManageUsers: true,
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canAssignRoles: true,

    // Shop Settings
    canManageShopSettings: true,
    canManageMetalRates: true,
    canUpdateMetalRates: true,
     canManageTaxSettings: false,
      canCreateShop: true,                 //   NEW
    canViewShops: true,                  //   NEW
    canViewSingleShop: true,             //   NEW
    canUpdateShop: true,                 //   NEW
    canDeleteShop: true,                 //   NEW
    canViewShopStatistics: true,         //   NEW
    canTransferInventory: true,          //   NEW

    // Advanced Features
    canManageRepairs: true,
    canManageCustomOrders: true,
    canManageHallmarking: true,
    canManageOldGold: true,

    // System
    canManageSettings: true,
    canExportData: true,
    canDeleteRecords: true,
    canViewAuditLog: true,
    canBackupData: true,
    canRestoreData: true,
  },

  // ============================================================================
  // MANAGER - High-level operations (no delete/critical permissions)
  // ============================================================================
  manager: {
    // Inventory & Products
    canManageInventory: true,
    canViewInventory: true,
    canEditInventory: true,
    canManageProducts: true,
    canDeleteProducts: false,       //  
    canImportProducts: true,
    canExportProducts: true,

    // Purchases
    canManagePurchases: true,
    canViewPurchases: true,
    canCreatePurchases: true,
    canEditPurchases: true,
    canDeletePurchases: false,      //  
    canApprovePurchases: true,

    // Sales
    canManageSales: true,
    canViewSales: true,
    canCreateSales: true,
    canEditSales: true,
    canDeleteSales: false,          //  
    canApproveSales: true,
    canGenerateInvoices: true,
    canCancelInvoices: false,       //  
    canApplyDiscounts: true,

    // Orders
    canManageOrders: true,
    canViewOrders: true,
    canCreateOrders: true,
    canEditOrders: true,
    canCancelOrders: true,

    // Customers
    canManageCustomers: true,
    canViewCustomers: true,
    canCreateCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,      //  
    canViewCustomerHistory: true,
      canBlacklistCustomer: true,        //   Manager can blacklist
  canRemoveCustomerBlacklist: false, //   Only shop_admin can remove
  canAddLoyaltyPoints: true,
  canRedeemLoyaltyPoints: true,
  canViewCustomerAnalytics: true,

    // Suppliers
    canManageSuppliers: true,
    canViewSuppliers: true,
    canCreateSuppliers: true,
    canEditSuppliers: true,
    canDeleteSuppliers: false,      //  
      canRestoreSupplier: true,
  canUpdateSupplierRating: true,
  canBlacklistSupplier: false,       //   Only shop_admin (from table)
  canRemoveSupplierBlacklist: false, //   Only shop_admin
  canMarkPreferredSupplier: true,
  canRemovePreferredSupplier: true,
  canUpdateSupplierBalance: true,
  canViewSupplierStatistics: true,
  canViewTopSuppliers: true,

    // Parties & Billing
    canManageParties: true,
    canViewPartyLedger: true,
    canManageBilling: true,
    canViewBilling: true,

    // Financial
    canViewFinancials: true,
    canViewPayments: true,
    canReceivePayments: true,
    canMakePayments: true,
    canViewProfitLoss: false,       //  
    canApproveTransactions: true,

    // Expenses
    canManageExpenses: true,

    // Schemes
    canManageSchemes: true,
    canViewSchemes: true,
    canCreateSchemes: true,
    canEditSchemes: true,
    canDeleteSchemes: false,        //  

    // Reports & Analytics
    canManageReports: true,
    canViewReports: true,
    canGenerateReports: true,
    canExportReports: true,
    canViewAnalytics: true,
    canViewDashboard: true,

    // POS
    canAccessPOS: true,

    // Users
    canManageUsers: false,          //  
    canViewUsers: true,
    canCreateUsers: false,          //  
    canEditUsers: false,            //  
    canDeleteUsers: false,          //  
    canAssignRoles: false,          //  

    // Shop Settings
    canManageShopSettings: false,   //  
    canManageMetalRates: true,
    canUpdateMetalRates: true,
    canManageTaxSettings: false,    //  
      canCreateShop: false,              //   Cannot create shops
  canViewShops: true,
  canViewSingleShop: true,
  canUpdateShop: false,              //   Cannot update shop (from table)
  canDeleteShop: false,              //   Cannot delete shop
  canViewShopStatistics: true,
  canTransferInventory: true,

    // Advanced Features
    canManageRepairs: true,
    canManageCustomOrders: true,
    canManageHallmarking: true,
    canManageOldGold: true,

    // System
    canManageSettings: false,       //  
    canExportData: true,
    canDeleteRecords: false,        //  
    canViewAuditLog: false,         //  
    canBackupData: false,           //  
    canRestoreData: false,          //  
  },

  // ============================================================================
  // STAFF - POS & Customer Operations
  // ============================================================================
  staff: {
    // Inventory & Products
    canManageInventory: false,
    canViewInventory: true,
    canEditInventory: false,
    canManageProducts: false,
    canDeleteProducts: false,
    canImportProducts: false,
    canExportProducts: false,

    // Purchases
    canManagePurchases: false,
    canViewPurchases: true,
    canCreatePurchases: false,
    canEditPurchases: false,
    canDeletePurchases: false,
    canApprovePurchases: false,

    // Sales
    canManageSales: true,           //   For POS
    canViewSales: true,
    canCreateSales: true,           //   For POS
    canEditSales: false,
    canDeleteSales: false,
    canApproveSales: false,
    canGenerateInvoices: true,      //   For POS
    canCancelInvoices: false,
    canApplyDiscounts: false,

    // Orders
    canManageOrders: false,
    canViewOrders: true,
    canCreateOrders: false,
    canEditOrders: false,
    canCancelOrders: false,

    // Customers
    canManageCustomers: false,
    canViewCustomers: true,
    canCreateCustomers: true,       //   For POS
    canEditCustomers: false,
    canDeleteCustomers: false,
    canViewCustomerHistory: true,
      canBlacklistCustomer: false,       //   Staff cannot blacklist
  canRemoveCustomerBlacklist: false,
  canAddLoyaltyPoints: false,        //   Staff cannot add points
  canRedeemLoyaltyPoints: true,      //   Staff can redeem (from table)
  canViewCustomerAnalytics: false,   //   Staff cannot view analytics

    // Suppliers
    canManageSuppliers: false,
    canViewSuppliers: true,
    canCreateSuppliers: false,      //   Staff cannot create suppliers
    canEditSuppliers: false,
    canDeleteSuppliers: false,
      canRestoreSupplier: false,
  canUpdateSupplierRating: false,
  canBlacklistSupplier: false,
  canRemoveSupplierBlacklist: false,
  canMarkPreferredSupplier: false,
  canRemovePreferredSupplier: false,
  canUpdateSupplierBalance: false,
  canViewSupplierStatistics: false,
  canViewTopSuppliers: false,        //   Staff cannot see top suppliers

    // Parties & Billing
    canManageParties: false,
    canViewPartyLedger: false,
    canManageBilling: false,
    canViewBilling: true,

    // Financial
    canViewFinancials: false,
    canViewPayments: true,
    canReceivePayments: true,       //   Can receive cash
    canMakePayments: false,
    canViewProfitLoss: false,
    canApproveTransactions: false,

    // Expenses
    canManageExpenses: false,

    // Schemes
    canManageSchemes: false,
    canViewSchemes: true,
    canCreateSchemes: false,
    canEditSchemes: false,
    canDeleteSchemes: false,

    // Reports & Analytics
    canManageReports: false,
    canViewReports: false,
    canGenerateReports: false,
    canExportReports: false,
    canViewAnalytics: false,
    canViewDashboard: true,

    // POS
    canAccessPOS: true,             //   Main permission

    // Users
    canManageUsers: false,
    canViewUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canAssignRoles: false,

    // Shop Settings
    canManageShopSettings: false,
    canManageMetalRates: false,
    canUpdateMetalRates: false,
    canManageTaxSettings: false,
      canCreateShop: false,
  canViewShops: true,
  canViewSingleShop: true,
  canUpdateShop: false,
  canDeleteShop: false,
  canViewShopStatistics: false,      //   Staff cannot view statistics
  canTransferInventory: false,

    // Advanced Features
    canManageRepairs: false,
    canManageCustomOrders: false,
    canManageHallmarking: false,
    canManageOldGold: false,

    // System
    canManageSettings: false,
    canExportData: false,
    canDeleteRecords: false,
    canViewAuditLog: false,
    canBackupData: false,
    canRestoreData: false,
  },

  // ============================================================================
  // ACCOUNTANT - Financial Focus
  // ============================================================================
  accountant: {
    // Inventory & Products
    canManageInventory: false,
    canViewInventory: true,
    canEditInventory: false,
    canManageProducts: false,
    canDeleteProducts: false,
    canImportProducts: false,
    canExportProducts: true,        //   For reports

    // Purchases
    canManagePurchases: true,       //   View & reconcile
    canViewPurchases: true,
    canCreatePurchases: false,
    canEditPurchases: false,
    canDeletePurchases: false,
    canApprovePurchases: false,

    // Sales
    canManageSales: true,           //   View & reconcile
    canViewSales: true,
    canCreateSales: false,
    canEditSales: false,
    canDeleteSales: false,
    canApproveSales: false,
    canGenerateInvoices: true,      //   Generate invoices
    canCancelInvoices: false,
    canApplyDiscounts: false,

    // Orders
    canManageOrders: false,
    canViewOrders: true,
    canCreateOrders: false,
    canEditOrders: false,
    canCancelOrders: false,

    // Customers
    canManageCustomers: false,
    canViewCustomers: true,
    canCreateCustomers: false,      //   Not accountant's job
    canEditCustomers: false,
    canDeleteCustomers: false,
    canViewCustomerHistory: true,
      canBlacklistCustomer: false,       //   Not accountant's job
  canRemoveCustomerBlacklist: false,
  canAddLoyaltyPoints: false,
  canRedeemLoyaltyPoints: false,     //   Accountant doesn't handle POS
  canViewCustomerAnalytics: true,    //   For financial reports

    // Suppliers
    canManageSuppliers: false,
    canViewSuppliers: true,
    canCreateSuppliers: false,      //   Not accountant's job
    canEditSuppliers: false,
    canDeleteSuppliers: false,
 canRestoreSupplier: false,
  canUpdateSupplierRating: false,
  canBlacklistSupplier: false,
  canRemoveSupplierBlacklist: false,
  canMarkPreferredSupplier: false,
  canRemovePreferredSupplier: false,
  canUpdateSupplierBalance: true,    //   Accountant manages balances
  canViewSupplierStatistics: true,   //   For financial reports
  canViewTopSuppliers: false,        //   From table
    // Parties & Billing
    canManageParties: true,         //   Reconcile accounts
    canViewPartyLedger: true,       //  
    canManageBilling: true,         //  
    canViewBilling: true,

    // Financial
    canViewFinancials: true,        //   Core permission
    canViewPayments: true,
    canReceivePayments: true,
    canMakePayments: true,
    canViewProfitLoss: true,        //   Core permission
    canApproveTransactions: false,

    // Expenses
    canManageExpenses: true,        //   Core permission

    // Schemes
    canManageSchemes: false,
    canViewSchemes: true,
    canCreateSchemes: false,
    canEditSchemes: false,
    canDeleteSchemes: false,

    // Reports & Analytics
    canManageReports: true,         //   Core permission
    canViewReports: true,
    canGenerateReports: true,       //   Core permission
    canExportReports: true,
    canViewAnalytics: true,         //   Core permission
    canViewDashboard: true,

    // POS
    canAccessPOS: false,            //   Not needed

    // Users
    canManageUsers: false,
    canViewUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canAssignRoles: false,

    // Shop Settings
    canManageShopSettings: false,
    canManageMetalRates: false,
    canUpdateMetalRates: false,
    canManageTaxSettings: false,
      canCreateShop: false,
  canViewShops: true,
  canViewSingleShop: true,
  canUpdateShop: false,
  canDeleteShop: false,
  canViewShopStatistics: true,       //   For financial reports
  canTransferInventory: false,

    // Advanced Features
    canManageRepairs: false,
    canManageCustomOrders: false,
    canManageHallmarking: false,
    canManageOldGold: false,

    // System
    canManageSettings: false,
    canExportData: true,            //   For reports
    canDeleteRecords: false,
    canViewAuditLog: false,
    canBackupData: true,            //   Financial backups
    canRestoreData: false,
  },

  // ============================================================================
  // VIEWER - Read-only Access
  // ============================================================================
  viewer: {
      canBlacklistCustomer: false,
  canRemoveCustomerBlacklist: false,
  canAddLoyaltyPoints: false,
  canRedeemLoyaltyPoints: false,
  canViewCustomerAnalytics: false,
    canRestoreSupplier: false,
  canUpdateSupplierRating: false,
  canBlacklistSupplier: false,
  canRemoveSupplierBlacklist: false,
  canMarkPreferredSupplier: false,
  canRemovePreferredSupplier: false,
  canUpdateSupplierBalance: false,
  canViewSupplierStatistics: false,
  canViewTopSuppliers: false,
    canCreateShop: false,
  canViewShops: true,                //   Can view list
  canViewSingleShop: true,           //   Can view single
  canUpdateShop: false,
  canDeleteShop: false,
  canViewShopStatistics: false,
  canTransferInventory: false,
    canManageInventory: false,
    canViewInventory: true,
    canEditInventory: false,
    canManageProducts: false,
    canDeleteProducts: false,
    canImportProducts: false,
    canExportProducts: false,
    canManagePurchases: false,
    canViewPurchases: true,
    canCreatePurchases: false,
    canEditPurchases: false,
    canDeletePurchases: false,
    canApprovePurchases: false,
    canManageSales: false,
    canViewSales: true,
    canCreateSales: false,
    canEditSales: false,
    canDeleteSales: false,
    canApproveSales: false,
    canGenerateInvoices: false,
    canCancelInvoices: false,
    canApplyDiscounts: false,
    canManageOrders: false,
    canViewOrders: true,
    canCreateOrders: false,
    canEditOrders: false,
    canCancelOrders: false,
    canManageCustomers: false,
    canViewCustomers: true,
    canCreateCustomers: false,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canViewCustomerHistory: true,
    canManageSuppliers: false,
    canViewSuppliers: true,
    canCreateSuppliers: false,
    canEditSuppliers: false,
    canDeleteSuppliers: false,
    canManageParties: false,
    canViewPartyLedger: false,
    canManageBilling: false,
    canViewBilling: false,
    canViewFinancials: false,
    canViewPayments: false,
    canReceivePayments: false,
    canMakePayments: false,
    canViewProfitLoss: false,
    canApproveTransactions: false,
    canManageExpenses: false,
    canManageSchemes: false,
    canViewSchemes: true,
    canCreateSchemes: false,
    canEditSchemes: false,
    canDeleteSchemes: false,
    canManageReports: false,
    canViewReports: false,
    canGenerateReports: false,
    canExportReports: false,
    canViewAnalytics: false,
    canViewDashboard: true,
    canAccessPOS: false,
    canManageUsers: false,
    canViewUsers: true,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canAssignRoles: false,
    canManageShopSettings: false,
    canManageMetalRates: false,
    canUpdateMetalRates: false,
    canManageTaxSettings: false,
    canManageRepairs: false,
    canManageCustomOrders: false,
    canManageHallmarking: false,
    canManageOldGold: false,
    canManageSettings: false,
    canExportData: false,
    canDeleteRecords: false,
    canViewAuditLog: false,
    canBackupData: false,
    canRestoreData: false,
  },
};

/**
 * Get permissions for a specific role
 * @param {string} role - User role
 * @returns {object} Permission object
 */
export const getPermissionsByRole = (role) => {
  return PERMISSIONS[role] || PERMISSIONS.viewer;
};



export default {
  PERMISSIONS,
  getPermissionsByRole,
};