import { describe, it, expect } from '@jest/globals';
import {
  PERMISSIONS,
  getPermissionsByRole,
  hasPermission,
  getGrantedPermissions,
  getDeniedPermissions,
  compareRoles,
} from '../../config/permissions.config.js';

describe('Permissions Config', () => {

  // ─── ROLE EXISTS ───────────────────────────────────────────────
  describe('Role Definitions', () => {
    it('should have all 5 roles defined', () => {
      expect(PERMISSIONS).toHaveProperty('shop_admin');
      expect(PERMISSIONS).toHaveProperty('manager');
      expect(PERMISSIONS).toHaveProperty('staff');
      expect(PERMISSIONS).toHaveProperty('accountant');
      expect(PERMISSIONS).toHaveProperty('viewer');
    });

    it('should return viewer permissions for unknown role', () => {
      const perms = getPermissionsByRole('unknown_role');
      expect(perms).toEqual(PERMISSIONS.viewer);
    });
  });

  // ─── SHOP ADMIN ────────────────────────────────────────────────
  describe('shop_admin permissions', () => {
    const role = 'shop_admin';

    it('✅ should have full customer management', () => {
      expect(hasPermission(role, 'canCreateCustomer')).toBe(true);
      expect(hasPermission(role, 'canDeleteCustomers')).toBe(true);
      expect(hasPermission(role, 'canBlacklistCustomer')).toBe(true);
      expect(hasPermission(role, 'canRemoveCustomerBlacklist')).toBe(true);
      expect(hasPermission(role, 'canAddLoyaltyPoints')).toBe(true);
      expect(hasPermission(role, 'canRedeemLoyaltyPoints')).toBe(true);
      expect(hasPermission(role, 'canViewCustomerAnalytics')).toBe(true);
    });

    it('✅ should have full product management', () => {
      expect(hasPermission(role, 'canCreateProduct')).toBe(true);
      expect(hasPermission(role, 'canDeleteProducts')).toBe(true);
      expect(hasPermission(role, 'canBulkDeleteProducts')).toBe(true);
      expect(hasPermission(role, 'canManageInventory')).toBe(true);
    });

    it('❌ should NOT have canManageTaxSettings', () => {
      expect(hasPermission(role, 'canManageTaxSettings')).toBe(false);
    });

    it('✅ should have nearly all permissions granted', () => {
      const granted = getGrantedPermissions(role);
      expect(granted.length).toBeGreaterThan(200);
    });
  });

  // ─── MANAGER ───────────────────────────────────────────────────
  describe('manager permissions', () => {
    const role = 'manager';

    it('✅ can blacklist customer', () => {
      expect(hasPermission(role, 'canBlacklistCustomer')).toBe(true);
    });

    it('❌ cannot remove customer blacklist', () => {
      expect(hasPermission(role, 'canRemoveCustomerBlacklist')).toBe(false);
    });

    it('❌ cannot delete customers', () => {
      expect(hasPermission(role, 'canDeleteCustomers')).toBe(false);
    });

    it('✅ can add loyalty points', () => {
      expect(hasPermission(role, 'canAddLoyaltyPoints')).toBe(true);
    });

    it('✅ can redeem loyalty points', () => {
      expect(hasPermission(role, 'canRedeemLoyaltyPoints')).toBe(true);
    });

    it('✅ can view customer analytics', () => {
      expect(hasPermission(role, 'canViewCustomerAnalytics')).toBe(true);
    });

    it('❌ cannot create shop', () => {
      expect(hasPermission(role, 'canCreateShop')).toBe(false);
    });

    it('❌ cannot sync rates to all shops', () => {
      expect(hasPermission(role, 'canSyncToAllShops')).toBe(false);
    });

    it('❌ cannot manage users', () => {
      expect(hasPermission(role, 'canManageUsers')).toBe(false);
    });

    it('❌ cannot view profit & loss', () => {
      expect(hasPermission(role, 'canViewProfitLoss')).toBe(false);
    });

    it('❌ cannot delete records', () => {
      expect(hasPermission(role, 'canDeleteRecords')).toBe(false);
    });

    it('❌ cannot view audit log', () => {
      expect(hasPermission(role, 'canViewAuditLog')).toBe(false);
    });
  });

  // ─── STAFF ─────────────────────────────────────────────────────
  describe('staff permissions', () => {
    const role = 'staff';

    it('✅ can create customer', () => {
      expect(hasPermission(role, 'canCreateCustomer')).toBe(true);
    });

    it('✅ can search customer', () => {
      expect(hasPermission(role, 'canSearchCustomer')).toBe(true);
    });

    it('❌ cannot update customer', () => {
      expect(hasPermission(role, 'canUpdateCustomer')).toBe(false);
    });

    it('❌ cannot blacklist customer', () => {
      expect(hasPermission(role, 'canBlacklistCustomer')).toBe(false);
    });

    it('❌ cannot add loyalty points', () => {
      expect(hasPermission(role, 'canAddLoyaltyPoints')).toBe(false);
    });

    it('✅ can redeem loyalty points', () => {
      expect(hasPermission(role, 'canRedeemLoyaltyPoints')).toBe(true);
    });

    it('❌ cannot view customer analytics', () => {
      expect(hasPermission(role, 'canViewCustomerAnalytics')).toBe(false);
    });

    it('✅ can access POS', () => {
      expect(hasPermission(role, 'canAccessPOS')).toBe(true);
    });

    it('❌ cannot approve payments', () => {
      expect(hasPermission(role, 'canApprovePayment')).toBe(false);
    });

    it('❌ cannot view financials', () => {
      expect(hasPermission(role, 'canViewFinancials')).toBe(false);
    });

    it('❌ cannot manage users', () => {
      expect(hasPermission(role, 'canManageUsers')).toBe(false);
    });

    it('❌ cannot export data', () => {
      expect(hasPermission(role, 'canExportData')).toBe(false);
    });
  });

  // ─── ACCOUNTANT ────────────────────────────────────────────────
  describe('accountant permissions', () => {
    const role = 'accountant';

    it('❌ cannot create customer', () => {
      expect(hasPermission(role, 'canCreateCustomer')).toBe(false);
    });

    it('✅ can search & view customers', () => {
      expect(hasPermission(role, 'canSearchCustomer')).toBe(true);
      expect(hasPermission(role, 'canViewCustomers')).toBe(true);
      expect(hasPermission(role, 'canGetSingleCustomer')).toBe(true);
    });

    it('✅ can view customer analytics', () => {
      expect(hasPermission(role, 'canViewCustomerAnalytics')).toBe(true);
    });

    it('❌ cannot add/redeem loyalty points', () => {
      expect(hasPermission(role, 'canAddLoyaltyPoints')).toBe(false);
      expect(hasPermission(role, 'canRedeemLoyaltyPoints')).toBe(false);
    });

    it('✅ can clear and bounce cheques', () => {
      expect(hasPermission(role, 'canClearCheque')).toBe(true);
      expect(hasPermission(role, 'canBounceCheque')).toBe(true);
    });

    it('✅ can reconcile payments', () => {
      expect(hasPermission(role, 'canReconcilePayment')).toBe(true);
      expect(hasPermission(role, 'canBulkReconcile')).toBe(true);
    });

    it('✅ can view profit & loss', () => {
      expect(hasPermission(role, 'canViewProfitLoss')).toBe(true);
    });

    it('❌ cannot access POS', () => {
      expect(hasPermission(role, 'canAccessPOS')).toBe(false);
    });

    it('❌ cannot approve/reject payments', () => {
      expect(hasPermission(role, 'canApprovePayment')).toBe(false);
      expect(hasPermission(role, 'canRejectPayment')).toBe(false);
    });

    it('❌ cannot manage users', () => {
      expect(hasPermission(role, 'canManageUsers')).toBe(false);
    });

    it('✅ can backup data', () => {
      expect(hasPermission(role, 'canBackupData')).toBe(true);
    });

    it('❌ cannot restore data', () => {
      expect(hasPermission(role, 'canRestoreData')).toBe(false);
    });
  });

  // ─── VIEWER ────────────────────────────────────────────────────
  describe('viewer permissions', () => {
    const role = 'viewer';

    it('✅ can view basic read-only data', () => {
      expect(hasPermission(role, 'canViewCustomers')).toBe(true);
      expect(hasPermission(role, 'canGetSingleCustomer')).toBe(true);
      expect(hasPermission(role, 'canSearchCustomer')).toBe(true);
      expect(hasPermission(role, 'canViewOrders')).toBe(true);
      expect(hasPermission(role, 'canViewDashboard')).toBe(true);
    });

    it('❌ cannot do any write operations', () => {
      expect(hasPermission(role, 'canCreateCustomer')).toBe(false);
      expect(hasPermission(role, 'canUpdateCustomer')).toBe(false);
      expect(hasPermission(role, 'canDeleteCustomers')).toBe(false);
      expect(hasPermission(role, 'canCreateSale')).toBe(false);
      expect(hasPermission(role, 'canCreatePayment')).toBe(false);
      expect(hasPermission(role, 'canCreateOrder')).toBe(false);
    });

    it('❌ cannot access any financial write ops', () => {
      expect(hasPermission(role, 'canApprovePayment')).toBe(false);
      expect(hasPermission(role, 'canProcessRefund')).toBe(false);
      expect(hasPermission(role, 'canManageBilling')).toBe(false);
    });

    it('❌ cannot access POS', () => {
      expect(hasPermission(role, 'canAccessPOS')).toBe(false);
    });

    it('✅ can view users list', () => {
      expect(hasPermission(role, 'canViewUsers')).toBe(true);
    });

    it('❌ has very few granted permissions', () => {
      const granted = getGrantedPermissions(role);
      expect(granted.length).toBeLessThan(30);
    });
  });

  // ─── CROSS-ROLE COMPARISONS ────────────────────────────────────
  describe('compareRoles utility', () => {
    it('shop_admin should have MORE permissions than manager', () => {
      const shopAdminGranted = getGrantedPermissions('shop_admin').length;
      const managerGranted = getGrantedPermissions('manager').length;
      expect(shopAdminGranted).toBeGreaterThan(managerGranted);
    });

    it('manager should have MORE permissions than staff', () => {
      const managerGranted = getGrantedPermissions('manager').length;
      const staffGranted = getGrantedPermissions('staff').length;
      expect(managerGranted).toBeGreaterThan(staffGranted);
    });

    it('staff should have MORE permissions than viewer', () => {
      const staffGranted = getGrantedPermissions('staff').length;
      const viewerGranted = getGrantedPermissions('viewer').length;
      expect(staffGranted).toBeGreaterThan(viewerGranted);
    });

    it('compareRoles should show differences between shop_admin and manager', () => {
      const diff = compareRoles('shop_admin', 'manager');
      expect(Object.keys(diff).length).toBeGreaterThan(0);
      // shop_admin can delete customers, manager cannot
      expect(diff).toHaveProperty('canDeleteCustomers');
      expect(diff.canDeleteCustomers.shop_admin).toBe(true);
      expect(diff.canDeleteCustomers.manager).toBe(false);
    });

    it('compareRoles should show manager vs staff differences on blacklist', () => {
      const diff = compareRoles('manager', 'staff');
      expect(diff).toHaveProperty('canBlacklistCustomer');
      expect(diff.canBlacklistCustomer.manager).toBe(true);
      expect(diff.canBlacklistCustomer.staff).toBe(false);
    });
  });

  // ─── SPECIFIC ENDPOINT PERMISSION MATRIX ──────────────────────
  describe('Customer endpoint permission matrix', () => {
    const endpoints = [
      { perm: 'canBlacklistCustomer',        shop_admin: true,  manager: true,  staff: false, accountant: false, viewer: false },
      { perm: 'canRemoveCustomerBlacklist',  shop_admin: true,  manager: false, staff: false, accountant: false, viewer: false },
      { perm: 'canAddLoyaltyPoints',         shop_admin: true,  manager: true,  staff: false, accountant: false, viewer: false },
      { perm: 'canRedeemLoyaltyPoints',      shop_admin: true,  manager: true,  staff: true,  accountant: false, viewer: false },
      { perm: 'canViewCustomerAnalytics',    shop_admin: true,  manager: true,  staff: false, accountant: true,  viewer: false },
      { perm: 'canDeleteCustomers',          shop_admin: true,  manager: false, staff: false, accountant: false, viewer: false },
    ];

    endpoints.forEach(({ perm, ...roles }) => {
      Object.entries(roles).forEach(([role, expected]) => {
        it(`${expected ? '✅' : '❌'} ${role} — ${perm}`, () => {
          expect(hasPermission(role, perm)).toBe(expected);
        });
      });
    });
  });

  // ─── HELPER FUNCTION EDGE CASES ───────────────────────────────
  describe('Helper function edge cases', () => {
    it('hasPermission returns false for non-existent permission', () => {
      expect(hasPermission('shop_admin', 'canDoSomethingFake')).toBe(false);
    });

    it('hasPermission returns false for non-existent role', () => {
      expect(hasPermission('ghost_role', 'canCreateCustomer')).toBe(false);
    });

    it('getDeniedPermissions returns array of false perms', () => {
      const denied = getDeniedPermissions('viewer');
      expect(Array.isArray(denied)).toBe(true);
      expect(denied).toContain('canCreateCustomer');
      expect(denied).toContain('canDeleteCustomers');
    });

    it('getGrantedPermissions returns array of true perms', () => {
      const granted = getGrantedPermissions('viewer');
      expect(Array.isArray(granted)).toBe(true);
      expect(granted).toContain('canViewCustomers');
      expect(granted).toContain('canSearchCustomer');
      expect(granted).not.toContain('canCreateCustomer');
    });
  });
});