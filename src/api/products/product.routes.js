import express from 'express';
import * as productController from './product.controller.js';
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

router.use(authenticate);

// POST /api/v1/shops/:shopId/products
router.post(
  '/',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canManageProducts'),
  rateLimiter({ max: 50, windowMs: 60000 }),
  createProductValidation,
  productController.createProduct
);

// GET /api/v1/shops/:shopId/products
router.get(
  '/',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant', 'user'),
  checkShopAccess,
  checkPermission('canViewInventory'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getProductsValidation,
  productController.getProducts
);

// GET /api/v1/shops/:shopId/products/search
router.get(
  '/search',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant', 'user'),
  checkShopAccess,
  checkPermission('canViewInventory'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  searchProductsValidation,
  productController.searchProducts
);

// GET /api/v1/shops/:shopId/products/low-stock
router.get(
  '/low-stock',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canViewInventory'),
  rateLimiter({ max: 30, windowMs: 60000 }),
  getLowStockValidation,
  productController.getLowStock
);

// GET /api/v1/shops/:shopId/products/analytics
router.get(
  '/analytics',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewAnalytics'),
  rateLimiter({ max: 20, windowMs: 60000 }),
  productController.getProductAnalytics
);

// GET /api/v1/shops/:shopId/products/:id
router.get(
  '/:id',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant', 'user'),
  checkShopAccess,
  checkPermission('canViewInventory'),
  rateLimiter({ max: 100, windowMs: 60000 }),
  getProductByIdValidation,
  productController.getProductById
);

// PUT /api/v1/shops/:shopId/products/:id
router.put(
  '/:id',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditInventory'),
  rateLimiter({ max: 50, windowMs: 60000 }),
  updateProductValidation,
  productController.updateProduct
);

// DELETE /api/v1/shops/:shopId/products/:id
router.delete(
  '/:id',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeleteProducts'),
  rateLimiter({ max: 10, windowMs: 60000 }),
  deleteProductValidation,
  productController.deleteProduct
);

// PATCH /api/v1/shops/:shopId/products/:id/stock
router.patch(
  '/:id/stock',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditInventory'),
  rateLimiter({ max: 50, windowMs: 60000 }),
  updateStockValidation,
  productController.updateStock
);

// GET /api/v1/shops/:shopId/products/:id/history
router.get(
  '/:id/history',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewInventory'),
  rateLimiter({ max: 30, windowMs: 60000 }),
  productController.getProductHistory
);

// PATCH /api/v1/shops/:shopId/products/:id/reserve
router.patch(
  '/:id/reserve',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkAnyPermission(['canManageSales', 'canCreateSales']),
  rateLimiter({ max: 50, windowMs: 60000 }),
  reserveProductValidation,
  productController.reserveProduct
);

// PATCH /api/v1/shops/:shopId/products/:id/cancel-reservation
router.patch(
  '/:id/cancel-reservation',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkAnyPermission(['canManageSales', 'canCreateSales']),
  rateLimiter({ max: 30, windowMs: 60000 }),
  productController.cancelReservation
);

// PATCH /api/v1/shops/:shopId/products/:id/sold
router.patch(
  '/:id/sold',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkAnyPermission(['canManageSales', 'canCreateSales']),
  rateLimiter({ max: 50, windowMs: 60000 }),
  markAsSoldValidation,
  productController.markAsSold
);

// POST /api/v1/shops/:shopId/products/:id/calculate-price
router.post(
  '/:id/calculate-price',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkAnyPermission(['canEditInventory', 'canManageMetalRates']),
  rateLimiter({ max: 30, windowMs: 60000 }),
  calculatePriceValidation,
  productController.calculatePrice
);

// POST /api/v1/shops/:shopId/products/bulk-delete
router.post(
  '/bulk-delete',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeleteProducts'),
  rateLimiter({ max: 5, windowMs: 60000 }),
  bulkDeleteValidation,
  productController.bulkDeleteProducts
);

// POST /api/v1/shops/:shopId/products/bulk-update-status
router.post(
  '/bulk-update-status',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditInventory'),
  rateLimiter({ max: 20, windowMs: 60000 }),
  bulkUpdateStatusValidation,
  productController.bulkUpdateStatus
);

export default router;