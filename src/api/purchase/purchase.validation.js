// FILE: src/api/purchase/purchase.validation.js
import { body, param, query, validationResult } from 'express-validator';
import { sendValidationError, formatValidationErrors } from '../../utils/sendResponse.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, formatValidationErrors(errors.array()));
  }
  next();
};

export const purchaseId = [
  param('purchaseId').isMongoId().withMessage('Invalid purchase ID format'),
  validate,
];

export const supplierId = [
  param('supplierId').isMongoId().withMessage('Invalid supplier ID format'),
  validate,
];


export const createPurchase = [
  body('supplierId')
    .notEmpty().withMessage('Supplier is required')
    .isMongoId().withMessage('Invalid supplier ID'),

  body('purchaseDate')
    .optional()
    .isISO8601().withMessage('Invalid purchase date format'),

  body('purchaseType')
    .optional()
    .isIn(['new_stock', 'old_gold', 'exchange', 'consignment', 'repair_return', 'sample'])
    .withMessage('Invalid purchase type'),

  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required'),

  body('items.*.category')
    .notEmpty().withMessage('Category is required')
    .isMongoId().withMessage('Invalid category ID'),

  body('items.*.subCategory')
    .optional()
    .isMongoId().withMessage('Invalid subcategory ID'),

  body('items.*.productName')
    .notEmpty().withMessage('Product name is required'),

  body('items.*.metalType')
    .notEmpty().withMessage('Metal type is required')
    .isIn(['gold', 'silver', 'platinum', 'diamond', 'mixed'])
    .withMessage('Invalid metal type'),

body('items.*.purity')
  .notEmpty()
  .withMessage('Purity is required')
  .isString()
  .withMessage('Purity must be a string')
  .trim()
  .isLength({ min: 1, max: 20 })
  .withMessage('Purity must be between 1 and 20 characters'),

// Custom purity ke liye purityPercentage
body('items.*.purityPercentage')
  .optional()
  .isFloat({ min: 0.1, max: 100 })
  .withMessage('Purity percentage must be between 0.1 and 100'),

  body('items.*.grossWeight')
    .isFloat({ min: 0 }).withMessage('Gross weight must be a positive number'),

  body('items.*.stoneWeight')
    .optional()
    .isFloat({ min: 0 }).withMessage('Stone weight must be a positive number'),

body('items.*.netWeight')
  .isFloat({ min: 0 }).withMessage('Net weight must be a positive number'),

// Wastage validation add karo
body('items.*.wastagePercentage')
  .optional()
  .isFloat({ min: 0, max: 100 })
  .withMessage('Wastage percentage must be between 0 and 100'),
// fineWeight optional - auto calculate hoga
// lekin user manually override kar sakta hai
body('items.*.fineWeight')
  .optional()
  .isFloat({ min: 0 })
  .withMessage('Fine weight must be a positive number'),
body('items.*.quantity')
  .optional()
  .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),

  body('payment.paymentMode')
    .optional()
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'mixed', 'credit'])
    .withMessage('Invalid payment mode'),

  body('payment.paidAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Paid amount must be a positive number'),

  validate,
];

export const updatePurchase = [
  param('purchaseId').isMongoId().withMessage('Invalid purchase ID format'),

  body('supplierId')
    .optional()
    .isMongoId().withMessage('Invalid supplier ID'),

  body('purchaseDate')
    .optional()
    .isISO8601().withMessage('Invalid purchase date format'),

  body('items')
    .optional()
    .isArray({ min: 1 }).withMessage('At least one item is required if items are provided'),

  body('payment.paidAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Paid amount must be a positive number'),

  validate,
];



export const updateStatus = [
  param('purchaseId').isMongoId().withMessage('Invalid purchase ID format'),

  body('status')
    .notEmpty().withMessage('Status is required')

    .isIn(['cancelled', 'ordered', 'received', 'partial_received', 'completed'])
    .withMessage('Invalid status for /status route'),

  validate,
];

