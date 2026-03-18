// FILE: src/api/services/order.service.js
// Order Service - UPDATED (Payment module + Email integrated)

import Order from '../../models/Order.js';
import Customer from '../../models/Customer.js';
import User from '../../models/User.js';
import Payment from '../../models/Payment.js';
import {
  NotFoundError,
  ValidationError,
  InsufficientPermissionsError,
} from '../../utils/AppError.js';
import logger from '../../utils/logger.js';
import eventLogger from '../../utils/eventLogger.js';
import { sendOrderStatusUpdateEmail } from '../../utils/emailService.js';

// ============================================================
// 1. CREATE ORDER
// ============================================================

export const createOrder = async (orderData, userId, shopId, organizationId) => {
  try {
    const customer = await Customer.findById(orderData.customerId);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    if (customer.shopId.toString() !== shopId.toString()) {
      throw new ValidationError('Customer does not belong to this shop');
    }

    const orderNumber = await Order.generateOrderNumber(shopId, orderData.orderType);

    const customerDetails = {
      customerName: customer.fullName,
      customerCode: customer.customerCode,
      phone:        customer.phone,
      email:        customer.email || '',
      address:      customer.address?.street || '',
    };

    const order = await Order.create({
      ...orderData,
      orderNumber,
      organizationId,
      shopId,
      customerDetails,
      createdBy: userId,
      status:    'draft',
    });

    await eventLogger.logActivity({
      userId, organizationId, shopId,
      action:      'create',
      module:      'order',
      description: `Created order ${orderNumber}`,
      metadata:    { orderId: order._id, orderNumber },
      level:       'info',
    });

    logger.info(`Order created: ${orderNumber}`, { userId, orderId: order._id });

    return order;
  } catch (error) {
    logger.error('Error creating order:', error);
    throw error;
  }
};

// ============================================================
// 2. GET ALL ORDERS WITH FILTERS
// ============================================================

export const getOrders = async (filters, shopId, organizationId) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      status,
      orderType,
      priority,
      customerId,
      assignedTo,
      paymentStatus,
      startDate,
      endDate,
      search,
      overdue,
      dueSoon,
    } = filters;

    const query = { shopId, organizationId, deletedAt: null };

    if (status)        query.status                        = status;
    if (orderType)     query.orderType                     = orderType;
    if (priority)      query.priority                      = priority;
    if (customerId)    query.customerId                    = customerId;
    if (assignedTo)    query['assignment.assignedTo']      = assignedTo;
    if (paymentStatus) query['payment.paymentStatus']      = paymentStatus;

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate)   query.orderDate.$lte = new Date(endDate);
    }

    if (overdue === 'true') {
      query['timeline.estimatedCompletionDate'] = { $lt: new Date() };
      query.status = { $in: ['confirmed', 'in_progress', 'on_hold'] };
    }

    if (dueSoon) {
      const days       = parseInt(dueSoon);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      query['timeline.estimatedCompletionDate'] = {
        $lte: futureDate,
        $gte: new Date(),
      };
      query.status = { $in: ['confirmed', 'in_progress'] };
    }

    if (search) {
      query.$or = [
        { orderNumber: new RegExp(search, 'i') },
        { 'customerDetails.customerName': new RegExp(search, 'i') },
        { 'customerDetails.phone': new RegExp(search, 'i') },
      ];
    }

    const total  = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('customerId', 'firstName lastName phone email')
      .populate('assignment.assignedTo', 'firstName lastName')
      .lean();

    return {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages:  Math.ceil(total / limit),
        totalItems:  total,
        pageSize:    parseInt(limit),
      },
    };
  } catch (error) {
    logger.error('Error fetching orders:', error);
    throw error;
  }
};

// ============================================================
// 3. GET SINGLE ORDER
// ============================================================

export const getOrderById = async (orderId, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    })
      .populate('customerId', 'firstName lastName phone email customerCode')
      .populate('assignment.assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('progressUpdates.updatedBy', 'firstName lastName')
      .lean();

    if (!order) throw new NotFoundError('Order not found');

    return order;
  } catch (error) {
    logger.error('Error fetching order:', error);
    throw error;
  }
};

// ============================================================
// 4. UPDATE ORDER (sirf draft/confirmed)
// ============================================================

