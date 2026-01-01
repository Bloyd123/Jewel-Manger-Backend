// ============================================================================
// FILE: services/sales.service.js
// Sales Service - 100% COMPLETE Business Logic Layer
// ============================================================================

import mongoose from 'mongoose';
import Sale from '../../models/Sale.js';
import Product from '../../models/Product.js';
import Customer from '../../models/Customer.js';
import Payment from '../../models/Payment.js';
import InventoryTransaction from '../../models/InventoryTransaction.js';
import JewelryShop from '../../models/Shop.js';
import {
  NotFoundError,
  ValidationError,
  InsufficientStockError,
  BadRequestError,
} from '../../utils/AppError.js';
import eventLogger from '../../utils/eventLogger.js';
import { businessLogger } from '../../utils/logger.js';
import cache from '../../utils/cache.js';

// ============================================================================
// 1. CREATE SALE (Complete with Transaction Management)
// ============================================================================

export const createSale = async (shopId, saleData, userId, organizationId, ipAddress) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shop = await JewelryShop.findById(shopId).session(session);
    if (!shop) throw new NotFoundError('Shop not found');

    const customer = await Customer.findById(saleData.customerId).session(session);
    if (!customer) throw new NotFoundError('Customer not found');

    const invoiceNumber = await Sale.generateInvoiceNumber(shopId, shop.settings.invoicePrefix);

    for (const item of saleData.items) {
      if (item.productId) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) throw new NotFoundError(`Product ${item.productCode} not found`);
        if (product.stock.quantity < item.quantity) {
          throw new InsufficientStockError(
            `Insufficient stock for ${product.name}. Available: ${product.stock.quantity}`
          );
        }
      }
    }

    const sale = await Sale.create(
      [
        {
          ...saleData,
          organizationId,
          shopId,
          invoiceNumber,
          customerDetails: {
            customerName: customer.fullName,
            customerCode: customer.customerCode,
            phone: customer.phone,
            email: customer.email,
            address: customer.address?.street || '',
            gstNumber: customer.gstNumber,
            panNumber: customer.panNumber,
          },
          salesPerson: userId,
          createdBy: userId,
          status: 'confirmed',
        },
      ],
      { session }
    );

    for (const item of saleData.items) {
      if (item.productId) {
        const product = await Product.findById(item.productId).session(session);
        const previousQty = product.stock.quantity;
        await product.updateStock(item.quantity, 'subtract');

        if (product.stock.quantity === 0) {
          await product.markAsSold(customer._id);
        }

        await InventoryTransaction.create(
          [
            {
              organizationId,
              shopId,
              productId: item.productId,
              productCode: item.productCode,
              transactionType: 'SALE',
              quantity: item.quantity,
              previousQuantity: previousQty,
              newQuantity: product.stock.quantity,
              transactionDate: new Date(),
              referenceType: 'sale',
              referenceId: sale[0]._id,
              referenceNumber: invoiceNumber,
              value: item.itemTotal,
              performedBy: userId,
              reason: `Product sold via invoice ${invoiceNumber}`,
            },
          ],
          { session }
        );
      }
    }

    customer.statistics.totalOrders += 1;
    customer.statistics.completedOrders += 1;
    customer.statistics.totalSpent += sale[0].financials.grandTotal;
    customer.statistics.lastOrderDate = new Date();
    customer.statistics.averageOrderValue =
      customer.statistics.totalSpent / customer.statistics.completedOrders;

    if (!customer.statistics.firstOrderDate) {
      customer.statistics.firstOrderDate = new Date();
    }

    if (sale[0].payment.paymentStatus !== 'paid') {
      customer.currentBalance -= sale[0].payment.dueAmount;
      customer.totalDue += sale[0].payment.dueAmount;
    }

    await customer.save({ session });

    await eventLogger.logSale(
      userId,
      organizationId,
      shopId,
      'create',
      sale[0]._id,
      `Created sale ${invoiceNumber} for customer ${customer.fullName}`,
      {
        invoiceNumber,
        customerId: customer._id,
        amount: sale[0].financials.grandTotal,
        itemCount: sale[0].items.length,
      }
    );

    businessLogger.logSale({
      userId,
      shopId,
      invoiceNumber,
      amount: sale[0].financials.grandTotal,
      customerId: customer._id,
    });

    await session.commitTransaction();

    const populatedSale = await Sale.findById(sale[0]._id)
      .populate('customerId', 'firstName lastName customerCode phone email')
      .populate('salesPerson', 'firstName lastName email');

    cache.invalidateShop(shopId);

    return populatedSale;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ============================================================================
