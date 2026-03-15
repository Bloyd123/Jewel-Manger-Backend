// FILE: src/api/payment/payment.controller.js
// Payment Controller - Request Handlers

import { validationResult } from 'express-validator';
import {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  updatePaymentStatus,
  markAsCompleted,
  cancelPayment,
  getPendingCheques,
  clearCheque,
  bounceCheque,
  getBouncedCheques,
  getClearedCheques,
  getUnreconciledPayments,
  reconcilePayment,
  getReconciliationSummary,
  getReceipt,
  sendReceipt,
  regenerateReceipt,
  getPartyPayments,
  getPartyPaymentSummary,
  getCustomerPayments,
  getSupplierPayments,
  getPaymentsByMode,
  getCashCollection,
  getDigitalCollection,
  getPaymentAnalytics,
  getPaymentDashboard,
  getTodayPayments,
  getPendingPayments,
  getFailedPayments,
  getSalePayments,
  getPurchasePayments,
  searchPayments,
  getPaymentsByDateRange,
  getPaymentsByAmountRange,
  bulkReconcilePayments,
  bulkExportPayments,
  bulkPrintReceipts,
  approvePayment,
  rejectPayment,
  processRefund,
  getRefunds,
} from './payment.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendValidationError,
} from '../../utils/sendResponse.js';
import { catchAsync } from '../middlewares/errorHandler.js';

// 1. CREATE PAYMENT
// POST /api/v1/shops/:shopId/payments

export const createPaymentHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId } = req.params;
  const result = await createPayment(
    shopId,
    req.user.organizationId,
    req.user._id,
    req.body
  );

  return sendCreated(res, result.message, result.data);
});

// 2. GET ALL PAYMENTS
// GET /api/v1/shops/:shopId/payments

export const getAllPaymentsHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await getAllPayments(shopId, req.query);

  return sendSuccess(res, 200, result.message, result.data, {
    pagination: result.pagination,
  });
});

// 3. GET SINGLE PAYMENT
// GET /api/v1/shops/:shopId/payments/:paymentId

export const getPaymentByIdHandler = catchAsync(async (req, res) => {
  const { shopId, paymentId } = req.params;
  const result = await getPaymentById(paymentId, shopId);

  return sendSuccess(res, 200, result.message, result.data);
});

// 4. UPDATE PAYMENT
// PUT /api/v1/shops/:shopId/payments/:paymentId

export const updatePaymentHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, paymentId } = req.params;
  const result = await updatePayment(paymentId, shopId, req.user._id, req.body);

  return sendSuccess(res, 200, result.message, result.data);
});

// 5. DELETE PAYMENT
// DELETE /api/v1/shops/:shopId/payments/:paymentId

export const deletePaymentHandler = catchAsync(async (req, res) => {
  const { shopId, paymentId } = req.params;
  const result = await deletePayment(
    paymentId,
    shopId,
    req.user._id,
    req.user.organizationId
  );

  return sendSuccess(res, 200, result.message);
});

// 6. UPDATE PAYMENT STATUS
// PATCH /api/v1/shops/:shopId/payments/:paymentId/status

export const updatePaymentStatusHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, paymentId } = req.params;
  const { status, reason } = req.body;

  const result = await updatePaymentStatus(
    paymentId,
    shopId,
    req.user._id,
    status,
    reason
  );

  return sendSuccess(res, 200, result.message, result.data);
});

// 7. MARK PAYMENT AS COMPLETED
// PATCH /api/v1/shops/:shopId/payments/:paymentId/complete

export const markAsCompletedHandler = catchAsync(async (req, res) => {
  const { shopId, paymentId } = req.params;
  const result = await markAsCompleted(paymentId, shopId, req.user._id);

  return sendSuccess(res, 200, result.message, result.data);
});

// 8. CANCEL PAYMENT
// PATCH /api/v1/shops/:shopId/payments/:paymentId/cancel