export const updateOrder = async (orderId, updateData, userId, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    });

    if (!order) throw new NotFoundError('Order not found');

    if (!['draft', 'confirmed'].includes(order.status)) {
      throw new ValidationError('Cannot edit order in current status');
    }

    const allowedFields = ['priority', 'timeline', 'financials', 'notes', 'specialInstructions', 'tags'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) order[field] = updateData[field];
    });

    order.updatedBy = userId;
    await order.save();

    await eventLogger.logActivity({
      userId, organizationId, shopId,
      action:      'update',
      module:      'order',
      description: `Updated order ${order.orderNumber}`,
      metadata:    { orderId: order._id, orderNumber: order.orderNumber },
      level:       'info',
    });

    return order;
  } catch (error) {
    logger.error('Error updating order:', error);
    throw error;
  }
};

// ============================================================
// 5. UPDATE ORDER STATUS  ← email call yahan hai
// ============================================================

export const updateOrderStatus = async (orderId, status, userId, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    });

    if (!order) throw new NotFoundError('Order not found');

    const validTransitions = {
      draft:         ['confirmed', 'cancelled'],
      confirmed:     ['in_progress', 'cancelled'],
      in_progress:   ['on_hold', 'quality_check', 'cancelled'],
      on_hold:       ['in_progress', 'cancelled'],
      quality_check: ['ready', 'in_progress'],
      ready:         ['delivered'],
      delivered:     ['completed'],
      completed:     [],
      cancelled:     [],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      throw new ValidationError(`Cannot transition from ${order.status} to ${status}`);
    }

    order.status    = status;
    order.updatedBy = userId;

    if (status === 'in_progress' && !order.timeline.actualStartDate) {
      order.timeline.actualStartDate = new Date();
    }
    if (status === 'completed') {
      order.timeline.actualCompletionDate = new Date();
    }

    await order.save();

    await eventLogger.logActivity({
      userId, organizationId, shopId,
      action:      'update_status',
      module:      'order',
      description: `Changed order ${order.orderNumber} status to ${status}`,
      metadata:    { orderId: order._id, oldStatus: order.status, newStatus: status },
      level:       'info',
    });

    // ── EMAIL: sirf confirmed ya ready pe ───
    if (['confirmed', 'ready'].includes(status) && order.customerDetails?.email) {
      const customer = {
        fullName: order.customerDetails.customerName,
        email:    order.customerDetails.email,
      };

      sendOrderStatusUpdateEmail(order, customer, status).catch(err => {
        logger.error(
          `Order status email failed — ${order.orderNumber} → ${status}:`, err
        );
      });
    }
    // ─────────────────────────────────────────

    return order;
  } catch (error) {
    logger.error('Error updating order status:', error);
    throw error;
  }
};

// ============================================================
// 6. CONFIRM ORDER  ← email call yahan bhi hai
// ============================================================

export const confirmOrder = async (orderId, confirmedBy, notes, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    });

    if (!order) throw new NotFoundError('Order not found');

    if (order.status !== 'draft') {
      throw new ValidationError('Only draft orders can be confirmed');
    }

    order.status    = 'confirmed';
    order.updatedBy = confirmedBy;
    if (notes) order.notes = notes;

    await order.save();

    await eventLogger.logActivity({
      userId:      confirmedBy,
      organizationId, shopId,
      action:      'confirm',
      module:      'order',
      description: `Confirmed order ${order.orderNumber}`,
      metadata:    { orderId: order._id },
      level:       'success',
    });

    // ── EMAIL: Order confirmed ───────────────
    if (order.customerDetails?.email) {
      const customer = {
        fullName: order.customerDetails.customerName,
        email:    order.customerDetails.email,
      };

      sendOrderStatusUpdateEmail(order, customer, 'confirmed').catch(err => {
        logger.error(
          `Order confirm email failed — ${order.orderNumber}:`, err
        );
      });
    }
    // ─────────────────────────────────────────

    return order;
  } catch (error) {
    logger.error('Error confirming order:', error);
    throw error;
  }
};

// ============================================================
// 7. ASSIGN ORDER
// ============================================================

export const assignOrder = async (orderId, assignmentData, userId, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    });

    if (!order) throw new NotFoundError('Order not found');

    const assignee = await User.findById(assignmentData.assignedTo);
    if (!assignee) throw new NotFoundError('User not found');

    order.assignment = {
      assignedTo:  assignmentData.assignedTo,
      assignedBy:  userId,
      assignedAt:  new Date(),
      workstation: assignmentData.workstation || '',
      artisan:     assignmentData.artisan || null,
    };

    order.updatedBy = userId;
    await order.save();

    await eventLogger.logActivity({
      userId, organizationId, shopId,
      action:      'assign',
      module:      'order',
      description: `Assigned order ${order.orderNumber} to ${assignee.fullName}`,
      metadata:    { orderId: order._id, assignedTo: assignee._id },
      level:       'info',
    });

    return order;
  } catch (error) {
    logger.error('Error assigning order:', error);
    throw error;
  }
};

