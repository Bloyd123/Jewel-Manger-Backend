// src/api/ledger/ledger.service.js

import mongoose from 'mongoose';
import LedgerEntry from './ledger.model.js';
import {
  LEDGER_ENTRY_TYPES,
  LEDGER_PARTY_TYPES,
  LEDGER_STATUS,
} from './ledger.constants.js';

export const createDebitEntry = async ({
  organizationId,
  shopId,
  partyType,
  partyId,
  partyModel,
  partyName,
  amount,
  referenceType,
  referenceId,
  referenceNumber,
  description,
  createdBy,
  notes,
  session = null,
}) => {
  const entry = await LedgerEntry.create(
    [
      {
        organizationId,
        shopId,
        partyType,
        partyId,
        partyModel,
        partyName,
        entryType: LEDGER_ENTRY_TYPES.DEBIT,
        amount,
        referenceType,
        referenceId,
        referenceNumber,
        description,
        createdBy,
        notes,
        status: LEDGER_STATUS.ACTIVE,
      },
    ],
    session ? { session } : {}
  );

  return entry[0];
};
export const createCreditEntry = async ({
  organizationId,
  shopId,
  partyType,
  partyId,
  partyModel,
  partyName,
  amount,
  referenceType,
  referenceId,
  referenceNumber,
  description,
  createdBy,
  notes,
  session = null,
}) => {
  const entry = await LedgerEntry.create(
    [
      {
        organizationId,
        shopId,
        partyType,
        partyId,
        partyModel,
        partyName,
        entryType: LEDGER_ENTRY_TYPES.CREDIT,
        amount,
        referenceType,
        referenceId,
        referenceNumber,
        description,
        createdBy,
        notes,
        status: LEDGER_STATUS.ACTIVE,
      },
    ],
    session ? { session } : {}
  );

  return entry[0];
};

export const getPartyBalance = async ({ partyId, shopId }) => {
  const result = await LedgerEntry.aggregate([
    {
      $match: {
        partyId: new mongoose.Types.ObjectId(partyId),
        shopId: new mongoose.Types.ObjectId(shopId),
        status: LEDGER_STATUS.ACTIVE,
      },
    },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [
              { $eq: ['$entryType', LEDGER_ENTRY_TYPES.DEBIT] },
              '$amount',
              0,
            ],
          },
        },
        totalCredit: {
          $sum: {
            $cond: [
              { $eq: ['$entryType', LEDGER_ENTRY_TYPES.CREDIT] },
              '$amount',
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalDebit: 1,
        totalCredit: 1,
        balance: { $subtract: ['$totalDebit', '$totalCredit'] },
      },
    },
  ]);

  if (!result.length) {
    return { totalDebit: 0, totalCredit: 0, balance: 0 };
  }

  return result[0];
};

export const getCashBalance = async (shopId) => {
  const result = await LedgerEntry.aggregate([
    {
      $match: {
        shopId: new mongoose.Types.ObjectId(shopId),
        partyType: LEDGER_PARTY_TYPES.CASH,
        status: LEDGER_STATUS.ACTIVE,
      },
    },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [
              { $eq: ['$entryType', LEDGER_ENTRY_TYPES.DEBIT] },
              '$amount',
              0,
            ],
          },
        },
        totalCredit: {
          $sum: {
            $cond: [
              { $eq: ['$entryType', LEDGER_ENTRY_TYPES.CREDIT] },
              '$amount',
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalDebit: 1,
        totalCredit: 1,
        balance: { $subtract: ['$totalDebit', '$totalCredit'] },
      },
    },
  ]);

  if (!result.length) {
    return { totalDebit: 0, totalCredit: 0, balance: 0 };
  }

  return result[0];
};

export const getBankBalance = async (shopId) => {
  const result = await LedgerEntry.aggregate([
    {
      $match: {
        shopId: new mongoose.Types.ObjectId(shopId),
        partyType: LEDGER_PARTY_TYPES.BANK,
        status: LEDGER_STATUS.ACTIVE,
      },
    },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [
              { $eq: ['$entryType', LEDGER_ENTRY_TYPES.DEBIT] },
              '$amount',
              0,
            ],
          },
        },
        totalCredit: {
          $sum: {
            $cond: [
              { $eq: ['$entryType', LEDGER_ENTRY_TYPES.CREDIT] },
              '$amount',
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalDebit: 1,
        totalCredit: 1,
        balance: { $subtract: ['$totalDebit', '$totalCredit'] },
      },
    },
  ]);

  if (!result.length) {
    return { totalDebit: 0, totalCredit: 0, balance: 0 };
  }

  return result[0];
};

