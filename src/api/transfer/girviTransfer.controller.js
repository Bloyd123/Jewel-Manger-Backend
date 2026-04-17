import { validationResult } from 'express-validator';
import * as girviTransferService from './girviTransfer.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
} from '../../utils/sendResponse.js';
import logger      from '../../utils/logger.js';
import eventLogger from '../../utils/eventLogger.js';

// ─── Transfer Out ──────────────────────────────────────────────────────────────
export const transferOut = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId, girviId } = req.params;
    const transferData        = req.body;

    const result = await girviTransferService.transferOut(
      girviId,
      shopId,
      transferData,
      req.user._id
    );

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'transfer_out',
      module:         'girvi_transfer',
      description:    `Girvi transferred: ${result.transfer.transferNumber} to ${result.transfer.toParty.name}`,
      level:          'info',
      status:         'success',
      metadata: {
        transferId:           result.transfer._id,
        transferNumber:       result.transfer.transferNumber,
        girviId,
        toPartyName:          result.transfer.toParty.name,
        partyPrincipalAmount: result.transfer.partyPrincipalAmount,
        partyInterestRate:    result.transfer.partyInterestRate,
        partyInterestType:    result.transfer.partyInterestType,
      },
      ipAddress: req.ip,
    });

    logger.info('Girvi transferred out', {
      transferId:     result.transfer._id,
      transferNumber: result.transfer.transferNumber,
      girviId,
      shopId,
      userId:         req.user._id,
    });

    return sendCreated(res, 'Girvi transferred successfully', {
      transfer:     result.transfer,
      updatedGirvi: result.updatedGirvi,
    });
  } catch (error) {
    logger.error('Error transferring girvi', {
      error:   error.message,
      girviId: req.params.girviId,
      shopId:  req.params.shopId,
    });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to transfer girvi', error);
  }
};

// ─── Transfer Return ───────────────────────────────────────────────────────────
export const transferReturn = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId, girviId, transferId } = req.params;
    const returnData                      = req.body;

    const result = await girviTransferService.transferReturn(
      girviId,
      transferId,
      shopId,
      returnData,
      req.user._id
    );

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'transfer_return',
      module:         'girvi_transfer',
      description:    `Transfer returned: ${result.transfer.transferNumber}`,
      level:          'info',
      status:         'success',
      metadata: {
        transferId,
        transferNumber:      result.transfer.transferNumber,
        girviId,
        partyInterestCharged: result.partySummary.partyInterestCharged,
        returnAmount:         result.partySummary.returnAmount,
        partyDays:            result.partySummary.partyDays,
      },
      ipAddress: req.ip,
    });

    logger.info('Girvi transfer returned', {
      transferId,
      girviId,
      shopId,
      userId: req.user._id,
    });

    return sendSuccess(res, 200, 'Transfer returned successfully', {
      transfer:     result.transfer,
      updatedGirvi: result.updatedGirvi,
      partySummary: result.partySummary,
    });
  } catch (error) {
    logger.error('Error returning transfer', {
      error:      error.message,
      transferId: req.params.transferId,
      girviId:    req.params.girviId,
    });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to return transfer', error);
  }
};

// ─── Get Transfers for Girvi ───────────────────────────────────────────────────
export const getTransfersByGirvi = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId, girviId } = req.params;
    const {
      page = 1, limit = 20, sort = '-transferDate',
      status, transferType,
    } = req.query;

    const result = await girviTransferService.getTransfersByGirvi(
      girviId,
      shopId,
      { status, transferType },
      { page: parseInt(page), limit: parseInt(limit), sort }
    );

    return sendSuccess(res, 200, 'Transfers fetched successfully', {
      transfers: result.data,
    }, {
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching transfers', {
      error:   error.message,
      girviId: req.params.girviId,
    });

    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);

    return sendInternalError(res, 'Failed to fetch transfers', error);
  }
};

// ─── Get Single Transfer ───────────────────────────────────────────────────────
export const getTransferById = async (req, res) => {
  try {
    const { shopId, girviId, transferId } = req.params;

    const transfer = await girviTransferService.getTransferById(transferId, girviId, shopId);

    return sendSuccess(res, 200, 'Transfer fetched successfully', { transfer });
  } catch (error) {
    logger.error('Error fetching transfer', {
      error:      error.message,
      transferId: req.params.transferId,
    });

    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);

    return sendInternalError(res, 'Failed to fetch transfer', error);
  }
};

// ─── Get All Shop Transfers ────────────────────────────────────────────────────
export const getShopTransfers = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId } = req.params;
    const {
      page = 1, limit = 20, sort = '-transferDate',
      status, transferType,
      startDate, endDate,
    } = req.query;

    const result = await girviTransferService.getShopTransfers(
      shopId,
      { status, transferType, startDate, endDate },
      { page: parseInt(page), limit: parseInt(limit), sort }
    );

    return sendSuccess(res, 200, 'Transfers fetched successfully', {
      transfers: result.data,
      summary:   result.summary,
    }, {
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching shop transfers', {
      error:  error.message,
      shopId: req.params.shopId,
    });

    return sendInternalError(res, 'Failed to fetch transfers', error);
  }
};

// ─── Calculate Party Interest Preview ─────────────────────────────────────────
export const calculatePartyInterest = async (req, res) => {
  try {
    const { shopId, girviId, transferId } = req.params;
    const { toDate } = req.query;

    const calculation = await girviTransferService.calculatePartyInterest(
      transferId,
      girviId,
      shopId,
      toDate
    );

    return sendSuccess(res, 200, 'Party interest calculated successfully', { calculation });
  } catch (error) {
    logger.error('Error calculating party interest', {
      error:      error.message,
      transferId: req.params.transferId,
    });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to calculate party interest', error);
  }
};

// ─── Cancel Transfer ───────────────────────────────────────────────────────────
export const cancelTransfer = async (req, res) => {
  try {
    const { shopId, girviId, transferId } = req.params;

    const transfer = await girviTransferService.cancelTransfer(
      transferId,
      girviId,
      shopId,
      req.user._id
    );

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'cancel_transfer',
      module:         'girvi_transfer',
      description:    `Transfer cancelled: ${transfer.transferNumber}`,
      level:          'warn',
      status:         'success',
      metadata:       { transferId, girviId },
      ipAddress:      req.ip,
    });

    return sendSuccess(res, 200, 'Transfer cancelled successfully', { transfer });
  } catch (error) {
    logger.error('Error cancelling transfer', {
      error:      error.message,
      transferId: req.params.transferId,
    });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to cancel transfer', error);
  }
};

export default {
  transferOut,
  transferReturn,
  getTransfersByGirvi,
  getTransferById,
  getShopTransfers,
  calculatePartyInterest,
  cancelTransfer,
};