// ============================================================
// 8. ADD PROGRESS UPDATE
// ============================================================

export const addProgressUpdate = async (orderId, progressData, userId, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    });

    if (!order) throw new NotFoundError('Order not found');

    order.progressUpdates.push({
      updateDate:  new Date(),
      status:      progressData.status || order.status,
      description: progressData.description,
      photos:      progressData.photos || [],
      updatedBy:   userId,
    });

    if (progressData.status && progressData.status !== order.status) {
      order.status = progressData.status;
    }

    order.updatedBy = userId;
    await order.save();

    await eventLogger.logActivity({
      userId, organizationId, shopId,
      action:      'progress_update',
      module:      'order',
      description: `Added progress update for order ${order.orderNumber}`,
      metadata:    { orderId: order._id },
      level:       'info',
    });

    return order;
  } catch (error) {
    logger.error('Error adding progress update:', error);
    throw error;
  }
};

// ============================================================
// 9. PERFORM QUALITY CHECK
// ============================================================

export const performQualityCheck = async (orderId, checkData, userId, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    });

    if (!order) throw new NotFoundError('Order not found');

    order.qualityCheck = {
      status:    checkData.status,
      checkedBy: userId,
      checkedAt: new Date(),
      remarks:   checkData.remarks || '',
      issues:    checkData.issues  || [],
      photos:    checkData.photos  || [],
    };

    if (checkData.status === 'passed') {
      order.status = 'ready';
    } else if (checkData.status === 'failed') {
      order.status = 'in_progress';
    }

    order.updatedBy = userId;
    await order.save();

    await eventLogger.logActivity({
      userId, organizationId, shopId,
      action:      'quality_check',
      module:      'order',
      description: `Performed quality check for order ${order.orderNumber} - ${checkData.status}`,
      metadata:    { orderId: order._id, checkStatus: checkData.status },
      level:       checkData.status === 'passed' ? 'success' : 'warn',
    });

    // ── EMAIL: quality check pass → ready ───
    // performQualityCheck ke andar bhi status 'ready' ho sakti hai
    // woh updateOrderStatus se nahi jaata — isliye yahan bhi check karo
    if (checkData.status === 'passed' && order.customerDetails?.email) {
      const customer = {
        fullName: order.customerDetails.customerName,
        email:    order.customerDetails.email,
      };

      sendOrderStatusUpdateEmail(order, customer, 'ready').catch(err => {
        logger.error(
          `Order ready email failed — ${order.orderNumber}:`, err
        );
      });
    }
    // ─────────────────────────────────────────

    return order;
  } catch (error) {
    logger.error('Error performing quality check:', error);
    throw error;
  }
};

// ============================================================
// 10. GET ORDER PAYMENTS — Payment module se
// ============================================================

export const getOrderPayments = async (orderId, shopId) => {
  try {
    const order = await Order.findOne({ _id: orderId, shopId, deletedAt: null });
    if (!order) throw new NotFoundError('Order not found');

    const payments = await Payment.find({
      'reference.referenceId':   orderId,
      'reference.referenceType': 'order',
      shopId,
      deletedAt: null,
    })
      .sort({ paymentDate: -1 })
      .populate('processedBy', 'firstName lastName')
      .lean();

    return payments;
  } catch (error) {
    logger.error('Error fetching order payments:', error);
    throw error;
  }
};

// ============================================================
// 11. MARK AS DELIVERED
// ============================================================

export const markAsDelivered = async (orderId, deliveryData, userId, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    });

    if (!order) throw new NotFoundError('Order not found');

    if (order.status !== 'ready') {
      throw new ValidationError('Order must be in ready status to mark as delivered');
    }

    order.delivery = {
      ...deliveryData,
      deliveredBy: userId,
      deliveredAt: new Date(),
    };

    order.status    = 'delivered';
    order.updatedBy = userId;
    await order.save();

    await eventLogger.logActivity({
      userId, organizationId, shopId,
      action:      'deliver',
      module:      'order',
      description: `Marked order ${order.orderNumber} as delivered`,
      metadata:    { orderId: order._id },
      level:       'success',
    });

    return order;
  } catch (error) {
    logger.error('Error marking order as delivered:', error);
    throw error;
  }
};

