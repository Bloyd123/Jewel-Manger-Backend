// ============================================================================
// FILE: src/api/customer/customer.controller.js
// Customer Controller - Compatible with existing sendResponse.js
// ============================================================================

import { validationResult } from 'express-validator';
import customerService from './customer.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  sendInternalError, // Your existing function
} from '../../utils/sendResponse.js';
import logger from '../../utils/logger.js';
import eventLogger from '../../utils/eventLogger.js';

/**
 * Create a new customer
 * POST /api/v1/shops/:shopId/customers
 */
export const createCustomer = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', errors.array());
    }

    const { shopId } = req.params;
    const customerData = req.body;

    // Create customer
    const customer = await customerService.createCustomer(
      shopId,
      customerData,
      req.user._id
    );

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

    // Using your sendCreated format: (res, message, data)
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
  } catch (error) {
    logger.error('Error creating customer', {
      error: error.message,
      stack: error.stack,
      shopId: req.params.shopId,
      userId: req.user._id,
    });

    if (error.name === 'ConflictError') {
      return sendConflict(res, error.message);
    }

    return sendInternalError(res, 'Failed to create customer', error);
  }
};

/**
 * Get all customers with filters and pagination
 * GET /api/v1/shops/:shopId/customers
 */
export const getCustomers = async (req, res) => {
  try {
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
    const result = await customerService.getCustomers(
      shopId,
      filters,
      paginationOptions
    );

    // Get summary statistics
    const summary = await customerService.getCustomerStatistics(shopId);

    // Using your sendSuccess format: (res, statusCode, message, data, meta)
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
  } catch (error) {
    logger.error('Error fetching customers', {
      error: error.message,
      shopId: req.params.shopId,
      userId: req.user._id,
    });

    return sendInternalError(res, 'Failed to fetch customers', error);
  }
};

/**
 * Get single customer by ID
 * GET /api/v1/shops/:shopId/customers/:customerId
 */
export const getCustomerById = async (req, res) => {
  try {
    const { shopId, customerId } = req.params;

    const customer = await customerService.getCustomerById(customerId, shopId);

    if (!customer) {
      return sendNotFound(res, 'Customer not found');
    }

    return sendSuccess(res, 200, 'Customer fetched successfully', { customer });
  } catch (error) {
    logger.error('Error fetching customer', {
      error: error.message,
      customerId: req.params.customerId,
      shopId: req.params.shopId,
    });

    if (error.name === 'NotFoundError') {
      return sendNotFound(res, error.message);
    }

    return sendInternalError(res, 'Failed to fetch customer', error);
  }
};

/**
 * Search customer by phone/email/code
 * GET /api/v1/shops/:shopId/customers/search
 */
export const searchCustomer = async (req, res) => {
  try {
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
  } catch (error) {
    logger.error('Error searching customer', {
      error: error.message,
      shopId: req.params.shopId,
      query: req.query,
    });

    return sendInternalError(res, 'Failed to search customer', error);
  }
};

/**
 * Update customer
 * PUT /api/v1/shops/:shopId/customers/:customerId
 */
export const updateCustomer = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', errors.array());
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
  } catch (error) {
    logger.error('Error updating customer', {
      error: error.message,
      customerId: req.params.customerId,
      shopId: req.params.shopId,
    });

    if (error.name === 'NotFoundError') {
      return sendNotFound(res, error.message);
    }

    if (error.name === 'ConflictError') {
      return sendConflict(res, error.message);
    }

    return sendInternalError(res, 'Failed to update customer', error);
  }
};

/**
 * Delete customer (soft delete)
 * DELETE /api/v1/shops/:shopId/customers/:customerId
 */
export const deleteCustomer = async (req, res) => {
  try {
    const { shopId, customerId } = req.params;

    const customer = await customerService.deleteCustomer(
      customerId,
      shopId,
      req.user._id
    );

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
  } catch (error) {
    logger.error('Error deleting customer', {
      error: error.message,
      customerId: req.params.customerId,
      shopId: req.params.shopId,
    });

    if (error.name === 'NotFoundError') {
      return sendNotFound(res, error.message);
    }

    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }

    return sendInternalError(res, 'Failed to delete customer', error);
  }
};

