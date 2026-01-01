// ============================================================================
// FILE: src/api/payment/payment.routes.js
// Payment Routes - Complete Payment Module (43 Routes)
// ============================================================================

import express from 'express';
import paymentController from './payment.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { restrictTo } from '../../middlewares/restrictTo.js';
import { checkShopAccess, checkPermission } from '../../middlewares/checkShopAccess.js';
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

// ============================================================================
// APPLY AUTHENTICATION TO ALL ROUTES
// ============================================================================
router.use(authenticate);

// ============================================================================
// 1. PAYMENT CRUD OPERATIONS (5 routes)
// ============================================================================

/**
 * @route   POST /api/v1/shops/:shopId/payments
 * @desc    Create new payment/receipt
 * @access  Private (super_admin, org_admin, shop_admin, manager, staff, accountant)
 * @permission canReceivePayments OR canMakePayments
 */
router.post(
  '/:shopId/payments',
  shopIdValidation,
  createPaymentValidation,
  checkShopAccess,
  checkPermission('canReceivePayments'),
  paymentController.createPayment
);

/**
 * @route   GET /api/v1/shops/:shopId/payments
 * @desc    Get all payments with filters
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments',
  shopIdValidation,
  getPaymentsValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getAllPayments
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/:paymentId
 * @desc    Get single payment details
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/:paymentId',
  paymentIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getPaymentById
);

/**
 * @route   PUT /api/v1/shops/:shopId/payments/:paymentId
 * @desc    Update payment (only pending status)
 * @access  Private (super_admin, org_admin, shop_admin, manager, accountant)
 * @permission canMakePayments
 */
router.put(
  '/:shopId/payments/:paymentId',
  updatePaymentValidation,
  checkShopAccess,
  checkPermission('canMakePayments'),
  paymentController.updatePayment
);

/**
 * @route   DELETE /api/v1/shops/:shopId/payments/:paymentId
 * @desc    Soft delete payment (only pending)
 * @access  Private (super_admin, org_admin, shop_admin)
 * @permission canDeleteRecords
 */
router.delete(
  '/:shopId/payments/:paymentId',
  paymentIdValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission('canDeleteRecords'),
  paymentController.deletePayment
);

// ============================================================================
// 2. PAYMENT STATUS MANAGEMENT (3 routes)
// ============================================================================

/**
 * @route   PATCH /api/v1/shops/:shopId/payments/:paymentId/status
 * @desc    Update payment status
 * @access  Private (super_admin, org_admin, shop_admin, accountant)
 * @permission canMakePayments
 */
router.patch(
  '/:shopId/payments/:paymentId/status',
  updatePaymentStatusValidation,
  checkShopAccess,
  checkPermission('canMakePayments'),
  paymentController.updatePaymentStatus
);

/**
 * @route   PATCH /api/v1/shops/:shopId/payments/:paymentId/complete
 * @desc    Mark payment as completed
 * @access  Private (super_admin, org_admin, shop_admin, manager, accountant)
 * @permission canMakePayments
 */
router.patch(
  '/:shopId/payments/:paymentId/complete',
  paymentIdValidation,
  checkShopAccess,
  checkPermission('canMakePayments'),
  paymentController.markAsCompleted
);

/**
 * @route   PATCH /api/v1/shops/:shopId/payments/:paymentId/cancel
 * @desc    Cancel payment
 * @access  Private (super_admin, org_admin, shop_admin)
 * @permission canDeleteRecords
 */
router.patch(
  '/:shopId/payments/:paymentId/cancel',
  paymentIdValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission('canDeleteRecords'),
  paymentController.cancelPayment
);

// ============================================================================
// 3. CHEQUE MANAGEMENT (5 routes)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/payments/cheques/pending
 * @desc    Get all pending cheques
 * @access  Private (super_admin, org_admin, shop_admin, manager, accountant)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/cheques/pending',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getPendingCheques
);

/**
 * @route   PATCH /api/v1/shops/:shopId/payments/:paymentId/cheque/clear
 * @desc    Mark cheque as cleared
 * @access  Private (super_admin, org_admin, shop_admin, accountant)
 * @permission canMakePayments
 */
router.patch(
  '/:shopId/payments/:paymentId/cheque/clear',
  chequeClearanceValidation,
  checkShopAccess,
  checkPermission('canMakePayments'),
  paymentController.clearCheque
);

/**
 * @route   PATCH /api/v1/shops/:shopId/payments/:paymentId/cheque/bounce
 * @desc    Mark cheque as bounced
 * @access  Private (super_admin, org_admin, shop_admin, accountant)
 * @permission canMakePayments
 */