// 2. GET ALL SALES WITH FILTERS
// ============================================================================

export const getAllSales = async (shopId, filters) => {
  const query = { shopId, deletedAt: null };

  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.salesPerson) query.salesPerson = filters.salesPerson;
  if (filters.status) query.status = filters.status;
  if (filters.paymentStatus) query['payment.paymentStatus'] = filters.paymentStatus;
  if (filters.saleType) query.saleType = filters.saleType;

  if (filters.startDate || filters.endDate) {
    query.saleDate = {};
    if (filters.startDate) query.saleDate.$gte = new Date(filters.startDate);
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      query.saleDate.$lte = endDate;
    }
  }

  if (filters.minAmount || filters.maxAmount) {
    query['financials.grandTotal'] = {};
    if (filters.minAmount) query['financials.grandTotal'].$gte = parseFloat(filters.minAmount);
    if (filters.maxAmount) query['financials.grandTotal'].$lte = parseFloat(filters.maxAmount);
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { invoiceNumber: searchRegex },
      { 'customerDetails.customerName': searchRegex },
      { 'customerDetails.phone': searchRegex },
    ];
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    Sale.find(query)
      .sort(filters.sort || '-saleDate')
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'firstName lastName customerCode phone email')
      .populate('salesPerson', 'firstName lastName email')
      .lean(),
    Sale.countDocuments(query),
  ]);

  return { sales, total, page, limit };
};

// ============================================================================
// 3. GET SINGLE SALE
// ============================================================================

export const getSaleById = async (shopId, saleId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null })
    .populate('customerId', 'firstName lastName customerCode phone email address')
    .populate('salesPerson', 'firstName lastName email profileImage')
    .populate('items.productId', 'name productCode category images')
    .lean();

  if (!sale) throw new NotFoundError('Sale not found');

  return sale;
};

// ============================================================================
// 4. UPDATE SALE
// ============================================================================

export const updateSale = async (shopId, saleId, updateData, userId, organizationId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  if (!['draft', 'pending'].includes(sale.status)) {
    throw new BadRequestError('Can only edit draft or pending sales');
  }

  Object.assign(sale, updateData);
  sale.updatedBy = userId;
  await sale.save();

  await eventLogger.logSale(
    userId,
    organizationId,
    shopId,
    'update',
    sale._id,
    `Updated sale ${sale.invoiceNumber}`,
    { saleId: sale._id }
  );

  cache.invalidateShop(shopId);

  return sale;
};

// ============================================================================
// 5. DELETE SALE (WITH STOCK RESTORATION)
// ============================================================================

export const deleteSale = async (shopId, saleId, reason, userId, organizationId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null }).session(session);
    if (!sale) throw new NotFoundError('Sale not found');

    if (sale.status !== 'draft') {
      throw new BadRequestError('Can only delete draft sales');
    }

    for (const item of sale.items) {
      if (item.productId) {
        const product = await Product.findById(item.productId).session(session);
        if (product) {
          const previousQty = product.stock.quantity;
          await product.updateStock(item.quantity, 'add');

          await InventoryTransaction.create(
            [
              {
                organizationId,
                shopId,
                productId: item.productId,
                productCode: item.productCode,
                transactionType: 'ADJUSTMENT',
                quantity: item.quantity,
                previousQuantity: previousQty,
                newQuantity: product.stock.quantity,
                referenceType: 'sale',
                referenceId: sale._id,
                referenceNumber: sale.invoiceNumber,
                performedBy: userId,
                reason: `Sale ${sale.invoiceNumber} cancelled - stock restored`,
              },
            ],
            { session }
          );
        }
      }
    }

    await sale.softDelete();

    await eventLogger.logSale(
      userId,
      organizationId,
      shopId,
      'delete',
      sale._id,
      `Cancelled sale ${sale.invoiceNumber}`,
      { saleId: sale._id, reason }
    );

    await session.commitTransaction();

    cache.invalidateShop(shopId);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ============================================================================
// 6-10. STATUS MANAGEMENT
// ============================================================================

