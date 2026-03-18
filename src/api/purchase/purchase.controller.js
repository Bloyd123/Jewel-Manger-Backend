// FILE: src/api/purchase/purchase.controller.js

import { catchAsync } from '../middlewares/errorHandler.js';
import * as purchaseService from './purchase.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/sendResponse.js';

/**
 POST /api/v1/shops/:shopId/purchases
 */
export const createPurchase = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const userId = req.user._id;
  const organizationId = req.user.organizationId; 

  const purchase = await purchaseService.createPurchase(
    shopId,
    organizationId, 
    req.body,
    userId
  );

  sendCreated(res, 'Purchase created successfully', purchase);
});

/**
 GET /api/v1/shops/:shopId/purchases
 */
export const getAllPurchases = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const organizationId = req.user.organizationId; // ← add
  const filters = req.query;

  const result = await purchaseService.getAllPurchases(
    shopId,
    organizationId, 
    filters
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

/**
  GET /api/v1/shops/:shopId/purchases/:purchaseId
 */
export const getPurchaseById = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; 
  const organizationId = req.user.organizationId; 

  const purchase = await purchaseService.getPurchaseById(
    purchaseId,
    shopId,        
    organizationId 
  );

  sendSuccess(res, 200, 'Purchase retrieved successfully', purchase);
});

/**
PUT /api/v1/shops/:shopId/purchases/:purchaseId
 */
export const updatePurchase = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; 
  const userId = req.user._id;
  const organizationId = req.user.organizationId; 

  const purchase = await purchaseService.updatePurchase(
    purchaseId,
    shopId,        
    organizationId, 
    req.body,
    userId
  );

  sendSuccess(res, 200, 'Purchase updated successfully', purchase);
});

/**
 DELETE /api/v1/shops/:shopId/purchases/:purchaseId
 */
export const deletePurchase = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; // ← shopId add
  const organizationId = req.user.organizationId; // ← add

  await purchaseService.deletePurchase(
    purchaseId,
    shopId,        // ← pass
    organizationId // ← pass
  );

  sendSuccess(res, 200, 'Purchase deleted successfully', null);
});

/** PATCH /api/v1/shops/:shopId/purchases/:purchaseId/status
 */
export const updatePurchaseStatus = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; 
  const { status } = req.body;
  const userId = req.user._id;
  const organizationId = req.user.organizationId; 

  const purchase = await purchaseService.updatePurchaseStatus(
    purchaseId,
    status,
    userId,
    shopId,        
    organizationId 
  );

  sendSuccess(res, 200, 'Purchase status updated successfully', purchase);
});

/**
 PATCH /api/v1/shops/:shopId/purchases/:purchaseId/receive
 */
export const receivePurchase = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; 
  const userId = req.user._id;
  const organizationId = req.user.organizationId; 
  const { receivedBy, receivedDate, notes } = req.body;

  const purchase = await purchaseService.receivePurchase(
    purchaseId,
    shopId,        
    organizationId, 
    { receivedBy, receivedDate, notes },
    userId
  );

  sendSuccess(res, 200, 'Purchase marked as received and inventory updated', purchase);
});

/**
PATCH /api/v1/shops/:shopId/purchases/:purchaseId/cancel
 */
export const cancelPurchase = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; 
  const { reason } = req.body;
  const userId = req.user._id;
  const organizationId = req.user.organizationId; 

  const purchase = await purchaseService.cancelPurchase(
    purchaseId,
    shopId,        
    organizationId, 
    reason,
    userId
  );

  sendSuccess(res, 200, 'Purchase cancelled successfully', purchase);
});

/** PATCH /api/v1/shops/:shopId/purchases/:purchaseId/return
 */
export const returnPurchase = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; 
  const { reason } = req.body;
  const userId = req.user._id;
  const organizationId = req.user.organizationId; 

  const purchase = await purchaseService.returnPurchase(
    purchaseId,
    shopId,        
    organizationId, 
    reason,
    userId
  );

  sendSuccess(res, 200, 'Purchase returned successfully', purchase);
});
/**
 POST /api/v1/shops/:shopId/purchases/:purchaseId/approve
 */
export const approvePurchase = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; 
  const userId = req.user._id;
  const organizationId = req.user.organizationId; 
  const { notes } = req.body;

  const purchase = await purchaseService.approvePurchase(
    purchaseId,
    shopId,
    organizationId, 
    userId,
    notes
  );

  sendSuccess(res, 200, 'Purchase approved successfully', purchase);
});

/**
POST /api/v1/shops/:shopId/purchases/:purchaseId/reject
 */
export const rejectPurchase = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; 
  const userId = req.user._id;
  const organizationId = req.user.organizationId; 
  const { reason } = req.body;

  const purchase = await purchaseService.rejectPurchase(
    purchaseId,
    shopId,        
    organizationId, 
    userId,
    reason
  );

  sendSuccess(res, 200, 'Purchase rejected successfully', purchase);
});


/**
 POST /api/v1/shops/:shopId/purchases/:purchaseId/payments
 */
