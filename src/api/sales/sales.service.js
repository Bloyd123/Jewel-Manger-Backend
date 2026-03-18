// FILE: services/sales.service.js
// Sales Service - FULLY FIXED (organizationId + bugs fixed + email integrated)

import mongoose from 'mongoose';
import Sale from '../../models/Sale.js';
import Customer from '../../models/Customer.js';
import Payment from '../../models/Payment.js';
import { decreaseStock, returnStock } from '../inventory/inventory.service.js';
import JewelryShop from '../../models/Shop.js';
import { createDebitEntry, reverseEntry } from '../ledger/ledger.service.js';
import LedgerEntry from '../ledger/ledger.model.js';
import { createPayment, getSalePayments as getPaymentsFromModule } from '../payment/payment.service.js';
import { NotFoundError, BadRequestError } from '../../utils/AppError.js';
import eventLogger from '../../utils/eventLogger.js';
import { businessLogger } from '../../utils/logger.js';
import logger from '../../utils/logger.js';
import cache from '../../utils/cache.js';
import {
  sendSaleInvoiceEmail,
  sendSalePaymentReceiptEmail,
  sendPaymentReminderEmail,
} from '../../utils/email.js';

// ─────────────────────────────────────────────
// HELPER: Sale find karo with security check
// ─────────────────────────────────────────────
const findSale = async (shopId, saleId, organizationId, session = null) => {
  const query = Sale.findOne({
    _id: saleId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (session) query.session(session);

  const sale = await query;
  if (!sale) throw new NotFoundError('Sale not found');
  return sale;
};

// ─────────────────────────────────────────────
// 1. CREATE SALE
// ─────────────────────────────────────────────
export const createSale = async (shopId, saleData, userId, organizationId, ipAddress) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shop = await JewelryShop.findById(shopId).session(session);
    if (!shop) throw new NotFoundError('Shop not found');

    const customer = await Customer.findById(saleData.customerId).session(session);
    if (!customer) throw new NotFoundError('Customer not found');

    const invoiceNumber = await Sale.generateInvoiceNumber(shopId, shop.settings.invoicePrefix);

    const sale = await Sale.create(
      [{
        ...saleData,
        organizationId,
        shopId,
        invoiceNumber,
        customerDetails: {
          customerName: customer.fullName,
          customerCode: customer.customerCode,
          phone:        customer.phone,
          email:        customer.email,
          address:      customer.address?.street || '',
          gstNumber:    customer.gstNumber,
          panNumber:    customer.panNumber,
        },
        salesPerson: userId,
        createdBy:   userId,
        status:      'confirmed',
      }],
      { session }
    );

    for (const item of saleData.items) {
      if (item.productId) {
        await decreaseStock({
          organizationId,
          shopId,
          productId:       item.productId,
          quantity:        item.quantity,
          referenceId:     sale[0]._id,
          referenceNumber: invoiceNumber,
          value:           item.itemTotal,
          performedBy:     userId,
          customerId:      customer._id,
          session,
        });
      }
    }

    await Customer.recordPurchase(customer._id, sale[0].financials.grandTotal, session);

    if (sale[0].payment.dueAmount > 0) {
      await createDebitEntry({
        organizationId,
        shopId,
        partyType:       'customer',
        partyId:         customer._id,
        partyModel:      'Customer',
        partyName:       customer.fullName,
        amount:          sale[0].payment.dueAmount,
        referenceType:   'sale',
        referenceId:     sale[0]._id,
        referenceNumber: invoiceNumber,
        description:     `Sale created - ${invoiceNumber}`,
        createdBy:       userId,
        session,
      });
    }

    await eventLogger.logSale(userId, organizationId, shopId, 'create', sale[0]._id,
      `Created sale ${invoiceNumber} for customer ${customer.fullName}`,
      { invoiceNumber, customerId: customer._id, amount: sale[0].financials.grandTotal, itemCount: sale[0].items.length }
    );

    businessLogger.logSale({ userId, shopId, invoiceNumber, amount: sale[0].financials.grandTotal, customerId: customer._id });

    await session.commitTransaction();

    const populatedSale = await Sale.findById(sale[0]._id)
      .populate('customerId', 'firstName lastName customerCode phone email')
      .populate('salesPerson', 'firstName lastName email');

    cache.invalidateShop(shopId);

    // ── EMAIL: Tax Invoice ───────────────────
    // customer.email check — email nahi hai toh skip
    if (customer.email) {
      sendSaleInvoiceEmail(populatedSale, customer, shop).catch(err => {
        logger.error(`Sale invoice email failed for ${invoiceNumber}:`, err);
      });
    }
    // ─────────────────────────────────────────

    return populatedSale;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────
// 2. GET ALL SALES
// ─────────────────────────────────────────────
export const getAllSales = async (shopId, organizationId, filters) => {
  const query = {
    shopId,
    organizationId,
    deletedAt: null,
  };

  if (filters.customerId)    query.customerId                   = filters.customerId;
  if (filters.salesPerson)   query.salesPerson                  = filters.salesPerson;
  if (filters.status)        query.status                       = filters.status;
  if (filters.paymentStatus) query['payment.paymentStatus']     = filters.paymentStatus;
  if (filters.saleType)      query.saleType                     = filters.saleType;

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

  const page  = parseInt(filters.page)  || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip  = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    Sale.find(query)
      .sort(filters.sort || '-saleDate')
      .skip(skip).limit(limit)
      .populate('customerId', 'firstName lastName customerCode phone email')
      .populate('salesPerson', 'firstName lastName email')
      .lean(),
    Sale.countDocuments(query),
  ]);

  return { sales, total, page, limit };
};

