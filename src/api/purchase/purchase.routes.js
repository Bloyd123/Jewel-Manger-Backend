// FILE: src/api/routes/purchase.routes.js
import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import { checkShopAccess, checkPermission } from '../middlewares/checkShopAccess.js';
import {
  createUpdateRateLimiter,
  deleteRateLimiter,
  apiRateLimiter,
} from '../middlewares/rateLimiter.js';
import * as purchaseController from './purchase.controller.js';
import * as purchaseValidation from './purchase.validation.js';

const router = express.Router({ mergeParams: true });


router.use(authenticate);

//  GET /api/v1/shops/:shopId/purchases/analytics

router.get(
  '/analytics',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewAnalytics'),
  apiRateLimiter,
  purchaseValidation.analyticsValidation, // optional dates
  purchaseController.getPurchaseAnalytics
);
  // GET /api/v1/shops/:shopId/purchases/pending

router.get(
  '/pending',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseController.getPendingPurchases
);

  // GET /api/v1/shops/:shopId/purchases/unpaid

router.get(
  '/unpaid',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'accountant'),
  checkShopAccess,
  checkPermission('canViewFinancials'),
  apiRateLimiter,
  purchaseController.getUnpaidPurchases
);


//  GET /api/v1/shops/:shopId/purchases/supplier/:supplierId

router.get(
  '/supplier/:supplierId',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.supplierId,
  purchaseController.getPurchasesBySupplier
);



  // POST /api/v1/shops/:shopId/purchases/bulk-delete

router.post(
  '/bulk-delete',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeletePurchases'),
  deleteRateLimiter,
  purchaseValidation.bulkDelete,
  purchaseController.bulkDeletePurchases
);

  // POST /api/v1/shops/:shopId/purchases/bulk-approve

router.post(
  '/bulk-approve',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canApprovePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.bulkApprove,
  purchaseController.bulkApprovePurchases
);


/**
  GET /api/v1/shops/:shopId/purchases/search

 */
router.get(
  '/search',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.searchPurchases,
  purchaseController.searchPurchases
);

  // GET /api/v1/shops/:shopId/purchases/by-date-range

router.get(
  '/by-date-range',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.dateRange,
  purchaseController.getPurchasesByDateRange
);


  // POST /api/v1/shops/:shopId/purchases

router.post(
  '/',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canCreatePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.createPurchase,
  purchaseController.createPurchase
);

//  GET /api/v1/shops/:shopId/purchases

router.get(
  '/',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.getPurchases,
  purchaseController.getAllPurchases
);
  //  GET /api/v1/shops/:shopId/purchases/:purchaseId

router.get(
  '/:purchaseId',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.purchaseId,
  purchaseController.getPurchaseById
);

  // PUT /api/v1/shops/:shopId/purchases/:purchaseId

router.put(
  '/:purchaseId',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditPurchases'),
  createUpdateRateLimiter,
  purchaseValidation.updatePurchase,
  purchaseController.updatePurchase
);

  // DELETE /api/v1/shops/:shopId/purchases/:purchaseId

router.delete(
  '/:purchaseId',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeletePurchases'),
  deleteRateLimiter,
  purchaseValidation.purchaseId,
  purchaseController.deletePurchase
);
  // PATCH /api/v1/shops/:shopId/purchases/:purchaseId/status

router.patch(
  '/:purchaseId/status',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditPurchases'),
  createUpdateRateLimiter,
  purchaseValidation.updateStatus,
  purchaseController.updatePurchaseStatus
);

  // PATCH /api/v1/shops/:shopId/purchases/:purchaseId/receive

router.patch(
  '/:purchaseId/receive',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditPurchases'),
  createUpdateRateLimiter,
  purchaseValidation.receivePurchase,
  purchaseController.receivePurchase
);

  // PATCH /api/v1/shops/:shopId/purchases/:purchaseId/cancel

router.patch(
  '/:purchaseId/cancel',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeletePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.cancelPurchase,
  purchaseController.cancelPurchase
);

// PATCH /api/v1/shops/:shopId/purchases/:purchaseId/return

router.patch(
  '/:purchaseId/return',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeletePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.returnPurchase, 
  purchaseController.returnPurchase  
);

  // POST /api/v1/shops/:shopId/purchases/:purchaseId/approve

router.post(
  '/:purchaseId/approve',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canApprovePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.approvePurchase,
  purchaseController.approvePurchase
);

  // POST /api/v1/shops/:shopId/purchases/:purchaseId/reject

router.post(
  '/:purchaseId/reject',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canApprovePurchases'),
  createUpdateRateLimiter,
  purchaseValidation.rejectPurchase,
  purchaseController.rejectPurchase
);

//  POST /api/v1/shops/:shopId/purchases/:purchaseId/payments

router.post(
  '/:purchaseId/payments',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canMakePayments'),
  createUpdateRateLimiter,
  purchaseValidation.addPayment,
  purchaseController.addPayment
);

  // GET /api/v1/shops/:shopId/purchases/:purchaseId/payments

router.get(
  '/:purchaseId/payments',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.purchaseId,
  purchaseController.getPayments
);


// POST /api/v1/shops/:shopId/purchases/:purchaseId/documents

router.post(
  '/:purchaseId/documents',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditPurchases'),
  createUpdateRateLimiter,
  purchaseValidation.uploadDocument,
  purchaseController.uploadDocument
);

  // GET /api/v1/shops/:shopId/purchases/:purchaseId/documents

router.get(
  '/:purchaseId/documents',
  checkShopAccess,
  checkPermission('canViewPurchases'),
  apiRateLimiter,
  purchaseValidation.purchaseId,
  purchaseController.getDocuments
);

export default router;