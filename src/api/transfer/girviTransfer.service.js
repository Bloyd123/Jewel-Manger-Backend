import mongoose      from 'mongoose';
import Girvi          from '../../models/Girvi.js';
import GirviTransfer  from '../../models/GirviTransfer.js';
import GirviPayment   from '../../models/GirviPayment.js';
import GirviCashbook  from '../../models/GirviCashbook.js';
import Customer       from '../../models/Customer.js';
import cache          from '../../utils/cache.js';
import { paginate }   from '../../utils/pagination.js';
import {
  NotFoundError,
  ValidationError,
} from '../../utils/AppError.js';
import { calculateInterestAmount } from '../girvi/girvi.service.js';

// ─── Transfer Out ──────────────────────────────────────────────────────────────
export const transferOut = async (girviId, shopId, transferData, userId) => {
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

    if (girvi.status !== 'active' && girvi.status !== 'overdue') {
      throw new ValidationError(`Cannot transfer girvi with status: ${girvi.status}`);
    }

    if (girvi.isTransferred) {
      throw new ValidationError('Girvi is already transferred');
    }

    const customer = await Customer.findById(girvi.customerId).session(session);

    const transferDate = new Date(transferData.transferDate);

    // Calculate our interest till transfer date
    const fromDate = girvi.lastInterestCalcDate || girvi.girviDate;
    const { interest: ourInterestCalculated } = calculateInterestAmount({
      principal:        girvi.outstandingPrincipal || girvi.principalAmount,
      interestRate:     girvi.interestRate,
      interestType:     transferData.ourInterestType || girvi.interestType,
      calculationBasis: girvi.calculationBasis,
      fromDate,
      toDate:           transferDate,
    });

    const ourInterestTillTransfer = parseFloat(
      transferData.ourInterestTillTransfer ?? ourInterestCalculated
    );

    // Build items snapshot from girvi
    const itemsSnapshot = girvi.items.map(item => ({
      itemName:    item.itemName,
      itemType:    item.itemType,
      description: item.description,
      quantity:    item.quantity,
      grossWeight: item.grossWeight,
      lessWeight:  item.lessWeight,
      netWeight:   item.netWeight,
      tunch:       item.tunch,
      purity:      item.purity,
      ratePerGram: item.ratePerGram,
      approxValue: item.approxValue,
      finalValue:  item.finalValue,
      condition:   item.condition,
    }));

    const totalItemsValue = itemsSnapshot.reduce((sum, i) => sum + (i.finalValue || 0), 0);

    // Generate transfer number
    const transferNumber = await GirviTransfer.generateTransferNumber(shopId);

    // Create transfer record
    const [transfer] = await GirviTransfer.create(
      [
        {
          girviId,
          organizationId:      girvi.organizationId,
          shopId,
          customerId:          girvi.customerId,
          transferNumber,
          transferType:        'outgoing',
          fromParty: {
            type:         'shop',
            name:         transferData.fromParty?.name  || 'Our Shop',
            phone:        transferData.fromParty?.phone,
            address:      transferData.fromParty?.address,
            interestRate: girvi.interestRate,
            interestType: girvi.interestType,
          },
          toParty: {
            type:         transferData.toParty?.type  || 'external',
            name:         transferData.toParty.name,
            phone:        transferData.toParty?.phone,
            address:      transferData.toParty?.address,
            shopId:       transferData.toParty?.shopId,
            interestRate: transferData.toParty.interestRate,
            interestType: transferData.toParty.interestType || 'simple',
          },
          transferDate,
          ourPrincipalAmount:      girvi.outstandingPrincipal || girvi.principalAmount,
          ourInterestTillTransfer,
          ourInterestRate:         girvi.interestRate,
          ourInterestType:         transferData.ourInterestType || girvi.interestType,
          ourTotalDue:             parseFloat(
            ((girvi.outstandingPrincipal || girvi.principalAmount) + ourInterestTillTransfer).toFixed(2)
          ),
          partyPrincipalAmount:    parseFloat(transferData.partyPrincipalAmount),
          partyInterestRate:       transferData.toParty.interestRate,
          partyInterestType:       transferData.toParty.interestType || 'simple',
          transferAmount:          parseFloat(transferData.transferAmount || 0),
          commission:              parseFloat(transferData.commission || 0),
          paymentMode:             transferData.paymentMode || 'cash',
          transactionReference:    transferData.transactionReference,
          itemsSnapshot,
          totalItemsValue,
          status:                  'completed',
          createdBy:               userId,
          notes:                   transferData.notes,
        },
      ],
      { session }
    );

    // Update girvi status
    girvi.status              = 'transferred';
    girvi.isTransferred       = true;
    girvi.currentHolderType   = 'external_party';
    girvi.transferredToParty  = {
      name:    transferData.toParty.name,
      phone:   transferData.toParty?.phone,
      address: transferData.toParty?.address,
    };
    girvi.transferInterestRate = transferData.toParty.interestRate;
    girvi.transferInterestType = transferData.toParty.interestType || 'simple';
    girvi.updatedBy            = userId;

    await girvi.save({ session });

    // Cashbook entry - transfer out (cash given to party if any)
    if (transferData.transferAmount > 0) {
      await GirviCashbook.createEntry({
        shopId,
        organizationId:       girvi.organizationId,
        entryType:            'transfer_out',
        flowType:             'outflow',
        amount:               parseFloat(transferData.transferAmount),
        paymentMode:          transferData.paymentMode || 'cash',
        transactionReference: transferData.transactionReference,
        breakdown: {
          principalAmount: parseFloat(transferData.transferAmount),
          netAmount:       parseFloat(transferData.transferAmount),
        },
        girviId,
        transferId:    transfer._id,
        customerId:    girvi.customerId,
        girviNumber:   girvi.girviNumber,
        customerName:  customer?.fullName,
        customerPhone: customer?.phone,
        entryDate:     transferDate,
        createdBy:     userId,
        remarks:       `Transfer out to ${transferData.toParty.name}: ${girvi.girviNumber}`,
      });
    }

    await session.commitTransaction();
    await invalidateTransferCache(shopId, girviId);

    return { transfer, updatedGirvi: girvi };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Transfer Return ───────────────────────────────────────────────────────────
export const transferReturn = async (girviId, transferId, shopId, returnData, userId) => {
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

    if (girvi.status !== 'transferred') {
      throw new ValidationError('Girvi is not in transferred status');
    }

    // Fetch transfer
    const transfer = await GirviTransfer.findOne({
      _id:       transferId,
      girviId,
      shopId,
      status:    'completed',
      deletedAt: null,
    }).session(session);

    if (!transfer) throw new NotFoundError('Transfer not found or already returned');

    const customer   = await Customer.findById(girvi.customerId).session(session);
    const returnDate = new Date(returnData.returnDate);

    // Calculate party's interest for the period
    const partyDays = Math.floor(
      (returnDate - new Date(transfer.transferDate)) / (1000 * 60 * 60 * 24)
    );
    const { interest: partyInterestCalc } = calculateInterestAmount({
      principal:        transfer.partyPrincipalAmount,
      interestRate:     transfer.partyInterestRate,
      interestType:     transfer.partyInterestType,
      calculationBasis: 'monthly',
      fromDate:         transfer.transferDate,
      toDate:           returnDate,
    });

    const partyInterestCharged  = parseFloat(returnData.partyInterestCharged);
    const returnAmount          = parseFloat(returnData.returnAmount);

    // Update transfer record
    transfer.returnDate             = returnDate;
    transfer.returnAmount           = returnAmount;
    transfer.partyInterestCharged   = partyInterestCharged;
    transfer.partyInterestDays      = partyDays;
    transfer.returnReason           = returnData.returnReason;
    transfer.returnPaymentMode      = returnData.returnPaymentMode;
    transfer.returnTransactionReference = returnData.returnTransactionReference;
    transfer.returnRemarks          = returnData.returnRemarks;
    transfer.status                 = 'returned';
    transfer.updatedBy              = userId;

    await transfer.save({ session });

    // Restore girvi status to active
    girvi.status              = 'active';
    girvi.isTransferred       = false;
    girvi.currentHolderType   = 'shop';
    girvi.transferredToParty  = undefined;
    girvi.transferInterestRate = undefined;
    girvi.transferInterestType = undefined;
    girvi.updatedBy           = userId;

    // Update girvi outstanding with party interest added back
    girvi.outstandingPrincipal = transfer.partyPrincipalAmount;
    girvi.accruedInterest      = partyInterestCharged;
    girvi.totalAmountDue       = parseFloat(
      (transfer.partyPrincipalAmount + partyInterestCharged).toFixed(2)
    );
    girvi.lastInterestCalcDate = returnDate;

    await girvi.save({ session });

    // Cashbook entries on return
    // We paid party for return → outflow
    if (returnAmount > 0) {
      await GirviCashbook.createEntry({
        shopId,
        organizationId:       girvi.organizationId,
        entryType:            'transfer_return_in',
        flowType:             'outflow',
        amount:               returnAmount,
        paymentMode:          returnData.returnPaymentMode,
        transactionReference: returnData.returnTransactionReference,
        breakdown: {
          principalAmount: transfer.partyPrincipalAmount,
          interestAmount:  partyInterestCharged,
          netAmount:       returnAmount,
        },
        girviId,
        transferId:    transfer._id,
        customerId:    girvi.customerId,
        girviNumber:   girvi.girviNumber,
        customerName:  customer?.fullName,
        customerPhone: customer?.phone,
        entryDate:     returnDate,
        createdBy:     userId,
        remarks:       `Transfer return from ${transfer.toParty.name}: ${girvi.girviNumber}`,
      });
    }

    await session.commitTransaction();
    await invalidateTransferCache(shopId, girviId);

    return {
      transfer,
      updatedGirvi: {
        status:               girvi.status,
        outstandingPrincipal: girvi.outstandingPrincipal,
        accruedInterest:      girvi.accruedInterest,
        totalAmountDue:       girvi.totalAmountDue,
      },
      partySummary: {
        partyPrincipalAmount:  transfer.partyPrincipalAmount,
        partyInterestRate:     transfer.partyInterestRate,
        partyInterestType:     transfer.partyInterestType,
        partyDays,
        partyInterestCalc,
        partyInterestCharged,
        returnAmount,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Get Transfers for a Girvi ─────────────────────────────────────────────────
export const getTransfersByGirvi = async (girviId, shopId, filters = {}, paginationOptions = {}) => {
  const girvi = await Girvi.findOne({ _id: girviId, shopId, deletedAt: null }).lean();
  if (!girvi) throw new NotFoundError('Girvi not found');

  const query = {
    girviId:   new mongoose.Types.ObjectId(girviId),
    deletedAt: null,
  };

  if (filters.status)       query.status       = filters.status;
  if (filters.transferType) query.transferType = filters.transferType;

  const cacheKey = `girvi-transfers:${girviId}:${JSON.stringify(filters)}`;
  const cached   = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await paginate(GirviTransfer, query, {
    page:     paginationOptions.page  || 1,
    limit:    paginationOptions.limit || 20,
    sort:     paginationOptions.sort  || '-transferDate',
    select:   'transferNumber transferType fromParty toParty transferDate ourPrincipalAmount ourInterestTillTransfer partyPrincipalAmount partyInterestRate partyInterestType transferAmount status returnDate partyInterestCharged returnAmount createdAt',
    populate: [{ path: 'createdBy', select: 'firstName lastName' }],
  });

  await cache.set(cacheKey, result, 300);
  return result;
};

// ─── Get Single Transfer ───────────────────────────────────────────────────────
export const getTransferById = async (transferId, girviId, shopId) => {
  const transfer = await GirviTransfer.findOne({
    _id:       transferId,
    girviId,
    shopId,
    deletedAt: null,
  })
    .populate('createdBy', 'firstName lastName')
    .lean();

  if (!transfer) throw new NotFoundError('Transfer not found');
  return transfer;
};

// ─── Get All Shop Transfers ────────────────────────────────────────────────────
export const getShopTransfers = async (shopId, filters = {}, paginationOptions = {}) => {
  const query = {
    shopId:    new mongoose.Types.ObjectId(shopId),
    deletedAt: null,
  };

  if (filters.status)       query.status       = filters.status;
  if (filters.transferType) query.transferType = filters.transferType;

  if (filters.startDate || filters.endDate) {
    query.transferDate = {};
    if (filters.startDate) query.transferDate.$gte = new Date(filters.startDate);
    if (filters.endDate)   query.transferDate.$lte = new Date(filters.endDate);
  }

  const result = await paginate(GirviTransfer, query, {
    page:     paginationOptions.page  || 1,
    limit:    paginationOptions.limit || 20,
    sort:     paginationOptions.sort  || '-transferDate',
    select:   'girviId transferNumber transferType fromParty toParty transferDate ourPrincipalAmount partyPrincipalAmount partyInterestRate transferAmount status returnDate createdAt',
    populate: [
      { path: 'girviId',    select: 'girviNumber status customerId' },
      { path: 'customerId', select: 'firstName lastName phone customerCode' },
    ],
  });

  // Summary
  const summary = await getTransferSummary(shopId, filters);
  return { ...result, summary };
};

// ─── Get Transfer Summary ──────────────────────────────────────────────────────
export const getTransferSummary = async (shopId, filters = {}) => {
  const matchStage = {
    shopId:    new mongoose.Types.ObjectId(shopId),
    deletedAt: null,
  };

  if (filters.startDate || filters.endDate) {
    matchStage.transferDate = {};
    if (filters.startDate) matchStage.transferDate.$gte = new Date(filters.startDate);
    if (filters.endDate)   matchStage.transferDate.$lte = new Date(filters.endDate);
  }

  const result = await GirviTransfer.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id:                    null,
        totalTransfers:         { $sum: 1 },
        activeTransfers: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        returnedTransfers: {
          $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] },
        },
        totalPartyPrincipal:    { $sum: '$partyPrincipalAmount' },
        totalTransferAmount:    { $sum: '$transferAmount' },
        totalPartyInterest:     { $sum: '$partyInterestCharged' },
        totalReturnAmount:      { $sum: '$returnAmount' },
      },
    },
  ]);

  return result[0] || {
    totalTransfers:      0,
    activeTransfers:     0,
    returnedTransfers:   0,
    totalPartyPrincipal: 0,
    totalTransferAmount: 0,
    totalPartyInterest:  0,
    totalReturnAmount:   0,
  };
};

