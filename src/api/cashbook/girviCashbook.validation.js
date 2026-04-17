import { body, param, query } from 'express-validator';

// ─── Param Validations ─────────────────────────────────────────────────────────
export const shopIdValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),
];

export const entryIdValidation = [
  param('entryId').isMongoId().withMessage('Invalid entry ID'),
];

// ─── Manual Entry Validation ───────────────────────────────────────────────────
export const createManualEntryValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  body('entryType')
    .notEmpty().withMessage('Entry type is required')
    .isIn([
      'girvi_jama',
      'interest_received',
      'principal_received',
      'release_received',
      'discount_given',
      'transfer_out',
      'transfer_in',
      'transfer_return_in',
      'transfer_return_out',
    ])
    .withMessage('Invalid entry type'),

  body('flowType')
    .notEmpty().withMessage('Flow type is required')
    .isIn(['inflow', 'outflow'])
    .withMessage('Flow type must be inflow or outflow'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),

  body('paymentMode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque'])
    .withMessage('Invalid payment mode'),

  body('transactionReference')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Transaction reference cannot exceed 200 characters'),

  body('entryDate')
    .notEmpty().withMessage('Entry date is required')
    .isISO8601().withMessage('Invalid entry date'),

  body('girviId')
    .optional()
    .isMongoId().withMessage('Invalid girvi ID'),

  body('customerId')
    .optional()
    .isMongoId().withMessage('Invalid customer ID'),

  body('breakdown.principalAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Principal amount must be positive'),

  body('breakdown.interestAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Interest amount must be positive'),

  body('breakdown.discountAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount amount must be positive'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters'),
];

// ─── Get Cashbook Entries ──────────────────────────────────────────────────────
export const getCashbookValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),

  query('entryType')
    .optional()
    .isIn([
      'girvi_jama',
      'interest_received',
      'principal_received',
      'release_received',
      'discount_given',
      'transfer_out',
      'transfer_in',
      'transfer_return_in',
      'transfer_return_out',
    ])
    .withMessage('Invalid entry type'),

  query('flowType')
    .optional()
    .isIn(['inflow', 'outflow'])
    .withMessage('Flow type must be inflow or outflow'),

  query('paymentMode')
    .optional()
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque'])
    .withMessage('Invalid payment mode'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date'),

  query('customerId')
    .optional()
    .isMongoId().withMessage('Invalid customer ID'),

  query('girviId')
    .optional()
    .isMongoId().withMessage('Invalid girvi ID'),

  query('sort')
    .optional()
    .trim()
    .matches(/^-?(entryDate|amount|createdAt)$/)
    .withMessage('Invalid sort field'),
];

// ─── Get Summary Validation ────────────────────────────────────────────────────
export const getSummaryValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  query('type')
    .optional()
    .isIn(['daily', 'monthly', 'yearly', 'custom'])
    .withMessage('Type must be daily, monthly, yearly, or custom'),

  query('date')
    .optional()
    .isISO8601().withMessage('Invalid date'),

  query('year')
    .optional()
    .isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),

  query('month')
    .optional()
    .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date'),
];

export default {
  shopIdValidation,
  entryIdValidation,
  createManualEntryValidation,
  getCashbookValidation,
  getSummaryValidation,
};