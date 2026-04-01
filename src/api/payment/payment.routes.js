// FILE: src/api/payment/payment.routes.js
// Payment Routes — Organized by: 1) Static  2) Nested  3) Dynamic

import express from 'express';
import {
  createPaymentHandler,
  getAllPaymentsHandler,
  getPaymentByIdHandler,
  updatePaymentHandler,
  deletePaymentHandler,
  updatePaymentStatusHandler,
  markAsCompletedHandler,
  cancelPaymentHandler,
  getPendingChequesHandler,
  clearChequeHandler,
  bounceChequeHandler,
  getBouncedChequesHandler,
  getClearedChequesHandler,
  getUnreconciledPaymentsHandler,
  reconcilePaymentHandler,
  getReconciliationSummaryHandler,
  getReceiptHandler,
  sendReceiptHandler,
  regenerateReceiptHandler,
  getPartyPaymentsHandler,
  getPartyPaymentSummaryHandler,
  getCustomerPaymentsHandler,
  getSupplierPaymentsHandler,
  getPaymentsByModeHandler,
  getCashCollectionHandler,
  getDigitalCollectionHandler,
  getPaymentAnalyticsHandler,
  getPaymentDashboardHandler,
  getTodayPaymentsHandler,
  getPendingPaymentsHandler,
  getFailedPaymentsHandler,
  getSalePaymentsHandler,
  getPurchasePaymentsHandler,
  searchPaymentsHandler,
  getPaymentsByDateRangeHandler,
  getPaymentsByAmountRangeHandler,
  bulkReconcilePaymentsHandler,
  bulkExportPaymentsHandler,
  bulkPrintReceiptsHandler,
  approvePaymentHandler,
  rejectPaymentHandler,
  processRefundHandler,
  getRefundsHandler,
} from './payment.controller.js';

import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import { checkShopAccess, checkPermission } from '../middlewares/checkShopAccess.js';
import { PERMISSIONS } from '../../config/permission.constants.js';
import {
  createPaymentValidation,
  updatePaymentValidation,
  paymentIdValidation,
  shopIdValidation,
  getPaymentsValidation,
  updatePaymentStatusValidation,
  chequeClearanceValidation,
  chequeBounceValidation,
  reconcilePaymentValidation,
  sendReceiptValidation,
  partyPaymentsValidation,
  dateRangeValidation,
  bulkReconcileValidation,
  bulkExportValidation,
  processRefundValidation,
  approvalValidation,
  amountRangeValidation,
} from './payment.validation.js';

const router = express.Router();

// Apply authentication to ALL routes
router.use(authenticate);


// ============================================================
// SECTION 1 — STATIC ROUTES
// Fixed paths with no URL parameters. Used for collection-level
// reads, bulk actions, analytics, and dashboard endpoints.
// ============================================================

/**
 * @route   GET /api/v1/shops/:shopId/payments
 * @desc    Get all payments with filters
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments',
  shopIdValidation,
  getPaymentsValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getAllPaymentsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/today
 * @desc    Today's payment summary
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/today',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getTodayPaymentsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/pending
 * @desc    All pending payments
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/pending',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getPendingPaymentsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/failed
 * @desc    All failed payments
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/failed',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getFailedPaymentsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/refunds
 * @desc    Get all refunds
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/refunds',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getRefundsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/search
 * @desc    Quick search payments
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/search',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  searchPaymentsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/by-date-range
 * @desc    Get payments within date range
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/by-date-range',
  dateRangeValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getPaymentsByDateRangeHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/by-amount-range
 * @desc    Filter payments by amount range
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/by-amount-range',
  amountRangeValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getPaymentsByAmountRangeHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/by-mode
 * @desc    Payment breakdown by mode
 * @permission VIEW_ANALYTICS
 */
router.get(
  '/:shopId/payments/by-mode',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_ANALYTICS),
  getPaymentsByModeHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/cash-collection
 * @desc    Daily cash collection summary
 * @permission VIEW_FINANCIALS
 */
router.get(
  '/:shopId/payments/cash-collection',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_FINANCIALS),
  getCashCollectionHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/digital-collection
 * @desc    Digital payment summary (UPI / Card / Wallet)
 * @permission VIEW_FINANCIALS
 */
router.get(
  '/:shopId/payments/digital-collection',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_FINANCIALS),
  getDigitalCollectionHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/analytics
 * @desc    Comprehensive payment analytics
 * @permission VIEW_ANALYTICS
 */
router.get(
  '/:shopId/payments/analytics',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_ANALYTICS),
  getPaymentAnalyticsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/dashboard
 * @desc    Payment dashboard (quick overview)
 * @permission VIEW_DASHBOARD
 */
