// ============================================================================
// FILE: src/api/payment/payment.validation.js
// Payment Validation Rules - Complete Payment Module
// ============================================================================

import { body, param, query } from 'express-validator';

/**
 * Validation for creating a new payment
 */
export const createPaymentValidation = [
  // Payment Type & Transaction Type
  body('paymentType')
    .trim()
    .notEmpty()
    .withMessage('Payment type is required')
    .isIn(['sale_payment', 'purchase_payment', 'scheme_payment', 'advance_payment', 'refund', 'other'])
    .withMessage('Invalid payment type'),

  body('transactionType')
    .trim()
    .notEmpty()
    .withMessage('Transaction type is required')
    .isIn(['receipt', 'payment'])
    .withMessage('Transaction type must be receipt (in) or payment (out)'),

  // Amount
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),

  // Payment Mode
  body('paymentMode')
    .trim()
    .notEmpty()
    .withMessage('Payment mode is required')
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'wallet', 'other'])
    .withMessage('Invalid payment mode'),

  // Party Details
  body('party.partyType')
    .trim()
    .notEmpty()
    .withMessage('Party type is required')
    .isIn(['customer', 'supplier', 'other'])
    .withMessage('Invalid party type'),

  body('party.partyId')
    .notEmpty()
    .withMessage('Party ID is required')
    .isMongoId()
    .withMessage('Invalid party ID'),

  body('party.partyName')
    .trim()
    .notEmpty()
    .withMessage('Party name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Party name must be between 2 and 100 characters'),

  // Reference (Optional but validated if provided)
  body('reference.referenceType')
    .optional()
    .isIn(['sale', 'purchase', 'scheme_enrollment', 'order', 'none'])
    .withMessage('Invalid reference type'),

  body('reference.referenceId')
    .optional()
    .isMongoId()
    .withMessage('Invalid reference ID'),

  // Payment Mode Specific Validations
  body('paymentDetails.cardDetails.last4Digits')
    .if(body('paymentMode').equals('card'))
    .optional()
    .matches(/^[0-9]{4}$/)
    .withMessage('Last 4 digits must be exactly 4 numbers'),

  body('paymentDetails.upiDetails.upiId')
    .if(body('paymentMode').equals('upi'))
    .optional()
    .matches(/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/)
    .withMessage('Invalid UPI ID format'),

  body('paymentDetails.chequeDetails.chequeNumber')
    .if(body('paymentMode').equals('cheque'))
    .notEmpty()
    .withMessage('Cheque number is required for cheque payments')
    .isLength({ min: 6, max: 20 })
    .withMessage('Invalid cheque number'),

  body('paymentDetails.chequeDetails.chequeDate')
    .if(body('paymentMode').equals('cheque'))
    .notEmpty()
    .withMessage('Cheque date is required')
    .isISO8601()
    .withMessage('Invalid cheque date'),

  // Notes
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

/**
 * Validation for updating payment
 */
export const updatePaymentValidation = [
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),

  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),

  body('paymentMode')
    .optional()
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'wallet', 'other'])
    .withMessage('Invalid payment mode'),

  body('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Invalid payment status'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  // Prevent updating immutable fields
  body('paymentNumber')
    .not()
    .exists()
    .withMessage('Payment number cannot be updated'),

  body('paymentDate')
    .not()
    .exists()
    .withMessage('Payment date cannot be updated'),
];

/**
 * Validation for payment ID parameter
 */
export const paymentIdValidation = [
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),
];

/**
 * Validation for shop ID parameter
 */
export const shopIdValidation = [
  param('shopId')
    .isMongoId()
    .withMessage('Invalid shop ID'),
];

/**
 * Validation for getting payments list
 */
export const getPaymentsValidation = [
  param('shopId')
    .isMongoId()
    .withMessage('Invalid shop ID'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('paymentType')
    .optional()
    .isIn(['sale_payment', 'purchase_payment', 'scheme_payment', 'advance_payment', 'refund', 'other'])
    .withMessage('Invalid payment type'),

  query('transactionType')
    .optional()
    .isIn(['receipt', 'payment'])
    .withMessage('Invalid transaction type'),

  query('paymentMode')
    .optional()
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'wallet', 'other'])
    .withMessage('Invalid payment mode'),

  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Invalid status'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date'),

  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min amount must be a positive number'),

  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max amount must be a positive number'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),

  query('sort')
    .optional()
    .trim()
    .matches(/^-?(paymentDate|amount|status|paymentNumber)$/)
    .withMessage('Invalid sort field'),
];

/**
 * Validation for payment status update
 */
export const updatePaymentStatusValidation = [
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Invalid payment status'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
];

