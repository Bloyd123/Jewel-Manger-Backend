import express from 'express';
import productController from './product.controller.js';
import {
  createProductValidation,
  updateProductValidation,
  getProductsValidation,
  getProductByIdValidation,
  deleteProductValidation,
  updateStockValidation,
  reserveProductValidation,
  markAsSoldValidation,
  calculatePriceValidation,
  searchProductsValidation,
  getLowStockValidation,
  bulkDeleteValidation,
  bulkUpdateStatusValidation,
} from './product.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';

import {
  checkShopAccess,
  checkPermission,
  checkAnyPermission,
} from '../middlewares/checkShopAccess.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// ALL ROUTES REQUIRE AUTHENTICATION

router.use(authenticate);

// PRODUCT CRUD ROUTES

/**
 * @route   POST /api/v1/shops/:shopId/products
 * @desc    Create a new product
 * @access  Private (shop_admin, manager)
 * @permission canManageProducts
 */
router.post(
  '/:shopId/products',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canManageProducts'),
  rateLimiter({ max: 100, windowMs: 15 * 60 * 1000 }), // 100 requests per 15 minutes
  createProductValidation,
  productController.createProduct
);

/**
 * @route   GET /api/v1/shops/:shopId/products
 * @desc    Get all products for a shop (with filters, search, pagination)
 * @access  Private (all authenticated users)
 * @permission canViewInventory
 */
router.get(
  '/:shopId/products',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant', 'user'),
  checkShopAccess,
  checkPermission('canViewInventory'),
  getProductsValidation,
  productController.getProducts
);

/**
 * @route   GET /api/v1/shops/:shopId/products/search
 * @desc    Quick search products (for POS)
 * @access  Private (all authenticated users)
 * @permission canViewInventory
 */
router.get(
  '/:shopId/products/search',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant', 'user'),
  checkShopAccess,
  checkPermission('canViewInventory'),
  searchProductsValidation,
  productController.searchProducts
);

/**
 * @route   GET /api/v1/shops/:shopId/products/low-stock
 * @desc    Get low stock products
 * @access  Private (shop_admin, manager)
 * @permission canViewInventory
 */
router.get(
  '/:shopId/products/low-stock',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canViewInventory'),
  getLowStockValidation,
  productController.getLowStock
);

/**
 * @route   GET /api/v1/shops/:shopId/products/analytics
 * @desc    Get product analytics
 * @access  Private (shop_admin, manager)
 * @permission canViewAnalytics
 */
router.get(
  '/:shopId/products/analytics',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewAnalytics'),
  productController.getProductAnalytics
);

/**
 * @route   GET /api/v1/shops/:shopId/products/:id
 * @desc    Get single product by ID
 * @access  Private (all authenticated users)
 * @permission canViewInventory
 */
router.get(
  '/:shopId/products/:id',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant', 'user'),
  checkShopAccess,
  checkPermission('canViewInventory'),
  getProductByIdValidation,
  productController.getProductById
);

/**
 * @route   PUT /api/v1/shops/:shopId/products/:id
 * @desc    Update product
 * @access  Private (shop_admin, manager)
 * @permission canEditInventory
 */
router.put(
  '/:shopId/products/:id',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditInventory'),
  updateProductValidation,
  productController.updateProduct
);

/**
 * @route   DELETE /api/v1/shops/:shopId/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private (shop_admin, manager with canDeleteProducts)
 * @permission canDeleteProducts
 */
router.delete(
  '/:shopId/products/:id',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeleteProducts'),
  deleteProductValidation,
  productController.deleteProduct
);

// STOCK MANAGEMENT ROUTES

/**
 * @route   PATCH /api/v1/shops/:shopId/products/:id/stock
 * @desc    Update product stock (add, subtract, set)
 * @access  Private (shop_admin, manager)
 * @permission canEditInventory
 */
router.patch(
  '/:shopId/products/:id/stock',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditInventory'),
  updateStockValidation,
  productController.updateStock
);

/**
 * @route   GET /api/v1/shops/:shopId/products/:id/history
 * @desc    Get product inventory transaction history
 * @access  Private (shop_admin, manager)
 * @permission canViewInventory
 */
router.get(
  '/:shopId/products/:id/history',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewInventory'),
  productController.getProductHistory
);

// PRODUCT STATUS ROUTES

/**
 * @route   PATCH /api/v1/shops/:shopId/products/:id/reserve
 * @desc    Reserve product for customer
 * @access  Private (shop_admin, manager, staff)
 * @permission canManageSales OR canCreateSales
 */
router.patch(
  '/:shopId/products/:id/reserve',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkAnyPermission(['canManageSales', 'canCreateSales']),
  reserveProductValidation,
  productController.reserveProduct
);

/**
 * @route   PATCH /api/v1/shops/:shopId/products/:id/cancel-reservation
 * @desc    Cancel product reservation
 * @access  Private (shop_admin, manager, staff)
 * @permission canManageSales OR canCreateSales
 */
router.patch(
  '/:shopId/products/:id/cancel-reservation',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkAnyPermission(['canManageSales', 'canCreateSales']),
  productController.cancelReservation
);

/**
 * @route   PATCH /api/v1/shops/:shopId/products/:id/sold
 * @desc    Mark product as sold
 * @access  Private (shop_admin, manager, staff)
 * @permission canManageSales OR canCreateSales
 */
router.patch(
  '/:shopId/products/:id/sold',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkAnyPermission(['canManageSales', 'canCreateSales']),
  markAsSoldValidation,
  productController.markAsSold
);

// PRICING ROUTES

/**
 * @route   POST /api/v1/shops/:shopId/products/:id/calculate-price
 * @desc    Recalculate product price based on current/custom metal rates
 * @access  Private (shop_admin, manager)
 * @permission canEditInventory OR canManageMetalRates
 */
router.post(
  '/:shopId/products/:id/calculate-price',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkAnyPermission(['canEditInventory', 'canManageMetalRates']),
  calculatePriceValidation,
  productController.calculatePrice
);

// BULK OPERATIONS ROUTES

/**
 * @route   POST /api/v1/shops/:shopId/products/bulk-delete
 * @desc    Bulk delete products
 * @access  Private (shop_admin only)
 * @permission canDeleteProducts
 */
router.post(
  '/:shopId/products/bulk-delete',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeleteProducts'),
  bulkDeleteValidation,
  productController.bulkDeleteProducts
);

/**
 * @route   POST /api/v1/shops/:shopId/products/bulk-update-status
 * @desc    Bulk update product status
 * @access  Private (shop_admin, manager)
 * @permission canEditInventory
 */
router.post(
  '/:shopId/products/bulk-update-status',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditInventory'),
  bulkUpdateStatusValidation,
  productController.bulkUpdateStatus
);

export default router;
