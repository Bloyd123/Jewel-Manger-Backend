// FILE: src/api/scheme/scheme.routes.js
// Base: /api/v1/shops/:shopId/schemes

import express from 'express';
import * as schemeController from './scheme.controller.js';
import * as schemeValidation from './scheme.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import { checkShopAccess, checkPermission } from '../middlewares/checkShopAccess.js';
import { PERMISSIONS } from '../../config/permission.constants.js';
import {
  apiRateLimiter,
  createUpdateRateLimiter,
  deleteRateLimiter,
} from '../middlewares/rateLimiter.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

// ============================================================
// SECTION 1 — STATIC ROUTES
// No :schemeId or :enrollmentId — fixed paths first
// ============================================================

// ── Analytics & Dashboard ──────────────────────────────────

/**
 * GET /analytics
 */
router.get(
  '/analytics',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_ANALYTICS),
  apiRateLimiter,
  schemeValidation.analyticsValidation,
  schemeController.getSchemeAnalytics
);

/**
 * GET /dashboard
 */
router.get(
  '/dashboard',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_DASHBOARD),
  apiRateLimiter,
  schemeController.getSchemeDashboard
);

// ── Due Collections ───────────────────────────────────────

/**
 * GET /dues/today
 */
router.get(
  '/dues/today',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeController.getDuesToday
);

/**
 * GET /dues/overdue
 */
router.get(
  '/dues/overdue',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeController.getOverdueDues
);

/**
 * GET /dues/upcoming
 */
router.get(
  '/dues/upcoming',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeController.getUpcomingDues
);

/**
 * POST /dues/send-reminders
 */
router.post(
  '/dues/send-reminders',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.bulkReminderValidation,
  schemeController.sendPaymentReminders
);

// ── Filters & Search ──────────────────────────────────────

/**
 * GET /active
 */
router.get(
  '/active',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeController.getActiveSchemes
);

/**
 * GET /featured
 */
router.get(
  '/featured',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeController.getFeaturedSchemes
);

/**
 * GET /expiring-soon
 */
router.get(
  '/expiring-soon',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeController.getExpiringSoon
);

/**
 * GET /search
 */
router.get(
  '/search',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeController.searchSchemes
);

// ── Maturity Tracking ─────────────────────────────────────

/**
 * GET /maturing-soon
 */
router.get(
  '/maturing-soon',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeController.getMaturingSoon
);

/**
 * GET /matured
 */
router.get(
  '/matured',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeController.getMaturedEnrollments
);

// ── Bulk Operations ───────────────────────────────────────

/**
 * POST /bulk-send-reminders
 */
router.post(
  '/bulk-send-reminders',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.bulkReminderValidation,
  schemeController.bulkSendReminders
);

/**
 * POST /bulk-export
 */
router.post(
  '/bulk-export',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'accountant'),
  checkShopAccess,
  checkPermission(PERMISSIONS.EXPORT_DATA),
  createUpdateRateLimiter,
  schemeValidation.bulkExportValidation,
  schemeController.bulkExportSchemes
);

// ============================================================
// SECTION 2 — NESTED ROUTES (enrollment-level, customer-level)
// Static sub-paths under :schemeId or non-schemeId paths
// ============================================================

/**
 * GET /enrollments/:enrollmentId
 */
router.get(
  '/enrollments/:enrollmentId',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeValidation.enrollmentIdValidation,
  schemeController.getEnrollmentById
);

/**
 * PUT /enrollments/:enrollmentId
 */
router.put(
  '/enrollments/:enrollmentId',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.enrollmentIdValidation,
  schemeController.updateEnrollment
);

/**
 * DELETE /enrollments/:enrollmentId
 */
router.delete(
  '/enrollments/:enrollmentId',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  deleteRateLimiter,
  schemeValidation.cancelEnrollmentValidation,
  schemeController.cancelEnrollment
);

/**
 * POST /enrollments/:enrollmentId/pay
 */
router.post(
  '/enrollments/:enrollmentId/pay',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission(PERMISSIONS.RECEIVE_PAYMENTS),
  createUpdateRateLimiter,
  schemeValidation.recordPaymentValidation,
  schemeController.recordPayment
);

/**
 * GET /enrollments/:enrollmentId/payments
 */
router.get(
  '/enrollments/:enrollmentId/payments',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeValidation.enrollmentIdValidation,
  schemeController.getEnrollmentPayments
);

