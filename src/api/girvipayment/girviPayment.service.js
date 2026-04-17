import mongoose    from 'mongoose';
import Girvi        from '../../models/Girvi.js';
import GirviPayment from '../../models/GirviPayment.js';
import GirviCashbook from '../../models/GirviCashbook.js';
import Customer     from '../../models/Customer.js';
import cache        from '../../utils/cache.js';
import { paginate } from '../../utils/pagination.js';
import {
  NotFoundError,
  ValidationError,
} from '../../utils/AppError.js';
import { calculateInterestAmount } from '../girvi/girvi.service.js';

// ─── Add Payment ───────────────────────────────────────────────────────────────
export const addPayment = async (girviId, shopId, paymentData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Fetch girvi
    const girvi = await Girvi.findOne({
      _id:       girviId,
      shopId,
      deletedAt: null,
    }).session(session);

    if (!girvi) throw new NotFoundError('Girvi not found');

    if (girvi.status === 'released') {
      throw new ValidationError('Cannot add payment to a released girvi');
    }
    if (girvi.status === 'transferred') {
      throw new ValidationError('Cannot add payment to a transferred girvi');
    }
    if (girvi.status === 'auctioned') {
      throw new ValidationError('Cannot add payment to an auctioned girvi');
    }

    const customer = await Customer.findById(girvi.customerId).session(session);

    const paymentDate      = new Date(paymentData.paymentDate);
    const interestReceived  = parseFloat(paymentData.interestReceived  || 0);
    const principalReceived = parseFloat(paymentData.principalReceived || 0);
    const discountGiven     = parseFloat(paymentData.discountGiven     || 0);

    // Validate principal not exceeding outstanding
    if (principalReceived > girvi.outstandingPrincipal) {
      throw new ValidationError(
        `Principal received (₹${principalReceived}) cannot exceed outstanding principal (₹${girvi.outstandingPrincipal})`
      );
    }

    // Calculate interest for the period
    const interestFrom = paymentData.interestFrom
      ? new Date(paymentData.interestFrom)
      : (girvi.lastInterestCalcDate || girvi.girviDate);

    const interestTo = paymentData.interestTo
      ? new Date(paymentData.interestTo)
      : paymentDate;

    const { interest: interestCalculated, days: interestDays } = calculateInterestAmount({
      principal:        girvi.outstandingPrincipal || girvi.principalAmount,
      interestRate:     girvi.interestRate,
      interestType:     paymentData.interestType,
      calculationBasis: girvi.calculationBasis,
      fromDate:         interestFrom,
      toDate:           interestTo,
    });

    const netAmountReceived = parseFloat(
      Math.max(0, interestReceived + principalReceived - discountGiven).toFixed(2)
    );

    // Balance snapshot
    const principalBefore  = girvi.outstandingPrincipal;
    const principalAfter   = Math.max(0, principalBefore - principalReceived);
    const outstandingBefore = girvi.totalAmountDue;
    const outstandingAfter  = Math.max(0, outstandingBefore - netAmountReceived);

    // Generate receipt number
    const receiptNumber = await GirviPayment.generateReceiptNumber(shopId);

    // Create payment record
    const [payment] = await GirviPayment.create(
      [
        {
          girviId,
          organizationId:      girvi.organizationId,
          shopId,
          customerId:          girvi.customerId,
          receiptNumber,
          paymentType:         paymentData.paymentType,
          interestType:        paymentData.interestType,
          interestRate:        girvi.interestRate,
          interestFrom,
          interestTo,
          interestDays,
          interestCalculated,
          interestReceived,
          principalReceived,
          discountGiven,
          netAmountReceived,
          paymentDate,
          paymentMode:         paymentData.paymentMode,
          transactionReference: paymentData.transactionReference,
          principalBefore,
          principalAfter,
          outstandingBefore,
          outstandingAfter,
          createdBy:           userId,
          remarks:             paymentData.remarks,
        },
      ],
      { session }
    );

    // Update girvi balances
    girvi.totalInterestPaid  += interestReceived;
    girvi.totalPrincipalPaid += principalReceived;
    girvi.totalDiscountGiven += discountGiven;
    girvi.outstandingPrincipal = principalAfter;
    girvi.lastInterestCalcDate = interestTo;
    girvi.accruedInterest      = 0; // reset after payment
    girvi.totalAmountDue       = principalAfter;
    girvi.updatedBy            = userId;

    // Update status if fully paid
    if (principalAfter === 0 && paymentData.paymentType === 'principal_full') {
      girvi.status = 'released';
    }

    await girvi.save({ session });

    // ── Cashbook entries ───────────────────────────────────────────────────────
    const cashbookBase = {
      shopId,
      organizationId:       girvi.organizationId,
      paymentMode:          paymentData.paymentMode,
      transactionReference: paymentData.transactionReference,
      girviId,
      paymentId:            payment._id,
      customerId:           girvi.customerId,
      girviNumber:          girvi.girviNumber,
      customerName:         customer?.fullName,
      customerPhone:        customer?.phone,
      entryDate:            paymentDate,
      createdBy:            userId,
    };

    if (interestReceived > 0) {
      await GirviCashbook.createEntry({
        ...cashbookBase,
        entryType: 'interest_received',
        flowType:  'inflow',
        amount:    interestReceived,
        breakdown: {
          interestAmount: interestReceived,
          netAmount:      interestReceived,
        },
        remarks: `Interest received: ${girvi.girviNumber}`,
      });
    }

    if (principalReceived > 0) {
      await GirviCashbook.createEntry({
        ...cashbookBase,
        entryType: 'principal_received',
        flowType:  'inflow',
        amount:    principalReceived,
        breakdown: {
          principalAmount: principalReceived,
          netAmount:       principalReceived,
        },
        remarks: `Principal received: ${girvi.girviNumber}`,
      });
    }

    if (discountGiven > 0) {
      await GirviCashbook.createEntry({
        ...cashbookBase,
        entryType: 'discount_given',
        flowType:  'outflow',
        amount:    discountGiven,
        breakdown: {
          discountAmount: discountGiven,
          netAmount:      discountGiven,
        },
        remarks: `Discount given: ${girvi.girviNumber}`,
      });
    }

    await session.commitTransaction();
    await invalidatePaymentCache(shopId, girviId);

    return {
      payment,
      updatedGirvi: {
        outstandingPrincipal: girvi.outstandingPrincipal,
        totalInterestPaid:    girvi.totalInterestPaid,
        totalPrincipalPaid:   girvi.totalPrincipalPaid,
        totalDiscountGiven:   girvi.totalDiscountGiven,
        totalAmountDue:       girvi.totalAmountDue,
        status:               girvi.status,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Get Payments for a Girvi ──────────────────────────────────────────────────
export const getPaymentsByGirvi = async (girviId, shopId, filters = {}, paginationOptions = {}) => {
  // Verify girvi exists
  const girvi = await Girvi.findOne({ _id: girviId, shopId, deletedAt: null }).lean();
  if (!girvi) throw new NotFoundError('Girvi not found');

  const query = {
    girviId:   new mongoose.Types.ObjectId(girviId),
    deletedAt: null,
  };

  if (filters.paymentType) query.paymentType = filters.paymentType;
  if (filters.paymentMode) query.paymentMode = filters.paymentMode;

  if (filters.startDate || filters.endDate) {
    query.paymentDate = {};
    if (filters.startDate) query.paymentDate.$gte = new Date(filters.startDate);
    if (filters.endDate)   query.paymentDate.$lte = new Date(filters.endDate);
  }

  const cacheKey = `girvi-payments:${girviId}:${JSON.stringify(filters)}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await paginate(GirviPayment, query, {
    page:     paginationOptions.page  || 1,
    limit:    paginationOptions.limit || 20,
    sort:     paginationOptions.sort  || '-paymentDate',
    select:   'receiptNumber paymentType interestType interestReceived principalReceived discountGiven netAmountReceived paymentDate paymentMode interestFrom interestTo interestDays interestCalculated principalBefore principalAfter remarks createdAt',
    populate: [{ path: 'createdBy', select: 'firstName lastName' }],
  });

  // Attach payment summary
  const summary = await GirviPayment.getPaymentSummary(girviId);

  const response = { ...result, summary };
  await cache.set(cacheKey, response, 300);

  return response;
};

// ─── Get Single Payment ────────────────────────────────────────────────────────
export const getPaymentById = async (paymentId, girviId, shopId) => {
  const payment = await GirviPayment.findOne({
    _id:       paymentId,
    girviId,
    shopId,
    deletedAt: null,
  })
    .populate('createdBy', 'firstName lastName')
    .lean();

  if (!payment) throw new NotFoundError('Payment not found');
  return payment;
};

// ─── Get All Payments for Shop ─────────────────────────────────────────────────
export const getShopPayments = async (shopId, filters = {}, paginationOptions = {}) => {
  const query = {
    shopId:    new mongoose.Types.ObjectId(shopId),
    deletedAt: null,
  };

  if (filters.paymentType) query.paymentType = filters.paymentType;
  if (filters.paymentMode) query.paymentMode = filters.paymentMode;
  if (filters.customerId)  query.customerId  = new mongoose.Types.ObjectId(filters.customerId);

  if (filters.startDate || filters.endDate) {
    query.paymentDate = {};
    if (filters.startDate) query.paymentDate.$gte = new Date(filters.startDate);
    if (filters.endDate)   query.paymentDate.$lte = new Date(filters.endDate);
  }

  const result = await paginate(GirviPayment, query, {
    page:     paginationOptions.page  || 1,
    limit:    paginationOptions.limit || 20,
    sort:     paginationOptions.sort  || '-paymentDate',
    select:   'girviId receiptNumber paymentType interestType interestReceived principalReceived discountGiven netAmountReceived paymentDate paymentMode remarks createdAt',
    populate: [
      { path: 'girviId',    select: 'girviNumber status' },
      { path: 'customerId', select: 'firstName lastName phone customerCode' },
    ],
  });

  // Attach shop-level summary
  const summary = await getShopPaymentSummary(shopId, filters);

  return { ...result, summary };
};

// ─── Get Shop Payment Summary ──────────────────────────────────────────────────
export const getShopPaymentSummary = async (shopId, filters = {}) => {
  const matchStage = {
    shopId:    new mongoose.Types.ObjectId(shopId),
    deletedAt: null,
  };

  if (filters.startDate || filters.endDate) {
    matchStage.paymentDate = {};
    if (filters.startDate) matchStage.paymentDate.$gte = new Date(filters.startDate);
    if (filters.endDate)   matchStage.paymentDate.$lte = new Date(filters.endDate);
  }

  const result = await GirviPayment.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id:                    null,
        totalInterestReceived:  { $sum: '$interestReceived' },
        totalPrincipalReceived: { $sum: '$principalReceived' },
        totalDiscountGiven:     { $sum: '$discountGiven' },
        totalNetReceived:       { $sum: '$netAmountReceived' },
        totalPayments:          { $sum: 1 },
        cashPayments: {
          $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, 1, 0] },
        },
        upiPayments: {
          $sum: { $cond: [{ $eq: ['$paymentMode', 'upi'] }, 1, 0] },
        },
      },
    },
  ]);

  return result[0] || {
    totalInterestReceived:  0,
    totalPrincipalReceived: 0,
    totalDiscountGiven:     0,
    totalNetReceived:       0,
    totalPayments:          0,
    cashPayments:           0,
    upiPayments:            0,
  };
};

// ─── Delete Payment (Soft) ─────────────────────────────────────────────────────
export const deletePayment = async (paymentId, girviId, shopId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await GirviPayment.findOne({
      _id:       paymentId,
      girviId,
      shopId,
      deletedAt: null,
    }).session(session);

    if (!payment) throw new NotFoundError('Payment not found');

    const girvi = await Girvi.findOne({ _id: girviId, shopId, deletedAt: null }).session(session);
    if (!girvi) throw new NotFoundError('Girvi not found');

    if (girvi.status === 'released') {
      throw new ValidationError('Cannot delete payment from a released girvi');
    }

    // Reverse the payment effects on girvi
    girvi.totalInterestPaid   = Math.max(0, girvi.totalInterestPaid   - payment.interestReceived);
    girvi.totalPrincipalPaid  = Math.max(0, girvi.totalPrincipalPaid  - payment.principalReceived);
    girvi.totalDiscountGiven  = Math.max(0, girvi.totalDiscountGiven  - payment.discountGiven);
    girvi.outstandingPrincipal = Math.min(
      girvi.principalAmount,
      girvi.outstandingPrincipal + payment.principalReceived
    );
    girvi.totalAmountDue      = girvi.outstandingPrincipal;
    girvi.updatedBy           = userId;

    await girvi.save({ session });

    // Soft delete payment
    payment.deletedAt = new Date();
    await payment.save({ session });

    await session.commitTransaction();
    await invalidatePaymentCache(shopId, girviId);

    return payment;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Cache Helpers ─────────────────────────────────────────────────────────────
export const invalidatePaymentCache = async (shopId, girviId) => {
  await cache.del(`girvi:${girviId}`);
  await cache.deletePattern(`girvi-payments:${girviId}:*`);
  await cache.deletePattern(`girvis:${shopId}:*`);
};