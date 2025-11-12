// ============================================================================
// FILE: src/api/shops/shop.controller.js
// Shop Controller - Request handlers for shop operations
// ============================================================================

import { validationResult } from 'express-validator';
import * as shopService from './shop.service.js';
import AppError from '../../utils/AppError.js';
import { catchAsync } from '../middlewares/errorHandler.js';

// ============================================================================
// VALIDATION ERROR HANDLER
// ============================================================================

const handleValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    throw new AppError(`Validation Error: ${errorMessages.join(', ')}`, 400);
  }
};

// ============================================================================
// CREATE SHOP
// ============================================================================

export const createShop = catchAsync(async (req, res, next) => {
  // 1. Validate request
  handleValidationErrors(req);

  // 2. Check if user has permission to create shop
  if (req.user.role !== 'super_admin' && req.user.role !== 'org_admin') {
    throw new AppError('Only Super Admin or Org Admin can create shops', 403);
  }

  // 3. Create shop via service
  const shop = await shopService.createShop(
    req.body,
    req.user._id,
    req.user.role,
    req.user.organizationId
  );

  // 4. Send response
  res.status(201).json({
    success: true,
    message: 'Shop created successfully',
    data: shop,
  });
});

// ============================================================================
// GET ALL SHOPS
// ============================================================================

export const getAllShops = catchAsync(async (req, res, next) => {
  // 1. Validate request
  handleValidationErrors(req);

  // 2. Get shops via service
  const result = await shopService.getAllShops(
    req.query,
    req.user._id,
    req.user.role,
    req.user.organizationId
  );

  // 3. Send response
  res.status(200).json(result);
});

// ============================================================================
// GET SINGLE SHOP BY ID
// ============================================================================

export const getShopById = catchAsync(async (req, res, next) => {
  // 1. Validate request
  handleValidationErrors(req);

  // 2. Get includeSettings flag (only for admins)
  const includeSettings = req.query.includeSettings === 'true';

  // 3. Get shop via service
  const result = await shopService.getShopById(
    req.params.id,
    req.user._id,
    req.user.role,
    includeSettings
  );

  // 4. Send response
  res.status(200).json(result);
});

// ============================================================================
// UPDATE SHOP
// ============================================================================

export const updateShop = catchAsync(async (req, res, next) => {
  // 1. Validate request
  handleValidationErrors(req);

  // 2. Store shop in req for validation middleware
  req.shop = await shopService.getShopById(req.params.id, req.user._id, req.user.role, true);

  // 3. Update shop via service
  const result = await shopService.updateShop(
    req.params.id,
    req.body,
    req.user._id,
    req.user.role
  );

  // 4. Send response
  res.status(200).json({
    success: true,
    message: 'Shop updated successfully',
    data: result.data,
  });
});

// ============================================================================
// DELETE SHOP (SOFT DELETE)
// ============================================================================

export const deleteShop = catchAsync(async (req, res, next) => {
  // 1. Validate request
  handleValidationErrors(req);

  // 2. Delete shop via service
  const result = await shopService.deleteShop(req.params.id, req.user._id, req.user.role);

  // 3. Send response
  res.status(200).json(result);
});

// ============================================================================
// UPDATE SHOP SETTINGS
// ============================================================================

export const updateShopSettings = catchAsync(async (req, res, next) => {
  // 1. Validate request
  handleValidationErrors(req);

  // 2. Update settings via service
  const result = await shopService.updateShopSettings(
    req.params.id,
    req.body.settings,
    req.user._id,
    req.user.role
  );

  // 3. Send response
  res.status(200).json({
    success: true,
    message: 'Shop settings updated successfully',
    data: result.data,
  });
});

// ============================================================================
// UPDATE METAL RATES
// ============================================================================

export const updateMetalRates = catchAsync(async (req, res, next) => {
  // 1. Validate request
  handleValidationErrors(req);

  // 2. Update metal rates via service
  const result = await shopService.updateMetalRates(
    req.params.id,
    req.body,
    req.user._id,
    req.user.role
  );

  // 3. Send response
  res.status(200).json(result);
});

// ============================================================================
// GET SHOP STATISTICS
// ============================================================================

export const getShopStatistics = catchAsync(async (req, res, next) => {
  // 1. Validate request
  handleValidationErrors(req);

  // 2. Get statistics via service
  const result = await shopService.getShopStatistics(
    req.params.id,
    req.user._id,
    req.user.role
  );

  // 3. Send response
  res.status(200).json(result);
});

// ============================================================================
// EXPORT CONTROLLER
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