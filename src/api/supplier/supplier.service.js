// FILE: src/api/supplier/supplier.service.js
// Supplier Service - Business Logic Layer (Functional Implementation)

import Supplier from '../../models/Supplier.js';
import Shop from '../../models/Shop.js';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/AppError.js';
import logger from '../../utils/logger.js';
import catchAsync from '../../utils/catchAsync.js';

/**
 * Create a new supplier
 */
export const createSupplier = catchAsync(async (supplierData, userId, organizationId, shopId) => {
  // Verify shop exists and belongs to organization
  const shop = await Shop.findOne({ _id: shopId, organizationId });
  if (!shop) {
    throw new NotFoundError('Shop not found or does not belong to your organization');
  }

  // Generate supplier code if not provided
  if (!supplierData.supplierCode) {
    supplierData.supplierCode = await Supplier.generateSupplierCode(shopId);
  }

  // Check for duplicate supplier code
  const existingSupplier = await Supplier.findOne({
    shopId,
    supplierCode: supplierData.supplierCode,
    deletedAt: null,
  });

  if (existingSupplier) {
    throw new ConflictError('Supplier code already exists in this shop');
  }

  // Check for duplicate GST if provided
  if (supplierData.gstNumber) {
    const gstExists = await Supplier.findOne({
      shopId,
      gstNumber: supplierData.gstNumber,
      deletedAt: null,
    });

    if (gstExists) {
      throw new ConflictError('Supplier with this GST number already exists');
    }
  }

  // Create supplier
  const supplier = await Supplier.create({
    ...supplierData,
    organizationId,
    shopId,
    createdBy: userId,
    updatedBy: userId,
  });

  logger.info('Supplier created successfully', {
    supplierId: supplier._id,
    supplierCode: supplier.supplierCode,
    userId,
    shopId,
  });

  return supplier;
});

/**
 * Get all suppliers for a shop with filters and pagination
 */
export const getSuppliers = catchAsync(
  async (shopId, organizationId, filters = {}, pagination = {}) => {
    const {
      page = 1,
      limit = 20,
      search = '',
      supplierType,
      supplierCategory,
      isActive,
      isPreferred,
      isBlacklisted,
      sort = '-createdAt',
    } = { ...filters, ...pagination };

    // Build query
    const query = {
      shopId,
      organizationId,
      deletedAt: null,
    };

    // Apply filters
    if (supplierType) query.supplierType = supplierType;
    if (supplierCategory) query.supplierCategory = supplierCategory;
    if (isActive !== undefined) query.isActive = isActive;
    if (isPreferred !== undefined) query.isPreferred = isPreferred;
    if (isBlacklisted !== undefined) query.isBlacklisted = isBlacklisted;

    // Search
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { supplierCode: { $regex: search, $options: 'i' } },
        { 'contactPerson.firstName': { $regex: search, $options: 'i' } },
        { 'contactPerson.phone': { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Count total documents
    const total = await Supplier.countDocuments(query);

    // Execute query with pagination
    const suppliers = await Supplier.find(query)
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit)
      .select('-__v')
      .lean();

    return {
      suppliers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }
);

/**
 * Get supplier by ID
 */
export const getSupplierById = catchAsync(async (supplierId, shopId, organizationId) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    shopId,
    organizationId,
    deletedAt: null,
  }).populate('createdBy updatedBy', 'firstName lastName email');

  if (!supplier) {
    throw new NotFoundError('Supplier not found');
  }

  return supplier;
});

/**
 * Update supplier
 */
export const updateSupplier = catchAsync(
  async (supplierId, updateData, userId, shopId, organizationId) => {
    const supplier = await Supplier.findOne({
      _id: supplierId,
      shopId,
      organizationId,
      deletedAt: null,
    });

    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    // Check for duplicate supplier code if being updated
    if (updateData.supplierCode && updateData.supplierCode !== supplier.supplierCode) {
      const codeExists = await Supplier.findOne({
        shopId,
        supplierCode: updateData.supplierCode,
        _id: { $ne: supplierId },
        deletedAt: null,
      });

      if (codeExists) {
        throw new ConflictError('Supplier code already exists');
      }
    }

    // Check for duplicate GST if being updated
    if (updateData.gstNumber && updateData.gstNumber !== supplier.gstNumber) {
      const gstExists = await Supplier.findOne({
        shopId,
        gstNumber: updateData.gstNumber,
        _id: { $ne: supplierId },
        deletedAt: null,
      });

      if (gstExists) {
        throw new ConflictError('Supplier with this GST number already exists');
      }
    }

    // Update supplier
    Object.assign(supplier, updateData);
    supplier.updatedBy = userId;
    await supplier.save();

    logger.info('Supplier updated successfully', {
      supplierId,
      userId,
      shopId,
    });

    return supplier;
  }
);

/**
 * Soft delete supplier
 */
export const deleteSupplier = catchAsync(async (supplierId, userId, shopId, organizationId) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!supplier) {
    throw new NotFoundError('Supplier not found');
  }

  await supplier.softDelete();

  logger.info('Supplier deleted successfully', {
    supplierId,
    userId,
    shopId,
  });

  return { message: 'Supplier deleted successfully' };
});

/**
 * Restore soft-deleted supplier
 */
