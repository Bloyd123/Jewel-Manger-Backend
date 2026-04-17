import { validationResult } from 'express-validator';
import * as cashbookService from './girviCashbook.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
} from '../../utils/sendResponse.js';
import logger      from '../../utils/logger.js';
import eventLogger from '../../utils/eventLogger.js';

// ─── Create Manual Entry ───────────────────────────────────────────────────────
export const createManualEntry = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId }  = req.params;
    const entryData   = req.body;

    const entry = await cashbookService.createManualEntry(shopId, entryData, req.user._id);

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'create',
      module:         'girvi_cashbook',
      description:    `Manual cashbook entry: ${entry.entryNumber} (${entry.flowType}: ₹${entry.amount})`,
      level:          'info',
      status:         'success',
      metadata: {
        entryId:     entry._id,
        entryNumber: entry.entryNumber,
        entryType:   entry.entryType,
        flowType:    entry.flowType,
        amount:      entry.amount,
      },
      ipAddress: req.ip,
    });

    return sendCreated(res, 'Cashbook entry created successfully', { entry });
  } catch (error) {
    logger.error('Error creating cashbook entry', {
      error:  error.message,
      shopId: req.params.shopId,
    });

    if (error.name === 'NotFoundError')   return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);

    return sendInternalError(res, 'Failed to create entry', error);
  }
};

// ─── Get Cashbook Entries ──────────────────────────────────────────────────────
export const getCashbookEntries = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId } = req.params;
    const {
      page = 1, limit = 50, sort = '-entryDate',
      entryType, flowType, paymentMode,
      customerId, girviId,
      startDate, endDate,
    } = req.query;

    const filters = {
      entryType, flowType, paymentMode,
      customerId, girviId,
      startDate, endDate,
    };

    const paginationOptions = {
      page:  parseInt(page),
      limit: parseInt(limit),
      sort,
    };

    const result = await cashbookService.getCashbookEntries(shopId, filters, paginationOptions);

    return sendSuccess(res, 200, 'Cashbook entries fetched successfully', {
      entries:       result.data,
      periodSummary: result.periodSummary,
    }, {
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching cashbook entries', {
      error:  error.message,
      shopId: req.params.shopId,
    });

    return sendInternalError(res, 'Failed to fetch cashbook entries', error);
  }
};

// ─── Get Single Entry ──────────────────────────────────────────────────────────
export const getEntryById = async (req, res) => {
  try {
    const { shopId, entryId } = req.params;

    const entry = await cashbookService.getEntryById(entryId, shopId);

    return sendSuccess(res, 200, 'Entry fetched successfully', { entry });
  } catch (error) {
    logger.error('Error fetching entry', { error: error.message, entryId: req.params.entryId });

    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);

    return sendInternalError(res, 'Failed to fetch entry', error);
  }
};

// ─── Get Daily Summary ─────────────────────────────────────────────────────────
export const getDailySummary = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId } = req.params;
    const { date }   = req.query;

    const summary = await cashbookService.getDailySummary(
      shopId,
      date ? new Date(date) : new Date()
    );

    return sendSuccess(res, 200, 'Daily summary fetched successfully', { summary });
  } catch (error) {
    logger.error('Error fetching daily summary', {
      error:  error.message,
      shopId: req.params.shopId,
    });

    return sendInternalError(res, 'Failed to fetch daily summary', error);
  }
};

// ─── Get Monthly Summary ───────────────────────────────────────────────────────
export const getMonthlySummary = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendBadRequest(res, 'Validation failed', errors.array());

    const { shopId }    = req.params;
    const now           = new Date();
    const year          = parseInt(req.query.year  || now.getFullYear());
    const month         = parseInt(req.query.month || now.getMonth() + 1);

    const summary = await cashbookService.getMonthlySummary(shopId, year, month);

    return sendSuccess(res, 200, 'Monthly summary fetched successfully', { summary });
  } catch (error) {
    logger.error('Error fetching monthly summary', {
      error:  error.message,
      shopId: req.params.shopId,
    });

    return sendInternalError(res, 'Failed to fetch monthly summary', error);
  }
};

// ─── Get Yearly Summary ────────────────────────────────────────────────────────
export const getYearlySummary = async (req, res) => {
  try {
    const { shopId } = req.params;
    const year       = parseInt(req.query.year || new Date().getFullYear());

    const summary = await cashbookService.getYearlySummary(shopId, year);

    return sendSuccess(res, 200, 'Yearly summary fetched successfully', { summary });
  } catch (error) {
    logger.error('Error fetching yearly summary', {
      error:  error.message,
      shopId: req.params.shopId,
    });

    return sendInternalError(res, 'Failed to fetch yearly summary', error);
  }
};

// ─── Get Girvi-wise Cashbook ───────────────────────────────────────────────────
export const getGirviCashbook = async (req, res) => {
  try {
    const { shopId, girviId } = req.params;

    const result = await cashbookService.getGirviCashbook(shopId, girviId);

    return sendSuccess(res, 200, 'Girvi cashbook fetched successfully', result);
  } catch (error) {
    logger.error('Error fetching girvi cashbook', {
      error:   error.message,
      girviId: req.params.girviId,
    });

    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);

    return sendInternalError(res, 'Failed to fetch girvi cashbook', error);
  }
};

// ─── Get Current Balance ───────────────────────────────────────────────────────
export const getCurrentBalance = async (req, res) => {
  try {
    const { shopId } = req.params;

    const result = await cashbookService.getCurrentBalance(shopId);

    return sendSuccess(res, 200, 'Balance fetched successfully', result);
  } catch (error) {
    logger.error('Error fetching balance', { error: error.message, shopId: req.params.shopId });

    return sendInternalError(res, 'Failed to fetch balance', error);
  }
};

// ─── Delete Entry ──────────────────────────────────────────────────────────────
export const deleteEntry = async (req, res) => {
  try {
    const { shopId, entryId } = req.params;

    const entry = await cashbookService.deleteEntry(entryId, shopId, req.user._id);

    await eventLogger.logActivity({
      userId:         req.user._id,
      organizationId: req.user.organizationId,
      shopId,
      action:         'delete',
      module:         'girvi_cashbook',
      description:    `Cashbook entry deleted: ${entry.entryNumber}`,
      level:          'warn',
      status:         'success',
      metadata:       { entryId: entry._id, entryNumber: entry.entryNumber },
      ipAddress:      req.ip,
    });

    return sendSuccess(res, 200, 'Entry deleted successfully', { entry });
  } catch (error) {
    logger.error('Error deleting entry', { error: error.message, entryId: req.params.entryId });

    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);

    return sendInternalError(res, 'Failed to delete entry', error);
  }
};

export default {
  createManualEntry,
  getCashbookEntries,
  getEntryById,
  getDailySummary,
  getMonthlySummary,
  getYearlySummary,
  getGirviCashbook,
  getCurrentBalance,
  deleteEntry,
};