// ============================================================================
// FILE: src/api/shops/shop.service.js
// Shop Service - Business logic for shop operations
// ============================================================================

import mongoose from 'mongoose';
import JewelryShop from '../../models/Shop.js';
import UserShopAccess from '../../models/UserShopAccess.js';
import Organization from '../../models/Organization.js';
import User from '../../models/User.js';
import ActivityLog from '../../models/ActivityLog.js';
import AppError from '../../utils/AppError.js';
import APIFeatures from '../../utils/apiFeatures.js';

// ============================================================================
// CREATE SHOP
// ============================================================================

export const createShop = async (shopData, userId, userRole, userOrgId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validate organization access
    if (userRole === 'org_admin' && shopData.organizationId) {
      if (shopData.organizationId.toString() !== userOrgId.toString()) {
        throw new AppError('Org Admin can only create shops within their organization', 403);
      }
    }

    // 2. Set organizationId (from logged-in user if not provided)
    if (!shopData.organizationId) {
      if (userRole === 'super_admin') {
        throw new AppError('Super Admin must specify organizationId when creating shop', 400);
      }
      shopData.organizationId = userOrgId;
    }

    // 3. Verify organization exists
    const organization = await Organization.findById(shopData.organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // 4. Check organization can add more shops (subscription limit)
    if (!organization.canAddShop()) {
      throw new AppError('Organization has reached maximum shops limit', 403);
    }

    // 5. Auto-generate shop code
    shopData.code = await JewelryShop.generateCode(shopData.name, shopData.organizationId);

    // 6. Set managerId (default to logged-in user if not provided)
    if (!shopData.managerId) {
      shopData.managerId = userId;
    }

    // 7. Verify manager exists and belongs to same organization
    const manager = await User.findById(shopData.managerId);
    if (!manager) {
      throw new AppError('Manager not found', 404);
    }

    if (
      userRole !== 'super_admin' &&
      manager.organizationId?.toString() !== shopData.organizationId.toString()
    ) {
      throw new AppError('Manager must belong to the same organization', 400);
    }

    // 8. Copy settings from existing shop (if requested)
    if (shopData.copySettingsFromShopId) {
      const sourceShop = await JewelryShop.findOne({
        _id: shopData.copySettingsFromShopId,
        organizationId: shopData.organizationId,
      });

      if (!sourceShop) {
        throw new AppError('Source shop not found or does not belong to same organization', 404);
      }

      // Copy settings, features, businessHours, etc.
      shopData.settings = sourceShop.settings;
      shopData.features = sourceShop.features;
      shopData.businessHours = sourceShop.businessHours;
    }

    // 9. Set audit fields
    shopData.createdBy = userId;
    shopData.openingDate = new Date();

    // 10. Create shop
    const shop = await JewelryShop.create([shopData], { session });

    // 11. Create UserShopAccess for manager (with admin permissions)
    await UserShopAccess.create(
      [
        {
          userId: shopData.managerId,
          shopId: shop[0]._id,
          organizationId: shopData.organizationId,
          role: 'shop_admin',
          permissions: UserShopAccess.getDefaultPermissions('shop_admin'),
          assignedBy: userId,
          isActive: true,
        },
      ],
      { session }
    );

    // 12. Update manager's primaryShop if not set
    if (!manager.primaryShop) {
      manager.primaryShop = shop[0]._id;
      await manager.save({ session });
    }

    // 13. Update organization usage statistics
    organization.usage.totalShops += 1;
    organization.usage.lastUpdated = new Date();
    await organization.save({ session });

    // 14. Log activity
    await ActivityLog.create(
      [
        {
          userId,
          organizationId: shopData.organizationId,
          shopId: shop[0]._id,
          action: 'create',
          module: 'shop',
          description: `Shop "${shop[0].name}" created successfully`,
          level: 'info',
          status: 'success',
          metadata: {
            shopId: shop[0]._id,
            shopCode: shop[0].code,
            shopName: shop[0].name,
            managerId: shopData.managerId,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // 15. Populate and return
    const populatedShop = await JewelryShop.findById(shop[0]._id)
      .populate('organizationId', 'name displayName')
      .populate('managerId', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName');

    return populatedShop;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ============================================================================
// GET ALL SHOPS (with filtering, pagination, sorting)
// ============================================================================

export const getAllShops = async (queryParams, userId, userRole, userOrgId) => {
  // 1. Build base query based on user role
  let baseQuery = {};

  if (userRole === 'super_admin') {
    // Super admin can see all shops
    baseQuery = {};
  } else if (userRole === 'org_admin') {
    // Org admin can see only their organization's shops
    baseQuery = { organizationId: userOrgId };
  } else {
    // Shop admin/manager/staff can see only their assigned shops
    const userAccess = await UserShopAccess.find({
      userId,
      isActive: true,
      deletedAt: null,
      revokedAt: null,
    }).select('shopId');

    const accessibleShopIds = userAccess.map((access) => access.shopId);

    if (accessibleShopIds.length === 0) {
      return {
        success: true,
        results: 0,
        data: [],
        pagination: null,
      };
    }

    baseQuery = { _id: { $in: accessibleShopIds } };
  }

  // 2. Apply API Features (filtering, sorting, pagination)
  const features = new APIFeatures(JewelryShop.find(baseQuery), queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // 3. Execute query
  const shops = await features.query
    .populate('organizationId', 'name displayName')
    .populate('managerId', 'firstName lastName email phone')
    .lean();

  // 4. Get total count for pagination
  const totalDocs = await JewelryShop.countDocuments({
    ...baseQuery,
    ...features.query.getFilter(),
  });

  // 5. Calculate pagination metadata
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 10;
  const totalPages = Math.ceil(totalDocs / limit);

  return {
    success: true,
    results: shops.length,
    data: shops,
    pagination: {
      totalDocs,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  };
};

// ============================================================================
// GET SINGLE SHOP BY ID
// ============================================================================

export const getShopById = async (shopId, userId, userRole, includeSettings = false) => {
  // 1. Find shop
  const shop = await JewelryShop.findById(shopId)
    .populate('organizationId', 'name displayName email phone')
    .populate('managerId', 'firstName lastName email phone profileImage')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  // 2. Check access (this should be done in middleware, but double-check)
  if (userRole !== 'super_admin') {
    const hasAccess = await UserShopAccess.findOne({
      userId,
      shopId,
      isActive: true,
      deletedAt: null,
      revokedAt: null,
    });

    if (!hasAccess && userRole !== 'org_admin') {
      throw new AppError('You do not have access to this shop', 403);
    }

    // Org admin check
    if (userRole === 'org_admin' && shop.organizationId._id.toString() !== hasAccess.organizationId.toString()) {
      throw new AppError('You do not have access to this shop', 403);
    }
  }

  // 3. Convert to object and optionally exclude sensitive settings
  const shopObject = shop.toObject();

  if (!includeSettings) {
    // Remove sensitive settings for non-admin users
    const userAccess = await UserShopAccess.findOne({
      userId,
      shopId,
      isActive: true,
    });

    if (userAccess && userAccess.role !== 'shop_admin' && userRole !== 'super_admin') {
      delete shopObject.settings.metalRates;
      delete shopObject.bankDetails;
      delete shopObject.upiDetails;
      delete shopObject.compliance;
    }
  }

  return {
    success: true,
    data: shopObject,
  };
};

// ============================================================================
// UPDATE SHOP
// ============================================================================

export const updateShop = async (shopId, updateData, userId, userRole) => {
  // 1. Find shop
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  // 2. Check permission
  if (userRole !== 'super_admin') {
    const userAccess = await UserShopAccess.findOne({
      userId,
      shopId,
      isActive: true,
      deletedAt: null,
      revokedAt: null,
    });

    if (!userAccess || !userAccess.hasPermission('canManageShopSettings')) {
      throw new AppError('You do not have permission to update shop settings', 403);
    }
  }

  // 3. Restrict certain fields based on shop verification status
  if (shop.isVerified && userRole !== 'super_admin') {
    const restrictedFields = ['gstNumber', 'panNumber'];
    restrictedFields.forEach((field) => {
      if (updateData[field]) {
        throw new AppError(`Only super admin can update ${field} of verified shop`, 403);
      }
    });
  }

  // 4. Prevent updating code, organizationId, statistics, etc.
  const protectedFields = ['code', 'organizationId', 'statistics', 'createdBy', 'createdAt'];
  protectedFields.forEach((field) => delete updateData[field]);

  // 5. Update shop
  Object.assign(shop, updateData);
  shop.updatedBy = userId;
  await shop.save();

  // 6. Log activity
  await ActivityLog.create({
    userId,
    organizationId: shop.organizationId,
    shopId: shop._id,
    action: 'update',
    module: 'shop',
    description: `Shop "${shop.name}" updated`,
    level: 'info',
    status: 'success',
    metadata: {
      updatedFields: Object.keys(updateData),
    },
  });

  // 7. Return updated shop
  const updatedShop = await JewelryShop.findById(shop._id)
    .populate('organizationId', 'name displayName')
    .populate('managerId', 'firstName lastName email phone')
    .populate('updatedBy', 'firstName lastName');

  return {
    success: true,
    data: updatedShop,
  };
};

// ============================================================================
// SOFT DELETE SHOP
// ============================================================================

export const deleteShop = async (shopId, userId, userRole) => {
  // 1. Find shop
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  // 2. Only super_admin or org_admin can delete shops
  if (userRole !== 'super_admin' && userRole !== 'org_admin') {
    throw new AppError('Only Super Admin or Org Admin can delete shops', 403);
  }

  // 3. Soft delete shop
  await shop.softDelete();

  // 4. Deactivate all UserShopAccess entries for this shop
  await UserShopAccess.updateMany(
    { shopId, deletedAt: null },
    {
      deletedAt: new Date(),
      isActive: false,
      revokedAt: new Date(),
      revokedBy: userId,
      revocationReason: 'Shop deleted',
    }
  );

  // 5. Update organization statistics
  const organization = await Organization.findById(shop.organizationId);
  if (organization) {
    organization.usage.totalShops = Math.max(0, organization.usage.totalShops - 1);
    organization.usage.lastUpdated = new Date();
    await organization.save();
  }

  // 6. Log activity
  await ActivityLog.create({
    userId,
    organizationId: shop.organizationId,
    shopId: shop._id,
    action: 'delete',
    module: 'shop',
    description: `Shop "${shop.name}" deleted`,
    level: 'warn',
    status: 'success',
  });

  return {
    success: true,
    message: 'Shop deleted successfully',
  };
};

// ============================================================================
// UPDATE SHOP SETTINGS
// ============================================================================

export const updateShopSettings = async (shopId, settings, userId, userRole) => {
  // 1. Find shop
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  // 2. Check permission
  if (userRole !== 'super_admin') {
    const userAccess = await UserShopAccess.findOne({
      userId,
      shopId,
      isActive: true,
    });

    if (!userAccess || !userAccess.hasPermission('canManageShopSettings')) {
      throw new AppError('You do not have permission to update shop settings', 403);
    }
  }

  // 3. Update settings
  Object.assign(shop.settings, settings);
  shop.updatedBy = userId;
  await shop.save();

  // 4. Log activity
  await ActivityLog.create({
    userId,
    organizationId: shop.organizationId,
    shopId: shop._id,
    action: 'update_settings',
    module: 'shop',
    description: 'Shop settings updated',
    level: 'info',
    status: 'success',
  });

  return {
    success: true,
    data: shop,
  };
};

// ============================================================================
// UPDATE METAL RATES
// ============================================================================

export const updateMetalRates = async (shopId, rates, userId, userRole) => {
  // 1. Find shop
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  // 2. Check permission
  if (userRole !== 'super_admin') {
    const userAccess = await UserShopAccess.findOne({
      userId,
      shopId,
      isActive: true,
    });

    if (!userAccess || !userAccess.hasPermission('canUpdateMetalRates')) {
      throw new AppError('You do not have permission to update metal rates', 403);
    }
  }

  // 3. Update metal rates
  await shop.updateMetalRates(rates, userId);

  // 4. Log activity
  await ActivityLog.create({
    userId,
    organizationId: shop.organizationId,
    shopId: shop._id,
    action: 'update_metal_rates',
    module: 'shop',
    description: 'Metal rates updated',
    level: 'info',
    status: 'success',
    metadata: rates,
  });

  return {
    success: true,
    data: shop,
    message: 'Metal rates updated successfully',
  };
};

// ============================================================================
// GET SHOP STATISTICS
// ============================================================================

export const getShopStatistics = async (shopId, userId, userRole) => {
  // 1. Find shop
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  // 2. Check access
  if (userRole !== 'super_admin') {
    const hasAccess = await UserShopAccess.findOne({
      userId,
      shopId,
      isActive: true,
    });

    if (!hasAccess) {
      throw new AppError('You do not have access to this shop', 403);
    }
  }

  // 3. Update statistics (optional - can be done via cron job)
  await shop.updateStatistics();

  return {
    success: true,
    data: shop.statistics,
  };
};

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export default {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop,
  updateShopSettings,
  updateMetalRates,
getShopStatistics,
};