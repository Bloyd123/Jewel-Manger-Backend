// ============================================================================
// FILE: src/utils/roleHelpers.js
// Role-based authorization helpers
// ============================================================================

export const canCreateShop = (user, organizationId) => {
  if (user.role === 'super_admin') return true;
  if (user.role === 'org_admin' && user.organizationId?.equals(organizationId)) {
    return true;
  }
  return false;
};

export const canManageAllShops = (user) => {
  return ['super_admin', 'org_admin'].includes(user.role);
};

export const canDeleteShop = (user) => {
  return ['super_admin', 'org_admin'].includes(user.role);
};