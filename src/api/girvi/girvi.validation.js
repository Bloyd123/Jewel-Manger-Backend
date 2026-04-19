import { body, param, query } from 'express-validator';

// ─── Shop ID param ─────────────────────────────────────────────────────────────
export const shopIdValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),
];

// ─── Girvi ID param ────────────────────────────────────────────────────────────
export const girviIdValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),
];

// ─── Create Girvi (Jama) ───────────────────────────────────────────────────────
export const createGirviValidation = [
  body('customerId')
    .notEmpty().withMessage('Customer ID is required')
    .isMongoId().withMessage('Invalid customer ID'),

  // Items
  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required'),

  body('items.*.itemName')
    .trim()
    .notEmpty().withMessage('Item name is required')
    .isLength({ max: 200 }).withMessage('Item name cannot exceed 200 characters'),

  body('items.*.itemType')
    .notEmpty().withMessage('Item type is required')
    .isIn(['gold', 'silver', 'diamond', 'platinum', 'other'])
    .withMessage('Invalid item type'),

  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),

  body('items.*.grossWeight')
    .notEmpty().withMessage('Gross weight is required')
    .isFloat({ min: 0 }).withMessage('Gross weight must be a positive number'),

  body('items.*.lessWeight')
    .optional()
    .isFloat({ min: 0 }).withMessage('Less weight must be a positive number'),

  body('items.*.tunch')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Tunch must be between 0 and 100'),

  body('items.*.purity')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Purity cannot exceed 20 characters'),

  body('items.*.ratePerGram')
    .optional()
    .isFloat({ min: 0 }).withMessage('Rate per gram must be a positive number'),

  body('items.*.userGivenValue')
    .optional()
    .isFloat({ min: 0 }).withMessage('User given value must be a positive number'),

  body('items.*.condition')
    .optional()
    .isIn(['good', 'fair', 'poor']).withMessage('Invalid condition'),

  // Financial
  body('principalAmount')
    .notEmpty().withMessage('Principal amount is required')
    .isFloat({ min: 1 }).withMessage('Principal amount must be greater than 0'),

  body('interestRate')
    .notEmpty().withMessage('Interest rate is required')
    .isFloat({ min: 0 }).withMessage('Interest rate must be a positive number'),

  body('interestType')
    .optional()
    .isIn(['simple', 'compound']).withMessage('Interest type must be simple or compound'),

  body('calculationBasis')
    .optional()
    .isIn(['monthly', 'daily']).withMessage('Calculation basis must be monthly or daily'),

  body('girviDate')
    .notEmpty().withMessage('Girvi date is required')
    .isISO8601().withMessage('Invalid girvi date'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid due date'),

  body('gracePeriodDays')
    .optional()
    .isInt({ min: 0 }).withMessage('Grace period days must be a positive integer'),

  body('loanToValueRatio')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Loan to value ratio must be between 0 and 100'),

  // Optional fields
  body('girviSlipNumber')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Slip number cannot exceed 100 characters'),

  body('witnessName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Witness name cannot exceed 100 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),

  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Internal notes cannot exceed 1000 characters'),
];

// ─── Update Girvi ──────────────────────────────────────────────────────────────
export const updateGirviValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),

  body('interestRate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Interest rate must be a positive number'),

  body('interestType')
    .optional()
    .isIn(['simple', 'compound']).withMessage('Invalid interest type'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid due date'),

  body('gracePeriodDays')
    .optional()
    .isInt({ min: 0 }).withMessage('Grace period days must be a positive integer'),

  body('girviSlipNumber')
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body('witnessName')
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }),

  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 }),

  // Prevent updating these fields directly
  body('status').not().exists().withMessage('Status cannot be updated directly'),
  body('girviNumber').not().exists().withMessage('Girvi number cannot be updated'),
  body('customerId').not().exists().withMessage('Customer cannot be changed'),
  body('principalAmount').not().exists().withMessage('Principal cannot be updated directly'),
];

