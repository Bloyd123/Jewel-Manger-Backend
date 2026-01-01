// ============================================================================
// FILE: src/api/customer/customer.validation.js
// Customer Validation Rules
// ============================================================================

import { body, param, query } from 'express-validator';

/**
 * Validation for creating a new customer
 */
export const createCustomerValidation = [
  // Basic Information
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('Last name can only contain letters'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[6-9][0-9]{9}$/)
    .withMessage('Invalid Indian phone number (must start with 6-9 and be 10 digits)'),

  body('alternatePhone')
    .optional()
    .trim()
    .matches(/^[6-9][0-9]{9}$/)
    .withMessage('Invalid alternate phone number'),

  body('whatsappNumber')
    .optional()
    .trim()
    .matches(/^[6-9][0-9]{9}$/)
    .withMessage('Invalid WhatsApp number'),

  body('email')
    .optional()
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),

  // Personal Details
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date of birth')
    .custom(value => {
      const dob = new Date(value);
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear();
      if (age < 18 || age > 120) {
        throw new Error('Customer must be between 18 and 120 years old');
      }
      return true;
    }),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),

  body('anniversaryDate').optional().isISO8601().withMessage('Invalid anniversary date'),

  // Address
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),

  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City name cannot exceed 50 characters'),

  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State name cannot exceed 50 characters'),

  body('address.pincode')
    .optional()
    .trim()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Invalid pincode (must be 6 digits)'),

  // KYC Details
  body('aadharNumber')
    .optional()
    .trim()
    .matches(/^[2-9][0-9]{11}$/)
    .withMessage('Invalid Aadhar number (must be 12 digits)')
    .custom(value => {
      // Remove spaces if any
      const cleaned = value.replace(/\s/g, '');
      if (cleaned.length !== 12) {
        throw new Error('Aadhar must be exactly 12 digits');
      }
      return true;
    }),

  body('panNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN format (e.g., ABCDE1234F)'),

  body('gstNumber')
    .optional()
    .trim()
    .toUpperCase()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GST number format'),

  // Customer Type
  body('customerType')
    .optional()
    .isIn(['retail', 'wholesale', 'vip', 'regular'])
    .withMessage('Invalid customer type'),

  body('customerCategory')
    .optional()
    .isIn(['gold', 'silver', 'diamond', 'platinum', 'mixed'])
    .withMessage('Invalid customer category'),

  // Financial
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),

  // Preferences
  body('preferences.preferredMetal')
    .optional()
    .isIn(['gold', 'silver', 'platinum', 'diamond'])
    .withMessage('Invalid preferred metal'),

  body('preferences.communicationPreference')
    .optional()
    .isIn(['email', 'sms', 'whatsapp', 'call', 'none'])
    .withMessage('Invalid communication preference'),

  // Source
  body('source')
    .optional()
    .isIn(['walk_in', 'referral', 'online', 'phone', 'social_media', 'advertisement', 'other'])
    .withMessage('Invalid customer source'),

  body('referredBy').optional().isMongoId().withMessage('Invalid referral customer ID'),

  // Notes
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  body('tags').optional().isArray().withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
];

/**
 * Validation for updating customer
 */
export const updateCustomerValidation = [
  param('customerId').isMongoId().withMessage('Invalid customer ID'),

  // Same as create but all optional
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9][0-9]{9}$/)
    .withMessage('Invalid phone number'),

  body('email').optional().trim().isEmail().withMessage('Invalid email address'),

  body('customerType')
    .optional()
    .isIn(['retail', 'wholesale', 'vip', 'regular'])
    .withMessage('Invalid customer type'),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),

  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),

  // Prevent updating these fields
  body('customerCode').not().exists().withMessage('Customer code cannot be updated'),

  body('totalPurchases').not().exists().withMessage('Total purchases cannot be updated directly'),

  body('loyaltyPoints').not().exists().withMessage('Loyalty points cannot be updated directly'),
];

/**
 * Validation for customer ID parameter
 */
export const customerIdValidation = [
  param('customerId').isMongoId().withMessage('Invalid customer ID'),
];

/**
 * Validation for shop ID parameter
 */
export const shopIdValidation = [param('shopId').isMongoId().withMessage('Invalid shop ID')];

/**
 * Validation for search query
 */
export const searchCustomerValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  query('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be 10 digits'),

  query('email').optional().trim().isEmail().withMessage('Invalid email format'),

  query('customerCode').optional().trim().toUpperCase(),
];

/**
 * Validation for customer listing with filters
 */
export const getCustomersValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),

  query('customerType')
    .optional()
    .isIn(['retail', 'wholesale', 'vip', 'regular'])
    .withMessage('Invalid customer type'),

  query('membershipTier')
    .optional()
    .isIn(['standard', 'silver', 'gold', 'platinum'])
    .withMessage('Invalid membership tier'),

  query('isActive').optional().isBoolean().withMessage('isActive must be true or false'),

  query('hasBalance').optional().isBoolean().withMessage('hasBalance must be true or false'),

  query('startDate').optional().isISO8601().withMessage('Invalid start date'),

  query('endDate').optional().isISO8601().withMessage('Invalid end date'),

  query('sort')
    .optional()
    .trim()
    .matches(/^-?(firstName|lastName|phone|customerCode|totalPurchases|createdAt|loyaltyPoints)$/)
    .withMessage('Invalid sort field'),
];

/**
 * Validation for blacklist/unblacklist
 */
export const blacklistCustomerValidation = [
  param('customerId').isMongoId().withMessage('Invalid customer ID'),

  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Blacklist reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
];

/**
 * Validation for loyalty points operations
 */
export const loyaltyPointsValidation = [
  param('customerId').isMongoId().withMessage('Invalid customer ID'),

  body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters'),
];

/**
 * Validation for bulk import
 */
export const bulkImportValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  body('customers')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Customers must be an array with 1-1000 items'),

  body('customers.*.firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required for each customer'),

  body('customers.*.phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required for each customer')
    .matches(/^[6-9][0-9]{9}$/)
    .withMessage('Invalid phone number'),
];

/**
 * Validation for bulk update
 */
export const bulkUpdateValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  body('customerIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Customer IDs must be an array with 1-100 items'),

  body('customerIds.*').isMongoId().withMessage('Invalid customer ID in array'),

  body('updateData').isObject().withMessage('Update data must be an object'),

  body('updateData.customerCode').not().exists().withMessage('Cannot bulk update customer codes'),

  body('updateData.phone').not().exists().withMessage('Cannot bulk update phone numbers'),
];

/**
 * Validation for export
 */
export const exportCustomersValidation = [
  param('shopId').isMongoId().withMessage('Invalid shop ID'),

  query('format')
    .optional()
    .isIn(['csv', 'excel', 'pdf'])
    .withMessage('Format must be csv, excel, or pdf'),

  query('fields').optional().isString().withMessage('Fields must be a comma-separated string'),
];

export default {
  createCustomerValidation,
  updateCustomerValidation,
  customerIdValidation,
  shopIdValidation,
  searchCustomerValidation,
  getCustomersValidation,
  blacklistCustomerValidation,
  loyaltyPointsValidation,
  bulkImportValidation,
  bulkUpdateValidation,
  exportCustomersValidation,
};