// ─── Calculate Party Interest (preview) ───────────────────────────────────────
export const calculatePartyInterest = async (transferId, girviId, shopId, toDate) => {
  const transfer = await GirviTransfer.findOne({
    _id:       transferId,
    girviId,
    shopId,
    deletedAt: null,
  }).lean();

  if (!transfer) throw new NotFoundError('Transfer not found');
  if (transfer.status === 'returned') throw new ValidationError('Transfer already returned');

  const calcDate = toDate ? new Date(toDate) : new Date();

  const { interest, days, months } = calculateInterestAmount({
    principal:        transfer.partyPrincipalAmount,
    interestRate:     transfer.partyInterestRate,
    interestType:     transfer.partyInterestType,
    calculationBasis: 'monthly',
    fromDate:         transfer.transferDate,
    toDate:           calcDate,
  });

  return {
    transferId,
    transferNumber:       transfer.transferNumber,
    toPartyName:          transfer.toParty.name,
    partyPrincipalAmount: transfer.partyPrincipalAmount,
    partyInterestRate:    transfer.partyInterestRate,
    partyInterestType:    transfer.partyInterestType,
    fromDate:             transfer.transferDate,
    toDate:               calcDate,
    days,
    months,
    partyInterestCalculated: interest,
    totalPayableToParty:     parseFloat((transfer.partyPrincipalAmount + interest).toFixed(2)),
  };
};