export const addPayment = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; // ← shopId add
  const userId = req.user._id;
  const organizationId = req.user.organizationId; // ← add

  const result = await purchaseService.addPayment(
    purchaseId,
    req.body,
    userId,
    shopId,        
    organizationId 
  );

  sendSuccess(res, 200, 'Payment added successfully', result);
});

/**
GET /api/v1/shops/:shopId/purchases/:purchaseId/payments
 */
export const getPayments = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; 
  const organizationId = req.user.organizationId; 

  const payments = await purchaseService.getPayments(
    purchaseId,
    shopId,        
    organizationId 
  );

  sendSuccess(res, 200, 'Payments retrieved successfully', payments);
});
/**
 GET /api/v1/shops/:shopId/purchases/supplier/:supplierId
 */
export const getPurchasesBySupplier = catchAsync(async (req, res) => {
  const { shopId, supplierId } = req.params;
  const organizationId = req.user.organizationId; 
  const filters = req.query;

  const result = await purchaseService.getPurchasesBySupplier(
    shopId,
    supplierId,
    organizationId, 
    filters
  );

  sendPaginated(
    res,
    result.purchases,
    result.page,
    result.limit,
    result.total,
    'Supplier purchases retrieved successfully'
  );
});

/**
 GET /api/v1/shops/:shopId/purchases/analytics
 */
export const getPurchaseAnalytics = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const organizationId = req.user.organizationId; 
  const filters = req.query;

  const analytics = await purchaseService.getPurchaseAnalytics(
    shopId,
    organizationId, 
    filters
  );

  sendSuccess(res, 200, 'Purchase analytics retrieved successfully', analytics);
});

/**
 GET /api/v1/shops/:shopId/purchases/pending
 */
export const getPendingPurchases = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const organizationId = req.user.organizationId; 
  const { page, limit } = req.query; 

  const result = await purchaseService.getPendingPurchases(
    shopId,
    organizationId, 
    page,
    limit
  );

  sendPaginated(
    res,
    result.purchases,
    result.page,
    result.limit,
    result.total,
    'Pending purchases retrieved successfully'
  );
});

/**
 GET /api/v1/shops/:shopId/purchases/unpaid
 */
export const getUnpaidPurchases = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const organizationId = req.user.organizationId; // ← add
  const { page, limit } = req.query; // ← pagination add

  const result = await purchaseService.getUnpaidPurchases(
    shopId,
    organizationId, // ← pass
    page,
    limit
  );

  sendPaginated(
    res,
    result.purchases,
    result.page,
    result.limit,
    result.total,
    'Unpaid purchases retrieved successfully'
  );
});

/**
POST /api/v1/shops/:shopId/purchases/bulk-delete
 */
export const bulkDeletePurchases = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const organizationId = req.user.organizationId; // ← add
  const { purchaseIds } = req.body;

  const result = await purchaseService.bulkDeletePurchases(
    purchaseIds,
    shopId,        // ← pass
    organizationId // ← pass
  );

  sendSuccess(res, 200, `${result.deletedCount} purchases deleted successfully`, result);
});

/**
POST /api/v1/shops/:shopId/purchases/bulk-approve
 */
export const bulkApprovePurchases = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const organizationId = req.user.organizationId; // ← add
  const userId = req.user._id;
  const { purchaseIds } = req.body;

  const result = await purchaseService.bulkApprovePurchases(
    purchaseIds,
    userId,
    shopId,        
    organizationId 
  );

  sendSuccess(res, 200, `${result.approvedCount} purchases approved successfully`, result);
});

/**
 POST /api/v1/shops/:shopId/purchases/:purchaseId/documents
 */
export const uploadDocument = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; // ← shopId add
  const organizationId = req.user.organizationId; // ← add
  const { documentType, documentUrl, documentNumber } = req.body;

  const purchase = await purchaseService.uploadDocument(
    purchaseId,
    shopId,        
    organizationId, 
    { documentType, documentUrl, documentNumber }
  );

  sendSuccess(res, 200, 'Document uploaded successfully', purchase);
});

/**
GET /api/v1/shops/:shopId/purchases/:purchaseId/documents
 */
export const getDocuments = catchAsync(async (req, res) => {
  const { purchaseId, shopId } = req.params; // ← shopId add
  const organizationId = req.user.organizationId; // ← add

  const documents = await purchaseService.getDocuments(
    purchaseId,
    shopId,        // ← pass
    organizationId // ← pass
  );

  sendSuccess(res, 200, 'Documents retrieved successfully', documents);
});


//  GET /api/v1/shops/:shopId/purchases/search

export const searchPurchases = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const organizationId = req.user.organizationId; 
  const { q, limit = 20 } = req.query;

  const purchases = await purchaseService.searchPurchases(
    shopId,
    organizationId, 
    q,
    limit
  );

  sendSuccess(res, 200, 'Search results retrieved successfully', purchases);
});
//  GET /api/v1/shops/:shopId/purchases/by-date-range
export const getPurchasesByDateRange = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const organizationId = req.user.organizationId; 
  const { startDate, endDate, page = 1, limit = 20 } = req.query;

  const result = await purchaseService.getPurchasesByDateRange(
    shopId,
    organizationId, 
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