export const receivePurchase = [
  param('purchaseId').isMongoId().withMessage('Invalid purchase ID format'),

  body('receivedBy')
    .optional()
    .isMongoId().withMessage('Invalid user ID for receivedBy'),

  body('receivedDate')
    .optional()
    .isISO8601().withMessage('Invalid received date format'),

  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string'),

  validate,
];

export const cancelPurchase = [
  param('purchaseId').isMongoId().withMessage('Invalid purchase ID format'),

  body('reason')
    .notEmpty().withMessage('Cancellation reason is required')
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),

  validate,
];

export const returnPurchase = [
  param('purchaseId').isMongoId().withMessage('Invalid purchase ID format'),

  body('reason')
    .notEmpty().withMessage('Return reason is required')
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),

  validate,
];

export const approvePurchase = [
  param('purchaseId').isMongoId().withMessage('Invalid purchase ID format'),

  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string'),

  validate,
];

export const rejectPurchase = [
  param('purchaseId').isMongoId().withMessage('Invalid purchase ID format'),

  body('reason')
    .notEmpty().withMessage('Rejection reason is required')
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),

  validate,
];

export const addPayment = [
  param('purchaseId').isMongoId().withMessage('Invalid purchase ID format'),

  body('amount')
    .notEmpty().withMessage('Payment amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),

  body('paymentMode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer'])
    .withMessage('Invalid payment mode'),

  body('paymentDate')
    .optional()
    .isISO8601().withMessage('Invalid payment date format'),

  body('transactionId')
    .optional()
    .isString().withMessage('Transaction ID must be a string'),

  body('referenceNumber')
    .optional()
    .isString().withMessage('Reference number must be a string'),

  body('chequeNumber')
    .optional()
    .isString().withMessage('Cheque number must be a string'),

  body('chequeDate')
    .optional()
    .isISO8601().withMessage('Invalid cheque date format'),

  body('bankName')
    .optional()
    .isString().withMessage('Bank name must be a string'),

  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string'),

  validate,
];

export const getPurchases = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn([
      'draft', 'pending', 'ordered', 'received',
      'partial_received', 'completed', 'cancelled', 'returned',
    ])
    .withMessage('Invalid status'),

  query('paymentStatus')
    .optional()
    .isIn(['paid', 'partial', 'unpaid', 'overdue'])
    .withMessage('Invalid payment status'),

  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format'),

  validate,
];


export const analyticsValidation = [
  query('startDate')
    .optional()  
    .isISO8601().withMessage('Invalid start date format'),

  query('endDate')
    .optional()  
    .isISO8601().withMessage('Invalid end date format'),

  validate,
];


export const bulkDelete = [
  body('purchaseIds')
    .isArray({ min: 1 }).withMessage('At least one purchase ID is required'),

  body('purchaseIds.*')
    .isMongoId().withMessage('Invalid purchase ID format'),

  validate,
];

export const bulkApprove = [
  body('purchaseIds')
    .isArray({ min: 1 }).withMessage('At least one purchase ID is required'),

  body('purchaseIds.*')
    .isMongoId().withMessage('Invalid purchase ID format'),

  validate,
];

export const uploadDocument = [
  param('purchaseId').isMongoId().withMessage('Invalid purchase ID format'),

  body('documentType')
    .notEmpty().withMessage('Document type is required')
    .isIn(['invoice', 'receipt', 'delivery_note', 'certificate', 'other'])
    .withMessage('Invalid document type'),

  body('documentUrl')
    .notEmpty().withMessage('Document URL is required')
    .isURL().withMessage('Invalid document URL'),

  body('documentNumber')
    .optional()
    .isString().withMessage('Document number must be a string'),

  validate,
];

export const searchPurchases = [
  query('q')
    .notEmpty().withMessage('Search query is required')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Search query must be at least 1 character'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),

  validate,
];

export const dateRange = [
  query('startDate')
    .notEmpty().withMessage('Start date is required')  
    .isISO8601().withMessage('Invalid start date format'),

  query('endDate')
    .notEmpty().withMessage('End date is required')    
    .isISO8601().withMessage('Invalid end date format'),

  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  validate,
];