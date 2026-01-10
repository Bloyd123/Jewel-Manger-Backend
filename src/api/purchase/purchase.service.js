// FILE: src/api/services/purchase.service.js
// Purchase Module Service - Business Logic Layer

import Purchase from '../../models/Purchase.js';
import Product from '../../models/Product.js';
import Supplier from '../../models/Supplier.js';
import InventoryTransaction from '../../models/InventoryTransaction.js';
import eventLogger from '../../utils/eventLogger.js';
import { businessLogger } from '../../utils/logger.js';
import APIFeatures from '../../utils/apiFeatures.js';
import { getPaginationData } from '../../utils/pagination.js';
import { NotFoundError, BadRequestError, ValidationError } from '../../utils/AppError.js';

// 1. PURCHASE CRUD OPERATIONS

/**
 * Create new purchase order/invoice
 */
export const createPurchase = async (shopId, data, userId) => {
  // 1. Validate supplier exists
  const supplier = await Supplier.findById(data.supplierId);
  if (!supplier) {
    throw new NotFoundError('Supplier not found');
  }

  // 2. Generate purchase number
  const purchaseNumber = await Purchase.generatePurchaseNumber(shopId);

  // 3. Prepare supplier details
  const supplierDetails = {
    supplierName: supplier.businessName,
    supplierCode: supplier.supplierCode,
    contactPerson: supplier.contactPerson?.firstName || '',
    phone: supplier.contactPerson?.phone || '',
    email: supplier.contactPerson?.email || '',
    address: supplier.address ? `${supplier.address.street}, ${supplier.address.city}` : '',
    gstNumber: supplier.gstNumber || '',
  };

  // 4. Create purchase
  const purchase = await Purchase.create({
    ...data,
    shopId,
    purchaseNumber,
    supplierDetails,
    organizationId: supplier.organizationId,
    createdBy: userId,
  });

  // 5. Log activity
  await eventLogger.logPurchase(
    userId,
    supplier.organizationId,
    shopId,
    'create',
    purchase._id,
    `Created purchase ${purchaseNumber}`,
    { purchaseNumber, supplierId: supplier._id, totalAmount: purchase.financials.grandTotal }
  );

  businessLogger.logPurchase({
    userId,
    shopId,
    purchaseNumber,
    amount: purchase.financials.grandTotal,
    supplierId: supplier._id,
  });

  return purchase.populate('supplierId', 'businessName supplierCode contactPerson');
};

/**
 * Get all purchases with filters & pagination
 */
export const getAllPurchases = async (shopId, filters) => {
  const {
    page = 1,
    limit = 20,
    sort = '-purchaseDate',
    supplierId,
    status,
    paymentStatus,
    startDate,
    endDate,
    search,
  } = filters;

  // Build query
  const query = { shopId, deletedAt: null };

  if (supplierId) query.supplierId = supplierId;
  if (status) query.status = status;
  if (paymentStatus) query['payment.paymentStatus'] = paymentStatus;

  // Date range filter
  if (startDate || endDate) {
    query.purchaseDate = {};
    if (startDate) query.purchaseDate.$gte = new Date(startDate);
    if (endDate) query.purchaseDate.$lte = new Date(endDate);
  }

  // Search
  if (search) {
    query.$or = [
      { purchaseNumber: new RegExp(search, 'i') },
      { 'supplierDetails.supplierName': new RegExp(search, 'i') },
    ];
  }

  // Get total count
  const total = await Purchase.countDocuments(query);

  // Execute query with pagination
  const purchases = await Purchase.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('supplierId', 'businessName supplierCode')
    .populate('createdBy', 'firstName lastName')
    .lean();

  return {
    purchases,
    page: parseInt(page),
    limit: parseInt(limit),
    total,
  };
};

/**
 * Get single purchase by ID
 */
export const getPurchaseById = async purchaseId => {
  const purchase = await Purchase.findById(purchaseId)
    .populate('supplierId', 'businessName supplierCode contactPerson address')
    .populate('createdBy', 'firstName lastName email')
    .populate('updatedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .populate('delivery.receivedBy', 'firstName lastName');

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  return purchase;
};

/**
 * Update purchase details (only draft/pending)
 */
export const updatePurchase = async (purchaseId, data, userId) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  // Check if purchase can be edited
  if (!['draft', 'pending'].includes(purchase.status)) {
    throw new BadRequestError('Cannot edit completed or cancelled purchases');
  }

  // Update fields
  Object.assign(purchase, data);
  purchase.updatedBy = userId;

  await purchase.save();

  // Log activity
  await eventLogger.logPurchase(
    userId,
    purchase.organizationId,
    purchase.shopId,
    'update',
    purchase._id,
    `Updated purchase ${purchase.purchaseNumber}`,
    { purchaseNumber: purchase.purchaseNumber }
  );

  return purchase.populate('supplierId', 'businessName supplierCode');
};

