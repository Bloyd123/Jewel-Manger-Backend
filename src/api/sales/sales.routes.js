// FILE: src/api/sales/sales.routes.js
import express from 'express';
import * as saleController from './sales.controller.js';
import * as saleValidation from './sales.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import {
  checkShopAccess,
  checkPermission,
  checkAnyPermission,
} from '../middlewares/checkShopAccess.js';
import {
  apiRateLimiter,
  createUpdateRateLimiter,
  deleteRateLimiter,
} from '../middlewares/rateLimiter.js';

const router = express.Router({ mergeParams: true });
router.use(authenticate);

  // GET /api/v1/shops/:shopId/sales/analytics

router.get(
  '/analytics',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewAnalytics'),
  apiRateLimiter,
  saleValidation.getAnalytics,
  saleController.getSalesAnalytics
);

//  GET /api/v1/shops/:shopId/sales/dashboard

router.get(
  '/dashboard',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewDashboard'),
  apiRateLimiter,
  saleController.getSalesDashboard
);

//  GET /api/v1/shops/:shopId/sales/today

router.get(
  '/today',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleController.getTodaySales
);

//  GET /api/v1/shops/:shopId/sales/pending

router.get(
  '/pending',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleController.getPendingSales
);

//  GET /api/v1/shops/:shopId/sales/unpaid

router.get(
  '/unpaid',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'accountant'),
  checkShopAccess,
  checkPermission('canViewFinancials'),
  apiRateLimiter,
  saleController.getUnpaidSales
);

//  GET /api/v1/shops/:shopId/sales/overdue

router.get(
  '/overdue',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'accountant'),
  checkShopAccess,
  checkPermission('canViewFinancials'),
  apiRateLimiter,
  saleController.getOverdueSales
);
//  GET /api/v1/shops/:shopId/sales/search

router.get(
  '/search',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleValidation.searchSales,
  saleController.searchSales
);

  // GET /api/v1/shops/:shopId/sales/by-date-range

router.get(
  '/by-date-range',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleValidation.dateRange,
  saleController.getSalesByDateRange
);

  // GET /api/v1/shops/:shopId/sales/by-amount-range

router.get(
  '/by-amount-range',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleValidation.amountRange,
  saleController.getSalesByAmountRange
);

//  GET /api/v1/shops/:shopId/sales/customer/:customerId

router.get(
  '/customer/:customerId',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleController.getCustomerSales
);

  // GET /api/v1/shops/:shopId/sales/customer/:customerId/summary

router.get(
  '/customer/:customerId/summary',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleController.getCustomerSalesSummary
);

  // GET /api/v1/shops/:shopId/sales/sales-person/:userId

router.get(
  '/sales-person/:userId',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleController.getSalesPersonSales
);

//  GET /api/v1/shops/:shopId/sales/sales-person/:userId/performance

router.get(
  '/sales-person/:userId/performance',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'accountant'),
  checkShopAccess,
  checkPermission('canViewAnalytics'),
  apiRateLimiter,
  saleController.getSalesPersonPerformance
);
  //  POST /api/v1/shops/:shopId/sales/bulk-delete

router.post(
  '/bulk-delete',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeleteSales'),
  deleteRateLimiter,
  saleValidation.bulkDelete,
  saleController.bulkDeleteSales
);

// POST /api/v1/shops/:shopId/sales/bulk-print

router.post(
  '/bulk-print',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleValidation.bulkPrint,
  saleController.bulkPrintInvoices
);
//  POST /api/v1/shops/:shopId/sales/bulk-send-reminders

router.post(
  '/bulk-send-reminders',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canManageSales'),
  createUpdateRateLimiter,
  saleValidation.bulkReminders,
  saleController.bulkSendReminders
);

//  POST /api/v1/shops/:shopId/sales

router.post(
  '/',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkPermission('canCreateSales'),
  createUpdateRateLimiter,
  saleValidation.createSale,
  saleController.createSale
);

  // GET /api/v1/shops/:shopId/sales
router.get(
  '/',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleValidation.getSales,
  saleController.getAllSales
);

  // GET /api/v1/shops/:shopId/sales/:saleId

router.get(
  '/:saleId',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleValidation.getSale,
  saleController.getSale
);

//  PUT /api/v1/shops/:shopId/sales/:saleId

router.put(
  '/:saleId',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditSales'),
  createUpdateRateLimiter,
  saleValidation.updateSale,
  saleController.updateSale
);

// DELETE /api/v1/shops/:shopId/sales/:saleId

router.delete(
  '/:saleId',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canDeleteSales'),
  deleteRateLimiter,
  saleValidation.deleteSale,
  saleController.deleteSale
);



// PATCH /api/v1/shops/:shopId/sales/:saleId/status

