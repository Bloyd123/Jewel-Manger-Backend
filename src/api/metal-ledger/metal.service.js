import mongoose from 'mongoose';
import MetalLedger from '../../models/MetalLedger.js';
import MetalRate from '../../models/MetalRate.js';
import { NotFoundError, BadRequestError, ValidationError } from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

// CREATE METAL LEDGER ENTRY
export const createMetalEntry = async ({
  organizationId,
  shopId,
  partyType,
  partyId,
  partyModel,
  partyName,
  metalType,
  entryType,
  weight,
  weightUnit = 'gram',
  direction,
  referenceType,
  referenceId,
  referenceNumber,
  notes,
  userId,
  session = null,
}) => {
  // Current rate fetch karo reference ke liye
  let rateAtEntry = null;
  try {
    const currentRate = await MetalRate.getCurrentRate(shopId);
    if (currentRate) {
      const rateObj = currentRate.getRateForPurity(metalType, null, null);
      rateAtEntry   = rateObj?.sellingRate || null;
    }
  } catch (err) {
    logger.warn('Could not fetch metal rate for ledger entry:', err.message);
  }

  const entry = await MetalLedger.create(
    [{
      organizationId,
      shopId,
      partyType,
      partyId,
      partyModel,
      partyName,
      metalType,
      entryType,
      weight,
      weightUnit,
      pendingWeight: weight,  // Pre-save me recalculate hoga
      direction,
      rateAtEntry,
      referenceType,
      referenceId:     referenceId   || null,
      referenceNumber: referenceNumber || null,
      notes,
      status: 'pending',
      createdBy: userId,
    }],
    session ? { session } : {}
  );

  return entry[0];
};

// GET PARTY METAL BALANCE
export const getPartyMetalBalance = async (shopId, partyId, metalType = null) => {
  return MetalLedger.getPartyMetalBalance(shopId, partyId, metalType);
};

// GET PARTY METAL HISTORY
export const getPartyMetalHistory = async (
  shopId,
  partyId,
  filters = {}
) => {
  const { metalType, status, page = 1, limit = 20 } = filters;

  const query = { shopId, partyId, deletedAt: null };
  if (metalType) query.metalType = metalType;
  if (status)    query.status    = status;

  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    MetalLedger.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    MetalLedger.countDocuments(query),
  ]);

  return { entries, total, page, limit };
};

// SETTLE METAL ENTRY - Cash me convert karo
export const settleMetalEntry = async ({
  shopId,
  entryId,
  settleWeight,
  rateAtSettlement,
  settlementMode = 'cash',
  notes,
  userId,
}) => {
  const entry = await MetalLedger.findOne({
    _id: entryId,
    shopId,
    deletedAt: null,
  });

  if (!entry) throw new NotFoundError('Metal ledger entry not found');

  if (entry.status === 'settled') {
    throw new BadRequestError('This entry is already fully settled');
  }

  if (settleWeight > entry.pendingWeight) {
    throw new BadRequestError(
      `Cannot settle ${settleWeight}g. Only ${entry.pendingWeight}g is pending.`
    );
  }

  // Rate nahi diya toh current rate use karo
  let finalRate = rateAtSettlement;
  if (!finalRate) {
    const currentRate = await MetalRate.getCurrentRate(shopId);
    if (!currentRate) {
      throw new ValidationError(
        'No metal rate found. Please provide rate manually or set current metal rates.'
      );
    }
    const rateObj = currentRate.getRateForPurity(entry.metalType, null, null);
    finalRate     = rateObj?.sellingRate || 0;
  }

  await entry.settle(settleWeight, finalRate, settlementMode, userId);

  if (notes) {
    entry.notes = notes;
    await entry.save();
  }

  return {
    entry,
    settlement: {
      settledWeight,
      rateApplied:     finalRate,
      settledAmount:   settleWeight * finalRate,
      remainingWeight: entry.pendingWeight,
    },
  };
};