router.get(
  '/:shopId/payments/dashboard',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_DASHBOARD),
  getPaymentDashboardHandler
);

// ── Cheque static ──────────────────────────────────────────

/**
 * @route   GET /api/v1/shops/:shopId/payments/cheques/pending
 * @desc    Get all pending cheques
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/cheques/pending',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getPendingChequesHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/cheques/bounced
 * @desc    Get all bounced cheques
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/cheques/bounced',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getBouncedChequesHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/cheques/cleared
 * @desc    Get all cleared cheques (within date range)
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/cheques/cleared',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getClearedChequesHandler
);

// ── Reconciliation static ──────────────────────────────────

/**
 * @route   GET /api/v1/shops/:shopId/payments/reconciliation/pending
 * @desc    Get unreconciled payments
 * @permission VIEW_FINANCIALS
 */
router.get(
  '/:shopId/payments/reconciliation/pending',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_FINANCIALS),
  getUnreconciledPaymentsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/reconciliation/summary
 * @desc    Reconciliation summary report
 * @permission VIEW_FINANCIALS
 */
router.get(
  '/:shopId/payments/reconciliation/summary',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_FINANCIALS),
  getReconciliationSummaryHandler
);

// ── Bulk static ────────────────────────────────────────────

/**
 * @route   POST /api/v1/shops/:shopId/payments/bulk-reconcile
 * @desc    Bulk reconcile multiple payments
 * @permission BULK_RECONCILE
 */
router.post(
  '/:shopId/payments/bulk-reconcile',
  bulkReconcileValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.BULK_RECONCILE),
  bulkReconcilePaymentsHandler
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/bulk-export
 * @desc    Export payments to Excel / CSV
 * @permission EXPORT_DATA
 */
router.post(
  '/:shopId/payments/bulk-export',
  bulkExportValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.EXPORT_DATA),
  bulkExportPaymentsHandler
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/bulk-print-receipts
 * @desc    Bulk print receipts
 * @permission VIEW_PAYMENTS
 */
router.post(
  '/:shopId/payments/bulk-print-receipts',
  shopIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  bulkPrintReceiptsHandler
);


// ============================================================
// SECTION 2 — NESTED ROUTES
// Fixed sub-paths under a dynamic :shopId parent, scoped to a
// specific party, reference document, or sub-resource type.
// Pattern: /:shopId/payments/<sub-resource>/:id[/sub-path]
// ============================================================

/**
 * @route   GET /api/v1/shops/:shopId/payments/party/:partyId
 * @desc    All payments for a party (customer or supplier)
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/party/:partyId',
  partyPaymentsValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getPartyPaymentsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/party/:partyId/summary
 * @desc    Party payment summary
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/party/:partyId/summary',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getPartyPaymentSummaryHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/customers/:customerId
 * @desc    Get customer payments only
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/customers/:customerId',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getCustomerPaymentsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/suppliers/:supplierId
 * @desc    Get supplier payments only
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/suppliers/:supplierId',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getSupplierPaymentsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/reference/sale/:saleId
 * @desc    All payments for a specific sale
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/reference/sale/:saleId',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getSalePaymentsHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/reference/purchase/:purchaseId
 * @desc    All payments for a specific purchase
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/reference/purchase/:purchaseId',
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getPurchasePaymentsHandler
);


// ============================================================
// SECTION 3 — DYNAMIC ROUTES
// Routes that include :paymentId — operate on a single payment
// record. CRUD, status changes, cheque ops, receipt, refund,
// approval, and reconciliation for one specific payment.
//
// ⚠️  These MUST be declared AFTER all static & nested routes
//     above, so that Express does not greedily match a static
//     segment (e.g. "refunds", "search") as a :paymentId value.
// ============================================================

/**
 * @route   POST /api/v1/shops/:shopId/payments
 * @desc    Create new payment / receipt
 * @permission RECEIVE_PAYMENTS
 */
router.post(
  '/:shopId/payments',
  shopIdValidation,
  createPaymentValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.RECEIVE_PAYMENTS),
  createPaymentHandler
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/:paymentId
 * @desc    Get single payment details
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/:paymentId',
  paymentIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getPaymentByIdHandler
);

/**
 * @route   PUT /api/v1/shops/:shopId/payments/:paymentId
 * @desc    Update payment (only when status = pending)
 * @permission MAKE_PAYMENTS
 */
router.put(
  '/:shopId/payments/:paymentId',
  updatePaymentValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.MAKE_PAYMENTS),
  updatePaymentHandler
);

/**
 * @route   DELETE /api/v1/shops/:shopId/payments/:paymentId
 * @desc    Soft-delete payment (only when status = pending)
 * @access  super_admin | org_admin | shop_admin
 * @permission DELETE_RECORDS
 */
