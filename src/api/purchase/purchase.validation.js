// ============================================================================
// FILE: src/api/purchase/purchase.validation.js
// Purchase Module Validation - Input Validation Middleware
// ============================================================================

import { body, param, query, validationResult } from 'express-validator';
import { sendValidationError, formatValidationErrors } from '../../utils/sendResponse.js';

/**
 * Validation error handler middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, formatValidationErrors(errors.array()));
  }
  next();
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * Validate purchase ID parameter
 */
export const purchaseId = [
  param('purchaseId')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),
  validate,
];

/**
 * Validate supplier ID parameter
 */
export const supplierId = [
  param('supplierId')
    .isMongoId()
    .withMessage('Invalid supplier ID format'),
  validate,
];

/**
 * Validate create purchase request
 */
export const createPurchase = [
  body('supplierId')
    .notEmpty()
    .withMessage('Supplier is required')
    .isMongoId()
    .withMessage('Invalid supplier ID'),

  body('purchaseDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid purchase date format'),

  body('purchaseType')
    .optional()
    .isIn(['new_stock', 'old_gold', 'exchange', 'consignment', 'repair_return', 'sample'])
    .withMessage('Invalid purchase type'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.productName')
    .notEmpty()
    .withMessage('Product name is required'),

  body('items.*.metalType')
    .notEmpty()
    .withMessage('Metal type is required')
    .isIn(['gold', 'silver', 'platinum', 'diamond', 'mixed'])
    .withMessage('Invalid metal type'),

  body('items.*.purity')
    .notEmpty()
    .withMessage('Purity is required'),

  body('items.*.grossWeight')
    .isFloat({ min: 0 })
    .withMessage('Gross weight must be a positive number'),

  body('items.*.stoneWeight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Stone weight must be a positive number'),

  body('items.*.netWeight')
    .isFloat({ min: 0 })
    .withMessage('Net weight must be a positive number'),

  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('payment.paymentMode')
    .optional()
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'mixed', 'credit'])
    .withMessage('Invalid payment mode'),

  body('payment.paidAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Paid amount must be a positive number'),

  validate,
];

/**
 * Validate update purchase request
 */
export const updatePurchase = [
  param('purchaseId')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),

  body('supplierId')
    .optional()
    .isMongoId()
    .withMessage('Invalid supplier ID'),

  body('purchaseDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid purchase date format'),

  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one item is required if items are provided'),

  body('payment.paidAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Paid amount must be a positive number'),

  validate,
];

/**
 * Validate get purchases query
 */
export const getPurchases = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(['draft', 'pending', 'ordered', 'received', 'partial_received', 'completed', 'cancelled', 'returned'])
    .withMessage('Invalid status'),

  query('paymentStatus')
    .optional()
    .isIn(['paid', 'partial', 'unpaid', 'overdue'])
    .withMessage('Invalid payment status'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),

  validate,
];

/**
 * Validate update status request
 */
export const updateStatus = [
  param('purchaseId')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['draft', 'pending', 'ordered', 'received', 'partial_received', 'completed', 'cancelled', 'returned'])
    .withMessage('Invalid status'),

  validate,
];

/**
 * Validate receive purchase request
 */
export const receivePurchase = [
  param('purchaseId')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),

  body('receivedBy')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID for receivedBy'),

  body('receivedDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid received date format'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),

  validate,
];

/**
 * Validate cancel purchase request
 */
export const cancelPurchase = [
  param('purchaseId')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),

  body('reason')
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),

  validate,
];

/**
 * Validate approve purchase request
 */
export const approvePurchase = [
  param('purchaseId')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),

  validate,
];

/**
 * Validate reject purchase request
 */
export const rejectPurchase = [
  param('purchaseId')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),

  body('reason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),

  validate,
];

/**
 * Validate add payment request
 */
export const addPayment = [
  param('purchaseId')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),

  body('amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),

  body('paymentMode')
    .notEmpty()
    .withMessage('Payment mode is required')
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer'])
    .withMessage('Invalid payment mode'),

  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid payment date format'),

  body('transactionId')
    .optional()
    .isString()
    .withMessage('Transaction ID must be a string'),

  body('referenceNumber')
    .optional()
    .isString()
    .withMessage('Reference number must be a string'),

  body('chequeNumber')
    .optional()
    .isString()
    .withMessage('Cheque number must be a string'),

  body('chequeDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid cheque date format'),

  body('bankName')
    .optional()
    .isString()
    .withMessage('Bank name must be a string'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),

  validate,
];

/**
 * Validate bulk delete request
 */
export const bulkDelete = [
  body('purchaseIds')
    .isArray({ min: 1 })
    .withMessage('At least one purchase ID is required'),

  body('purchaseIds.*')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),

  validate,
];

/**
 * Validate bulk approve request
 */
export const bulkApprove = [
  body('purchaseIds')
    .isArray({ min: 1 })
    .withMessage('At least one purchase ID is required'),

  body('purchaseIds.*')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),

  validate,
];

/**
 * Validate upload document request
 */
export const uploadDocument = [
  param('purchaseId')
    .isMongoId()
    .withMessage('Invalid purchase ID format'),

  body('documentType')
    .notEmpty()
    .withMessage('Document type is required')
    .isIn(['invoice', 'receipt', 'delivery_note', 'certificate', 'other'])
    .withMessage('Invalid document type'),

  body('documentUrl')
    .notEmpty()
    .withMessage('Document URL is required')
    .isURL()
    .withMessage('Invalid document URL'),

  body('documentNumber')
    .optional()
    .isString()
    .withMessage('Document number must be a string'),

  validate,
];

/**
 * Validate search purchases query
 */
export const searchPurchases = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Search query must be at least 1 character'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  validate,
];

/**
 * Validate date range query
 */
export const dateRange = [
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  validate,
];