/**
 * Validation for cheque clearance
 */
export const chequeClearanceValidation = [
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),

  body('clearanceDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid clearance date'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

/**
 * Validation for cheque bounce
 */
export const chequeBounceValidation = [
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),

  body('bounceReason')
    .notEmpty()
    .withMessage('Bounce reason is required')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Bounce reason must be between 10 and 500 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

/**
 * Validation for reconciliation
 */
export const reconcilePaymentValidation = [
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),

  body('reconciledWith')
    .trim()
    .notEmpty()
    .withMessage('Bank statement reference is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Reference must be between 3 and 100 characters'),

  body('discrepancy')
    .optional()
    .isFloat()
    .withMessage('Discrepancy must be a number'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

/**
 * Validation for sending receipt
 */
export const sendReceiptValidation = [
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),

  body('method')
    .notEmpty()
    .withMessage('Sending method is required')
    .isIn(['email', 'sms', 'whatsapp'])
    .withMessage('Method must be email, sms, or whatsapp'),

  body('recipient')
    .notEmpty()
    .withMessage('Recipient is required')
    .custom((value, { req }) => {
      if (req.body.method === 'email') {
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(value)) {
          throw new Error('Invalid email address');
        }
      } else if (req.body.method === 'sms' || req.body.method === 'whatsapp') {
        const phoneRegex = /^[6-9][0-9]{9}$/;
        if (!phoneRegex.test(value)) {
          throw new Error('Invalid phone number');
        }
      }
      return true;
    }),
];

/**
 * Validation for party payments
 */
export const partyPaymentsValidation = [
  param('shopId')
    .isMongoId()
    .withMessage('Invalid shop ID'),

  param('partyId')
    .isMongoId()
    .withMessage('Invalid party ID'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('paymentType')
    .optional()
    .isIn(['sale_payment', 'purchase_payment', 'scheme_payment', 'advance_payment', 'refund', 'other'])
    .withMessage('Invalid payment type'),

  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Invalid status'),
];

/**
 * Validation for date range queries
 */
export const dateRangeValidation = [
  param('shopId')
    .isMongoId()
    .withMessage('Invalid shop ID'),

  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date'),

  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
];

/**
 * Validation for bulk reconcile
 */
export const bulkReconcileValidation = [
  param('shopId')
    .isMongoId()
    .withMessage('Invalid shop ID'),

  body('paymentIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Payment IDs must be an array with 1-100 items'),

  body('paymentIds.*')
    .isMongoId()
    .withMessage('Invalid payment ID in array'),

  body('reconciledWith')
    .trim()
    .notEmpty()
    .withMessage('Bank statement reference is required'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

/**
 * Validation for bulk export
 */
export const bulkExportValidation = [
  param('shopId')
    .isMongoId()
    .withMessage('Invalid shop ID'),

  body('paymentIds')
    .optional()
    .isArray({ min: 1, max: 1000 })
    .withMessage('Payment IDs must be an array with 1-1000 items'),

  body('format')
    .notEmpty()
    .withMessage('Export format is required')
    .isIn(['excel', 'csv'])
    .withMessage('Format must be excel or csv'),
];

/**
 * Validation for refund processing
 */
export const processRefundValidation = [
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),

  body('refundAmount')
    .notEmpty()
    .withMessage('Refund amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be greater than 0'),

  body('refundMode')
    .notEmpty()
    .withMessage('Refund mode is required')
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'wallet', 'other'])
    .withMessage('Invalid refund mode'),

  body('refundReason')
    .trim()
    .notEmpty()
    .withMessage('Refund reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Refund reason must be between 10 and 500 characters'),
];

/**
 * Validation for approval/rejection
 */
export const approvalValidation = [
  param('paymentId')
    .isMongoId()
    .withMessage('Invalid payment ID'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  body('reason')
    .if(body('action').equals('reject'))
    .notEmpty()
    .withMessage('Rejection reason is required')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),
];

/**
 * Validation for amount range filter
 */
export const amountRangeValidation = [
  param('shopId')
    .isMongoId()
    .withMessage('Invalid shop ID'),

  query('minAmount')
    .notEmpty()
    .withMessage('Minimum amount is required')
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be a positive number'),

  query('maxAmount')
    .notEmpty()
    .withMessage('Maximum amount is required')
    .isFloat({ min: 0 })
    .withMessage('Maximum amount must be a positive number')
    .custom((maxAmount, { req }) => {
      if (parseFloat(maxAmount) < parseFloat(req.query.minAmount)) {
        throw new Error('Maximum amount must be greater than minimum amount');
      }
      return true;
    }),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export default {
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
};