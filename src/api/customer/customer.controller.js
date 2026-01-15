// FILE: src/api/customer/customer.controller.js
// Customer Controller - Compatible with existing sendResponse.js

import { validationResult } from 'express-validator';
import * as customerService from './customer.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  sendValidationError,
  sendInternalError,
} from '../../utils/sendResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import logger from '../../utils/logger.js';
import eventLogger from '../../utils/eventLogger.js';

/**
 * Create a new customer
 * POST /api/v1/shops/:shopId/customers
 */
export const createCustomer = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId } = req.params;
  const customerData = req.body;

  // Create customer
  const customer = await customerService.createCustomer(shopId, customerData, req.user._id);

  // Log activity
  await eventLogger.logActivity({
    userId: req.user._id,
    organizationId: req.user.organizationId,
    shopId,
    action: 'create',
    module: 'customer',
    description: `Created customer: ${customer.fullName}`,
    level: 'info',
    status: 'success',
    metadata: {
      customerId: customer._id,
      customerCode: customer.customerCode,
      phone: customer.phone,
      customerType: customer.customerType,
    },
    ipAddress: req.ip,
  });

  logger.info('Customer created successfully', {
    customerId: customer._id,
    customerCode: customer.customerCode,
    userId: req.user._id,
    shopId,
  });

  return sendCreated(res, 'Customer created successfully', {
    customer: {
      _id: customer._id,
      customerCode: customer.customerCode,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      customerType: customer.customerType,
      membershipTier: customer.membershipTier,
      loyaltyPoints: customer.loyaltyPoints,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
    },
  });
});

/**
 * Get all customers with filters and pagination
 * GET /api/v1/shops/:shopId/customers
 */
export const getCustomers = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId } = req.params;
  const {
    page = 1,
    limit = 20,
    search,
    customerType,
    membershipTier,
    isActive,
    hasBalance,
    vipOnly,
    startDate,
    endDate,
    sort = '-createdAt',
  } = req.query;

  const filters = {
    search,
    customerType,
    membershipTier,
    isActive,
    hasBalance: hasBalance === 'true',
    vipOnly: vipOnly === 'true',
    startDate,
    endDate,
  };

  const paginationOptions = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
  };

  // Get customers
  const result = await customerService.getCustomers(shopId, filters, paginationOptions);

  // Get summary statistics
  const summary = await customerService.getCustomerStatistics(shopId);

  return sendSuccess(
    res,
    200,
    'Customers fetched successfully',
    {
      customers: result.data,
      summary,
    },
    {
      pagination: result.pagination,
    }
  );
});

/**
 * Get single customer by ID
 * GET /api/v1/shops/:shopId/customers/:customerId
 */
export const getCustomerById = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, customerId } = req.params;

  const customer = await customerService.getCustomerById(customerId, shopId);

  return sendSuccess(res, 200, 'Customer fetched successfully', { customer });
});

/**
 * Search customer by phone/email/code
 * GET /api/v1/shops/:shopId/customers/search
 */
export const searchCustomer = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId } = req.params;
  const { phone, email, customerCode, search } = req.query;

  if (!phone && !email && !customerCode && !search) {
    return sendBadRequest(res, 'Please provide phone, email, customerCode, or search query');
  }

  const customer = await customerService.searchCustomer(shopId, {
    phone,
    email,
    customerCode,
    search,
  });

  if (!customer) {
    return sendSuccess(res, 200, 'Customer not found', {
      exists: false,
      customer: null,
    });
  }

  return sendSuccess(res, 200, 'Customer found', {
    exists: true,
    customer,
  });
});

/**
 * Update customer
 * PUT /api/v1/shops/:shopId/customers/:customerId
 */
export const updateCustomer = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, customerId } = req.params;
  const updateData = req.body;

  const { customer, changes } = await customerService.updateCustomer(
    customerId,
    shopId,
    updateData,
    req.user._id
  );

  // Log activity
  await eventLogger.logActivity({
    userId: req.user._id,
    organizationId: req.user.organizationId,
    shopId,
    action: 'update',
    module: 'customer',
    description: `Updated customer: ${customer.fullName}`,
    level: 'info',
    status: 'success',
    metadata: {
      customerId: customer._id,
      customerCode: customer.customerCode,
      changes,
    },
    ipAddress: req.ip,
  });

  logger.info('Customer updated successfully', {
    customerId: customer._id,
    userId: req.user._id,
    changes,
  });

  return sendSuccess(res, 200, 'Customer updated successfully', { customer });
});