router.patch(
  '/:saleId/status',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditSales'),
  createUpdateRateLimiter,
  saleValidation.updateStatus,
  saleController.updateSaleStatus
);

  // PATCH /api/v1/shops/:shopId/sales/:saleId/confirm

router.patch(
  '/:saleId/confirm',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkPermission('canEditSales'),
  createUpdateRateLimiter,
  saleValidation.confirmSale,
  saleController.confirmSale
);

// PATCH /api/v1/shops/:shopId/sales/:saleId/deliver

router.patch(
  '/:saleId/deliver',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff'),
  checkShopAccess,
  checkPermission('canEditSales'),
  createUpdateRateLimiter,
  saleValidation.deliverSale,
  saleController.deliverSale
);

// PATCH /api/v1/shops/:shopId/sales/:saleId/complete

router.patch(
  '/:saleId/complete',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditSales'),
  createUpdateRateLimiter,
  saleValidation.completeSale,
  saleController.completeSale
);

  // PATCH /api/v1/shops/:shopId/sales/:saleId/cancel

router.patch(
  '/:saleId/cancel',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canCancelInvoices'),
  createUpdateRateLimiter,
  saleValidation.cancelSale,
  saleController.cancelSale
);

//  POST /api/v1/shops/:shopId/sales/:saleId/payments
router.post(
  '/:saleId/payments',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canReceivePayments'),
  createUpdateRateLimiter,
  saleValidation.addPayment,
  saleController.addPayment
);

  // GET /api/v1/shops/:shopId/sales/:saleId/payments

router.get(
  '/:saleId/payments',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleController.getSalePayments
);

//  GET /api/v1/shops/:shopId/sales/:saleId/receipt

router.get(
  '/:saleId/receipt',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleController.generateReceipt
);


//  POST /api/v1/shops/:shopId/sales/:saleId/return

router.post(
  '/:saleId/return',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canManageSales'),
  createUpdateRateLimiter,
  saleValidation.returnSale,
  saleController.returnSale
);

//  GET /api/v1/shops/:shopId/sales/:saleId/return-details

router.get(
  '/:saleId/return-details',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleController.getReturnDetails
);


//  POST /api/v1/shops/:shopId/sales/:saleId/old-gold

router.post(
  '/:saleId/old-gold',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canManageOldGold'),
  createUpdateRateLimiter,
  saleValidation.addOldGold,
  saleController.addOldGold
);

// DELETE /api/v1/shops/:shopId/sales/:saleId/old-gold

router.delete(
  '/:saleId/old-gold',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canManageOldGold'),
  createUpdateRateLimiter,
  saleController.removeOldGold
);


  // GET /api/v1/shops/:shopId/sales/:saleId/invoice

router.get(
  '/:saleId/invoice',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleController.generateInvoice
);

//  POST /api/v1/shops/:shopId/sales/:saleId/invoice/send

router.post(
  '/:saleId/invoice/send',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canGenerateInvoices'),
  createUpdateRateLimiter,
  saleValidation.sendInvoice,
  saleController.sendInvoice
);
  // POST /api/v1/shops/:shopId/sales/:saleId/invoice/print

router.post(
  '/:saleId/invoice/print',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  createUpdateRateLimiter,
  saleValidation.printInvoice,
  saleController.printInvoice
);

  // POST /api/v1/shops/:shopId/sales/:saleId/apply-discount
router.post(
  '/:saleId/apply-discount',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canApplyDiscounts'),
  createUpdateRateLimiter,
  saleValidation.applyDiscount,
  saleController.applyDiscount
);

// DELETE /api/v1/shops/:shopId/sales/:saleId/remove-discount

router.delete(
  '/:saleId/remove-discount',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canApplyDiscounts'),
  createUpdateRateLimiter,
  saleController.removeDiscount
);

//  POST /api/v1/shops/:shopId/sales/:saleId/documents
router.post(
  '/:saleId/documents',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager'),
  checkShopAccess,
  checkPermission('canEditSales'),
  createUpdateRateLimiter,
  saleValidation.uploadDocument,
  saleController.uploadDocument
);

  // GET /api/v1/shops/:shopId/sales/:saleId/documents
router.get(
  '/:saleId/documents',
  restrictTo('super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant'),
  checkShopAccess,
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleController.getDocuments
);


//  POST /api/v1/shops/:shopId/sales/:saleId/approve

router.post(
  '/:saleId/approve',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canApproveSales'),
  createUpdateRateLimiter,
  saleValidation.approveSale,
  saleController.approveSale
);

  // POST /api/v1/shops/:shopId/sales/:saleId/reject
router.post(
  '/:saleId/reject',
  restrictTo('super_admin', 'org_admin', 'shop_admin'),
  checkShopAccess,
  checkPermission('canApproveSales'),
  createUpdateRateLimiter,
  saleValidation.rejectSale,
  saleController.rejectSale
);

export default router;