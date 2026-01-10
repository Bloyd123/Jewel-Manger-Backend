// FILE: controllers/sales.controller.js
// Sales Controller - Request/Response Handling Only

import * as saleService from '../services/sales.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/sendResponse.js';
import { catchAsync } from '../../middlewares/errorHandler.js';

// 1. SALE CRUD OPERATIONS

/**
 * @route   POST /api/v1/shops/:shopId/sales
 * @desc    Create new sale/invoice
 * @access  Private (canCreateSales)
 */
export const createSale = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const saleData = req.body;
  const userId = req.user._id;
  const organizationId = req.user.organizationId;
  const ipAddress = req.ip;

  const sale = await saleService.createSale(shopId, saleData, userId, organizationId, ipAddress);

  sendCreated(res, 'Sale created successfully', sale);
});

/**
 * @route   GET /api/v1/shops/:shopId/sales
 * @desc    Get all sales with filters
 * @access  Private (canViewSales)
 */
export const getAllSales = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const filters = req.query;

  const result = await saleService.getAllSales(shopId, filters);

  sendPaginated(
    res,
    result.sales,
    result.page,
    result.limit,
    result.total,
    'Sales fetched successfully'
  );
});

/**
 * @route   GET /api/v1/shops/:shopId/sales/:saleId
 * @desc    Get single sale details
 * @access  Private (canViewSales)
 */
export const getSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;

  const sale = await saleService.getSaleById(shopId, saleId);

  sendSuccess(res, 200, 'Sale fetched successfully', sale);
});

/**
 * @route   PUT /api/v1/shops/:shopId/sales/:saleId
 * @desc    Update sale
 * @access  Private (canEditSales)
 */
export const updateSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const updateData = req.body;
  const userId = req.user._id;
  const organizationId = req.user.organizationId;

  const sale = await saleService.updateSale(shopId, saleId, updateData, userId, organizationId);

  sendSuccess(res, 200, 'Sale updated successfully', sale);
});

/**
 * @route   DELETE /api/v1/shops/:shopId/sales/:saleId
 * @desc    Cancel/Delete sale
 * @access  Private (canDeleteSales)
 */
export const deleteSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;
  const organizationId = req.user.organizationId;

  await saleService.deleteSale(shopId, saleId, reason, userId, organizationId);

  sendSuccess(res, 200, 'Sale cancelled successfully');
});

// 2. SALE STATUS MANAGEMENT

export const updateSaleStatus = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { status } = req.body;
  const userId = req.user._id;

  const sale = await saleService.updateSaleStatus(shopId, saleId, status, userId);

  sendSuccess(res, 200, 'Sale status updated successfully', sale);
});

export const confirmSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const userId = req.user._id;

  const sale = await saleService.confirmSale(shopId, saleId, userId);

  sendSuccess(res, 200, 'Sale confirmed successfully', sale);
});

export const deliverSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const deliveryData = req.body;
  const userId = req.user._id;

  const sale = await saleService.deliverSale(shopId, saleId, deliveryData, userId);

  sendSuccess(res, 200, 'Sale marked as delivered', sale);
});

export const completeSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const userId = req.user._id;

  const sale = await saleService.completeSale(shopId, saleId, userId);

  sendSuccess(res, 200, 'Sale completed successfully', sale);
});

export const cancelSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { reason, refundAmount } = req.body;
  const userId = req.user._id;

  const sale = await saleService.cancelSale(shopId, saleId, reason, refundAmount, userId);

  sendSuccess(res, 200, 'Sale cancelled successfully', sale);
});

// 3. PAYMENT MANAGEMENT

export const addPayment = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const paymentData = req.body;
  const userId = req.user._id;

  const sale = await saleService.addPayment(shopId, saleId, paymentData, userId);

  sendSuccess(res, 200, 'Payment added successfully', sale);
});

export const getSalePayments = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;

  const payments = await saleService.getSalePayments(shopId, saleId);

  sendSuccess(res, 200, 'Payments fetched successfully', payments);
});

export const generateReceipt = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;

  const receipt = await saleService.generateReceipt(shopId, saleId);

  sendSuccess(res, 200, 'Receipt generated successfully', receipt);
});

// 4. RETURN & EXCHANGE

