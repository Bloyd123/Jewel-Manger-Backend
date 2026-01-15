// FILE: src/api/payment/payment.service.js
// Payment Service - Business Logic Layer (Functional Implementation)

import Payment from '../../models/Payment.js';
import Sale from '../../models/Sale.js';
import Purchase from '../../models/Purchase.js';
import Customer from '../../models/Customer.js';
import Supplier from '../../models/Supplier.js';
import { NotFoundError, ValidationError, BadRequestError } from '../../utils/AppError.js';
import eventLogger from '../../utils/eventLogger.js';
import logger from '../../utils/logger.js';
import { paginate } from '../../utils/pagination.js';
import catchAsync from '../../utils/catchAsync.js';

// HELPER FUNCTIONS

/**
 * Update reference (sale/purchase) payment status
 */
const updateReferencePaymentStatus = async payment => {
  try {
    const { referenceType, referenceId } = payment.reference;

    if (referenceType === 'sale') {
      const sale = await Sale.findById(referenceId);
      if (sale) {
        sale.payment.paidAmount += payment.amount;
        sale.payment.dueAmount = sale.payment.totalAmount - sale.payment.paidAmount;

        if (sale.payment.paidAmount >= sale.payment.totalAmount) {
          sale.payment.paymentStatus = 'paid';
        } else if (sale.payment.paidAmount > 0) {
          sale.payment.paymentStatus = 'partial';
        }

        await sale.save();
      }
    } else if (referenceType === 'purchase') {
      const purchase = await Purchase.findById(referenceId);
      if (purchase) {
        purchase.payment.paidAmount += payment.amount;
        purchase.payment.dueAmount = purchase.payment.totalAmount - purchase.payment.paidAmount;

        if (purchase.payment.paidAmount >= purchase.payment.totalAmount) {
          purchase.payment.paymentStatus = 'paid';
        } else if (purchase.payment.paidAmount > 0) {
          purchase.payment.paymentStatus = 'partial';
        }

        await purchase.save();
      }
    }
  } catch (error) {
    logger.error('Update reference payment status error:', error);
  }
};

/**
 * Reverse reference payment status (on cancellation)
 */
const reverseReferencePaymentStatus = async payment => {
  try {
    const { referenceType, referenceId } = payment.reference;

    if (referenceType === 'sale') {
      const sale = await Sale.findById(referenceId);
      if (sale) {
        sale.payment.paidAmount -= payment.amount;
        sale.payment.dueAmount = sale.payment.totalAmount - sale.payment.paidAmount;

        if (sale.payment.paidAmount === 0) {
          sale.payment.paymentStatus = 'unpaid';
        } else if (sale.payment.paidAmount < sale.payment.totalAmount) {
          sale.payment.paymentStatus = 'partial';
        }

        await sale.save();
      }
    } else if (referenceType === 'purchase') {
      const purchase = await Purchase.findById(referenceId);
      if (purchase) {
        purchase.payment.paidAmount -= payment.amount;
        purchase.payment.dueAmount = purchase.payment.totalAmount - purchase.payment.paidAmount;

        if (purchase.payment.paidAmount === 0) {
          purchase.payment.paymentStatus = 'unpaid';
        } else if (purchase.payment.paidAmount < purchase.payment.totalAmount) {
          purchase.payment.paymentStatus = 'partial';
        }

        await purchase.save();
      }
    }
  } catch (error) {
    logger.error('Reverse reference payment status error:', error);
  }
};

/**
 * Update party (customer/supplier) balance
 */
const updatePartyBalance = async payment => {
  try {
    const { partyType, partyId } = payment.party;
    const amount = payment.transactionType === 'receipt' ? -payment.amount : payment.amount;

    if (partyType === 'customer') {
      const customer = await Customer.findById(partyId);
      if (customer) {
        await customer.updateBalance(amount);
      }
    } else if (partyType === 'supplier') {
      const supplier = await Supplier.findById(partyId);
      if (supplier) {
        await supplier.updateBalance(amount);
      }
    }
  } catch (error) {
    logger.error('Update party balance error:', error);
  }
};

/**
 * Reverse party balance (on cancellation)
 */
const reversePartyBalance = async payment => {
  try {
    const { partyType, partyId } = payment.party;
    const amount = payment.transactionType === 'receipt' ? payment.amount : -payment.amount;

    if (partyType === 'customer') {
      const customer = await Customer.findById(partyId);
      if (customer) {
        await customer.updateBalance(amount);
      }
    } else if (partyType === 'supplier') {
      const supplier = await Supplier.findById(partyId);
      if (supplier) {
        await supplier.updateBalance(amount);
      }
    }
  } catch (error) {
    logger.error('Reverse party balance error:', error);
  }
};

// SERVICE FUNCTIONS

