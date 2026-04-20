import mongoose from 'mongoose';
import Girvi        from '../../models/Girvi.js';
import GirviPayment from '../../models/GirviPayment.js';
import GirviCashbook from '../../models/GirviCashbook.js';
import Customer     from '../../models/Customer.js';
import JewelryShop  from '../../models/Shop.js';
import cache        from '../../utils/cache.js';
import { paginate } from '../../utils/pagination.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../utils/AppError.js';

export const generateGirviNumber = async (shopId, prefix = 'GRV') => {
  let number = 1;
  let girviNumber;

  do {
    girviNumber = `${prefix}${String(number).padStart(5, '0')}`;
    const existing = await Girvi.findOne({ shopId, girviNumber })
      .setOptions({ includeDeleted: true });
    if (!existing) break;
    number++;
  } while (true);

  return girviNumber;
};

export const calculateInterestAmount = ({
  principal,
  interestRate,
  interestType = 'simple',
  calculationBasis = 'monthly',
  fromDate,
  toDate = new Date(),
}) => {
const from = new Date(fromDate)
const to   = new Date(toDate)

from.setHours(0, 0, 0, 0)
to.setHours(0, 0, 0, 0)

const days = Math.round((to - from) / (1000 * 60 * 60 * 24))
  const months = calculationBasis === 'daily' ? days : days / 30;

  let interest = 0;
  if (interestType === 'simple') {
    interest = principal * (interestRate / 100) * months;
  } else {
    interest = principal * (Math.pow(1 + interestRate / 100, months) - 1);
  }

  return {
    interest:  parseFloat(Math.max(0, interest).toFixed(2)),
    days,
    months:    parseFloat(months.toFixed(4)),
  };
};