export const getPartyLedger = async ({
  partyId,
  shopId,
  page = 1,
  limit = 20,
}) => {
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    LedgerEntry.find({
      partyId,
      shopId,
      status: LEDGER_STATUS.ACTIVE,
    })
      .sort({ entryDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    LedgerEntry.countDocuments({
      partyId,
      shopId,
      status: LEDGER_STATUS.ACTIVE,
    }),
  ]);

  return {
    entries,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const reverseEntry = async ({
  entryId,
  createdBy,
  description,
  session = null,
}) => {
  const originalEntry = await LedgerEntry.findById(entryId);

  if (!originalEntry) {
    throw new Error('Ledger entry not found');
  }

  if (originalEntry.status === LEDGER_STATUS.REVERSED) {
    throw new Error('Entry already reversed');
  }

  const reverseType =
    originalEntry.entryType === LEDGER_ENTRY_TYPES.DEBIT
      ? LEDGER_ENTRY_TYPES.CREDIT
      : LEDGER_ENTRY_TYPES.DEBIT;

  const reversedEntry = await LedgerEntry.create(
    [
      {
        organizationId: originalEntry.organizationId,
        shopId: originalEntry.shopId,
        partyType: originalEntry.partyType,
        partyId: originalEntry.partyId,
        partyModel: originalEntry.partyModel,
        partyName: originalEntry.partyName,
        entryType: reverseType,
        amount: originalEntry.amount,
        referenceType: originalEntry.referenceType,
        referenceId: originalEntry.referenceId,
        referenceNumber: originalEntry.referenceNumber,
        description: description || `Reversal of ${originalEntry.description}`,
        createdBy,
        isReversalOf: originalEntry._id,
        status: LEDGER_STATUS.ACTIVE,
      },
    ],
    session ? { session } : {}
  );

  await LedgerEntry.findByIdAndUpdate(
    entryId,
    {
      status: LEDGER_STATUS.REVERSED,
      reversedBy: reversedEntry[0]._id,
    },
    session ? { session } : {}
  );

  return reversedEntry[0];
};

// ─────────────────────────────────────────────
// OPENING BALANCE ENTRY
// ────────────────────────────────────────────
export const createOpeningBalanceEntry = async ({
  organizationId,
  shopId,
  partyType,
  partyId,
  partyModel,
  partyName,
  amount,
  direction,
  createdBy,
  notes,
  referenceId,   // ← Add karo parameter me
  session = null,
}) => {
  const entryType = direction === 'they_owe'
    ? LEDGER_ENTRY_TYPES.DEBIT
    : LEDGER_ENTRY_TYPES.CREDIT;

  const entry = await LedgerEntry.create(
    [{
      organizationId,
      shopId,
      partyType,
      partyId,
      partyModel,
      partyName,
      entryType,
      amount,
      referenceType:   'opening_balance',
      referenceId:     referenceId || partyId,  // ← Fix: null nahi, partyId use karo
      referenceNumber: 'OPENING',
      description:     `Opening balance - ${partyName}`,
      createdBy,
      notes,
      status: LEDGER_STATUS.ACTIVE,
    }],
    session ? { session } : {}
  );

  return entry[0];
};

// ─────────────────────────────────────────────
// CASH OPENING BALANCE ENTRY
// ─────────────────────────────────────────────
export const createCashOpeningEntry = async ({
  organizationId,
  shopId,
  amount,
  accountType = 'cash',
  createdBy,
  notes,
  session = null,
}) => {
  const partyType = accountType === 'cash'
    ? LEDGER_PARTY_TYPES.CASH
    : LEDGER_PARTY_TYPES.BANK;

  const entry = await LedgerEntry.create(
    [{
      organizationId,
      shopId,
      partyType,
      partyId:         shopId,        // Shop ID as party
      partyModel:      'JewelryShop',
      partyName:       accountType.toUpperCase(),
      entryType:       LEDGER_ENTRY_TYPES.DEBIT,
      amount,
      referenceType:   'opening_balance',
      referenceId:     shopId,        // ← Fix: null ki jagah shopId use karo
      referenceNumber: 'OPENING',
      description:     `Opening ${accountType} balance`,
      createdBy,
      notes,
      status: LEDGER_STATUS.ACTIVE,
    }],
    session ? { session } : {}
  );

  return entry[0];
};