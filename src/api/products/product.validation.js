import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

// ============================================
// HELPER VALIDATORS
// ============================================

const isValidObjectId = value => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

const isPositiveNumber = value => {
  if (value < 0) {
    throw new Error('Value must be a positive number');
  }
  return true;
};

// ============================================
// CREATE PRODUCT VALIDATION
// ============================================
export const createProductValidation = [
  // Basic fields
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('categoryId')
    .notEmpty()
    .withMessage('Category is required')
    .custom(isValidObjectId)
    .withMessage('Invalid category ID'),

  body('subCategoryId').optional().custom(isValidObjectId).withMessage('Invalid subcategory ID'),

  body('productType')
    .optional()
    .isIn(['ready_made', 'custom_made', 'on_order', 'repair', 'exchange'])
    .withMessage('Invalid product type'),

  // Metal details
  body('metal.type')
    .notEmpty()
    .withMessage('Metal type is required')
    .isIn(['gold', 'silver', 'platinum', 'diamond', 'gemstone', 'mixed'])
    .withMessage('Invalid metal type'),

  body('metal.purity')
    .notEmpty()
    .withMessage('Metal purity is required')
    .isIn(['24K', '22K', '18K', '14K', '10K', '916', '999', '925', '850', '950', 'other'])
    .withMessage('Invalid purity'),

  body('metal.color')
    .optional()
    .isIn(['yellow', 'white', 'rose', 'mixed'])
    .withMessage('Invalid metal color'),

  // Weight details
  body('weight.grossWeight')
    .notEmpty()
    .withMessage('Gross weight is required')
    .isFloat({ min: 0.001 })
    .withMessage('Gross weight must be greater than 0')
    .custom(isPositiveNumber),

  body('weight.stoneWeight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Stone weight must be a positive number')
    .custom(isPositiveNumber),

  body('weight.unit')
    .optional()
    .isIn(['gram', 'kg', 'tola', 'ounce', 'carat'])
    .withMessage('Invalid weight unit'),

  // Making charges
  body('makingCharges.type')
    .optional()
    .isIn(['per_gram', 'percentage', 'flat', 'none'])
    .withMessage('Invalid making charges type'),

  body('makingCharges.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Making charges value must be positive')
    .custom(isPositiveNumber),

  // Pricing
  body('pricing.sellingPrice')
    .notEmpty()
    .withMessage('Selling price is required')
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number')
    .custom(isPositiveNumber),

  body('pricing.costPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost price must be positive')
    .custom(isPositiveNumber),

  body('pricing.mrp')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('MRP must be positive')
    .custom(isPositiveNumber),

  body('pricing.gst.percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('GST percentage must be between 0 and 100'),

  body('pricing.discount.type')
    .optional()
    .isIn(['percentage', 'flat', 'none'])
    .withMessage('Invalid discount type'),

  body('pricing.discount.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount value must be positive'),

  // Stock
  body('stock.quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a positive integer'),

  body('stock.reorderLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Reorder level must be a positive integer'),

  // Gender
  body('gender')
    .optional()
    .isIn(['male', 'female', 'unisex', 'kids'])
    .withMessage('Invalid gender'),

  // Stones array validation
  body('stones').optional().isArray().withMessage('Stones must be an array'),

  body('stones.*.stoneType')
    .optional()
    .isIn([
      'diamond',
      'ruby',
      'emerald',
      'sapphire',
      'pearl',
      'topaz',
      'amethyst',
      'garnet',
      'other',
    ])
    .withMessage('Invalid stone type'),

  body('stones.*.pieceCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Stone piece count must be at least 1'),

  body('stones.*.stonePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Stone price must be positive'),

  // Images
  body('images').optional().isArray().withMessage('Images must be an array'),

  body('images.*.url').optional().isURL().withMessage('Invalid image URL'),

  // Hallmarking
  body('hallmarking.isHallmarked')
    .optional()
    .isBoolean()
    .withMessage('isHallmarked must be boolean'),

  body('hallmarking.huid')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('HUID cannot exceed 50 characters'),
];

// ============================================
// UPDATE PRODUCT VALIDATION
// ============================================
export const updateProductValidation = [
  param('id').custom(isValidObjectId),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('categoryId')
    .notEmpty()
    .withMessage('Category is required')
    .custom(isValidObjectId)
    .withMessage('Invalid category ID'),

  body('subCategoryId').optional().custom(isValidObjectId).withMessage('Invalid subcategory ID'),

  body('weight.grossWeight')
    .optional()
    .isFloat({ min: 0.001 })
    .withMessage('Gross weight must be greater than 0'),

  body('pricing.sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be positive'),

  body('stock.quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a positive integer'),

  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

// ============================================
// GET PRODUCTS VALIDATION (Query params)
// ============================================
export const getProductsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sort').optional().isString().withMessage('Sort must be a string'),

  query('category') // ✅ QUERY PARAM
    .optional() // ✅ OPTIONAL FOR FILTERING
    .custom(isValidObjectId)
    .withMessage('Invalid category ID'),

  query('subCategory').optional().custom(isValidObjectId).withMessage('Invalid subcategory ID'),

  query('metalType')
    .optional()
    .isIn(['gold', 'silver', 'platinum', 'diamond', 'gemstone', 'mixed'])
    .withMessage('Invalid metal type'),

  query('purity').optional().isString().withMessage('Purity must be a string'),

  query('status')
    .optional()
    .isIn(['in_stock', 'out_of_stock', 'low_stock', 'on_order', 'discontinued', 'sold'])
    .withMessage('Invalid status'),

  query('saleStatus')
    .optional()
    .isIn(['available', 'reserved', 'sold', 'on_hold', 'returned'])
    .withMessage('Invalid sale status'),

  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be positive'),

  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be positive'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search query cannot be empty'),

  query('gender')
    .optional()
    .isIn(['male', 'female', 'unisex', 'kids'])
    .withMessage('Invalid gender'),
];