// ============================================================
// 12. COMPLETE ORDER
// ============================================================

export const completeOrder = async (orderId, userId, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    });

    if (!order) throw new NotFoundError('Order not found');

    if (order.status !== 'delivered') {
      throw new ValidationError('Order must be delivered before marking as completed');
    }

    order.status                         = 'completed';
    order.timeline.actualCompletionDate  = new Date();
    order.updatedBy                      = userId;
    await order.save();

    await eventLogger.logActivity({
      userId, organizationId, shopId,
      action:      'complete',
      module:      'order',
      description: `Completed order ${order.orderNumber}`,
      metadata:    { orderId: order._id },
      level:       'success',
    });

    return order;
  } catch (error) {
    logger.error('Error completing order:', error);
    throw error;
  }
};

// ============================================================
// 13. CANCEL ORDER
// ============================================================

export const cancelOrder = async (orderId, cancellationData, userId, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    });

    if (!order) throw new NotFoundError('Order not found');

    if (['completed', 'cancelled'].includes(order.status)) {
      throw new ValidationError('Cannot cancel a completed or already cancelled order');
    }

    order.cancellation = {
      isCancelled:        true,
      cancelledAt:        new Date(),
      cancelledBy:        userId,
      cancellationReason: cancellationData.reason,
      refundAmount:       cancellationData.refundAmount || 0,
      refundStatus:       cancellationData.refundAmount > 0 ? 'pending' : 'not_applicable',
    };

    order.status    = 'cancelled';
    order.updatedBy = userId;
    await order.save();

    // NOTE: Refund ab Payment module handle karega
    // payment.service.js ka processRefund() call hoga controller se

    await eventLogger.logActivity({
      userId, organizationId, shopId,
      action:      'cancel',
      module:      'order',
      description: `Cancelled order ${order.orderNumber}`,
      metadata:    { orderId: order._id, reason: cancellationData.reason },
      level:       'warn',
    });

    return order;
  } catch (error) {
    logger.error('Error cancelling order:', error);
    throw error;
  }
};

// ============================================================
// 14. GET ORDER ANALYTICS
// ============================================================

export const getOrderAnalytics = async (filters, shopId, organizationId) => {
  try {
    const { startDate, endDate } = filters;
    const query = { shopId, organizationId, deletedAt: null };

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate)   query.orderDate.$lte = new Date(endDate);
    }

    const [
      totalOrders,
      statusBreakdown,
      typeBreakdown,
      overdueCount,
      avgCompletionTime,
    ] = await Promise.all([
      Order.countDocuments(query),

      Order.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Order.aggregate([
        { $match: query },
        { $group: { _id: '$orderType', count: { $sum: 1 } } },
      ]),

      Order.countDocuments({
        ...query,
        'timeline.estimatedCompletionDate': { $lt: new Date() },
        status: { $in: ['confirmed', 'in_progress', 'on_hold'] },
      }),

      Order.aggregate([
        {
          $match: {
            ...query,
            status: 'completed',
            'timeline.actualStartDate':      { $exists: true },
            'timeline.actualCompletionDate': { $exists: true },
          },
        },
        {
          $project: {
            duration: {
              $divide: [
                { $subtract: ['$timeline.actualCompletionDate', '$timeline.actualStartDate'] },
                86400000,
              ],
            },
          },
        },
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
      ]),
    ]);

    return {
      totalOrders,
      statusBreakdown,
      typeBreakdown,
      overdueOrders:        overdueCount,
      averageCompletionTime: avgCompletionTime[0]?.avgDuration || 0,
    };
  } catch (error) {
    logger.error('Error fetching order analytics:', error);
    throw error;
  }
};

// ============================================================
// 15. ADD ORDER PAYMENT (controller se call hoga)
// ============================================================

export const addOrderPayment = async (orderId, paymentData, userId, shopId, organizationId) => {
  try {
    const order = await Order.findOne({
      _id: orderId, shopId, organizationId, deletedAt: null,
    });

    if (!order) throw new NotFoundError('Order not found');

    if (['cancelled', 'completed'].includes(order.status)) {
      throw new ValidationError('Cannot add payment to cancelled or completed order');
    }

    // Payment module se createPayment call karo — controller handle karega
    // Yahan sirf order validate karo
    return order;
  } catch (error) {
    logger.error('Error adding order payment:', error);
    throw error;
  }
};