/**
 * Soft delete purchase (only draft status)
 */
export const deletePurchase = async purchaseId => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  if (purchase.status !== 'draft') {
    throw new BadRequestError('Only draft purchases can be deleted');
  }

  await purchase.softDelete();

  // Log activity
  await eventLogger.logPurchase(
    purchase.createdBy,
    purchase.organizationId,
    purchase.shopId,
    'delete',
    purchase._id,
    `Deleted purchase ${purchase.purchaseNumber}`,
    { purchaseNumber: purchase.purchaseNumber }
  );

  return { message: 'Purchase deleted successfully' };
};

// 2. PURCHASE STATUS MANAGEMENT

/**
 * Update purchase status
 */
export const updatePurchaseStatus = async (purchaseId, status, userId) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  const oldStatus = purchase.status;
  purchase.status = status;
  purchase.updatedBy = userId;

  await purchase.save();

  // Log activity
  await eventLogger.logPurchase(
    userId,
    purchase.organizationId,
    purchase.shopId,
    'status_update',
    purchase._id,
    `Changed purchase status from ${oldStatus} to ${status}`,
    { purchaseNumber: purchase.purchaseNumber, oldStatus, newStatus: status }
  );

  return purchase;
};

/**
 * Mark purchase as received (update inventory)
 */
export const receivePurchase = async (purchaseId, receiveData, userId) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  if (purchase.status === 'completed') {
    throw new BadRequestError('Purchase already marked as received');
  }

  // Update purchase status
  purchase.status = 'completed';
  purchase.delivery.receivedDate = receiveData.receivedDate || new Date();
  purchase.delivery.receivedBy = receiveData.receivedBy || userId;
  if (receiveData.notes) purchase.notes = receiveData.notes;

  await purchase.save();

  // Update inventory for each item
  for (const item of purchase.items) {
    if (item.productId) {
      // Update existing product stock
      const product = await Product.findById(item.productId);
      if (product) {
        await product.updateStock(item.quantity, 'add');

        // Create inventory transaction
        await InventoryTransaction.create({
          organizationId: purchase.organizationId,
          shopId: purchase.shopId,
          productId: product._id,
          productCode: product.productCode,
          transactionType: 'PURCHASE',
          quantity: item.quantity,
          previousQuantity: product.stock.quantity - item.quantity,
          newQuantity: product.stock.quantity,
          transactionDate: new Date(),
          referenceType: 'purchase',
          referenceId: purchase._id,
          referenceNumber: purchase.purchaseNumber,
          value: item.itemTotal,
          performedBy: userId,
          reason: 'Purchase received',
        });
      }
    } else {
      // Create new product if productId is null
      const newProduct = await Product.create({
        organizationId: purchase.organizationId,
        shopId: purchase.shopId,
        name: item.productName,
        productCode: await Product.generateProductCode(purchase.shopId),
        category: item.category || 'other',
        metal: {
          type: item.metalType,
          purity: item.purity,
        },
        weight: {
          grossWeight: item.grossWeight,
          stoneWeight: item.stoneWeight,
          netWeight: item.netWeight,
          unit: item.weightUnit,
        },
        stock: {
          quantity: item.quantity,
        },
        pricing: {
          costPrice: item.itemTotal / item.quantity,
          sellingPrice: (item.itemTotal / item.quantity) * 1.2, // 20% markup
        },
        supplierId: purchase.supplierId,
        supplierDetails: {
          supplierName: purchase.supplierDetails.supplierName,
          supplierCode: purchase.supplierDetails.supplierCode,
          purchaseDate: purchase.purchaseDate,
          purchasePrice: item.itemTotal / item.quantity,
          invoiceNumber: purchase.purchaseNumber,
        },
        huid: item.huid,
        hallmarking: {
          isHallmarked: item.isHallmarked,
        },
        createdBy: userId,
      });

      // Create inventory transaction for new product
      await InventoryTransaction.create({
        organizationId: purchase.organizationId,
        shopId: purchase.shopId,
        productId: newProduct._id,
        productCode: newProduct.productCode,
        transactionType: 'IN',
        quantity: item.quantity,
        previousQuantity: 0,
        newQuantity: item.quantity,
        transactionDate: new Date(),
        referenceType: 'product_creation',
        referenceId: purchase._id,
        referenceNumber: purchase.purchaseNumber,
        value: item.itemTotal,
        performedBy: userId,
        reason: 'Initial stock from purchase',
      });
    }
  }

  // Update supplier balance
  const supplier = await Supplier.findById(purchase.supplierId);
  if (supplier) {
    await supplier.updateBalance(-purchase.payment.dueAmount); // Negative = we owe supplier
  }

  // Log activity
  await eventLogger.logPurchase(
    userId,
    purchase.organizationId,
    purchase.shopId,
    'receive',
    purchase._id,
    `Marked purchase ${purchase.purchaseNumber} as received and updated inventory`,
    { purchaseNumber: purchase.purchaseNumber, itemCount: purchase.items.length }
  );

  return purchase;
};