export const cancelPaymentHandler = catchAsync(async (req, res) => {
  const { shopId, paymentId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return sendBadRequest(res, 'Cancellation reason is required');
  }

  const result = await cancelPayment(paymentId, shopId, req.user._id, reason);

  return sendSuccess(res, 200, result.message, result.data);
});

// 9. GET PENDING CHEQUES
// GET /api/v1/shops/:shopId/payments/cheques/pending

export const getPendingChequesHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await getPendingCheques(shopId);

  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});

// 10. CLEAR CHEQUE
// PATCH /api/v1/shops/:shopId/payments/:paymentId/cheque/clear

export const clearChequeHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, paymentId } = req.params;
  const { clearanceDate, notes } = req.body;

  const result = await clearCheque(
    paymentId,
    shopId,
    req.user._id,
    clearanceDate,
    notes
  );

  return sendSuccess(res, 200, result.message, result.data);
});

// 11. BOUNCE CHEQUE
// PATCH /api/v1/shops/:shopId/payments/:paymentId/cheque/bounce

export const bounceChequeHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, paymentId } = req.params;
  const { bounceReason, notes } = req.body;

  const result = await bounceCheque(
    paymentId,
    shopId,
    req.user._id,
    bounceReason,
    notes
  );

  return sendSuccess(res, 200, result.message, result.data);
});

// 12. GET BOUNCED CHEQUES
// GET /api/v1/shops/:shopId/payments/cheques/bounced

export const getBouncedChequesHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await getBouncedCheques(shopId);

  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});

// 13. GET CLEARED CHEQUES
// GET /api/v1/shops/:shopId/payments/cheques/cleared

export const getClearedChequesHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { startDate, endDate } = req.query;

  const result = await getClearedCheques(shopId, startDate, endDate);

  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});

// 14. GET UNRECONCILED PAYMENTS
// GET /api/v1/shops/:shopId/payments/reconciliation/pending

export const getUnreconciledPaymentsHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await getUnreconciledPayments(shopId);

  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});

// 15. RECONCILE PAYMENT
// POST /api/v1/shops/:shopId/payments/:paymentId/reconcile

export const reconcilePaymentHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, paymentId } = req.params;
  const { reconciledWith, discrepancy, notes } = req.body;

  const result = await reconcilePayment(
    paymentId,
    shopId,
    req.user._id,
    reconciledWith,
    discrepancy,
    notes
  );

  return sendSuccess(res, 200, result.message, result.data);
});

// 16. GET RECONCILIATION SUMMARY
// GET /api/v1/shops/:shopId/payments/reconciliation/summary

export const getReconciliationSummaryHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { startDate, endDate } = req.query;

  const result = await getReconciliationSummary(shopId, startDate, endDate);

  return sendSuccess(res, 200, result.message, result.data);
});

// 17. GET RECEIPT
// GET /api/v1/shops/:shopId/payments/:paymentId/receipt

export const getReceiptHandler = catchAsync(async (req, res) => {
  const { shopId, paymentId } = req.params;
  const result = await getReceipt(paymentId, shopId);

  // TODO: Generate actual PDF receipt
  return sendSuccess(res, 200, result.message, result.data);
});

// 18. SEND RECEIPT
// POST /api/v1/shops/:shopId/payments/:paymentId/receipt/send

export const sendReceiptHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, paymentId } = req.params;
  const { method, recipient } = req.body;

  const result = await sendReceipt(
    paymentId,
    shopId,
    req.user._id,
    method,
    recipient
  );

  return sendSuccess(res, 200, result.message);
});

// 19. REGENERATE RECEIPT
// POST /api/v1/shops/:shopId/payments/:paymentId/receipt/regenerate

export const regenerateReceiptHandler = catchAsync(async (req, res) => {
  const { shopId, paymentId } = req.params;
  const result = await regenerateReceipt(paymentId, shopId, req.user._id);

  return sendSuccess(res, 200, result.message, result.data);
});

// 20. GET PARTY PAYMENTS
// GET /api/v1/shops/:shopId/payments/party/:partyId