/**
 * GET /enrollments/:enrollmentId/schedule
 */
router.get(
  '/enrollments/:enrollmentId/schedule',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeValidation.enrollmentIdValidation,
  schemeController.getInstallmentSchedule
);

/**
 * GET /enrollments/:enrollmentId/maturity
 */
router.get(
  '/enrollments/:enrollmentId/maturity',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeValidation.enrollmentIdValidation,
  schemeController.calculateMaturity
);

/**
 * POST /enrollments/:enrollmentId/mature
 */
router.post(
  '/enrollments/:enrollmentId/mature',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.enrollmentIdValidation,
  schemeController.matureEnrollment
);

/**
 * POST /enrollments/:enrollmentId/redeem
 */
router.post(
  '/enrollments/:enrollmentId/redeem',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.redeemEnrollmentValidation,
  schemeController.redeemEnrollment
);

// ── Customer-scoped enrollment routes ─────────────────────

/**
 * GET /customer/:customerId/enrollments
 */
router.get(
  '/customer/:customerId/enrollments',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeValidation.customerIdValidation,
  schemeController.getCustomerEnrollments
);

/**
 * GET /customer/:customerId/summary
 */
router.get(
  '/customer/:customerId/summary',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeValidation.customerIdValidation,
  schemeController.getCustomerSchemeSummary
);

// ============================================================
// SECTION 3 — COLLECTION ROUTES (/:schemeId free-form filters)
// ============================================================

/**
 * GET /by-type/:schemeType
 */
router.get(
  '/by-type/:schemeType',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeController.getSchemesByType
);

// ============================================================
// SECTION 4 — CRUD ROUTES (/:schemeId dynamic)
// MUST come AFTER all static & nested routes above
// ============================================================

/**
 * POST /
 */
router.post(
  '/',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.createSchemeValidation,
  schemeController.createScheme
);

/**
 * GET /
 */
router.get(
  '/',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeValidation.getSchemesValidation,
  schemeController.getAllSchemes
);

/**
 * GET /:schemeId
 */
router.get(
  '/:schemeId',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeValidation.schemeIdValidation,
  schemeController.getSchemeById
);

/**
 * PUT /:schemeId
 */
router.put(
  '/:schemeId',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.updateSchemeValidation,
  schemeController.updateScheme
);

/**
 * DELETE /:schemeId
 */
router.delete(
  '/:schemeId',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  deleteRateLimiter,
  schemeValidation.schemeIdValidation,
  schemeController.deleteScheme
);

// ── Status management ─────────────────────────────────────

/**
 * PATCH /:schemeId/status
 */
router.patch(
  '/:schemeId/status',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.updateStatusValidation,
  schemeController.updateSchemeStatus
);

/**
 * PATCH /:schemeId/activate
 */
router.patch(
  '/:schemeId/activate',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.schemeIdValidation,
  schemeController.activateScheme
);

/**
 * PATCH /:schemeId/pause
 */
router.patch(
  '/:schemeId/pause',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.schemeIdValidation,
  schemeController.pauseScheme
);

/**
 * PATCH /:schemeId/archive
 */
router.patch(
  '/:schemeId/archive',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.schemeIdValidation,
  schemeController.archiveScheme
);

// ── Approval ─────────────────────────────────────────────

/**
 * POST /:schemeId/approve
 */
router.post(
  '/:schemeId/approve',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.schemeIdValidation,
  schemeController.approveScheme
);

/**
 * POST /:schemeId/reject
 */
router.post(
  '/:schemeId/reject',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.rejectSchemeValidation,
  schemeController.rejectScheme
);

// ── Scheme-level enrollment management ────────────────────

/**
 * POST /:schemeId/enroll
 */
router.post(
  '/:schemeId/enroll',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkPermission(PERMISSIONS.MANAGE_SCHEMES),
  createUpdateRateLimiter,
  schemeValidation.enrollCustomerValidation,
  schemeController.enrollCustomer
);

/**
 * GET /:schemeId/enrollments
 */
router.get(
  '/:schemeId/enrollments',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SCHEMES),
  apiRateLimiter,
  schemeValidation.schemeIdValidation,
  schemeController.getSchemeEnrollments
);

/**
 * GET /:schemeId/analytics
 */
router.get(
  '/:schemeId/analytics',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_ANALYTICS),
  apiRateLimiter,
  schemeValidation.schemeIdValidation,
  schemeController.getSchemeSpecificAnalytics
);

export default router;