export const returnSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const returnData = req.body;
  const userId = req.user._id;

  const sale = await saleService.returnSale(shopId, saleId, returnData, userId);

  sendSuccess(res, 200, 'Sale return processed successfully', sale);
});

export const getReturnDetails = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;

  const returnDetails = await saleService.getReturnDetails(shopId, saleId);

  sendSuccess(res, 200, 'Return details fetched successfully', returnDetails);
});

// 5. OLD GOLD EXCHANGE

export const addOldGold = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const oldGoldData = req.body;
  const userId = req.user._id;

  const sale = await saleService.addOldGold(shopId, saleId, oldGoldData, userId);

  sendSuccess(res, 200, 'Old gold details added successfully', sale);
});

export const removeOldGold = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const userId = req.user._id;

  const sale = await saleService.removeOldGold(shopId, saleId, userId);

  sendSuccess(res, 200, 'Old gold details removed successfully', sale);
});

// 6. CUSTOMER-SPECIFIC SALES

export const getCustomerSales = catchAsync(async (req, res) => {
  const { shopId, customerId } = req.params;
  const filters = req.query;

  const result = await saleService.getCustomerSales(shopId, customerId, filters);

  sendPaginated(
    res,
    result.sales,
    result.page,
    result.limit,
    result.total,
    'Customer sales fetched successfully'
  );
});

export const getCustomerSalesSummary = catchAsync(async (req, res) => {
  const { shopId, customerId } = req.params;

  const summary = await saleService.getCustomerSalesSummary(shopId, customerId);

  sendSuccess(res, 200, 'Customer sales summary fetched successfully', summary);
});

// 7. SALES PERSON PERFORMANCE

export const getSalesPersonSales = catchAsync(async (req, res) => {
  const { shopId, userId } = req.params;
  const filters = req.query;

  const result = await saleService.getSalesPersonSales(shopId, userId, filters);

  sendPaginated(
    res,
    result.sales,
    result.page,
    result.limit,
    result.total,
    'Sales person sales fetched successfully'
  );
});

export const getSalesPersonPerformance = catchAsync(async (req, res) => {
  const { shopId, userId } = req.params;
  const { startDate, endDate } = req.query;

  const performance = await saleService.getSalesPersonPerformance(
    shopId,
    userId,
    startDate,
    endDate
  );

  sendSuccess(res, 200, 'Sales person performance fetched successfully', performance);
});

// 8. ANALYTICS & REPORTS

export const getSalesAnalytics = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { startDate, endDate, groupBy } = req.query;

  const analytics = await saleService.getSalesAnalytics(shopId, startDate, endDate, groupBy);

  sendSuccess(res, 200, 'Sales analytics fetched successfully', analytics);
});

export const getSalesDashboard = catchAsync(async (req, res) => {
  const { shopId } = req.params;

  const dashboard = await saleService.getSalesDashboard(shopId);

  sendSuccess(res, 200, 'Dashboard data fetched successfully', dashboard);
});

export const getTodaySales = catchAsync(async (req, res) => {
  const { shopId } = req.params;

  const sales = await saleService.getTodaySales(shopId);

  sendSuccess(res, 200, "Today's sales fetched successfully", sales);
});

export const getPendingSales = catchAsync(async (req, res) => {
  const { shopId } = req.params;

  const sales = await saleService.getPendingSales(shopId);

  sendSuccess(res, 200, 'Pending sales fetched successfully', sales);
});

export const getUnpaidSales = catchAsync(async (req, res) => {
  const { shopId } = req.params;

  const sales = await saleService.getUnpaidSales(shopId);

  sendSuccess(res, 200, 'Unpaid sales fetched successfully', sales);
});

export const getOverdueSales = catchAsync(async (req, res) => {
  const { shopId } = req.params;

  const sales = await saleService.getOverdueSales(shopId);

  sendSuccess(res, 200, 'Overdue sales fetched successfully', sales);
});

// 9. INVOICE MANAGEMENT

export const generateInvoice = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;

  const invoice = await saleService.generateInvoice(shopId, saleId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${saleId}.pdf"`);
  res.send(invoice);
});

export const sendInvoice = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { method, recipient } = req.body;

  await saleService.sendInvoice(shopId, saleId, method, recipient);

  sendSuccess(res, 200, `Invoice sent successfully via ${method}`);
});

export const printInvoice = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { printerType } = req.body;

  const printData = await saleService.printInvoice(shopId, saleId, printerType);

  sendSuccess(res, 200, 'Invoice print data generated', printData);
});

