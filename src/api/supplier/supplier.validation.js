// ============================================================================
// FILE: src/api/suppliers/supplier.validation.js
// Supplier Validation - Standalone (No external validate.js dependency)
// ============================================================================

import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../../utils/AppError.js';

// ============================================================================
// VALIDATION MIDDLEWARE WRAPPER
// ============================================================================

/**
 * Validation middleware wrapper
 * Runs all validations and returns errors if any
 */
const validate = validations => {
  return async (req, res, next) => {
    // Run all validations
    for (const validation of validations) {
      await validation.run(req);
    }

    // Check for errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const extractedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    // Throw validation error
    throw new ValidationError('Validation failed', extractedErrors);
  };
};

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

const isValidGST = value => {
  if (!value) return true; // Optional field
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value);
};

const isValidPAN = value => {
  if (!value) return true; // Optional field
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value);
};

const isValidPhone = value => {
  if (!value) return true; // Optional field
  return /^[0-9]{10}$/.test(value);
};

const isValidPincode = value => {
  if (!value) return true; // Optional field
  return /^[0-9]{6}$/.test(value);
};

const isValidIFSC = value => {
  if (!value) return true; // Optional field
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value);
};

const isValidUPI = value => {
  if (!value) return true; // Optional field
  return /^[\w.-]+@[\w.-]+$/.test(value);
};

// ============================================================================
// CREATE SUPPLIER VALIDATION
// ============================================================================

export const createSupplierValidation = validate([
  // Business Information
  body('businessName')
    .trim()
    .notEmpty()
    .withMessage('Business name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Business name must be between 2 and 200 characters'),

  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Display name must not exceed 200 characters'),

  // Contact Person - First Name
  body('contactPerson.firstName')
    .trim()
    .notEmpty()
    .withMessage('Contact person first name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),

  // Contact Person - Last Name
  body('contactPerson.lastName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Last name must not exceed 100 characters'),

  // Contact Person - Designation
  body('contactPerson.designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation must not exceed 100 characters'),

  // Contact Person - Email
  body('contactPerson.email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),

  // Contact Person - Phone (Required)
  body('contactPerson.phone')
    .trim()
    .notEmpty()
    .withMessage('Contact phone is required')
    .custom(isValidPhone)
    .withMessage('Phone must be 10 digits'),

  // Contact Person - Alternate Phone
  body('contactPerson.alternatePhone')
    .optional()
    .trim()
    .custom(isValidPhone)
    .withMessage('Alternate phone must be 10 digits'),

  // Contact Person - WhatsApp
  body('contactPerson.whatsappNumber')
    .optional()
    .trim()
    .custom(isValidPhone)
    .withMessage('WhatsApp number must be 10 digits'),

  // Business Email
  body('businessEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid business email')
    .normalizeEmail(),

  // Business Phone
  body('businessPhone')
    .optional()
    .trim()
    .custom(isValidPhone)
    .withMessage('Business phone must be 10 digits'),

  // Website
  body('website').optional().trim().isURL().withMessage('Invalid website URL'),

  // Address - Street
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street must not exceed 200 characters'),

  // Address - City
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),

  // Address - State
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters'),

  // Address - Pincode
  body('address.pincode')
    .optional()
    .trim()
    .custom(isValidPincode)
    .withMessage('Pincode must be 6 digits'),

  // GST Number
  body('gstNumber')
    .optional()
    .trim()
    .toUpperCase()
    .custom(isValidGST)
    .withMessage('Invalid GST number format (e.g., 27AAAAA0000A1Z5)'),

  // PAN Number
  body('panNumber')
    .optional()
    .trim()
    .toUpperCase()
    .custom(isValidPAN)
    .withMessage('Invalid PAN number format (e.g., AAAAA0000A)'),

  // Supplier Type
  body('supplierType')
    .optional()
    .isIn(['manufacturer', 'wholesaler', 'distributor', 'artisan', 'importer', 'other'])
    .withMessage('Invalid supplier type'),

  // Supplier Category
  body('supplierCategory')
    .optional()
    .isIn([
      'gold',
      'silver',
      'diamond',
      'platinum',
      'gemstone',
      'pearls',
      'making',
      'packaging',
      'mixed',
    ])
    .withMessage('Invalid supplier category'),

  // Payment Terms
  body('paymentTerms')
    .optional()
    .isIn(['immediate', 'cod', 'net15', 'net30', 'net45', 'net60', 'custom'])
    .withMessage('Invalid payment terms'),

  // Credit Period
  body('creditPeriod')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Credit period must be between 0 and 365 days'),

  // Credit Limit
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),

  // Bank Details - Bank Name
  body('bankDetails.bankName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bank name must not exceed 100 characters'),

  // Bank Details - Account Number
  body('bankDetails.accountNumber')
    .optional()
    .trim()
    .isLength({ min: 9, max: 18 })
    .withMessage('Account number must be between 9 and 18 characters'),

  // Bank Details - IFSC Code
  body('bankDetails.ifscCode')
    .optional()
    .trim()
    .toUpperCase()
    .custom(isValidIFSC)
    .withMessage('Invalid IFSC code format (e.g., SBIN0001234)'),

  // Bank Details - Account Holder Name
  body('bankDetails.accountHolderName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Account holder name must not exceed 100 characters'),

  // UPI ID
  body('upiId')
    .optional()
    .trim()
    .custom(isValidUPI)
    .withMessage('Invalid UPI ID format (e.g., name@upi)'),

  // Notes
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),

  // Products Supplied (Array)
  body('productsSupplied').optional().isArray().withMessage('Products supplied must be an array'),

  body('productsSupplied.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Product name must be between 1 and 100 characters'),

  // Tags (Array)
  body('tags').optional().isArray().withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tag must be between 1 and 50 characters'),
]);

