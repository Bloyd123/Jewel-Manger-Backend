import express from 'express';
import {
  createGirvi,
  getGirvis,
  getGirviById,
  updateGirvi,
  getInterestCalculation,
  releaseGirvi,
  partialRelease,
  renewGirvi,
  deleteGirvi,
  getGirviStatistics,
} from './girvi.controller.js';
import {
  createGirviValidation,
  updateGirviValidation,
  releaseGirviValidation,
  partialReleaseValidation,
  renewalValidation,
  getGirvisValidation,
  shopIdValidation,
  girviIdValidation,
  calculateInterestValidation,
} from './girvi.validation.js';
import { authenticate }    from '../middlewares/auth.js';
import { restrictTo }      from '../middlewares/restrictTo.js';
import { checkShopAccess, checkPermission, checkAnyPermission, checkAllPermissions } from '../middlewares/checkShopAccess.js';
import { rateLimiter }     from '../middlewares/rateLimiter.js';

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/shops/:shopId/girvi/statistics
 * @desc    Get girvi statistics summary
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
  '/statistics',
  shopIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 30, windowMs: 60000 }),
  getGirviStatistics
);

/**
 * @route   POST /api/v1/shops/:shopId/girvi
 * @desc    Create new girvi (Jama)
 * @access  Private (Admin, Manager, Staff)
 */
router.post(
  '/',
  shopIdValidation,
  createGirviValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkAnyPermission(['canCreateGirvi', 'canManageGirvi']),
  rateLimiter({ max: 50, windowMs: 60000 }),
  createGirvi
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi
 * @desc    Get all girvis with filters and pagination
 * @access  Private (All staff)
 */
router.get(
  '/',
  getGirvisValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getGirvis
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi/:girviId
 * @desc    Get single girvi details
 * @access  Private (All staff)
 */
router.get(
  '/:girviId',
  shopIdValidation,
  girviIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getGirviById
);

/**
 * @route   PUT /api/v1/shops/:shopId/girvi/:girviId
 * @desc    Update girvi details
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:girviId',
  shopIdValidation,
  updateGirviValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkAnyPermission(['canUpdateGirvi', 'canManageGirvi']),
  rateLimiter({ max: 50, windowMs: 60000 }),
  updateGirvi
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi/:girviId/interest
 * @desc    Calculate interest for a girvi
 * @access  Private (All staff)
 */
router.get(
  '/:girviId/interest',
  shopIdValidation,
  calculateInterestValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirvi'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getInterestCalculation
);

/**
 * @route   PATCH /api/v1/shops/:shopId/girvi/:girviId/release
 * @desc    Release girvi (customer ne wapas kiya)
 * @access  Private (Admin, Manager)
 */
router.patch(
  '/:girviId/release',
  shopIdValidation,
  releaseGirviValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkAnyPermission(['canReleaseGirvi', 'canManageGirvi']),
  rateLimiter({ max: 30, windowMs: 60000 }),
  releaseGirvi
);

/**
 * @route   PATCH /api/v1/shops/:shopId/girvi/:girviId/partial-release
 * @desc    Partially release some items, pay interest + principal, girvi continues
 * @access  Private (Admin, Manager)
 */
router.patch(
  '/:girviId/partial-release',
  shopIdValidation,
  partialReleaseValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkAnyPermission(['canReleaseGirvi', 'canManageGirvi']),
  rateLimiter({ max: 30, windowMs: 60000 }),
  partialRelease
);

/**
 * @route   PATCH /api/v1/shops/:shopId/girvi/:girviId/renew
 * @desc    Renew girvi — pay interest + optional principal, set new due date
 * @access  Private (Admin, Manager)
 */
router.patch(
  '/:girviId/renew',
  shopIdValidation,
  renewalValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkAnyPermission(['canReleaseGirvi', 'canManageGirvi']),
  rateLimiter({ max: 30, windowMs: 60000 }),
  renewGirvi
);

/**
 * @route   DELETE /api/v1/shops/:shopId/girvi/:girviId
 * @desc    Delete girvi (soft delete, only released/auctioned)
 * @access  Private (Admin only)
 */
router.delete(
  '/:girviId',
  shopIdValidation,
  girviIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkAllPermissions(['canDeleteGirvi', 'canManageGirvi']),
  rateLimiter({ max: 20, windowMs: 60000 }),
  deleteGirvi
);

export default router;