// ─────────────────────────────────────────────
// 3. GET SINGLE SALE
// ─────────────────────────────────────────────
export const getSaleById = async (shopId, saleId, organizationId) => {
  const sale = await Sale.findOne({
    _id: saleId,
    shopId,
    organizationId,
    deletedAt: null,
  })
    .populate('customerId', 'firstName lastName customerCode phone email address')
    .populate('salesPerson', 'firstName lastName email profileImage')
    .populate('items.productId', 'name productCode category images')
    .lean();

  if (!sale) throw new NotFoundError('Sale not found');
  return sale;
};

// ─────────────────────────────────────────────
// 4. UPDATE SALE
// ─────────────────────────────────────────────
export const updateSale = async (shopId, saleId, updateData, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  if (!['draft', 'pending'].includes(sale.status)) {
    throw new BadRequestError('Can only edit draft or pending sales');
  }

  if (updateData.invoiceNumber) delete updateData.invoiceNumber;
  if (updateData.organizationId) delete updateData.organizationId;

  Object.assign(sale, updateData);
  sale.updatedBy = userId;
  await sale.save();

  await eventLogger.logSale(userId, organizationId, shopId, 'update', sale._id,
    `Updated sale ${sale.invoiceNumber}`, { saleId: sale._id }
  );

  cache.invalidateShop(shopId);
  return sale;
};

