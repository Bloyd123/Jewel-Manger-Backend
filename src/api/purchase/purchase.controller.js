// ============================================================================
// FILE: src/api/purchase/purchase.controller.js
// Purchase Module Controller - All 22 Route Handlers
// ============================================================================

import { catchAsync } from '../middlewares/errorHandler.js';
import * as purchaseService from './purchase.service.js';
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNotFound,
} from '../../utils/sendResponse.js';
import { NotFoundError } from '../../utils/AppError.js';

// ============================================================================
// 1. PURCHASE CRUD OPERATIONS
// ============================================================================

/**
 * Create new purchase order/invoice
 * @route POST /api/v1/shops/:shopId/purchases
 */
export const createPurchase = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const userId = req.user._id;

  const purchase = await purchaseService.createPurchase(shopId, req.body, userId);

  sendCreated(res, 'Purchase created successfully', purchase);
});

/**
 * Get all purchases with filters & pagination
 * @route GET /api/v1/shops/:shopId/purchases
 */
export const getAllPurchases = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const filters = req.query;

  const result = await purchaseService.getAllPurchases(shopId, filters);

  sendPaginated(
    res,
    result.purchases,
    result.page,
    result.limit,
    result.total,
    'Purchases retrieved successfully'
  );
});

/**
 * Get single purchase by ID
 * @route GET /api/v1/shops/:shopId/purchases/:purchaseId
 */
export const getPurchaseById = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;

  const purchase = await purchaseService.getPurchaseById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  sendSuccess(res, 200, 'Purchase retrieved successfully', purchase);
});

/**
 * Update purchase details
 * @route PUT /api/v1/shops/:shopId/purchases/:purchaseId
 */
export const updatePurchase = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;
  const userId = req.user._id;

  const purchase = await purchaseService.updatePurchase(purchaseId, req.body, userId);

  sendSuccess(res, 200, 'Purchase updated successfully', purchase);
});

/**
 * Soft delete purchase
 * @route DELETE /api/v1/shops/:shopId/purchases/:purchaseId
 */
export const deletePurchase = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;

  await purchaseService.deletePurchase(purchaseId);

  sendSuccess(res, 200, 'Purchase deleted successfully', null);
});

// ============================================================================
// 2. PURCHASE STATUS MANAGEMENT
// ============================================================================

/**
 * Update purchase status
 * @route PATCH /api/v1/shops/:shopId/purchases/:purchaseId/status
 */
export const updatePurchaseStatus = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;
  const { status } = req.body;
  const userId = req.user._id;

  const purchase = await purchaseService.updatePurchaseStatus(purchaseId, status, userId);

  sendSuccess(res, 200, 'Purchase status updated successfully', purchase);
});

/**
 * Mark purchase as received (update inventory)
 * @route PATCH /api/v1/shops/:shopId/purchases/:purchaseId/receive
 */
export const receivePurchase = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;
  const userId = req.user._id;
  const { receivedBy, receivedDate, notes } = req.body;

  const purchase = await purchaseService.receivePurchase(
    purchaseId,
    { receivedBy, receivedDate, notes },
    userId
  );

  sendSuccess(res, 200, 'Purchase marked as received and inventory updated', purchase);
});

/**
 * Cancel purchase
 * @route PATCH /api/v1/shops/:shopId/purchases/:purchaseId/cancel
 */
export const cancelPurchase = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;
  const { reason } = req.body;

  const purchase = await purchaseService.cancelPurchase(purchaseId, reason);

  sendSuccess(res, 200, 'Purchase cancelled successfully', purchase);
});

// ============================================================================
// 3. PURCHASE APPROVAL
// ============================================================================

/**
 * Approve purchase
 * @route POST /api/v1/shops/:shopId/purchases/:purchaseId/approve
 */
export const approvePurchase = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;
  const userId = req.user._id;
  const { notes } = req.body;

  const purchase = await purchaseService.approvePurchase(purchaseId, userId, notes);

  sendSuccess(res, 200, 'Purchase approved successfully', purchase);
});

/**
 * Reject purchase
 * @route POST /api/v1/shops/:shopId/purchases/:purchaseId/reject
 */
export const rejectPurchase = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;
  const userId = req.user._id;
  const { reason } = req.body;

  const purchase = await purchaseService.rejectPurchase(purchaseId, userId, reason);

  sendSuccess(res, 200, 'Purchase rejected successfully', purchase);
});

// ============================================================================
// 4. PAYMENT MANAGEMENT
// ============================================================================

/**
 * Add payment to purchase
 * @route POST /api/v1/shops/:shopId/purchases/:purchaseId/payments
 */
export const addPayment = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;
  const userId = req.user._id;

  const purchase = await purchaseService.addPayment(purchaseId, req.body, userId);

  sendSuccess(res, 200, 'Payment added successfully', purchase);
});

/**
 * Get all payments for a purchase
 * @route GET /api/v1/shops/:shopId/purchases/:purchaseId/payments
 */
