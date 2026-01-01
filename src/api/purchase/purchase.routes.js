// ============================================================================
// FILE: src/api/routes/purchase.routes.js
// Purchase Module Routes - All 22 Routes from PDF
// ============================================================================

import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import { checkShopAccess, checkPermission } from '../middlewares/checkShopAccess.js';
import {
  createUpdateRateLimiter,
  deleteRateLimiter,
  apiRateLimiter,
} from '../middlewares/rateLimiter.js';
import * as purchaseController from './purchase.controller.js';
import * as purchaseValidation from './purchase.validation.js';

const router = express.Router({ mergeParams: true }); // mergeParams for nested routes

// ============================================================================
// APPLY AUTHENTICATION TO ALL ROUTES
// ============================================================================
router.use(authenticate);

// ============================================================================
// 1. PURCHASE CRUD OPERATIONS (5 Routes)
// ============================================================================

/**
 * @route   POST /api/v1/shops/:shopId/purchases
 * @desc    Create new purchase order/invoice
 * @access  super_admin, org_admin, shop_admin, manager
 */
router.post(
  '/',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canCreatePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.createPurchase,
  purchaseController.createPurchase
);

/**
 * @route   GET /api/v1/shops/:shopId/purchases
 * @desc    Get all purchases with filters & pagination
 * @access  All authenticated users
 */
router.get(
  '/',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.getPurchases,
  purchaseController.getAllPurchases
);

/**
 * @route   GET /api/v1/shops/:shopId/purchases/:purchaseId
 * @desc    Get single purchase details
 * @access  All authenticated users
 */
router.get(
  '/:purchaseId',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.purchaseId,
  purchaseController.getPurchaseById
);

/**
 * @route   PUT /api/v1/shops/:shopId/purchases/:purchaseId
 * @desc    Update purchase details (only draft/pending)
 * @access  super_admin, org_admin, shop_admin, manager
 */
router.put(
  '/:purchaseId',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditPurchases'),
  createUpdateRateLimiter,
  purchaseValidation.updatePurchase,
  purchaseController.updatePurchase
);

/**
 * @route   DELETE /api/v1/shops/:shopId/purchases/:purchaseId
 * @desc    Soft delete purchase (only draft status)
 * @access  super_admin, org_admin, shop_admin
 */
router.delete(
  '/:purchaseId',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeletePurchases'),
  deleteRateLimiter,
  purchaseValidation.purchaseId,
  purchaseController.deletePurchase
);

// ============================================================================
// 2. PURCHASE STATUS MANAGEMENT (3 Routes)
// ============================================================================

/**
 * @route   PATCH /api/v1/shops/:shopId/purchases/:purchaseId/status
 * @desc    Update purchase status
 * @access  super_admin, org_admin, shop_admin, manager
 */
router.patch(
  '/:purchaseId/status',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditPurchases'),
  createUpdateRateLimiter,
  purchaseValidation.updateStatus,
  purchaseController.updatePurchaseStatus
);

/**
 * @route   PATCH /api/v1/shops/:shopId/purchases/:purchaseId/receive
 * @desc    Mark purchase as received (update inventory)
 * @access  super_admin, org_admin, shop_admin, manager
 */
router.patch(
  '/:purchaseId/receive',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditPurchases'),
  createUpdateRateLimiter,
  purchaseValidation.receivePurchase,
  purchaseController.receivePurchase
);

/**
 * @route   PATCH /api/v1/shops/:shopId/purchases/:purchaseId/cancel
 * @desc    Cancel purchase
 * @access  super_admin, org_admin, shop_admin
 */
router.patch(
  '/:purchaseId/cancel',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeletePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.cancelPurchase,
  purchaseController.cancelPurchase
);

// ============================================================================
// 3. PURCHASE APPROVAL (2 Routes)
// ============================================================================

/**
 * @route   POST /api/v1/shops/:shopId/purchases/:purchaseId/approve
 * @desc    Approve purchase (if approval required)
 * @access  super_admin, org_admin, shop_admin
 */
router.post(
  '/:purchaseId/approve',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canApprovePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.approvePurchase,
  purchaseController.approvePurchase
);

/**
 * @route   POST /api/v1/shops/:shopId/purchases/:purchaseId/reject
 * @desc    Reject purchase
 * @access  super_admin, org_admin, shop_admin
 */