// 1. CREATE PAYMENT
export const createPayment = catchAsync(async (shopId, organizationId, userId, paymentData) => {
  // Generate payment number
  const paymentNumber = await Payment.generatePaymentNumber(shopId, 'PAY');

  // Prepare payment document
  const payment = new Payment({
    organizationId,
    shopId,
    paymentNumber,
    paymentDate: new Date(),
    ...paymentData,
    processedBy: userId,
    createdBy: userId,
  });

  // Auto-complete for cash/UPI payments
  if (payment.paymentMode === 'cash' || (payment.paymentMode === 'upi' && payment.transactionId)) {
    payment.status = 'completed';
  }

  // Mark cheque as pending clearance
  if (payment.paymentMode === 'cheque') {
    payment.status = 'pending';
    payment.paymentDetails.chequeDetails.chequeStatus = 'pending';
  }

  // Save payment
  await payment.save();

  // Update reference (sale/purchase) payment status
  if (payment.reference.referenceId && payment.reference.referenceType !== 'none') {
    await updateReferencePaymentStatus(payment);
  }

  // Update party ledger balance
  await updatePartyBalance(payment);

  // Log activity
  await eventLogger.logFinancial(
    userId,
    organizationId,
    shopId,
    'create',
    `Payment ${paymentNumber} created - ${payment.transactionType} ₹${payment.amount}`,
    {
      paymentId: payment._id,
      paymentNumber,
      amount: payment.amount,
      partyId: payment.party.partyId,
      paymentMode: payment.paymentMode,
    }
  );

  return {
    success: true,
    data: payment,
    message: 'Payment recorded successfully',
  };
});

// 2. GET ALL PAYMENTS (WITH FILTERS)
export const getAllPayments = catchAsync(async (shopId, queryParams) => {
  const {
    page = 1,
    limit = 20,
    sort = '-paymentDate',
    paymentType,
    transactionType,
    paymentMode,
    status,
    partyId,
    partyType,
    referenceType,
    referenceId,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    search,
  } = queryParams;

  // Build query
  const query = { shopId, deletedAt: null };

  if (paymentType) query.paymentType = paymentType;
  if (transactionType) query.transactionType = transactionType;
  if (paymentMode) query.paymentMode = paymentMode;
  if (status) query.status = status;
  if (partyId) query['party.partyId'] = partyId;
  if (partyType) query['party.partyType'] = partyType;
  if (referenceType) query['reference.referenceType'] = referenceType;
  if (referenceId) query['reference.referenceId'] = referenceId;

  // Date range filter
  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) query.paymentDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.paymentDate.$lte = end;
    }
  }

  // Amount range filter
  if (minAmount || maxAmount) {
    query.amount = {};
    if (minAmount) query.amount.$gte = parseFloat(minAmount);
    if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
  }

  // Search filter
  if (search) {
    query.$or = [
      { paymentNumber: new RegExp(search, 'i') },
      { 'party.partyName': new RegExp(search, 'i') },
      { transactionId: new RegExp(search, 'i') },
      { 'reference.referenceNumber': new RegExp(search, 'i') },
    ];
  }

  // Execute query with pagination
  const result = await paginate(Payment, query, {
    page,
    limit,
    sort,
    populate: [
      { path: 'party.partyId', select: 'name phone email' },
      { path: 'processedBy', select: 'firstName lastName' },
    ],
  });

  return {
    success: true,
    data: result.data,
    pagination: result.pagination,
    message: 'Payments fetched successfully',
  };
});

// 3. GET SINGLE PAYMENT
export const getPaymentById = catchAsync(async (paymentId, shopId) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    deletedAt: null,
  })
    .populate('party.partyId', 'name phone email')
    .populate('reference.referenceId')
    .populate('processedBy', 'firstName lastName email')
    .populate('reconciliation.reconciledBy', 'firstName lastName');

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  return {
    success: true,
    data: payment,
    message: 'Payment fetched successfully',
  };
});

// 4. UPDATE PAYMENT (Only pending status)
export const updatePayment = catchAsync(async (paymentId, shopId, userId, updateData) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    deletedAt: null,
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  // Can only edit pending payments
  if (payment.status !== 'pending') {
    throw new BadRequestError('Cannot edit completed or reconciled payments');
  }

  // Update allowed fields
  Object.assign(payment, updateData);
  payment.updatedBy = userId;

  await payment.save();

  // Log activity
  await eventLogger.logFinancial(
    userId,
    payment.organizationId,
    shopId,
    'update',
    `Payment ${payment.paymentNumber} updated`,
    { paymentId: payment._id }
  );

  return {
    success: true,
    data: payment,
    message: 'Payment updated successfully',
  };
});

// 5. DELETE PAYMENT (Soft delete - only pending)
export const deletePayment = catchAsync(async (paymentId, shopId, userId, organizationId) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    deletedAt: null,
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  // Can only delete pending payments
  if (payment.status !== 'pending') {
    throw new BadRequestError('Cannot delete completed or reconciled payments');
  }

  // Soft delete
  await payment.softDelete();

  // Reverse payment status on sale/purchase
  if (payment.reference.referenceId) {
    await reverseReferencePaymentStatus(payment);
  }

  // Reverse party balance
  await reversePartyBalance(payment);

  // Log activity
  await eventLogger.logFinancial(
    userId,
    organizationId,
    shopId,
    'delete',
    `Payment ${payment.paymentNumber} cancelled`,
    { paymentId: payment._id, reason: 'Soft delete' }
  );

  return {
    success: true,
    message: 'Payment deleted successfully',
  };
});

