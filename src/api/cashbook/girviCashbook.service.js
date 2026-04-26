import mongoose      from 'mongoose';
import GirviCashbook  from '../../models/GirviCashbook.js';
import Girvi          from '../../models/Girvi.js';
import Customer       from '../../models/Customer.js';
import cache          from '../../utils/cache.js';
import { paginate }   from '../../utils/pagination.js';
import {
  NotFoundError,
  ValidationError,
} from '../../utils/AppError.js';

// ─── Create Manual Entry ───────────────────────────────────────────────────────
export const createManualEntry = async (shopId, entryData, userId) => {
  // Verify shop access - girviId optional
  let girviNumber   = entryData.girviNumber;
  let customerName  = entryData.customerName;
  let customerPhone = entryData.customerPhone;

  // Auto-fill girvi details if girviId given
  if (entryData.girviId) {
    const girvi = await Girvi.findOne({
      _id:       entryData.girviId,
      shopId,
      deletedAt: null,
    }).populate('customerId', 'firstName lastName phone fullName');

    if (!girvi) throw new NotFoundError('Girvi not found');

    girviNumber   = girvi.girviNumber;
    customerName  = girvi.customerId?.fullName;
    customerPhone = girvi.customerId?.phone;
  }

  // Auto-fill customer if customerId given
  if (entryData.customerId && !customerName) {
    const customer = await Customer.findOne({
      _id: entryData.customerId, shopId, deletedAt: null,
    }).lean();
    if (customer) {
      customerName  = customer.fullName;
      customerPhone = customer.phone;
    }
  }

  // Get organization ID from shop
  const { default: JewelryShop } = await import('../../models/Shop.js');
  const shop = await JewelryShop.findById(shopId).lean();
  if (!shop) throw new NotFoundError('Shop not found');

  const entry = await GirviCashbook.createEntry({
    shopId,
    organizationId:       shop.organizationId,
    entryType:            entryData.entryType,
    flowType:             entryData.flowType,
    amount:               parseFloat(entryData.amount),
    paymentMode:          entryData.paymentMode,
    transactionReference: entryData.transactionReference,
    breakdown:            entryData.breakdown || {},
    girviId:              entryData.girviId,
    customerId:           entryData.customerId,
    girviNumber,
    customerName,
    customerPhone,
    entryDate:            entryData.entryDate ? new Date(entryData.entryDate) : new Date(),
    createdBy:            userId,
    remarks:              entryData.remarks,
  });

  await invalidateCashbookCache(shopId);
  return entry;
};