// ─── Release Girvi ─────────────────────────────────────────────────────────────
export const releaseGirviValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),

  body('releaseInterestType')
    .notEmpty().withMessage('Interest type is required for release')
    .isIn(['simple', 'compound']).withMessage('Interest type must be simple or compound'),

  body('interestReceived')
    .notEmpty().withMessage('Interest received is required')
    .isFloat({ min: 0 }).withMessage('Interest received must be a positive number'),

  body('principalReceived')
    .notEmpty().withMessage('Principal received is required')
    .isFloat({ min: 0 }).withMessage('Principal received must be a positive number'),

  body('discountGiven')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount must be a positive number'),

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
    .isLength({ max: 200 }),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 }),
];

// ─── Get Girvis (List + Filters) ───────────────────────────────────────────────
export const getGirvisValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(['active', 'released', 'transferred', 'partial_released', 'overdue', 'auctioned'])
    .withMessage('Invalid status'),

  query('customerId')
    .optional()
    .isMongoId().withMessage('Invalid customer ID'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date'),

  query('overdueOnly')
    .optional()
    .isBoolean().withMessage('overdueOnly must be true or false'),

  query('sort')
    .optional()
    .trim()
    .matches(/^-?(girviDate|dueDate|principalAmount|totalAmountDue|createdAt)$/)
    .withMessage('Invalid sort field'),
];

// ─── Partial Release Validation ────────────────────────────────────────────────
export const partialReleaseValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),

  body('releasedItems')
    .isArray({ min: 1 }).withMessage('At least one item must be selected for release'),

  body('releasedItems.*.itemId')
    .notEmpty().withMessage('Item ID is required')
    .isMongoId().withMessage('Invalid item ID'),

  body('releasedItems.*.releasedQuantity')
    .notEmpty().withMessage('Released quantity is required')
    .isInt({ min: 1 }).withMessage('Released quantity must be at least 1'),

  body('interestPaid')
    .notEmpty().withMessage('Interest paid is required')
    .isFloat({ min: 0 }).withMessage('Interest paid must be positive'),

  body('principalPaid')
    .notEmpty().withMessage('Principal paid is required')
    .isFloat({ min: 0 }).withMessage('Principal paid must be positive'),

  body('discountGiven')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount must be positive'),

  body('releaseDate')
    .notEmpty().withMessage('Release date is required')
    .isISO8601().withMessage('Invalid release date'),

  body('paymentMode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque'])
    .withMessage('Invalid payment mode'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 }),
];

// ─── Renewal Validation ────────────────────────────────────────────────────────
export const renewalValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),

  body('interestPaid')
    .notEmpty().withMessage('Interest paid is required')
    .isFloat({ min: 0 }).withMessage('Interest paid must be positive'),

  body('principalPaid')
    .optional()
    .isFloat({ min: 0 }).withMessage('Principal paid must be positive'),

  body('discountGiven')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount must be positive'),

  body('newDueDate')
    .notEmpty().withMessage('New due date is required')
    .isISO8601().withMessage('Invalid new due date'),

  body('renewalDate')
    .notEmpty().withMessage('Renewal date is required')
    .isISO8601().withMessage('Invalid renewal date'),

  body('newInterestRate')
    .optional()
    .isFloat({ min: 0 }).withMessage('New interest rate must be positive'),

  body('paymentMode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque'])
    .withMessage('Invalid payment mode'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 }),
];

// ─── Calculate Interest ────────────────────────────────────────────────────────
export const calculateInterestValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),

  query('toDate')
    .optional()
    .isISO8601().withMessage('Invalid date'),

  query('interestType')
    .optional()
    .isIn(['simple', 'compound']).withMessage('Invalid interest type'),
];

export default {
  shopIdValidation,
  girviIdValidation,
  createGirviValidation,
  updateGirviValidation,
  releaseGirviValidation,
  getGirvisValidation,
  calculateInterestValidation,
};