// 10. DISCOUNT & OFFERS

export const applyDiscount = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const discountData = req.body;
  const userId = req.user._id;

  const sale = await saleService.applyDiscount(shopId, saleId, discountData, userId);

  sendSuccess(res, 200, 'Discount applied successfully', sale);
});

export const removeDiscount = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const userId = req.user._id;

  const sale = await saleService.removeDiscount(shopId, saleId, userId);

  sendSuccess(res, 200, 'Discount removed successfully', sale);
});

// 11. BULK OPERATIONS

export const bulkDeleteSales = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { saleIds, reason } = req.body;
  const userId = req.user._id;

  const result = await saleService.bulkDeleteSales(shopId, saleIds, reason, userId);

  sendSuccess(res, 200, `${result.deletedCount} sales cancelled successfully`, result);
});

export const bulkPrintInvoices = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { saleIds } = req.body;

  const pdfBuffer = await saleService.bulkPrintInvoices(shopId, saleIds);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="bulk-invoices.pdf"');
  res.send(pdfBuffer);
});

export const bulkSendReminders = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { saleIds, method } = req.body;

  const result = await saleService.bulkSendReminders(shopId, saleIds, method);

  sendSuccess(res, 200, `Reminders sent to ${result.sentCount} customers`, result);
});

// 12. SEARCH & FILTERS

export const searchSales = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { q, limit } = req.query;

  const sales = await saleService.searchSales(shopId, q, limit);

  sendSuccess(res, 200, 'Search results fetched successfully', sales);
});

export const getSalesByDateRange = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { startDate, endDate } = req.query;

  const result = await saleService.getSalesByDateRange(shopId, startDate, endDate, req.query);

  sendPaginated(
    res,
    result.sales,
    result.page,
    result.limit,
    result.total,
    'Sales fetched successfully'
  );
});

export const getSalesByAmountRange = catchAsync(async (req, res) => {
  const { shopId } = req.params;
  const { minAmount, maxAmount } = req.query;

  const result = await saleService.getSalesByAmountRange(shopId, minAmount, maxAmount, req.query);

  sendPaginated(
    res,
    result.sales,
    result.page,
    result.limit,
    result.total,
    'Sales fetched successfully'
  );
});

// 13. DOCUMENTS

export const uploadDocument = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const documentData = req.body;
  const userId = req.user._id;

  const sale = await saleService.uploadDocument(shopId, saleId, documentData, userId);

  sendSuccess(res, 200, 'Document uploaded successfully', sale);
});

export const getDocuments = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;

  const documents = await saleService.getDocuments(shopId, saleId);

  sendSuccess(res, 200, 'Documents fetched successfully', documents);
});

// 14. APPROVAL

export const approveSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { notes } = req.body;
  const userId = req.user._id;

  const sale = await saleService.approveSale(shopId, saleId, notes, userId);

  sendSuccess(res, 200, 'Sale approved successfully', sale);
});

export const rejectSale = catchAsync(async (req, res) => {
  const { shopId, saleId } = req.params;
  const { reason } = req.body;
  const userId = req.user._id;

  const sale = await saleService.rejectSale(shopId, saleId, reason, userId);

  sendSuccess(res, 200, 'Sale rejected successfully', sale);
});

export default {
  createSale,
  getAllSales,
  getSale,
  updateSale,
  deleteSale,
  updateSaleStatus,
  confirmSale,
  deliverSale,
  completeSale,
  cancelSale,
  addPayment,
  getSalePayments,
  generateReceipt,
  returnSale,
  getReturnDetails,
  addOldGold,
  removeOldGold,
  getCustomerSales,
  getCustomerSalesSummary,
  getSalesPersonSales,
  getSalesPersonPerformance,
  getSalesAnalytics,
  getSalesDashboard,
  getTodaySales,
  getPendingSales,
  getUnpaidSales,
  getOverdueSales,
  generateInvoice,
  sendInvoice,
  printInvoice,
  applyDiscount,
  removeDiscount,
  bulkDeleteSales,
  bulkPrintInvoices,
  bulkSendReminders,
  searchSales,
  getSalesByDateRange,
  getSalesByAmountRange,
  uploadDocument,
  getDocuments,
  approveSale,
  rejectSale,
};
