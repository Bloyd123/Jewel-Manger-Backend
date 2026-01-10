// FILE: routes/sales.routes.js
// Complete Sales Module Routes - 42+ Endpoints

import express from 'express';
import * as saleController from '../controllers/sales.controller.js';
import * as saleValidation from '../validations/sales.validation.js';
import { protect } from '../middlewares/auth.js';
import { checkShopAccess, checkPermission } from '../middlewares/checkShopAccess.js';
import { apiRateLimiter, createUpdateRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router({ mergeParams: true });

// Apply global middleware
router.use(protect);
router.use(checkShopAccess);

// IMPORTANT: Route Order Matters! Specific routes BEFORE parameterized routes

// 8. ANALYTICS & REPORTS (Must be BEFORE /:saleId routes)

router.get(
  '/analytics',
  checkPermission('canViewAnalytics'),
  saleValidation.getAnalytics,
  saleController.getSalesAnalytics
);

router.get('/dashboard', checkPermission('canViewDashboard'), saleController.getSalesDashboard);

router.get('/today', checkPermission('canViewSales'), saleController.getTodaySales);

router.get('/pending', checkPermission('canViewSales'), saleController.getPendingSales);

router.get('/unpaid', checkPermission('canViewFinancials'), saleController.getUnpaidSales);

router.get('/overdue', checkPermission('canViewFinancials'), saleController.getOverdueSales);

// 12. SEARCH & FILTERS (Before /:saleId)

router.get(
  '/search',
  checkPermission('canViewSales'),
  saleValidation.searchSales,
  saleController.searchSales
);

router.get(
  '/by-date-range',
  checkPermission('canViewSales'),
  saleValidation.dateRange,
  saleController.getSalesByDateRange
);

router.get(
  '/by-amount-range',
  checkPermission('canViewSales'),
  saleValidation.amountRange,
  saleController.getSalesByAmountRange
);

// 6. CUSTOMER-SPECIFIC SALES (Before /:saleId)

router.get(
  '/customer/:customerId',
  checkPermission('canViewSales'),
  saleController.getCustomerSales
);

router.get(
  '/customer/:customerId/summary',
  checkPermission('canViewSales'),
  saleController.getCustomerSalesSummary
);

// 7. SALES PERSON PERFORMANCE (Before /:saleId)

router.get(
  '/sales-person/:userId',
  checkPermission('canViewSales'),
  saleController.getSalesPersonSales
);

router.get(
  '/sales-person/:userId/performance',
  checkPermission('canViewAnalytics'),
  saleController.getSalesPersonPerformance
);

// 11. BULK OPERATIONS (Before /:saleId)

router.post(
  '/bulk-delete',
  checkPermission('canDeleteSales'),
  saleValidation.bulkDelete,
  saleController.bulkDeleteSales
);

router.post(
  '/bulk-print',
  checkPermission('canViewSales'),
  saleValidation.bulkPrint,
  saleController.bulkPrintInvoices
);

router.post(
  '/bulk-send-reminders',
  checkPermission('canManageSales'),
  saleValidation.bulkReminders,
  saleController.bulkSendReminders
);

// 1. SALE CRUD OPERATIONS

router.post(
  '/',
  checkPermission('canCreateSales'),
  createUpdateRateLimiter,
  saleValidation.createSale,
  saleController.createSale
);

router.get(
  '/',
  checkPermission('canViewSales'),
  apiRateLimiter,
  saleValidation.getSales,
  saleController.getAllSales
);

router.get(
  '/:saleId',
  checkPermission('canViewSales'),
  saleValidation.getSale,
  saleController.getSale
);

router.put(
  '/:saleId',
  checkPermission('canEditSales'),
  createUpdateRateLimiter,
  saleValidation.updateSale,
  saleController.updateSale
);

router.delete(
  '/:saleId',
  checkPermission('canDeleteSales'),
  saleValidation.deleteSale,
  saleController.deleteSale
);

// 2. SALE STATUS MANAGEMENT

router.patch(
  '/:saleId/status',
  checkPermission('canEditSales'),
  saleValidation.updateStatus,
  saleController.updateSaleStatus
);

router.patch(
  '/:saleId/confirm',
  checkPermission('canEditSales'),
  saleValidation.confirmSale,
  saleController.confirmSale
);

router.patch(
  '/:saleId/deliver',
  checkPermission('canEditSales'),
  saleValidation.deliverSale,
  saleController.deliverSale
);

router.patch(
  '/:saleId/complete',
  checkPermission('canEditSales'),
  saleValidation.completeSale,
  saleController.completeSale
);

router.patch(
  '/:saleId/cancel',
  checkPermission('canCancelInvoices'),
  saleValidation.cancelSale,
  saleController.cancelSale
);

// 3. PAYMENT MANAGEMENT

router.post(
  '/:saleId/payments',
  checkPermission('canReceivePayments'),
  saleValidation.addPayment,
  saleController.addPayment
);

router.get('/:saleId/payments', checkPermission('canViewSales'), saleController.getSalePayments);

router.get('/:saleId/receipt', checkPermission('canViewSales'), saleController.generateReceipt);

// 4. RETURN & EXCHANGE

router.post(
  '/:saleId/return',
  checkPermission('canManageSales'),
  saleValidation.returnSale,
  saleController.returnSale
);

router.get(
  '/:saleId/return-details',
  checkPermission('canViewSales'),
  saleController.getReturnDetails
);

// 5. OLD GOLD EXCHANGE

router.post(
  '/:saleId/old-gold',
  checkPermission('canManageOldGold'),
  saleValidation.addOldGold,
  saleController.addOldGold
);

router.delete(
  '/:saleId/old-gold',
  checkPermission('canManageOldGold'),
  saleController.removeOldGold
);

// 9. INVOICE MANAGEMENT

router.get('/:saleId/invoice', checkPermission('canViewSales'), saleController.generateInvoice);

router.post(
  '/:saleId/invoice/send',
  checkPermission('canGenerateInvoices'),
  saleValidation.sendInvoice,
  saleController.sendInvoice
);

router.post(
  '/:saleId/invoice/print',
  checkPermission('canViewSales'),
  saleValidation.printInvoice,
  saleController.printInvoice
);

// 10. DISCOUNT & OFFERS

router.post(
  '/:saleId/apply-discount',
  checkPermission('canApplyDiscounts'),
  saleValidation.applyDiscount,
  saleController.applyDiscount
);

router.delete(
  '/:saleId/remove-discount',
  checkPermission('canApplyDiscounts'),
  saleController.removeDiscount
);

// 13. DOCUMENTS

router.post(
  '/:saleId/documents',
  checkPermission('canEditSales'),
  saleValidation.uploadDocument,
  saleController.uploadDocument
);

router.get('/:saleId/documents', checkPermission('canViewSales'), saleController.getDocuments);

// 14. APPROVAL

router.post(
  '/:saleId/approve',
  checkPermission('canApproveSales'),
  saleValidation.approveSale,
  saleController.approveSale
);

router.post(
  '/:saleId/reject',
  checkPermission('canApproveSales'),
  saleValidation.rejectSale,
  saleController.rejectSale
);

export default router;
