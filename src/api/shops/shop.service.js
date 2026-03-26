// FILE: src/api/shops/shop.service.js

import mongoose from 'mongoose';
import JewelryShop from '../../models/Shop.js';
import UserShopAccess from '../../models/UserShopAccess.js';
import Organization from '../../models/Organization.js';
import User from '../../models/User.js';
import ActivityLog from '../../models/ActivityLog.js';
import AppError from '../../utils/AppError.js';
import APIFeatures from '../../utils/apiFeatures.js';


export const createShop = async (shopData, userId, userRole, userOrgId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (userRole === 'org_admin' && shopData.organizationId) {
      if (shopData.organizationId.toString() !== userOrgId.toString()) {
        throw new AppError('Org Admin can only create shops within their organization', 403);
      }
    }

    if (!shopData.organizationId) {
      if (userRole === 'super_admin') {
        throw new AppError('Super Admin must specify organizationId when creating shop', 400);
      }
      shopData.organizationId = userOrgId;
    }

    const organization = await Organization.findById(shopData.organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    if (!organization.canAddShop()) {
      throw new AppError('Organization has reached maximum shops limit', 403);
    }

    shopData.code = await JewelryShop.generateCode(shopData.name, shopData.organizationId);

    if (!shopData.managerId) {
      shopData.managerId = userId;
    }

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

    if (shopData.copySettingsFromShopId) {
      const sourceShop = await JewelryShop.findOne({
        _id: shopData.copySettingsFromShopId,
        organizationId: shopData.organizationId,
      });

      if (!sourceShop) {
        throw new AppError('Source shop not found or does not belong to same organization', 404);
      }

      shopData.settings = sourceShop.settings;
      shopData.features = sourceShop.features;
      shopData.businessHours = sourceShop.businessHours;
    }

    shopData.createdBy = userId;
    shopData.openingDate = new Date();

    const shop = await JewelryShop.create([shopData], { session });

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

    if (!manager.primaryShop) {
      manager.primaryShop = shop[0]._id;
      await manager.save({ session });
    }

    organization.usage.totalShops += 1;
    organization.usage.lastUpdated = new Date();
    await organization.save({ session });

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


export const getAllShops = async (queryParams, userId, userRole, userOrgId) => {
  let baseQuery = {};

  if (userRole === 'super_admin') {
    baseQuery = {};
  } else if (userRole === 'org_admin') {
    baseQuery = { organizationId: userOrgId };
  } else {
    const userAccess = await UserShopAccess.find({
      userId,
      isActive: true,
      deletedAt: null,
      revokedAt: null,
    }).select('shopId');

    const accessibleShopIds = userAccess.map(access => access.shopId);

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

  const features = new APIFeatures(JewelryShop.find(baseQuery), queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const shops = await features.query
    .populate('organizationId', 'name displayName')
    .populate('managerId', 'firstName lastName email phone')
    .lean();

  const totalDocs = await JewelryShop.countDocuments({
    ...baseQuery,
    ...features.query.getFilter(),
  });

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


export const getShopById = async (shopId, userId, userRole, includeSettings = false) => {
  const shop = await JewelryShop.findById(shopId)
    .populate('organizationId', 'name displayName email phone')
    .populate('managerId', 'firstName lastName email phone profileImage')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

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

    if (
      userRole === 'org_admin' &&
      shop.organizationId._id.toString() !== hasAccess.organizationId.toString()
    ) {
      throw new AppError('You do not have access to this shop', 403);
    }
  }

  const shopObject = shop.toObject();

  if (!includeSettings) {
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


export const updateShop = async (shopId, updateData, userId, userRole) => {
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

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

  if (shop.isVerified && userRole !== 'super_admin') {
    const restrictedFields = ['gstNumber', 'panNumber'];
    restrictedFields.forEach(field => {
      if (updateData[field]) {
        throw new AppError(`Only super admin can update ${field} of verified shop`, 403);
      }
    });
  }

  const protectedFields = ['code', 'organizationId', 'statistics', 'createdBy', 'createdAt'];
  protectedFields.forEach(field => delete updateData[field]);

  Object.assign(shop, updateData);
  shop.updatedBy = userId;
  await shop.save();

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

  const updatedShop = await JewelryShop.findById(shop._id)
    .populate('organizationId', 'name displayName')
    .populate('managerId', 'firstName lastName email phone')
    .populate('updatedBy', 'firstName lastName');

  return {
    success: true,
    data: updatedShop,
  };
};


export const deleteShop = async (shopId, userId, userRole) => {
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  if (userRole !== 'super_admin' && userRole !== 'org_admin') {
    throw new AppError('Only Super Admin or Org Admin can delete shops', 403);
  }

  await shop.softDelete();

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

  const organization = await Organization.findById(shop.organizationId);
  if (organization) {
    organization.usage.totalShops = Math.max(0, organization.usage.totalShops - 1);
    organization.usage.lastUpdated = new Date();
    await organization.save();
  }

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


export const updateShopSettings = async (shopId, settings, userId, userRole) => {
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

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

  Object.assign(shop.settings, settings);
  shop.updatedBy = userId;
  await shop.save();
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


export const getShopStatistics = async (shopId, userId, userRole) => {
  const shop = await JewelryShop.findById(shopId);
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

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

  await shop.updateStatistics();

  return {
    success: true,
    data: shop.statistics,
  };
};
export const getShopActivityLogs = async (shopId, queryParams, userId, userRole) => {
  const shop = await JewelryShop.findById(shopId);
  if (!shop) throw new AppError('Shop not found', 404);

  if (userRole !== 'super_admin' && userRole !== 'org_admin') {
    const hasAccess = await UserShopAccess.findOne({
      userId,
      shopId,
      isActive: true,
      deletedAt: null,
      revokedAt: null,
    });

    if (!hasAccess) throw new AppError('You do not have access to this shop', 403);

    if (!['shop_admin'].includes(hasAccess.role)) {
      throw new AppError('Only Shop Admin or above can view activity logs', 403);
    }
  }

  const {
    page = 1,
    limit = 20,
    search,
    action,
    module,
    status,
    level,
    userId: filterUserId,
    startDate,
    endDate,
    sort = '-createdAt',
  } = queryParams;

  const query = { shopId };

  if (action) query.action = action;
  if (module) query.module = module;
  if (status) query.status = status;
  if (level) query.level = level;
  if (filterUserId) query.userId = filterUserId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { module: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const [logs, totalDocs] = await Promise.all([
    ActivityLog.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'firstName lastName email role profileImage')
      .lean(),
    ActivityLog.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalDocs / limitNum);

  return {
    success: true,
    results: logs.length,
    data: logs,
    pagination: {
      totalDocs,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
    },
  };
};

export default {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop,
  updateShopSettings,
  getShopStatistics,
  getShopActivityLogs
};
