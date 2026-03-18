// FILE: controllers/sales.controller.js
// Sales Controller - FIXED (organizationId added everywhere)

import * as saleService from '../services/sales.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/sendResponse.js';
import { catchAsync } from '../../middlewares/errorHandler.js';

// 1. SALE CRUD OPERATIONS

export const createSale = catchAsync(async (req, res) => {
  const { shopId }       = req.params;
  const saleData         = req.body;
  const userId           = req.user._id;
  const organizationId   = req.user.organizationId;
  const ipAddress        = req.ip;

  const sale = await saleService.createSale(shopId, saleData, userId, organizationId, ipAddress);

  sendCreated(res, 'Sale created successfully', sale);
});

export const getAllSales = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const organizationId = req.user.organizationId;
  const filters        = req.query;

  const result = await saleService.getAllSales(shopId, organizationId, filters);

  sendPaginated(res, result.sales, result.page, result.limit, result.total, 'Sales fetched successfully');
});

export const getSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.getSaleById(shopId, saleId, organizationId);

  sendSuccess(res, 200, 'Sale fetched successfully', sale);
});

export const updateSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const updateData         = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.updateSale(shopId, saleId, updateData, userId, organizationId);

  sendSuccess(res, 200, 'Sale updated successfully', sale);
});

export const deleteSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { reason }         = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  await saleService.deleteSale(shopId, saleId, reason, userId, organizationId);

  sendSuccess(res, 200, 'Sale cancelled successfully');
});

// 2. SALE STATUS MANAGEMENT

export const updateSaleStatus = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { status }         = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.updateSaleStatus(shopId, saleId, status, userId, organizationId);

  sendSuccess(res, 200, 'Sale status updated successfully', sale);
});

export const confirmSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.confirmSale(shopId, saleId, userId, organizationId);

  sendSuccess(res, 200, 'Sale confirmed successfully', sale);
});

export const deliverSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const deliveryData       = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.deliverSale(shopId, saleId, deliveryData, userId, organizationId);

  sendSuccess(res, 200, 'Sale marked as delivered', sale);
});

export const completeSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.completeSale(shopId, saleId, userId, organizationId);

  sendSuccess(res, 200, 'Sale completed successfully', sale);
});

export const cancelSale = catchAsync(async (req, res) => {
  const { shopId, saleId }     = req.params;
  const { reason, refundAmount } = req.body;
  const userId                 = req.user._id;
  const organizationId         = req.user.organizationId;

  const sale = await saleService.cancelSale(shopId, saleId, reason, refundAmount, userId, organizationId);

  sendSuccess(res, 200, 'Sale cancelled successfully', sale);
});

// 3. PAYMENT MANAGEMENT

export const addPayment = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const paymentData        = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.addPayment(shopId, saleId, paymentData, userId, organizationId);

  sendSuccess(res, 200, 'Payment added successfully', sale);
});

export const getSalePayments = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const organizationId     = req.user.organizationId;

  const payments = await saleService.getSalePayments(shopId, saleId, organizationId);

  sendSuccess(res, 200, 'Payments fetched successfully', payments);
});

export const generateReceipt = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const organizationId     = req.user.organizationId;

  const receipt = await saleService.generateReceipt(shopId, saleId, organizationId);

  sendSuccess(res, 200, 'Receipt generated successfully', receipt);
});

// 4. RETURN & EXCHANGE

export const returnSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const returnData         = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.returnSale(shopId, saleId, returnData, userId, organizationId);

  sendSuccess(res, 200, 'Sale return processed successfully', sale);
});

export const getReturnDetails = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const organizationId     = req.user.organizationId;

  const returnDetails = await saleService.getReturnDetails(shopId, saleId, organizationId);

  sendSuccess(res, 200, 'Return details fetched successfully', returnDetails);
});

// 5. OLD GOLD EXCHANGE

export const addOldGold = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const oldGoldData        = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.addOldGold(shopId, saleId, oldGoldData, userId, organizationId);

  sendSuccess(res, 200, 'Old gold details added successfully', sale);
});

export const removeOldGold = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.removeOldGold(shopId, saleId, userId, organizationId);

  sendSuccess(res, 200, 'Old gold details removed successfully', sale);
});

// 6. CUSTOMER-SPECIFIC SALES

