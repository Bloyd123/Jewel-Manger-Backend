// FILE: src/api/organization/organization.validation.js

import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// ─────────────────────────────────────────────
// CREATE ORGANIZATION
// ─────────────────────────────────────────────
export const createOrganizationValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Organization name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Organization email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Invalid 10-digit phone number'),

  body('alternatePhone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Invalid alternate phone number'),

  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.country').optional().trim(),
  body('address.pincode')
    .optional()
    .trim()
    .matches(/^[0-9]{6}$/).withMessage('Invalid pincode'),

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

  body('businessType')
    .optional()
    .isIn(['retail', 'wholesale', 'manufacturing', 'mixed', 'online'])
    .withMessage('Invalid business type'),

  body('industryType')
    .optional()
    .isIn(['jewelry', 'gold', 'silver', 'diamond', 'gemstone', 'mixed'])
    .withMessage('Invalid industry type'),

  body('subscription.plan')
    .optional()
    .isIn(['free', 'basic', 'standard', 'premium', 'enterprise'])
    .withMessage('Invalid plan'),

  body('subscription.trialEndsAt')
    .optional()
    .isISO8601().withMessage('Invalid trial end date'),
];

// ─────────────────────────────────────────────
// UPDATE ORGANIZATION
// ─────────────────────────────────────────────
export const updateOrganizationValidation = [
  param('id').custom(isValidObjectId).withMessage('Invalid organization ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Invalid phone number'),

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

  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),

  // Yeh fields directly update nahi ho sakte
  body('slug').not().exists().withMessage('Slug cannot be updated'),
  body('ownerId').not().exists().withMessage('Owner cannot be changed here'),
  body('subscription').not().exists().withMessage('Use /subscription endpoint to update subscription'),
];

// ─────────────────────────────────────────────
// UPDATE SUBSCRIPTION
// ─────────────────────────────────────────────
export const updateSubscriptionValidation = [
  param('id').custom(isValidObjectId).withMessage('Invalid organization ID'),

  body('plan')
    .optional()
    .isIn(['free', 'basic', 'standard', 'premium', 'enterprise'])
    .withMessage('Invalid plan'),

  body('status')
    .optional()
    .isIn(['trial', 'active', 'suspended', 'cancelled', 'expired', 'payment_pending'])
    .withMessage('Invalid status'),

  body('trialEndsAt')
    .optional()
    .isISO8601().withMessage('Invalid trial end date'),

  body('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date'),

  body('maxShops')
    .optional()
    .isInt({ min: 1 }).withMessage('Max shops must be at least 1'),

  body('maxUsers')
    .optional()
    .isInt({ min: 1 }).withMessage('Max users must be at least 1'),

  body('maxProducts')
    .optional()
    .isInt({ min: 0 }).withMessage('Max products must be 0 or more'),
];

// ─────────────────────────────────────────────
// GET ORGANIZATIONS (query filters)
// ─────────────────────────────────────────────
export const getOrganizationsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('search').optional().trim(),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('isVerified').optional().isBoolean().withMessage('isVerified must be boolean'),
  query('plan')
    .optional()
    .isIn(['free', 'basic', 'standard', 'premium', 'enterprise'])
    .withMessage('Invalid plan'),
  query('status')
    .optional()
    .isIn(['trial', 'active', 'suspended', 'cancelled', 'expired', 'payment_pending'])
    .withMessage('Invalid status'),
];

// ─────────────────────────────────────────────
// ONBOARD SOLO JEWELLER
// ─────────────────────────────────────────────
export const onboardSoloJewellerValidation = [
  // Organization fields
  body('organization.name')
    .trim()
    .notEmpty().withMessage('Organization name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Organization name must be 2-100 characters'),

  body('organization.email')
    .trim()
    .notEmpty().withMessage('Organization email is required')
    .isEmail().withMessage('Invalid organization email')
    .normalizeEmail(),

  body('organization.phone')
    .trim()
    .notEmpty().withMessage('Organization phone is required')
    .matches(/^[0-9]{10}$/).withMessage('Invalid organization phone number'),

  // Shop fields
  body('shop.name')
    .trim()
    .notEmpty().withMessage('Shop name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Shop name must be 2-100 characters'),

  body('shop.phone')
    .trim()
    .notEmpty().withMessage('Shop phone is required')
    .matches(/^[0-9]{10}$/).withMessage('Invalid shop phone number'),

  body('shop.address.street')
    .trim()
    .notEmpty().withMessage('Shop street address is required'),

  body('shop.address.city')
    .trim()
    .notEmpty().withMessage('Shop city is required'),

  body('shop.address.state')
    .trim()
    .notEmpty().withMessage('Shop state is required'),

  body('shop.address.pincode')
    .trim()
    .notEmpty().withMessage('Shop pincode is required')
    .matches(/^[0-9]{6}$/).withMessage('Invalid pincode'),

  // User fields
  body('user.username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, underscores'),

  body('user.email')
    .trim()
    .notEmpty().withMessage('User email is required')
    .isEmail().withMessage('Invalid user email')
    .normalizeEmail(),

  body('user.password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),

  body('user.firstName')
    .trim()
    .notEmpty().withMessage('First name is required'),

  body('user.phone')
    .trim()
    .notEmpty().withMessage('User phone is required')
    .matches(/^[0-9]{10}$/).withMessage('Invalid user phone number'),

  // Free months (optional)
  body('freeForMonths')
    .optional()
    .isInt({ min: 1, max: 60 }).withMessage('Free months must be between 1 and 60'),
];

export default {
  createOrganizationValidation,
  updateOrganizationValidation,
  updateSubscriptionValidation,
  getOrganizationsValidation,
  onboardSoloJewellerValidation,
};