// 6. UPDATE PAYMENT STATUS
export const updatePaymentStatus = catchAsync(
  async (paymentId, shopId, userId, status, reason = null) => {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    const oldStatus = payment.status;
    payment.status = status;
    payment.updatedBy = userId;

    if (reason) {
      payment.notes = payment.notes ? `${payment.notes}\n${reason}` : reason;
    }

    await payment.save();

    // Log activity
    await eventLogger.logFinancial(
      userId,
      payment.organizationId,
      shopId,
      'update_status',
      `Payment ${payment.paymentNumber} status changed from ${oldStatus} to ${status}`,
      { paymentId: payment._id, oldStatus, newStatus: status }
    );

    return {
      success: true,
      data: payment,
      message: 'Payment status updated successfully',
    };
  }
);

// 7. MARK PAYMENT AS COMPLETED
export const markAsCompleted = catchAsync(async (paymentId, shopId, userId) => {
  return await updatePaymentStatus(
    paymentId,
    shopId,
    userId,
    'completed',
    'Manually marked as completed'
  );
});

// 8. CANCEL PAYMENT
export const cancelPayment = catchAsync(async (paymentId, shopId, userId, reason) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    deletedAt: null,
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.status === 'cancelled') {
    throw new BadRequestError('Payment is already cancelled');
  }

  payment.status = 'cancelled';
  payment.notes = payment.notes
    ? `${payment.notes}\nCancellation reason: ${reason}`
    : `Cancellation reason: ${reason}`;
  payment.updatedBy = userId;

  await payment.save();

  // Reverse all updates
  if (payment.reference.referenceId) {
    await reverseReferencePaymentStatus(payment);
  }
  await reversePartyBalance(payment);

  // Log activity
  await eventLogger.logFinancial(
    userId,
    payment.organizationId,
    shopId,
    'cancel',
    `Payment ${payment.paymentNumber} cancelled`,
    { paymentId: payment._id, reason }
  );

  return {
    success: true,
    data: payment,
    message: 'Payment cancelled successfully',
  };
});

// 9. GET PENDING CHEQUES
export const getPendingCheques = catchAsync(async shopId => {
  const payments = await Payment.find({
    shopId,
    paymentMode: 'cheque',
    'paymentDetails.chequeDetails.chequeStatus': 'pending',
    deletedAt: null,
  })
    .sort({ 'paymentDetails.chequeDetails.chequeDate': 1 })
    .populate('party.partyId', 'name phone')
    .populate('processedBy', 'firstName lastName');

  return {
    success: true,
    data: payments,
    count: payments.length,
    message: 'Pending cheques fetched successfully',
  };
});

// 10. CLEAR CHEQUE
export const clearCheque = catchAsync(async (paymentId, shopId, userId, clearanceDate, notes) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    paymentMode: 'cheque',
    deletedAt: null,
  });

  if (!payment) {
    throw new NotFoundError('Cheque payment not found');
  }

  if (payment.paymentDetails.chequeDetails.chequeStatus === 'cleared') {
    throw new BadRequestError('Cheque is already cleared');
  }

  payment.paymentDetails.chequeDetails.chequeStatus = 'cleared';
  payment.paymentDetails.chequeDetails.clearanceDate = clearanceDate || new Date();
  payment.status = 'completed';
  payment.updatedBy = userId;

  if (notes) {
    payment.notes = payment.notes ? `${payment.notes}\n${notes}` : notes;
  }

  await payment.save();

  // Update party balance if not already updated
  await updatePartyBalance(payment);

  // Log activity
  await eventLogger.logFinancial(
    userId,
    payment.organizationId,
    shopId,
    'cheque_cleared',
    `Cheque ${payment.paymentDetails.chequeDetails.chequeNumber} cleared`,
    { paymentId: payment._id }
  );

  return {
    success: true,
    data: payment,
    message: 'Cheque cleared successfully',
  };
});

// 11. BOUNCE CHEQUE
export const bounceCheque = catchAsync(async (paymentId, shopId, userId, bounceReason, notes) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    paymentMode: 'cheque',
    deletedAt: null,
  });

  if (!payment) {
    throw new NotFoundError('Cheque payment not found');
  }

  payment.paymentDetails.chequeDetails.chequeStatus = 'bounced';
  payment.paymentDetails.chequeDetails.bounceReason = bounceReason;
  payment.status = 'failed';
  payment.updatedBy = userId;

  if (notes) {
    payment.notes = payment.notes ? `${payment.notes}\n${notes}` : notes;
  }

  await payment.save();

  // Reverse party balance
  await reversePartyBalance(payment);

  // Log activity
  await eventLogger.logFinancial(
    userId,
    payment.organizationId,
    shopId,
    'cheque_bounced',
    `Cheque ${payment.paymentDetails.chequeDetails.chequeNumber} bounced`,
    { paymentId: payment._id, reason: bounceReason }
  );

  // TODO: Send notification to party

  return {
    success: true,
    data: payment,
    message: 'Cheque marked as bounced',
  };
});

// 12. GET BOUNCED CHEQUES
export const getBouncedCheques = catchAsync(async shopId => {
  const payments = await Payment.find({
    shopId,
    paymentMode: 'cheque',
    'paymentDetails.chequeDetails.chequeStatus': 'bounced',
    deletedAt: null,
  })
    .sort({ paymentDate: -1 })
    .populate('party.partyId', 'name phone')
    .populate('processedBy', 'firstName lastName');

  return {
    success: true,
    data: payments,
    count: payments.length,
    message: 'Bounced cheques fetched successfully',
  };
});

