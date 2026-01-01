// ============================================================================
// FILE: validations/sales.validation.js
// Request Validation Middleware for Sales Module
// ============================================================================

import { body, param, query, validationResult } from 'express-validator';
import { sendValidationError } from '../../utils/sendResponse.js';
import mongoose from 'mongoose';

/**
 * Validation error handler middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));
    return sendValidationError(res, formattedErrors, 'Validation failed');
  }
  next();
};

/**
 * Custom validator for MongoDB ObjectId
 */
const isValidObjectId = value => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

// ============================================================================
// 1. CREATE SALE VALIDATION
// ============================================================================

export const createSale = [
  body('customerId').notEmpty().withMessage('Customer ID is required').custom(isValidObjectId),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required')
    .custom(items => {
      for (const item of items) {
        if (!item.productName) throw new Error('Product name is required for all items');
        if (!item.metalType) throw new Error('Metal type is required for all items');
        if (item.quantity <= 0) throw new Error('Quantity must be greater than 0');
        if (item.grossWeight <= 0) throw new Error('Gross weight must be greater than 0');
      }
      return true;
    }),

  body('saleType')
    .optional()
    .isIn(['retail', 'wholesale', 'exchange', 'order_fulfillment', 'repair_billing', 'estimate'])
    .withMessage('Invalid sale type'),

  body('payment.paymentMode')
    .notEmpty()
    .withMessage('Payment mode is required')
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'mixed', 'credit'])
    .withMessage('Invalid payment mode'),

  handleValidationErrors,
];

// ============================================================================
// 2. GET SALES VALIDATION
// ============================================================================

export const getSales = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(['draft', 'pending', 'confirmed', 'delivered', 'completed', 'cancelled', 'returned'])
    .withMessage('Invalid status'),

  query('paymentStatus')
    .optional()
    .isIn(['paid', 'partial', 'unpaid', 'overdue'])
    .withMessage('Invalid payment status'),

  query('saleType')
    .optional()
    .isIn(['retail', 'wholesale', 'exchange', 'order_fulfillment', 'repair_billing', 'estimate'])
    .withMessage('Invalid sale type'),

  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),

  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),

  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min amount must be a positive number'),

  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max amount must be a positive number'),

  handleValidationErrors,
];

// ============================================================================
// 3. GET SINGLE SALE VALIDATION
// ============================================================================

export const getSale = [
  param('shopId').notEmpty().withMessage('Shop ID is required').custom(isValidObjectId),

  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  handleValidationErrors,
];

// ============================================================================
// 4. UPDATE SALE VALIDATION
// ============================================================================

export const updateSale = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('items').optional().isArray({ min: 1 }).withMessage('Items must be an array'),

  body('status')
    .optional()
    .isIn(['draft', 'pending'])
    .withMessage('Can only update draft or pending sales'),

  handleValidationErrors,
];

// ============================================================================
// 5. DELETE SALE VALIDATION
// ============================================================================

export const deleteSale = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),

  handleValidationErrors,
];

// ============================================================================
// 6. STATUS UPDATE VALIDATION
// ============================================================================

export const updateStatus = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['draft', 'pending', 'confirmed', 'delivered', 'completed', 'cancelled'])
    .withMessage('Invalid status'),

  handleValidationErrors,
];

// ============================================================================
// 7. CONFIRM SALE VALIDATION
// ============================================================================

export const confirmSale = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  handleValidationErrors,
];

// ============================================================================
// 8. DELIVER SALE VALIDATION
// ============================================================================

export const deliverSale = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('deliveryType')
    .notEmpty()
    .withMessage('Delivery type is required')
    .isIn(['immediate', 'scheduled', 'courier', 'pickup'])
    .withMessage('Invalid delivery type'),

  body('deliveryAddress').optional().isString().withMessage('Delivery address must be a string'),

  body('receivedBy').optional().isString().withMessage('Received by must be a string'),

  handleValidationErrors,
];

// ============================================================================
// 9. COMPLETE SALE VALIDATION
// ============================================================================

export const completeSale = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  handleValidationErrors,
];

// ============================================================================
// 10. CANCEL SALE VALIDATION
// ============================================================================

export const cancelSale = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('reason')
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10-500 characters'),

  body('refundAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a positive number'),

  handleValidationErrors,
];

// ============================================================================
// 11. ADD PAYMENT VALIDATION
// ============================================================================

export const addPayment = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

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

  body('paymentDate').optional().isISO8601().withMessage('Invalid payment date format'),

  body('transactionId').optional().isString().withMessage('Transaction ID must be a string'),

  handleValidationErrors,
];

// ============================================================================
// 12. RETURN SALE VALIDATION
// ============================================================================

export const returnSale = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('returnReason')
    .notEmpty()
    .withMessage('Return reason is required')
    .isString()
    .withMessage('Return reason must be a string')
    .isLength({ min: 10 })
    .withMessage('Return reason must be at least 10 characters'),

  body('itemsToReturn').optional().isArray().withMessage('Items to return must be an array'),

  body('refundAmount')
    .notEmpty()
    .withMessage('Refund amount is required')
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a positive number'),

  body('refundMode')
    .optional()
    .isIn(['cash', 'card', 'upi', 'bank_transfer', 'store_credit'])
    .withMessage('Invalid refund mode'),

  handleValidationErrors,
];

// ============================================================================
// 13. OLD GOLD VALIDATION
// ============================================================================

