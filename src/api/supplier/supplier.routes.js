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
  addDocumentValidation,      // NEW
  addCertificationValidation, // NEW
} from './supplier.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import { checkPermission, checkShopAccess } from '../middlewares/checkShopAccess.js';
import { PERMISSIONS } from '../../config/permission.constants.js';
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
checkPermission(PERMISSIONS.VIEW_SUPPLIER_STATISTICS),
  supplierController.getSupplierStats
);

router.get(
  '/top',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_TOP_SUPPLIERS),
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
  checkPermission(PERMISSIONS.VIEW_SUPPLIERS),
  supplierController.getSuppliers
);

// Create new supplier
router.post(
  '/',
  createSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess, //   Add shop access check
  checkPermission(PERMISSIONS.CREATE_SUPPLIER), //   Correct permission

  supplierController.createSupplier
);

// Get single supplier by ID
router.get(
  '/:id',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SUPPLIERS), //   Add permission
  supplierController.getSupplierById
);

// Update supplier
router.patch(
  '/:id',
  updateSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission(PERMISSIONS.UPDATE_SUPPLIER), //   Correct permission

  supplierController.updateSupplier
);

// Delete supplier (soft delete)
router.delete(
  '/:id',
  deleteSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess, //   Add shop access check
  checkPermission(PERMISSIONS.DELETE_SUPPLIERS), //   Correct permission
  supplierController.deleteSupplier
);

/**
 * Supplier Management Routes
 */

// Restore deleted supplier
router.post(
  '/:id/restore',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess, //   Add shop access check
  checkPermission(PERMISSIONS.RESTORE_SUPPLIER), //   New permission
  supplierController.restoreSupplier
);

// Update supplier rating
router.patch(
  '/:id/rating',
  updateRatingValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess, //   Add shop access check
  checkPermission(PERMISSIONS.UPDATE_SUPPLIER_RATING), //   New permission
  supplierController.updateRating
);

// Blacklist supplier
router.post(
  '/:id/blacklist',
  blacklistSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess, //   Add shop access check
  checkPermission(PERMISSIONS.BLACKLIST_SUPPLIER), //   New permission
  supplierController.blacklistSupplier
);

// Remove from blacklist
router.post(
  '/:id/remove-blacklist',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess, //   Add shop access check
  checkPermission(PERMISSIONS.REMOVE_SUPPLIER_BLACKLIST), //   New permission
  supplierController.removeBlacklist
);

// Mark as preferred supplier
router.post(
  '/:id/preferred',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess, //   Add shop access check
  checkPermission(PERMISSIONS.MARK_PREFERRED_SUPPLIER), //   New permission
  supplierController.markAsPreferred
);

// Remove from preferred list
router.delete(
  '/:id/preferred',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess, //   Add shop access check
  checkPermission(PERMISSIONS.REMOVE_PREFERRED_SUPPLIER), //   New permission
  supplierController.removePreferred
);

// Update supplier balance
router.post(
  '/:id/balance',
  updateBalanceValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess, //   Add shop access check
  checkPermission(PERMISSIONS.UPDATE_SUPPLIER_BALANCE), //   New permission
  supplierController.updateBalance
);
// ─── ADD THESE ROUTES AT THE BOTTOM OF supplier.routes.js ──────────────────

// Documents
router.post(
  '/:id/documents',
  addDocumentValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canUpdateSupplier'),
  supplierController.addDocument
);

router.delete(
  '/:id/documents/:documentId',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canUpdateSupplier'),
  supplierController.deleteDocument
);

// Certifications
router.post(
  '/:id/certifications',
  addCertificationValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canUpdateSupplier'),
  supplierController.addCertification
);

router.delete(
  '/:id/certifications/:certificationId',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canUpdateSupplier'),
  supplierController.deleteCertification
);

// Activity
router.get(
  '/:id/activity',
  getSupplierValidation,
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission(PERMISSIONS.VIEW_SUPPLIERS),
  supplierController.getSupplierActivity
);


export default router;
