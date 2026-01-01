// ============================================================================
// FILE: src/api/shops/shop.validation.js
// Shop Validation - Request validation for shop operations
// ============================================================================

import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

// ============================================================================
// HELPER VALIDATORS
// ============================================================================

const isValidObjectId = value => {
  return mongoose.Types.ObjectId.isValid(value);
};

const isValidCoordinates = value => {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [lng, lat] = value;
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
};

// ============================================================================
// CREATE SHOP VALIDATION
// ============================================================================

export const createShopValidation = [
  // Basic Information
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Shop name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Shop name must be between 3 and 100 characters'),

  body('displayName').optional().trim().isLength({ max: 100 }),

  // Contact Information
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),

  body('alternatePhone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit alternate phone number'),

  body('whatsappNumber')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit WhatsApp number'),

  // Address Validation
  body('address.street').trim().notEmpty().withMessage('Street address is required'),

  body('address.city').trim().notEmpty().withMessage('City is required'),

  body('address.state').trim().notEmpty().withMessage('State is required'),

  body('address.country').optional().trim(),

  body('address.pincode')
    .trim()
    .notEmpty()
    .withMessage('Pincode is required')
    .matches(/^[0-9]{6}$/)
    .withMessage('Invalid pincode'),

  body('address.location.coordinates')
    .optional()
    .custom(isValidCoordinates)
    .withMessage('Invalid coordinates. Format: [longitude, latitude]'),

  // Business Registration
  body('gstNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GST number'),

  body('panNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN number'),

  // Shop Type & Category
  body('shopType')
    .optional()
    .isIn(['retail', 'wholesale', 'manufacturing', 'showroom', 'workshop', 'warehouse', 'online'])
    .withMessage('Invalid shop type'),

  body('category')
    .optional()
    .isIn(['jewelry', 'gold', 'silver', 'diamond', 'gemstone', 'pearls', 'platinum', 'mixed'])
    .withMessage('Invalid category'),

  body('establishedYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Invalid established year'),

  // Manager ID (optional - will default to logged-in user)
  body('managerId').optional().custom(isValidObjectId).withMessage('Invalid manager ID'),

  // Copy Settings From
  body('copySettingsFromShopId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid shop ID to copy settings from'),

  // Bank Details Validation
  body('bankDetails').optional().isArray().withMessage('Bank details must be an array'),

  body('bankDetails.*.bankName').optional().trim().notEmpty().withMessage('Bank name is required'),

  body('bankDetails.*.accountNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Account number is required'),

  body('bankDetails.*.ifscCode')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .withMessage('Invalid IFSC code'),

  body('bankDetails.*.accountHolderName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Account holder name is required'),

  // UPI Details Validation
  body('upiDetails').optional().isArray().withMessage('UPI details must be an array'),

  body('upiDetails.*.upiId')
    .optional()
    .trim()
    .matches(/^[\w.-]+@[\w.-]+$/)
    .withMessage('Invalid UPI ID'),
];

// ============================================================================
// UPDATE SHOP VALIDATION
// ============================================================================

export const updateShopValidation = [
  param('id').custom(isValidObjectId).withMessage('Invalid shop ID'),

  // All fields are optional for update
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Shop name must be between 3 and 100 characters'),

  body('displayName').optional().trim().isLength({ max: 100 }),

  body('email').optional().trim().isEmail().withMessage('Invalid email').normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Invalid phone number'),

  body('alternatePhone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Invalid alternate phone'),

  body('whatsappNumber')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Invalid WhatsApp number'),

  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.pincode')
    .optional()
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('Invalid pincode'),

  body('gstNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GST number'),

  body('panNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN number'),

  body('shopType')
    .optional()
    .isIn(['retail', 'wholesale', 'manufacturing', 'showroom', 'workshop', 'warehouse', 'online']),

  body('category')
    .optional()
    .isIn(['jewelry', 'gold', 'silver', 'diamond', 'gemstone', 'pearls', 'platinum', 'mixed']),

  body('managerId').optional().custom(isValidObjectId).withMessage('Invalid manager ID'),

  // Prevent updating verified shop's GST/PAN without super_admin
  body('gstNumber').custom((value, { req }) => {
    if (value && req.shop?.isVerified && req.user?.role !== 'super_admin') {
      throw new Error('Only super admin can update GST number of verified shop');
    }
    return true;
  }),

  body('panNumber').custom((value, { req }) => {
    if (value && req.shop?.isVerified && req.user?.role !== 'super_admin') {
      throw new Error('Only super admin can update PAN number of verified shop');
    }
    return true;
  }),
];

// ============================================================================
// GET SHOPS VALIDATION (Query Params)
// ============================================================================

export const getShopsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sort').optional().trim(),

  query('fields').optional().trim(),

  query('search').optional().trim(),

  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),

  query('isVerified').optional().isBoolean().withMessage('isVerified must be boolean'),

  query('shopType')
    .optional()
    .isIn(['retail', 'wholesale', 'manufacturing', 'showroom', 'workshop', 'warehouse', 'online']),

  query('category')
    .optional()
    .isIn(['jewelry', 'gold', 'silver', 'diamond', 'gemstone', 'pearls', 'platinum', 'mixed']),

  query('city').optional().trim(),

  query('state').optional().trim(),

  query('organizationId').optional().custom(isValidObjectId).withMessage('Invalid organization ID'),
];

// ============================================================================
// GET SINGLE SHOP VALIDATION
// ============================================================================

export const getShopValidation = [
  param('id').custom(isValidObjectId).withMessage('Invalid shop ID'),

  query('includeSettings').optional().isBoolean().withMessage('includeSettings must be boolean'),

  query('populate').optional().trim(),
];

// ============================================================================
// DELETE SHOP VALIDATION
// ============================================================================

export const deleteShopValidation = [
  param('id').custom(isValidObjectId).withMessage('Invalid shop ID'),
];

// ============================================================================
// UPDATE SHOP SETTINGS VALIDATION
// ============================================================================

export const updateShopSettingsValidation = [
  param('id').custom(isValidObjectId).withMessage('Invalid shop ID'),

  body('settings').optional().isObject().withMessage('Settings must be an object'),

  body('settings.currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'])
    .withMessage('Invalid currency'),

  body('settings.language')
    .optional()
    .isIn(['en', 'hi', 'mr', 'gu', 'ta', 'te'])
    .withMessage('Invalid language'),

  body('settings.defaultWeightUnit')
    .optional()
    .isIn(['gram', 'kg', 'tola', 'ounce', 'carat'])
    .withMessage('Invalid weight unit'),

  body('settings.enableGST').optional().isBoolean(),

  body('settings.gstRates').optional().isObject(),

  body('settings.gstRates.gold')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Invalid GST rate for gold'),

  body('settings.gstRates.silver')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Invalid GST rate for silver'),
];

// ============================================================================
// UPDATE METAL RATES VALIDATION
// ============================================================================

// ============================================================================
// EXPORT ALL VALIDATIONS
// ============================================================================

export default {
  createShopValidation,
  updateShopValidation,
  getShopsValidation,
  getShopValidation,
  deleteShopValidation,
  updateShopSettingsValidation,
};
