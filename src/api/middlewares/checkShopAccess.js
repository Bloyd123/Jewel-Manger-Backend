// ============================================================================
// FILE: src/api/middlewares/checkShopAccess.js
// Shop Access Middleware - Verify user has access to specific shop
// ============================================================================

import mongoose from 'mongoose';
import UserShopAccess from '../../models/UserShopAccess.js';
import JewelryShop from '../../models/Shop.js';
import AppError from '../../utils/AppError.js';
import { catchAsync } from './errorHandler.js';

// ============================================================================
// CHECK SHOP ACCESS MIDDLEWARE
// ============================================================================

export const checkShopAccess = catchAsync(async (req, res, next) => {
  // 1. Get shopId from params or query
  const shopId = req.params.id || req.query.shopId;

  if (!shopId) {
    throw new AppError('Shop ID is required', 400);
  }

  // 2. Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    throw new AppError('Invalid shop ID', 400);
  }

  // 3. Super admin has access to all shops
  if (req.user.role === 'super_admin') {
    return next();
  }

  // 4. Check if shop exists
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  // 5. Org admin can access shops within their organization
  if (req.user.role === 'org_admin') {
    if (shop.organizationId.toString() !== req.user.organizationId.toString()) {
      throw new AppError('You do not have access to this shop', 403);
    }
    return next();
  }

  // 6. For other roles, check UserShopAccess
  const userAccess = await UserShopAccess.findOne({
    userId: req.user._id,
    shopId,
    isActive: true,
    deletedAt: null,
    revokedAt: null,
  });

  if (!userAccess) {
    throw new AppError('You do not have access to this shop', 403);
  }

  // 7. Check if access has expired
  if (userAccess.accessEndDate && new Date() > userAccess.accessEndDate) {
    throw new AppError('Your access to this shop has expired', 403);
  }

  // 8. Attach shop and user access to request for use in controllers
  req.shop = shop;
  req.userShopAccess = userAccess;

  next();
});

// ============================================================================
// CHECK SPECIFIC PERMISSION MIDDLEWARE (Factory Function)
// ============================================================================

export const checkPermission = (permission) => {
  return catchAsync(async (req, res, next) => {
    // Super admin has all permissions
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Org admin has most permissions
    if (req.user.role === 'org_admin') {
      return next();
    }

    // Check if userShopAccess exists (should be set by checkShopAccess middleware)
    if (!req.userShopAccess) {
      throw new AppError('Shop access not verified', 403);
    }

    // Check specific permission
    if (!req.userShopAccess.hasPermission(permission)) {
      throw new AppError(`You do not have permission to ${permission}`, 403);
    }

    next();
  });
};

// ============================================================================
// EXPORT MIDDLEWARE
// ============================================================================

export default {
  checkShopAccess,
  checkPermission,
};