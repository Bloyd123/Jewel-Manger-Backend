import { body, validationResult } from 'express-validator';
import { sendValidationError, formatValidationErrors } from '../../utils/sendResponse.js';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, formatValidationErrors(errors.array()));
  }
  next();
};

export const createOrUpdate = [
  body('openingDate')
    .optional()
    .isISO8601().withMessage('Invalid opening date format'),

  // Cash Balance
  body('cashBalance.cash')
    .optional()
    .isFloat({ min: 0 }).withMessage('Cash balance must be positive'),

  body('cashBalance.bank')
    .optional()
    .isArray().withMessage('Bank details must be an array'),

  body('cashBalance.bank.*.bankName')
    .optional()
    .isString().trim()
    .isLength({ min: 1, max: 100 }),

  body('cashBalance.bank.*.balance')
    .optional()
    .isFloat({ min: 0 }).withMessage('Bank balance must be positive'),

  // Party Balances
  body('partyBalances')
    .optional()
    .isArray().withMessage('Party balances must be an array'),

  body('partyBalances.*.partyType')
    .optional()
    .isIn(['customer', 'supplier']).withMessage('Invalid party type'),

  body('partyBalances.*.partyId')
    .optional()
    .isMongoId().withMessage('Invalid party ID'),

  body('partyBalances.*.partyModel')
    .optional()
    .isIn(['Customer', 'Supplier']).withMessage('Invalid party model'),

  body('partyBalances.*.direction')
    .optional()
    .isIn(['we_owe', 'they_owe']).withMessage('Invalid direction'),

  body('partyBalances.*.amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Amount must be positive'),

  // Metal Balances
  body('metalBalances')
    .optional()
    .isArray().withMessage('Metal balances must be an array'),

  body('metalBalances.*.partyType')
    .optional()
    .isIn(['customer', 'supplier']).withMessage('Invalid party type'),

  body('metalBalances.*.partyId')
    .optional()
    .isMongoId().withMessage('Invalid party ID'),

  body('metalBalances.*.metalType')
    .optional()
    .isIn(['gold', 'silver', 'platinum']).withMessage('Invalid metal type'),

  body('metalBalances.*.direction')
    .optional()
    .isIn(['we_owe', 'they_owe']).withMessage('Invalid direction'),

  body('metalBalances.*.weight')
    .optional()
    .isFloat({ min: 0.001 }).withMessage('Weight must be greater than 0'),

  body('metalBalances.*.weightUnit')
    .optional()
    .isIn(['gram', 'tola', 'kg']).withMessage('Invalid weight unit'),

  // Stock Balance
  body('stockBalance.totalStockValue')
    .optional()
    .isFloat({ min: 0 }).withMessage('Stock value must be positive'),

  body('notes')
    .optional()
    .isString().trim()
    .isLength({ max: 1000 }),

  validate,
];