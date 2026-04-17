import express from 'express';
import {
  createManualEntry,
  getCashbookEntries,
  getEntryById,
  getDailySummary,
  getMonthlySummary,
  getYearlySummary,
  getGirviCashbook,
  getCurrentBalance,
  deleteEntry,
} from './girviCashbook.controller.js';
import {
  createManualEntryValidation,
  getCashbookValidation,
  getSummaryValidation,
  shopIdValidation,
  entryIdValidation,
} from './girviCashbook.validation.js';
import { authenticate }   from '../middlewares/auth.js';
import { restrictTo }     from '../middlewares/restrictTo.js';
import {
  checkShopAccess,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
} from '../middlewares/checkShopAccess.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

// Mounted at: /api/v1/shops/:shopId/girvi-cashbook
const router = express.Router({ mergeParams: true });

router.use(authenticate);

// ─── Balance ───────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/shops/:shopId/girvi-cashbook/balance
 * @desc    Get current cashbook balance
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
  '/balance',
  shopIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirviCashbook'),
  rateLimiter({ max: 60, windowMs: 60000 }),
  getCurrentBalance
);

// ─── Summaries ─────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/shops/:shopId/girvi-cashbook/summary/daily
 * @desc    Get daily cashbook summary
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
  '/summary/daily',
  shopIdValidation,
  getSummaryValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirviCashbook'),
  rateLimiter({ max: 60, windowMs: 60000 }),
  getDailySummary
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi-cashbook/summary/monthly
 * @desc    Get monthly cashbook summary
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
  '/summary/monthly',
  shopIdValidation,
  getSummaryValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirviCashbook'),
  rateLimiter({ max: 30, windowMs: 60000 }),
  getMonthlySummary
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi-cashbook/summary/yearly
 * @desc    Get yearly cashbook summary
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
  '/summary/yearly',
  shopIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirviCashbook'),
  rateLimiter({ max: 20, windowMs: 60000 }),
  getYearlySummary
);

// ─── Girvi-wise Cashbook ───────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/shops/:shopId/girvi-cashbook/girvi/:girviId
 * @desc    Get all cashbook entries for a specific girvi
 * @access  Private (All staff)
 */
router.get(
  '/girvi/:girviId',
  shopIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirviCashbook'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getGirviCashbook
);

// ─── Main Cashbook CRUD ────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/shops/:shopId/girvi-cashbook
 * @desc    Create manual cashbook entry
 * @access  Private (Admin, Manager, Accountant)
 */
router.post(
  '/',
  shopIdValidation,
  createManualEntryValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkAnyPermission(['canCreateGirviCashbookEntry', 'canManageGirvi']),
  rateLimiter({ max: 30, windowMs: 60000 }),
  createManualEntry
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi-cashbook
 * @desc    Get all cashbook entries with filters and pagination
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
  '/',
  getCashbookValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirviCashbook'),
  rateLimiter({ max: 60, windowMs: 60000 }),
  getCashbookEntries
);

/**
 * @route   GET /api/v1/shops/:shopId/girvi-cashbook/:entryId
 * @desc    Get single cashbook entry
 * @access  Private (Admin, Manager, Accountant)
 */
router.get(
  '/:entryId',
  shopIdValidation,
  entryIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewGirviCashbook'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getEntryById
);

/**
 * @route   DELETE /api/v1/shops/:shopId/girvi-cashbook/:entryId
 * @desc    Delete cashbook entry (soft delete, admin only)
 * @access  Private (Admin only)
 */
router.delete(
  '/:entryId',
  shopIdValidation,
  entryIdValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkAllPermissions(['canDeleteGirviCashbookEntry', 'canManageGirvi']),
  rateLimiter({ max: 10, windowMs: 60000 }),
  deleteEntry
);

export default router;