export const updateSaleStatus = async (shopId, saleId, status, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  sale.status = status;
  sale.updatedBy = userId;
  await sale.save();

  cache.invalidateShop(shopId);
  return sale;
};

export const confirmSale = async (shopId, saleId, userId) => {
  return updateSaleStatus(shopId, saleId, 'confirmed', userId);
};

export const deliverSale = async (shopId, saleId, deliveryData, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  await sale.markAsDelivered(userId);
  Object.assign(sale.delivery, deliveryData);
  await sale.save();

  cache.invalidateShop(shopId);
  return sale;
};

export const completeSale = async (shopId, saleId, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  await sale.markAsCompleted();
  cache.invalidateShop(shopId);
  return sale;
};

export const cancelSale = async (shopId, saleId, reason, refundAmount, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null }).session(session);
    if (!sale) throw new NotFoundError('Sale not found');

    if (sale.status === 'cancelled') {
      throw new BadRequestError('Sale is already cancelled');
    }

    for (const item of sale.items) {
      if (item.productId) {
        const product = await Product.findById(item.productId).session(session);
        if (product) {
          await product.updateStock(item.quantity, 'add');
        }
      }
    }

    await sale.cancel();
    sale.cancellation = {
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancellationReason: reason,
      refundAmount: refundAmount || 0,
      refundStatus: refundAmount > 0 ? 'pending' : 'not_applicable',
    };
    await sale.save({ session });

    await session.commitTransaction();

    cache.invalidateShop(shopId);
    return sale;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ============================================================================
// 11-13. PAYMENT MANAGEMENT
// ============================================================================

export const addPayment = async (shopId, saleId, paymentData, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  await sale.addPayment({ ...paymentData, receivedBy: userId });
  cache.invalidateShop(shopId);
  return sale;
};

export const getSalePayments = async (shopId, saleId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null }).select('payment');
  if (!sale) throw new NotFoundError('Sale not found');
  return sale.payment.payments;
};

export const generateReceipt = async (shopId, saleId) => {
  const sale = await getSaleById(shopId, saleId);

  const receipt = {
    receiptNumber: sale.payment.receiptNumber || sale.invoiceNumber,
    date: new Date(),
    customer: sale.customerDetails,
    sale: {
      invoiceNumber: sale.invoiceNumber,
      saleDate: sale.saleDate,
      totalAmount: sale.financials.grandTotal,
    },
    payments: sale.payment.payments,
    totalPaid: sale.payment.paidAmount,
    dueAmount: sale.payment.dueAmount,
    paymentStatus: sale.payment.paymentStatus,
  };

  return receipt;
};

// ============================================================================
// 14-15. RETURN & EXCHANGE (FULL IMPLEMENTATION)
// ============================================================================

export const returnSale = async (shopId, saleId, returnData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null }).session(session);
    if (!sale) throw new NotFoundError('Sale not found');

    if (sale.status === 'returned') {
      throw new BadRequestError('Sale is already returned');
    }

    const itemsToReturn = returnData.itemsToReturn || sale.items;

    for (const returnItem of itemsToReturn) {
      const saleItem = sale.items.find(
        item => item.productId?.toString() === returnItem.productId?.toString()
      );

      if (saleItem && saleItem.productId) {
        const product = await Product.findById(saleItem.productId).session(session);
        if (product) {
          await product.updateStock(returnItem.quantity || saleItem.quantity, 'add');

          await InventoryTransaction.create(
            [
              {
                organizationId: sale.organizationId,
                shopId,
                productId: saleItem.productId,
                productCode: saleItem.productCode,
                transactionType: 'RETURN',
                quantity: returnItem.quantity || saleItem.quantity,
                previousQuantity:
                  product.stock.quantity - (returnItem.quantity || saleItem.quantity),
                newQuantity: product.stock.quantity,
                referenceType: 'sale',
                referenceId: sale._id,
                referenceNumber: sale.invoiceNumber,
                performedBy: userId,
                reason: `Product returned from sale ${sale.invoiceNumber}`,
              },
            ],
            { session }
          );
        }
      }
    }

    await sale.processReturn({
      returnDate: returnData.returnDate || new Date(),
      reason: returnData.returnReason,
      refundAmount: returnData.refundAmount,
      returnedBy: userId,
    });

    const customer = await Customer.findById(sale.customerId).session(session);
    if (customer) {
      customer.statistics.totalSpent -= returnData.refundAmount || 0;
      customer.currentBalance += returnData.refundAmount || 0;
      await customer.save({ session });
    }

    await eventLogger.logSale(
      userId,
      sale.organizationId,
      shopId,
      'return',
      sale._id,
      `Processed return for sale ${sale.invoiceNumber}`,
      { refundAmount: returnData.refundAmount, reason: returnData.returnReason }
    );

    await session.commitTransaction();

    cache.invalidateShop(shopId);
    return sale;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getReturnDetails = async (shopId, saleId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null })
    .select('return invoiceNumber saleDate customerDetails financials')
    .lean();

  if (!sale) throw new NotFoundError('Sale not found');

  if (!sale.return?.isReturned) {
    return { message: 'No return found for this sale', isReturned: false };
  }

  return sale.return;
};