// 13. GET CLEARED CHEQUES
export const getClearedCheques = catchAsync(async (shopId, startDate, endDate) => {
  const query = {
    shopId,
    paymentMode: 'cheque',
    'paymentDetails.chequeDetails.chequeStatus': 'cleared',
    deletedAt: null,
  };

  if (startDate || endDate) {
    query['paymentDetails.chequeDetails.clearanceDate'] = {};
    if (startDate) query['paymentDetails.chequeDetails.clearanceDate'].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query['paymentDetails.chequeDetails.clearanceDate'].$lte = end;
    }
  }

  const payments = await Payment.find(query)
    .sort({ 'paymentDetails.chequeDetails.clearanceDate': -1 })
    .populate('party.partyId', 'name phone');

  return {
    success: true,
    data: payments,
    count: payments.length,
    message: 'Cleared cheques fetched successfully',
  };
});

// 14. GET UNRECONCILED PAYMENTS
export const getUnreconciledPayments = catchAsync(async shopId => {
  const payments = await Payment.find({
    shopId,
    'reconciliation.isReconciled': false,
    status: 'completed',
    deletedAt: null,
  })
    .sort({ paymentDate: -1 })
    .populate('party.partyId', 'name phone')
    .populate('processedBy', 'firstName lastName');

  return {
    success: true,
    data: payments,
    count: payments.length,
    message: 'Unreconciled payments fetched successfully',
  };
});

// 15. RECONCILE PAYMENT
export const reconcilePayment = catchAsync(
  async (paymentId, shopId, userId, reconciledWith, discrepancy = 0, notes) => {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.reconciliation.isReconciled) {
      throw new BadRequestError('Payment is already reconciled');
    }

    payment.reconciliation.isReconciled = true;
    payment.reconciliation.reconciledAt = new Date();
    payment.reconciliation.reconciledBy = userId;
    payment.reconciliation.reconciledWith = reconciledWith;
    payment.reconciliation.discrepancy = discrepancy;
    payment.reconciliation.notes = notes;
    payment.updatedBy = userId;

    await payment.save();

    // Log activity
    await eventLogger.logFinancial(
      userId,
      payment.organizationId,
      shopId,
      'reconcile',
      `Payment ${payment.paymentNumber} reconciled with ${reconciledWith}`,
      { paymentId: payment._id, discrepancy }
    );

    return {
      success: true,
      data: payment,
      message: 'Payment reconciled successfully',
    };
  }
);

// 16. GET RECONCILIATION SUMMARY
export const getReconciliationSummary = catchAsync(async (shopId, startDate, endDate) => {
  const query = {
    shopId,
    deletedAt: null,
  };

  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) query.paymentDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.paymentDate.$lte = end;
    }
  }

  const [totalPayments, reconciledPayments, unreconciledPayments] = await Promise.all([
    Payment.countDocuments(query),
    Payment.countDocuments({ ...query, 'reconciliation.isReconciled': true }),
    Payment.countDocuments({
      ...query,
      'reconciliation.isReconciled': false,
      status: 'completed',
    }),
  ]);

  const [reconciledAmount, unreconciledAmount, totalDiscrepancy] = await Promise.all([
    Payment.aggregate([
      { $match: { ...query, 'reconciliation.isReconciled': true } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...query, 'reconciliation.isReconciled': false, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...query, 'reconciliation.isReconciled': true } },
      { $group: { _id: null, total: { $sum: '$reconciliation.discrepancy' } } },
    ]),
  ]);

  return {
    success: true,
    data: {
      totalPayments,
      reconciled: {
        count: reconciledPayments,
        amount: reconciledAmount[0]?.total || 0,
      },
      unreconciled: {
        count: unreconciledPayments,
        amount: unreconciledAmount[0]?.total || 0,
      },
      totalDiscrepancy: totalDiscrepancy[0]?.total || 0,
    },
    message: 'Reconciliation summary fetched successfully',
  };
});

// 17. GENERATE/GET RECEIPT
export const getReceipt = catchAsync(async (paymentId, shopId) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    deletedAt: null,
  })
    .populate('party.partyId')
    .populate('reference.referenceId')
    .populate('processedBy', 'firstName lastName');

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  // Mark receipt as generated
  if (!payment.receipt.receiptGenerated) {
    payment.receipt.receiptGenerated = true;
    payment.receipt.receiptNumber = payment.paymentNumber;
    await payment.save();
  }

  return {
    success: true,
    data: payment,
    message: 'Receipt fetched successfully',
  };
});

// 18. SEND RECEIPT
export const sendReceipt = catchAsync(async (paymentId, shopId, userId, method, recipient) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    deletedAt: null,
  })
    .populate('party.partyId')
    .populate('processedBy', 'firstName lastName');

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  // Update receipt sent info
  payment.receipt.receiptSentAt = new Date();
  payment.receipt.receiptSentTo = recipient;
  await payment.save();

  // TODO: Implement actual sending logic (email/sms/whatsapp)
  // This would integrate with notification service

  // Log activity
  await eventLogger.logFinancial(
    userId,
    payment.organizationId,
    shopId,
    'send_receipt',
    `Receipt sent via ${method} to ${recipient}`,
    { paymentId: payment._id, method, recipient }
  );

  return {
    success: true,
    message: `Receipt sent via ${method} successfully`,
  };
});

