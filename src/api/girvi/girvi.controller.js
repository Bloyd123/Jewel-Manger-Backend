import { validationResult } from 'express-validator';
import * as girviService from './girvi.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  sendInternalError,
} from '../../utils/sendResponse.js';
import logger       from '../../utils/logger.js';
import eventLogger  from '../../utils/eventLogger.js';

// ─── Create Girvi (Jama) ───────────────────────────────────────────────────────
export const createGirvi = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId }  = req.params;
    const girviData   = req.body;

    const girvi = await girviService.createGirvi(shopId, girviData, req.user._id);

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'create',
      module:         'girvi',
      description:    `Girvi jama: ${girvi.girviNumber}`,
      level:          'info',
      status:         'success',
      metadata: {
        girviId:         girvi._id,
        girviNumber:     girvi.girviNumber,
        customerId:      girvi.customerId,
        principalAmount: girvi.principalAmount,
      },
      ipAddress: req.ip,
    });

    logger.info('Girvi created', {
      girviId:     girvi._id,
      girviNumber: girvi.girviNumber,
      shopId,
      userId:      req.user._id,
    });

    return sendCreated(res, 'Girvi created successfully', { girvi });
  } catch (error) {
    logger.error('Error creating girvi', { error: error.message, shopId: req.params.shopId });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to create girvi', error);
  }
};

// ─── Get All Girvis ────────────────────────────────────────────────────────────
export const getGirvis = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId } = req.params;
    const {
      page = 1, limit = 20, sort = '-girviDate',
      status, customerId, search,
      startDate, endDate, overdueOnly,
    } = req.query;

    const filters = {
      status, customerId, search,
      startDate, endDate,
      overdueOnly: overdueOnly === 'true',
    };

    const paginationOptions = {
      page:  parseInt(page),
      limit: parseInt(limit),
      sort,
    };

    const result = await girviService.getGirvis(shopId, filters, paginationOptions);
    const stats  = await girviService.getGirviStatistics(shopId);

    return sendSuccess(res, 200, 'Girvis fetched successfully', {
      girvis: result.data,
      stats,
    }, {
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching girvis', { error: error.message, shopId: req.params.shopId });
    return sendInternalError(res, 'Failed to fetch girvis', error);
  }
};

// ─── Get Girvi By ID ───────────────────────────────────────────────────────────
export const getGirviById = async (req, res) => {
  try {
    const { shopId, girviId } = req.params;

    const girvi = await girviService.getGirviById(girviId, shopId);

    return sendSuccess(res, 200, 'Girvi fetched successfully', { girvi });
  } catch (error) {
    logger.error('Error fetching girvi', { error: error.message, girviId: req.params.girviId });

    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);

    return sendInternalError(res, 'Failed to fetch girvi', error);
  }
};

// ─── Update Girvi ──────────────────────────────────────────────────────────────
export const updateGirvi = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId, girviId } = req.params;
    const updateData          = req.body;

    const girvi = await girviService.updateGirvi(girviId, shopId, updateData, req.user._id);

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'update',
      module:         'girvi',
      description:    `Updated girvi: ${girvi.girviNumber}`,
      level:          'info',
      status:         'success',
      metadata:       { girviId: girvi._id, girviNumber: girvi.girviNumber },
      ipAddress:      req.ip,
    });

    return sendSuccess(res, 200, 'Girvi updated successfully', { girvi });
  } catch (error) {
    logger.error('Error updating girvi', { error: error.message, girviId: req.params.girviId });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to update girvi', error);
  }
};

// ─── Get Interest Calculation ──────────────────────────────────────────────────
export const getInterestCalculation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId, girviId } = req.params;
    const { toDate, interestType } = req.query;

    const calculation = await girviService.getInterestCalculation(girviId, shopId, {
      toDate,
      interestType,
    });

    return sendSuccess(res, 200, 'Interest calculated successfully', { calculation });
  } catch (error) {
    logger.error('Error calculating interest', { error: error.message, girviId: req.params.girviId });

    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);

    return sendInternalError(res, 'Failed to calculate interest', error);
  }
};