export const addOldGold = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('oldGoldItems')
    .isArray({ min: 1 })
    .withMessage('At least one old gold item is required')
    .custom(items => {
      for (const item of items) {
        if (!item.metalType) throw new Error('Metal type is required');
        if (!item.purity) throw new Error('Purity is required');
        if (item.grossWeight <= 0) throw new Error('Gross weight must be greater than 0');
        if (item.ratePerGram <= 0) throw new Error('Rate per gram must be greater than 0');
      }
      return true;
    }),

  body('totalOldGoldValue')
    .notEmpty()
    .withMessage('Total old gold value is required')
    .isFloat({ min: 0 })
    .withMessage('Total value must be a positive number'),

  handleValidationErrors,
];

// ============================================================================
// 14. ANALYTICS VALIDATION
// ============================================================================

export const getAnalytics = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),

  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),

  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Invalid groupBy value'),

  handleValidationErrors,
];

// ============================================================================
// 15. SEND INVOICE VALIDATION
// ============================================================================

export const sendInvoice = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('method')
    .notEmpty()
    .withMessage('Send method is required')
    .isIn(['email', 'sms', 'whatsapp'])
    .withMessage('Invalid send method'),

  body('recipient')
    .notEmpty()
    .withMessage('Recipient is required')
    .custom((value, { req }) => {
      if (req.body.method === 'email' && !/^\S+@\S+\.\S+$/.test(value)) {
        throw new Error('Invalid email address');
      }
      if (req.body.method !== 'email' && !/^[0-9]{10}$/.test(value)) {
        throw new Error('Invalid phone number');
      }
      return true;
    }),

  handleValidationErrors,
];

// ============================================================================
// 16. PRINT INVOICE VALIDATION
// ============================================================================

export const printInvoice = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('printerType')
    .optional()
    .isIn(['thermal_80mm', 'thermal_58mm', 'A4', 'A5'])
    .withMessage('Invalid printer type'),

  handleValidationErrors,
];

// ============================================================================
// 17. APPLY DISCOUNT VALIDATION
// ============================================================================

export const applyDiscount = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('discountType')
    .notEmpty()
    .withMessage('Discount type is required')
    .isIn(['percentage', 'flat'])
    .withMessage('Invalid discount type'),

  body('discountValue')
    .notEmpty()
    .withMessage('Discount value is required')
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number')
    .custom((value, { req }) => {
      if (req.body.discountType === 'percentage' && value > 100) {
        throw new Error('Discount percentage cannot exceed 100%');
      }
      return true;
    }),

  body('discountReason').optional().isString().withMessage('Discount reason must be a string'),

  handleValidationErrors,
];

// ============================================================================
// 18. BULK OPERATIONS VALIDATION
// ============================================================================

export const bulkDelete = [
  body('saleIds')
    .isArray({ min: 1 })
    .withMessage('At least one sale ID is required')
    .custom(ids => {
      for (const id of ids) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error('Invalid sale ID format');
        }
      }
      return true;
    }),

  body('reason')
    .notEmpty()
    .withMessage('Reason is required for bulk deletion')
    .isString()
    .withMessage('Reason must be a string'),

  handleValidationErrors,
];

export const bulkPrint = [
  body('saleIds')
    .isArray({ min: 1 })
    .withMessage('At least one sale ID is required')
    .custom(ids => {
      for (const id of ids) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error('Invalid sale ID format');
        }
      }
      return true;
    }),

  handleValidationErrors,
];

export const bulkReminders = [
  body('saleIds')
    .isArray({ min: 1 })
    .withMessage('At least one sale ID is required')
    .custom(ids => {
      for (const id of ids) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error('Invalid sale ID format');
        }
      }
      return true;
    }),

  body('method')
    .notEmpty()
    .withMessage('Send method is required')
    .isIn(['sms', 'email', 'whatsapp'])
    .withMessage('Invalid send method'),

  handleValidationErrors,
];

// ============================================================================
// 19. SEARCH VALIDATION
// ============================================================================

export const searchSales = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isString()
    .withMessage('Search query must be a string')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  handleValidationErrors,
];

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
    .withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  handleValidationErrors,
];

export const amountRange = [
  query('minAmount')
    .notEmpty()
    .withMessage('Min amount is required')
    .isFloat({ min: 0 })
    .withMessage('Min amount must be a positive number'),

  query('maxAmount')
    .notEmpty()
    .withMessage('Max amount is required')
    .isFloat({ min: 0 })
    .withMessage('Max amount must be a positive number')
    .custom((maxAmount, { req }) => {
      if (parseFloat(maxAmount) < parseFloat(req.query.minAmount)) {
        throw new Error('Max amount must be greater than min amount');
      }
      return true;
    }),

  handleValidationErrors,
];

// ============================================================================
// 20. DOCUMENT UPLOAD VALIDATION
// ============================================================================

export const uploadDocument = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('documentType')
    .notEmpty()
    .withMessage('Document type is required')
    .isIn(['invoice', 'receipt', 'estimate', 'certificate', 'warranty', 'other'])
    .withMessage('Invalid document type'),

  handleValidationErrors,
];

// ============================================================================
// 21. APPROVAL VALIDATION
// ============================================================================

export const approveSale = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  handleValidationErrors,
];

export const rejectSale = [
  param('saleId').notEmpty().withMessage('Sale ID is required').custom(isValidObjectId),

  body('reason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10-500 characters'),

  handleValidationErrors,
];

export default {
  createSale,
  getSales,
  getSale,
  updateSale,
  deleteSale,
  updateStatus,
  confirmSale,
  deliverSale,
  completeSale,
  cancelSale,
  addPayment,
  returnSale,
  addOldGold,
  getAnalytics,
  sendInvoice,
  printInvoice,
  applyDiscount,
  bulkDelete,
  bulkPrint,
  bulkReminders,
  searchSales,
  dateRange,
  amountRange,
  uploadDocument,
  approveSale,
  rejectSale,
};