// 19. REGENERATE RECEIPT
export const regenerateReceipt = catchAsync(async (paymentId, shopId, userId) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    deletedAt: null,
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  // Reset receipt info
  payment.receipt.receiptGenerated = true;
  payment.receipt.receiptNumber = payment.paymentNumber;
  payment.receipt.receiptUrl = null; // Will be regenerated
  await payment.save();

  // Log activity
  await eventLogger.logFinancial(
    userId,
    payment.organizationId,
    shopId,
    'regenerate_receipt',
    `Receipt regenerated for payment ${payment.paymentNumber}`,
    { paymentId: payment._id }
  );

  return {
    success: true,
    data: payment,
    message: 'Receipt regenerated successfully',
  };
});

// 20. GET PARTY PAYMENTS
export const getPartyPayments = catchAsync(async (shopId, partyId, queryParams) => {
  const { page = 1, limit = 20, paymentType, status } = queryParams;

  const query = {
    shopId,
    'party.partyId': partyId,
    deletedAt: null,
  };

  if (paymentType) query.paymentType = paymentType;
  if (status) query.status = status;

  const result = await paginate(Payment, query, {
    page,
    limit,
    sort: '-paymentDate',
    populate: [{ path: 'processedBy', select: 'firstName lastName' }],
  });

  return {
    success: true,
    data: result.data,
    pagination: result.pagination,
    message: 'Party payments fetched successfully',
  };
});

// 21. GET PARTY PAYMENT SUMMARY
export const getPartyPaymentSummary = catchAsync(async (shopId, partyId) => {
  const payments = await Payment.find({
    shopId,
    'party.partyId': partyId,
    deletedAt: null,
  });

  const summary = {
    totalReceived: 0,
    totalPaid: 0,
    totalPending: 0,
    lastPaymentDate: null,
    paymentModeBreakdown: {},
  };

  payments.forEach(payment => {
    if (payment.transactionType === 'receipt') {
      if (payment.status === 'completed') {
        summary.totalReceived += payment.amount;
      } else if (payment.status === 'pending') {
        summary.totalPending += payment.amount;
      }
    } else {
      if (payment.status === 'completed') {
        summary.totalPaid += payment.amount;
      } else if (payment.status === 'pending') {
        summary.totalPending += payment.amount;
      }
    }

    // Payment mode breakdown
    if (!summary.paymentModeBreakdown[payment.paymentMode]) {
      summary.paymentModeBreakdown[payment.paymentMode] = {
        count: 0,
        amount: 0,
      };
    }
    summary.paymentModeBreakdown[payment.paymentMode].count++;
    summary.paymentModeBreakdown[payment.paymentMode].amount += payment.amount;

    // Last payment date
    if (!summary.lastPaymentDate || payment.paymentDate > summary.lastPaymentDate) {
      summary.lastPaymentDate = payment.paymentDate;
    }
  });

  return {
    success: true,
    data: summary,
    message: 'Party payment summary fetched successfully',
  };
});

// 22. GET CUSTOMER PAYMENTS
export const getCustomerPayments = catchAsync(async (shopId, customerId, queryParams) => {
  return await getPartyPayments(shopId, customerId, queryParams);
});

// 23. GET SUPPLIER PAYMENTS
export const getSupplierPayments = catchAsync(async (shopId, supplierId, queryParams) => {
  return await getPartyPayments(shopId, supplierId, queryParams);
});

// 24. GET PAYMENT BY MODE
export const getPaymentsByMode = catchAsync(async (shopId, startDate, endDate) => {
  const query = {
    shopId,
    status: 'completed',
    deletedAt: null,
  };

  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) query.paymentDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.paymentDate.$lte = end;
    }
  }

  const breakdown = await Payment.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$paymentMode',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  return {
    success: true,
    data: breakdown,
    message: 'Payment mode breakdown fetched successfully',
  };
});

// 25. GET CASH COLLECTION
export const getCashCollection = catchAsync(async (shopId, date) => {
  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const [received, paid] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          shopId,
          paymentMode: 'cash',
          transactionType: 'receipt',
          status: 'completed',
          paymentDate: { $gte: startOfDay, $lte: endOfDay },
          deletedAt: null,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          shopId,
          paymentMode: 'cash',
          transactionType: 'payment',
          status: 'completed',
          paymentDate: { $gte: startOfDay, $lte: endOfDay },
          deletedAt: null,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const totalReceived = received[0]?.total || 0;
  const totalPaid = paid[0]?.total || 0;

  return {
    success: true,
    data: {
      date: targetDate,
      cashReceived: {
        amount: totalReceived,
        count: received[0]?.count || 0,
      },
      cashPaid: {
        amount: totalPaid,
        count: paid[0]?.count || 0,
      },
      netCashBalance: totalReceived - totalPaid,
    },
    message: 'Cash collection summary fetched successfully',
  };
});

// 26. GET DIGITAL COLLECTION
export const getDigitalCollection = catchAsync(async (shopId, startDate, endDate) => {
  const query = {
    shopId,
    paymentMode: { $in: ['card', 'upi', 'wallet', 'bank_transfer'] },
    status: 'completed',
    deletedAt: null,
  };

  if (startDate || endDate) {
    query.paymentDate = {};
    if (startDate) query.paymentDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.paymentDate.$lte = end;
    }
  }

  const breakdown = await Payment.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$paymentMode',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  const total = breakdown.reduce((sum, item) => sum + item.totalAmount, 0);

  return {
    success: true,
    data: {
      breakdown,
      totalDigitalCollection: total,
    },
    message: 'Digital collection summary fetched successfully',
  };
});

