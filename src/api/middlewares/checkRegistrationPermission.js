// ============================================================================
// FILE: middleware/checkRegistrationPermission.js
// Middleware to control WHO CAN REGISTER WHOM - Hierarchy Control
// ============================================================================

import JewelryShop from '../../models/Shop.js';
import Organization from '../../models/Organization.js';

/**
 * Middleware to check if current user has permission to register a new user
 * Based on organizational hierarchy rules
 */
export const checkRegistrationPermission = async (req, res, next) => {
  const { role, organizationId, primaryShop } = req.body;
  const currentUser = req.user; // Logged-in user who is registering

  // ============================================
  // NEW: Validate Organization First
  // ============================================
  if (role !== 'super_admin' && organizationId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    if (!organization.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Organization is inactive',
      });
    }
  }

  // ============================================
  // RULE 1: Super Admin
  // ============================================
  if (currentUser.role === 'super_admin') {
    // Super admin can register ANYONE
    // - Org admins
    // - Shop admins
    // - All roles
    return next();
  }

  // ============================================
  // RULE 2: Org Admin
  // ============================================
  if (currentUser.role === 'org_admin') {
    // Check: Same organization ka user bana raha hai?
    if (organizationId !== currentUser.organizationId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create users for your own organization',
      });
    }

    // Check: Allowed roles
    const allowedRoles = ['shop_admin', 'manager', 'staff', 'accountant', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Org admin can only create shop-level users',
      });
    }

    // Check: Shop belongs to org
    if (primaryShop) {
      const shop = await JewelryShop.findOne({
        _id: primaryShop,
        organizationId: currentUser.organizationId,
      });

      if (!shop) {
        return res.status(400).json({
          success: false,
          message: 'Shop not found or does not belong to your organization',
        });
      }
    }

    return next();
  }

  // ============================================
  // RULE 3: Shop Admin
  // ============================================
  if (currentUser.role === 'shop_admin') {
    // Check: Same organization
    if (organizationId !== currentUser.organizationId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create users for your organization',
      });
    }

    // Check: Same shop
    if (primaryShop !== currentUser.primaryShop?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create users for your own shop',
      });
    }

    // Check: Allowed roles (only lower roles)
    const allowedRoles = ['manager', 'staff', 'accountant', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Shop admin can only create manager, staff, accountant, and user roles',
      });
    }

    return next();
  }

  // ============================================
  // RULE 4: Manager
  // ============================================
  if (currentUser.role === 'manager') {
    // Check: Same shop
    if (primaryShop !== currentUser.primaryShop?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create users for your own shop',
      });
    }

    // Check: Allowed roles (only staff/user)
    const allowedRoles = ['staff', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Manager can only create staff and user roles',
      });
    }

    return next();
  }

  // ============================================
  // DEFAULT: No permission
  // ============================================
  return res.status(403).json({
    success: false,
    message: 'You do not have permission to create users',
  });
};

export default checkRegistrationPermission;