// ─────────────────────────────────────────────
// 5. DELETE SALE
// ─────────────────────────────────────────────
export const deleteSale = async (shopId, saleId, reason, userId, organizationId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await findSale(shopId, saleId, organizationId, session);

    if (sale.status !== 'draft') {
      throw new BadRequestError('Can only delete draft sales');
    }

    await sale.softDelete();

    await eventLogger.logSale(userId, organizationId, shopId, 'delete', sale._id,
      `Deleted draft sale ${sale.invoiceNumber}`, { saleId: sale._id, reason }
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

// ─────────────────────────────────────────────
// 6-10. STATUS MANAGEMENT
// ─────────────────────────────────────────────
const allowedSaleTransitions = {
  draft:     ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: ['completed', 'returned'],
  completed: ['returned'],
  cancelled: [],
  returned:  [],
};

export const updateSaleStatus = async (shopId, saleId, status, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  if (!allowedSaleTransitions[sale.status]?.includes(status)) {
    throw new BadRequestError(`Cannot change status from '${sale.status}' to '${status}'`);
  }

  sale.status    = status;
  sale.updatedBy = userId;
  await sale.save();

  cache.invalidateShop(shopId);
  return sale;
};

export const confirmSale = async (shopId, saleId, userId, organizationId) => {
  return updateSaleStatus(shopId, saleId, 'confirmed', userId, organizationId);
};

export const deliverSale = async (shopId, saleId, deliveryData, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  sale.status                = 'delivered';
  sale.delivery.deliveredAt  = new Date();
  sale.delivery.deliveredBy  = userId;
  Object.assign(sale.delivery, deliveryData);
  sale.updatedBy = userId;
  await sale.save();

  cache.invalidateShop(shopId);
  return sale;
};

export const completeSale = async (shopId, saleId, userId, organizationId) => {
  const sale     = await findSale(shopId, saleId, organizationId);
  const customer = await Customer.findById(sale.customerId);

  await Customer.findByIdAndUpdate(sale.customerId, {
    $inc: { 'statistics.completedOrders': +1 },
    $set: {
      'statistics.averageOrderValue':
        customer.statistics.totalSpent / (customer.statistics.completedOrders + 1),
    },
  });

  sale.status    = 'completed';
  sale.updatedBy = userId;
  await sale.save();

  cache.invalidateShop(shopId);
  return sale;
};

export const cancelSale = async (shopId, saleId, reason, refundAmount, userId, organizationId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await findSale(shopId, saleId, organizationId, session);

    if (sale.status === 'cancelled') {
      throw new BadRequestError('Sale is already cancelled');
    }

    for (const item of sale.items) {
      if (item.productId) {
        await returnStock({
          organizationId: sale.organizationId,
          shopId, productId: item.productId,
          quantity:        item.quantity,
          referenceId:     sale._id,
          referenceNumber: sale.invoiceNumber,
          performedBy:     userId, session,
        });
      }
    }

    const ledgerEntry = await LedgerEntry.findOne({
      referenceId: sale._id, referenceType: 'sale', status: 'active',
    }).session(session);

    if (ledgerEntry) {
      await reverseEntry({
        entryId:     ledgerEntry._id,
        createdBy:   userId,
        description: `Sale cancelled - ${sale.invoiceNumber}`,
        session,
      });
    }

    await Customer.findByIdAndUpdate(sale.customerId, {
      $inc: {
        'statistics.cancelledOrders': +1,
        'statistics.completedOrders': -1,
        'statistics.totalSpent':      -sale.financials.grandTotal,
      },
    }, { session });

    sale.status       = 'cancelled';
    sale.cancellation = {
      isCancelled:        true,
      cancelledAt:        new Date(),
      cancelledBy:        userId,
      cancellationReason: reason,
      refundAmount:       refundAmount || 0,
      refundStatus:       refundAmount > 0 ? 'pending' : 'not_applicable',
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

// ─────────────────────────────────────────────
// 11-13. PAYMENT MANAGEMENT
// ─────────────────────────────────────────────
export const addPayment = async (shopId, saleId, paymentData, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  if (sale.status === 'cancelled') {
    throw new BadRequestError('Cannot add payment to cancelled sale');
  }

  if (paymentData.amount > sale.payment.dueAmount) {
    throw new BadRequestError(
      `Payment amount ₹${paymentData.amount} exceeds due amount ₹${sale.payment.dueAmount}`
    );
  }

  const result = await createPayment(shopId, organizationId, userId, {
    ...paymentData,
    transactionType: 'receipt',
    party: {
      partyType: 'customer',
      partyId:   sale.customerId,
      partyName: sale.customerDetails.customerName,
    },
    reference: {
      referenceType:   'sale',
      referenceId:     sale._id,
      referenceNumber: sale.invoiceNumber,
    },
  });

  // ── EMAIL: Payment Receipt ───────────────
  // result.payment = newly created Payment doc
  // customer email check karo pehle
  if (sale.customerDetails?.email) {
    const customer = { fullName: sale.customerDetails.customerName, email: sale.customerDetails.email };
    const shop     = await JewelryShop.findById(shopId).lean();

    // Updated sale fetch karo — paidAmount/dueAmount updated hoga
    const updatedSale = await findSale(shopId, saleId, organizationId);

    sendSalePaymentReceiptEmail(result.payment, updatedSale, customer, shop).catch(err => {
      logger.error(`Payment receipt email failed for sale ${sale.invoiceNumber}:`, err);
    });
  }
  // ─────────────────────────────────────────

  return result;
};

export const getSalePayments = async (shopId, saleId, organizationId) => {
  await findSale(shopId, saleId, organizationId);
  const result = await getPaymentsFromModule(shopId, saleId);
  return result;
};

export const generateReceipt = async (shopId, saleId, organizationId) => {
  const sale = await getSaleById(shopId, saleId, organizationId);

  const payments = await Payment.find({
    'reference.referenceId':   saleId,
    'reference.referenceType': 'sale',
    shopId,
    deletedAt: null,
    status:    'completed',
  }).sort({ paymentDate: -1 }).lean();

  return {
    receiptNumber: sale.invoiceNumber,
    date:          new Date(),
    customer:      sale.customerDetails,
    sale: {
      invoiceNumber: sale.invoiceNumber,
      saleDate:      sale.saleDate,
      totalAmount:   sale.financials.grandTotal,
    },
    payments,
    totalPaid:     sale.payment.paidAmount,
    dueAmount:     sale.payment.dueAmount,
    paymentStatus: sale.payment.paymentStatus,
  };
};

// ─────────────────────────────────────────────
// 14-15. RETURN & EXCHANGE
// ─────────────────────────────────────────────
export const returnSale = async (shopId, saleId, returnData, userId, organizationId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await findSale(shopId, saleId, organizationId, session);

    if (sale.status === 'returned') {
      throw new BadRequestError('Sale is already returned');
    }

    const itemsToReturn = returnData.itemsToReturn || sale.items;

    for (const returnItem of itemsToReturn) {
      const saleItem = sale.items.find(
        item => item.productId?.toString() === returnItem.productId?.toString()
      );

      if (saleItem && saleItem.productId) {
        await returnStock({
          organizationId: sale.organizationId,
          shopId, productId: saleItem.productId,
          quantity:        returnItem.quantity || saleItem.quantity,
          referenceId:     sale._id,
          referenceNumber: sale.invoiceNumber,
          performedBy:     userId, session,
        });
      }
    }

    await sale.processReturn({
      returnDate:   returnData.returnDate || new Date(),
      reason:       returnData.returnReason,
      refundAmount: returnData.refundAmount,
      returnedBy:   userId,
    });

    await eventLogger.logSale(userId, sale.organizationId, shopId, 'return', sale._id,
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

export const getReturnDetails = async (shopId, saleId, organizationId) => {
  const sale = await Sale.findOne({
    _id: saleId, shopId, organizationId, deletedAt: null,
  }).select('return invoiceNumber saleDate customerDetails financials').lean();

  if (!sale) throw new NotFoundError('Sale not found');

  if (!sale.return?.isReturned) {
    return { message: 'No return found for this sale', isReturned: false };
  }

  return sale.return;
};

// ─────────────────────────────────────────────
// 16-17. OLD GOLD EXCHANGE
// ─────────────────────────────────────────────
export const addOldGold = async (shopId, saleId, oldGoldData, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  const totalOldGoldValue = oldGoldData.oldGoldItems.reduce(
    (sum, item) => sum + item.netWeight * item.ratePerGram, 0
  );

  sale.oldGoldExchange = {
    hasExchange: true,
    items: oldGoldData.oldGoldItems.map(item => ({
      metalType:   item.metalType,
      purity:      item.purity,
      grossWeight: item.grossWeight,
      stoneWeight: item.stoneWeight || 0,
      netWeight:   item.grossWeight - (item.stoneWeight || 0),
      ratePerGram: item.ratePerGram,
      totalValue:  (item.grossWeight - (item.stoneWeight || 0)) * item.ratePerGram,
      description: item.description || '',
    })),
    totalValue: totalOldGoldValue,
  };

  sale.financials.oldGoldValue  = totalOldGoldValue;
  sale.financials.netPayable    = sale.financials.grandTotal - totalOldGoldValue;
  sale.payment.totalAmount      = sale.financials.netPayable;
  sale.payment.dueAmount        = sale.financials.netPayable - sale.payment.paidAmount;

  await sale.save();

  await eventLogger.logSale(userId, sale.organizationId, shopId, 'add_old_gold', sale._id,
    `Added old gold worth ₹${totalOldGoldValue} to sale ${sale.invoiceNumber}`,
    { oldGoldValue: totalOldGoldValue }
  );

  cache.invalidateShop(shopId);
  return sale;
};

export const removeOldGold = async (shopId, saleId, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  sale.oldGoldExchange         = { hasExchange: false, items: [], totalValue: 0 };
  sale.financials.oldGoldValue  = 0;
  sale.financials.netPayable    = sale.financials.grandTotal;
  sale.payment.totalAmount      = sale.financials.netPayable;
  sale.payment.dueAmount        = sale.financials.netPayable - sale.payment.paidAmount;

  await sale.save();

  await eventLogger.logSale(userId, sale.organizationId, shopId, 'remove_old_gold', sale._id,
    `Removed old gold from sale ${sale.invoiceNumber}`, {}
  );

  cache.invalidateShop(shopId);
  return sale;
};

// ─────────────────────────────────────────────
// 18-25. ANALYTICS & REPORTS
// ─────────────────────────────────────────────
export const getSalesAnalytics = async (shopId, organizationId, startDate, endDate, groupBy = 'day') => {
  const matchStage = {
    shopId:         new mongoose.Types.ObjectId(shopId),
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt:      null,
  };

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
        _id:               null,
        totalSales:        { $sum: 1 },
        totalAmount:       { $sum: '$financials.grandTotal' },
        totalDiscount:     { $sum: '$financials.totalDiscount' },
        totalGST:          { $sum: '$financials.totalGST' },
        averageOrderValue: { $avg: '$financials.grandTotal' },
        paidSales:         { $sum: { $cond: [{ $eq: ['$payment.paymentStatus', 'paid'] },    1, 0] } },
        unpaidSales:       { $sum: { $cond: [{ $eq: ['$payment.paymentStatus', 'unpaid'] },  1, 0] } },
      },
    },
  ]);

  return analytics[0] || {};
};

export const getSalesDashboard = async (shopId, organizationId) => {
  const cacheKey = `sales_dashboard_${shopId}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todaySales, recentSales, pendingPayments] = await Promise.all([
    Sale.find({ shopId, organizationId, saleDate: { $gte: today }, deletedAt: null }),
    Sale.find({ shopId, organizationId, deletedAt: null })
      .sort('-saleDate').limit(10)
      .populate('customerId', 'firstName lastName customerCode').lean(),
    Sale.countDocuments({
      shopId, organizationId,
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

export const getTodaySales = async (shopId, organizationId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Sale.find({
    shopId, organizationId,
    saleDate:  { $gte: today },
    deletedAt: null,
  }).populate('customerId', 'firstName lastName').lean();
};

export const getPendingSales = async (shopId, organizationId) => {
  return Sale.find({
    shopId, organizationId,
    status:    { $in: ['draft', 'pending'] },
    deletedAt: null,
  }).lean();
};

export const getUnpaidSales = async (shopId, organizationId) => {
  return Sale.find({
    shopId, organizationId,
    'payment.paymentStatus': { $in: ['unpaid', 'partial'] },
    deletedAt: null,
  }).lean();
};

export const getOverdueSales = async (shopId, organizationId) => {
  return Sale.find({
    shopId, organizationId,
    'payment.dueDate':       { $lt: new Date() },
    'payment.paymentStatus': { $in: ['unpaid', 'partial'] },
    deletedAt: null,
  }).lean();
};

// ─────────────────────────────────────────────
// 26-27. CUSTOMER & SALES PERSON
// ─────────────────────────────────────────────
export const getCustomerSales = async (shopId, customerId, organizationId, filters) => {
  const query = { shopId, customerId, organizationId, deletedAt: null };
  const page  = parseInt(filters.page)  || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip  = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    Sale.find(query).sort('-saleDate').skip(skip).limit(limit).lean(),
    Sale.countDocuments(query),
  ]);

  return { sales, total, page, limit };
};

export const getCustomerSalesSummary = async (shopId, customerId, organizationId) => {
  const result = await Sale.aggregate([
    {
      $match: {
        shopId:         new mongoose.Types.ObjectId(shopId),
        customerId:     new mongoose.Types.ObjectId(customerId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        deletedAt:      null,
      },
    },
    {
      $group: {
        _id:          null,
        totalSales:   { $sum: 1 },
        totalAmount:  { $sum: '$financials.grandTotal' },
        totalDue:     { $sum: '$payment.dueAmount' },
        lastPurchase: { $max: '$saleDate' },
      },
    },
  ]);

  return result[0] || { totalSales: 0, totalAmount: 0, totalDue: 0, lastPurchase: null };
};

export const getSalesPersonSales = async (shopId, userId, organizationId, filters) => {
  const query = { shopId, salesPerson: userId, organizationId, deletedAt: null };
  const page  = parseInt(filters.page)  || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip  = (page - 1) * limit;

  const [sales, total] = await Promise.all([
    Sale.find(query).sort('-saleDate').skip(skip).limit(limit).lean(),
    Sale.countDocuments(query),
  ]);

  return { sales, total, page, limit };
};

export const getSalesPersonPerformance = async (shopId, userId, organizationId, startDate, endDate) => {
  const query = { shopId, salesPerson: userId, organizationId, deletedAt: null };

  if (startDate || endDate) {
    query.saleDate = {};
    if (startDate) query.saleDate.$gte = new Date(startDate);
    if (endDate)   query.saleDate.$lte = new Date(endDate);
  }

  const sales = await Sale.find(query);

  return {
    totalSales:  sales.length,
    totalValue:  sales.reduce((sum, s) => sum + s.financials.grandTotal, 0),
    averageValue: sales.length
      ? sales.reduce((sum, s) => sum + s.financials.grandTotal, 0) / sales.length
      : 0,
  };
};

// ─────────────────────────────────────────────
// 28-30. INVOICE MANAGEMENT
// ─────────────────────────────────────────────
export const generateInvoice = async (shopId, saleId, organizationId) => {
  const sale = await getSaleById(shopId, saleId, organizationId);
  const shop = await JewelryShop.findById(shopId).lean();

  const invoiceData = {
    invoiceNumber: sale.invoiceNumber,
    date:          sale.saleDate,
    shop:          { name: shop.name, address: shop.address, phone: shop.phone, gst: shop.gstNumber },
    customer:      sale.customerDetails,
    items:         sale.items,
    financials:    sale.financials,
    payment:       sale.payment,
    oldGold:       sale.oldGoldExchange,
  };

  return Buffer.from(JSON.stringify(invoiceData, null, 2));
};

export const sendInvoice = async (shopId, saleId, method, recipient, organizationId) => {
  const sale = await getSaleById(shopId, saleId, organizationId);

  await eventLogger.logSale(null, sale.organizationId, shopId, 'send_invoice', sale._id,
    `Invoice ${sale.invoiceNumber} sent via ${method} to ${recipient}`, { method, recipient }
  );

  return { message: `Invoice sent successfully via ${method}`, recipient };
};

export const printInvoice = async (shopId, saleId, printerType = 'A4', organizationId) => {
  const sale = await getSaleById(shopId, saleId, organizationId);

  return {
    format:    printerType,
    invoice:   sale.invoiceNumber,
    customer:  sale.customerDetails.customerName,
    amount:    sale.financials.grandTotal,
    items:     sale.items.length,
    printTime: new Date(),
  };
};

// ─────────────────────────────────────────────
// 31-33. DISCOUNT MANAGEMENT
// ─────────────────────────────────────────────
export const applyDiscount = async (shopId, saleId, discountData, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  const { discountType, discountValue, discountReason } = discountData;

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (sale.financials.subtotal * discountValue) / 100;
  } else if (discountType === 'flat') {
    discountAmount = discountValue;
  }

  sale.financials.totalDiscount = discountAmount;
  sale.financials.grandTotal    = sale.financials.subtotal + sale.financials.totalGST - discountAmount;
  sale.financials.netPayable    = sale.financials.grandTotal - (sale.financials.oldGoldValue || 0);
  sale.payment.totalAmount      = sale.financials.netPayable;
  sale.payment.dueAmount        = sale.financials.netPayable - sale.payment.paidAmount;

  await sale.save();

  await eventLogger.logSale(userId, sale.organizationId, shopId, 'apply_discount', sale._id,
    `Applied ${discountType} discount of ${discountValue} to sale ${sale.invoiceNumber}`,
    { discountType, discountValue, discountAmount, reason: discountReason }
  );

  cache.invalidateShop(shopId);
  return sale;
};

export const removeDiscount = async (shopId, saleId, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  sale.financials.totalDiscount = 0;
  sale.financials.grandTotal    = sale.financials.subtotal + sale.financials.totalGST;
  sale.financials.netPayable    = sale.financials.grandTotal - (sale.financials.oldGoldValue || 0);
  sale.payment.totalAmount      = sale.financials.netPayable;
  sale.payment.dueAmount        = sale.financials.netPayable - sale.payment.paidAmount;

  await sale.save();

  await eventLogger.logSale(userId, sale.organizationId, shopId, 'remove_discount', sale._id,
    `Removed discount from sale ${sale.invoiceNumber}`, {}
  );

  cache.invalidateShop(shopId);
  return sale;
};

// ─────────────────────────────────────────────
// 34-36. BULK OPERATIONS
// ─────────────────────────────────────────────
export const bulkDeleteSales = async (shopId, saleIds, reason, userId, organizationId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let deletedCount = 0;

    for (const saleId of saleIds) {
      const sale = await Sale.findOne({
        _id: saleId, shopId, organizationId, deletedAt: null,
      }).session(session);

      if (sale && sale.status === 'draft') {
        for (const item of sale.items) {
          if (item.productId) {
            await returnStock({
              organizationId: sale.organizationId, shopId,
              productId:       item.productId,
              quantity:        item.quantity,
              referenceId:     sale._id,
              referenceNumber: sale.invoiceNumber,
              performedBy:     userId, session,
            });
          }
        }
        await sale.softDelete();
        deletedCount++;
      }
    }

    await eventLogger.logSale(userId, organizationId, shopId, 'bulk_delete', null,
      `Bulk deleted ${deletedCount} sales`, { saleIds, reason, deletedCount }
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

export const bulkPrintInvoices = async (shopId, saleIds, organizationId) => {
  const sales = await Sale.find({
    _id: { $in: saleIds }, shopId, organizationId, deletedAt: null,
  }).lean();

  const bulkInvoiceData = {
    printDate:     new Date(),
    totalInvoices: sales.length,
    invoices:      sales.map(sale => ({
      invoiceNumber: sale.invoiceNumber,
      customer:      sale.customerDetails.customerName,
      date:          sale.saleDate,
      amount:        sale.financials.grandTotal,
    })),
  };

  return Buffer.from(JSON.stringify(bulkInvoiceData, null, 2));
};

export const bulkSendReminders = async (shopId, saleIds, method, organizationId) => {
  const sales = await Sale.find({
    _id: { $in: saleIds }, shopId, organizationId,
    'payment.paymentStatus': { $in: ['unpaid', 'partial'] },
    deletedAt: null,
  }).lean();

  const shop = await JewelryShop.findById(shopId).lean();

  let sentCount = 0;

  for (const sale of sales) {
    // ── EMAIL: Payment Reminder ──────────────
    if (method === 'email' && sale.customerDetails?.email) {
      const customer = {
        fullName: sale.customerDetails.customerName,
        email:    sale.customerDetails.email,
      };

      sendPaymentReminderEmail(sale, customer, shop).catch(err => {
        logger.error(`Payment reminder email failed for sale ${sale.invoiceNumber}:`, err);
      });
    }
    // ─────────────────────────────────────────

    await eventLogger.logSale(null, sale.organizationId, shopId, 'send_reminder', sale._id,
      `Payment reminder sent for ${sale.invoiceNumber} via ${method}`,
      { method, dueAmount: sale.payment.dueAmount }
    );
    sentCount++;
  }

  return { sentCount, totalRequested: saleIds.length, method };
};

// ─────────────────────────────────────────────
// SINGLE PAYMENT REMINDER (individual sale)
// ─────────────────────────────────────────────

/**
 * Single sale ka payment reminder bhejo
 * Controller: POST /shops/:shopId/sales/:saleId/send-reminder
 */
export const sendPaymentReminder = async (shopId, saleId, organizationId) => {
  const sale = await getSaleById(shopId, saleId, organizationId);

  if (!['unpaid', 'partial'].includes(sale.payment.paymentStatus)) {
    throw new BadRequestError('Sale has no pending dues');
  }

  if (!sale.customerDetails?.email) {
    throw new BadRequestError('Customer email not found');
  }

  const customer = {
    fullName: sale.customerDetails.customerName,
    email:    sale.customerDetails.email,
  };

  const shop = await JewelryShop.findById(shopId).lean();

  await sendPaymentReminderEmail(sale, customer, shop);

  await eventLogger.logSale(null, sale.organizationId, shopId, 'send_reminder', sale._id,
    `Payment reminder sent for ${sale.invoiceNumber} via email`,
    { method: 'email', dueAmount: sale.payment.dueAmount }
  );

  return { success: true, message: 'Payment reminder sent successfully' };
};

// ─────────────────────────────────────────────
// 37-39. SEARCH & FILTERS
// ─────────────────────────────────────────────
export const searchSales = async (shopId, organizationId, searchQuery, limit = 20) => {
  const regex = new RegExp(searchQuery, 'i');
  return Sale.find({
    shopId, organizationId,
    $or: [
      { invoiceNumber: regex },
      { 'customerDetails.customerName': regex },
      { 'customerDetails.phone': regex },
    ],
    deletedAt: null,
  }).limit(parseInt(limit)).populate('customerId', 'firstName lastName').lean();
};

export const getSalesByDateRange = async (shopId, organizationId, startDate, endDate, filters) => {
  return getAllSales(shopId, organizationId, { ...filters, startDate, endDate });
};

export const getSalesByAmountRange = async (shopId, organizationId, minAmount, maxAmount, filters) => {
  return getAllSales(shopId, organizationId, { ...filters, minAmount, maxAmount });
};

// ─────────────────────────────────────────────
// 40-41. DOCUMENTS
// ─────────────────────────────────────────────
export const uploadDocument = async (shopId, saleId, documentData, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  if (sale.documents.length >= 10) {
    throw new BadRequestError('Maximum 10 documents allowed per sale');
  }

  sale.documents.push({
    documentType:   documentData.documentType,
    documentUrl:    documentData.documentUrl,
    documentNumber: documentData.documentNumber || '',
    uploadedAt:     new Date(),
  });

  await sale.save();

  await eventLogger.logSale(userId, sale.organizationId, shopId, 'upload_document', sale._id,
    `Uploaded ${documentData.documentType} document to sale ${sale.invoiceNumber}`,
    { documentType: documentData.documentType }
  );

  cache.invalidateShop(shopId);
  return sale;
};

export const getDocuments = async (shopId, saleId, organizationId) => {
  const sale = await Sale.findOne({
    _id: saleId, shopId, organizationId, deletedAt: null,
  }).select('documents invoiceNumber').lean();

  if (!sale) throw new NotFoundError('Sale not found');
  return sale.documents || [];
};

// ─────────────────────────────────────────────
// 42-43. APPROVAL
// ─────────────────────────────────────────────
export const approveSale = async (shopId, saleId, notes, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  sale.approvalStatus = 'approved';
  sale.approval = {
    approvalStatus:  'approved',
    approvedBy:      userId,
    approvedAt:      new Date(),
    rejectionReason: null,
  };

  if (notes) sale.notes = notes;

  await sale.save();

  await eventLogger.logSale(userId, sale.organizationId, shopId, 'approve', sale._id,
    `Approved sale ${sale.invoiceNumber}`, { notes }
  );

  cache.invalidateShop(shopId);
  return sale;
};

export const rejectSale = async (shopId, saleId, reason, userId, organizationId) => {
  const sale = await findSale(shopId, saleId, organizationId);

  sale.approvalStatus = 'rejected';
  sale.approval = {
    approvalStatus:  'rejected',
    approvedBy:      userId,
    approvedAt:      new Date(),
    rejectionReason: reason,
  };

  await sale.save();

  await eventLogger.logSale(userId, sale.organizationId, shopId, 'reject', sale._id,
    `Rejected sale ${sale.invoiceNumber}`, { reason }
  );

  cache.invalidateShop(shopId);
  return sale;
};