// ============================================
// GET SINGLE PRODUCT VALIDATION
// ============================================
export const getProductByIdValidation = [param('id').custom(isValidObjectId)];

// ============================================
// DELETE PRODUCT VALIDATION
// ============================================
export const deleteProductValidation = [param('id').custom(isValidObjectId)];

// ============================================
// UPDATE STOCK VALIDATION
// ============================================
export const updateStockValidation = [
  param('id').custom(isValidObjectId),

  body('operation')
    .notEmpty()
    .withMessage('Operation is required')
    .isIn(['add', 'subtract', 'set'])
    .withMessage('Operation must be add, subtract, or set'),

  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),

  body('referenceType')
    .optional()
    .isIn([
      'product_creation',
      'sale',
      'purchase',
      'return',
      'manual_adjustment',
      'transfer',
      'damage',
      'reservation',
      'stock_update',
    ])
    .withMessage('Invalid reference type'),

  body('referenceId').optional().custom(isValidObjectId),
];

// ============================================
// RESERVE PRODUCT VALIDATION
// ============================================
export const reserveProductValidation = [
  param('id').custom(isValidObjectId),

  body('customerId').notEmpty().withMessage('Customer ID is required').custom(isValidObjectId),

  body('reservationDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Reservation days must be between 1 and 365'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

// ============================================
// MARK AS SOLD VALIDATION
// ============================================
export const markAsSoldValidation = [
  param('id').custom(isValidObjectId),

  body('customerId').notEmpty().withMessage('Customer ID is required').custom(isValidObjectId),

  body('saleId').optional().custom(isValidObjectId),
];

// ============================================
// CALCULATE PRICE VALIDATION
// ============================================
export const calculatePriceValidation = [
  param('id').custom(isValidObjectId),

  body('useCurrentRate').optional().isBoolean().withMessage('useCurrentRate must be boolean'),

  body('customRate').optional().isFloat({ min: 0 }).withMessage('Custom rate must be positive'),
];

// ============================================
// SEARCH PRODUCTS VALIDATION
// ============================================
export const searchProductsValidation = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];

// ============================================
// LOW STOCK VALIDATION
// ============================================
export const getLowStockValidation = [
  query('threshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Threshold must be a positive integer'),
];

// ============================================
// BULK OPERATIONS VALIDATION
// ============================================
export const bulkDeleteValidation = [
  body('productIds')
    .notEmpty()
    .withMessage('Product IDs are required')
    .isArray({ min: 1 })
    .withMessage('Product IDs must be a non-empty array'),

  body('productIds.*').custom(isValidObjectId),
];

export const bulkUpdateStatusValidation = [
  body('productIds')
    .notEmpty()
    .withMessage('Product IDs are required')
    .isArray({ min: 1 })
    .withMessage('Product IDs must be a non-empty array'),

  body('productIds.*').custom(isValidObjectId),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['in_stock', 'out_of_stock', 'low_stock', 'on_order', 'discontinued'])
    .withMessage('Invalid status'),
];