export const createGirvi = async (shopId, girviData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shop = await JewelryShop.findById(shopId).session(session);
    if (!shop) throw new NotFoundError('Shop not found');

    const customer = await Customer.findOne({
      _id:      girviData.customerId,
      shopId,
      deletedAt: null,
    }).session(session);
    if (!customer) throw new NotFoundError('Customer not found');

    if (customer.isBlacklisted) {
      throw new ValidationError('Cannot create girvi for blacklisted customer');
    }

    const girviNumber = await generateGirviNumber(shopId);

    const [girvi] = await Girvi.create(
      [
        {
          organizationId: shop.organizationId,
          shopId,
          girviNumber,
          customerId:          girviData.customerId,
          items:               girviData.items,
          principalAmount:     girviData.principalAmount,
          loanToValueRatio:    girviData.loanToValueRatio,
          interestRate:        girviData.interestRate,
          interestType:        girviData.interestType        || 'simple',
          calculationBasis:    girviData.calculationBasis    || 'monthly',
          girviDate:           girviData.girviDate,
          dueDate:             girviData.dueDate,
          gracePeriodDays:     girviData.gracePeriodDays     || 0,
          girviSlipNumber:     girviData.girviSlipNumber,
          witnessName:         girviData.witnessName,
          notes:               girviData.notes,
          internalNotes:       girviData.internalNotes,
          status:              'active',
          outstandingPrincipal: girviData.principalAmount,
          lastInterestCalcDate: girviData.girviDate,
          createdBy:           userId,
        },
      ],
      { session }
    );

    await GirviCashbook.createEntry({
      shopId,
      organizationId:       shop.organizationId,
      entryType:            'girvi_jama',
      flowType:             'outflow',
      amount:               girviData.principalAmount,
      paymentMode:          girviData.paymentMode || 'cash',
      transactionReference: girviData.transactionReference,
      breakdown: {
        principalAmount: girviData.principalAmount,
        netAmount:       girviData.principalAmount,
      },
      girviId:       girvi._id,
      customerId:    customer._id,
      girviNumber:   girvi.girviNumber,
      customerName:  customer.fullName,
      customerPhone: customer.phone,
      entryDate:     girviData.girviDate,
      createdBy:     userId,
      remarks:       `Girvi jama: ${girvi.girviNumber}`,
    });

    await session.commitTransaction();
    await invalidateGirviCache(shopId);

    return girvi;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const getGirvis = async (shopId, filters = {}, paginationOptions = {}) => {
  const query = {
    shopId:    new mongoose.Types.ObjectId(shopId),
    deletedAt: null,
  };

  if (filters.search) {
    query.$or = [
      { girviNumber:    new RegExp(filters.search, 'i') },
      { girviSlipNumber: new RegExp(filters.search, 'i') },
    ];
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.customerId) {
    query.customerId = new mongoose.Types.ObjectId(filters.customerId);
  }

  if (filters.overdueOnly === true || filters.overdueOnly === 'true') {
    query.status  = 'active';
    query.dueDate = { $lt: new Date() };
  }

  if (filters.startDate || filters.endDate) {
    query.girviDate = {};
    if (filters.startDate) query.girviDate.$gte = new Date(filters.startDate);
    if (filters.endDate)   query.girviDate.$lte = new Date(filters.endDate);
  }

  const cacheKey = `girvis:${shopId}:${JSON.stringify(filters)}:${JSON.stringify(paginationOptions)}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await paginate(Girvi, query, {
    page:     paginationOptions.page  || 1,
    limit:    paginationOptions.limit || 20,
    sort:     paginationOptions.sort  || '-girviDate',
    select:   'girviNumber customerId status principalAmount outstandingPrincipal accruedInterest totalAmountDue interestRate interestType girviDate dueDate totalApproxValue totalNetWeight items.itemType createdAt',
    populate: [
      { path: 'customerId', select: 'firstName lastName phone customerCode' },
    ],
  });

  await cache.set(cacheKey, result, 300);
  return result;
};

// ─── Get Girvi By ID ───────────────────────────────────────────────────────────
export const getGirviById = async (girviId, shopId = null) => {
  const cacheKey = `girvi:${girviId}`;
  let girvi      = await cache.get(cacheKey);

  if (!girvi) {
    const query = { _id: girviId, deletedAt: null };
    if (shopId) query.shopId = shopId;


girvi = await Girvi.findOne(query)
  .populate('customerId', 'firstName lastName phone customerCode email address relationType relationName jaati')
  .populate('createdBy',  'firstName lastName')
  .populate('releasedBy', 'firstName lastName')
  .lean();

    if (!girvi) throw new NotFoundError('Girvi not found');

    await cache.set(cacheKey, girvi, 1800);
  }

  return girvi;
};

// ─── Update Girvi ──────────────────────────────────────────────────────────────
export const updateGirvi = async (girviId, shopId, updateData, userId) => {
  const girvi = await Girvi.findOne({ _id: girviId, shopId, deletedAt: null });
  if (!girvi) throw new NotFoundError('Girvi not found');

  if (girvi.status === 'released') {
    throw new ValidationError('Cannot update a released girvi');
  }

  const allowedFields = [
    'interestRate', 'interestType', 'calculationBasis',
    'dueDate', 'gracePeriodDays',
    'girviSlipNumber', 'witnessName',
    'notes', 'internalNotes',
  ];

  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      girvi[field] = updateData[field];
    }
  });

  girvi.updatedBy = userId;
  await girvi.save();

  await invalidateGirviCache(shopId, girviId);
  return girvi;
};

// ─── Calculate Interest ────────────────────────────────────────────────────────
export const getInterestCalculation = async (girviId, shopId, options = {}) => {
  const girvi = await Girvi.findOne({ _id: girviId, shopId, deletedAt: null }).lean();
  if (!girvi) throw new NotFoundError('Girvi not found');

  const toDate       = options.toDate       ? new Date(options.toDate) : new Date();
  const interestType = options.interestType || girvi.interestType;
  const fromDate     = girvi.lastInterestCalcDate || girvi.girviDate;
  const principal    = girvi.outstandingPrincipal || girvi.principalAmount;

  const { interest, days, months } = calculateInterestAmount({
    principal,
    interestRate:     girvi.interestRate,
    interestType,
    calculationBasis: girvi.calculationBasis,
    fromDate,
    toDate,
  });

  // Also calculate with both types for comparison
  const simpleCalc = calculateInterestAmount({
    principal,
    interestRate:     girvi.interestRate,
    interestType:     'simple',
    calculationBasis: girvi.calculationBasis,
    fromDate,
    toDate,
  });

  const compoundCalc = calculateInterestAmount({
    principal,
    interestRate:     girvi.interestRate,
    interestType:     'compound',
    calculationBasis: girvi.calculationBasis,
    fromDate,
    toDate,
  });

  return {
    girviId,
    girviNumber:          girvi.girviNumber,
    principal,
    interestRate:         girvi.interestRate,
    interestType,
    calculationBasis:     girvi.calculationBasis,
    fromDate,
    toDate,
    days,
    months,
    interestCalculated:   interest,
    totalAmountDue:       parseFloat((principal + interest).toFixed(2)),

    // Comparison
    comparison: {
      simple: {
        interest:      simpleCalc.interest,
        totalAmountDue: parseFloat((principal + simpleCalc.interest).toFixed(2)),
      },
      compound: {
        interest:       compoundCalc.interest,
        totalAmountDue: parseFloat((principal + compoundCalc.interest).toFixed(2)),
      },
    },

    // Summary
    totalPaid: {
      principal: girvi.totalPrincipalPaid || 0,
      interest:  girvi.totalInterestPaid  || 0,
      discount:  girvi.totalDiscountGiven || 0,
    },
  };
};

// ─── Release Girvi ─────────────────────────────────────────────────────────────
export const releaseGirvi = async (girviId, shopId, releaseData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const girvi = await Girvi.findOne({
      _id:       girviId,
      shopId,
      deletedAt: null,
    }).session(session);

    if (!girvi) throw new NotFoundError('Girvi not found');

    if (girvi.status !== 'active' && girvi.status !== 'overdue') {
      throw new ValidationError(`Cannot release girvi with status: ${girvi.status}`);
    }

    const customer = await Customer.findById(girvi.customerId).session(session);

    // Calculate final interest
    const toDate = releaseData.paymentDate
      ? new Date(releaseData.paymentDate)
      : new Date();

    const { interest: interestCalculated } = calculateInterestAmount({
      principal:        girvi.outstandingPrincipal || girvi.principalAmount,
      interestRate:     girvi.interestRate,
      interestType:     releaseData.releaseInterestType,
      calculationBasis: girvi.calculationBasis,
      fromDate:         girvi.lastInterestCalcDate || girvi.girviDate,
      toDate,
    });

    const interestReceived  = parseFloat(releaseData.interestReceived  || 0);
    const principalReceived = parseFloat(releaseData.principalReceived || 0);
    const discountGiven     = parseFloat(releaseData.discountGiven     || 0);
    const netAmountReceived = parseFloat(
      Math.max(0, interestReceived + principalReceived - discountGiven).toFixed(2)
    );

    // Generate receipt number
    const receiptNumber = await GirviPayment.generateReceiptNumber(shopId);

    // Create payment record
    const payment = await GirviPayment.create(
      [
        {
          girviId,
          organizationId:      girvi.organizationId,
          shopId,
          customerId:          girvi.customerId,
          receiptNumber,
          paymentType:         'release_payment',
          interestType:        releaseData.releaseInterestType,
          interestRate:        girvi.interestRate,
          interestFrom:        girvi.lastInterestCalcDate || girvi.girviDate,
          interestTo:          toDate,
          interestCalculated,
          interestReceived,
          principalReceived,
          discountGiven,
          netAmountReceived,
          paymentDate:         toDate,
          paymentMode:         releaseData.paymentMode,
          transactionReference: releaseData.transactionReference,
          principalBefore:     girvi.outstandingPrincipal,
          principalAfter:      0,
          outstandingBefore:   girvi.totalAmountDue,
          outstandingAfter:    0,
          createdBy:           userId,
          remarks:             releaseData.remarks,
        },
      ],
      { session }
    );

    // Update girvi
    girvi.status              = 'released';
    girvi.releaseDate         = toDate;
    girvi.releasedBy          = userId;
    girvi.releaseNotes        = releaseData.remarks;
    girvi.totalPrincipalPaid += principalReceived;
    girvi.totalInterestPaid  += interestReceived;
    girvi.totalDiscountGiven += discountGiven;
    girvi.outstandingPrincipal = 0;
    girvi.accruedInterest      = 0;
    girvi.totalAmountDue       = 0;
    girvi.updatedBy            = userId;

    // Release summary
    girvi.releaseSummary = {
      totalItemsApproxValue:  girvi.totalApproxValue,
      totalPrincipal:         girvi.principalAmount,
      totalInterestAccrued:   interestCalculated,
      totalInterestReceived:  interestReceived,
      totalPrincipalReceived: principalReceived,
      totalDiscountGiven:     discountGiven,
      netAmountReceived,
      releaseInterestType:    releaseData.releaseInterestType,
      releasePaymentMode:     releaseData.paymentMode,
      releaseRemarks:         releaseData.remarks,
    };

    await girvi.save({ session });

    // Cashbook entries
    if (interestReceived > 0) {
      await GirviCashbook.createEntry({
        shopId,
        organizationId:  girvi.organizationId,
        entryType:       'interest_received',
        flowType:        'inflow',
        amount:          interestReceived,
        paymentMode:     releaseData.paymentMode,
        transactionReference: releaseData.transactionReference,
        breakdown: {
          interestAmount:  interestReceived,
          discountAmount:  0,
          netAmount:       interestReceived,
        },
        girviId,
        paymentId:     payment[0]._id,
        customerId:    girvi.customerId,
        girviNumber:   girvi.girviNumber,
        customerName:  customer?.fullName,
        customerPhone: customer?.phone,
        entryDate:     toDate,
        createdBy:     userId,
        remarks:       `Interest received on release: ${girvi.girviNumber}`,
      });
    }

    if (principalReceived > 0) {
      await GirviCashbook.createEntry({
        shopId,
        organizationId:  girvi.organizationId,
        entryType:       'principal_received',
        flowType:        'inflow',
        amount:          principalReceived,
        paymentMode:     releaseData.paymentMode,
        transactionReference: releaseData.transactionReference,
        breakdown: {
          principalAmount: principalReceived,
          netAmount:       principalReceived,
        },
        girviId,
        paymentId:     payment[0]._id,
        customerId:    girvi.customerId,
        girviNumber:   girvi.girviNumber,
        customerName:  customer?.fullName,
        customerPhone: customer?.phone,
        entryDate:     toDate,
        createdBy:     userId,
        remarks:       `Principal received on release: ${girvi.girviNumber}`,
      });
    }

    if (discountGiven > 0) {
      await GirviCashbook.createEntry({
        shopId,
        organizationId: girvi.organizationId,
        entryType:      'discount_given',
        flowType:       'outflow',
        amount:         discountGiven,
        paymentMode:    releaseData.paymentMode,
        breakdown: {
          discountAmount: discountGiven,
          netAmount:      discountGiven,
        },
        girviId,
        paymentId:     payment[0]._id,
        customerId:    girvi.customerId,
        girviNumber:   girvi.girviNumber,
        customerName:  customer?.fullName,
        customerPhone: customer?.phone,
        entryDate:     toDate,
        createdBy:     userId,
        remarks:       `Discount given on release: ${girvi.girviNumber}`,
      });
    }

    await session.commitTransaction();
    await invalidateGirviCache(shopId, girviId);

    return {
      girvi,
      payment:    payment[0],
      releaseSummary: girvi.releaseSummary,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Partial Release ───────────────────────────────────────────────────────────
export const partialRelease = async (girviId, shopId, releaseData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const girvi = await Girvi.findOne({
      _id: girviId, shopId, deletedAt: null,
    }).session(session);

    if (!girvi) throw new NotFoundError('Girvi not found');

    if (girvi.status === 'released') {
      throw new ValidationError('Girvi is already fully released');
    }
    if (girvi.status === 'transferred') {
      throw new ValidationError('Cannot partially release a transferred girvi');
    }

    const customer    = await Customer.findById(girvi.customerId).session(session);
    const releaseDate = new Date(releaseData.releaseDate);

    // Validate and process each released item
    const releasedItemsDetail = [];
    let totalItemValueReleased = 0;

    for (const releaseItem of releaseData.releasedItems) {
      const item = girvi.items.id(releaseItem.itemId);
      if (!item) throw new ValidationError(`Item ${releaseItem.itemId} not found in girvi`);
      if (item.itemStatus === 'released') {
        throw new ValidationError(`Item "${item.itemName}" is already released`);
      }

      const activeQty   = item.quantity - (item.releasedQuantity || 0);
      if (releaseItem.releasedQuantity > activeQty) {
        throw new ValidationError(
          `Cannot release ${releaseItem.releasedQuantity} of "${item.itemName}". Only ${activeQty} available`
        );
      }

      // Item value proportional to quantity being released
      const itemValuePerUnit = (item.finalValue || item.approxValue || 0) / item.quantity;
      const releasingValue   = itemValuePerUnit * releaseItem.releasedQuantity;
      totalItemValueReleased += releasingValue;

      releasedItemsDetail.push({
        itemId:           item._id,
        itemName:         item.itemName,
        releasedQuantity: releaseItem.releasedQuantity,
        itemValue:        parseFloat(releasingValue.toFixed(2)),
      });

      // Update item status
      item.releasedQuantity = (item.releasedQuantity || 0) + releaseItem.releasedQuantity;
      if (item.releasedQuantity >= item.quantity) {
        item.itemStatus        = 'released';
        item.itemReleaseDate   = releaseDate;
      } else {
        item.itemStatus = 'partial_released';
      }
      item.itemPrincipalRecovered = (item.itemPrincipalRecovered || 0) +
        (parseFloat(releaseData.principalPaid) * (releasingValue / (girvi.totalApproxValue || 1)));
    }

    const interestPaid      = parseFloat(releaseData.interestPaid   || 0);
    const principalPaid     = parseFloat(releaseData.principalPaid  || 0);
    const discountGiven     = parseFloat(releaseData.discountGiven  || 0);
    const netAmountReceived = parseFloat(
      Math.max(0, interestPaid + principalPaid - discountGiven).toFixed(2)
    );

    const principalBeforeRelease = girvi.outstandingPrincipal;
    const principalAfterRelease  = Math.max(0, principalBeforeRelease - principalPaid);

    // Remaining active items value
    const remainingItemsValue = girvi.items
      .filter(i => i.itemStatus !== 'released')
      .reduce((sum, i) => {
        const activeQty    = i.quantity - (i.releasedQuantity || 0);
        const perUnit      = (i.finalValue || i.approxValue || 0) / i.quantity;
        return sum + perUnit * activeQty;
      }, 0);

    // Generate receipt number
    const receiptNumber = await GirviPayment.generateReceiptNumber(shopId);

    // Create payment record
    const [payment] = await GirviPayment.create([{
      girviId,
      organizationId:      girvi.organizationId,
      shopId,
      customerId:          girvi.customerId,
      receiptNumber,
      paymentType:         'principal_partial',
      interestType:        girvi.interestType,
      interestRate:        girvi.interestRate,
      interestFrom:        girvi.lastInterestCalcDate || girvi.girviDate,
      interestTo:          releaseDate,
      interestReceived:    interestPaid,
      principalReceived:   principalPaid,
      discountGiven,
      netAmountReceived,
      paymentDate:         releaseDate,
      paymentMode:         releaseData.paymentMode,
      principalBefore:     principalBeforeRelease,
      principalAfter:      principalAfterRelease,
      outstandingBefore:   girvi.totalAmountDue,
      outstandingAfter:    principalAfterRelease,
      createdBy:           userId,
      remarks:             releaseData.remarks,
    }], { session });

    // Save partial release record
    girvi.partialReleases.push({
      releaseDate,
      releasedItems:          releasedItemsDetail,
      interestPaid,
      principalPaid,
      discountGiven,
      netAmountReceived,
      principalBeforeRelease,
      principalAfterRelease,
      remainingItemsValue:    parseFloat(remainingItemsValue.toFixed(2)),
      paymentMode:            releaseData.paymentMode,
      receiptNumber,
      remarks:                releaseData.remarks,
      releasedBy:             userId,
    });

    // Update girvi financials
    girvi.totalInterestPaid   += interestPaid;
    girvi.totalPrincipalPaid  += principalPaid;
    girvi.totalDiscountGiven  += discountGiven;
    girvi.outstandingPrincipal = principalAfterRelease;
    girvi.totalAmountDue       = principalAfterRelease;
    girvi.lastInterestCalcDate = releaseDate;
    girvi.totalApproxValue     = parseFloat(remainingItemsValue.toFixed(2));
    girvi.updatedBy            = userId;

    // Check if all items released → mark as released
    const allReleased = girvi.items.every(i => i.itemStatus === 'released');
    if (allReleased) girvi.status = 'released';
    else             girvi.status = 'partial_released';

    await girvi.save({ session });

    // Cashbook entries
    const cashbookBase = {
      shopId,
      organizationId:  girvi.organizationId,
      paymentMode:     releaseData.paymentMode,
      girviId,
      paymentId:       payment._id,
      customerId:      girvi.customerId,
      girviNumber:     girvi.girviNumber,
      customerName:    customer?.fullName,
      customerPhone:   customer?.phone,
      entryDate:       releaseDate,
      createdBy:       userId,
    };

    if (interestPaid > 0) {
      await GirviCashbook.createEntry({
        ...cashbookBase,
        entryType: 'interest_received',
        flowType:  'inflow',
        amount:    interestPaid,
        breakdown: { interestAmount: interestPaid, netAmount: interestPaid },
        remarks:   `Interest on partial release: ${girvi.girviNumber}`,
      });
    }

    if (principalPaid > 0) {
      await GirviCashbook.createEntry({
        ...cashbookBase,
        entryType: 'principal_received',
        flowType:  'inflow',
        amount:    principalPaid,
        breakdown: { principalAmount: principalPaid, netAmount: principalPaid },
        remarks:   `Principal on partial release: ${girvi.girviNumber}`,
      });
    }

    if (discountGiven > 0) {
      await GirviCashbook.createEntry({
        ...cashbookBase,
        entryType: 'discount_given',
        flowType:  'outflow',
        amount:    discountGiven,
        breakdown: { discountAmount: discountGiven, netAmount: discountGiven },
        remarks:   `Discount on partial release: ${girvi.girviNumber}`,
      });
    }

    await session.commitTransaction();
    await invalidateGirviCache(shopId, girviId);

    return {
      girvi,
      payment,
      partialReleaseSummary: {
        releasedItems:       releasedItemsDetail,
        totalValueReleased:  parseFloat(totalItemValueReleased.toFixed(2)),
        remainingItemsValue: parseFloat(remainingItemsValue.toFixed(2)),
        principalBefore:     principalBeforeRelease,
        principalAfter:      principalAfterRelease,
        interestPaid,
        principalPaid,
        discountGiven,
        netAmountReceived,
        receiptNumber,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Renewal ───────────────────────────────────────────────────────────────────
export const renewGirvi = async (girviId, shopId, renewalData, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const girvi = await Girvi.findOne({
      _id: girviId, shopId, deletedAt: null,
    }).session(session);

    if (!girvi) throw new NotFoundError('Girvi not found');

    if (girvi.status === 'released') {
      throw new ValidationError('Cannot renew a released girvi');
    }
    if (girvi.status === 'transferred') {
      throw new ValidationError('Cannot renew a transferred girvi');
    }

    const customer    = await Customer.findById(girvi.customerId).session(session);
    const renewalDate = new Date(renewalData.renewalDate);
    const newDueDate  = new Date(renewalData.newDueDate);

    const interestPaid  = parseFloat(renewalData.interestPaid  || 0);
    const principalPaid = parseFloat(renewalData.principalPaid || 0);
    const discountGiven = parseFloat(renewalData.discountGiven || 0);
    const netAmount     = parseFloat(
      Math.max(0, interestPaid + principalPaid - discountGiven).toFixed(2)
    );

    const principalBefore = girvi.outstandingPrincipal;
    const principalAfter  = Math.max(0, principalBefore - principalPaid);

    // Generate receipt
    const receiptNumber = await GirviPayment.generateReceiptNumber(shopId);

    // Payment record
    const [payment] = await GirviPayment.create([{
      girviId,
      organizationId:   girvi.organizationId,
      shopId,
      customerId:       girvi.customerId,
      receiptNumber,
      paymentType:      'interest_principal',
      interestType:     girvi.interestType,
      interestRate:     girvi.interestRate,
      interestFrom:     girvi.lastInterestCalcDate || girvi.girviDate,
      interestTo:       renewalDate,
      interestReceived: interestPaid,
      principalReceived: principalPaid,
      discountGiven,
      netAmountReceived: netAmount,
      paymentDate:      renewalDate,
      paymentMode:      renewalData.paymentMode,
      principalBefore,
      principalAfter,
      outstandingBefore: girvi.totalAmountDue,
      outstandingAfter:  principalAfter,
      createdBy:        userId,
      remarks:          renewalData.remarks || 'Girvi renewal',
    }], { session });

    // Save renewal record
    girvi.renewals.push({
      renewalDate,
      previousDueDate: girvi.dueDate,
      newDueDate,
      interestPaid,
      principalPaid,
      discountGiven,
      newPrincipal:    principalAfter,
      newInterestRate: renewalData.newInterestRate || girvi.interestRate,
      paymentMode:     renewalData.paymentMode,
      receiptNumber,
      remarks:         renewalData.remarks,
      renewedBy:       userId,
    });

    // Update girvi
    girvi.dueDate              = newDueDate;
    girvi.totalInterestPaid   += interestPaid;
    girvi.totalPrincipalPaid  += principalPaid;
    girvi.totalDiscountGiven  += discountGiven;
    girvi.outstandingPrincipal = principalAfter;
    girvi.totalAmountDue       = principalAfter;
    girvi.lastInterestCalcDate = renewalDate;
    girvi.accruedInterest      = 0;
    girvi.status               = 'active';
    girvi.updatedBy            = userId;

    // Update interest rate if changed
    if (renewalData.newInterestRate) {
      girvi.interestRate = renewalData.newInterestRate;
    }

    await girvi.save({ session });

    // Cashbook entries
    const cashbookBase = {
      shopId,
      organizationId:  girvi.organizationId,
      paymentMode:     renewalData.paymentMode,
      girviId,
      paymentId:       payment._id,
      customerId:      girvi.customerId,
      girviNumber:     girvi.girviNumber,
      customerName:    customer?.fullName,
      customerPhone:   customer?.phone,
      entryDate:       renewalDate,
      createdBy:       userId,
    };

    if (interestPaid > 0) {
      await GirviCashbook.createEntry({
        ...cashbookBase,
        entryType: 'interest_received',
        flowType:  'inflow',
        amount:    interestPaid,
        breakdown: { interestAmount: interestPaid, netAmount: interestPaid },
        remarks:   `Interest on renewal: ${girvi.girviNumber}`,
      });
    }

    if (principalPaid > 0) {
      await GirviCashbook.createEntry({
        ...cashbookBase,
        entryType: 'principal_received',
        flowType:  'inflow',
        amount:    principalPaid,
        breakdown: { principalAmount: principalPaid, netAmount: principalPaid },
        remarks:   `Principal on renewal: ${girvi.girviNumber}`,
      });
    }

    if (discountGiven > 0) {
      await GirviCashbook.createEntry({
        ...cashbookBase,
        entryType: 'discount_given',
        flowType:  'outflow',
        amount:    discountGiven,
        breakdown: { discountAmount: discountGiven, netAmount: discountGiven },
        remarks:   `Discount on renewal: ${girvi.girviNumber}`,
      });
    }

    await session.commitTransaction();
    await invalidateGirviCache(shopId, girviId);

    return {
      girvi,
      payment,
      renewalSummary: {
        previousDueDate:  girvi.renewals[girvi.renewals.length - 1].previousDueDate,
        newDueDate,
        previousPrincipal: principalBefore,
        newPrincipal:      principalAfter,
        interestPaid,
        principalPaid,
        discountGiven,
        netAmountReceived: netAmount,
        receiptNumber,
        renewalCount:      girvi.renewals.length,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Delete Girvi (Soft) ───────────────────────────────────────────────────────
export const deleteGirvi = async (girviId, shopId, userId) => {
  const girvi = await Girvi.findOne({ _id: girviId, shopId, deletedAt: null });
  if (!girvi) throw new NotFoundError('Girvi not found');

  if (girvi.status === 'active' || girvi.status === 'overdue') {
    throw new ValidationError('Cannot delete an active girvi. Please release it first.');
  }

  girvi.deletedAt = new Date();
  girvi.updatedBy = userId;
  await girvi.save();

  await invalidateGirviCache(shopId, girviId);
  return girvi;
};

// ─── Get Girvi Statistics ──────────────────────────────────────────────────────
export const getGirviStatistics = async (shopId) => {
  const shopObjId = new mongoose.Types.ObjectId(shopId);
  const now       = new Date();

  const stats = await Girvi.aggregate([
    { $match: { shopId: shopObjId, deletedAt: null } },
    {
      $group: {
        _id:                   null,
        totalGirvis:           { $sum: 1 },
        activeGirvis:          { $sum: { $cond: [{ $eq: ['$status', 'active'] },      1, 0] } },
        releasedGirvis:        { $sum: { $cond: [{ $eq: ['$status', 'released'] },    1, 0] } },
        transferredGirvis:     { $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] } },
        overdueGirvis: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'active'] },
                  { $lt: ['$dueDate', now] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalPrincipalGiven:   { $sum: '$principalAmount' },
        totalOutstanding:      { $sum: '$outstandingPrincipal' },
        totalAccruedInterest:  { $sum: '$accruedInterest' },
        totalAmountDue:        { $sum: '$totalAmountDue' },
        totalItemsValue:       { $sum: '$totalApproxValue' },
        avgInterestRate:       { $avg: '$interestRate' },
      },
    },
  ]);

  return stats[0] || {
    totalGirvis:          0,
    activeGirvis:         0,
    releasedGirvis:       0,
    transferredGirvis:    0,
    overdueGirvis:        0,
    totalPrincipalGiven:  0,
    totalOutstanding:     0,
    totalAccruedInterest: 0,
    totalAmountDue:       0,
    totalItemsValue:      0,
    avgInterestRate:      0,
  };
};

// ─── Cache Helpers ─────────────────────────────────────────────────────────────
export const invalidateGirviCache = async (shopId, girviId = null) => {
  if (girviId) await cache.del(`girvi:${girviId}`);
  await cache.deletePattern(`girvis:${shopId}:*`);
};