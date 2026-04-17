import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendInternalError } from '../../utils/sendResponse.js';
import * as openingService from './opening.service.js';
import logger from '../../utils/logger.js';

// Helper to handle service errors
const handleError = (res, error) => {
  if (error.statusCode === 404 || error.code === 'NOT_FOUND') {
    return sendNotFound(res, error.message);
  }
  if (error.statusCode === 400 || error.code === 'BAD_REQUEST') {
    return sendBadRequest(res, error.message);
  }
  return sendInternalError(res, error.message, error);
};

// GET /api/v1/shops/:shopId/opening-balance/status
export const getSetupStatus = async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const organizationId = req.user.organizationId;

    const status = await openingService.getSetupStatus(
      shopId,
      organizationId
    );

    return sendSuccess(res, 200, 'Setup status fetched', status);
  } catch (error) {
    logger.error('getSetupStatus error:', error.message);
    return sendInternalError(res, "Failed to fetch setup status", error);
  }
};

// GET /api/v1/shops/:shopId/opening-balance
export const getOpeningBalance = async (req, res) => {
  try {
      const { shopId } = req.params;
    const result = await openingService.getOpeningBalance(shopId);
    return sendSuccess(res, 200, 'Opening balance fetched', result);
  } catch (error) {
    logger.error('getOpeningBalance error:', error.message);
    return handleError(res, error);
  }
};

// POST /api/v1/shops/:shopId/opening-balance
export const createOrUpdate = async (req, res) => {
  try {
    const shopId = req.params.shopId || req.body.shopId;
    const organizationId = req.user.organizationId;
    const userId = req.user._id;

    const result = await openingService.createOrUpdateOpeningBalance({
      shopId,
      organizationId,
      ...req.body,
      userId,
    });

    return sendSuccess(res, 200, 'Opening balance saved as draft', result);
  } catch (error) {
    logger.error('createOrUpdate error:', error.message);
    return sendInternalError(res, "Failed to save opening balance", error);
  }
};

// POST /api/v1/shops/:shopId/opening-balance/confirm
export const confirmOpeningBalance = async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const organizationId = req.user.organizationId;
    const userId = req.user._id;

    const result = await openingService.confirmOpeningBalance({
      shopId,
      organizationId,
      userId,
    });

    return sendSuccess(res, 200, 'Opening balance confirmed successfully', result);
  } catch (error) {
    logger.error('confirmOpeningBalance error:', error.message);
    return sendInternalError(res, "Failed to confirm opening balance", error);
  }
};