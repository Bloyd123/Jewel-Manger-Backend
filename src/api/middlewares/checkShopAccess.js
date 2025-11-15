// ============================================================================
// FILE: src/api/middlewares/checkShopAccess.js
// Shop Access Middleware - Verify user has access to specific shop with permissions
// ============================================================================

import mongoose from 'mongoose';
import UserShopAccess from '../../models/UserShopAccess.js';
import JewelryShop from '../../models/Shop.js';
import { InsufficientPermissionsError, NotFoundError, ValidationError } from '../../utils/AppError.js';
import { catchAsync } from './errorHandler.js';
import logger from '../../utils/logger.js';

// ============================================================================
// BASIC SHOP ACCESS CHECK - Verifies user has access to shop
// ============================================================================

export const checkShopAccess = catchAsync(async (req, res, next) => {
  try {
    // 1. Get shopId from multiple sources (body has priority, then query, then params, then user's primary shop)
    const shopId = req.body.shopId || req.query.shopId || req.params.shopId || req.user.primaryShop;

    if (!shopId) {
      throw new NotFoundError('Shop ID is required');
    }

    // 2. Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      throw new ValidationError('Invalid shop ID format');
    }

    // 3. Super admin has access to all shops - bypass all checks
    if (req.user.role === 'super_admin') {
      const shop = await JewelryShop.findById(shopId);
      if (!shop) {
        throw new NotFoundError('Shop not found');
      }
      req.shop = shop;
      req.userShopAccess = null; // Super admin doesn't need shop access record
      return next();
    }

    // 4. Check if shop exists
    const shop = await JewelryShop.findById(shopId);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    // 5. Verify shop belongs to user's organization
    if (shop.organizationId.toString() !== req.user.organizationId.toString()) {
      throw new InsufficientPermissionsError('Shop does not belong to your organization');
    }

    // 6. Org admin can access all shops within their organization
    if (req.user.role === 'org_admin') {
      req.shop = shop;
      req.userShopAccess = null; // Org admin doesn't need shop access record
      return next();
    }

    // 7. For other roles (shop_admin, manager, staff, etc.), verify UserShopAccess
    const userAccess = await UserShopAccess.findOne({
      userId: req.user._id,
      shopId,
      organizationId: req.user.organizationId,
      deletedAt: null,
      revokedAt: null,
    });

    if (!userAccess) {
      throw new InsufficientPermissionsError('You do not have access to this shop');
    }

    // 8. Check if access is active
    if (!userAccess.isActive) {
      throw new InsufficientPermissionsError('Your shop access is currently inactive');
    }

    // 9. Check if access has expired
    if (userAccess.accessEndDate && new Date() > userAccess.accessEndDate) {
      throw new InsufficientPermissionsError('Your access to this shop has expired');
    }

    // 10. Update last access timestamp (async, don't wait)
    userAccess.updateLastAccess(req.ip).catch(err => {
      logger.error('Failed to update last access', { userId: req.user._id, shopId, error: err.message });
    });

    // 11. Attach shop and user access to request for use in controllers
    req.shop = shop;
    req.userShopAccess = userAccess;

    next();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CHECK SPECIFIC PERMISSION - Factory function for permission-based access
// ============================================================================

/**
 * Middleware factory to check if user has specific permission for a shop
 * @param {string} permission - Permission key to check (e.g., 'canManagePurchases')
 * @returns {Function} Express middleware
 */
export const checkPermission = (permission) => {
  return catchAsync(async (req, res, next) => {
    try {
      // 1. Super admin and org admin have all permissions - bypass check
      if (req.user.role === 'super_admin' || req.user.role === 'org_admin') {
        return next();
      }

      // 2. Get shopId from multiple sources
      const shopId = req.body.shopId || req.query.shopId || req.params.shopId || req.user.primaryShop;

      if (!shopId) {
        throw new NotFoundError('Shop ID is required to check permissions');
      }

      // 3. Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(shopId)) {
        throw new ValidationError('Invalid shop ID format');
      }

      // 4. Get or create userShopAccess if not already in request
      let userAccess = req.userShopAccess;

      if (!userAccess) {
        userAccess = await UserShopAccess.findOne({
          userId: req.user._id,
          shopId,
          organizationId: req.user.organizationId,
          deletedAt: null,
          revokedAt: null,
        });

        if (!userAccess) {
          throw new InsufficientPermissionsError('You do not have access to this shop');
        }

        // Validate access is active and not expired
        if (!userAccess.isActive) {
          throw new InsufficientPermissionsError('Your shop access is currently inactive');
        }

        if (userAccess.accessEndDate && new Date() > userAccess.accessEndDate) {
          throw new InsufficientPermissionsError('Your shop access has expired');
        }

        req.userShopAccess = userAccess;
      }

      // 5. Check if user has the specific permission
      if (!userAccess.hasPermission(permission)) {
        const permissionName = permission.replace('can', '').replace(/([A-Z])/g, ' $1').trim().toLowerCase();
        throw new InsufficientPermissionsError(`You do not have permission to ${permissionName}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};

// ============================================================================
// CHECK ANY PERMISSION - User must have at least ONE of the specified permissions
// ============================================================================

/**
 * Middleware factory to check if user has ANY of the specified permissions
 * @param {string[]} permissions - Array of permission keys
 * @returns {Function} Express middleware
 */
export const checkAnyPermission = (permissions) => {
  return catchAsync(async (req, res, next) => {
    try {
      // Super admin and org admin have all permissions
      if (req.user.role === 'super_admin' || req.user.role === 'org_admin') {
        return next();
      }

      const shopId = req.body.shopId || req.query.shopId || req.params.shopId || req.user.primaryShop;

      if (!shopId) {
        throw new NotFoundError('Shop ID is required to check permissions');
      }

      if (!mongoose.Types.ObjectId.isValid(shopId)) {
        throw new ValidationError('Invalid shop ID format');
      }

      let userAccess = req.userShopAccess;

      if (!userAccess) {
        userAccess = await UserShopAccess.findOne({
          userId: req.user._id,
          shopId,
          organizationId: req.user.organizationId,
          deletedAt: null,
          revokedAt: null,
        });

        if (!userAccess) {
          throw new InsufficientPermissionsError('You do not have access to this shop');
        }

        if (!userAccess.isActive || (userAccess.accessEndDate && new Date() > userAccess.accessEndDate)) {
          throw new InsufficientPermissionsError('Your shop access is invalid or expired');
        }

        req.userShopAccess = userAccess;
      }

      // Check if user has ANY of the specified permissions
      if (!userAccess.hasAnyPermission(permissions)) {
        throw new InsufficientPermissionsError('You do not have any of the required permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};

// ============================================================================
// CHECK ALL PERMISSIONS - User must have ALL of the specified permissions
// ============================================================================

/**
 * Middleware factory to check if user has ALL of the specified permissions
 * @param {string[]} permissions - Array of permission keys
 * @returns {Function} Express middleware
 */
export const checkAllPermissions = (permissions) => {
  return catchAsync(async (req, res, next) => {
    try {
      // Super admin and org admin have all permissions
      if (req.user.role === 'super_admin' || req.user.role === 'org_admin') {
        return next();
      }

      const shopId = req.body.shopId || req.query.shopId || req.params.shopId || req.user.primaryShop;

      if (!shopId) {
        throw new NotFoundError('Shop ID is required to check permissions');
      }

      if (!mongoose.Types.ObjectId.isValid(shopId)) {
        throw new ValidationError('Invalid shop ID format');
      }

      let userAccess = req.userShopAccess;

      if (!userAccess) {
        userAccess = await UserShopAccess.findOne({
          userId: req.user._id,
          shopId,
          organizationId: req.user.organizationId,
          deletedAt: null,
          revokedAt: null,
        });

        if (!userAccess) {
          throw new InsufficientPermissionsError('You do not have access to this shop');
        }

        if (!userAccess.isActive || (userAccess.accessEndDate && new Date() > userAccess.accessEndDate)) {
          throw new InsufficientPermissionsError('Your shop access is invalid or expired');
        }

        req.userShopAccess = userAccess;
      }

      // Check if user has ALL of the specified permissions
      if (!userAccess.hasAllPermissions(permissions)) {
        throw new InsufficientPermissionsError('You do not have all the required permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};

// ============================================================================
// VERIFY SHOP OWNERSHIP - For shop_admin role only
// ============================================================================

/**
 * Middleware to verify user is the primary admin of the shop
 */
export const verifyShopOwnership = catchAsync(async (req, res, next) => {
  try {
    const shopId = req.body.shopId || req.query.shopId || req.params.shopId || req.user.primaryShop;

    if (!shopId) {
      throw new NotFoundError('Shop ID is required');
    }

    // Super admin can do anything
    if (req.user.role === 'super_admin') {
      return next();
    }

    const shop = await JewelryShop.findById(shopId);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    // Check if user is the shop owner/admin
    if (shop.adminId && shop.adminId.toString() !== req.user._id.toString()) {
      throw new InsufficientPermissionsError('Only the shop owner can perform this action');
    }

    req.shop = shop;
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CHECK MULTIPLE SHOPS ACCESS - For operations spanning multiple shops
// ============================================================================

/**
 * Middleware to verify user has access to multiple shops
 * @param {string} shopIdsField - Field name in request body containing array of shop IDs
 */
export const checkMultipleShopsAccess = (shopIdsField = 'shopIds') => {
  return catchAsync(async (req, res, next) => {
    try {
      const shopIds = req.body[shopIdsField];

      if (!shopIds || !Array.isArray(shopIds) || shopIds.length === 0) {
        throw new ValidationError(`${shopIdsField} must be a non-empty array`);
      }

      // Super admin has access to all
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Validate all shop IDs
      const invalidIds = shopIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        throw new ValidationError('One or more shop IDs are invalid');
      }

      // For org admin, verify all shops belong to their organization
      if (req.user.role === 'org_admin') {
        const shops = await JewelryShop.find({
          _id: { $in: shopIds },
          organizationId: req.user.organizationId,
        });

        if (shops.length !== shopIds.length) {
          throw new InsufficientPermissionsError('You do not have access to all specified shops');
        }

        return next();
      }

      // For other roles, check UserShopAccess for each shop
      const userAccesses = await UserShopAccess.find({
        userId: req.user._id,
        shopId: { $in: shopIds },
        organizationId: req.user.organizationId,
        isActive: true,
        deletedAt: null,
        revokedAt: null,
      });

      if (userAccesses.length !== shopIds.length) {
        throw new InsufficientPermissionsError('You do not have access to all specified shops');
      }

      // Check for expired access
      const expiredAccess = userAccesses.find(
        access => access.accessEndDate && new Date() > access.accessEndDate
      );

      if (expiredAccess) {
        throw new InsufficientPermissionsError('Your access to one or more shops has expired');
      }

      req.userShopAccesses = userAccesses;
      next();
    } catch (error) {
      next(error);
    }
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  checkShopAccess,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  verifyShopOwnership,
  checkMultipleShopsAccess,
};