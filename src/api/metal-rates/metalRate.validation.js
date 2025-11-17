// ============================================================================
// FILE: src/api/metal-rates/metalRate.validation.js
// Metal Rate Management - Input Validation
// ============================================================================

import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../../utils/AppError.js';
import mongoose from 'mongoose';

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    throw new ValidationError('Validation failed', errorMessages);
  }

  next();
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * Validate Metal Rate Object Structure
 */
const rateObjectValidation = [
  body('gold.gold24K.buyingRate')
    .notEmpty()
    .withMessage('Gold 24K buying rate is required')
    .isFloat({ min: 0 })
    .withMessage('Gold 24K buying rate must be a positive number'),

  body('gold.gold24K.sellingRate')
    .notEmpty()
    .withMessage('Gold 24K selling rate is required')
    .isFloat({ min: 0 })
    .withMessage('Gold 24K selling rate must be a positive number')
    .custom((value, { req }) => {
      if (value < req.body.gold.gold24K.buyingRate) {
        throw new Error('Selling rate cannot be less than buying rate for Gold 24K');
      }
      return true;
    }),

  body('gold.gold22K.buyingRate')
    .notEmpty()
    .withMessage('Gold 22K buying rate is required')
    .isFloat({ min: 0 })
    .withMessage('Gold 22K buying rate must be a positive number'),

  body('gold.gold22K.sellingRate')
    .notEmpty()
    .withMessage('Gold 22K selling rate is required')
    .isFloat({ min: 0 })
    .withMessage('Gold 22K selling rate must be a positive number')
    .custom((value, { req }) => {
      if (value < req.body.gold.gold22K.buyingRate) {
        throw new Error('Selling rate cannot be less than buying rate for Gold 22K');
      }
      return true;
    }),

  body('gold.gold18K.buyingRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Gold 18K buying rate must be a positive number'),

  body('gold.gold18K.sellingRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Gold 18K selling rate must be a positive number')
    .custom((value, { req }) => {
      if (req.body.gold?.gold18K?.buyingRate && value < req.body.gold.gold18K.buyingRate) {
        throw new Error('Selling rate cannot be less than buying rate for Gold 18K');
      }
      return true;
    }),

  body('gold.gold14K.buyingRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Gold 14K buying rate must be a positive number'),

  body('gold.gold14K.sellingRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Gold 14K selling rate must be a positive number'),

  body('silver.pure.buyingRate')
    .notEmpty()
    .withMessage('Silver buying rate is required')
    .isFloat({ min: 0 })
    .withMessage('Silver buying rate must be a positive number'),

  body('silver.pure.sellingRate')
    .notEmpty()
    .withMessage('Silver selling rate is required')
    .isFloat({ min: 0 })
    .withMessage('Silver selling rate must be a positive number')
    .custom((value, { req }) => {
      if (value < req.body.silver.pure.buyingRate) {
        throw new Error('Selling rate cannot be less than buying rate for Silver');
      }
      return true;
    }),

  body('silver.sterling925.buyingRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Silver 925 buying rate must be a positive number'),

  body('silver.sterling925.sellingRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Silver 925 selling rate must be a positive number'),

  body('platinum.buyingRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Platinum buying rate must be a positive number'),

  body('platinum.sellingRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Platinum selling rate must be a positive number'),

  body('weightUnit')
    .optional()
    .isIn(['gram', 'kg', 'tola'])
    .withMessage('Weight unit must be: gram, kg, or tola'),

  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP', 'AED'])
    .withMessage('Currency must be: INR, USD, EUR, GBP, or AED'),

  body('rateSource')
    .optional()
    .isIn(['manual', 'market', 'api', 'association'])
    .withMessage('Rate source must be: manual, market, api, or association'),

  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  body('internalNotes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Internal notes cannot exceed 1000 characters'),

  body('marketReference.internationalGoldPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('International gold price must be a positive number'),

  body('marketReference.internationalSilverPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('International silver price must be a positive number'),

  body('marketReference.exchangeRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Exchange rate must be a positive number'),

  body('marketReference.referenceSource')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reference source cannot exceed 200 characters'),
];

// ============================================================================
// ROUTE-SPECIFIC VALIDATIONS
// ============================================================================

/**
 * CREATE OR UPDATE RATE VALIDATION
 * POST /api/v1/shops/:shopId/metal-rates
 * POST /api/v1/organizations/:organizationId/metal-rates/sync
 */
export const createOrUpdateRate = [
  param('shopId')
    .optional()
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid shop ID format'),

  param('organizationId')
    .optional()
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid organization ID format'),

  ...rateObjectValidation,

  handleValidationErrors,
];

/**
 * GET RATE HISTORY VALIDATION
 * GET /api/v1/shops/:shopId/metal-rates/history
 */
export const getRateHistory = [
  param('shopId')
    .notEmpty()
    .withMessage('Shop ID is required')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid shop ID format'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be greater than or equal to start date');
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

  query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string'),

  handleValidationErrors,
];

/**
 * GET RATE BY DATE VALIDATION
 * GET /api/v1/shops/:shopId/metal-rates/date/:date
 */
export const getRateByDate = [
  param('shopId')
    .notEmpty()
    .withMessage('Shop ID is required')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid shop ID format'),

  param('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be in YYYY-MM-DD format'),

  handleValidationErrors,
];

/**
 * COMPARE RATES VALIDATION
 * GET /api/v1/shops/:shopId/metal-rates/compare
 */
export const compareRates = [
  param('shopId')
    .notEmpty()
    .withMessage('Shop ID is required')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid shop ID format'),

  query('fromDate')
    .notEmpty()
    .withMessage('From date is required')
    .isISO8601()
    .withMessage('From date must be in YYYY-MM-DD format'),

  query('toDate')
    .notEmpty()
    .withMessage('To date is required')
    .isISO8601()
    .withMessage('To date must be in YYYY-MM-DD format')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.query.fromDate)) {
        throw new Error('To date must be greater than or equal to from date');
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * GET TREND DATA VALIDATION
 * GET /api/v1/shops/:shopId/metal-rates/trends
 */
export const getTrendData = [
  param('shopId')
    .notEmpty()
    .withMessage('Shop ID is required')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid shop ID format'),

  query('metalType')
    .optional()
    .isIn(['gold', 'silver', 'platinum'])
    .withMessage('Metal type must be: gold, silver, or platinum'),

  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),

  handleValidationErrors,
];