/**
 * Blacklist customer
 * PATCH /api/v1/shops/:shopId/customers/:customerId/blacklist
 */
export const blacklistCustomer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', errors.array());
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
  } catch (error) {
    logger.error('Error blacklisting customer', {
      error: error.message,
      customerId: req.params.customerId,
    });

    if (error.name === 'NotFoundError') {
      return sendNotFound(res, error.message);
    }

    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }

    return sendInternalError(res, 'Failed to blacklist customer', error);
  }
};

/**
 * Remove blacklist
 * PATCH /api/v1/shops/:shopId/customers/:customerId/unblacklist
 */
export const removeBlacklist = async (req, res) => {
  try {
    const { shopId, customerId } = req.params;

    const customer = await customerService.removeBlacklist(
      customerId,
      shopId,
      req.user._id
    );

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
  } catch (error) {
    logger.error('Error removing blacklist', {
      error: error.message,
      customerId: req.params.customerId,
    });

    if (error.name === 'NotFoundError') {
      return sendNotFound(res, error.message);
    }

    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }

    return sendInternalError(res, 'Failed to remove blacklist', error);
  }
};

/**
 * Add loyalty points
 * POST /api/v1/shops/:shopId/customers/:customerId/loyalty/add
 */
export const addLoyaltyPoints = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', errors.array());
    }

    const { shopId, customerId } = req.params;
    const { points, reason } = req.body;

    const customer = await customerService.addLoyaltyPoints(
      customerId,
      shopId,
      points,
      reason
    );

    return sendSuccess(res, 200, `Added ${points} loyalty points`, {
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        loyaltyPoints: customer.loyaltyPoints,
      },
    });
  } catch (error) {
    logger.error('Error adding loyalty points', {
      error: error.message,
      customerId: req.params.customerId,
    });

    if (error.name === 'NotFoundError') {
      return sendNotFound(res, error.message);
    }

    return sendInternalError(res, 'Failed to add loyalty points', error);
  }
};

/**
 * Redeem loyalty points
 * POST /api/v1/shops/:shopId/customers/:customerId/loyalty/redeem
 */
export const redeemLoyaltyPoints = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', errors.array());
    }

    const { shopId, customerId } = req.params;
    const { points } = req.body;

    const customer = await customerService.redeemLoyaltyPoints(
      customerId,
      shopId,
      points
    );

    return sendSuccess(res, 200, `Redeemed ${points} loyalty points`, {
      customer: {
        _id: customer._id,
        fullName: customer.fullName,
        loyaltyPoints: customer.loyaltyPoints,
      },
    });
  } catch (error) {
    logger.error('Error redeeming loyalty points', {
      error: error.message,
      customerId: req.params.customerId,
    });

    if (error.name === 'NotFoundError') {
      return sendNotFound(res, error.message);
    }

    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }

    return sendInternalError(res, 'Failed to redeem loyalty points', error);
  }
};

/**
 * Get customer analytics
 * GET /api/v1/shops/:shopId/customers/analytics
 */
export const getCustomerAnalytics = async (req, res) => {
  try {
    const { shopId } = req.params;

    const summary = await customerService.getCustomerStatistics(shopId);

    return sendSuccess(res, 200, 'Analytics fetched successfully', { summary });
  } catch (error) {
    logger.error('Error fetching analytics', {
      error: error.message,
      shopId: req.params.shopId,
    });

    return sendInternalError(res, 'Failed to fetch analytics', error);
  }
};

export default {
  createCustomer,
  getCustomers,
  getCustomerById,
  searchCustomer,
  updateCustomer,
  deleteCustomer,
  blacklistCustomer,
  removeBlacklist,
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  getCustomerAnalytics,
};