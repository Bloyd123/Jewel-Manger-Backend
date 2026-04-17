import { body, param, query, validationResult } from 'express-validator';
import { sendValidationError, formatValidationErrors } from '../../utils/sendResponse.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, formatValidationErrors(errors.array()));
  }
  next();
};

// ─── Param validators ────────────────────────────────────────────
export const partyId = [
  param('partyId').isMongoId().withMessage('Invalid party ID'),
  validate,
];

// ─── Create Entry ────────────────────────────────────────────────
export const createEntry = [
  body('partyType')
    .notEmpty().withMessage('Party type is required')
    .isIn(['customer', 'supplier']).withMessage('Invalid party type'),

  body('partyId')
    .notEmpty().withMessage('Party ID is required')
    .isMongoId().withMessage('Invalid party ID'),

  body('partyModel')
    .notEmpty().withMessage('Party model is required')
    .isIn(['Customer', 'Supplier']).withMessage('Invalid party model'),

  body('partyName')
    .notEmpty().withMessage('Party name is required')
    .isString().trim(),

  body('metalType')
    .notEmpty().withMessage('Metal type is required')
    .isIn(['gold', 'silver', 'platinum']).withMessage('Invalid metal type'),

  body('entryType')
    .notEmpty().withMessage('Entry type is required')
    .isIn(['given', 'received', 'settled', 'opening_balance', 'adjustment'])
    .withMessage('Invalid entry type'),

  body('weight')
    .notEmpty().withMessage('Weight is required')
    .isFloat({ min: 0.001 }).withMessage('Weight must be greater than 0'),

  body('weightUnit')
    .optional()
    .isIn(['gram', 'tola', 'kg']).withMessage('Invalid weight unit'),

  body('direction')
    .notEmpty().withMessage('Direction is required')
    .isIn(['we_owe', 'they_owe']).withMessage('Invalid direction'),

  body('referenceType')
    .notEmpty().withMessage('Reference type is required')
    .isIn(['purchase', 'sale', 'payment', 'opening_balance', 'manual', 'adjustment'])
    .withMessage('Invalid reference type'),

  body('referenceId')
    .optional()
    .isMongoId().withMessage('Invalid reference ID'),

  body('notes')
    .optional()
    .isString().trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),

  validate,
];

// ─── Settle Entry ────────────────────────────────────────────────
export const settleEntry = [
  param('entryId')
    .isMongoId().withMessage('Invalid entry ID'),

  body('settleWeight')
    .notEmpty().withMessage('Settle weight is required')
    .isFloat({ min: 0.001 }).withMessage('Settle weight must be greater than 0'),

  body('rateAtSettlement')
    .optional()
    .isFloat({ min: 0 }).withMessage('Rate must be a positive number'),

  body('settlementMode')
    .optional()
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque', 'metal_exchange'])
    .withMessage('Invalid settlement mode'),

  body('notes')
    .optional()
    .isString().trim()
    .isLength({ max: 500 }),

  validate,
];

// ─── Bulk Settle ─────────────────────────────────────────────────
export const bulkSettle = [
  body('partyId')
    .notEmpty().withMessage('Party ID is required')
    .isMongoId().withMessage('Invalid party ID'),

  body('metalType')
    .notEmpty().withMessage('Metal type is required')
    .isIn(['gold', 'silver', 'platinum']).withMessage('Invalid metal type'),

  body('rateAtSettlement')
    .optional()
    .isFloat({ min: 0 }).withMessage('Rate must be positive'),

  body('settlementMode')
    .optional()
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque', 'metal_exchange'])
    .withMessage('Invalid settlement mode'),

  validate,
];

// ─── Get Pending Entries ─────────────────────────────────────────
export const getPendingEntries = [
  query('partyType')
    .optional()
    .isIn(['customer', 'supplier']).withMessage('Invalid party type'),

  query('metalType')
    .optional()
    .isIn(['gold', 'silver', 'platinum']).withMessage('Invalid metal type'),

  query('direction')
    .optional()
    .isIn(['we_owe', 'they_owe']).withMessage('Invalid direction'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be positive'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  validate,
];