/**
 * Delete customer (soft delete)
 * DELETE /api/v1/shops/:shopId/customers/:customerId
 */
export const deleteCustomer = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, customerId } = req.params;

  const customer = await customerService.deleteCustomer(customerId, shopId, req.user._id);

  // Log activity
  await eventLogger.logActivity({
    userId: req.user._id,
    organizationId: req.user.organizationId,
    shopId,
    action: 'delete',
    module: 'customer',
    description: `Deleted customer: ${customer.fullName}`,
    level: 'warn',
    status: 'success',
    metadata: {
      customerId: customer._id,
      customerCode: customer.customerCode,
    },
    ipAddress: req.ip,
  });

  return sendSuccess(res, 200, 'Customer deleted successfully', { customer });
});

/**
 * Blacklist customer
 * PATCH /api/v1/shops/:shopId/customers/:customerId/blacklist
 */
export const blacklistCustomer = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, customerId } = req.params;
  const { reason } = req.body;

  const customer = await customerService.blacklistCustomer(
    customerId,
    shopId,
    reason,
    req.user._id
  );

  // Log security event
  await eventLogger.logActivity({
    userId: req.user._id,
    organizationId: req.user.organizationId,
    shopId,
    action: 'blacklist',
    module: 'customer',
    description: `Blacklisted customer: ${customer.fullName}`,
    level: 'warn',
    status: 'success',
    metadata: {
      customerId: customer._id,
      customerCode: customer.customerCode,
      reason,
      outstandingBalance: customer.totalDue,
    },
    ipAddress: req.ip,
  });

  return sendSuccess(res, 200, 'Customer blacklisted successfully', { customer });
});

/**
 * Remove blacklist
 * PATCH /api/v1/shops/:shopId/customers/:customerId/unblacklist
 */
export const removeBlacklist = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, customerId } = req.params;

  const customer = await customerService.removeBlacklist(customerId, shopId, req.user._id);

  // Log activity
  await eventLogger.logActivity({
    userId: req.user._id,
    organizationId: req.user.organizationId,
    shopId,
    action: 'unblacklist',
    module: 'customer',
    description: `Removed blacklist from customer: ${customer.fullName}`,
    level: 'info',
    status: 'success',
    metadata: {
      customerId: customer._id,
      customerCode: customer.customerCode,
    },
    ipAddress: req.ip,
  });

  return sendSuccess(res, 200, 'Blacklist removed successfully', { customer });
});

/**
 * Add loyalty points
 * POST /api/v1/shops/:shopId/customers/:customerId/loyalty/add
 */
export const addLoyaltyPoints = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, customerId } = req.params;
  const { points, reason } = req.body;

  const customer = await customerService.addLoyaltyPoints(customerId, shopId, points, reason);

  return sendSuccess(res, 200, `Added ${points} loyalty points`, {
    customer: {
      _id: customer._id,
      fullName: customer.fullName,
      loyaltyPoints: customer.loyaltyPoints,
    },
  });
});

/**
 * Redeem loyalty points
 * POST /api/v1/shops/:shopId/customers/:customerId/loyalty/redeem
 */
export const redeemLoyaltyPoints = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, customerId } = req.params;
  const { points } = req.body;

  const customer = await customerService.redeemLoyaltyPoints(customerId, shopId, points);

  return sendSuccess(res, 200, `Redeemed ${points} loyalty points`, {
    customer: {
      _id: customer._id,
      fullName: customer.fullName,
      loyaltyPoints: customer.loyaltyPoints,
    },
  });
});

/**
 * Get customer analytics
 * GET /api/v1/shops/:shopId/customers/analytics
 */
export const getCustomerAnalytics = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId } = req.params;

  const summary = await customerService.getCustomerStatistics(shopId);

  return sendSuccess(res, 200, 'Analytics fetched successfully', { summary });
});
