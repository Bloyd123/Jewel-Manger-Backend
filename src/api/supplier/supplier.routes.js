import express from 'express';
import * as supplierController from './supplier.controller.js';
import {
  createSupplierValidation,
  updateSupplierValidation,
  getSupplierValidation,
  deleteSupplierValidation,
  getSuppliersValidation,
  updateRatingValidation,
  blacklistSupplierValidation,
  updateBalanceValidation,
} from './supplier.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import { checkPermission ,checkShopAccess} from '../middlewares/checkShopAccess.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Statistics & Reports Routes (must be before :id routes)
 */
router.get(
  '/stats',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
checkShopAccess,
  supplierController.getSupplierStats
);

router.get(
  '/top',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  supplierController.getTopSuppliers
);

/**
 * Main CRUD Routes
 */

// Get all suppliers
router.get(
  '/',
  getSuppliersValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
   checkShopAccess,
  supplierController.getSuppliers
);

// Create new supplier
router.post(
  '/',
  createSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkPermission('canManagePurchases'),
  supplierController.createSupplier
);

// Get single supplier by ID
router.get(
  '/:id',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
    checkShopAccess,
  supplierController.getSupplierById
);

// Update supplier
router.patch(
  '/:id',
  updateSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkPermission('canManagePurchases'),
  
  supplierController.updateSupplier
);

// Delete supplier (soft delete)
router.delete(
  '/:id',
  deleteSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission('canManagePurchases'),
  supplierController.deleteSupplier
);

/**
 * Supplier Management Routes
 */

// Restore deleted supplier
router.post(
  '/:id/restore',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission('canManagePurchases'),
  supplierController.restoreSupplier
);

// Update supplier rating
router.patch(
  '/:id/rating',
  updateRatingValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkPermission('canManagePurchases'),
  supplierController.updateRating
);

// Blacklist supplier
router.post(
  '/:id/blacklist',
  blacklistSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission('canManagePurchases'),
  supplierController.blacklistSupplier
);

// Remove from blacklist
router.post(
  '/:id/remove-blacklist',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkPermission('canManagePurchases'),
  supplierController.removeBlacklist
);

// Mark as preferred supplier
router.post(
  '/:id/preferred',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkPermission('canManagePurchases'),
  supplierController.markAsPreferred
);

// Remove from preferred list
router.delete(
  '/:id/preferred',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkPermission('canManagePurchases'),
  supplierController.removePreferred
);

// Update supplier balance
router.post(
  '/:id/balance',
  updateBalanceValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkPermission('canManagePurchases'),
  supplierController.updateBalance
);

export default router;