/**
 * Cancel purchase
 */
export const cancelPurchase = async (purchaseId, reason) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  if (purchase.status === 'completed') {
    throw new BadRequestError('Cannot cancel completed purchase');
  }

  await purchase.cancel();

  // Log activity
  await eventLogger.logPurchase(
    purchase.createdBy,
    purchase.organizationId,
    purchase.shopId,
    'cancel',
    purchase._id,
    `Cancelled purchase ${purchase.purchaseNumber}`,
    { purchaseNumber: purchase.purchaseNumber, reason }
  );

  return purchase;
};

// 3. PURCHASE APPROVAL

/**
 * Approve purchase
 */
export const approvePurchase = async (purchaseId, userId, notes) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  if (purchase.approvalStatus === 'approved') {
    throw new BadRequestError('Purchase already approved');
  }

  await purchase.approve(userId);

  // Log activity
  await eventLogger.logPurchase(
    userId,
    purchase.organizationId,
    purchase.shopId,
    'approve',
    purchase._id,
    `Approved purchase ${purchase.purchaseNumber}`,
    { purchaseNumber: purchase.purchaseNumber, notes }
  );

  return purchase;
};

/**
 * Reject purchase
 */
export const rejectPurchase = async (purchaseId, userId, reason) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  if (purchase.approvalStatus === 'rejected') {
    throw new BadRequestError('Purchase already rejected');
  }

  await purchase.reject(userId, reason);

  // Log activity
  await eventLogger.logPurchase(
    userId,
    purchase.organizationId,
    purchase.shopId,
    'reject',
    purchase._id,
    `Rejected purchase ${purchase.purchaseNumber}`,
    { purchaseNumber: purchase.purchaseNumber, reason }
  );

  return purchase;
};

// 4. PAYMENT MANAGEMENT

/**
 * Add payment to purchase
 */
export const addPayment = async (purchaseId, paymentData, userId) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  // Add received by
  paymentData.receivedBy = userId;

  await purchase.addPayment(paymentData);

  // Update supplier balance
  const supplier = await Supplier.findById(purchase.supplierId);
  if (supplier) {
    await supplier.updateBalance(paymentData.amount); // Positive = payment made to supplier
  }

  // Log activity
  await eventLogger.logPurchase(
    userId,
    purchase.organizationId,
    purchase.shopId,
    'payment',
    purchase._id,
    `Added payment of ${paymentData.amount} to purchase ${purchase.purchaseNumber}`,
    { purchaseNumber: purchase.purchaseNumber, amount: paymentData.amount }
  );

  businessLogger.logPayment({
    userId,
    shopId: purchase.shopId,
    paymentType: 'purchase',
    amount: paymentData.amount,
    partyId: purchase.supplierId,
  });

  return purchase;
};

/**
 * Get all payments for a purchase
 */
export const getPayments = async purchaseId => {
  const purchase = await Purchase.findById(purchaseId).select('payment');

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  return purchase.payment.payments;
};

// 5. SUPPLIER-SPECIFIC PURCHASES

/**
 * Get all purchases from a specific supplier
 */
export const getPurchasesBySupplier = async (shopId, supplierId, filters) => {
  const { page = 1, limit = 20, status, paymentStatus } = filters;

  const query = { shopId, supplierId, deletedAt: null };

  if (status) query.status = status;
  if (paymentStatus) query['payment.paymentStatus'] = paymentStatus;

  const total = await Purchase.countDocuments(query);

  const purchases = await Purchase.find(query)
    .sort('-purchaseDate')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  return {
    purchases,
    page: parseInt(page),
    limit: parseInt(limit),
    total,
  };
};

// 6. PURCHASE ANALYTICS & REPORTS

/**
 * Get purchase analytics & summary
 */