router.delete(
  '/:shopId/payments/:paymentId',
  paymentIdValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission(PERMISSIONS.DELETE_RECORDS),
  deletePaymentHandler
);

// ── Status actions ─────────────────────────────────────────

/**
 * @route   PATCH /api/v1/shops/:shopId/payments/:paymentId/status
 * @desc    Update payment status
 * @permission MAKE_PAYMENTS
 */
router.patch(
  '/:shopId/payments/:paymentId/status',
  updatePaymentStatusValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.MAKE_PAYMENTS),
  updatePaymentStatusHandler
);

/**
 * @route   PATCH /api/v1/shops/:shopId/payments/:paymentId/complete
 * @desc    Mark payment as completed
 * @permission MAKE_PAYMENTS
 */
router.patch(
  '/:shopId/payments/:paymentId/complete',
  paymentIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.MAKE_PAYMENTS),
  markAsCompletedHandler
);

/**
 * @route   PATCH /api/v1/shops/:shopId/payments/:paymentId/cancel
 * @desc    Cancel payment
 * @access  super_admin | org_admin | shop_admin
 * @permission DELETE_RECORDS
 */
router.patch(
  '/:shopId/payments/:paymentId/cancel',
  paymentIdValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission(PERMISSIONS.DELETE_RECORDS),
  cancelPaymentHandler
);

// ── Cheque actions on a single payment ────────────────────

/**
 * @route   PATCH /api/v1/shops/:shopId/payments/:paymentId/cheque/clear
 * @desc    Mark cheque as cleared
 * @permission MAKE_PAYMENTS
 */
router.patch(
  '/:shopId/payments/:paymentId/cheque/clear',
  chequeClearanceValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.MAKE_PAYMENTS),
  clearChequeHandler
);

/**
 * @route   PATCH /api/v1/shops/:shopId/payments/:paymentId/cheque/bounce
 * @desc    Mark cheque as bounced
 * @permission MAKE_PAYMENTS
 */
router.patch(
  '/:shopId/payments/:paymentId/cheque/bounce',
  chequeBounceValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.MAKE_PAYMENTS),
  bounceChequeHandler
);

// ── Reconciliation on a single payment ────────────────────

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/reconcile
 * @desc    Reconcile payment with bank statement
 * @permission RECONCILE_PAYMENT
 */
router.post(
  '/:shopId/payments/:paymentId/reconcile',
  reconcilePaymentValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.RECONCILE_PAYMENT),
  reconcilePaymentHandler
);

// ── Receipt actions ────────────────────────────────────────

/**
 * @route   GET /api/v1/shops/:shopId/payments/:paymentId/receipt
 * @desc    Generate / download payment receipt
 * @permission VIEW_PAYMENTS
 */
router.get(
  '/:shopId/payments/:paymentId/receipt',
  paymentIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_PAYMENTS),
  getReceiptHandler
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/receipt/send
 * @desc    Send receipt via Email / SMS / WhatsApp
 * @permission MAKE_PAYMENTS
 */
router.post(
  '/:shopId/payments/:paymentId/receipt/send',
  sendReceiptValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.MAKE_PAYMENTS),
  sendReceiptHandler
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/receipt/regenerate
 * @desc    Regenerate receipt (if lost)
 * @permission MAKE_PAYMENTS
 */
router.post(
  '/:shopId/payments/:paymentId/receipt/regenerate',
  paymentIdValidation,
  checkShopAccess,
  checkPermission(PERMISSIONS.MAKE_PAYMENTS),
  regenerateReceiptHandler
);

// ── Approval actions ───────────────────────────────────────

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/approve
 * @desc    Approve high-value payment
 * @access  super_admin | org_admin | shop_admin
 * @permission APPROVE_TRANSACTIONS
 */
router.post(
  '/:shopId/payments/:paymentId/approve',
  paymentIdValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission(PERMISSIONS.APPROVE_TRANSACTIONS),
  approvePaymentHandler
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/reject
 * @desc    Reject payment
 * @access  super_admin | org_admin | shop_admin
 * @permission APPROVE_TRANSACTIONS
 */
router.post(
  '/:shopId/payments/:paymentId/reject',
  approvalValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission(PERMISSIONS.APPROVE_TRANSACTIONS),
  rejectPaymentHandler
);

// ── Refund on a single payment ─────────────────────────────

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/refund
 * @desc    Process refund for a payment
 * @access  super_admin | org_admin | shop_admin | manager
 * @permission MAKE_PAYMENTS
 */
router.post(
  '/:shopId/payments/:paymentId/refund',
  processRefundValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkPermission(PERMISSIONS.MAKE_PAYMENTS),
  processRefundHandler
);

export default router;