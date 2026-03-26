import Purchase from '../../models/Purchase.js';
import eventLogger from '../../utils/eventLogger.js';
import { businessLogger } from '../../utils/logger.js';
import logger from '../../utils/logger.js';
import Supplier from '../../models/Supplier.js';
import JewelryShop from '../../models/Shop.js';
import Product from '../../models/Product.js';
import { createPayment, getPurchasePayments } from '../payment/payment.service.js';
import { NotFoundError, BadRequestError } from '../../utils/AppError.js';
import eventBus from '../../eventBus.js';

// ─────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────
const findPurchase = async (purchaseId, shopId, organizationId) => {
  const purchase = await Purchase.findOne({
    _id: purchaseId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  return purchase;
};

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────
export const createPurchase = async (shopId, organizationId, data, userId) => {
  const supplier = await Supplier.findById(data.supplierId);
  if (!supplier) {
    throw new NotFoundError('Supplier not found');
  }

  const supplierDetails = {
    supplierName:  supplier.businessName,
    supplierCode:  supplier.supplierCode,
    contactPerson: supplier.contactPerson?.firstName || '',
    phone:         supplier.contactPerson?.phone     || '',
    email:         supplier.contactPerson?.email     || '',
    address:       supplier.address
      ? `${supplier.address.street}, ${supplier.address.city}`
      : '',
    gstNumber: supplier.gstNumber || '',
  };

  let purchase;
  let attempts = 0;

  while (attempts < 3) {
    try {
      const purchaseNumber = await Purchase.generatePurchaseNumber(shopId);

      purchase = await Purchase.create({
        ...data,
        shopId,
        organizationId,
        purchaseNumber,
        supplierDetails,
        createdBy: userId,
      });

      break;

    } catch (err) {
      if (err.code === 11000 && attempts < 2) {
        attempts++;
        continue;
      }
      throw err;
    }
  }

  await eventLogger.logPurchase(
    userId,
    organizationId,
    shopId,
    'create',
    purchase._id,
    `Created purchase ${purchase.purchaseNumber}`,
    { purchaseNumber: purchase.purchaseNumber, supplierId: supplier._id, totalAmount: purchase.financials.grandTotal }
  );

  businessLogger.logPurchase({
    userId,
    shopId,
    purchaseNumber: purchase.purchaseNumber,
    amount:         purchase.financials.grandTotal,
    supplierId:     supplier._id,
  });

  return purchase.populate('supplierId', 'businessName supplierCode contactPerson');
};

// ─────────────────────────────────────────────
// GET ALL
// ─────────────────────────────────────────────
export const getAllPurchases = async (shopId, organizationId, filters) => {
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

  const query = { shopId, organizationId, deletedAt: null };

  if (supplierId)    query.supplierId                  = supplierId;
  if (status)        query.status                      = status;
  if (paymentStatus) query['payment.paymentStatus']    = paymentStatus;

  if (startDate || endDate) {
    query.purchaseDate = {};
    if (startDate) query.purchaseDate.$gte = new Date(startDate);
    if (endDate)   query.purchaseDate.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { purchaseNumber: new RegExp(search, 'i') },
      { 'supplierDetails.supplierName': new RegExp(search, 'i') },
    ];
  }

  const [purchases, total] = await Promise.all([
    Purchase.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('supplierId', 'businessName supplierCode')
      .populate('createdBy', 'firstName lastName')
      .lean(),
    Purchase.countDocuments(query),
  ]);

  return { purchases, page: parseInt(page), limit: parseInt(limit), total };
};

// ─────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────
export const getPurchaseById = async (purchaseId, shopId, organizationId) => {
  const purchase = await Purchase.findOne({
    _id: purchaseId,
    shopId,
    organizationId,
    deletedAt: null,
  })
    .populate('supplierId', 'businessName supplierCode contactPerson address')
    .populate('createdBy', 'firstName lastName email')
    .populate('updatedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .populate('delivery.receivedBy', 'firstName lastName');

  if (!purchase) throw new NotFoundError('Purchase not found');
  return purchase;
};

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────
export const updatePurchase = async (purchaseId, shopId, organizationId, data, userId) => {
  const purchase = await findPurchase(purchaseId, shopId, organizationId);

  if (!['draft', 'pending'].includes(purchase.status)) {
    throw new BadRequestError('Cannot edit completed or cancelled purchases');
  }

  if (data.purchaseNumber) delete data.purchaseNumber;
  if (data.organizationId) delete data.organizationId;

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

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
export const deletePurchase = async (purchaseId, shopId, organizationId) => {
  const purchase = await findPurchase(purchaseId, shopId, organizationId);

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

// ─────────────────────────────────────────────
// STATUS UPDATE
// ─────────────────────────────────────────────
export const updatePurchaseStatus = async (purchaseId, status, userId, shopId, organizationId) => {
  const purchase = await findPurchase(purchaseId, shopId, organizationId);

  const allowedTransitions = {
    draft:            ['cancelled'],
    pending:          ['ordered', 'cancelled'],
    ordered:          ['received', 'partial_received', 'cancelled'],
    received:         ['completed'],
    partial_received: ['completed', 'cancelled'],
    completed:        [],
    cancelled:        [],
    returned:         [],
  };

  if (!allowedTransitions[purchase.status]?.includes(status)) {
    throw new BadRequestError(
      `Cannot change status from '${purchase.status}' to '${status}'`
    );
  }

  const oldStatus    = purchase.status;
  purchase.status    = status;
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

// ─────────────────────────────────────────────
// RECEIVE PURCHASE
// ─────────────────────────────────────────────
export const receivePurchase = async (purchaseId, shopId, organizationId, receiveData, userId) => {
  const purchase = await findPurchase(purchaseId, shopId, organizationId);

  if (purchase.status === 'completed') {
    throw new BadRequestError('Purchase already marked as received');
  }

  // Status update karo
  purchase.status                = 'completed';
  purchase.delivery.receivedDate = receiveData.receivedDate || new Date();
  purchase.delivery.receivedBy   = receiveData.receivedBy   || userId;
  if (receiveData.notes) purchase.notes = receiveData.notes;
  await purchase.save();

  // ── EVENT EMIT ──────────────────────────
  // inventory.listener  → stock badhao / product banao
  // ledger.listener     → supplier debit entry
  eventBus.emit('PURCHASE_RECEIVED', { purchase, userId });
  // ─────────────────────────────────────────

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

// ─────────────────────────────────────────────
// CANCEL
// ─────────────────────────────────────────────
export const cancelPurchase = async (purchaseId, shopId, organizationId, reason, userId) => {
  const purchase = await findPurchase(purchaseId, shopId, organizationId);

  if (purchase.status === 'completed') {
    throw new BadRequestError('Cannot cancel completed purchase');
  }

  // Status update karo
  await purchase.cancel();

  // ── EVENT EMIT ──────────────────────────
  // inventory.listener  → stock reverse karo (agar received tha)
  // ledger.listener     → ledger entry reverse karo
  eventBus.emit('PURCHASE_CANCELLED', { purchase, userId, reason });
  // ─────────────────────────────────────────

  await eventLogger.logPurchase(
    userId,
    purchase.organizationId,
    purchase.shopId,
    'cancel',
    purchase._id,
    `Cancelled purchase ${purchase.purchaseNumber}`,
    { purchaseNumber: purchase.purchaseNumber, reason }
  );

  return purchase;
};

// ─────────────────────────────────────────────
// RETURN
// ─────────────────────────────────────────────
export const returnPurchase = async (purchaseId, shopId, organizationId, reason, userId) => {
  const purchase = await findPurchase(purchaseId, shopId, organizationId);

  if (purchase.status !== 'completed') {
    throw new BadRequestError('Only completed purchases can be returned');
  }

  // Status update karo
  purchase.status    = 'returned';
  purchase.updatedBy = userId;
  await purchase.save();

  // ── EVENT EMIT ──────────────────────────
  // inventory.listener  → stock ghataao
  // ledger.listener     → supplier credit entry
  eventBus.emit('PURCHASE_RETURNED', { purchase, userId, reason });
  // ─────────────────────────────────────────

  await eventLogger.logPurchase(
    userId,
    purchase.organizationId,
    purchase.shopId,
    'return',
    purchase._id,
    `Returned purchase ${purchase.purchaseNumber} to supplier`,
    { purchaseNumber: purchase.purchaseNumber, reason }
  );

  return purchase;
};

// ─────────────────────────────────────────────
// APPROVE / REJECT
// ─────────────────────────────────────────────
export const approvePurchase = async (purchaseId, shopId, organizationId, userId, notes) => {
  const purchase = await findPurchase(purchaseId, shopId, organizationId);

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

export const rejectPurchase = async (purchaseId, shopId, organizationId, userId, reason) => {
  const purchase = await findPurchase(purchaseId, shopId, organizationId);

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

// ─────────────────────────────────────────────
// ADD PAYMENT
// ─────────────────────────────────────────────
export const addPayment = async (purchaseId, paymentData, userId, shopId, organizationId) => {
  const purchase = await findPurchase(purchaseId, shopId, organizationId);

  if (purchase.status === 'cancelled') {
    throw new BadRequestError('Cannot add payment to cancelled purchase');
  }

  if (paymentData.amount > purchase.payment.dueAmount) {
    throw new BadRequestError(
      `Payment amount ₹${paymentData.amount} exceeds due amount ₹${purchase.payment.dueAmount}`
    );
  }

  const result = await createPayment(shopId, organizationId, userId, {
    ...paymentData,
    transactionType: 'payment',
    party: {
      partyType: 'supplier',
      partyId:   purchase.supplierId,
      partyName: purchase.supplierDetails.supplierName,
    },
    reference: {
      referenceType:   'purchase',
      referenceId:     purchase._id,
      referenceNumber: purchase.purchaseNumber,
    },
  });

  // Supplier fetch karo email ke liye
  const [supplier, shop] = await Promise.all([
    Supplier.findById(purchase.supplierId).lean(),
    JewelryShop.findById(shopId).lean(),
  ]);

  // ── EVENT EMIT ──────────────────────────
  // reference.listener  → purchase paidAmount update karo
  // ledger.listener     → supplier credit entry
  // email.listener      → supplier voucher + admin notify
  eventBus.emit('PURCHASE_PAYMENT_ADDED', {
    purchase,
    payment:        result.data,
    supplier,
    shop,
    organizationId,
    userId,
  });
  // ─────────────────────────────────────────

  return result;
};

// ─────────────────────────────────────────────
// GET PAYMENTS
// ─────────────────────────────────────────────
export const getPayments = async (purchaseId, shopId, organizationId) => {
  await findPurchase(purchaseId, shopId, organizationId);
  const result = await getPurchasePayments(shopId, purchaseId);
  return result;
};

// ─────────────────────────────────────────────
// SUPPLIER / ANALYTICS
// ─────────────────────────────────────────────
export const getPurchasesBySupplier = async (shopId, supplierId, organizationId, filters) => {
  const { page = 1, limit = 20, status, paymentStatus } = filters;

  const query = { shopId, supplierId, organizationId, deletedAt: null };

  if (status)        query.status                   = status;
  if (paymentStatus) query['payment.paymentStatus'] = paymentStatus;

  const [purchases, total] = await Promise.all([
    Purchase.find(query)
      .sort('-purchaseDate')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
    Purchase.countDocuments(query),
  ]);

  return { purchases, page: parseInt(page), limit: parseInt(limit), total };
};

export const getPurchaseAnalytics = async (shopId, organizationId, filters) => {
  const { startDate, endDate } = filters;

  const query = { shopId, organizationId, deletedAt: null };

  if (startDate || endDate) {
    query.purchaseDate = {};
    if (startDate) query.purchaseDate.$gte = new Date(startDate);
    if (endDate)   query.purchaseDate.$lte = new Date(endDate);
  }

  const [
    totalPurchases,
    totalValue,
    pendingPurchases,
    paymentBreakdown,
    topSuppliers,
    monthlyTrend,
  ] = await Promise.all([
    Purchase.countDocuments(query),

    Purchase.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$financials.grandTotal' } } },
    ]),

    Purchase.countDocuments({
      ...query,
      status: { $in: ['draft', 'pending', 'ordered'] },
    }),

    Purchase.aggregate([
      { $match: query },
      { $group: { _id: '$payment.paymentStatus', count: { $sum: 1 } } },
    ]),

    Purchase.aggregate([
      { $match: query },
      {
        $group: {
          _id:            '$supplierId',
          totalPurchases: { $sum: 1 },
          totalValue:     { $sum: '$financials.grandTotal' },
        },
      },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from:         'suppliers',
          localField:   '_id',
          foreignField: '_id',
          as:           'supplier',
        },
      },
      { $unwind: '$supplier' },
    ]),

    Purchase.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year:  { $year:  '$purchaseDate' },
            month: { $month: '$purchaseDate' },
          },
          count:      { $sum: 1 },
          totalValue: { $sum: '$financials.grandTotal' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]),
  ]);

  return {
    totalPurchases,
    totalPurchaseValue:     totalValue[0]?.total || 0,
    pendingPurchases,
    paymentStatusBreakdown: paymentBreakdown,
    topSuppliers,
    monthlyTrend,
  };
};

// ─────────────────────────────────────────────
// PENDING / UNPAID
// ─────────────────────────────────────────────
export const getPendingPurchases = async (shopId, organizationId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [purchases, total] = await Promise.all([
    Purchase.findPending(shopId, organizationId)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('supplierId', 'businessName supplierCode'),
    Purchase.countDocuments({
      shopId,
      organizationId,
      status:    { $in: ['draft', 'pending', 'ordered'] },
      deletedAt: null,
    }),
  ]);

  return { purchases, page: parseInt(page), limit: parseInt(limit), total };
};

export const getUnpaidPurchases = async (shopId, organizationId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [purchases, total] = await Promise.all([
    Purchase.findUnpaid(shopId, organizationId)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('supplierId', 'businessName supplierCode'),
    Purchase.countDocuments({
      shopId,
      organizationId,
      'payment.paymentStatus': { $in: ['unpaid', 'partial'] },
      status:                  { $ne: 'cancelled' },
      deletedAt:               null,
    }),
  ]);

  return { purchases, page: parseInt(page), limit: parseInt(limit), total };
};

// ─────────────────────────────────────────────
// BULK
// ─────────────────────────────────────────────
export const bulkDeletePurchases = async (purchaseIds, shopId, organizationId) => {
  const purchases = await Purchase.find({
    _id:       { $in: purchaseIds },
    shopId,
    organizationId,
    status:    'draft',
    deletedAt: null,
  });

  if (purchases.length === 0) {
    throw new BadRequestError('No draft purchases found to delete');
  }

  await Purchase.updateMany(
    { _id: { $in: purchaseIds }, shopId, organizationId, status: 'draft' },
    { $set: { deletedAt: new Date() } }
  );

  await Promise.all(
    purchases.map(purchase =>
      eventLogger.logPurchase(
        purchase.createdBy,
        purchase.organizationId,
        purchase.shopId,
        'delete',
        purchase._id,
        `Bulk deleted purchase ${purchase.purchaseNumber}`,
        { purchaseNumber: purchase.purchaseNumber }
      )
    )
  );

  return { deletedCount: purchases.length };
};

export const bulkApprovePurchases = async (purchaseIds, userId, shopId, organizationId) => {
  const purchases = await Purchase.find({
    _id:            { $in: purchaseIds },
    shopId,
    organizationId,
    approvalStatus: 'pending',
  });

  if (purchases.length === 0) {
    throw new BadRequestError('No pending purchases found to approve');
  }

  await Purchase.updateMany(
    { _id: { $in: purchaseIds }, shopId, organizationId },
    [
      {
        $set: {
          approvalStatus: 'approved',
          approvedBy:     userId,
          approvedAt:     new Date(),
          status: {
            $cond: {
              if:   { $eq: ['$status', 'draft'] },
              then: 'pending',
              else: '$status',
            },
          },
        },
      },
    ]
  );

  await Promise.all(
    purchases.map(purchase =>
      eventLogger.logPurchase(
        userId,
        purchase.organizationId,
        purchase.shopId,
        'approve',
        purchase._id,
        `Bulk approved purchase ${purchase.purchaseNumber}`,
        { purchaseNumber: purchase.purchaseNumber }
      )
    )
  );

  return { approvedCount: purchases.length };
};

// ─────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────
export const uploadDocument = async (purchaseId, shopId, organizationId, documentData) => {
  const purchase = await findPurchase(purchaseId, shopId, organizationId);

  if (purchase.documents.length >= 10) {
    throw new BadRequestError('Maximum 10 documents allowed per purchase');
  }

  purchase.documents.push(documentData);
  await purchase.save();

  return purchase;
};

export const getDocuments = async (purchaseId, shopId, organizationId) => {
  const purchase = await Purchase.findOne({
    _id: purchaseId,
    shopId,
    organizationId,
    deletedAt: null,
  }).select('documents');

  if (!purchase) throw new NotFoundError('Purchase not found');
  return purchase.documents;
};

// ─────────────────────────────────────────────
// SEARCH / DATE RANGE
// ─────────────────────────────────────────────
export const searchPurchases = async (shopId, organizationId, searchQuery, limit = 20) => {
  return Purchase.find({
    shopId,
    organizationId,
    deletedAt: null,
    $or: [
      { purchaseNumber: new RegExp(searchQuery, 'i') },
      { 'supplierDetails.supplierName': new RegExp(searchQuery, 'i') },
    ],
  })
    .sort('-purchaseDate')
    .limit(parseInt(limit))
    .select('purchaseNumber supplierDetails purchaseDate financials.grandTotal status')
    .lean();
};

export const getPurchasesByDateRange = async (
  shopId,
  organizationId,
  startDate,
  endDate,
  page,
  limit
) => {
  const query = {
    shopId,
    organizationId,
    purchaseDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    deletedAt: null,
  };

  const [purchases, total] = await Promise.all([
    Purchase.find(query)
      .sort('-purchaseDate')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('supplierId', 'businessName supplierCode')
      .lean(),
    Purchase.countDocuments(query),
  ]);

  return { purchases, page: parseInt(page), limit: parseInt(limit), total };
};