export const getCustomerSales = catchAsync(async (req, res) => {
  const { shopId, customerId } = req.params;
  const organizationId         = req.user.organizationId;
  const filters                = req.query;

  const result = await saleService.getCustomerSales(shopId, customerId, organizationId, filters);

  sendPaginated(res, result.sales, result.page, result.limit, result.total, 'Customer sales fetched successfully');
});

export const getCustomerSalesSummary = catchAsync(async (req, res) => {
  const { shopId, customerId } = req.params;
  const organizationId         = req.user.organizationId;

  const summary = await saleService.getCustomerSalesSummary(shopId, customerId, organizationId);

  sendSuccess(res, 200, 'Customer sales summary fetched successfully', summary);
});

// 7. SALES PERSON PERFORMANCE

export const getSalesPersonSales = catchAsync(async (req, res) => {
  const { shopId, userId } = req.params;
  const organizationId     = req.user.organizationId;
  const filters            = req.query;

  const result = await saleService.getSalesPersonSales(shopId, userId, organizationId, filters);

  sendPaginated(res, result.sales, result.page, result.limit, result.total, 'Sales person sales fetched successfully');
});

export const getSalesPersonPerformance = catchAsync(async (req, res) => {
  const { shopId, userId }   = req.params;
  const organizationId       = req.user.organizationId;
  const { startDate, endDate } = req.query;

  const performance = await saleService.getSalesPersonPerformance(shopId, userId, organizationId, startDate, endDate);

  sendSuccess(res, 200, 'Sales person performance fetched successfully', performance);
});

// 8. ANALYTICS & REPORTS

export const getSalesAnalytics = catchAsync(async (req, res) => {
  const { shopId }                   = req.params;
  const organizationId               = req.user.organizationId;
  const { startDate, endDate, groupBy } = req.query;

  const analytics = await saleService.getSalesAnalytics(shopId, organizationId, startDate, endDate, groupBy);

  sendSuccess(res, 200, 'Sales analytics fetched successfully', analytics);
});

export const getSalesDashboard = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const organizationId = req.user.organizationId;

  const dashboard = await saleService.getSalesDashboard(shopId, organizationId);

  sendSuccess(res, 200, 'Dashboard data fetched successfully', dashboard);
});

export const getTodaySales = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const organizationId = req.user.organizationId;

  const sales = await saleService.getTodaySales(shopId, organizationId);

  sendSuccess(res, 200, "Today's sales fetched successfully", sales);
});

export const getPendingSales = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const organizationId = req.user.organizationId;

  const sales = await saleService.getPendingSales(shopId, organizationId);

  sendSuccess(res, 200, 'Pending sales fetched successfully', sales);
});

export const getUnpaidSales = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const organizationId = req.user.organizationId;

  const sales = await saleService.getUnpaidSales(shopId, organizationId);

  sendSuccess(res, 200, 'Unpaid sales fetched successfully', sales);
});

export const getOverdueSales = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const organizationId = req.user.organizationId;

  const sales = await saleService.getOverdueSales(shopId, organizationId);

  sendSuccess(res, 200, 'Overdue sales fetched successfully', sales);
});

// 9. INVOICE MANAGEMENT

export const generateInvoice = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const organizationId     = req.user.organizationId;

  const invoice = await saleService.generateInvoice(shopId, saleId, organizationId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${saleId}.pdf"`);
  res.send(invoice);
});

export const sendInvoice = catchAsync(async (req, res) => {
  const { shopId, saleId }     = req.params;
  const { method, recipient }  = req.body;
  const organizationId         = req.user.organizationId;

  await saleService.sendInvoice(shopId, saleId, method, recipient, organizationId);

  sendSuccess(res, 200, `Invoice sent successfully via ${method}`);
});

export const printInvoice = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { printerType }    = req.body;
  const organizationId     = req.user.organizationId;

  const printData = await saleService.printInvoice(shopId, saleId, printerType, organizationId);

  sendSuccess(res, 200, 'Invoice print data generated', printData);
});

// 10. DISCOUNT & OFFERS

export const applyDiscount = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const discountData       = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.applyDiscount(shopId, saleId, discountData, userId, organizationId);

  sendSuccess(res, 200, 'Discount applied successfully', sale);
});

export const removeDiscount = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.removeDiscount(shopId, saleId, userId, organizationId);

  sendSuccess(res, 200, 'Discount removed successfully', sale);
});

// 11. BULK OPERATIONS