// BULK SETTLE - Party ke saare pending entries settle karo
export const bulkSettlePartyMetal = async ({
  shopId,
  partyId,
  metalType,
  rateAtSettlement,
  settlementMode = 'cash',
  userId,
}) => {
  const pendingEntries = await MetalLedger.find({
    shopId,
    partyId,
    metalType,
    status:    { $in: ['pending', 'partial'] },
    deletedAt: null,
  });

  if (!pendingEntries.length) {
    throw new NotFoundError(`No pending ${metalType} entries found for this party`);
  }

  // Rate nahi diya toh current rate use karo
  let finalRate = rateAtSettlement;
  if (!finalRate) {
    const currentRate = await MetalRate.getCurrentRate(shopId);
    if (!currentRate) {
      throw new ValidationError('No metal rate found. Please provide rate manually.');
    }
    const rateObj = currentRate.getRateForPurity(metalType, null, null);
    finalRate     = rateObj?.sellingRate || 0;
  }

  let totalSettledWeight = 0;
  let totalSettledAmount = 0;

  for (const entry of pendingEntries) {
    const weightToSettle = entry.pendingWeight;
    await entry.settle(weightToSettle, finalRate, settlementMode, userId);
    totalSettledWeight += weightToSettle;
    totalSettledAmount += weightToSettle * finalRate;
  }

  return {
    settledEntries:      pendingEntries.length,
    totalSettledWeight,
    totalSettledAmount,
    rateApplied:         finalRate,
    metalType,
  };
};

// GET SHOP METAL SUMMARY - Dashboard ke liye
export const getShopMetalSummary = async (shopId) => {
  const summary = await MetalLedger.getShopMetalSummary(shopId);

  // Current rates fetch karo approximate value ke liye
  const currentRate = await MetalRate.getCurrentRate(shopId);

  // Format karo
  const result = {
    gold:     { we_owe: 0, they_owe: 0, net: 0, approxValue: 0 },
    silver:   { we_owe: 0, they_owe: 0, net: 0, approxValue: 0 },
    platinum: { we_owe: 0, they_owe: 0, net: 0, approxValue: 0 },
  };

  summary.forEach(item => {
    const metal = item._id.metalType;
    const dir   = item._id.direction;
    if (result[metal]) {
      result[metal][dir] += item.totalPendingWeight;
    }
  });

  // Net calculate karo aur approximate value
  ['gold', 'silver', 'platinum'].forEach(metal => {
    result[metal].net = result[metal].they_owe - result[metal].we_owe;

    if (currentRate) {
      const rateObj = currentRate.getRateForPurity(metal, null, null);
      const rate    = rateObj?.sellingRate || 0;
      result[metal].approxValue = result[metal].net * rate;
    }
  });

  return result;
};

// GET ALL PENDING ENTRIES
export const getPendingEntries = async (shopId, filters = {}) => {
  const {
    partyType,
    metalType,
    direction,
    page  = 1,
    limit = 20,
  } = filters;

  const query = {
    shopId,
    status:    { $in: ['pending', 'partial'] },
    deletedAt: null,
  };

  if (partyType) query.partyType = partyType;
  if (metalType) query.metalType = metalType;
  if (direction) query.direction = direction;

  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    MetalLedger.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    MetalLedger.countDocuments(query),
  ]);

  return { entries, total, page, limit };
};

// CREATE OPENING BALANCE METAL ENTRY
export const createOpeningMetalEntry = async ({
  organizationId,
  shopId,
  partyType,
  partyId,
  partyModel,
  partyName,
  metalType,
  weight,
  direction,
  referenceRate,
  notes,
  userId,
  session = null,
}) => {
  return createMetalEntry({
    organizationId,
    shopId,
    partyType,
    partyId,
    partyModel,
    partyName,
    metalType,
    entryType:   'opening_balance',
    weight,
    direction,
    referenceType: 'opening_balance',
    notes,
    userId,
    session,
  });
};