// ─── Get Cashbook Entries ──────────────────────────────────────────────────────
export const getCashbookEntries = async (shopId, filters = {}, paginationOptions = {}) => {
  const query = {
    shopId:    new mongoose.Types.ObjectId(shopId),
    deletedAt: null,
  };

  if (filters.entryType)  query.entryType  = filters.entryType;
  if (filters.flowType)   query.flowType   = filters.flowType;
  if (filters.paymentMode) query.paymentMode = filters.paymentMode;

  if (filters.customerId) {
    query.customerId = new mongoose.Types.ObjectId(filters.customerId);
  }
  if (filters.girviId) {
    query.girviId = new mongoose.Types.ObjectId(filters.girviId);
  }

  if (filters.startDate || filters.endDate) {
    query.entryDate = {};
    if (filters.startDate) query.entryDate.$gte = new Date(filters.startDate);
    if (filters.endDate)   query.entryDate.$lte = new Date(filters.endDate);
  }

  const cacheKey = `cashbook:${shopId}:${JSON.stringify(filters)}:${JSON.stringify(paginationOptions)}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await paginate(GirviCashbook, query, {
    page:     paginationOptions.page  || 1,
    limit:    paginationOptions.limit || 50,
    sort:     paginationOptions.sort  || '-entryDate',
    select:   'entryNumber entryDate entryType flowType amount paymentMode transactionReference breakdown girviId customerId girviNumber customerName customerPhone openingBalance closingBalance remarks createdAt',
    populate: [{ path: 'createdBy', select: 'firstName lastName' }],
  });

  // Running totals for displayed entries
  const periodSummary = await getPeriodSummary(shopId, filters.startDate, filters.endDate);

  const response = { ...result, periodSummary };
  await cache.set(cacheKey, response, 180);

  return response;
};

// ─── Get Single Entry ──────────────────────────────────────────────────────────
export const getEntryById = async (entryId, shopId) => {
  const entry = await GirviCashbook.findOne({
    _id: entryId, shopId, deletedAt: null,
  })
    .populate('girviId',    'girviNumber status customerId')
    .populate('customerId', 'firstName lastName phone customerCode')
    .populate('createdBy',  'firstName lastName')
    .lean();

  if (!entry) throw new NotFoundError('Cashbook entry not found');
  return entry;
};

// ─── Get Daily Summary ─────────────────────────────────────────────────────────
export const getDailySummary = async (shopId, date = new Date()) => {
  const summary = await GirviCashbook.getDailySummary(shopId, date);

  // Get opening balance for the day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const prevEntry = await GirviCashbook.findOne({
    shopId,
    entryDate:  { $lt: startOfDay },
    deletedAt:  null,
  })
    .sort({ entryDate: -1, createdAt: -1 })
    .select('closingBalance')
    .lean();

  const openingBalance = prevEntry?.closingBalance || 0;
  const closingBalance = openingBalance + summary.totalInflow - summary.totalOutflow;

  return {
    date:            new Date(date).toISOString().split('T')[0],
    openingBalance,
    closingBalance,
    netFlow:         summary.totalInflow - summary.totalOutflow,
    ...summary,
  };
};

// ─── Get Monthly Summary ───────────────────────────────────────────────────────
export const getMonthlySummary = async (shopId, year, month) => {
  const dailyData = await GirviCashbook.getMonthlySummary(shopId, year, month);

  // Overall monthly totals
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth   = new Date(year, month, 0, 23, 59, 59);

  const [totals, breakdown] = await Promise.all([
    // Monthly totals
    GirviCashbook.aggregate([
      {
        $match: {
          shopId:    new mongoose.Types.ObjectId(shopId),
          entryDate: { $gte: startOfMonth, $lte: endOfMonth },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id:                  null,
          totalInflow:          { $sum: { $cond: [{ $eq: ['$flowType', 'inflow'] },  '$amount', 0] } },
          totalOutflow:         { $sum: { $cond: [{ $eq: ['$flowType', 'outflow'] }, '$amount', 0] } },
          totalInterest:        { $sum: '$breakdown.interestAmount' },
          totalPrincipal:       { $sum: '$breakdown.principalAmount' },
          totalDiscount:        { $sum: '$breakdown.discountAmount' },
          totalEntries:         { $sum: 1 },
          newGirviCount: {
            $sum: { $cond: [{ $eq: ['$entryType', 'girvi_jama'] }, 1, 0] },
          },
          releaseCount: {
            $sum: { $cond: [{ $eq: ['$entryType', 'release_received'] }, 1, 0] },
          },
          transferOutCount: {
            $sum: { $cond: [{ $eq: ['$entryType', 'transfer_out'] }, 1, 0] },
          },
          cashInflow: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$flowType', 'inflow'] }, { $eq: ['$paymentMode', 'cash'] }] },
                '$amount', 0,
              ],
            },
          },
          upiInflow: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$flowType', 'inflow'] }, { $eq: ['$paymentMode', 'upi'] }] },
                '$amount', 0,
              ],
            },
          },
        },
      },
    ]),

    // Breakdown by entry type
    GirviCashbook.aggregate([
      {
        $match: {
          shopId:    new mongoose.Types.ObjectId(shopId),
          entryDate: { $gte: startOfMonth, $lte: endOfMonth },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id:          '$entryType',
          totalAmount:  { $sum: '$amount' },
          count:        { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]),
  ]);

  // Opening balance for the month
  const prevMonthEnd = new Date(year, month - 1, 0, 23, 59, 59);
  const prevEntry    = await GirviCashbook.findOne({
    shopId,
    entryDate:  { $lte: prevMonthEnd },
    deletedAt:  null,
  })
    .sort({ entryDate: -1, createdAt: -1 })
    .select('closingBalance')
    .lean();

  const openingBalance = prevEntry?.closingBalance || 0;
  const monthlyTotals  = totals[0] || {
    totalInflow:      0, totalOutflow:   0,
    totalInterest:    0, totalPrincipal: 0,
    totalDiscount:    0, totalEntries:   0,
    newGirviCount:    0, releaseCount:   0,
    transferOutCount: 0, cashInflow:     0,
    upiInflow:        0,
  };

  return {
    year,
    month,
    openingBalance,
    closingBalance:  openingBalance + monthlyTotals.totalInflow - monthlyTotals.totalOutflow,
    ...monthlyTotals,
    byEntryType:     breakdown,
    dailyBreakdown:  dailyData,
  };
};

// ─── Get Yearly Summary ────────────────────────────────────────────────────────
export const getYearlySummary = async (shopId, year) => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear   = new Date(year, 11, 31, 23, 59, 59);

  const [monthlyData, totals] = await Promise.all([
    // Monthly breakdown
    GirviCashbook.aggregate([
      {
        $match: {
          shopId:    new mongoose.Types.ObjectId(shopId),
          entryDate: { $gte: startOfYear, $lte: endOfYear },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id:           { $month: '$entryDate' },
          totalInflow:   { $sum: { $cond: [{ $eq: ['$flowType', 'inflow'] },  '$amount', 0] } },
          totalOutflow:  { $sum: { $cond: [{ $eq: ['$flowType', 'outflow'] }, '$amount', 0] } },
          totalInterest: { $sum: '$breakdown.interestAmount' },
          newGirvis:     { $sum: { $cond: [{ $eq: ['$entryType', 'girvi_jama'] }, 1, 0] } },
          releases:      { $sum: { $cond: [{ $eq: ['$entryType', 'release_received'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id:           0,
          month:         '$_id',
          totalInflow:   1,
          totalOutflow:  1,
          totalInterest: 1,
          newGirvis:     1,
          releases:      1,
          netFlow:       { $subtract: ['$totalInflow', '$totalOutflow'] },
        },
      },
    ]),

    // Yearly totals
    GirviCashbook.aggregate([
      {
        $match: {
          shopId:    new mongoose.Types.ObjectId(shopId),
          entryDate: { $gte: startOfYear, $lte: endOfYear },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id:             null,
          totalInflow:     { $sum: { $cond: [{ $eq: ['$flowType', 'inflow'] },  '$amount', 0] } },
          totalOutflow:    { $sum: { $cond: [{ $eq: ['$flowType', 'outflow'] }, '$amount', 0] } },
          totalInterest:   { $sum: '$breakdown.interestAmount' },
          totalPrincipal:  { $sum: '$breakdown.principalAmount' },
          totalDiscount:   { $sum: '$breakdown.discountAmount' },
          totalEntries:    { $sum: 1 },
          totalNewGirvis:  { $sum: { $cond: [{ $eq: ['$entryType', 'girvi_jama'] }, 1, 0] } },
          totalReleases:   { $sum: { $cond: [{ $eq: ['$entryType', 'release_received'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const yearlyTotals = totals[0] || {
    totalInflow:    0, totalOutflow:   0,
    totalInterest:  0, totalPrincipal: 0,
    totalDiscount:  0, totalEntries:   0,
    totalNewGirvis: 0, totalReleases:  0,
  };

  return {
    year,
    ...yearlyTotals,
    netFlow:         yearlyTotals.totalInflow - yearlyTotals.totalOutflow,
    monthlyBreakdown: monthlyData,
  };
};

// ─── Get Period Summary (helper for list page) ────────────────────────────────
export const getPeriodSummary = async (shopId, startDate, endDate) => {
  const matchStage = {
    shopId:    new mongoose.Types.ObjectId(shopId),
    deletedAt: null,
  };

  if (startDate || endDate) {
    matchStage.entryDate = {};
    if (startDate) matchStage.entryDate.$gte = new Date(startDate);
    if (endDate)   matchStage.entryDate.$lte = new Date(endDate);
  }

  const result = await GirviCashbook.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id:             null,
        totalInflow:     { $sum: { $cond: [{ $eq: ['$flowType', 'inflow'] },  '$amount', 0] } },
        totalOutflow:    { $sum: { $cond: [{ $eq: ['$flowType', 'outflow'] }, '$amount', 0] } },
        totalInterest:   { $sum: '$breakdown.interestAmount' },
        totalPrincipal:  { $sum: '$breakdown.principalAmount' },
        totalDiscount:   { $sum: '$breakdown.discountAmount' },
        totalEntries:    { $sum: 1 },
      },
    },
  ]);

  const data = result[0] || {
    totalInflow:   0, totalOutflow:  0,
    totalInterest: 0, totalPrincipal: 0,
    totalDiscount: 0, totalEntries:  0,
  };

  return {
    ...data,
    netFlow: data.totalInflow - data.totalOutflow,
  };
};

// ─── Get Girvi-wise Cashbook ───────────────────────────────────────────────────
export const getGirviCashbook = async (shopId, girviId) => {
  const girvi = await Girvi.findOne({ _id: girviId, shopId, deletedAt: null }).lean();
  if (!girvi) throw new NotFoundError('Girvi not found');

  const entries = await GirviCashbook.find({
    shopId,
    girviId: new mongoose.Types.ObjectId(girviId),
    deletedAt: null,
  })
    .sort({ entryDate: 1 })
    .populate('createdBy', 'firstName lastName')
    .lean();

  // Summary
  const summary = entries.reduce(
    (acc, entry) => {
      if (entry.flowType === 'inflow') {
        acc.totalInflow  += entry.amount;
      } else {
        acc.totalOutflow += entry.amount;
      }
      acc.totalInterest  += entry.breakdown?.interestAmount  || 0;
      acc.totalPrincipal += entry.breakdown?.principalAmount || 0;
      acc.totalDiscount  += entry.breakdown?.discountAmount  || 0;
      return acc;
    },
    {
      totalInflow: 0, totalOutflow:  0,
      totalInterest: 0, totalPrincipal: 0, totalDiscount: 0,
    }
  );

  return {
    girviId,
    girviNumber: girvi.girviNumber,
    entries,
    summary: {
      ...summary,
      netFlow: summary.totalInflow - summary.totalOutflow,
    },
  };
};

// ─── Delete Entry (Soft) ───────────────────────────────────────────────────────
export const deleteEntry = async (entryId, shopId, userId) => {
  const entry = await GirviCashbook.findOne({
    _id: entryId, shopId, deletedAt: null,
  });

  if (!entry) throw new NotFoundError('Cashbook entry not found');

  // Only manual entries can be deleted (auto-entries are system records)
  // Allow admins to delete if needed
  entry.deletedAt = new Date();
  await entry.save();

  await invalidateCashbookCache(shopId);
  return entry;
};

// ─── Get Current Balance ───────────────────────────────────────────────────────
export const getCurrentBalance = async (shopId) => {
  const latest = await GirviCashbook.findOne({ shopId, deletedAt: null })
    .sort({ createdAt: -1 })
    .select('closingBalance')
    .lean();
  const balance = latest?.closingBalance ?? 0;
  return { shopId, currentBalance: balance };
};
// ─── Cache Helpers ─────────────────────────────────────────────────────────────
export const invalidateCashbookCache = async (shopId) => {
  await cache.deletePattern(`cashbook:${shopId}:*`);
};