/**
 * GET RATE FOR PURITY VALIDATION
 * GET /api/v1/shops/:shopId/metal-rates/current/purity/:metalType/:purity
 */
export const getRateForPurity = [
  param('shopId')
    .notEmpty()
    .withMessage('Shop ID is required')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid shop ID format'),

  param('metalType')
    .notEmpty()
    .withMessage('Metal type is required')
    .isIn(['gold', 'silver', 'platinum'])
    .withMessage('Metal type must be: gold, silver, or platinum'),

  param('purity')
    .notEmpty()
    .withMessage('Purity is required')
    .custom((value, { req }) => {
      const metalType = req.params.metalType;
      const validPurities = {
        gold: ['24K', '22K', '20K', '18K', '14K'],
        silver: ['999', '925', '900', 'pure', 'sterling'],
        platinum: ['950'],
      };

      if (!validPurities[metalType]?.includes(value)) {
        throw new Error(
          `Invalid purity for ${metalType}. Valid options: ${validPurities[metalType]?.join(', ')}`
        );
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * GET AVERAGE RATE VALIDATION
 * GET /api/v1/shops/:shopId/metal-rates/average
 */
export const getAverageRate = [
  param('shopId')
    .notEmpty()
    .withMessage('Shop ID is required')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid shop ID format'),

  query('metalType')
    .optional()
    .isIn(['gold', 'silver', 'platinum'])
    .withMessage('Metal type must be: gold, silver, or platinum'),

  query('purity')
    .optional()
    .isString()
    .withMessage('Purity must be a string'),

  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),

  handleValidationErrors,
];

/**
 * RATE ID PARAM VALIDATION
 * PATCH /api/v1/metal-rates/:rateId/deactivate
 * DELETE /api/v1/metal-rates/:rateId
 */
export const rateIdParam = [
  param('rateId')
    .notEmpty()
    .withMessage('Rate ID is required')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid rate ID format'),

  handleValidationErrors,
];

// ============================================================================
// CUSTOM VALIDATORS
// ============================================================================

/**
 * Validate that selling rate is greater than or equal to buying rate
 */
export const validateSellingRate = (sellingRate, buyingRate, metalName) => {
  return body(sellingRate).custom((value, { req }) => {
    const buyingRateValue = req.body[buyingRate];
    if (value < buyingRateValue) {
      throw new Error(
        `${metalName} selling rate cannot be less than buying rate`
      );
    }
    return true;
  });
};

/**
 * Validate date range logic
 */
export const validateDateRange = () => {
  return query('endDate').custom((value, { req }) => {
    if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
      throw new Error('End date must be greater than or equal to start date');
    }
    return true;
  });
};

// ============================================================================
// EXPORTS
// ============================================================================
export default {
  createOrUpdateRate,
  getRateHistory,
  getRateByDate,
  compareRates,
  getTrendData,
  getRateForPurity,
  getAverageRate,
  rateIdParam,
  validateSellingRate,
  validateDateRange,
};