export const getPartyPaymentsHandler = catchAsync(async (req, res) => {
  const { shopId, partyId } = req.params;
  const result = await getPartyPayments(shopId, partyId, req.query);

  return sendSuccess(res, 200, result.message, result.data, {
    pagination: result.pagination,
  });
});

// 21. GET PARTY PAYMENT SUMMARY
// GET /api/v1/shops/:shopId/payments/party/:partyId/summary

export const getPartyPaymentSummaryHandler = catchAsync(async (req, res) => {
  const { shopId, partyId } = req.params;
  const result = await getPartyPaymentSummary(shopId, partyId);

  return sendSuccess(res, 200, result.message, result.data);
});

// 22. GET CUSTOMER PAYMENTS
// GET /api/v1/shops/:shopId/payments/customers/:customerId

export const getCustomerPaymentsHandler = catchAsync(async (req, res) => {
  const { shopId, customerId } = req.params;
  const result = await getCustomerPayments(shopId, customerId, req.query);

  return sendSuccess(res, 200, result.message, result.data, {
    pagination: result.pagination,
  });
});

// 23. GET SUPPLIER PAYMENTS
// GET /api/v1/shops/:shopId/payments/suppliers/:supplierId

export const getSupplierPaymentsHandler = catchAsync(async (req, res) => {
  const { shopId, supplierId } = req.params;
  const result = await getSupplierPayments(shopId, supplierId, req.query);

  return sendSuccess(res, 200, result.message, result.data, {
    pagination: result.pagination,
  });
});

// 24. GET PAYMENT BY MODE
// GET /api/v1/shops/:shopId/payments/by-mode

export const getPaymentsByModeHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { startDate, endDate } = req.query;

  const result = await getPaymentsByMode(shopId, startDate, endDate);

  return sendSuccess(res, 200, result.message, result.data);
});

// 25. GET CASH COLLECTION
// GET /api/v1/shops/:shopId/payments/cash-collection

export const getCashCollectionHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { date } = req.query;

  const result = await getCashCollection(shopId, date);

  return sendSuccess(res, 200, result.message, result.data);
});

// 26. GET DIGITAL COLLECTION
// GET /api/v1/shops/:shopId/payments/digital-collection

export const getDigitalCollectionHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { startDate, endDate } = req.query;

  const result = await getDigitalCollection(shopId, startDate, endDate);

  return sendSuccess(res, 200, result.message, result.data);
});

// 27. GET PAYMENT ANALYTICS
// GET /api/v1/shops/:shopId/payments/analytics

export const getPaymentAnalyticsHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { startDate, endDate, groupBy } = req.query;

  const result = await getPaymentAnalytics(shopId, startDate, endDate, groupBy);

  return sendSuccess(res, 200, result.message, result.data);
});

// 28. GET PAYMENT DASHBOARD
// GET /api/v1/shops/:shopId/payments/dashboard

export const getPaymentDashboardHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await getPaymentDashboard(shopId);

  return sendSuccess(res, 200, result.message, result.data);
});

// 29. GET TODAY'S PAYMENTS
// GET /api/v1/shops/:shopId/payments/today

export const getTodayPaymentsHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await getTodayPayments(shopId);

  return sendSuccess(res, 200, result.message, result.data);
});

// 30. GET PENDING PAYMENTS
// GET /api/v1/shops/:shopId/payments/pending

export const getPendingPaymentsHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await getPendingPayments(shopId);

  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});

// 31. GET FAILED PAYMENTS
// GET /api/v1/shops/:shopId/payments/failed

export const getFailedPaymentsHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await getFailedPayments(shopId);

  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});

// 32. GET SALE PAYMENTS
// GET /api/v1/shops/:shopId/payments/reference/sale/:saleId

export const getSalePaymentsHandler = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const result = await getSalePayments(shopId, saleId);

  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});

// 33. GET PURCHASE PAYMENTS
// GET /api/v1/shops/:shopId/payments/reference/purchase/:purchaseId

