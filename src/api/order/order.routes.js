// FILE: src/api/routes/order.routes.js
// Order Module Routes

import express from 'express';
import * as orderController from '../controllers/order.controller.js';
import * as orderValidation from '../validations/order.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { checkShopAccess, checkPermission } from '../middlewares/checkShopAccess.js';
import { apiRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router({ mergeParams: true });

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiRateLimiter);
router.use(checkShopAccess);

/**
 * @route   POST /api/v1/shops/:shopId/orders
 * @desc    Create new order
 * @access  Private - canCreateOrder
 */
router.post(
  '/',
  checkPermission('canCreateOrder'),
  orderValidation.createOrderValidation,
  orderController.createOrder
);

/**
 * @route   GET /api/v1/shops/:shopId/orders
 * @desc    Get all orders with filters
 * @access  Private - canViewOrders
 */
router.get(
  '/',
  checkPermission('canViewOrders'),
  orderValidation.listOrdersValidation,
  orderController.getOrders
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/overdue
 * @desc    Get overdue orders
 * @access  Private - canViewOverdueOrders
 */
router.get(
  '/overdue',
  checkPermission('canViewOverdueOrders'),
  orderController.getOverdueOrders
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/due-soon
 * @desc    Get orders due soon
 * @access  Private - canViewDueSoonOrders
 */
router.get(
  '/due-soon',
  checkPermission('canViewDueSoonOrders'),
  orderController.getDueSoonOrders
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/pending
 * @desc    Get pending orders
 * @access  Private - canViewPendingOrders
 */
router.get(
  '/pending',
  checkPermission('canViewPendingOrders'),
  orderController.getPendingOrders
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/completed
 * @desc    Get completed orders
 * @access  Private - canViewCompletedOrders
 */
router.get(
  '/completed',
  checkPermission('canViewCompletedOrders'),
  orderController.getCompletedOrders
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/analytics
 * @desc    Get order analytics
 * @access  Private - canViewOrderAnalytics
 */
router.get(
  '/analytics',
  checkPermission('canViewOrderAnalytics'),
  orderController.getOrderAnalytics
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/dashboard
 * @desc    Get order dashboard
 * @access  Private - canViewOrderDashboard
 */
router.get(
  '/dashboard',
  checkPermission('canViewOrderDashboard'),
  orderController.getOrderDashboard
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/by-type/:orderType
 * @desc    Get orders by type
 * @access  Private - canViewOrdersByType
 */
router.get(
  '/by-type/:orderType',
  checkPermission('canViewOrdersByType'),
  orderController.getOrdersByType
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/by-priority/:priority
 * @desc    Get orders by priority
 * @access  Private - canViewOrdersByPriority
 */
router.get(
  '/by-priority/:priority',
  checkPermission('canViewOrdersByPriority'),
  orderController.getOrdersByPriority
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/customer/:customerId
 * @desc    Get customer orders
 * @access  Private - canViewCustomerOrders
 */
router.get(
  '/customer/:customerId',
  checkPermission('canViewCustomerOrders'),
  orderController.getCustomerOrders
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/assigned/:userId
 * @desc    Get assigned orders for a user
 * @access  Private - canGetAssignedOrders
 */
router.get(
  '/assigned/:userId',
  checkPermission('canGetAssignedOrders'),
  orderController.getAssignedOrders
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/:orderId
 * @desc    Get single order by ID
 * @access  Private - canViewOrders
 */
router.get(
  '/:orderId',
  checkPermission('canViewOrders'),
  orderValidation.orderIdValidation,
  orderController.getOrderById
);

/**
 * @route   PUT /api/v1/shops/:shopId/orders/:orderId
 * @desc    Update order
 * @access  Private - canUpdateOrder
 */
router.put(
  '/:orderId',
  checkPermission('canUpdateOrder'),
  orderValidation.updateOrderValidation,
  orderController.updateOrder
);

/**
 * @route   PATCH /api/v1/shops/:shopId/orders/:orderId/status
 * @desc    Update order status
 * @access  Private - canUpdateOrderStatus
 */
router.patch(
  '/:orderId/status',
  checkPermission('canUpdateOrderStatus'),
  orderValidation.updateStatusValidation,
  orderController.updateOrderStatus
);

/**
 * @route   PATCH /api/v1/shops/:shopId/orders/:orderId/confirm
 * @desc    Confirm order
 * @access  Private - canConfirmOrder
 */
router.patch(
  '/:orderId/confirm',
  checkPermission('canConfirmOrder'),
  orderValidation.orderIdValidation,
  orderController.confirmOrder
);

/**
 * @route   PATCH /api/v1/shops/:shopId/orders/:orderId/start
 * @desc    Start order work
 * @access  Private - canStartOrder
 */
router.patch(
  '/:orderId/start',
  checkPermission('canStartOrder'),
  orderValidation.orderIdValidation,
  orderController.startOrder
);

/**
 * @route   PATCH /api/v1/shops/:shopId/orders/:orderId/hold
 * @desc    Put order on hold
 * @access  Private - canHoldOrder
 */
router.patch(
  '/:orderId/hold',
  checkPermission('canHoldOrder'),
  orderValidation.orderIdValidation,
  orderController.holdOrder
);

/**
 * @route   PATCH /api/v1/shops/:shopId/orders/:orderId/resume
 * @desc    Resume order from hold
 * @access  Private - canResumeOrder
 */
router.patch(
  '/:orderId/resume',
  checkPermission('canResumeOrder'),
  orderValidation.orderIdValidation,
  orderController.resumeOrder
);

/**
 * @route   PATCH /api/v1/shops/:shopId/orders/:orderId/ready
 * @desc    Mark order as ready
 * @access  Private - canMarkAsReady
 */
router.patch(
  '/:orderId/ready',
  checkPermission('canMarkAsReady'),
  orderValidation.orderIdValidation,
  orderController.markAsReady
);

/**
 * @route   POST /api/v1/shops/:shopId/orders/:orderId/assign
 * @desc    Assign order to user
 * @access  Private - canAssignOrder
 */
router.post(
  '/:orderId/assign',
  checkPermission('canAssignOrder'),
  orderValidation.assignOrderValidation,
  orderController.assignOrder
);

/**
 * @route   PATCH /api/v1/shops/:shopId/orders/:orderId/reassign
 * @desc    Reassign order
 * @access  Private - canReassignOrder
 */
router.patch(
  '/:orderId/reassign',
  checkPermission('canReassignOrder'),
  orderValidation.assignOrderValidation,
  orderController.reassignOrder
);

/**
 * @route   POST /api/v1/shops/:shopId/orders/:orderId/progress
 * @desc    Add progress update
 * @access  Private - canAddProgressUpdate
 */
router.post(
  '/:orderId/progress',
  checkPermission('canAddProgressUpdate'),
  orderValidation.addProgressValidation,
  orderController.addProgressUpdate
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/:orderId/progress
 * @desc    Get progress updates
 * @access  Private - canGetProgress
 */
router.get(
  '/:orderId/progress',
  checkPermission('canGetProgress'),
  orderValidation.orderIdValidation,
  orderController.getProgress
);

/**
 * @route   POST /api/v1/shops/:shopId/orders/:orderId/quality-check
 * @desc    Perform quality check
 * @access  Private - canQualityCheck
 */
router.post(
  '/:orderId/quality-check',
  checkPermission('canQualityCheck'),
  orderValidation.qualityCheckValidation,
  orderController.performQualityCheck
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/:orderId/quality-check
 * @desc    Get quality check details
 * @access  Private - canGetQualityCheck
 */
router.get(
  '/:orderId/quality-check',
  checkPermission('canGetQualityCheck'),
  orderValidation.orderIdValidation,
  orderController.getQualityCheck
);

/**
 * @route   POST /api/v1/shops/:shopId/orders/:orderId/payments
 * @desc    Add payment to order
 * @access  Private - canAddOrderPayment
 */
router.post(
  '/:orderId/payments',
  checkPermission('canAddOrderPayment'),
  orderValidation.addPaymentValidation,
  orderController.addOrderPayment
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/:orderId/payments
 * @desc    Get order payments
 * @access  Private - canGetOrderPayments
 */
router.get(
  '/:orderId/payments',
  checkPermission('canGetOrderPayments'),
  orderValidation.orderIdValidation,
  orderController.getOrderPayments
);

/**
 * @route   GET /api/v1/shops/:shopId/orders/:orderId/bill
 * @desc    Generate bill for order
 * @access  Private - canGenerateBill
 */
router.get(
  '/:orderId/bill',
  checkPermission('canGenerateBill'),
  orderValidation.orderIdValidation,
  orderController.generateBill
);

/**
 * @route   PATCH /api/v1/shops/:shopId/orders/:orderId/deliver
 * @desc    Mark order as delivered
 * @access  Private - canMarkOrderAsDelivered
 */
router.patch(
  '/:orderId/deliver',
  checkPermission('canMarkOrderAsDelivered'),
  orderValidation.deliveryValidation,
  orderController.markAsDelivered
);

/**
 * @route   PATCH /api/v1/shops/:shopId/orders/:orderId/complete
 * @desc    Complete order
 * @access  Private - canCompleteOrder
 */
router.patch(
  '/:orderId/complete',
  checkPermission('canCompleteOrder'),
  orderValidation.orderIdValidation,
  orderController.completeOrder
);

/**
 * @route   DELETE /api/v1/shops/:shopId/orders/:orderId
 * @desc    Cancel order
 * @access  Private - canCancelOrders
 */
router.delete(
  '/:orderId',
  checkPermission('canCancelOrders'),
  orderValidation.cancelOrderValidation,
  orderController.cancelOrder
);

export default router;