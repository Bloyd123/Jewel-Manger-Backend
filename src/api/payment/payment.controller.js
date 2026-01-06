// ============================================================================
// FILE: src/api/payment/payment.controller.js
// Payment Controller - Request Handlers
// ============================================================================

import { validationResult } from 'express-validator';
import paymentService from './payment.service.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
  sendValidationError,
} from '../../utils/sendResponse.js';
import { catchAsync } from '../middlewares/errorHandler.js';

class PaymentController {
  // ============================================================================
  // 1. CREATE PAYMENT
  // POST /api/v1/shops/:shopId/payments
  // ============================================================================
  createPayment = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId } = req.params;
    const result = await paymentService.createPayment(
      shopId,
      req.user.organizationId,
      req.user._id,
      req.body
    );

    return sendCreated(res, result.message, result.data);
  });

  // ============================================================================
  // 2. GET ALL PAYMENTS
  // GET /api/v1/shops/:shopId/payments
  // ============================================================================
  getAllPayments = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const result = await paymentService.getAllPayments(shopId, req.query);

    return sendSuccess(res, 200, result.message, result.data, {
      pagination: result.pagination,
    });
  });

  // ============================================================================
  // 3. GET SINGLE PAYMENT
  // GET /api/v1/shops/:shopId/payments/:paymentId
  // ============================================================================
  getPaymentById = catchAsync(async (req, res) => {
    const { shopId, paymentId } = req.params;
    const result = await paymentService.getPaymentById(paymentId, shopId);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 4. UPDATE PAYMENT
  // PUT /api/v1/shops/:shopId/payments/:paymentId
  // ============================================================================
  updatePayment = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId, paymentId } = req.params;
    const result = await paymentService.updatePayment(paymentId, shopId, req.user._id, req.body);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 5. DELETE PAYMENT
  // DELETE /api/v1/shops/:shopId/payments/:paymentId
  // ============================================================================
  deletePayment = catchAsync(async (req, res) => {
    const { shopId, paymentId } = req.params;
    const result = await paymentService.deletePayment(
      paymentId,
      shopId,
      req.user._id,
      req.user.organizationId
    );

    return sendSuccess(res, 200, result.message);
  });

  // ============================================================================
  // 6. UPDATE PAYMENT STATUS
  // PATCH /api/v1/shops/:shopId/payments/:paymentId/status
  // ============================================================================
  updatePaymentStatus = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId, paymentId } = req.params;
    const { status, reason } = req.body;

    const result = await paymentService.updatePaymentStatus(
      paymentId,
      shopId,
      req.user._id,
      status,
      reason
    );

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 7. MARK PAYMENT AS COMPLETED
  // PATCH /api/v1/shops/:shopId/payments/:paymentId/complete
  // ============================================================================
  markAsCompleted = catchAsync(async (req, res) => {
    const { shopId, paymentId } = req.params;
    const result = await paymentService.markAsCompleted(paymentId, shopId, req.user._id);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 8. CANCEL PAYMENT
  // PATCH /api/v1/shops/:shopId/payments/:paymentId/cancel
  // ============================================================================
  cancelPayment = catchAsync(async (req, res) => {
    const { shopId, paymentId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return sendBadRequest(res, 'Cancellation reason is required');
    }

    const result = await paymentService.cancelPayment(paymentId, shopId, req.user._id, reason);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 9. GET PENDING CHEQUES
  // GET /api/v1/shops/:shopId/payments/cheques/pending
  // ============================================================================
  getPendingCheques = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const result = await paymentService.getPendingCheques(shopId);

    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });

  // ============================================================================
  // 10. CLEAR CHEQUE
  // PATCH /api/v1/shops/:shopId/payments/:paymentId/cheque/clear
  // ============================================================================
  clearCheque = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId, paymentId } = req.params;
    const { clearanceDate, notes } = req.body;

    const result = await paymentService.clearCheque(
      paymentId,
      shopId,
      req.user._id,
      clearanceDate,
      notes
    );

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 11. BOUNCE CHEQUE
  // PATCH /api/v1/shops/:shopId/payments/:paymentId/cheque/bounce
  // ============================================================================
  bounceCheque = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId, paymentId } = req.params;
    const { bounceReason, notes } = req.body;

    const result = await paymentService.bounceCheque(
      paymentId,
      shopId,
      req.user._id,
      bounceReason,
      notes
    );

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 12. GET BOUNCED CHEQUES
  // GET /api/v1/shops/:shopId/payments/cheques/bounced
  // ============================================================================
  getBouncedCheques = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const result = await paymentService.getBouncedCheques(shopId);

    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });

  // ============================================================================
  // 13. GET CLEARED CHEQUES
  // GET /api/v1/shops/:shopId/payments/cheques/cleared
  // ============================================================================
  getClearedCheques = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await paymentService.getClearedCheques(shopId, startDate, endDate);

    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });

  // ============================================================================
  // 14. GET UNRECONCILED PAYMENTS
  // GET /api/v1/shops/:shopId/payments/reconciliation/pending
  // ============================================================================
  getUnreconciledPayments = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const result = await paymentService.getUnreconciledPayments(shopId);

    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });

  // ============================================================================
  // 15. RECONCILE PAYMENT
  // POST /api/v1/shops/:shopId/payments/:paymentId/reconcile
  // ============================================================================
  reconcilePayment = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId, paymentId } = req.params;
    const { reconciledWith, discrepancy, notes } = req.body;

    const result = await paymentService.reconcilePayment(
      paymentId,
      shopId,
      req.user._id,
      reconciledWith,
      discrepancy,
      notes
    );

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 16. GET RECONCILIATION SUMMARY
  // GET /api/v1/shops/:shopId/payments/reconciliation/summary
  // ============================================================================
  getReconciliationSummary = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await paymentService.getReconciliationSummary(shopId, startDate, endDate);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 17. GET RECEIPT
  // GET /api/v1/shops/:shopId/payments/:paymentId/receipt
  // ============================================================================
  getReceipt = catchAsync(async (req, res) => {
    const { shopId, paymentId } = req.params;
    const result = await paymentService.getReceipt(paymentId, shopId);

    // TODO: Generate actual PDF receipt
    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 18. SEND RECEIPT
  // POST /api/v1/shops/:shopId/payments/:paymentId/receipt/send
  // ============================================================================
  sendReceipt = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId, paymentId } = req.params;
    const { method, recipient } = req.body;

    const result = await paymentService.sendReceipt(
      paymentId,
      shopId,
      req.user._id,
      method,
      recipient
    );

    return sendSuccess(res, 200, result.message);
  });

  // ============================================================================
  // 19. REGENERATE RECEIPT
  // POST /api/v1/shops/:shopId/payments/:paymentId/receipt/regenerate
  // ============================================================================
  regenerateReceipt = catchAsync(async (req, res) => {
    const { shopId, paymentId } = req.params;
    const result = await paymentService.regenerateReceipt(paymentId, shopId, req.user._id);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 20. GET PARTY PAYMENTS
  // GET /api/v1/shops/:shopId/payments/party/:partyId
  // ============================================================================
  getPartyPayments = catchAsync(async (req, res) => {
    const { shopId, partyId } = req.params;
    const result = await paymentService.getPartyPayments(shopId, partyId, req.query);

    return sendSuccess(res, 200, result.message, result.data, {
      pagination: result.pagination,
    });
  });

  // ============================================================================
  // 21. GET PARTY PAYMENT SUMMARY
  // GET /api/v1/shops/:shopId/payments/party/:partyId/summary
  // ============================================================================
  getPartyPaymentSummary = catchAsync(async (req, res) => {
    const { shopId, partyId } = req.params;
    const result = await paymentService.getPartyPaymentSummary(shopId, partyId);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 22. GET CUSTOMER PAYMENTS
  // GET /api/v1/shops/:shopId/payments/customers/:customerId
  // ============================================================================
  getCustomerPayments = catchAsync(async (req, res) => {
    const { shopId, customerId } = req.params;
    const result = await paymentService.getCustomerPayments(shopId, customerId, req.query);

    return sendSuccess(res, 200, result.message, result.data, {
      pagination: result.pagination,
    });
  });

  // ============================================================================
  // 23. GET SUPPLIER PAYMENTS
  // GET /api/v1/shops/:shopId/payments/suppliers/:supplierId
  // ============================================================================
  getSupplierPayments = catchAsync(async (req, res) => {
    const { shopId, supplierId } = req.params;
    const result = await paymentService.getSupplierPayments(shopId, supplierId, req.query);

    return sendSuccess(res, 200, result.message, result.data, {
      pagination: result.pagination,
    });
  });

  // ============================================================================
  // 24. GET PAYMENT BY MODE
  // GET /api/v1/shops/:shopId/payments/by-mode
  // ============================================================================
  getPaymentsByMode = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await paymentService.getPaymentsByMode(shopId, startDate, endDate);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 25. GET CASH COLLECTION
  // GET /api/v1/shops/:shopId/payments/cash-collection
  // ============================================================================
  getCashCollection = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { date } = req.query;

    const result = await paymentService.getCashCollection(shopId, date);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 26. GET DIGITAL COLLECTION
  // GET /api/v1/shops/:shopId/payments/digital-collection
  // ============================================================================
  getDigitalCollection = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await paymentService.getDigitalCollection(shopId, startDate, endDate);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 27. GET PAYMENT ANALYTICS
  // GET /api/v1/shops/:shopId/payments/analytics
  // ============================================================================
  getPaymentAnalytics = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { startDate, endDate, groupBy } = req.query;

    const result = await paymentService.getPaymentAnalytics(shopId, startDate, endDate, groupBy);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 28. GET PAYMENT DASHBOARD
  // GET /api/v1/shops/:shopId/payments/dashboard
  // ============================================================================
  getPaymentDashboard = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const result = await paymentService.getPaymentDashboard(shopId);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 29. GET TODAY'S PAYMENTS
  // GET /api/v1/shops/:shopId/payments/today
  // ============================================================================
  getTodayPayments = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const result = await paymentService.getTodayPayments(shopId);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 30. GET PENDING PAYMENTS
  // GET /api/v1/shops/:shopId/payments/pending
  // ============================================================================
  getPendingPayments = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const result = await paymentService.getPendingPayments(shopId);

    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });

  // ============================================================================
  // 31. GET FAILED PAYMENTS
  // GET /api/v1/shops/:shopId/payments/failed
  // ============================================================================
  getFailedPayments = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const result = await paymentService.getFailedPayments(shopId);

    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });

  // ============================================================================
  // 32. GET SALE PAYMENTS
  // GET /api/v1/shops/:shopId/payments/reference/sale/:saleId
  // ============================================================================
  getSalePayments = catchAsync(async (req, res) => {
    const { shopId, saleId } = req.params;
    const result = await paymentService.getSalePayments(shopId, saleId);

    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });

  // ============================================================================
  // 33. GET PURCHASE PAYMENTS
  // GET /api/v1/shops/:shopId/payments/reference/purchase/:purchaseId
  // ============================================================================
  getPurchasePayments = catchAsync(async (req, res) => {
    const { shopId, purchaseId } = req.params;
    const result = await paymentService.getPurchasePayments(shopId, purchaseId);

    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });

  // ============================================================================
  // 34. SEARCH PAYMENTS
  // GET /api/v1/shops/:shopId/payments/search
  // ============================================================================
  searchPayments = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { q, limit } = req.query;

    if (!q) {
      return sendBadRequest(res, 'Search query is required');
    }

    const result = await paymentService.searchPayments(shopId, q, limit);

    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });

  // ============================================================================
  // 35. GET PAYMENTS BY DATE RANGE
  // GET /api/v1/shops/:shopId/payments/by-date-range
  // ============================================================================
  getPaymentsByDateRange = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await paymentService.getPaymentsByDateRange(
      shopId,
      startDate,
      endDate,
      req.query
    );

    return sendSuccess(res, 200, result.message, result.data, {
      pagination: result.pagination,
    });
  });

  // ============================================================================
  // 36. GET PAYMENTS BY AMOUNT RANGE
  // GET /api/v1/shops/:shopId/payments/by-amount-range
  // ============================================================================
  getPaymentsByAmountRange = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId } = req.params;
    const { minAmount, maxAmount } = req.query;

    const result = await paymentService.getPaymentsByAmountRange(
      shopId,
      minAmount,
      maxAmount,
      req.query
    );

    return sendSuccess(res, 200, result.message, result.data, {
      pagination: result.pagination,
    });
  });

  // ============================================================================
  // 37. BULK RECONCILE PAYMENTS
  // POST /api/v1/shops/:shopId/payments/bulk-reconcile
  // ============================================================================
  bulkReconcilePayments = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId } = req.params;
    const { paymentIds, reconciledWith, notes } = req.body;

    const result = await paymentService.bulkReconcilePayments(
      shopId,
      req.user._id,
      paymentIds,
      reconciledWith,
      notes
    );

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 38. BULK EXPORT PAYMENTS
  // POST /api/v1/shops/:shopId/payments/bulk-export
  // ============================================================================
  bulkExportPayments = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId } = req.params;
    const { paymentIds, format } = req.body;

    const result = await paymentService.bulkExportPayments(shopId, paymentIds, format);

    // TODO: Return actual file download
    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
      format: result.format,
    });
  });

  // ============================================================================
  // 39. BULK PRINT RECEIPTS
  // POST /api/v1/shops/:shopId/payments/bulk-print-receipts
  // ============================================================================
  bulkPrintReceipts = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const { paymentIds } = req.body;

    if (!paymentIds || paymentIds.length === 0) {
      return sendBadRequest(res, 'Payment IDs are required');
    }

    const result = await paymentService.bulkPrintReceipts(shopId, paymentIds);

    // TODO: Return actual PDF
    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });

  // ============================================================================
  // 40. APPROVE PAYMENT
  // POST /api/v1/shops/:shopId/payments/:paymentId/approve
  // ============================================================================
  approvePayment = catchAsync(async (req, res) => {
    const { shopId, paymentId } = req.params;
    const { notes } = req.body;

    const result = await paymentService.approvePayment(paymentId, shopId, req.user._id, notes);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 41. REJECT PAYMENT
  // POST /api/v1/shops/:shopId/payments/:paymentId/reject
  // ============================================================================
  rejectPayment = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId, paymentId } = req.params;
    const { reason } = req.body;

    const result = await paymentService.rejectPayment(paymentId, shopId, req.user._id, reason);

    return sendSuccess(res, 200, result.message, result.data);
  });

  // ============================================================================
  // 42. PROCESS REFUND
  // POST /api/v1/shops/:shopId/payments/:paymentId/refund
  // ============================================================================
  processRefund = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { shopId, paymentId } = req.params;

    const result = await paymentService.processRefund(
      paymentId,
      shopId,
      req.user.organizationId,
      req.user._id,
      req.body
    );

    return sendCreated(res, result.message, result.data);
  });

  // ============================================================================
  // 43. GET REFUNDS
  // GET /api/v1/shops/:shopId/payments/refunds
  // ============================================================================
  getRefunds = catchAsync(async (req, res) => {
    const { shopId } = req.params;
    const result = await paymentService.getRefunds(shopId);

    return sendSuccess(res, 200, result.message, result.data, {
      count: result.count,
    });
  });
}

export default new PaymentController();