export const getPayments = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;

  const payments = await purchaseService.getPayments(purchaseId);

  sendSuccess(res, 200, 'Payments retrieved successfully', payments);
});

// ============================================================================
// 5. SUPPLIER-SPECIFIC PURCHASES
// ============================================================================

/**
 * Get all purchases from a specific supplier
 * @route GET /api/v1/shops/:shopId/purchases/supplier/:supplierId
 */
export const getPurchasesBySupplier = catchAsync(async (req, res) => {
  const { shopId, supplierId } = req.params;
  const filters = req.query;

  const result = await purchaseService.getPurchasesBySupplier(shopId, supplierId, filters);

  sendPaginated(
    res,
    result.purchases,
    result.page,
    result.limit,
    result.total,
    'Supplier purchases retrieved successfully'
  );
});

// ============================================================================
// 6. PURCHASE ANALYTICS & REPORTS
// ============================================================================

/**
 * Get purchase analytics & summary
 * @route GET /api/v1/shops/:shopId/purchases/analytics
 */
export const getPurchaseAnalytics = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const filters = req.query;

  const analytics = await purchaseService.getPurchaseAnalytics(shopId, filters);

  sendSuccess(res, 200, 'Purchase analytics retrieved successfully', analytics);
});

/**
 * Get all pending/incomplete purchases
 * @route GET /api/v1/shops/:shopId/purchases/pending
 */
export const getPendingPurchases = catchAsync(async (req, res) => {
  const { shopId } = req.params;

  const purchases = await purchaseService.getPendingPurchases(shopId);

  sendSuccess(res, 200, 'Pending purchases retrieved successfully', purchases);
});

/**
 * Get all unpaid/partially paid purchases
 * @route GET /api/v1/shops/:shopId/purchases/unpaid
 */
export const getUnpaidPurchases = catchAsync(async (req, res) => {
  const { shopId } = req.params;

  const purchases = await purchaseService.getUnpaidPurchases(shopId);

  sendSuccess(res, 200, 'Unpaid purchases retrieved successfully', purchases);
});

// ============================================================================
// 7. BULK OPERATIONS
// ============================================================================

/**
 * Bulk delete multiple purchases (draft only)
 * @route POST /api/v1/shops/:shopId/purchases/bulk-delete
 */
export const bulkDeletePurchases = catchAsync(async (req, res) => {
  const { purchaseIds } = req.body;

  const result = await purchaseService.bulkDeletePurchases(purchaseIds);

  sendSuccess(res, 200, `${result.deletedCount} purchases deleted successfully`, result);
});

/**
 * Bulk approve multiple purchases
 * @route POST /api/v1/shops/:shopId/purchases/bulk-approve
 */
export const bulkApprovePurchases = catchAsync(async (req, res) => {
  const { purchaseIds } = req.body;
  const userId = req.user._id;

  const result = await purchaseService.bulkApprovePurchases(purchaseIds, userId);

  sendSuccess(res, 200, `${result.approvedCount} purchases approved successfully`, result);
});

// ============================================================================
// 8. PURCHASE DOCUMENTS
// ============================================================================

/**
 * Upload purchase-related documents
 * @route POST /api/v1/shops/:shopId/purchases/:purchaseId/documents
 */
export const uploadDocument = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;
  const { documentType, documentUrl, documentNumber } = req.body;

  const purchase = await purchaseService.uploadDocument(purchaseId, {
    documentType,
    documentUrl,
    documentNumber,
  });

  sendSuccess(res, 200, 'Document uploaded successfully', purchase);
});

/**
 * Get all documents for a purchase
 * @route GET /api/v1/shops/:shopId/purchases/:purchaseId/documents
 */
export const getDocuments = catchAsync(async (req, res) => {
  const { purchaseId } = req.params;

  const documents = await purchaseService.getDocuments(purchaseId);

  sendSuccess(res, 200, 'Documents retrieved successfully', documents);
});

// ============================================================================
// 9. PURCHASE FILTERS & SEARCH
// ============================================================================

/**
 * Quick search purchases
 * @route GET /api/v1/shops/:shopId/purchases/search
 */
export const searchPurchases = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { q, limit = 20 } = req.query;

  const purchases = await purchaseService.searchPurchases(shopId, q, limit);

  sendSuccess(res, 200, 'Search results retrieved successfully', purchases);
});

/**
 * Get purchases within date range
 * @route GET /api/v1/shops/:shopId/purchases/by-date-range
 */
export const getPurchasesByDateRange = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { startDate, endDate, page = 1, limit = 20 } = req.query;

  const result = await purchaseService.getPurchasesByDateRange(
    shopId,
    startDate,
    endDate,
    page,
    limit
  );

  sendPaginated(
    res,
    result.purchases,
    result.page,
    result.limit,
    result.total,
    'Purchases retrieved successfully'
  );
});