router.patch(
  '/:shopId/payments/:paymentId/cheque/bounce',
  chequeBounceValidation,
  checkShopAccess,
  checkPermission('canMakePayments'),
  paymentController.bounceCheque
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/cheques/bounced
 * @desc    Get all bounced cheques
 * @access  Private (super_admin, org_admin, shop_admin, manager, accountant)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/cheques/bounced',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getBouncedCheques
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/cheques/cleared
 * @desc    Get all cleared cheques (within date range)
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/cheques/cleared',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getClearedCheques
);

// ============================================================================
// 4. RECONCILIATION (3 routes)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/payments/reconciliation/pending
 * @desc    Get unreconciled payments
 * @access  Private (super_admin, org_admin, shop_admin, accountant)
 * @permission canViewFinancials
 */
router.get(
  '/:shopId/payments/reconciliation/pending',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewFinancials'),
  paymentController.getUnreconciledPayments
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/reconcile
 * @desc    Reconcile payment with bank statement
 * @access  Private (super_admin, org_admin, shop_admin, accountant)
 * @permission canManageFinancials
 */
router.post(
  '/:shopId/payments/:paymentId/reconcile',
  reconcilePaymentValidation,
  checkShopAccess,
  checkPermission('canManageFinancials'),
  paymentController.reconcilePayment
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/reconciliation/summary
 * @desc    Reconciliation summary report
 * @access  Private (super_admin, org_admin, shop_admin, accountant)
 * @permission canViewFinancials
 */
router.get(
  '/:shopId/payments/reconciliation/summary',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewFinancials'),
  paymentController.getReconciliationSummary
);

// ============================================================================
// 5. RECEIPT GENERATION (3 routes)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/payments/:paymentId/receipt
 * @desc    Generate/Download payment receipt
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/:paymentId/receipt',
  paymentIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getReceipt
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/receipt/send
 * @desc    Send receipt via Email/SMS/WhatsApp
 * @access  Private (super_admin, org_admin, shop_admin, manager, staff, accountant)
 * @permission canMakePayments
 */
router.post(
  '/:shopId/payments/:paymentId/receipt/send',
  sendReceiptValidation,
  checkShopAccess,
  checkPermission('canMakePayments'),
  paymentController.sendReceipt
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/receipt/regenerate
 * @desc    Regenerate receipt (if lost)
 * @access  Private (super_admin, org_admin, shop_admin, accountant)
 * @permission canMakePayments
 */
router.post(
  '/:shopId/payments/:paymentId/receipt/regenerate',
  paymentIdValidation,
  checkShopAccess,
  checkPermission('canMakePayments'),
  paymentController.regenerateReceipt
);

// ============================================================================
// 6. PARTY-SPECIFIC PAYMENTS (4 routes)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/payments/party/:partyId
 * @desc    Get all payments for a party (customer/supplier)
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/party/:partyId',
  partyPaymentsValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getPartyPayments
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/party/:partyId/summary
 * @desc    Party payment summary
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/party/:partyId/summary',
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getPartyPaymentSummary
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/customers/:customerId
 * @desc    Get customer payments only
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/customers/:customerId',
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getCustomerPayments
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/suppliers/:supplierId
 * @desc    Get supplier payments only
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/suppliers/:supplierId',
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getSupplierPayments
);

// ============================================================================
// 7. PAYMENT MODE ANALYTICS (3 routes)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/payments/by-mode
 * @desc    Payment breakdown by mode
 * @access  Private (super_admin, org_admin, shop_admin, manager, accountant)
 * @permission canViewAnalytics
 */
router.get(
  '/:shopId/payments/by-mode',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewAnalytics'),
  paymentController.getPaymentsByMode
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/cash-collection
 * @desc    Daily cash collection summary
 * @access  Private (super_admin, org_admin, shop_admin, manager, accountant)
 * @permission canViewFinancials
 */
router.get(
  '/:shopId/payments/cash-collection',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewFinancials'),
  paymentController.getCashCollection
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/digital-collection
 * @desc    Digital payment summary (UPI/Card/Wallet)
 * @access  Private (super_admin, org_admin, shop_admin, manager, accountant)
 * @permission canViewFinancials
 */
router.get(
  '/:shopId/payments/digital-collection',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewFinancials'),
  paymentController.getDigitalCollection
);

// ============================================================================
// 8. PAYMENT ANALYTICS & REPORTS (5 routes)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/payments/analytics
 * @desc    Comprehensive payment analytics
 * @access  Private (super_admin, org_admin, shop_admin, manager, accountant)
 * @permission canViewAnalytics
 */
router.get(
  '/:shopId/payments/analytics',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewAnalytics'),
  paymentController.getPaymentAnalytics
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/dashboard
 * @desc    Payment dashboard (quick overview)
 * @access  Private (All authenticated users)
 * @permission canViewDashboard
 */
router.get(
  '/:shopId/payments/dashboard',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewDashboard'),
  paymentController.getPaymentDashboard
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/today
 * @desc    Today's payment summary
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/today',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getTodayPayments
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/pending
 * @desc    All pending payments
 * @access  Private (super_admin, org_admin, shop_admin, manager, accountant)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/pending',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getPendingPayments
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/failed
 * @desc    All failed payments
 * @access  Private (super_admin, org_admin, shop_admin, manager, accountant)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/failed',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getFailedPayments
);

// ============================================================================
// 9. PAYMENT REFERENCES (2 routes)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/payments/reference/sale/:saleId
 * @desc    Get all payments for a specific sale
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/reference/sale/:saleId',
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getSalePayments
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/reference/purchase/:purchaseId
 * @desc    Get all payments for a specific purchase
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/reference/purchase/:purchaseId',
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getPurchasePayments
);

// ============================================================================
// 10. ADVANCED SEARCH & FILTERS (3 routes)
// ============================================================================

/**
 * @route   GET /api/v1/shops/:shopId/payments/search
 * @desc    Quick search payments
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/search',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.searchPayments
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/by-date-range
 * @desc    Get payments within date range
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/by-date-range',
  dateRangeValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getPaymentsByDateRange
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/by-amount-range
 * @desc    Filter payments by amount range
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/by-amount-range',
  amountRangeValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getPaymentsByAmountRange
);

// ============================================================================
// 11. BULK OPERATIONS (3 routes)
// ============================================================================

/**
 * @route   POST /api/v1/shops/:shopId/payments/bulk-reconcile
 * @desc    Bulk reconcile multiple payments
 * @access  Private (super_admin, org_admin, shop_admin, accountant)
 * @permission canManageFinancials
 */
router.post(
  '/:shopId/payments/bulk-reconcile',
  bulkReconcileValidation,
  checkShopAccess,
  checkPermission('canManageFinancials'),
  paymentController.bulkReconcilePayments
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/bulk-export
 * @desc    Export payments to Excel/CSV
 * @access  Private (super_admin, org_admin, shop_admin, accountant)
 * @permission canExportData
 */
router.post(
  '/:shopId/payments/bulk-export',
  bulkExportValidation,
  checkShopAccess,
  checkPermission('canExportData'),
  paymentController.bulkExportPayments
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/bulk-print-receipts
 * @desc    Bulk print receipts
 * @access  Private (All authenticated users)
 * @permission canViewPayments
 */
router.post(
  '/:shopId/payments/bulk-print-receipts',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.bulkPrintReceipts
);

// ============================================================================
// 12. PAYMENT APPROVAL (2 routes)
// ============================================================================

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/approve
 * @desc    Approve high-value payment
 * @access  Private (super_admin, org_admin, shop_admin)
 * @permission canApproveTransactions
 */
router.post(
  '/:shopId/payments/:paymentId/approve',
  paymentIdValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission('canApproveTransactions'),
  paymentController.approvePayment
);

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/reject
 * @desc    Reject payment
 * @access  Private (super_admin, org_admin, shop_admin)
 * @permission canApproveTransactions
 */
router.post(
  '/:shopId/payments/:paymentId/reject',
  approvalValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission('canApproveTransactions'),
  paymentController.rejectPayment
);

// ============================================================================
// 13. REFUND MANAGEMENT (2 routes)
// ============================================================================

/**
 * @route   POST /api/v1/shops/:shopId/payments/:paymentId/refund
 * @desc    Process refund for a payment
 * @access  Private (super_admin, org_admin, shop_admin, manager)
 * @permission canMakePayments
 */
router.post(
  '/:shopId/payments/:paymentId/refund',
  processRefundValidation,
  checkShopAccess,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkPermission('canMakePayments'),
  paymentController.processRefund
);

/**
 * @route   GET /api/v1/shops/:shopId/payments/refunds
 * @desc    Get all refunds
 * @access  Private (super_admin, org_admin, shop_admin, accountant)
 * @permission canViewPayments
 */
router.get(
  '/:shopId/payments/refunds',
  shopIdValidation,
  checkShopAccess,
  checkPermission('canViewPayments'),
  paymentController.getRefunds
);

// ============================================================================
// EXPORT ROUTER
// ============================================================================
export default router;