export const getPurchaseAnalytics = async (shopId, filters) => {
  const { startDate, endDate } = filters;

  const query = { shopId, deletedAt: null };

  if (startDate || endDate) {
    query.purchaseDate = {};
    if (startDate) query.purchaseDate.$gte = new Date(startDate);
    if (endDate) query.purchaseDate.$lte = new Date(endDate);
  }

  // Total purchases
  const totalPurchases = await Purchase.countDocuments(query);

  // Total purchase value
  const totalValue = await Purchase.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$financials.grandTotal' } } },
  ]);

  // Pending purchases
  const pendingPurchases = await Purchase.countDocuments({
    ...query,
    status: { $in: ['draft', 'pending', 'ordered'] },
  });

  // Payment status breakdown
  const paymentBreakdown = await Purchase.aggregate([
    { $match: query },
    { $group: { _id: '$payment.paymentStatus', count: { $sum: 1 } } },
  ]);

  // Top suppliers
  const topSuppliers = await Purchase.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$supplierId',
        totalPurchases: { $sum: 1 },
        totalValue: { $sum: '$financials.grandTotal' },
      },
    },
    { $sort: { totalValue: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'suppliers',
        localField: '_id',
        foreignField: '_id',
        as: 'supplier',
      },
    },
    { $unwind: '$supplier' },
  ]);

  // Monthly trend
  const monthlyTrend = await Purchase.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          year: { $year: '$purchaseDate' },
          month: { $month: '$purchaseDate' },
        },
        count: { $sum: 1 },
        totalValue: { $sum: '$financials.grandTotal' },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  return {
    totalPurchases,
    totalPurchaseValue: totalValue[0]?.total || 0,
    pendingPurchases,
    paymentStatusBreakdown: paymentBreakdown,
    topSuppliers,
    monthlyTrend,
  };
};

/**
 * Get all pending/incomplete purchases
 */
export const getPendingPurchases = async shopId => {
  return Purchase.findPending(shopId).populate('supplierId', 'businessName supplierCode');
};

/**
 * Get all unpaid/partially paid purchases
 */
export const getUnpaidPurchases = async shopId => {
  return Purchase.findUnpaid(shopId).populate('supplierId', 'businessName supplierCode');
};

// 7. BULK OPERATIONS

/**
 * Bulk delete multiple purchases (draft only)
 */
export const bulkDeletePurchases = async purchaseIds => {
  // Validate all are draft
  const purchases = await Purchase.find({
    _id: { $in: purchaseIds },
    status: 'draft',
  });

  if (purchases.length !== purchaseIds.length) {
    throw new BadRequestError('Only draft purchases can be deleted');
  }

  // Soft delete all
  await Purchase.updateMany({ _id: { $in: purchaseIds } }, { $set: { deletedAt: new Date() } });

  return { deletedCount: purchases.length };
};

/**
 * Bulk approve multiple purchases
 */
export const bulkApprovePurchases = async (purchaseIds, userId) => {
  const purchases = await Purchase.find({
    _id: { $in: purchaseIds },
    approvalStatus: 'pending',
  });

  let approvedCount = 0;

  for (const purchase of purchases) {
    await purchase.approve(userId);
    approvedCount++;
  }

  return { approvedCount };
};

// 8. PURCHASE DOCUMENTS

/**
 * Upload purchase-related documents
 */
export const uploadDocument = async (purchaseId, documentData) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  purchase.documents.push(documentData);
  await purchase.save();

  return purchase;
};

/**
 * Get all documents for a purchase
 */
export const getDocuments = async purchaseId => {
  const purchase = await Purchase.findById(purchaseId).select('documents');

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  return purchase.documents;
};

// 9. PURCHASE FILTERS & SEARCH

/**
 * Quick search purchases
 */
export const searchPurchases = async (shopId, searchQuery, limit = 20) => {
  const query = {
    shopId,
    deletedAt: null,
    $or: [
      { purchaseNumber: new RegExp(searchQuery, 'i') },
      { 'supplierDetails.supplierName': new RegExp(searchQuery, 'i') },
    ],
  };

  return Purchase.find(query)
    .sort('-purchaseDate')
    .limit(parseInt(limit))
    .select('purchaseNumber supplierDetails purchaseDate financials.grandTotal status')
    .lean();
};

/**
 * Get purchases within date range
 */
export const getPurchasesByDateRange = async (shopId, startDate, endDate, page, limit) => {
  const query = {
    shopId,
    purchaseDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    deletedAt: null,
  };

  const total = await Purchase.countDocuments(query);

  const purchases = await Purchase.find(query)
    .sort('-purchaseDate')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('supplierId', 'businessName supplierCode')
    .lean();

  return {
    purchases,
    page: parseInt(page),
    limit: parseInt(limit),
    total,
  };
};
