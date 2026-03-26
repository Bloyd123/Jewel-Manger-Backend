// FILE: src/api/shops/shop.controller.js

import { validationResult } from 'express-validator';
import * as shopService from './shop.service.js';
import AppError from '../../utils/AppError.js';
import { catchAsync } from '../middlewares/errorHandler.js';


const handleValidationErrors = req => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    throw new AppError(`Validation Error: ${errorMessages.join(', ')}`, 400);
  }
};


export const createShop = catchAsync(async (req, res, next) => {
  handleValidationErrors(req);

  if (req.user.role !== 'super_admin' && req.user.role !== 'org_admin') {
    throw new AppError('Only Super Admin or Org Admin can create shops', 403);
  }

  const shop = await shopService.createShop(
    req.body,
    req.user._id,
    req.user.role,
    req.user.organizationId
  );

  res.status(201).json({
    success: true,
    message: 'Shop created successfully',
    data: shop,
  });
});


export const getAllShops = catchAsync(async (req, res, next) => {
  handleValidationErrors(req);

  const result = await shopService.getAllShops(
    req.query,
    req.user._id,
    req.user.role,
    req.user.organizationId
  );

  res.status(200).json(result);
});


export const getShopById = catchAsync(async (req, res, next) => {
  handleValidationErrors(req);

  const includeSettings = req.query.includeSettings === 'true';

  const result = await shopService.getShopById(
    req.params.id,
    req.user._id,
    req.user.role,
    includeSettings
  );

  res.status(200).json(result);
});


export const updateShop = catchAsync(async (req, res, next) => {
  handleValidationErrors(req);

  req.shop = await shopService.getShopById(req.params.id, req.user._id, req.user.role, true);

  const result = await shopService.updateShop(req.params.id, req.body, req.user._id, req.user.role);

  res.status(200).json({
    success: true,
    message: 'Shop updated successfully',
    data: result.data,
  });
});


export const deleteShop = catchAsync(async (req, res, next) => {
  handleValidationErrors(req);

  const result = await shopService.deleteShop(req.params.id, req.user._id, req.user.role);

  res.status(200).json(result);
});


export const updateShopSettings = catchAsync(async (req, res, next) => {
  handleValidationErrors(req);

  const result = await shopService.updateShopSettings(
    req.params.id,
    req.body.settings,
    req.user._id,
    req.user.role
  );

  res.status(200).json({
    success: true,
    message: 'Shop settings updated successfully',
    data: result.data,
  });
});



export const getShopStatistics = catchAsync(async (req, res, next) => {
  handleValidationErrors(req);

  const result = await shopService.getShopStatistics(req.params.id, req.user._id, req.user.role);

  res.status(200).json(result);
});
export const getShopActivityLogs = catchAsync(async (req, res, next) => {
  handleValidationErrors(req);

  const result = await shopService.getShopActivityLogs(
    req.params.id,
    req.query,
    req.user._id,
    req.user.role
  );

  res.status(200).json(result);
});

export default {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop,
  updateShopSettings,
  getShopStatistics,
  getShopActivityLogs,
};
