import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendConflict, sendInternalError, sendPaginated } from '../../utils/sendResponse.js';
import * as metalService from './metal.service.js';
import logger from '../../utils/logger.js';

// Helper to handle service errors
const handleError = (res, error) => {
  if (error.statusCode === 404 || error.code === 'NOT_FOUND') {
    return sendNotFound(res, error.message);
  }
  if (error.statusCode === 409 || error.code === 'CONFLICT') {
    return sendConflict(res, error.message);
  }
  if (error.statusCode === 400 || error.code === 'BAD_REQUEST') {
    return sendBadRequest(res, error.message);
  }
  return sendInternalError(res, error.message, error);
};

// ─────────────────────────────────────────────
// CREATE ENTRY
// ─────────────────────────────────────────────
export const createEntry = async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const organizationId = req.user.organizationId;
    const user = req.user;

    const entry = await metalService.createMetalEntry({
      ...req.body,
      shopId,
      organizationId,
      userId: user._id,
    });

    return sendCreated(res, 'Metal ledger entry created', entry);
  } catch (error) {
    logger.error('createEntry error:', error.message);
    return handleError(res, error);
  }
};

// ─────────────────────────────────────────────
// GET PARTY BALANCE
// ─────────────────────────────────────────────
export const getPartyBalance = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { partyId } = req.params;
    const { metalType } = req.query;

    const balance = await metalService.getPartyMetalBalance(shopId, partyId, metalType || null);
    return sendSuccess(res, 200, 'Party metal balance fetched', balance);
  } catch (error) {
    logger.error('getPartyBalance error:', error.message);
    return handleError(res, error);
  }
};

// ─────────────────────────────────────────────
// GET PARTY HISTORY
// ─────────────────────────────────────────────
export const getPartyHistory = async (req, res) => {
  try {
       const { shopId } = req.params;
    const { partyId } = req.params;

    const result = await metalService.getPartyMetalHistory(shopId, partyId, req.query);
    return sendPaginated(res, result.entries, result.page, result.limit, result.total);
  } catch (error) {
    logger.error('getPartyHistory error:', error.message);
    return handleError(res, error);
  }
};

// ─────────────────────────────────────────────
// SETTLE ENTRY
// ─────────────────────────────────────────────
export const settleEntry = async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const user = req.user;
    const { entryId } = req.params;

    const result = await metalService.settleMetalEntry({
      shopId,
      entryId,
      ...req.body,
      userId: user._id,
    });

    return sendSuccess(res, 200, 'Metal entry settled successfully', result);
  } catch (error) {
    logger.error('settleEntry error:', error.message);
    return handleError(res, error);
  }
};

// ─────────────────────────────────────────────
// BULK SETTLE
// ─────────────────────────────────────────────
export const bulkSettle = async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const user = req.user;

    const result = await metalService.bulkSettlePartyMetal({
      shopId,
      ...req.body,
      userId: user._id,
    });

    return sendSuccess(res, 200, 'Bulk settlement completed', result);
  } catch (error) {
    logger.error('bulkSettle error:', error.message);
    return handleError(res, error);
  }
};

// ─────────────────────────────────────────────
// GET SHOP SUMMARY
// ─────────────────────────────────────────────
export const getShopSummary = async (req, res) => {
  try {
    const { shopId } = req.params;
    const summary = await metalService.getShopMetalSummary(shopId);
    return sendSuccess(res, 200, 'Shop metal summary fetched', summary);
  } catch (error) {
    logger.error('getShopSummary error:', error.message);
    return handleError(res, error);
  }
};

// ─────────────────────────────────────────────
// GET PENDING ENTRIES
// ─────────────────────────────────────────────
export const getPendingEntries = async (req, res) => {
  try {
       const { shopId } = req.params;
    const result = await metalService.getPendingEntries(shopId, req.query);
    return sendPaginated(res, result.entries, result.page, result.limit, result.total);
  } catch (error) {
    logger.error('getPendingEntries error:', error.message);
    return handleError(res, error);
  }
};