// ─── Release Girvi ─────────────────────────────────────────────────────────────
export const releaseGirvi = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId, girviId } = req.params;
    const releaseData         = req.body;

    const result = await girviService.releaseGirvi(girviId, shopId, releaseData, req.user._id);

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'release',
      module:         'girvi',
      description:    `Girvi released: ${result.girvi.girviNumber}`,
      level:          'info',
      status:         'success',
      metadata: {
        girviId:            result.girvi._id,
        girviNumber:        result.girvi.girviNumber,
        netAmountReceived:  result.releaseSummary.netAmountReceived,
        interestReceived:   result.releaseSummary.totalInterestReceived,
        principalReceived:  result.releaseSummary.totalPrincipalReceived,
        discountGiven:      result.releaseSummary.totalDiscountGiven,
      },
      ipAddress: req.ip,
    });

    logger.info('Girvi released', {
      girviId:     result.girvi._id,
      girviNumber: result.girvi.girviNumber,
      shopId,
      userId:      req.user._id,
    });

    return sendSuccess(res, 200, 'Girvi released successfully', {
      girvi:          result.girvi,
      payment:        result.payment,
      releaseSummary: result.releaseSummary,
    });
  } catch (error) {
    logger.error('Error releasing girvi', { error: error.message, girviId: req.params.girviId });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to release girvi', error);
  }
};

// ─── Partial Release ───────────────────────────────────────────────────────────
export const partialRelease = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId, girviId } = req.params;
    const releaseData         = req.body;

    const result = await girviService.partialRelease(girviId, shopId, releaseData, req.user._id);

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'partial_release',
      module:         'girvi',
      description:    `Partial release: ${result.girvi.girviNumber} — ${result.partialReleaseSummary.releasedItems.length} items released`,
      level:          'info',
      status:         'success',
      metadata: {
        girviId,
        girviNumber:       result.girvi.girviNumber,
        releasedItems:     result.partialReleaseSummary.releasedItems,
        principalPaid:     result.partialReleaseSummary.principalPaid,
        interestPaid:      result.partialReleaseSummary.interestPaid,
        principalAfter:    result.partialReleaseSummary.principalAfter,
        remainingItems:    result.partialReleaseSummary.remainingItemsValue,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, 200, 'Partial release successful', {
      girvi:                result.girvi,
      payment:              result.payment,
      partialReleaseSummary: result.partialReleaseSummary,
    });
  } catch (error) {
    logger.error('Error in partial release', { error: error.message, girviId: req.params.girviId });
    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);
    return sendInternalError(res, 'Failed to process partial release', error);
  }
};

// ─── Renewal ───────────────────────────────────────────────────────────────────
export const renewGirvi = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId, girviId } = req.params;
    const renewalData         = req.body;

    const result = await girviService.renewGirvi(girviId, shopId, renewalData, req.user._id);

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'renewal',
      module:         'girvi',
      description:    `Girvi renewed: ${result.girvi.girviNumber} — new due date: ${result.renewalSummary.newDueDate}`,
      level:          'info',
      status:         'success',
      metadata: {
        girviId,
        girviNumber:    result.girvi.girviNumber,
        interestPaid:   result.renewalSummary.interestPaid,
        principalPaid:  result.renewalSummary.principalPaid,
        newPrincipal:   result.renewalSummary.newPrincipal,
        newDueDate:     result.renewalSummary.newDueDate,
        renewalCount:   result.renewalSummary.renewalCount,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, 200, 'Girvi renewed successfully', {
      girvi:         result.girvi,
      payment:       result.payment,
      renewalSummary: result.renewalSummary,
    });
  } catch (error) {
    logger.error('Error renewing girvi', { error: error.message, girviId: req.params.girviId });
    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);
    return sendInternalError(res, 'Failed to renew girvi', error);
  }
};

export const deleteGirvi = async (req, res) => {
  try {
    const { shopId, girviId } = req.params;

    const girvi = await girviService.deleteGirvi(girviId, shopId, req.user._id);

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'delete',
      module:         'girvi',
      description:    `Deleted girvi: ${girvi.girviNumber}`,
      level:          'warn',
      status:         'success',
      metadata:       { girviId: girvi._id, girviNumber: girvi.girviNumber },
      ipAddress:      req.ip,
    });

    return sendSuccess(res, 200, 'Girvi deleted successfully', { girvi });
  } catch (error) {
    logger.error('Error deleting girvi', { error: error.message, girviId: req.params.girviId });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to delete girvi', error);
  }
};

// ─── Get Statistics ────────────────────────────────────────────────────────────
export const getGirviStatistics = async (req, res) => {
  try {
    const { shopId } = req.params;

    const stats = await girviService.getGirviStatistics(shopId);

    return sendSuccess(res, 200, 'Statistics fetched successfully', { stats });
  } catch (error) {
    logger.error('Error fetching girvi stats', { error: error.message, shopId: req.params.shopId });
    return sendInternalError(res, 'Failed to fetch statistics', error);
  }
};

export default {
  createGirvi,
  getGirvis,
  getGirviById,
  updateGirvi,
  getInterestCalculation,
  releaseGirvi,
  deleteGirvi,
  getGirviStatistics,
};