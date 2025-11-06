import { body, param, validationResult } from 'express-validator';

// ========================================
// VALIDATION HELPER
// ========================================
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// ========================================
// REGISTER VALIDATION
// ========================================
export const registerValidation = [
  body('username')
    .trim()
    .notEmpty()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .trim()
    .isEmail()
    .notEmpty()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be a valid 10-digit number'),

  body('organizationId')
    .notEmpty()
    .withMessage('Organization ID is required')
    .isMongoId()
    .withMessage('Invalid organization ID format'),

  body('role')
    .optional()
    .isIn(['super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant', 'user'])
    .withMessage('Invalid role'),

  body('department')
    .optional()
    .isIn([
      'sales',
      'purchase',
      'inventory',
      'accounts',
      'management',
      'workshop',
      'quality_check',
      'customer_service',
      'other',
    ])
    .withMessage('Invalid department'),

  validate,
];

// ========================================
// LOGIN VALIDATION
// ========================================
export const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),

  validate,
];

// ========================================
// CHANGE PASSWORD VALIDATION
// ========================================
export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'New password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  validate,
];

// ========================================
// FORGOT PASSWORD VALIDATION
// ========================================
export const forgotPasswordValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  validate,
];

// ========================================
// RESET PASSWORD VALIDATION
// ========================================
export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  validate,
];

// ========================================
// VERIFY EMAIL VALIDATION
// ========================================
export const verifyEmailValidation = [
  body('token').notEmpty().withMessage('Verification token is required'),

  validate,
];

// ========================================
// REFRESH TOKEN VALIDATION
// ========================================
export const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),

  validate,
];

// ========================================
// UPDATE PROFILE VALIDATION
// ========================================
export const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be a valid 10-digit number'),

  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),

  body('profileImage').optional().isURL().withMessage('Profile image must be a valid URL'),

  body('preferences.language')
    .optional()
    .isIn(['en', 'hi', 'mr', 'gu', 'ta', 'te'])
    .withMessage('Invalid language'),

  body('preferences.timezone').optional().isString().withMessage('Timezone must be a string'),

  body('preferences.currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP', 'AED'])
    .withMessage('Invalid currency'),

  body('preferences.dateFormat')
    .optional()
    .isIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
    .withMessage('Invalid date format'),

  body('preferences.theme').optional().isIn(['light', 'dark', 'auto']).withMessage('Invalid theme'),

  validate,
];

// ========================================
// REVOKE SESSION VALIDATION
// ========================================
export const revokeSessionValidation = [
  param('tokenId')
    .notEmpty()
    .withMessage('Token ID is required')
    .isString()
    .withMessage('Token ID must be a string'),

  validate,
];

export default {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailValidation,
  refreshTokenValidation,
  updateProfileValidation,
  revokeSessionValidation,
  validate,
};
