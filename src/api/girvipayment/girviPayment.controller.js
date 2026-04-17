import { validationResult } from 'express-validator';
import * as girviPaymentService from './girviPayment.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
} from '../../utils/sendResponse.js';
import logger      from '../../utils/logger.js';
import eventLogger from '../../utils/eventLogger.js';

// ─── Add Payment ───────────────────────────────────────────────────────────────
export const addPayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId, girviId } = req.params;
    const paymentData         = req.body;

    const result = await girviPaymentService.addPayment(
      girviId,
      shopId,
      paymentData,
      req.user._id
    );

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'create',
      module:         'girvi_payment',
      description:    `Payment added: ${result.payment.receiptNumber}`,
      level:          'info',
      status:         'success',
      metadata: {
        paymentId:         result.payment._id,
        receiptNumber:     result.payment.receiptNumber,
        girviId,
        paymentType:       result.payment.paymentType,
        interestReceived:  result.payment.interestReceived,
        principalReceived: result.payment.principalReceived,
        discountGiven:     result.payment.discountGiven,
        netAmountReceived: result.payment.netAmountReceived,
      },
      ipAddress: req.ip,
    });

    logger.info('Girvi payment added', {
      paymentId:     result.payment._id,
      receiptNumber: result.payment.receiptNumber,
      girviId,
      shopId,
      userId:        req.user._id,
    });

    return sendCreated(res, 'Payment added successfully', {
      payment:      result.payment,
      updatedGirvi: result.updatedGirvi,
    });
  } catch (error) {
    logger.error('Error adding girvi payment', {
      error:   error.message,
      girviId: req.params.girviId,
      shopId:  req.params.shopId,
    });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to add payment', error);
  }
};

// ─── Get Payments for Girvi ────────────────────────────────────────────────────
export const getPaymentsByGirvi = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId, girviId } = req.params;
    const {
      page = 1, limit = 20, sort = '-paymentDate',
      paymentType, paymentMode,
      startDate, endDate,
    } = req.query;

    const filters = { paymentType, paymentMode, startDate, endDate };

    const paginationOptions = {
      page:  parseInt(page),
      limit: parseInt(limit),
      sort,
    };

    const result = await girviPaymentService.getPaymentsByGirvi(
      girviId,
      shopId,
      filters,
      paginationOptions
    );

    return sendSuccess(res, 200, 'Payments fetched successfully', {
      payments: result.data,
      summary:  result.summary,
    }, {
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching girvi payments', {
      error:   error.message,
      girviId: req.params.girviId,
    });

    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);

    return sendInternalError(res, 'Failed to fetch payments', error);
  }
};

// ─── Get Single Payment ────────────────────────────────────────────────────────
export const getPaymentById = async (req, res) => {
  try {
    const { shopId, girviId, paymentId } = req.params;

    const payment = await girviPaymentService.getPaymentById(paymentId, girviId, shopId);

    return sendSuccess(res, 200, 'Payment fetched successfully', { payment });
  } catch (error) {
    logger.error('Error fetching payment', {
      error:     error.message,
      paymentId: req.params.paymentId,
    });

    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);

    return sendInternalError(res, 'Failed to fetch payment', error);
  }
};

// ─── Get All Shop Payments ─────────────────────────────────────────────────────
export const getShopPayments = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId } = req.params;
    const {
      page = 1, limit = 20, sort = '-paymentDate',
      paymentType, paymentMode, customerId,
      startDate, endDate,
    } = req.query;

    const filters = {
      paymentType, paymentMode,
      customerId, startDate, endDate,
    };

    const paginationOptions = {
      page:  parseInt(page),
      limit: parseInt(limit),
      sort,
    };

    const result = await girviPaymentService.getShopPayments(shopId, filters, paginationOptions);

    return sendSuccess(res, 200, 'Payments fetched successfully', {
      payments: result.data,
      summary:  result.summary,
    }, {
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching shop payments', {
      error:  error.message,
      shopId: req.params.shopId,
    });

    return sendInternalError(res, 'Failed to fetch payments', error);
  }
};

// ─── Delete Payment ────────────────────────────────────────────────────────────
export const deletePayment = async (req, res) => {
  try {
    const { shopId, girviId, paymentId } = req.params;

    const payment = await girviPaymentService.deletePayment(
      paymentId,
      girviId,
      shopId,
      req.user._id
    );

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'delete',
      module:         'girvi_payment',
      description:    `Payment deleted: ${payment.receiptNumber}`,
      level:          'warn',
      status:         'success',
      metadata: {
        paymentId:     payment._id,
        receiptNumber: payment.receiptNumber,
        girviId,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, 200, 'Payment deleted successfully', { payment });
  } catch (error) {
    logger.error('Error deleting payment', {
      error:     error.message,
      paymentId: req.params.paymentId,
    });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to delete payment', error);
  }
};

export default {
  addPayment,
  getPaymentsByGirvi,
  getPaymentById,
  getShopPayments,
  deletePayment,
};