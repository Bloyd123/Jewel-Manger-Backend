// ============================================================================
// FILE: src/api/shops/shop.routes.js
// Shop Routes - API endpoints for shop management
// ============================================================================

import express from 'express';
import * as shopController from './shop.controller.js';
import * as shopValidation from './shop.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { checkShopAccess } from '../middlewares/checkShopAccess.js';

const router = express.Router();

// ============================================================================
// PUBLIC ROUTES (None for shops - all require authentication)
// ============================================================================

// ============================================================================
// PROTECTED ROUTES (Require Authentication)
// ============================================================================

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================================================
// SHOP CRUD OPERATIONS
// ============================================================================

/**
 * @route   POST /api/v1/shops
 * @desc    Create a new shop
 * @access  Super Admin, Org Admin
 */
router.post('/', shopValidation.createShopValidation, shopController.createShop);

/**
 * @route   GET /api/v1/shops
 * @desc    Get all shops (filtered based on user role)
 * @access  Super Admin, Org Admin, Shop Admin, Manager, Staff
 */
router.get('/', shopValidation.getShopsValidation, shopController.getAllShops);

/**
 * @route   GET /api/v1/shops/:id
 * @desc    Get single shop by ID
 * @access  Super Admin, Org Admin, Shop Admin, Manager, Staff (with access)
 */
router.get(
  '/:id',
  shopValidation.getShopValidation,
  checkShopAccess, // Middleware to verify user has access to this shop
  shopController.getShopById
);

/**
 * @route   PUT /api/v1/shops/:id
 * @desc    Update shop details
 * @access  Super Admin, Org Admin, Shop Admin (with canManageShopSettings permission)
 */
router.put(
  '/:id',
  shopValidation.updateShopValidation,
  checkShopAccess,
  shopController.updateShop
);

/**
 * @route   DELETE /api/v1/shops/:id
 * @desc    Soft delete shop
 * @access  Super Admin, Org Admin
 */
router.delete(
  '/:id',
  shopValidation.deleteShopValidation,
  checkShopAccess,
  shopController.deleteShop
);

// ============================================================================
// SHOP SETTINGS & CONFIGURATION
// ============================================================================

/**
 * @route   PATCH /api/v1/shops/:id/settings
 * @desc    Update shop settings
 * @access  Super Admin, Org Admin, Shop Admin (with canManageShopSettings)
 */
router.patch(
  '/:id/settings',
  shopValidation.updateShopSettingsValidation,
  checkShopAccess,
  shopController.updateShopSettings
);

/**
 * @route   PATCH /api/v1/shops/:id/metal-rates
 * @desc    Update metal rates
 * @access  Super Admin, Shop Admin, Manager (with canUpdateMetalRates)
 */
router.patch(
  '/:id/metal-rates',
  shopValidation.updateMetalRatesValidation,
  checkShopAccess,
  shopController.updateMetalRates
);

// ============================================================================
// SHOP STATISTICS & REPORTS
// ============================================================================

/**
 * @route   GET /api/v1/shops/:id/statistics
 * @desc    Get shop statistics
 * @access  Super Admin, Org Admin, Shop Admin, Manager
 */
router.get('/:id/statistics', checkShopAccess, shopController.getShopStatistics);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;