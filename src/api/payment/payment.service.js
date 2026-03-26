// FILE: src/api/payment/payment.service.js
// Payment Service - EDA Implemented

import mongoose from 'mongoose';
import Payment from '../../models/Payment.js';
import { NotFoundError, ValidationError, BadRequestError } from '../../utils/AppError.js';
import eventLogger from '../../utils/eventLogger.js';
import logger from '../../utils/logger.js';
import { paginate } from '../../utils/pagination.js';
import eventBus from '../../eventBus.js';

// ─────────────────────────────────────────────
// CREATE PAYMENT
// ─────────────────────────────────────────────
export const createPayment = async (shopId, organizationId, userId, paymentData) => {
  try {
    // Idempotency check
    if (paymentData.idempotencyKey) {
      const existing = await Payment.findOne({
        shopId,
        idempotencyKey: paymentData.idempotencyKey,
      });
      if (existing) {
        return {
          success: true,
          data: existing,
          message: 'Payment already recorded',
        };
      }
    }

    const paymentNumber = await Payment.generatePaymentNumber(shopId, 'PAY');

    const payment = new Payment({
      organizationId,
      shopId,
      paymentNumber,
      paymentDate: new Date(),
      ...paymentData,
      processedBy: userId,
      createdBy:   userId,
    });

    // Status set karo mode ke hisaab se
    if (
      payment.paymentMode === 'cash' ||
      (payment.paymentMode === 'upi' && payment.transactionId)
    ) {
      payment.status = 'completed';
    }

    if (payment.paymentMode === 'cheque') {
      payment.status = 'pending';
      payment.paymentDetails.chequeDetails.chequeStatus = 'pending';
    }

    await payment.save();

    // ── EVENT EMIT ──────────────────────────
    // Sirf completed payments ke liye emit karo
    // cheque pending hai toh emit mat karo — clearCheque pe emit hoga
    if (payment.status === 'completed') {
      // reference.listener → sale/purchase paidAmount update
      // ledger.listener    → party + cash/bank entry
      eventBus.emit('PAYMENT_COMPLETED', { payment });
    }
    // ─────────────────────────────────────────

    await eventLogger.logFinancial(
      userId,
      organizationId,
      shopId,
      'create',
      `Payment ${paymentNumber} created - ${payment.transactionType} ₹${payment.amount}`,
      {
        paymentId:   payment._id,
        paymentNumber,
        amount:      payment.amount,
        partyId:     payment.party.partyId,
        paymentMode: payment.paymentMode,
      }
    );

    return {
      success: true,
      data:    payment,
      message: 'Payment recorded successfully',
    };
  } catch (error) {
    logger.error('Create payment error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET ALL PAYMENTS
// ─────────────────────────────────────────────
export const getAllPayments = async (shopId, queryParams) => {
  try {
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

    const query = { shopId, deletedAt: null };

    if (paymentType)     query.paymentType                    = paymentType;
    if (transactionType) query.transactionType                = transactionType;
    if (paymentMode)     query.paymentMode                    = paymentMode;
    if (status)          query.status                         = status;
    if (partyId)         query['party.partyId']               = partyId;
    if (partyType)       query['party.partyType']             = partyType;
    if (referenceType)   query['reference.referenceType']     = referenceType;
    if (referenceId)     query['reference.referenceId']       = referenceId;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = end;
      }
    }

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    if (search) {
      query.$or = [
        { paymentNumber: new RegExp(search, 'i') },
        { 'party.partyName': new RegExp(search, 'i') },
        { transactionId: new RegExp(search, 'i') },
        { 'reference.referenceNumber': new RegExp(search, 'i') },
      ];
    }

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
      success:    true,
      data:       result.data,
      pagination: result.pagination,
      message:    'Payments fetched successfully',
    };
  } catch (error) {
    logger.error('Get all payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PAYMENT BY ID
// ─────────────────────────────────────────────
export const getPaymentById = async (paymentId, shopId) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    })
      .populate('party.partyId', 'name phone email')
      .populate('reference.referenceId')
      .populate('processedBy', 'firstName lastName email')
      .populate('reconciliation.reconciledBy', 'firstName lastName');

    if (!payment) throw new NotFoundError('Payment not found');

    return {
      success: true,
      data:    payment,
      message: 'Payment fetched successfully',
    };
  } catch (error) {
    logger.error('Get payment by ID error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// UPDATE PAYMENT
// ─────────────────────────────────────────────
export const updatePayment = async (paymentId, shopId, userId, updateData) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.status !== 'pending') {
      throw new BadRequestError('Cannot edit completed or reconciled payments');
    }

    Object.assign(payment, updateData);
    payment.updatedBy = userId;
    await payment.save();

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
      data:    payment,
      message: 'Payment updated successfully',
    };
  } catch (error) {
    logger.error('Update payment error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// DELETE PAYMENT
// ─────────────────────────────────────────────
export const deletePayment = async (paymentId, shopId, userId, organizationId) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.status !== 'pending') {
      throw new BadRequestError('Cannot delete completed or reconciled payments');
    }

    await payment.softDelete();

    // ── EVENT EMIT ──────────────────────────
    // reference.listener → sale/purchase reverse
    // ledger.listener    → ledger entries reverse
    // payment.listener   → status cancelled
    eventBus.emit('PAYMENT_CANCELLED', {
      payment,
      reason: 'Soft delete',
      userId,
    });
    // ─────────────────────────────────────────

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
  } catch (error) {
    logger.error('Delete payment error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// UPDATE PAYMENT STATUS
// ─────────────────────────────────────────────
export const updatePaymentStatus = async (paymentId, shopId, userId, status, reason = null) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!payment) throw new NotFoundError('Payment not found');

    const oldStatus   = payment.status;
    payment.status    = status;
    payment.updatedBy = userId;

    if (reason) {
      payment.notes = payment.notes ? `${payment.notes}\n${reason}` : reason;
    }

    await payment.save();

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
      data:    payment,
      message: 'Payment status updated successfully',
    };
  } catch (error) {
    logger.error('Update payment status error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// MARK AS COMPLETED
// ─────────────────────────────────────────────
export const markAsCompleted = async (paymentId, shopId, userId) => {
  try {
    return await updatePaymentStatus(
      paymentId,
      shopId,
      userId,
      'completed',
      'Manually marked as completed'
    );
  } catch (error) {
    logger.error('Mark as completed error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// CANCEL PAYMENT
// ─────────────────────────────────────────────
export const cancelPayment = async (paymentId, shopId, userId, reason) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.status === 'cancelled') {
      throw new BadRequestError('Payment is already cancelled');
    }

    // Save original data before update
    const paymentSnapshot = payment.toObject();

    payment.status    = 'cancelled';
    payment.notes     = payment.notes
      ? `${payment.notes}\nCancellation reason: ${reason}`
      : `Cancellation reason: ${reason}`;
    payment.updatedBy = userId;
    await payment.save();

    // ── EVENT EMIT ──────────────────────────
    // payment.listener   → status + cheque update
    // reference.listener → sale/purchase reverse
    // ledger.listener    → ledger entries reverse
    eventBus.emit('PAYMENT_CANCELLED', {
      payment: paymentSnapshot,
      reason,
      userId,
    });
    // ─────────────────────────────────────────

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
      data:    payment,
      message: 'Payment cancelled successfully',
    };
  } catch (error) {
    logger.error('Cancel payment error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PENDING CHEQUES
// ─────────────────────────────────────────────
export const getPendingCheques = async (shopId) => {
  try {
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
      data:    payments,
      count:   payments.length,
      message: 'Pending cheques fetched successfully',
    };
  } catch (error) {
    logger.error('Get pending cheques error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// CLEAR CHEQUE
// ─────────────────────────────────────────────
export const clearCheque = async (paymentId, shopId, userId, clearanceDate, notes) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      paymentMode: 'cheque',
      deletedAt: null,
    });

    if (!payment) throw new NotFoundError('Cheque payment not found');

    if (payment.paymentDetails.chequeDetails.chequeStatus === 'cleared') {
      throw new BadRequestError('Cheque is already cleared');
    }

    await payment.save();

    // ── EVENT EMIT ──────────────────────────
    // payment.listener   → status completed, chequeStatus cleared
    // ledger.listener    → party + bank entry
    // reference.listener → sale/purchase paidAmount update
    eventBus.emit('CHEQUE_CLEARED', {
      payment,
      clearanceDate,
      notes,
      userId,
    });
    // ─────────────────────────────────────────

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
      data:    payment,
      message: 'Cheque cleared successfully',
    };
  } catch (error) {
    logger.error('Clear cheque error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// BOUNCE CHEQUE
// ─────────────────────────────────────────────
export const bounceCheque = async (paymentId, shopId, userId, bounceReason, notes) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      paymentMode: 'cheque',
      deletedAt: null,
    });

    if (!payment) throw new NotFoundError('Cheque payment not found');

    await payment.save();

    // ── EVENT EMIT ──────────────────────────
    // payment.listener   → status failed, chequeStatus bounced
    // ledger.listener    → reverse entries
    // reference.listener → sale/purchase reverse
    eventBus.emit('CHEQUE_BOUNCED', {
      payment,
      bounceReason,
      notes,
      userId,
    });
    // ─────────────────────────────────────────

    await eventLogger.logFinancial(
      userId,
      payment.organizationId,
      shopId,
      'cheque_bounced',
      `Cheque ${payment.paymentDetails.chequeDetails.chequeNumber} bounced`,
      { paymentId: payment._id, reason: bounceReason }
    );

    return {
      success: true,
      data:    payment,
      message: 'Cheque marked as bounced',
    };
  } catch (error) {
    logger.error('Bounce cheque error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET BOUNCED CHEQUES
// ─────────────────────────────────────────────
export const getBouncedCheques = async (shopId) => {
  try {
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
      data:    payments,
      count:   payments.length,
      message: 'Bounced cheques fetched successfully',
    };
  } catch (error) {
    logger.error('Get bounced cheques error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET CLEARED CHEQUES
// ─────────────────────────────────────────────
export const getClearedCheques = async (shopId, startDate, endDate) => {
  try {
    const query = {
      shopId,
      paymentMode: 'cheque',
      'paymentDetails.chequeDetails.chequeStatus': 'cleared',
      deletedAt: null,
    };

    if (startDate || endDate) {
      query['paymentDetails.chequeDetails.clearanceDate'] = {};
      if (startDate)
        query['paymentDetails.chequeDetails.clearanceDate'].$gte = new Date(startDate);
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
      data:    payments,
      count:   payments.length,
      message: 'Cleared cheques fetched successfully',
    };
  } catch (error) {
    logger.error('Get cleared cheques error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET UNRECONCILED PAYMENTS
// ─────────────────────────────────────────────
export const getUnreconciledPayments = async (shopId) => {
  try {
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
      data:    payments,
      count:   payments.length,
      message: 'Unreconciled payments fetched successfully',
    };
  } catch (error) {
    logger.error('Get unreconciled payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// RECONCILE PAYMENT
// ─────────────────────────────────────────────
export const reconcilePayment = async (paymentId, shopId, userId, reconciledWith, discrepancy = 0, notes) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.reconciliation.isReconciled) {
      throw new BadRequestError('Payment is already reconciled');
    }

    payment.reconciliation.isReconciled  = true;
    payment.reconciliation.reconciledAt  = new Date();
    payment.reconciliation.reconciledBy  = userId;
    payment.reconciliation.reconciledWith = reconciledWith;
    payment.reconciliation.discrepancy   = discrepancy;
    payment.reconciliation.notes         = notes;
    payment.updatedBy = userId;
    await payment.save();

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
      data:    payment,
      message: 'Payment reconciled successfully',
    };
  } catch (error) {
    logger.error('Reconcile payment error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET RECONCILIATION SUMMARY
// ─────────────────────────────────────────────
export const getReconciliationSummary = async (shopId, startDate, endDate) => {
  try {
    const query = { shopId, deletedAt: null };

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
          count:  reconciledPayments,
          amount: reconciledAmount[0]?.total || 0,
        },
        unreconciled: {
          count:  unreconciledPayments,
          amount: unreconciledAmount[0]?.total || 0,
        },
        totalDiscrepancy: totalDiscrepancy[0]?.total || 0,
      },
      message: 'Reconciliation summary fetched successfully',
    };
  } catch (error) {
    logger.error('Get reconciliation summary error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET RECEIPT
// ─────────────────────────────────────────────
export const getReceipt = async (paymentId, shopId) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    })
      .populate('party.partyId')
      .populate('reference.referenceId')
      .populate('processedBy', 'firstName lastName');

    if (!payment) throw new NotFoundError('Payment not found');

    if (!payment.receipt.receiptGenerated) {
      payment.receipt.receiptGenerated = true;
      payment.receipt.receiptNumber    = payment.paymentNumber;
      await payment.save();
    }

    return {
      success: true,
      data:    payment,
      message: 'Receipt fetched successfully',
    };
  } catch (error) {
    logger.error('Get receipt error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// SEND RECEIPT
// ─────────────────────────────────────────────
export const sendReceipt = async (paymentId, shopId, userId, method, recipient) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    })
      .populate('party.partyId')
      .populate('processedBy', 'firstName lastName');

    if (!payment) throw new NotFoundError('Payment not found');

    payment.receipt.receiptSentAt = new Date();
    payment.receipt.receiptSentTo = recipient;
    await payment.save();

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
  } catch (error) {
    logger.error('Send receipt error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// REGENERATE RECEIPT
// ─────────────────────────────────────────────
export const regenerateReceipt = async (paymentId, shopId, userId) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!payment) throw new NotFoundError('Payment not found');

    payment.receipt.receiptGenerated = true;
    payment.receipt.receiptNumber    = payment.paymentNumber;
    payment.receipt.receiptUrl       = null;
    await payment.save();

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
      data:    payment,
      message: 'Receipt regenerated successfully',
    };
  } catch (error) {
    logger.error('Regenerate receipt error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PARTY PAYMENTS
// ─────────────────────────────────────────────
export const getPartyPayments = async (shopId, partyId, queryParams) => {
  try {
    const { page = 1, limit = 20, paymentType, status } = queryParams;

    const query = {
      shopId,
      'party.partyId': partyId,
      deletedAt: null,
    };

    if (paymentType) query.paymentType = paymentType;
    if (status)      query.status      = status;

    const result = await paginate(Payment, query, {
      page,
      limit,
      sort: '-paymentDate',
      populate: [{ path: 'processedBy', select: 'firstName lastName' }],
    });

    return {
      success:    true,
      data:       result.data,
      pagination: result.pagination,
      message:    'Party payments fetched successfully',
    };
  } catch (error) {
    logger.error('Get party payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PARTY PAYMENT SUMMARY
// ─────────────────────────────────────────────
export const getPartyPaymentSummary = async (shopId, partyId) => {
  try {
    const payments = await Payment.find({
      shopId,
      'party.partyId': partyId,
      deletedAt: null,
    });

    const summary = {
      totalReceived:        0,
      totalPaid:            0,
      totalPending:         0,
      lastPaymentDate:      null,
      paymentModeBreakdown: {},
    };

    payments.forEach(payment => {
      if (payment.transactionType === 'receipt') {
        if (payment.status === 'completed')  summary.totalReceived += payment.amount;
        else if (payment.status === 'pending') summary.totalPending += payment.amount;
      } else {
        if (payment.status === 'completed')  summary.totalPaid    += payment.amount;
        else if (payment.status === 'pending') summary.totalPending += payment.amount;
      }

      if (!summary.paymentModeBreakdown[payment.paymentMode]) {
        summary.paymentModeBreakdown[payment.paymentMode] = { count: 0, amount: 0 };
      }
      summary.paymentModeBreakdown[payment.paymentMode].count++;
      summary.paymentModeBreakdown[payment.paymentMode].amount += payment.amount;

      if (!summary.lastPaymentDate || payment.paymentDate > summary.lastPaymentDate) {
        summary.lastPaymentDate = payment.paymentDate;
      }
    });

    return {
      success: true,
      data:    summary,
      message: 'Party payment summary fetched successfully',
    };
  } catch (error) {
    logger.error('Get party payment summary error:', error);
    throw error;
  }
};

export const getCustomerPayments = async (shopId, customerId, queryParams) => {
  try {
    return await getPartyPayments(shopId, customerId, queryParams);
  } catch (error) {
    logger.error('Get customer payments error:', error);
    throw error;
  }
};

export const getSupplierPayments = async (shopId, supplierId, queryParams) => {
  try {
    return await getPartyPayments(shopId, supplierId, queryParams);
  } catch (error) {
    logger.error('Get supplier payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PAYMENTS BY MODE
// ─────────────────────────────────────────────
export const getPaymentsByMode = async (shopId, startDate, endDate) => {
  try {
    const query = { shopId, status: 'completed', deletedAt: null };

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
          _id:         '$paymentMode',
          count:       { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    return {
      success: true,
      data:    breakdown,
      message: 'Payment mode breakdown fetched successfully',
    };
  } catch (error) {
    logger.error('Get payments by mode error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET CASH COLLECTION
// ─────────────────────────────────────────────
export const getCashCollection = async (shopId, date) => {
  try {
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
            paymentMode:     'cash',
            transactionType: 'receipt',
            status:          'completed',
            paymentDate:     { $gte: startOfDay, $lte: endOfDay },
            deletedAt:       null,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            shopId,
            paymentMode:     'cash',
            transactionType: 'payment',
            status:          'completed',
            paymentDate:     { $gte: startOfDay, $lte: endOfDay },
            deletedAt:       null,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalReceived = received[0]?.total || 0;
    const totalPaid     = paid[0]?.total     || 0;

    return {
      success: true,
      data: {
        date:           targetDate,
        cashReceived:   { amount: totalReceived, count: received[0]?.count || 0 },
        cashPaid:       { amount: totalPaid,     count: paid[0]?.count     || 0 },
        netCashBalance: totalReceived - totalPaid,
      },
      message: 'Cash collection summary fetched successfully',
    };
  } catch (error) {
    logger.error('Get cash collection error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET DIGITAL COLLECTION
// ─────────────────────────────────────────────
export const getDigitalCollection = async (shopId, startDate, endDate) => {
  try {
    const query = {
      shopId,
      paymentMode: { $in: ['card', 'upi', 'wallet', 'bank_transfer'] },
      status:      'completed',
      deletedAt:   null,
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
          _id:         '$paymentMode',
          count:       { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const total = breakdown.reduce((sum, item) => sum + item.totalAmount, 0);

    return {
      success: true,
      data:    { breakdown, totalDigitalCollection: total },
      message: 'Digital collection summary fetched successfully',
    };
  } catch (error) {
    logger.error('Get digital collection error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PAYMENT ANALYTICS
// ─────────────────────────────────────────────
export const getPaymentAnalytics = async (shopId, startDate, endDate, groupBy = 'day') => {
  try {
    const query = { shopId, status: 'completed', deletedAt: null };

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = end;
      }
    }

    let dateFormat;
    switch (groupBy) {
      case 'day':   dateFormat = '%Y-%m-%d'; break;
      case 'week':  dateFormat = '%Y-W%V';   break;
      case 'month': dateFormat = '%Y-%m';    break;
      default:      dateFormat = '%Y-%m-%d';
    }

    const analytics = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            date:            { $dateToString: { format: dateFormat, date: '$paymentDate' } },
            transactionType: '$transactionType',
          },
          count:       { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

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
            _id:         '$paymentMode',
            count:       { $sum: 1 },
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
          totalReceipts:       { amount: receiptsTotal, count: totalReceipts[0]?.count || 0 },
          totalPayments:       { amount: paymentsTotal, count: totalPayments[0]?.count || 0 },
          netCashFlow:         receiptsTotal - paymentsTotal,
          paymentModeBreakdown,
        },
      },
      message: 'Payment analytics fetched successfully',
    };
  } catch (error) {
    logger.error('Get payment analytics error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PAYMENT DASHBOARD
// ─────────────────────────────────────────────
export const getPaymentDashboard = async (shopId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo  = new Date(today);
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
            status:          'completed',
            paymentDate:     { $gte: weekAgo },
            deletedAt:       null,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            shopId,
            transactionType: 'receipt',
            status:          'completed',
            paymentDate:     { $gte: monthAgo },
            deletedAt:       null,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.countDocuments({
        shopId,
        paymentMode: 'cheque',
        'paymentDetails.chequeDetails.chequeStatus': 'pending',
        deletedAt:   null,
      }),
      Payment.countDocuments({
        shopId,
        'reconciliation.isReconciled': false,
        status:    'completed',
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
        todayCollection:    todayCollection.data,
        weekCollection:     weekCollection[0]?.total  || 0,
        monthCollection:    monthCollection[0]?.total || 0,
        pendingChequesCount,
        unreconciledCount,
        recentPayments,
      },
      message: 'Payment dashboard fetched successfully',
    };
  } catch (error) {
    logger.error('Get payment dashboard error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET TODAY PAYMENTS
// ─────────────────────────────────────────────
export const getTodayPayments = async (shopId) => {
  try {
    const today    = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const payments = await Payment.find({
      shopId,
      paymentDate: { $gte: today, $lt: tomorrow },
      deletedAt:   null,
    })
      .sort({ paymentDate: -1 })
      .populate('party.partyId', 'name phone')
      .populate('processedBy', 'firstName lastName');

    const totalByMode = await Payment.aggregate([
      {
        $match: {
          shopId,
          paymentDate: { $gte: today, $lt: tomorrow },
          deletedAt:   null,
        },
      },
      {
        $group: {
          _id:   '$paymentMode',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);

    return {
      success: true,
      data:    { payments, totalByMode },
      message: "Today's payments fetched successfully",
    };
  } catch (error) {
    logger.error("Get today's payments error:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PENDING PAYMENTS
// ─────────────────────────────────────────────
export const getPendingPayments = async (shopId) => {
  try {
    const payments = await Payment.find({
      shopId,
      status:    'pending',
      deletedAt: null,
    })
      .sort({ paymentDate: -1 })
      .populate('party.partyId', 'name phone')
      .populate('processedBy', 'firstName lastName');

    return {
      success: true,
      data:    payments,
      count:   payments.length,
      message: 'Pending payments fetched successfully',
    };
  } catch (error) {
    logger.error('Get pending payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET FAILED PAYMENTS
// ─────────────────────────────────────────────
export const getFailedPayments = async (shopId) => {
  try {
    const payments = await Payment.find({
      shopId,
      status:    'failed',
      deletedAt: null,
    })
      .sort({ paymentDate: -1 })
      .populate('party.partyId', 'name phone')
      .populate('processedBy', 'firstName lastName');

    return {
      success: true,
      data:    payments,
      count:   payments.length,
      message: 'Failed payments fetched successfully',
    };
  } catch (error) {
    logger.error('Get failed payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET SALE PAYMENTS
// ─────────────────────────────────────────────
export const getSalePayments = async (shopId, saleId) => {
  try {
    const payments = await Payment.find({
      shopId,
      'reference.referenceType': 'sale',
      'reference.referenceId':   saleId,
      deletedAt: null,
    })
      .sort({ paymentDate: -1 })
      .populate('processedBy', 'firstName lastName');

    return {
      success: true,
      data:    payments,
      count:   payments.length,
      message: 'Sale payments fetched successfully',
    };
  } catch (error) {
    logger.error('Get sale payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PURCHASE PAYMENTS
// ─────────────────────────────────────────────
export const getPurchasePayments = async (shopId, purchaseId) => {
  try {
    const payments = await Payment.find({
      shopId,
      'reference.referenceType': 'purchase',
      'reference.referenceId':   purchaseId,
      deletedAt: null,
    })
      .sort({ paymentDate: -1 })
      .populate('processedBy', 'firstName lastName');

    return {
      success: true,
      data:    payments,
      count:   payments.length,
      message: 'Purchase payments fetched successfully',
    };
  } catch (error) {
    logger.error('Get purchase payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// SEARCH PAYMENTS
// ─────────────────────────────────────────────
export const searchPayments = async (shopId, searchQuery, limit = 50) => {
  try {
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
      data:    payments,
      count:   payments.length,
      message: 'Search results fetched successfully',
    };
  } catch (error) {
    logger.error('Search payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PAYMENTS BY DATE RANGE
// ─────────────────────────────────────────────
export const getPaymentsByDateRange = async (shopId, startDate, endDate, queryParams) => {
  try {
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
      success:    true,
      data:       result.data,
      pagination: result.pagination,
      message:    'Payments by date range fetched successfully',
    };
  } catch (error) {
    logger.error('Get payments by date range error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET PAYMENTS BY AMOUNT RANGE
// ─────────────────────────────────────────────
export const getPaymentsByAmountRange = async (shopId, minAmount, maxAmount, queryParams) => {
  try {
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
      success:    true,
      data:       result.data,
      pagination: result.pagination,
      message:    'Payments by amount range fetched successfully',
    };
  } catch (error) {
    logger.error('Get payments by amount range error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// BULK RECONCILE PAYMENTS
// ─────────────────────────────────────────────
export const bulkReconcilePayments = async (shopId, userId, paymentIds, reconciledWith, notes) => {
  try {
    const payments = await Payment.find({
      _id:       { $in: paymentIds },
      shopId,
      deletedAt: null,
    });

    if (payments.length === 0) throw new NotFoundError('No valid payments found');

    let reconciledCount = 0;

    for (const payment of payments) {
      if (!payment.reconciliation.isReconciled && payment.status === 'completed') {
        payment.reconciliation.isReconciled  = true;
        payment.reconciliation.reconciledAt  = new Date();
        payment.reconciliation.reconciledBy  = userId;
        payment.reconciliation.reconciledWith = reconciledWith;
        payment.reconciliation.notes         = notes;
        await payment.save();
        reconciledCount++;
      }
    }

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
      data:    { reconciledCount, totalProvided: paymentIds.length },
      message: `Successfully reconciled ${reconciledCount} payments`,
    };
  } catch (error) {
    logger.error('Bulk reconcile payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// BULK EXPORT PAYMENTS
// ─────────────────────────────────────────────
export const bulkExportPayments = async (shopId, paymentIds, format) => {
  try {
    let payments;

    if (paymentIds && paymentIds.length > 0) {
      payments = await Payment.find({
        _id:       { $in: paymentIds },
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

    return {
      success: true,
      data:    payments,
      count:   payments.length,
      format,
      message: `Export data prepared in ${format} format`,
    };
  } catch (error) {
    logger.error('Bulk export payments error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// BULK PRINT RECEIPTS
// ─────────────────────────────────────────────
export const bulkPrintReceipts = async (shopId, paymentIds) => {
  try {
    const payments = await Payment.find({
      _id:       { $in: paymentIds },
      shopId,
      deletedAt: null,
    })
      .populate('party.partyId')
      .populate('processedBy', 'firstName lastName')
      .lean();

    if (payments.length === 0) throw new NotFoundError('No valid payments found');

    return {
      success: true,
      data:    payments,
      count:   payments.length,
      message: 'Bulk receipt data prepared',
    };
  } catch (error) {
    logger.error('Bulk print receipts error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// APPROVE PAYMENT
// ─────────────────────────────────────────────
export const approvePayment = async (paymentId, shopId, userId, notes) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.approval.approvalStatus === 'approved') {
      throw new BadRequestError('Payment is already approved');
    }

    payment.approval.approvalStatus = 'approved';
    payment.approval.approvedBy     = userId;
    payment.approval.approvedAt     = new Date();
    if (notes) payment.notes        = notes;
    payment.updatedBy = userId;
    await payment.save();

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
      data:    payment,
      message: 'Payment approved successfully',
    };
  } catch (error) {
    logger.error('Approve payment error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// REJECT PAYMENT
// ─────────────────────────────────────────────
export const rejectPayment = async (paymentId, shopId, userId, reason) => {
  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!payment) throw new NotFoundError('Payment not found');

    payment.approval.approvalStatus  = 'rejected';
    payment.approval.approvedBy      = userId;
    payment.approval.approvedAt      = new Date();
    payment.approval.rejectionReason = reason;
    payment.status    = 'cancelled';
    payment.updatedBy = userId;
    await payment.save();

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
      data:    payment,
      message: 'Payment rejected successfully',
    };
  } catch (error) {
    logger.error('Reject payment error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// PROCESS REFUND
// ─────────────────────────────────────────────
export const processRefund = async (paymentId, shopId, organizationId, userId, refundData) => {
  try {
    const originalPayment = await Payment.findOne({
      _id: paymentId,
      shopId,
      deletedAt: null,
    });

    if (!originalPayment) throw new NotFoundError('Original payment not found');

    if (refundData.refundAmount > originalPayment.amount) {
      throw new ValidationError('Refund amount cannot exceed original payment amount');
    }

    const refundNumber = await Payment.generatePaymentNumber(shopId, 'REF');

    const refundPayment = new Payment({
      organizationId,
      shopId,
      paymentNumber:   refundNumber,
      paymentDate:     new Date(),
      paymentType:     'refund',
      transactionType: originalPayment.transactionType === 'receipt' ? 'payment' : 'receipt',
      amount:          refundData.refundAmount,
      paymentMode:     refundData.refundMode,
      party:           originalPayment.party,
      reference:       originalPayment.reference,
      refund: {
        isRefund:          true,
        originalPaymentId: originalPayment._id,
        refundReason:      refundData.refundReason,
        refundedBy:        userId,
      },
      status:      'completed',
      processedBy: userId,
      createdBy:   userId,
    });

    await refundPayment.save();

    // ── EVENT EMIT ──────────────────────────
    // payment.listener   → original payment status refunded
    // ledger.listener    → party + cash/bank entry
    // reference.listener → sale/purchase reverse
    eventBus.emit('PAYMENT_REFUNDED', {
      refundPayment,
      originalPaymentId: originalPayment._id,
    });
    // ─────────────────────────────────────────

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
      data:    refundPayment,
      message: 'Refund processed successfully',
    };
  } catch (error) {
    logger.error('Process refund error:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// GET REFUNDS
// ─────────────────────────────────────────────
export const getRefunds = async (shopId) => {
  try {
    const refunds = await Payment.find({
      shopId,
      paymentType: 'refund',
      deletedAt:   null,
    })
      .sort({ paymentDate: -1 })
      .populate('party.partyId', 'name phone')
      .populate('refund.originalPaymentId')
      .populate('processedBy', 'firstName lastName');

    return {
      success: true,
      data:    refunds,
      count:   refunds.length,
      message: 'Refunds fetched successfully',
    };
  } catch (error) {
    logger.error('Get refunds error:', error);
    throw error;
  }
};