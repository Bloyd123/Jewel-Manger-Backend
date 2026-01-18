// FILE: src/api/validations/order.validation.js
// Order Module Validation Rules

import { body, param, query } from 'express-validator';

/**
 * Validation for creating a new order
 */
export const createOrderValidation = [
  body('customerId')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isMongoId()
    .withMessage('Invalid customer ID'),

  body('orderType')
    .notEmpty()
    .withMessage('Order type is required')
    .isIn([
      'custom_order',
      'repair',
      'alteration',
      'engraving',
      'polishing',
      'stone_setting',
      'resizing',
      'certification',
    ])
    .withMessage('Invalid order type'),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.itemType')
    .notEmpty()
    .withMessage('Item type is required')
    .isIn(['new_product', 'existing_product', 'service'])
    .withMessage('Invalid item type'),

  body('items.*.productName')
    .notEmpty()
    .withMessage('Product name is required')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),

  body('items.*.metalType')
    .notEmpty()
    .withMessage('Metal type is required')
    .isIn(['gold', 'silver', 'platinum', 'diamond', 'mixed'])
    .withMessage('Invalid metal type'),

  body('items.*.estimatedWeight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated weight must be a positive number'),

  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('timeline.estimatedCompletionDate')
    .notEmpty()
    .withMessage('Estimated completion date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new ValidationError('Estimated completion date must be in the future');
      }
      return true;
    }),

  body('financials.estimatedTotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated total must be a positive number'),

  body('financials.advancePaid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Advance paid must be a positive number'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

/**
 * Validation for updating an order
 */
export const updateOrderValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  body('timeline.estimatedCompletionDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

/**
 * Validation for order ID parameter
 */
export const orderIdValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),
];

/**
 * Validation for updating order status
 */
export const updateStatusValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn([
      'draft',
      'confirmed',
      'in_progress',
      'on_hold',
      'quality_check',
      'ready',
      'delivered',
      'completed',
      'cancelled',
    ])
    .withMessage('Invalid status'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

/**
 * Validation for assigning order
 */
export const assignOrderValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('assignedTo')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),

  body('workstation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Workstation name cannot exceed 100 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

/**
 * Validation for adding payment to order
 */
export const addPaymentValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),

  body('paymentMode')
    .notEmpty()
    .withMessage('Payment mode is required')
    .isIn(['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'wallet', 'other'])
    .withMessage('Invalid payment mode'),

  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid payment date format'),

  body('transactionId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Transaction ID cannot exceed 100 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

/**
 * Validation for adding progress update
 */
export const addProgressValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('description')
    .notEmpty()
    .withMessage('Progress description is required')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Description must be between 5 and 1000 characters'),

  body('completionPercentage')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Completion percentage must be between 0 and 100'),

  body('photos')
    .optional()
    .isArray()
    .withMessage('Photos must be an array'),
];

/**
 * Validation for quality check
 */
export const qualityCheckValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('status')
    .notEmpty()
    .withMessage('Quality check status is required')
    .isIn(['passed', 'failed', 'not_required'])
    .withMessage('Invalid quality check status'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks cannot exceed 1000 characters'),

  body('issues')
    .optional()
    .isArray()
    .withMessage('Issues must be an array'),
];

/**
 * Validation for delivery
 */
export const deliveryValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('deliveryType')
    .notEmpty()
    .withMessage('Delivery type is required')
    .isIn(['pickup', 'home_delivery', 'courier'])
    .withMessage('Invalid delivery type'),

  body('deliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid delivery date format'),

  body('deliveredTo')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Delivered to cannot exceed 200 characters'),
];

/**
 * Validation for cancellation
 */
export const cancelOrderValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('reason')
    .notEmpty()
    .withMessage('Cancellation reason is required')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),

  body('refundAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Refund amount must be a positive number'),
];

/**
 * Validation for query parameters
 */
export const listOrdersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn([
      'draft',
      'confirmed',
      'in_progress',
      'on_hold',
      'quality_check',
      'ready',
      'delivered',
      'completed',
      'cancelled',
    ])
    .withMessage('Invalid status'),

  query('orderType')
    .optional()
    .isIn([
      'custom_order',
      'repair',
      'alteration',
      'engraving',
      'polishing',
      'stone_setting',
      'resizing',
      'certification',
    ])
    .withMessage('Invalid order type'),

  query('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  query('customerId')
    .optional()
    .isMongoId()
    .withMessage('Invalid customer ID'),

  query('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  query('overdue')
    .optional()
    .isBoolean()
    .withMessage('Overdue must be a boolean'),

  query('dueSoon')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Due soon must be a positive integer (days)'),
];

/**
 * Validation for feedback
 */
export const addFeedbackValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('review')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review cannot exceed 1000 characters'),
];

/**
 * Validation for hold order
 */
export const holdOrderValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),

  body('expectedResumeDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expected resume date format'),
];

/**
 * Validation for bulk operations
 */
export const bulkStatusUpdateValidation = [
  body('orderIds')
    .isArray({ min: 1 })
    .withMessage('Order IDs array is required'),

  body('orderIds.*')
    .isMongoId()
    .withMessage('Invalid order ID in array'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn([
      'confirmed',
      'in_progress',
      'on_hold',
      'quality_check',
      'ready',
      'delivered',
      'completed',
      'cancelled',
    ])
    .withMessage('Invalid status'),
];

export const bulkAssignValidation = [
  body('orderIds')
    .isArray({ min: 1 })
    .withMessage('Order IDs array is required'),

  body('orderIds.*')
    .isMongoId()
    .withMessage('Invalid order ID in array'),

  body('assignedTo')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

/**
 * Validation for approval
 */
export const approveOrderValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

export const rejectOrderValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('reason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
];

/**
 * Validation for documents
 */
export const uploadDocumentValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('documentType')
    .notEmpty()
    .withMessage('Document type is required')
    .isIn(['estimate', 'receipt', 'delivery_note', 'design', 'certificate', 'photo', 'other'])
    .withMessage('Invalid document type'),

  body('documentUrl')
    .notEmpty()
    .withMessage('Document URL is required')
    .isURL()
    .withMessage('Invalid document URL'),

  body('documentNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Document number cannot exceed 100 characters'),
];

export const deleteDocumentValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  param('documentId')
    .notEmpty()
    .withMessage('Document ID is required')
    .isMongoId()
    .withMessage('Invalid document ID'),
];

/**
 * Validation for reminders
 */
export const sendReminderValidation = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),

  body('method')
    .notEmpty()
    .withMessage('Reminder method is required')
    .isIn(['sms', 'email', 'whatsapp'])
    .withMessage('Invalid reminder method'),

  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters'),
];

export default {
  createOrderValidation,
  updateOrderValidation,
  orderIdValidation,
  updateStatusValidation,
  assignOrderValidation,
  addPaymentValidation,
  addProgressValidation,
  qualityCheckValidation,
  deliveryValidation,
  cancelOrderValidation,
  listOrdersValidation,
  addFeedbackValidation,
  holdOrderValidation,
  bulkStatusUpdateValidation,
  bulkAssignValidation,
  approveOrderValidation,
  rejectOrderValidation,
  uploadDocumentValidation,
  deleteDocumentValidation,
  sendReminderValidation,
};