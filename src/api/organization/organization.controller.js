// FILE: src/api/organization/organization.controller.js

import { validationResult } from 'express-validator';
import * as orgService from './organization.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  sendInternalError,
} from '../../utils/sendResponse.js';
import logger from '../../utils/logger.js';

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendBadRequest(res, 'Validation failed', errors.array());
    return false;
  }
  return true;
};

// ─────────────────────────────────────────────
// POST /api/organizations
// ─────────────────────────────────────────────
export const createOrganization = async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;

    const org = await orgService.createOrganization(req.body, req.user._id);

    return sendCreated(res, 'Organization created successfully', { organization: org });
  } catch (error) {
    logger.error('Error creating organization', { error: error.message, userId: req.user._id });
    if (error.name === 'ConflictError') return sendConflict(res, error.message);
    return sendInternalError(res, 'Failed to create organization', error);
  }
};

// ─────────────────────────────────────────────
// GET /api/organizations
// ─────────────────────────────────────────────
export const getAllOrganizations = async (req, res) => {
  try {
    const result = await orgService.getAllOrganizations(req.query);
    return sendSuccess(res, 200, 'Organizations fetched successfully', result.data, {
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching organizations', { error: error.message });
    return sendInternalError(res, 'Failed to fetch organizations', error);
  }
};

// ─────────────────────────────────────────────
// GET /api/organizations/:id
// ─────────────────────────────────────────────
export const getOrganizationById = async (req, res) => {
  try {
    const org = await orgService.getOrganizationById(
      req.params.id,
      req.user._id,
      req.user.role
    );
    return sendSuccess(res, 200, 'Organization fetched successfully', { organization: org });
  } catch (error) {
    logger.error('Error fetching organization', { error: error.message, id: req.params.id });
    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);
    return sendInternalError(res, 'Failed to fetch organization', error);
  }
};

// ─────────────────────────────────────────────
// PUT /api/organizations/:id
// ─────────────────────────────────────────────
export const updateOrganization = async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;

    const org = await orgService.updateOrganization(
      req.params.id,
      req.body,
      req.user._id,
      req.user.role
    );
    return sendSuccess(res, 200, 'Organization updated successfully', { organization: org });
  } catch (error) {
    logger.error('Error updating organization', { error: error.message, id: req.params.id });
    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);
    if (error.name === 'ConflictError') return sendConflict(res, error.message);
    return sendInternalError(res, 'Failed to update organization', error);
  }
};

// ─────────────────────────────────────────────
// DELETE /api/organizations/:id
// ─────────────────────────────────────────────
export const deleteOrganization = async (req, res) => {
  try {
    const result = await orgService.deleteOrganization(req.params.id, req.user._id);
    return sendSuccess(res, 200, result.message);
  } catch (error) {
    logger.error('Error deleting organization', { error: error.message, id: req.params.id });
    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);
    return sendInternalError(res, 'Failed to delete organization', error);
  }
};

// ─────────────────────────────────────────────
// GET /api/organizations/:id/shops
// ─────────────────────────────────────────────
export const getOrganizationShops = async (req, res) => {
  try {
    const result = await orgService.getOrganizationShops(
      req.params.id,
      req.query,
      req.user._id,
      req.user.role
    );
    return sendSuccess(res, 200, 'Shops fetched successfully', result.data, {
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching org shops', { error: error.message, id: req.params.id });
    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);
    return sendInternalError(res, 'Failed to fetch shops', error);
  }
};

// ─────────────────────────────────────────────
// GET /api/organizations/:id/stats
// ─────────────────────────────────────────────
export const getOrganizationStats = async (req, res) => {
  try {
    const stats = await orgService.getOrganizationStats(req.params.id);
    return sendSuccess(res, 200, 'Stats fetched successfully', stats);
  } catch (error) {
    logger.error('Error fetching org stats', { error: error.message, id: req.params.id });
    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);
    return sendInternalError(res, 'Failed to fetch stats', error);
  }
};

// ─────────────────────────────────────────────
// PATCH /api/organizations/:id/subscription
// super_admin only
// ─────────────────────────────────────────────
export const updateSubscription = async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;

    const org = await orgService.updateSubscription(
      req.params.id,
      req.body,
      req.user._id
    );
    return sendSuccess(res, 200, 'Subscription updated successfully', { organization: org });
  } catch (error) {
    logger.error('Error updating subscription', { error: error.message, id: req.params.id });
    if (error.name === 'NotFoundError') return sendNotFound(res, error.message);
    return sendInternalError(res, 'Failed to update subscription', error);
  }
};

// ─────────────────────────────────────────────
// POST /api/organizations/onboard
// Solo jeweller onboarding — Org + Shop + User ek saath
// ─────────────────────────────────────────────
export const onboardSoloJeweller = async (req, res) => {
  try {
    if (!handleValidation(req, res)) return;

    const result = await orgService.onboardSoloJeweller(
      req.body,
      req.user._id,   // super_admin ka ID
      req.ip,
      req.headers['user-agent']
    );

    return sendCreated(res, result.message, result);
  } catch (error) {
    logger.error('Error onboarding solo jeweller', { error: error.message });
    if (error.name === 'ConflictError') return sendConflict(res, error.message);
    if (error.name === 'ValidationError') return sendBadRequest(res, error.message);
    return sendInternalError(res, 'Onboarding failed', error);
  }
};

export default {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizationShops,
  getOrganizationStats,
  updateSubscription,
  onboardSoloJeweller,
};