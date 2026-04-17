import { body, param, query } from 'express-validator';

// ─── Param Validations ─────────────────────────────────────────────────────────
export const shopIdValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),
];

export const girviIdValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),
];

export const transferIdValidation = [
  param('transferId').isMongoId().withMessage('Invalid transfer ID'),
];

// ─── Party validation helper ───────────────────────────────────────────────────
const partyValidation = (prefix) => [
  body(`${prefix}.name`)
    .notEmpty().withMessage(`${prefix} name is required`)
    .trim()
    .isLength({ max: 200 }).withMessage(`${prefix} name cannot exceed 200 characters`),

  body(`${prefix}.phone`)
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage(`${prefix} phone must be 10 digits`),

  body(`${prefix}.address`)
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage(`${prefix} address cannot exceed 500 characters`),

  body(`${prefix}.type`)
    .optional()
    .isIn(['shop', 'external']).withMessage(`${prefix} type must be shop or external`),

  body(`${prefix}.interestRate`)
    .optional()
    .isFloat({ min: 0 }).withMessage(`${prefix} interest rate must be a positive number`),

  body(`${prefix}.interestType`)
    .optional()
    .isIn(['simple', 'compound']).withMessage(`${prefix} interest type must be simple or compound`),
];

// ─── Transfer Out Validation ───────────────────────────────────────────────────
export const transferOutValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),

  // From party (our shop)
  ...partyValidation('fromParty'),

  // To party (doosri party)
  ...partyValidation('toParty'),

  body('toParty.name')
    .notEmpty().withMessage('To party name is required'),

  body('toParty.interestRate')
    .notEmpty().withMessage('To party interest rate is required')
    .isFloat({ min: 0 }).withMessage('Interest rate must be a positive number'),

  body('toParty.interestType')
    .notEmpty().withMessage('To party interest type is required')
    .isIn(['simple', 'compound']).withMessage('Interest type must be simple or compound'),

  // Transfer date
  body('transferDate')
    .notEmpty().withMessage('Transfer date is required')
    .isISO8601().withMessage('Invalid transfer date'),

  // Our financials till transfer
  body('ourInterestTillTransfer')
    .optional()
    .isFloat({ min: 0 }).withMessage('Our interest must be a positive number'),

  body('ourInterestType')
    .optional()
    .isIn(['simple', 'compound']).withMessage('Interest type must be simple or compound'),

  // Transfer settlement
  body('partyPrincipalAmount')
    .notEmpty().withMessage('Party principal amount is required')
    .isFloat({ min: 1 }).withMessage('Party principal amount must be greater than 0'),

  body('transferAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Transfer amount must be a positive number'),

  body('commission')
    .optional()
    .isFloat({ min: 0 }).withMessage('Commission must be a positive number'),

  body('paymentMode')
    .optional()
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque'])
    .withMessage('Invalid payment mode'),

  body('transactionReference')
    .optional()
    .trim()
    .isLength({ max: 200 }),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
];

// ─── Transfer Return Validation ────────────────────────────────────────────────
export const transferReturnValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),
  param('transferId').isMongoId().withMessage('Invalid transfer ID'),

  body('returnDate')
    .notEmpty().withMessage('Return date is required')
    .isISO8601().withMessage('Invalid return date'),

  body('partyInterestCharged')
    .notEmpty().withMessage('Party interest charged is required')
    .isFloat({ min: 0 }).withMessage('Party interest must be a positive number'),

  body('returnAmount')
    .notEmpty().withMessage('Return amount is required')
    .isFloat({ min: 0 }).withMessage('Return amount must be a positive number'),

  body('returnPaymentMode')
    .notEmpty().withMessage('Return payment mode is required')
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque'])
    .withMessage('Invalid payment mode'),

  body('returnTransactionReference')
    .optional()
    .trim()
    .isLength({ max: 200 }),

  body('returnReason')
    .optional()
    .trim()
    .isLength({ max: 500 }),

  body('returnRemarks')
    .optional()
    .trim()
    .isLength({ max: 500 }),
];

// ─── Get Transfers Validation ──────────────────────────────────────────────────
export const getTransfersValidation = [
  param('girviId').isMongoId().withMessage('Invalid girvi ID'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(['pending', 'completed', 'returned', 'cancelled'])
    .withMessage('Invalid status'),

  query('transferType')
    .optional()
    .isIn(['outgoing', 'incoming', 'return'])
    .withMessage('Invalid transfer type'),
];

// ─── Get Shop Transfers Validation ────────────────────────────────────────────
export const getShopTransfersValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(['pending', 'completed', 'returned', 'cancelled'])
    .withMessage('Invalid status'),

  query('transferType')
    .optional()
    .isIn(['outgoing', 'incoming', 'return'])
    .withMessage('Invalid transfer type'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date'),

  query('sort')
    .optional()
    .trim()
    .matches(/^-?(transferDate|transferAmount|createdAt)$/)
    .withMessage('Invalid sort field'),
];

export default {
  shopIdValidation,
  girviIdValidation,
  transferIdValidation,
  transferOutValidation,
  transferReturnValidation,
  getTransfersValidation,
  getShopTransfersValidation,
};