// ─── Cancel Transfer ───────────────────────────────────────────────────────────
export const cancelTransfer = async (transferId, girviId, shopId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transfer = await GirviTransfer.findOne({
      _id:       transferId,
      girviId,
      shopId,
      status:    'pending',
      deletedAt: null,
    }).session(session);

    if (!transfer) throw new NotFoundError('Transfer not found or cannot be cancelled');

    const girvi = await Girvi.findOne({ _id: girviId, shopId, deletedAt: null }).session(session);
    if (!girvi) throw new NotFoundError('Girvi not found');

    // Restore girvi
    girvi.status            = 'active';
    girvi.isTransferred     = false;
    girvi.currentHolderType = 'shop';
    girvi.updatedBy         = userId;
    await girvi.save({ session });

    // Cancel transfer
    transfer.status    = 'cancelled';
    transfer.updatedBy = userId;
    await transfer.save({ session });

    await session.commitTransaction();
    await invalidateTransferCache(shopId, girviId);

    return transfer;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Cache Helpers ─────────────────────────────────────────────────────────────
export const invalidateTransferCache = async (shopId, girviId) => {
  await cache.del(`girvi:${girviId}`);
  await cache.deletePattern(`girvi-transfers:${girviId}:*`);
  await cache.deletePattern(`girvis:${shopId}:*`);
};