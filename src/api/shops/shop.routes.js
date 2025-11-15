// ============================================================================
// FILE: src/api/shops/shop.routes.js
// Shop Routes - UPDATED to use new checkShopAccess middleware
// ============================================================================

import express from 'express';
import * as shopController from './shop.controller.js';
import * as shopValidation from './shop.validation.js';
import { authenticate } from '../middlewares/auth.js';
// ✅ CHANGED: Import from checkShopAccess.js instead of auth.js
import { 
  checkShopAccess, 
  checkPermission,
  verifyShopOwnership 
} from '../middlewares/checkShopAccess.js';
import { restrictTo } from '../middlewares/restrictTo.js';

const router = express.Router();

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
router.post(
  '/',
  shopValidation.createShopValidation,
  restrictTo('super_admin', 'org_admin'),
  shopController.createShop
);

/**
 * @route   GET /api/v1/shops
 * @desc    Get all shops (filtered based on user role)
 * @access  Super Admin, Org Admin, Shop Admin, Manager, Staff
 */
router.get(
  '/',
  shopValidation.getShopsValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  shopController.getAllShops
);

/**
 * @route   GET /api/v1/shops/:id
 * @desc    Get single shop by ID
 * @access  Super Admin, Org Admin, Shop Admin, Manager, Staff (with access)
 */
router.get(
  '/:id',
  shopValidation.getShopValidation,
  checkShopAccess, // ✅ Now uses the advanced middleware
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
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canManageShopSettings'), // ✅ CHANGED: Now checks specific permission
  shopController.updateShop
);

/**
 * @route   DELETE /api/v1/shops/:id
 * @desc    Soft delete shop
 * @access  Super Admin, Org Admin only
 */
router.delete(
  '/:id',
  shopValidation.deleteShopValidation,
  restrictTo('super_admin', 'org_admin'),
  checkShopAccess, // Just verify access, no specific permission needed (role check above)
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
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canManageShopSettings'), // ✅ CHANGED: Specific permission check
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
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canUpdateMetalRates'), // ✅ CHANGED: Specific permission check
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
router.get(
  '/:id/statistics',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager','accountant'),
  checkShopAccess, // Basic shop access check
  shopController.getShopStatistics
);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;