// ============================================================================
// UPDATE SUPPLIER VALIDATION
// ============================================================================

export const updateSupplierValidation = validate([
  // Supplier ID (from params)
  param('id').isMongoId().withMessage('Invalid supplier ID'),

  // All fields are optional for update
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Business name must be between 2 and 200 characters'),

  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Display name must not exceed 200 characters'),

  body('contactPerson.firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),

  body('contactPerson.phone')
    .optional()
    .trim()
    .custom(isValidPhone)
    .withMessage('Phone must be 10 digits'),

  body('gstNumber')
    .optional()
    .trim()
    .toUpperCase()
    .custom(isValidGST)
    .withMessage('Invalid GST number format'),

  body('panNumber')
    .optional()
    .trim()
    .toUpperCase()
    .custom(isValidPAN)
    .withMessage('Invalid PAN number format'),

  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),

  body('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean'),

  body('isPreferred').optional().isBoolean().withMessage('isPreferred must be a boolean'),
]);

// ============================================================================
// GET SUPPLIER BY ID VALIDATION
// ============================================================================

export const getSupplierValidation = validate([
  param('id').isMongoId().withMessage('Invalid supplier ID'),
]);

// ============================================================================
// DELETE SUPPLIER VALIDATION
// ============================================================================

export const deleteSupplierValidation = validate([
  param('id').isMongoId().withMessage('Invalid supplier ID'),
]);

// ============================================================================
// GET SUPPLIERS QUERY VALIDATION
// ============================================================================

export const getSuppliersValidation = validate([
  // Pagination
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  // Search
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search must be between 1 and 100 characters'),

  // Filters
  query('supplierType')
    .optional()
    .isIn(['manufacturer', 'wholesaler', 'distributor', 'artisan', 'importer', 'other'])
    .withMessage('Invalid supplier type'),

  query('supplierCategory')
    .optional()
    .isIn([
      'gold',
      'silver',
      'diamond',
      'platinum',
      'gemstone',
      'pearls',
      'making',
      'packaging',
      'mixed',
    ])
    .withMessage('Invalid supplier category'),

  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),

  query('isPreferred').optional().isBoolean().withMessage('isPreferred must be a boolean'),

  query('isBlacklisted').optional().isBoolean().withMessage('isBlacklisted must be a boolean'),

  // Sorting
  query('sort')
    .optional()
    .trim()
    .isIn([
      'businessName',
      '-businessName',
      'createdAt',
      '-createdAt',
      'totalPurchases',
      '-totalPurchases',
      'rating',
      '-rating',
      'supplierCode',
      '-supplierCode',
    ])
    .withMessage('Invalid sort field'),
]);

// ============================================================================
// UPDATE RATING VALIDATION
// ============================================================================

export const updateRatingValidation = validate([
  param('id').isMongoId().withMessage('Invalid supplier ID'),

  body('qualityRating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Quality rating must be between 1 and 5'),

  body('deliveryRating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Delivery rating must be between 1 and 5'),

  body('priceRating').isInt({ min: 1, max: 5 }).withMessage('Price rating must be between 1 and 5'),
]);

// ============================================================================
// BLACKLIST SUPPLIER VALIDATION
// ============================================================================

export const blacklistSupplierValidation = validate([
  param('id').isMongoId().withMessage('Invalid supplier ID'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Blacklist reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
]);

// ============================================================================
// UPDATE BALANCE VALIDATION
// ============================================================================

export const updateBalanceValidation = validate([
  param('id').isMongoId().withMessage('Invalid supplier ID'),

  body('amount')
    .isFloat()
    .withMessage('Amount must be a number')
    .custom(value => value !== 0)
    .withMessage('Amount cannot be zero'),

  body('type')
    .isIn(['payment', 'purchase', 'adjustment'])
    .withMessage('Type must be payment, purchase, or adjustment'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Note must not exceed 200 characters'),
]);

// ============================================================================
// RESTORE SUPPLIER VALIDATION
// ============================================================================

export const restoreSupplierValidation = validate([
  param('id').isMongoId().withMessage('Invalid supplier ID'),
]);

// ============================================================================
// MARK AS PREFERRED VALIDATION
// ============================================================================

export const markPreferredValidation = validate([
  param('id').isMongoId().withMessage('Invalid supplier ID'),
]);

// ============================================================================
// REMOVE FROM BLACKLIST VALIDATION
// ============================================================================

export const removeBlacklistValidation = validate([
  param('id').isMongoId().withMessage('Invalid supplier ID'),
]);

// ============================================================================
// EXPORT ALL VALIDATIONS
// ============================================================================

export default {
  createSupplierValidation,
  updateSupplierValidation,
  getSupplierValidation,
  deleteSupplierValidation,
  getSuppliersValidation,
  updateRatingValidation,
  blacklistSupplierValidation,
  updateBalanceValidation,
  restoreSupplierValidation,
  markPreferredValidation,
  removeBlacklistValidation,
};
