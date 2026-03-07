// FILE: src/api/middlewares/checkShopAccess.js

import mongoose from 'mongoose';
import UserShopAccess from '../../models/UserShopAccess.js';
import JewelryShop from '../../models/Shop.js';
import {
  InsufficientPermissionsError,
  NotFoundError,
  ValidationError,
} from '../../utils/AppError.js';
import { catchAsync } from './errorHandler.js';
import logger from '../../utils/logger.js';

const resolveShopId = req =>
  req.body?.shopId ||
  req.query?.shopId ||
  req.params?.shopId ||
  req.user?.primaryShop;

export const checkShopAccess = catchAsync(async (req, res, next) => {
  try {
const shopId = resolveShopId(req);



    if (!shopId) {
      throw new NotFoundError('Shop ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      throw new ValidationError('Invalid shop ID format');
    }

    if (req.user.role === 'super_admin') {
      const shop = await JewelryShop.findById(shopId);
      if (!shop) {
        throw new NotFoundError('Shop not found');
      }
      req.shop = shop;
      req.userShopAccess = null; 
      return next();
    }

    const shop = await JewelryShop.findById(shopId);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    if (shop.organizationId.toString() !== req.user.organizationId.toString()) {
      throw new InsufficientPermissionsError('Shop does not belong to your organization');
    }

    if (req.user.role === 'org_admin') {
      req.shop = shop;
      req.userShopAccess = null; 
      return next();
    }

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

    if (!userAccess.isActive) {
      throw new InsufficientPermissionsError('Your shop access is currently inactive');
    }

    if (userAccess.accessEndDate && new Date() > userAccess.accessEndDate) {
      throw new InsufficientPermissionsError('Your access to this shop has expired');
    }

    userAccess.updateLastAccess(req.ip).catch(err => {
      logger.error('Failed to update last access', {
        userId: req.user._id,
        shopId,
        error: err.message,
      });
    });

    req.shop = shop;
    req.userShopAccess = userAccess;

    next();
  } catch (error) {
    next(error);
  }
});


export const checkPermission = permission => {
  return catchAsync(async (req, res, next) => {
    try {
      // 1. Super admin and org admin have all permissions - bypass check
      if (req.user.role === 'super_admin' || req.user.role === 'org_admin') {
        return next();
      }

      // 2. Get shopId from multiple sources
const shopId = resolveShopId(req);


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
        const permissionName = permission
          .replace('can', '')
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .toLowerCase();
        throw new InsufficientPermissionsError(`You do not have permission to ${permissionName}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};


export const checkAnyPermission = permissions => {
  return catchAsync(async (req, res, next) => {
    try {
      if (req.user.role === 'super_admin' || req.user.role === 'org_admin') {
        return next();
      }
const shopId = resolveShopId(req);


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

        if (
          !userAccess.isActive ||
          (userAccess.accessEndDate && new Date() > userAccess.accessEndDate)
        ) {
          throw new InsufficientPermissionsError('Your shop access is invalid or expired');
        }

        req.userShopAccess = userAccess;
      }

      if (!userAccess.hasAnyPermission(permissions)) {
        throw new InsufficientPermissionsError('You do not have any of the required permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};

export const checkAllPermissions = permissions => {
  return catchAsync(async (req, res, next) => {
    try {
      if (req.user.role === 'super_admin' || req.user.role === 'org_admin') {
        return next();
      }
const shopId = resolveShopId(req);


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

        if (
          !userAccess.isActive ||
          (userAccess.accessEndDate && new Date() > userAccess.accessEndDate)
        ) {
          throw new InsufficientPermissionsError('Your shop access is invalid or expired');
        }

        req.userShopAccess = userAccess;
      }

      if (!userAccess.hasAllPermissions(permissions)) {
        throw new InsufficientPermissionsError('You do not have all the required permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  });
};

export const verifyShopOwnership = catchAsync(async (req, res, next) => {
  try {
  const shopId = resolveShopId(req);


    if (!shopId) {
      throw new NotFoundError('Shop ID is required');
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    const shop = await JewelryShop.findById(shopId);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    if (shop.adminId && shop.adminId.toString() !== req.user._id.toString()) {
      throw new InsufficientPermissionsError('Only the shop owner can perform this action');
    }

    req.shop = shop;
    next();
  } catch (error) {
    next(error);
  }
});

export const checkMultipleShopsAccess = (shopIdsField = 'shopIds') => {
  return catchAsync(async (req, res, next) => {
    try {
     const shopIds = req.body?.[shopIdsField];


      if (!shopIds || !Array.isArray(shopIds) || shopIds.length === 0) {
        throw new ValidationError(`${shopIdsField} must be a non-empty array`);
      }

      if (req.user.role === 'super_admin') {
        return next();
      }

      const invalidIds = shopIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        throw new ValidationError('One or more shop IDs are invalid');
      }

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

export default {
  checkShopAccess,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  verifyShopOwnership,
  checkMultipleShopsAccess,
};