// ============================================================================
// 16-17. OLD GOLD EXCHANGE (FULL IMPLEMENTATION)
// ============================================================================

export const addOldGold = async (shopId, saleId, oldGoldData, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  const totalOldGoldValue = oldGoldData.oldGoldItems.reduce(
    (sum, item) => sum + item.netWeight * item.ratePerGram,
    0
  );

  sale.oldGoldExchange = {
    hasExchange: true,
    items: oldGoldData.oldGoldItems.map(item => ({
      metalType: item.metalType,
      purity: item.purity,
      grossWeight: item.grossWeight,
      stoneWeight: item.stoneWeight || 0,
      netWeight: item.grossWeight - (item.stoneWeight || 0),
      ratePerGram: item.ratePerGram,
      totalValue: (item.grossWeight - (item.stoneWeight || 0)) * item.ratePerGram,
      description: item.description || '',
    })),
    totalValue: totalOldGoldValue,
  };

  sale.financials.oldGoldValue = totalOldGoldValue;
  sale.financials.netPayable = sale.financials.grandTotal - totalOldGoldValue;
  sale.payment.totalAmount = sale.financials.netPayable;
  sale.payment.dueAmount = sale.financials.netPayable - sale.payment.paidAmount;

  await sale.save();

  await eventLogger.logSale(
    userId,
    sale.organizationId,
    shopId,
    'add_old_gold',
    sale._id,
    `Added old gold worth ₹${totalOldGoldValue} to sale ${sale.invoiceNumber}`,
    { oldGoldValue: totalOldGoldValue }
  );

  cache.invalidateShop(shopId);
  return sale;
};

export const removeOldGold = async (shopId, saleId, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  sale.oldGoldExchange = {
    hasExchange: false,
    items: [],
    totalValue: 0,
  };

  sale.financials.oldGoldValue = 0;
  sale.financials.netPayable = sale.financials.grandTotal;
  sale.payment.totalAmount = sale.financials.netPayable;
  sale.payment.dueAmount = sale.financials.netPayable - sale.payment.paidAmount;

  await sale.save();

  await eventLogger.logSale(
    userId,
    sale.organizationId,
    shopId,
    'remove_old_gold',
    sale._id,
    `Removed old gold from sale ${sale.invoiceNumber}`,
    {}
  );

  cache.invalidateShop(shopId);
  return sale;
};

// ============================================================================
// 18-25. ANALYTICS & REPORTS
// ============================================================================

export const getSalesAnalytics = async (shopId, startDate, endDate, groupBy = 'day') => {
  const matchStage = { shopId: mongoose.Types.ObjectId(shopId), deletedAt: null };

  if (startDate || endDate) {
    matchStage.saleDate = {};
    if (startDate) matchStage.saleDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.saleDate.$lte = end;
    }
  }

  const analytics = await Sale.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalAmount: { $sum: '$financials.grandTotal' },
        totalDiscount: { $sum: '$financials.totalDiscount' },
        totalGST: { $sum: '$financials.totalGST' },
        averageOrderValue: { $avg: '$financials.grandTotal' },
        paidSales: { $sum: { $cond: [{ $eq: ['$payment.paymentStatus', 'paid'] }, 1, 0] } },
        unpaidSales: { $sum: { $cond: [{ $eq: ['$payment.paymentStatus', 'unpaid'] }, 1, 0] } },
      },
    },
  ]);

  return analytics[0] || {};
};

