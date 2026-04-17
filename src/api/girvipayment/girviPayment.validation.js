import { body, param, query } from 'express-validator';

// ─── Param Validations ─────────────────────────────────────────────────────────
export const shopIdValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),
];

export const girviIdValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),
];

export const paymentIdValidation = [
  param('paymentId').isMongoId().withMessage('Invalid payment ID'),
];

// ─── Add Payment Validation ────────────────────────────────────────────────────
export const addPaymentValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),

  // Payment type
  body('paymentType')
    .notEmpty().withMessage('Payment type is required')
    .isIn([
      'interest_only',
      'principal_partial',
      'principal_full',
      'interest_principal',
      'release_payment',
    ])
    .withMessage('Invalid payment type'),

  // Interest type - user chooses at time of payment
  body('interestType')
    .notEmpty().withMessage('Interest type is required')
    .isIn(['simple', 'compound'])
    .withMessage('Interest type must be simple or compound'),

  // Interest period
  body('interestFrom')
    .optional()
    .isISO8601().withMessage('Invalid interest from date'),

  body('interestTo')
    .optional()
    .isISO8601().withMessage('Invalid interest to date'),

  // Amounts
  body('interestReceived')
    .notEmpty().withMessage('Interest received is required')
    .isFloat({ min: 0 }).withMessage('Interest received must be a positive number'),

  body('principalReceived')
    .notEmpty().withMessage('Principal received is required')
    .isFloat({ min: 0 }).withMessage('Principal received must be a positive number'),

  body('discountGiven')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount must be a positive number'),

  // Validate at least one of interest or principal > 0
  body('interestReceived').custom((value, { req }) => {
    const interest  = parseFloat(value || 0);
    const principal = parseFloat(req.body.principalReceived || 0);
    if (interest === 0 && principal === 0) {
      throw new Error('At least one of interest received or principal received must be greater than 0');
    }
    return true;
  }),

  // Payment details
  body('paymentDate')
    .notEmpty().withMessage('Payment date is required')
    .isISO8601().withMessage('Invalid payment date'),

  body('paymentMode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque'])
    .withMessage('Invalid payment mode'),

  body('transactionReference')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Transaction reference cannot exceed 200 characters'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters'),
];

// ─── Get Payments (List + Filters) ────────────────────────────────────────────
export const getPaymentsValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('paymentType')
    .optional()
    .isIn([
      'interest_only',
      'principal_partial',
      'principal_full',
      'interest_principal',
      'release_payment',
    ])
    .withMessage('Invalid payment type'),

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

  query('sort')
    .optional()
    .trim()
    .matches(/^-?(paymentDate|amount|createdAt)$/)
    .withMessage('Invalid sort field'),
];

// ─── Get All Payments for Shop (cashbook style) ────────────────────────────────
export const getShopPaymentsValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('paymentType')
    .optional()
    .isIn([
      'interest_only',
      'principal_partial',
      'principal_full',
      'interest_principal',
      'release_payment',
    ])
    .withMessage('Invalid payment type'),

  query('paymentMode')
    .optional()
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque'])
    .withMessage('Invalid payment mode'),

  query('customerId')
    .optional()
    .isMongoId().withMessage('Invalid customer ID'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date'),

  query('sort')
    .optional()
    .trim()
    .matches(/^-?(paymentDate|netAmountReceived|createdAt)$/)
    .withMessage('Invalid sort field'),
];

export default {
  shopIdValidation,
  girviIdValidation,
  paymentIdValidation,
  addPaymentValidation,
  getPaymentsValidation,
  getShopPaymentsValidation,
};