// 27. GET PAYMENT ANALYTICS
export const getPaymentAnalytics = catchAsync(
  async (shopId, startDate, endDate, groupBy = 'day') => {
    const query = {
      shopId,
      status: 'completed',
      deletedAt: null,
    };

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = end;
      }
    }

    // Date format based on groupBy
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%V';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const analytics = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: '$paymentDate' } },
            transactionType: '$transactionType',
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Calculate summary
    const [totalReceipts, totalPayments, paymentModeBreakdown] = await Promise.all([
      Payment.aggregate([
        { $match: { ...query, transactionType: 'receipt' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { ...query, transactionType: 'payment' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$paymentMode',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const receiptsTotal = totalReceipts[0]?.total || 0;
    const paymentsTotal = totalPayments[0]?.total || 0;

    return {
      success: true,
      data: {
        analytics,
        summary: {
          totalReceipts: {
            amount: receiptsTotal,
            count: totalReceipts[0]?.count || 0,
          },
          totalPayments: {
            amount: paymentsTotal,
            count: totalPayments[0]?.count || 0,
          },
          netCashFlow: receiptsTotal - paymentsTotal,
          paymentModeBreakdown,
        },
      },
      message: 'Payment analytics fetched successfully',
    };
  }
);

// 28. GET PAYMENT DASHBOARD
export const getPaymentDashboard = catchAsync(async shopId => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [
    todayCollection,
    weekCollection,
    monthCollection,
    pendingChequesCount,
    unreconciledCount,
    recentPayments,
  ] = await Promise.all([
    getCashCollection(shopId, today),
    Payment.aggregate([
      {
        $match: {
          shopId,
          transactionType: 'receipt',
          status: 'completed',
          paymentDate: { $gte: weekAgo },
          deletedAt: null,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          shopId,
          transactionType: 'receipt',
          status: 'completed',
          paymentDate: { $gte: monthAgo },
          deletedAt: null,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.countDocuments({
      shopId,
      paymentMode: 'cheque',
      'paymentDetails.chequeDetails.chequeStatus': 'pending',
      deletedAt: null,
    }),
    Payment.countDocuments({
      shopId,
      'reconciliation.isReconciled': false,
      status: 'completed',
      deletedAt: null,
    }),
    Payment.find({ shopId, deletedAt: null })
      .sort({ paymentDate: -1 })
      .limit(10)
      .populate('party.partyId', 'name phone')
      .populate('processedBy', 'firstName lastName')
      .lean(),
  ]);

  return {
    success: true,
    data: {
      todayCollection: todayCollection.data,
      weekCollection: weekCollection[0]?.total || 0,
      monthCollection: monthCollection[0]?.total || 0,
      pendingChequesCount,
      unreconciledCount,
      recentPayments,
    },
    message: 'Payment dashboard fetched successfully',
  };
});

// 29. GET TODAY'S PAYMENTS
export const getTodayPayments = catchAsync(async shopId => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const payments = await Payment.find({
    shopId,
    paymentDate: { $gte: today, $lt: tomorrow },
    deletedAt: null,
  })
    .sort({ paymentDate: -1 })
    .populate('party.partyId', 'name phone')
    .populate('processedBy', 'firstName lastName');

  const totalByMode = await Payment.aggregate([
    {
      $match: {
        shopId,
        paymentDate: { $gte: today, $lt: tomorrow },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: '$paymentMode',
        count: { $sum: 1 },
        total: { $sum: '$amount' },
      },
    },
  ]);

  return {
    success: true,
    data: {
      payments,
      totalByMode,
    },
    message: "Today's payments fetched successfully",
  };
});

// 30. GET PENDING PAYMENTS
export const getPendingPayments = catchAsync(async shopId => {
  const payments = await Payment.find({
    shopId,
    status: 'pending',
    deletedAt: null,
  })
    .sort({ paymentDate: -1 })
    .populate('party.partyId', 'name phone')
    .populate('processedBy', 'firstName lastName');

  return {
    success: true,
    data: payments,
    count: payments.length,
    message: 'Pending payments fetched successfully',
  };
});

// 31. GET FAILED PAYMENTS
export const getFailedPayments = catchAsync(async shopId => {
  const payments = await Payment.find({
    shopId,
    status: 'failed',
    deletedAt: null,
  })
    .sort({ paymentDate: -1 })
    .populate('party.partyId', 'name phone')
    .populate('processedBy', 'firstName lastName');

  return {
    success: true,
    data: payments,
    count: payments.length,
    message: 'Failed payments fetched successfully',
  };
});

// 32. GET SALE PAYMENTS
export const getSalePayments = catchAsync(async (shopId, saleId) => {
  const payments = await Payment.find({
    shopId,
    'reference.referenceType': 'sale',
    'reference.referenceId': saleId,
    deletedAt: null,
  })
    .sort({ paymentDate: -1 })
    .populate('processedBy', 'firstName lastName');

  return {
    success: true,
    data: payments,
    count: payments.length,
    message: 'Sale payments fetched successfully',
  };
});

// 33. GET PURCHASE PAYMENTS
export const getPurchasePayments = catchAsync(async (shopId, purchaseId) => {
  const payments = await Payment.find({
    shopId,
    'reference.referenceType': 'purchase',
    'reference.referenceId': purchaseId,
    deletedAt: null,
  })
    .sort({ paymentDate: -1 })
    .populate('processedBy', 'firstName lastName');

  return {
    success: true,
    data: payments,
    count: payments.length,
    message: 'Purchase payments fetched successfully',
  };
});

// 34. SEARCH PAYMENTS
export const searchPayments = catchAsync(async (shopId, searchQuery, limit = 50) => {
  const regex = new RegExp(searchQuery, 'i');

  const payments = await Payment.find({
    shopId,
    deletedAt: null,
    $or: [
      { paymentNumber: regex },
      { 'party.partyName': regex },
      { transactionId: regex },
      { 'reference.referenceNumber': regex },
      { 'paymentDetails.chequeDetails.chequeNumber': regex },
      { 'paymentDetails.upiDetails.transactionId': regex },
    ],
  })
    .sort({ paymentDate: -1 })
    .limit(limit)
    .populate('party.partyId', 'name phone')
    .populate('processedBy', 'firstName lastName');

  return {
    success: true,
    data: payments,
    count: payments.length,
    message: 'Search results fetched successfully',
  };
});

// 35. GET PAYMENTS BY DATE RANGE
export const getPaymentsByDateRange = catchAsync(
  async (shopId, startDate, endDate, queryParams) => {
    const { page = 1, limit = 50 } = queryParams;

    const query = {
      shopId,
      deletedAt: null,
      paymentDate: {
        $gte: new Date(startDate),
        $lte: (() => {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return end;
        })(),
      },
    };

    const result = await paginate(Payment, query, {
      page,
      limit,
      sort: '-paymentDate',
      populate: [
        { path: 'party.partyId', select: 'name phone' },
        { path: 'processedBy', select: 'firstName lastName' },
      ],
    });

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: 'Payments by date range fetched successfully',
    };
  }
);

// 36. GET PAYMENTS BY AMOUNT RANGE
export const getPaymentsByAmountRange = catchAsync(
  async (shopId, minAmount, maxAmount, queryParams) => {
    const { page = 1, limit = 50 } = queryParams;

    const query = {
      shopId,
      deletedAt: null,
      amount: {
        $gte: parseFloat(minAmount),
        $lte: parseFloat(maxAmount),
      },
    };

    const result = await paginate(Payment, query, {
      page,
      limit,
      sort: '-amount',
      populate: [
        { path: 'party.partyId', select: 'name phone' },
        { path: 'processedBy', select: 'firstName lastName' },
      ],
    });

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: 'Payments by amount range fetched successfully',
    };
  }
);

// 37. BULK RECONCILE PAYMENTS
export const bulkReconcilePayments = catchAsync(
  async (shopId, userId, paymentIds, reconciledWith, notes) => {
    const payments = await Payment.find({
      _id: { $in: paymentIds },
      shopId,
      deletedAt: null,
    });

    if (payments.length === 0) {
      throw new NotFoundError('No valid payments found');
    }

    let reconciledCount = 0;

    for (const payment of payments) {
      if (!payment.reconciliation.isReconciled && payment.status === 'completed') {
        payment.reconciliation.isReconciled = true;
        payment.reconciliation.reconciledAt = new Date();
        payment.reconciliation.reconciledBy = userId;
        payment.reconciliation.reconciledWith = reconciledWith;
        payment.reconciliation.notes = notes;
        await payment.save();
        reconciledCount++;
      }
    }

    // Log activity
    await eventLogger.logFinancial(
      userId,
      payments[0].organizationId,
      shopId,
      'bulk_reconcile',
      `Bulk reconciled ${reconciledCount} payments`,
      { paymentIds, reconciledWith }
    );

    return {
      success: true,
      data: { reconciledCount, totalProvided: paymentIds.length },
      message: `Successfully reconciled ${reconciledCount} payments`,
    };
  }
);

// 38. BULK EXPORT PAYMENTS
export const bulkExportPayments = catchAsync(async (shopId, paymentIds, format) => {
  let payments;

  if (paymentIds && paymentIds.length > 0) {
    payments = await Payment.find({
      _id: { $in: paymentIds },
      shopId,
      deletedAt: null,
    })
      .populate('party.partyId', 'name phone')
      .populate('processedBy', 'firstName lastName')
      .lean();
  } else {
    payments = await Payment.find({ shopId, deletedAt: null })
      .sort({ paymentDate: -1 })
      .limit(1000)
      .populate('party.partyId', 'name phone')
      .populate('processedBy', 'firstName lastName')
      .lean();
  }

  // TODO: Implement actual export logic (CSV/Excel generation)
  // This would use libraries like xlsx or csv-writer

  return {
    success: true,
    data: payments,
    count: payments.length,
    format,
    message: `Export data prepared in ${format} format`,
  };
});

// 39. BULK PRINT RECEIPTS
export const bulkPrintReceipts = catchAsync(async (shopId, paymentIds) => {
  const payments = await Payment.find({
    _id: { $in: paymentIds },
    shopId,
    deletedAt: null,
  })
    .populate('party.partyId')
    .populate('processedBy', 'firstName lastName')
    .lean();

  if (payments.length === 0) {
    throw new NotFoundError('No valid payments found');
  }

  // TODO: Implement actual PDF generation for bulk receipts
  // This would combine all receipts into a single PDF

  return {
    success: true,
    data: payments,
    count: payments.length,
    message: 'Bulk receipt data prepared',
  };
});

// 40. APPROVE PAYMENT
export const approvePayment = catchAsync(async (paymentId, shopId, userId, notes) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    deletedAt: null,
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.approval.approvalStatus === 'approved') {
    throw new BadRequestError('Payment is already approved');
  }

  payment.approval.approvalStatus = 'approved';
  payment.approval.approvedBy = userId;
  payment.approval.approvedAt = new Date();
  if (notes) payment.notes = notes;
  payment.updatedBy = userId;

  await payment.save();

  // Log activity
  await eventLogger.logFinancial(
    userId,
    payment.organizationId,
    shopId,
    'approve',
    `Payment ${payment.paymentNumber} approved`,
    { paymentId: payment._id }
  );

  return {
    success: true,
    data: payment,
    message: 'Payment approved successfully',
  };
});

// 41. REJECT PAYMENT
export const rejectPayment = catchAsync(async (paymentId, shopId, userId, reason) => {
  const payment = await Payment.findOne({
    _id: paymentId,
    shopId,
    deletedAt: null,
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  payment.approval.approvalStatus = 'rejected';
  payment.approval.approvedBy = userId;
  payment.approval.approvedAt = new Date();
  payment.approval.rejectionReason = reason;
  payment.status = 'cancelled';
  payment.updatedBy = userId;

  await payment.save();

  // Log activity
  await eventLogger.logFinancial(
    userId,
    payment.organizationId,
    shopId,
    'reject',
    `Payment ${payment.paymentNumber} rejected: ${reason}`,
    { paymentId: payment._id, reason }
  );

  return {
    success: true,
    data: payment,
    message: 'Payment rejected successfully',
  };
});

// 42. PROCESS REFUND
export const processRefund = catchAsync(
  async (paymentId, shopId, organizationId, userId, refundData) => {
    const originalPayment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!originalPayment) {
      throw new NotFoundError('Original payment not found');
    }

    if (refundData.refundAmount > originalPayment.amount) {
      throw new ValidationError('Refund amount cannot exceed original payment amount');
    }

    // Create refund payment
    const refundNumber = await Payment.generatePaymentNumber(shopId, 'REF');

    const refundPayment = new Payment({
      organizationId,
      shopId,
      paymentNumber: refundNumber,
      paymentDate: new Date(),
      paymentType: 'refund',
      transactionType: originalPayment.transactionType === 'receipt' ? 'payment' : 'receipt',
      amount: refundData.refundAmount,
      paymentMode: refundData.refundMode,
      party: originalPayment.party,
      reference: originalPayment.reference,
      refund: {
        isRefund: true,
        originalPaymentId: originalPayment._id,
        refundReason: refundData.refundReason,
        refundedBy: userId,
      },
      status: 'completed',
      processedBy: userId,
      createdBy: userId,
    });

    await refundPayment.save();

    // Update original payment
    originalPayment.status = 'refunded';
    await originalPayment.save();

    // Update party balance
    await updatePartyBalance(refundPayment);

    // Update reference if exists
    if (refundPayment.reference.referenceId) {
      await updateReferencePaymentStatus(refundPayment);
    }

    // Log activity
    await eventLogger.logFinancial(
      userId,
      organizationId,
      shopId,
      'refund',
      `Refund ${refundNumber} processed for payment ${originalPayment.paymentNumber}`,
      { refundPaymentId: refundPayment._id, originalPaymentId: originalPayment._id }
    );

    return {
      success: true,
      data: refundPayment,
      message: 'Refund processed successfully',
    };
  }
);

// 43. GET REFUNDS
export const getRefunds = catchAsync(async shopId => {
  const refunds = await Payment.find({
    shopId,
    paymentType: 'refund',
    deletedAt: null,
  })
    .sort({ paymentDate: -1 })
    .populate('party.partyId', 'name phone')
    .populate('refund.originalPaymentId')
    .populate('processedBy', 'firstName lastName');

  return {
    success: true,
    data: refunds,
    count: refunds.length,
    message: 'Refunds fetched successfully',
  };
});

// Default export object for backward compatibility
export default {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  updatePaymentStatus,
  markAsCompleted,
  cancelPayment,
  getPendingCheques,
  clearCheque,
  bounceCheque,
  getBouncedCheques,
  getClearedCheques,
  getUnreconciledPayments,
  reconcilePayment,
  getReconciliationSummary,
  getReceipt,
  sendReceipt,
  regenerateReceipt,
  getPartyPayments,
  getPartyPaymentSummary,
  getCustomerPayments,
  getSupplierPayments,
  getPaymentsByMode,
  getCashCollection,
  getDigitalCollection,
  getPaymentAnalytics,
  getPaymentDashboard,
  getTodayPayments,
  getPendingPayments,
  getFailedPayments,
  getSalePayments,
  getPurchasePayments,
  searchPayments,
  getPaymentsByDateRange,
  getPaymentsByAmountRange,
  bulkReconcilePayments,
  bulkExportPayments,
  bulkPrintReceipts,
  approvePayment,
  rejectPayment,
  processRefund,
  getRefunds,
};