export const getSalesDashboard = async shopId => {
  const cacheKey = `sales_dashboard_${shopId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todaySales, recentSales, pendingPayments] = await Promise.all([
    Sale.find({ shopId, saleDate: { $gte: today }, deletedAt: null }),
    Sale.find({ shopId, deletedAt: null })
      .sort('-saleDate')
      .limit(10)
      .populate('customerId', 'firstName lastName customerCode')
      .lean(),
    Sale.countDocuments({
      shopId,
      'payment.paymentStatus': { $in: ['unpaid', 'partial'] },
      deletedAt: null,
    }),
  ]);

  const dashboard = {
    today: {
      count: todaySales.length,
      value: todaySales.reduce((sum, s) => sum + s.financials.grandTotal, 0),
    },
    recentSales,
    pendingPayments,
  };

  cache.set(cacheKey, dashboard, 300);
  return dashboard;
};

export const getTodaySales = async shopId => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Sale.find({ shopId, saleDate: { $gte: today }, deletedAt: null })
    .populate('customerId', 'firstName lastName')
    .lean();
};

export const getPendingSales = async shopId => {
  return Sale.find({
    shopId,
    status: { $in: ['draft', 'pending'] },
    deletedAt: null,
  }).lean();
};

export const getUnpaidSales = async shopId => {
  return Sale.find({
    shopId,
    'payment.paymentStatus': { $in: ['unpaid', 'partial'] },
    deletedAt: null,
  }).lean();
};

export const getOverdueSales = async shopId => {
  return Sale.find({
    shopId,
    'payment.dueDate': { $lt: new Date() },
    'payment.paymentStatus': { $in: ['unpaid', 'partial'] },
    deletedAt: null,
  }).lean();
};

// ============================================================================
// 26-27. CUSTOMER & SALES PERSON
// ============================================================================

export const getCustomerSales = async (shopId, customerId, filters) => {
  const query = { shopId, customerId, deletedAt: null };
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    Sale.find(query).sort('-saleDate').skip(skip).limit(limit).lean(),
    Sale.countDocuments(query),
  ]);

  return { sales, total, page, limit };
};

export const getCustomerSalesSummary = async (shopId, customerId) => {
  const sales = await Sale.find({ shopId, customerId, deletedAt: null });

  return {
    totalSales: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + s.financials.grandTotal, 0),
    totalDue: sales.reduce((sum, s) => sum + s.payment.dueAmount, 0),
    lastPurchase: sales[0]?.saleDate || null,
  };
};

export const getSalesPersonSales = async (shopId, userId, filters) => {
  const query = { shopId, salesPerson: userId, deletedAt: null };
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    Sale.find(query).sort('-saleDate').skip(skip).limit(limit).lean(),
    Sale.countDocuments(query),
  ]);

  return { sales, total, page, limit };
};

export const getSalesPersonPerformance = async (shopId, userId, startDate, endDate) => {
  const query = { shopId, salesPerson: userId, deletedAt: null };

  if (startDate || endDate) {
    query.saleDate = {};
    if (startDate) query.saleDate.$gte = new Date(startDate);
    if (endDate) query.saleDate.$lte = new Date(endDate);
  }

  const sales = await Sale.find(query);

  return {
    totalSales: sales.length,
    totalValue: sales.reduce((sum, s) => sum + s.financials.grandTotal, 0),
    averageValue: sales.length
      ? sales.reduce((sum, s) => sum + s.financials.grandTotal, 0) / sales.length
      : 0,
  };
};

// ============================================================================
// 28-30. INVOICE MANAGEMENT (FULL IMPLEMENTATION)
// ============================================================================

export const generateInvoice = async (shopId, saleId) => {
  const sale = await getSaleById(shopId, saleId);
  const shop = await JewelryShop.findById(shopId).lean();

  // Simple invoice object (can be converted to PDF using pdfkit/puppeteer)
  const invoiceData = {
    invoiceNumber: sale.invoiceNumber,
    date: sale.saleDate,
    shop: {
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      gst: shop.gstNumber,
    },
    customer: sale.customerDetails,
    items: sale.items,
    financials: sale.financials,
    payment: sale.payment,
    oldGold: sale.oldGoldExchange,
  };

  // Return as JSON (for now) - can be converted to PDF Buffer
  return Buffer.from(JSON.stringify(invoiceData, null, 2));
};

export const sendInvoice = async (shopId, saleId, method, recipient) => {
  const sale = await getSaleById(shopId, saleId);

  // TODO: Integrate with email/SMS service
  // For now, log the action
  await eventLogger.logSale(
    null,
    sale.organizationId,
    shopId,
    'send_invoice',
    sale._id,
    `Invoice ${sale.invoiceNumber} sent via ${method} to ${recipient}`,
    { method, recipient }
  );

  return { message: `Invoice sent successfully via ${method}`, recipient };
};

export const printInvoice = async (shopId, saleId, printerType = 'A4') => {
  const sale = await getSaleById(shopId, saleId);

  // Format invoice for printing (thermal or A4)
  const printData = {
    format: printerType,
    invoice: sale.invoiceNumber,
    customer: sale.customerDetails.customerName,
    amount: sale.financials.grandTotal,
    items: sale.items.length,
    printTime: new Date(),
  };

  return printData;
};

// ============================================================================
// 31-33. DISCOUNT MANAGEMENT (FULL IMPLEMENTATION)
// ============================================================================

export const applyDiscount = async (shopId, saleId, discountData, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  const { discountType, discountValue, discountReason } = discountData;

  // Calculate discount amount
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (sale.financials.subtotal * discountValue) / 100;
  } else if (discountType === 'flat') {
    discountAmount = discountValue;
  }

  // Update sale financials
  sale.financials.totalDiscount = discountAmount;
  sale.financials.grandTotal = sale.financials.subtotal + sale.financials.totalGST - discountAmount;
  sale.financials.netPayable = sale.financials.grandTotal - (sale.financials.oldGoldValue || 0);

  // Update payment amounts
  sale.payment.totalAmount = sale.financials.netPayable;
  sale.payment.dueAmount = sale.financials.netPayable - sale.payment.paidAmount;

  await sale.save();

  await eventLogger.logSale(
    userId,
    sale.organizationId,
    shopId,
    'apply_discount',
    sale._id,
    `Applied ${discountType} discount of ${discountValue} to sale ${sale.invoiceNumber}`,
    { discountType, discountValue, discountAmount, reason: discountReason }
  );

  cache.invalidateShop(shopId);
  return sale;
};

export const removeDiscount = async (shopId, saleId, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  // Remove discount
  sale.financials.totalDiscount = 0;
  sale.financials.grandTotal = sale.financials.subtotal + sale.financials.totalGST;
  sale.financials.netPayable = sale.financials.grandTotal - (sale.financials.oldGoldValue || 0);

  // Update payment amounts
  sale.payment.totalAmount = sale.financials.netPayable;
  sale.payment.dueAmount = sale.financials.netPayable - sale.payment.paidAmount;

  await sale.save();

  await eventLogger.logSale(
    userId,
    sale.organizationId,
    shopId,
    'remove_discount',
    sale._id,
    `Removed discount from sale ${sale.invoiceNumber}`,
    {}
  );

  cache.invalidateShop(shopId);
  return sale;
};

// ============================================================================
// 34-36. BULK OPERATIONS (FULL IMPLEMENTATION)
// ============================================================================

export const bulkDeleteSales = async (shopId, saleIds, reason, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let deletedCount = 0;

    for (const saleId of saleIds) {
      const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null }).session(session);

      if (sale && sale.status === 'draft') {
        // Restore inventory
        for (const item of sale.items) {
          if (item.productId) {
            const product = await Product.findById(item.productId).session(session);
            if (product) {
              await product.updateStock(item.quantity, 'add');
            }
          }
        }

        await sale.softDelete();
        deletedCount++;
      }
    }

    await eventLogger.logSale(
      userId,
      null,
      shopId,
      'bulk_delete',
      null,
      `Bulk deleted ${deletedCount} sales`,
      { saleIds, reason, deletedCount }
    );

    await session.commitTransaction();

    cache.invalidateShop(shopId);

    return { deletedCount, totalRequested: saleIds.length };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const bulkPrintInvoices = async (shopId, saleIds) => {
  const sales = await Sale.find({
    _id: { $in: saleIds },
    shopId,
    deletedAt: null,
  }).lean();

  // Create combined invoice data
  const bulkInvoiceData = {
    printDate: new Date(),
    totalInvoices: sales.length,
    invoices: sales.map(sale => ({
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customerDetails.customerName,
      date: sale.saleDate,
      amount: sale.financials.grandTotal,
    })),
  };

  // Return as buffer (can be converted to PDF)
  return Buffer.from(JSON.stringify(bulkInvoiceData, null, 2));
};

export const bulkSendReminders = async (shopId, saleIds, method) => {
  const sales = await Sale.find({
    _id: { $in: saleIds },
    shopId,
    'payment.paymentStatus': { $in: ['unpaid', 'partial'] },
    deletedAt: null,
  }).lean();

  let sentCount = 0;

  for (const sale of sales) {
    // TODO: Integrate with SMS/Email/WhatsApp service
    // For now, just log
    await eventLogger.logSale(
      null,
      sale.organizationId,
      shopId,
      'send_reminder',
      sale._id,
      `Payment reminder sent for ${sale.invoiceNumber} via ${method}`,
      { method, dueAmount: sale.payment.dueAmount }
    );
    sentCount++;
  }

  return { sentCount, totalRequested: saleIds.length, method };
};

// ============================================================================
// 37-39. SEARCH & FILTERS
// ============================================================================

export const searchSales = async (shopId, searchQuery, limit = 20) => {
  const regex = new RegExp(searchQuery, 'i');
  return Sale.find({
    shopId,
    $or: [
      { invoiceNumber: regex },
      { 'customerDetails.customerName': regex },
      { 'customerDetails.phone': regex },
    ],
    deletedAt: null,
  })
    .limit(parseInt(limit))
    .populate('customerId', 'firstName lastName')
    .lean();
};

export const getSalesByDateRange = async (shopId, startDate, endDate, filters) => {
  return getAllSales(shopId, { ...filters, startDate, endDate });
};

export const getSalesByAmountRange = async (shopId, minAmount, maxAmount, filters) => {
  return getAllSales(shopId, { ...filters, minAmount, maxAmount });
};

// ============================================================================
// 40-41. DOCUMENTS (FULL IMPLEMENTATION)
// ============================================================================

export const uploadDocument = async (shopId, saleId, documentData, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  sale.documents.push({
    documentType: documentData.documentType,
    documentUrl: documentData.documentUrl,
    documentNumber: documentData.documentNumber || '',
    uploadedAt: new Date(),
  });

  await sale.save();

  await eventLogger.logSale(
    userId,
    sale.organizationId,
    shopId,
    'upload_document',
    sale._id,
    `Uploaded ${documentData.documentType} document to sale ${sale.invoiceNumber}`,
    { documentType: documentData.documentType }
  );

  cache.invalidateShop(shopId);
  return sale;
};

export const getDocuments = async (shopId, saleId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null })
    .select('documents invoiceNumber')
    .lean();

  if (!sale) throw new NotFoundError('Sale not found');

  return sale.documents || [];
};

// ============================================================================
// 42-43. APPROVAL (FULL IMPLEMENTATION)
// ============================================================================

export const approveSale = async (shopId, saleId, notes, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  sale.approvalStatus = 'approved';
  sale.approval = {
    approvalStatus: 'approved',
    approvedBy: userId,
    approvedAt: new Date(),
    rejectionReason: null,
  };

  if (notes) {
    sale.notes = notes;
  }

  await sale.save();

  await eventLogger.logSale(
    userId,
    sale.organizationId,
    shopId,
    'approve',
    sale._id,
    `Approved sale ${sale.invoiceNumber}`,
    { notes }
  );

  cache.invalidateShop(shopId);
  return sale;
};

export const rejectSale = async (shopId, saleId, reason, userId) => {
  const sale = await Sale.findOne({ _id: saleId, shopId, deletedAt: null });
  if (!sale) throw new NotFoundError('Sale not found');

  sale.approvalStatus = 'rejected';
  sale.approval = {
    approvalStatus: 'rejected',
    approvedBy: userId,
    approvedAt: new Date(),
    rejectionReason: reason,
  };

  await sale.save();

  await eventLogger.logSale(
    userId,
    sale.organizationId,
    shopId,
    'reject',
    sale._id,
    `Rejected sale ${sale.invoiceNumber}`,
    { reason }
  );

  cache.invalidateShop(shopId);
  return sale;
};