export const bulkDeleteSales = catchAsync(async (req, res) => {
  const { shopId }           = req.params;
  const { saleIds, reason }  = req.body;
  const userId               = req.user._id;
  const organizationId       = req.user.organizationId;

  const result = await saleService.bulkDeleteSales(shopId, saleIds, reason, userId, organizationId);

  sendSuccess(res, 200, `${result.deletedCount} sales cancelled successfully`, result);
});

export const bulkPrintInvoices = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const { saleIds }    = req.body;
  const organizationId = req.user.organizationId;

  const pdfBuffer = await saleService.bulkPrintInvoices(shopId, saleIds, organizationId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="bulk-invoices.pdf"');
  res.send(pdfBuffer);
});

export const bulkSendReminders = catchAsync(async (req, res) => {
  const { shopId }          = req.params;
  const { saleIds, method } = req.body;
  const organizationId      = req.user.organizationId;

  const result = await saleService.bulkSendReminders(shopId, saleIds, method, organizationId);

  sendSuccess(res, 200, `Reminders sent to ${result.sentCount} customers`, result);
});

// 12. PAYMENT REMINDER (single sale)
// Route: POST /shops/:shopId/sales/:saleId/send-reminder

export const sendPaymentReminder = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const organizationId     = req.user.organizationId;

  const result = await saleService.sendPaymentReminder(shopId, saleId, organizationId);

  sendSuccess(res, 200, result.message);
});

// 13. SEARCH & FILTERS

export const searchSales = catchAsync(async (req, res) => {
  const { shopId }     = req.params;
  const organizationId = req.user.organizationId;
  const { q, limit }   = req.query;

  const sales = await saleService.searchSales(shopId, organizationId, q, limit);

  sendSuccess(res, 200, 'Search results fetched successfully', sales);
});

export const getSalesByDateRange = catchAsync(async (req, res) => {
  const { shopId }               = req.params;
  const organizationId           = req.user.organizationId;
  const { startDate, endDate }   = req.query;

  const result = await saleService.getSalesByDateRange(shopId, organizationId, startDate, endDate, req.query);

  sendPaginated(res, result.sales, result.page, result.limit, result.total, 'Sales fetched successfully');
});

export const getSalesByAmountRange = catchAsync(async (req, res) => {
  const { shopId }                 = req.params;
  const organizationId             = req.user.organizationId;
  const { minAmount, maxAmount }   = req.query;

  const result = await saleService.getSalesByAmountRange(shopId, organizationId, minAmount, maxAmount, req.query);

  sendPaginated(res, result.sales, result.page, result.limit, result.total, 'Sales fetched successfully');
});

// 14. DOCUMENTS

export const uploadDocument = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const documentData       = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.uploadDocument(shopId, saleId, documentData, userId, organizationId);

  sendSuccess(res, 200, 'Document uploaded successfully', sale);
});

export const getDocuments = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const organizationId     = req.user.organizationId;

  const documents = await saleService.getDocuments(shopId, saleId, organizationId);

  sendSuccess(res, 200, 'Documents fetched successfully', documents);
});

// 15. APPROVAL

export const approveSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { notes }          = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.approveSale(shopId, saleId, notes, userId, organizationId);

  sendSuccess(res, 200, 'Sale approved successfully', sale);
});

export const rejectSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { reason }         = req.body;
  const userId             = req.user._id;
  const organizationId     = req.user.organizationId;

  const sale = await saleService.rejectSale(shopId, saleId, reason, userId, organizationId);

  sendSuccess(res, 200, 'Sale rejected successfully', sale);
});

export default {
  createSale, getAllSales, getSale, updateSale, deleteSale,
  updateSaleStatus, confirmSale, deliverSale, completeSale, cancelSale,
  addPayment, getSalePayments, generateReceipt,
  returnSale, getReturnDetails,
  addOldGold, removeOldGold,
  getCustomerSales, getCustomerSalesSummary,
  getSalesPersonSales, getSalesPersonPerformance,
  getSalesAnalytics, getSalesDashboard, getTodaySales,
  getPendingSales, getUnpaidSales, getOverdueSales,
  generateInvoice, sendInvoice, printInvoice,
  applyDiscount, removeDiscount,
  bulkDeleteSales, bulkPrintInvoices, bulkSendReminders,
  sendPaymentReminder,
  searchSales, getSalesByDateRange, getSalesByAmountRange,
  uploadDocument, getDocuments,
  approveSale, rejectSale,
};