export const restoreSupplier = catchAsync(async (supplierId, userId, shopId, organizationId) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    shopId,
    organizationId,
  }).setOptions({ includeDeleted: true });

  if (!supplier) {
    throw new NotFoundError('Supplier not found');
  }

  if (!supplier.deletedAt) {
    throw new ValidationError('Supplier is not deleted');
  }

  await supplier.restore();

  logger.info('Supplier restored successfully', {
    supplierId,
    userId,
    shopId,
  });

  return supplier;
});

/**
 * Update supplier rating
 */
export const updateRating = catchAsync(
  async (supplierId, ratings, userId, shopId, organizationId) => {
    const supplier = await Supplier.findOne({
      _id: supplierId,
      shopId,
      organizationId,
      deletedAt: null,
    });

    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    const { qualityRating, deliveryRating, priceRating } = ratings;

    await supplier.updateRating(qualityRating, deliveryRating, priceRating);

    logger.info('Supplier rating updated', {
      supplierId,
      ratings,
      userId,
    });

    return supplier;
  }
);

/**
 * Blacklist supplier
 */
export const blacklistSupplier = catchAsync(
  async (supplierId, reason, userId, shopId, organizationId) => {
    const supplier = await Supplier.findOne({
      _id: supplierId,
      shopId,
      organizationId,
      deletedAt: null,
    });

    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    if (supplier.isBlacklisted) {
      throw new ValidationError('Supplier is already blacklisted');
    }

    await supplier.blacklist(reason);

    logger.warn('Supplier blacklisted', {
      supplierId,
      reason,
      userId,
    });

    return supplier;
  }
);

/**
 * Remove from blacklist
 */
export const removeBlacklist = catchAsync(async (supplierId, userId, shopId, organizationId) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!supplier) {
    throw new NotFoundError('Supplier not found');
  }

  if (!supplier.isBlacklisted) {
    throw new ValidationError('Supplier is not blacklisted');
  }

  await supplier.removeBlacklist();

  logger.info('Supplier removed from blacklist', {
    supplierId,
    userId,
  });

  return supplier;
});

/**
 * Mark as preferred supplier
 */
export const markAsPreferred = catchAsync(async (supplierId, userId, shopId, organizationId) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!supplier) {
    throw new NotFoundError('Supplier not found');
  }

  await supplier.markAsPreferred();

  logger.info('Supplier marked as preferred', {
    supplierId,
    userId,
  });

  return supplier;
});

/**
 * Remove from preferred suppliers
 */
export const removePreferred = catchAsync(async (supplierId, userId, shopId, organizationId) => {
  const supplier = await Supplier.findOne({
    _id: supplierId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!supplier) {
    throw new NotFoundError('Supplier not found');
  }

  await supplier.removePreferred();

  logger.info('Supplier removed from preferred', {
    supplierId,
    userId,
  });

  return supplier;
});

/**
 * Update supplier balance
 */
export const updateBalance = catchAsync(
  async (supplierId, amount, type, note, userId, shopId, organizationId) => {
    const supplier = await Supplier.findOne({
      _id: supplierId,
      shopId,
      organizationId,
      deletedAt: null,
    });

    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    // Calculate balance based on type
    let balanceChange = 0;
    if (type === 'payment') {
      balanceChange = -Math.abs(amount); // Payment reduces due
    } else if (type === 'purchase') {
      balanceChange = Math.abs(amount); // Purchase increases due
    } else {
      balanceChange = amount; // Adjustment can be + or -
    }

    await supplier.updateBalance(balanceChange);

    logger.info('Supplier balance updated', {
      supplierId,
      amount: balanceChange,
      type,
      userId,
    });

    return supplier;
  }
);

/**
 * Get supplier statistics
 */
export const getSupplierStats = catchAsync(async (shopId, organizationId) => {
  const stats = await Supplier.aggregate([
    {
      $match: {
        shopId,
        organizationId,
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: null,
        totalSuppliers: { $sum: 1 },
        activeSuppliers: {
          $sum: { $cond: ['$isActive', 1, 0] },
        },
        preferredSuppliers: {
          $sum: { $cond: ['$isPreferred', 1, 0] },
        },
        blacklistedSuppliers: {
          $sum: { $cond: ['$isBlacklisted', 1, 0] },
        },
        totalPurchases: { $sum: '$totalPurchases' },
        totalDue: { $sum: '$totalDue' },
        totalAdvance: { $sum: '$advancePayment' },
      },
    },
  ]);

  return (
    stats[0] || {
      totalSuppliers: 0,
      activeSuppliers: 0,
      preferredSuppliers: 0,
      blacklistedSuppliers: 0,
      totalPurchases: 0,
      totalDue: 0,
      totalAdvance: 0,
    }
  );
});

/**
 * Get top suppliers by purchase amount
 */
export const getTopSuppliers = catchAsync(async (shopId, organizationId, limit = 10) => {
  const topSuppliers = await Supplier.findTopSuppliers(shopId, limit);
  return topSuppliers;
});

// Default export object for backward compatibility
export default {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
  updateRating,
  blacklistSupplier,
  removeBlacklist,
  markAsPreferred,
  removePreferred,
  updateBalance,
  getSupplierStats,
  getTopSuppliers,
};
