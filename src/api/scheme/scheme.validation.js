// FILE: src/api/scheme/scheme.validation.js
import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

const isValidObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

// ─────────────────────────────────────────────
// CREATE SCHEME
// ─────────────────────────────────────────────
export const createSchemeValidation = [
  body('schemeName')
    .trim()
    .notEmpty().withMessage('Scheme name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Scheme name must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('schemeType')
    .notEmpty().withMessage('Scheme type is required')
    .isIn(['gold_saving', 'installment', 'advance_booking', 'festival_scheme', 'custom'])
    .withMessage('Invalid scheme type'),

  // Duration
  body('duration.months')
    .notEmpty().withMessage('Duration (months) is required')
    .isInt({ min: 1 }).withMessage('Duration must be at least 1 month'),

  body('duration.weeks')
    .optional()
    .isInt({ min: 0 }).withMessage('Weeks must be 0 or more'),

  // Installments
  body('installments.totalInstallments')
    .notEmpty().withMessage('Total installments is required')
    .isInt({ min: 1 }).withMessage('Total installments must be at least 1'),

  body('installments.installmentAmount')
    .notEmpty().withMessage('Installment amount is required')
    .isFloat({ min: 1 }).withMessage('Installment amount must be greater than 0'),

  body('installments.frequency')
    .optional()
    .isIn(['weekly', 'monthly', 'custom']).withMessage('Invalid frequency'),

  body('installments.dueDay')
    .optional()
    .isInt({ min: 1, max: 31 }).withMessage('Due day must be between 1 and 31'),

  // Bonus
  body('bonus.hasBonus')
    .optional()
    .isBoolean().withMessage('hasBonus must be boolean'),

  body('bonus.bonusType')
    .if(body('bonus.hasBonus').equals(true))
    .notEmpty().withMessage('Bonus type is required when hasBonus is true')
    .isIn(['percentage', 'flat_amount', 'free_making', 'discount'])
    .withMessage('Invalid bonus type'),

  body('bonus.bonusValue')
    .if(body('bonus.hasBonus').equals(true))
    .notEmpty().withMessage('Bonus value is required when hasBonus is true')
    .isFloat({ min: 0 }).withMessage('Bonus value must be positive'),

  // Eligibility
  body('eligibility.minAge')
    .optional()
    .isInt({ min: 0, max: 120 }).withMessage('Invalid min age'),

  body('eligibility.maxAge')
    .optional()
    .isInt({ min: 0, max: 120 }).withMessage('Invalid max age'),

  body('eligibility.requiresKYC')
    .optional()
    .isBoolean().withMessage('requiresKYC must be boolean'),

  // Redemption
  body('redemption.canRedeemEarly')
    .optional()
    .isBoolean().withMessage('canRedeemEarly must be boolean'),

  body('redemption.earlyRedemptionPenalty.type')
    .optional()
    .isIn(['percentage', 'flat', 'none']).withMessage('Invalid penalty type'),

  body('redemption.earlyRedemptionPenalty.value')
    .optional()
    .isFloat({ min: 0 }).withMessage('Penalty value must be positive'),

  body('redemption.gracePeriodDays')
    .optional()
    .isInt({ min: 0 }).withMessage('Grace period must be 0 or more'),

  body('redemption.missedInstallmentPenalty')
    .optional()
    .isFloat({ min: 0 }).withMessage('Missed installment penalty must be positive'),

  // Pricing
  body('pricing.useCurrentMetalRate')
    .optional()
    .isBoolean().withMessage('useCurrentMetalRate must be boolean'),

  body('pricing.makingChargesDiscount')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Making charges discount must be between 0 and 100'),

  // Limits
  body('limits.maxEnrollments')
    .optional()
    .isInt({ min: 1 }).withMessage('Max enrollments must be at least 1'),

  body('limits.maxEnrollmentsPerCustomer')
    .optional()
    .isInt({ min: 1 }).withMessage('Max enrollments per customer must be at least 1'),

  // Validity
  body('validity.startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid start date'),

  body('validity.endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Invalid end date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.validity?.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('validity.enrollmentDeadline')
    .optional()
    .isISO8601().withMessage('Invalid enrollment deadline'),

  // Marketing
  body('marketing.isFeatured')
    .optional()
    .isBoolean().withMessage('isFeatured must be boolean'),

  body('marketing.displayOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('Display order must be 0 or more'),
];

// ─────────────────────────────────────────────
// UPDATE SCHEME
// ─────────────────────────────────────────────
export const updateSchemeValidation = [
  param('schemeId').custom(isValidObjectId).withMessage('Invalid scheme ID'),

  body('schemeName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Scheme name must be between 3 and 100 characters'),

  body('schemeCode').not().exists().withMessage('Scheme code cannot be updated'),

  body('installments.installmentAmount')
    .optional()
    .isFloat({ min: 1 }).withMessage('Installment amount must be greater than 0'),

  body('validity.endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date'),
];

// ─────────────────────────────────────────────
// STATUS UPDATE
// ─────────────────────────────────────────────
export const updateStatusValidation = [
  param('schemeId').custom(isValidObjectId).withMessage('Invalid scheme ID'),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['draft', 'active', 'paused', 'expired', 'archived'])
    .withMessage('Invalid status'),
];

// ─────────────────────────────────────────────
// REJECT SCHEME
// ─────────────────────────────────────────────
export const rejectSchemeValidation = [
  param('schemeId').custom(isValidObjectId).withMessage('Invalid scheme ID'),

  body('reason')
    .trim()
    .notEmpty().withMessage('Rejection reason is required')
    .isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters'),
];

// ─────────────────────────────────────────────
// ENROLL CUSTOMER
// ─────────────────────────────────────────────
export const enrollCustomerValidation = [
  param('schemeId').custom(isValidObjectId).withMessage('Invalid scheme ID'),

  body('customerId')
    .notEmpty().withMessage('Customer ID is required')
    .custom(isValidObjectId).withMessage('Invalid customer ID'),

  body('installmentAmount')
    .optional()
    .isFloat({ min: 1 }).withMessage('Installment amount must be greater than 0'),

  body('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date'),

  body('initialPayment.amount')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Initial payment amount must be greater than 0'),

  body('initialPayment.paymentMode')
    .optional()
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer'])
    .withMessage('Invalid payment mode'),

  body('kyc.documents')
    .optional()
    .isArray().withMessage('KYC documents must be an array'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
];

// ─────────────────────────────────────────────
// RECORD PAYMENT
// ─────────────────────────────────────────────
export const recordPaymentValidation = [
  param('enrollmentId').custom(isValidObjectId).withMessage('Invalid enrollment ID'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),

  body('paymentMode')
    .notEmpty().withMessage('Payment mode is required')
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer'])
    .withMessage('Invalid payment mode'),

  body('paymentDate')
    .optional()
    .isISO8601().withMessage('Invalid payment date'),

  body('transactionId')
    .optional()
    .isString().withMessage('Transaction ID must be a string'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

// ─────────────────────────────────────────────
// CANCEL ENROLLMENT
// ─────────────────────────────────────────────
export const cancelEnrollmentValidation = [
  param('enrollmentId').custom(isValidObjectId).withMessage('Invalid enrollment ID'),

  body('reason')
    .trim()
    .notEmpty().withMessage('Cancellation reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5 and 500 characters'),

  body('refundAmount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Refund amount must be positive'),
];

// ─────────────────────────────────────────────
// REDEEM ENROLLMENT
// ─────────────────────────────────────────────
export const redeemEnrollmentValidation = [
  param('enrollmentId').custom(isValidObjectId).withMessage('Invalid enrollment ID'),

  body('redemptionMode')
    .notEmpty().withMessage('Redemption mode is required')
    .isIn(['cash', 'jewelry']).withMessage('Redemption mode must be cash or jewelry'),

  body('linkedSaleId')
    .optional()
    .custom(isValidObjectId).withMessage('Invalid sale ID'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

// ─────────────────────────────────────────────
// ANALYTICS QUERY
// ─────────────────────────────────────────────
export const analyticsValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
];

// ─────────────────────────────────────────────
// GET SCHEMES (list filters)
// ─────────────────────────────────────────────
export const getSchemesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['draft', 'active', 'paused', 'expired', 'archived'])
    .withMessage('Invalid status'),
  query('schemeType')
    .optional()
    .isIn(['gold_saving', 'installment', 'advance_booking', 'festival_scheme', 'custom'])
    .withMessage('Invalid scheme type'),
];

// ─────────────────────────────────────────────
// BULK SEND REMINDERS
// ─────────────────────────────────────────────
export const bulkReminderValidation = [
  body('enrollmentIds')
    .isArray({ min: 1 }).withMessage('Enrollment IDs must be a non-empty array'),

  body('enrollmentIds.*')
    .custom(isValidObjectId).withMessage('Invalid enrollment ID'),

  body('method')
    .notEmpty().withMessage('Method is required')
    .isIn(['sms', 'email', 'whatsapp']).withMessage('Method must be sms, email, or whatsapp'),
];

// ─────────────────────────────────────────────
// BULK EXPORT
// ─────────────────────────────────────────────
export const bulkExportValidation = [
  body('schemeIds')
    .optional()
    .isArray().withMessage('Scheme IDs must be an array'),

  body('format')
    .notEmpty().withMessage('Export format is required')
    .isIn(['excel', 'csv']).withMessage('Format must be excel or csv'),
];

// ─────────────────────────────────────────────
// SCHEME ID PARAM
// ─────────────────────────────────────────────
export const schemeIdValidation = [
  param('schemeId').custom(isValidObjectId).withMessage('Invalid scheme ID'),
];

export const enrollmentIdValidation = [
  param('enrollmentId').custom(isValidObjectId).withMessage('Invalid enrollment ID'),
];

export const customerIdValidation = [
  param('customerId').custom(isValidObjectId).withMessage('Invalid customer ID'),
];

export default {
  createSchemeValidation,
  updateSchemeValidation,
  updateStatusValidation,
  rejectSchemeValidation,
  enrollCustomerValidation,
  recordPaymentValidation,
  cancelEnrollmentValidation,
  redeemEnrollmentValidation,
  analyticsValidation,
  getSchemesValidation,
  bulkReminderValidation,
  bulkExportValidation,
  schemeIdValidation,
  enrollmentIdValidation,
  customerIdValidation,
};