export const getPurchasePaymentsHandler = catchAsync(async (req, res) => {
  const { shopId, purchaseId } = req.params;
  const result = await getPurchasePayments(shopId, purchaseId);

  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});

// 34. SEARCH PAYMENTS
// GET /api/v1/shops/:shopId/payments/search

export const searchPaymentsHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { q, limit } = req.query;

  if (!q) {
    return sendBadRequest(res, 'Search query is required');
  }

  const result = await searchPayments(shopId, q, limit);

  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});

// 35. GET PAYMENTS BY DATE RANGE
// GET /api/v1/shops/:shopId/payments/by-date-range

export const getPaymentsByDateRangeHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId } = req.params;
  const { startDate, endDate } = req.query;

  const result = await getPaymentsByDateRange(
    shopId,
    startDate,
    endDate,
    req.query
  );

  return sendSuccess(res, 200, result.message, result.data, {
    pagination: result.pagination,
  });
});

// 36. GET PAYMENTS BY AMOUNT RANGE
// GET /api/v1/shops/:shopId/payments/by-amount-range

export const getPaymentsByAmountRangeHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId } = req.params;
  const { minAmount, maxAmount } = req.query;

  const result = await getPaymentsByAmountRange(
    shopId,
    minAmount,
    maxAmount,
    req.query
  );

  return sendSuccess(res, 200, result.message, result.data, {
    pagination: result.pagination,
  });
});

// 37. BULK RECONCILE PAYMENTS
// POST /api/v1/shops/:shopId/payments/bulk-reconcile

export const bulkReconcilePaymentsHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId } = req.params;
  const { paymentIds, reconciledWith, notes } = req.body;

  const result = await bulkReconcilePayments(
    shopId,
    req.user._id,
    paymentIds,
    reconciledWith,
    notes
  );

  return sendSuccess(res, 200, result.message, result.data);
});

// 38. BULK EXPORT PAYMENTS
// POST /api/v1/shops/:shopId/payments/bulk-export

export const bulkExportPaymentsHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId } = req.params;
  const { paymentIds, format } = req.body;

  const result = await bulkExportPayments(shopId, paymentIds, format);

  // TODO: Return actual file download
  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
    format: result.format,
  });
});

// 39. BULK PRINT RECEIPTS
// POST /api/v1/shops/:shopId/payments/bulk-print-receipts

export const bulkPrintReceiptsHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { paymentIds } = req.body;

  if (!paymentIds || paymentIds.length === 0) {
    return sendBadRequest(res, 'Payment IDs are required');
  }

  const result = await bulkPrintReceipts(shopId, paymentIds);

  // TODO: Return actual PDF
  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});

// 40. APPROVE PAYMENT
// POST /api/v1/shops/:shopId/payments/:paymentId/approve

export const approvePaymentHandler = catchAsync(async (req, res) => {
  const { shopId, paymentId } = req.params;
  const { notes } = req.body;

  const result = await approvePayment(paymentId, shopId, req.user._id, notes);

  return sendSuccess(res, 200, result.message, result.data);
});

// 41. REJECT PAYMENT
// POST /api/v1/shops/:shopId/payments/:paymentId/reject

export const rejectPaymentHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, paymentId } = req.params;
  const { reason } = req.body;

  const result = await rejectPayment(paymentId, shopId, req.user._id, reason);

  return sendSuccess(res, 200, result.message, result.data);
});

// 42. PROCESS REFUND
// POST /api/v1/shops/:shopId/payments/:paymentId/refund

export const processRefundHandler = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { shopId, paymentId } = req.params;

  const result = await processRefund(
    paymentId,
    shopId,
    req.user.organizationId,
    req.user._id,
    req.body
  );

  return sendCreated(res, result.message, result.data);
});

// 43. GET REFUNDS
// GET /api/v1/shops/:shopId/payments/refunds

export const getRefundsHandler = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const result = await getRefunds(shopId);

  return sendSuccess(res, 200, result.message, result.data, {
    count: result.count,
  });
});