// FILE: src/api/controllers/order.controller.js
// Order Controller - Request Handlers

import { validationResult } from 'express-validator';
import * as orderService from '../services/order.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  formatValidationErrors,
} from '../../utils/sendResponse.js';
import { ValidationError } from '../../utils/AppError.js';

/**
 * Create new order
 * POST /api/v1/shops/:shopId/orders
 */
export const createOrder = async (req, res, next) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.createOrder(
      req.body,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendCreated(res, 'Order created successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all orders with filters
 * GET /api/v1/shops/:shopId/orders
 */
export const getOrders = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const result = await orderService.getOrders(
      req.query,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(
      res,
      200,
      'Orders retrieved successfully',
      result.orders,
      { pagination: result.pagination }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single order by ID
 * GET /api/v1/shops/:shopId/orders/:orderId
 */
export const getOrderById = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.getOrderById(
      req.params.orderId,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order retrieved successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Update order
 * PUT /api/v1/shops/:shopId/orders/:orderId
 */
export const updateOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.updateOrder(
      req.params.orderId,
      req.body,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order updated successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status
 * PATCH /api/v1/shops/:shopId/orders/:orderId/status
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.updateOrderStatus(
      req.params.orderId,
      req.body.status,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order status updated successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm order
 * PATCH /api/v1/shops/:shopId/orders/:orderId/confirm
 */
export const confirmOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.confirmOrder(
      req.params.orderId,
      req.user._id,
      req.body.notes || '',
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order confirmed successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Start order work
 * PATCH /api/v1/shops/:shopId/orders/:orderId/start
 */
export const startOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.updateOrderStatus(
      req.params.orderId,
      'in_progress',
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order work started successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Put order on hold
 * PATCH /api/v1/shops/:shopId/orders/:orderId/hold
 */
export const holdOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.updateOrderStatus(
      req.params.orderId,
      'on_hold',
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order put on hold successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Resume order from hold
 * PATCH /api/v1/shops/:shopId/orders/:orderId/resume
 */
export const resumeOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.updateOrderStatus(
      req.params.orderId,
      'in_progress',
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order resumed successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark order as ready
 * PATCH /api/v1/shops/:shopId/orders/:orderId/ready
 */
export const markAsReady = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.updateOrderStatus(
      req.params.orderId,
      'ready',
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order marked as ready', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Assign order to user
 * POST /api/v1/shops/:shopId/orders/:orderId/assign
 */
export const assignOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.assignOrder(
      req.params.orderId,
      req.body,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order assigned successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Reassign order
 * PATCH /api/v1/shops/:shopId/orders/:orderId/reassign
 */
export const reassignOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.assignOrder(
      req.params.orderId,
      req.body,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order reassigned successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Get assigned orders for a user
 * GET /api/v1/shops/:shopId/orders/assigned/:userId
 */
export const getAssignedOrders = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const filters = {
      ...req.query,
      assignedTo: req.params.userId,
    };

    const result = await orderService.getOrders(
      filters,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(
      res,
      200,
      'Assigned orders retrieved successfully',
      result.orders,
      { pagination: result.pagination }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Add progress update
 * POST /api/v1/shops/:shopId/orders/:orderId/progress
 */
export const addProgressUpdate = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.addProgressUpdate(
      req.params.orderId,
      req.body,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Progress update added successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress updates
 * GET /api/v1/shops/:shopId/orders/:orderId/progress
 */
export const getProgress = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.getOrderById(
      req.params.orderId,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Progress updates retrieved successfully', order.progressUpdates);
  } catch (error) {
    next(error);
  }
};

/**
 * Perform quality check
 * POST /api/v1/shops/:shopId/orders/:orderId/quality-check
 */
export const performQualityCheck = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.performQualityCheck(
      req.params.orderId,
      req.body,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Quality check performed successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Get quality check details
 * GET /api/v1/shops/:shopId/orders/:orderId/quality-check
 */
export const getQualityCheck = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.getOrderById(
      req.params.orderId,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Quality check details retrieved successfully', order.qualityCheck);
  } catch (error) {
    next(error);
  }
};

/**
 * Add payment to order
 * POST /api/v1/shops/:shopId/orders/:orderId/payments
 */
export const addOrderPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.addOrderPayment(
      req.params.orderId,
      req.body,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Payment added successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Get order payments
 * GET /api/v1/shops/:shopId/orders/:orderId/payments
 */
export const getOrderPayments = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.getOrderById(
      req.params.orderId,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Payments retrieved successfully', order.payment.payments);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate bill for order
 * GET /api/v1/shops/:shopId/orders/:orderId/bill
 */
export const generateBill = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.getOrderById(
      req.params.orderId,
      req.shop._id,
      req.user.organizationId
    );

    // Extract bill details
    const bill = {
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      customer: order.customerDetails,
      items: order.items,
      financials: order.financials,
      payment: order.payment,
    };

    return sendSuccess(res, 200, 'Bill generated successfully', bill);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark order as delivered
 * PATCH /api/v1/shops/:shopId/orders/:orderId/deliver
 */
export const markAsDelivered = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.markAsDelivered(
      req.params.orderId,
      req.body,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order marked as delivered', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Complete order
 * PATCH /api/v1/shops/:shopId/orders/:orderId/complete
 */
export const completeOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.completeOrder(
      req.params.orderId,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order completed successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order
 * DELETE /api/v1/shops/:shopId/orders/:orderId
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendBadRequest(res, 'Validation failed', formatValidationErrors(errors.array()));
    }

    const order = await orderService.cancelOrder(
      req.params.orderId,
      req.body,
      req.user._id,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order cancelled successfully', order);
  } catch (error) {
    next(error);
  }
};

/**
 * Get overdue orders
 * GET /api/v1/shops/:shopId/orders/overdue
 */
export const getOverdueOrders = async (req, res, next) => {
  try {
    const filters = { ...req.query, overdue: 'true' };
    
    const result = await orderService.getOrders(
      filters,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(
      res,
      200,
      'Overdue orders retrieved successfully',
      result.orders,
      { pagination: result.pagination }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get orders due soon
 * GET /api/v1/shops/:shopId/orders/due-soon
 */
export const getDueSoonOrders = async (req, res, next) => {
  try {
    const days = req.query.days || 7;
    const filters = { ...req.query, dueSoon: days };
    
    const result = await orderService.getOrders(
      filters,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(
      res,
      200,
      'Due soon orders retrieved successfully',
      result.orders,
      { pagination: result.pagination }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending orders
 * GET /api/v1/shops/:shopId/orders/pending
 */
export const getPendingOrders = async (req, res, next) => {
  try {
    const filters = {
      ...req.query,
      status: 'confirmed,in_progress,on_hold',
    };
    
    const result = await orderService.getOrders(
      filters,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(
      res,
      200,
      'Pending orders retrieved successfully',
      result.orders,
      { pagination: result.pagination }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get completed orders
 * GET /api/v1/shops/:shopId/orders/completed
 */
export const getCompletedOrders = async (req, res, next) => {
  try {
    const filters = { ...req.query, status: 'completed' };
    
    const result = await orderService.getOrders(
      filters,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(
      res,
      200,
      'Completed orders retrieved successfully',
      result.orders,
      { pagination: result.pagination }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get orders by type
 * GET /api/v1/shops/:shopId/orders/by-type/:orderType
 */
export const getOrdersByType = async (req, res, next) => {
  try {
    const filters = { ...req.query, orderType: req.params.orderType };
    
    const result = await orderService.getOrders(
      filters,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(
      res,
      200,
      'Orders retrieved successfully',
      result.orders,
      { pagination: result.pagination }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get orders by priority
 * GET /api/v1/shops/:shopId/orders/by-priority/:priority
 */
export const getOrdersByPriority = async (req, res, next) => {
  try {
    const filters = { ...req.query, priority: req.params.priority };
    
    const result = await orderService.getOrders(
      filters,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(
      res,
      200,
      'Orders retrieved successfully',
      result.orders,
      { pagination: result.pagination }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get order analytics
 * GET /api/v1/shops/:shopId/orders/analytics
 */
export const getOrderAnalytics = async (req, res, next) => {
  try {
    const analytics = await orderService.getOrderAnalytics(
      req.query,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, 'Order analytics retrieved successfully', analytics);
  } catch (error) {
    next(error);
  }
};

/**
 * Get order dashboard
 * GET /api/v1/shops/:shopId/orders/dashboard
 */
export const getOrderDashboard = async (req, res, next) => {
  try {
    const [analytics, overdue, dueSoon, pending] = await Promise.all([
      orderService.getOrderAnalytics({}, req.shop._id, req.user.organizationId),
      orderService.getOrders({ overdue: 'true', limit: 5 }, req.shop._id, req.user.organizationId),
      orderService.getOrders({ dueSoon: 7, limit: 5 }, req.shop._id, req.user.organizationId),
      orderService.getOrders({ status: 'confirmed,in_progress', limit: 10 }, req.shop._id, req.user.organizationId),
    ]);

    const dashboard = {
      analytics,
      overdueOrders: overdue.orders,
      dueSoonOrders: dueSoon.orders,
      pendingOrders: pending.orders,
    };

    return sendSuccess(res, 200, 'Order dashboard retrieved successfully', dashboard);
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer orders
 * GET /api/v1/shops/:shopId/orders/customer/:customerId
 */
export const getCustomerOrders = async (req, res, next) => {
  try {
    const filters = { ...req.query, customerId: req.params.customerId };
    
    const result = await orderService.getOrders(
      filters,
      req.shop._id,
      req.user.organizationId
    );

    return sendSuccess(
      res,
      200,
      'Customer orders retrieved successfully',
      result.orders,
      { pagination: result.pagination }
    );
  } catch (error) {
    next(error);
  }
};

export default {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  confirmOrder,
  startOrder,
  holdOrder,
  resumeOrder,
  markAsReady,
  assignOrder,
  reassignOrder,
  getAssignedOrders,
  addProgressUpdate,
  getProgress,
  performQualityCheck,
  getQualityCheck,
  addOrderPayment,
  getOrderPayments,
  generateBill,
  markAsDelivered,
  completeOrder,
  cancelOrder,
  getOverdueOrders,
  getDueSoonOrders,
  getPendingOrders,
  getCompletedOrders,
  getOrdersByType,
  getOrdersByPriority,
  getOrderAnalytics,
  getOrderDashboard,
  getCustomerOrders,
};