router.post(
  '/:purchaseId/reject',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canApprovePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.rejectPurchase,
  purchaseController.rejectPurchase
);

// ============================================================================
// 4. PAYMENT MANAGEMENT (2 Routes)
// ============================================================================

/**
 * @route   POST /api/v1/shops/:shopId/purchases/:purchaseId/payments
 * @desc    Add payment to purchase
 * @access  super_admin, org_admin, shop_admin, manager, accountant
 */
router.post(
  '/:purchaseId/payments',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canMakePayments'),
  createUpdateRateLimiter,
  purchaseValidation.addPayment,
  purchaseController.addPayment
);

/**
 * @route   GET /api/v1/shops/:shopId/purchases/:purchaseId/payments
 * @desc    Get all payments for a purchase
 * @access  All authenticated users
 */
router.get(
  '/:purchaseId/payments',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.purchaseId,
  purchaseController.getPayments
);

// ============================================================================
// 5. SUPPLIER-SPECIFIC PURCHASES (1 Route)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/purchases/supplier/:supplierId
 * @desc    Get all purchases from a specific supplier
 * @access  All authenticated users
 */
router.get(
  '/supplier/:supplierId',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.supplierId,
  purchaseController.getPurchasesBySupplier
);

// ============================================================================
// 6. PURCHASE ANALYTICS & REPORTS (3 Routes)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/purchases/analytics
 * @desc    Purchase analytics & summary
 * @access  super_admin, org_admin, shop_admin, manager, accountant
 */
router.get(
  '/analytics',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewAnalytics'),
  apiRateLimiter,
  purchaseController.getPurchaseAnalytics
);

/**
 * @route   GET /api/v1/shops/:shopId/purchases/pending
 * @desc    Get all pending/incomplete purchases
 * @access  super_admin, org_admin, shop_admin, manager
 */
router.get(
  '/pending',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseController.getPendingPurchases
);

/**
 * @route   GET /api/v1/shops/:shopId/purchases/unpaid
 * @desc    Get all unpaid/partially paid purchases
 * @access  super_admin, org_admin, shop_admin, accountant
 */
router.get(
  '/unpaid',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'accountant'),
  checkShopAccess,
  checkPermission('canViewFinancials'),
  apiRateLimiter,
  purchaseController.getUnpaidPurchases
);

// ============================================================================
// 7. BULK OPERATIONS (2 Routes)
// ============================================================================

/**
 * @route   POST /api/v1/shops/:shopId/purchases/bulk-delete
 * @desc    Bulk delete multiple purchases (draft only)
 * @access  super_admin, org_admin, shop_admin
 */
router.post(
  '/bulk-delete',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeletePurchases'),
  deleteRateLimiter,
  purchaseValidation.bulkDelete,
  purchaseController.bulkDeletePurchases
);

/**
 * @route   POST /api/v1/shops/:shopId/purchases/bulk-approve
 * @desc    Bulk approve multiple purchases
 * @access  super_admin, org_admin, shop_admin
 */
router.post(
  '/bulk-approve',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canApprovePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.bulkApprove,
  purchaseController.bulkApprovePurchases
);

// ============================================================================
// 8. PURCHASE DOCUMENTS (2 Routes)
// ============================================================================

/**
 * @route   POST /api/v1/shops/:shopId/purchases/:purchaseId/documents
 * @desc    Upload purchase-related documents
 * @access  super_admin, org_admin, shop_admin, manager
 */
router.post(
  '/:purchaseId/documents',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditPurchases'),
  createUpdateRateLimiter,
  purchaseValidation.uploadDocument,
  purchaseController.uploadDocument
);

/**
 * @route   GET /api/v1/shops/:shopId/purchases/:purchaseId/documents
 * @desc    Get all documents for a purchase
 * @access  All authenticated users
 */
router.get(
  '/:purchaseId/documents',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.purchaseId,
  purchaseController.getDocuments
);

// ============================================================================
// 9. PURCHASE FILTERS & SEARCH (2 Routes)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/purchases/search
 * @desc    Quick search purchases
 * @access  All authenticated users
 */
router.get(
  '/search',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.searchPurchases,
  purchaseController.searchPurchases
);

/**
 * @route   GET /api/v1/shops/:shopId/purchases/by-date-range
 * @desc    Get purchases within date range
 * @access  All authenticated users
 */
router.get(
  '/by-date-range',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.dateRange,
  purchaseController.getPurchasesByDateRange
);

export default router;
