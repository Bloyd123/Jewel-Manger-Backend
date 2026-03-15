// FILE: src/api/services/purchase.service.js
// Purchase Service - UPDATED (Payment module se integrate kiya)

import Purchase from '../../models/Purchase.js';
import Payment from '../../models/Payment.js';
import eventLogger from '../../utils/eventLogger.js';
import { businessLogger } from '../../utils/logger.js';
import {
  increaseStock,
  createProductFromPurchase,
} from '../inventory/inventory.service.js';
import Supplier from '../../models/Supplier.js';
import LedgerEntry from '../ledger/ledger.model.js'; 
import {
  createDebitEntry,
  reverseEntry,
} from '../ledger/ledger.service.js';
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

  const query = { shopId, deletedAt: null };

  if (supplierId) query.supplierId = supplierId;
  if (status) query.status = status;
  if (paymentStatus) query['payment.paymentStatus'] = paymentStatus;

  if (startDate || endDate) {
    query.purchaseDate = {};
    if (startDate) query.purchaseDate.$gte = new Date(startDate);
    if (endDate) query.purchaseDate.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { purchaseNumber: new RegExp(search, 'i') },
      { 'supplierDetails.supplierName': new RegExp(search, 'i') },
    ];
  }

  const total = await Purchase.countDocuments(query);

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

  if (!['draft', 'pending'].includes(purchase.status)) {
    throw new BadRequestError('Cannot edit completed or cancelled purchases');
  }

  Object.assign(purchase, data);
  purchase.updatedBy = userId;

  await purchase.save();

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
export const updatePurchaseStatus = async (purchaseId, status, userId) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  const oldStatus = purchase.status;
  purchase.status = status;
  purchase.updatedBy = userId;

  await purchase.save();

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
 * NOTE: Ledger mein sirf due amount ki debit entry — Payment module credit entry karega
 */
export const receivePurchase = async (purchaseId, receiveData, userId) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  if (purchase.status === 'completed') {
    throw new BadRequestError('Purchase already marked as received');
  }

  purchase.status = 'completed';
  purchase.delivery.receivedDate = receiveData.receivedDate || new Date();
  purchase.delivery.receivedBy = receiveData.receivedBy || userId;
  if (receiveData.notes) purchase.notes = receiveData.notes;

  await purchase.save();

  for (const item of purchase.items) {
    if (item.productId) {
      await increaseStock({
        organizationId: purchase.organizationId,
        shopId: purchase.shopId,
        productId: item.productId,
        quantity: item.quantity,
        referenceId: purchase._id,
        referenceNumber: purchase.purchaseNumber,
        value: item.itemTotal,
        performedBy: userId,
      });
    } else {
      await createProductFromPurchase({
        organizationId: purchase.organizationId,
        shopId: purchase.shopId,
        item,
        purchaseId: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        supplierId: purchase.supplierId,
        supplierDetails: purchase.supplierDetails,
        userId,
      });
    }
  }

  // Ledger mein supplier ka due amount debit karo
  // Matlab humpar supplier ka itna paisa baaki hai
  if (purchase.payment.dueAmount > 0) {
    await createDebitEntry({
      organizationId: purchase.organizationId,
      shopId: purchase.shopId,
      partyType: 'supplier',
      partyId: purchase.supplierId,
      partyModel: 'Supplier',
      partyName: purchase.supplierDetails.supplierName,
      amount: purchase.payment.dueAmount,
      referenceType: 'purchase',
      referenceId: purchase._id,
      referenceNumber: purchase.purchaseNumber,
      description: `Purchase received - ${purchase.purchaseNumber}`,
      createdBy: userId,
    });
  }

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


export const cancelPurchase = async (purchaseId, reason, userId) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  if (purchase.status === 'completed') {
    throw new BadRequestError('Cannot cancel completed purchase');
  }

  const ledgerEntry = await LedgerEntry.findOne({
    referenceId: purchase._id,
    referenceType: 'purchase',
    status: 'active',
  });

  if (ledgerEntry) {
    await reverseEntry({
      entryId: ledgerEntry._id,
      createdBy: userId,
      description: `Purchase cancelled - ${purchase.purchaseNumber}`,
    });
  }

  await purchase.cancel();

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

export const approvePurchase = async (purchaseId, userId, notes) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  if (purchase.approvalStatus === 'approved') {
    throw new BadRequestError('Purchase already approved');
  }

  await purchase.approve(userId);

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

export const rejectPurchase = async (purchaseId, userId, reason) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  if (purchase.approvalStatus === 'rejected') {
    throw new BadRequestError('Purchase already rejected');
  }

  await purchase.reject(userId, reason);

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


export const getPurchasePayments = async (shopId, purchaseId) => {
  const purchase = await Purchase.findById(purchaseId);
  if (!purchase) throw new NotFoundError('Purchase not found');

  const payments = await Payment.find({
    'reference.referenceId': purchaseId,
    'reference.referenceType': 'purchase',
    shopId,
    deletedAt: null,
  })
    .sort({ paymentDate: -1 })
    .populate('processedBy', 'firstName lastName')
    .lean();

  return payments;
};

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

export const getPurchaseAnalytics = async (shopId, filters) => {
  const { startDate, endDate } = filters;

  const query = { shopId, deletedAt: null };

  if (startDate || endDate) {
    query.purchaseDate = {};
    if (startDate) query.purchaseDate.$gte = new Date(startDate);
    if (endDate) query.purchaseDate.$lte = new Date(endDate);
  }

  const totalPurchases = await Purchase.countDocuments(query);

  const totalValue = await Purchase.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: '$financials.grandTotal' } } },
  ]);

  const pendingPurchases = await Purchase.countDocuments({
    ...query,
    status: { $in: ['draft', 'pending', 'ordered'] },
  });

  const paymentBreakdown = await Purchase.aggregate([
    { $match: query },
    { $group: { _id: '$payment.paymentStatus', count: { $sum: 1 } } },
  ]);

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


export const getPendingPurchases = async shopId => {
  return Purchase.findPending(shopId).populate('supplierId', 'businessName supplierCode');
};


export const getUnpaidPurchases = async shopId => {
  return Purchase.findUnpaid(shopId).populate('supplierId', 'businessName supplierCode');
};


export const bulkDeletePurchases = async purchaseIds => {
  const purchases = await Purchase.find({
    _id: { $in: purchaseIds },
    status: 'draft',
  });

  if (purchases.length !== purchaseIds.length) {
    throw new BadRequestError('Only draft purchases can be deleted');
  }

  await Purchase.updateMany({ _id: { $in: purchaseIds } }, { $set: { deletedAt: new Date() } });

  return { deletedCount: purchases.length };
};


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

export const uploadDocument = async (purchaseId, documentData) => {
  const purchase = await Purchase.findById(purchaseId);

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  purchase.documents.push(documentData);
  await purchase.save();

  return purchase;
};


export const getDocuments = async purchaseId => {
  const purchase = await Purchase.findById(purchaseId).select('documents');

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  return purchase.documents;
};

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