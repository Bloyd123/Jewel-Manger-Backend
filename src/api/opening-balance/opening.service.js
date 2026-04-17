import mongoose from 'mongoose';
import OpeningBalance from '../../models/OpeningBalance.js';
import JewelryShop from '../../models/Shop.js';
import Customer from '../../models/Customer.js';
import Supplier from '../../models/Supplier.js';
import {
  createOpeningBalanceEntry,
  createCashOpeningEntry,
} from '../ledger/ledger.service.js';
import { createOpeningMetalEntry } from '../metal-ledger/metal.service.js';
import { NotFoundError, BadRequestError } from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

// ─────────────────────────────────────────────
// CREATE / UPDATE OPENING BALANCE (Draft)
// ─────────────────────────────────────────────
export const createOrUpdateOpeningBalance = async ({
  shopId,
  organizationId,
  openingDate,
  cashBalance,
  partyBalances,
  metalBalances,
  stockBalance,
  notes,
  userId,
}) => {
  // Already confirmed hai toh update nahi kar sakte
  const existing = await OpeningBalance.findOne({ shopId });

  if (existing?.status === 'confirmed') {
    throw new BadRequestError(
      'Opening balance is already confirmed. Cannot edit. Use adjustment entry instead.'
    );
  }

  const data = {
    organizationId,
    shopId,
    openingDate:    openingDate || new Date(),
    cashBalance:    cashBalance || { cash: 0, bank: [] },
    partyBalances:  partyBalances || [],
    metalBalances:  metalBalances || [],
    stockBalance:   stockBalance || { totalStockValue: 0 },
    notes,
    updatedBy:      userId,
  };

  let openingBalance;

  if (existing) {
    // Update karo
    Object.assign(existing, data);
    openingBalance = await existing.save();
  } else {
    // Create karo
    openingBalance = await OpeningBalance.create({
      ...data,
      createdBy: userId,
    });
  }

  return openingBalance;
};

// ─────────────────────────────────────────────
// GET OPENING BALANCE
// ─────────────────────────────────────────────
export const getOpeningBalance = async (shopId) => {
  const ob = await OpeningBalance.findOne({ shopId });
  if (!ob) {
    return { exists: false, message: 'Opening balance not set yet' };
  }
  return { exists: true, data: ob };
};

// ─────────────────────────────────────────────
// CONFIRM OPENING BALANCE
// Creates all ledger entries and locks the balance
// ─────────────────────────────────────────────
export const confirmOpeningBalance = async ({ shopId, organizationId, userId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ob = await OpeningBalance.findOne({ shopId }).session(session);

    if (!ob) {
      throw new NotFoundError('Opening balance not found. Please create it first.');
    }

    if (ob.status === 'confirmed') {
      throw new BadRequestError('Opening balance is already confirmed.');
    }

    // ── STEP 1: Cash Balance Entries ──────────────────────────
    if (ob.cashBalance?.cash > 0) {
      await createCashOpeningEntry({
        organizationId,
        shopId,
        amount:      ob.cashBalance.cash,
        accountType: 'cash',
        createdBy:   userId,
        notes:       'Opening cash balance',
        session,
      });
    }

    // Bank entries
    for (const bank of ob.cashBalance?.bank || []) {
      if (bank.balance > 0) {
        await createCashOpeningEntry({
          organizationId,
          shopId,
          amount:      bank.balance,
          accountType: 'bank',
          createdBy:   userId,
          notes:       `Opening bank balance - ${bank.bankName}`,
          session,
        });
      }
    }

    // ── STEP 2: Party Cash Balance Entries ────────────────────
    for (const party of ob.partyBalances || []) {
      if (party.amount <= 0) continue;

const ledgerEntry = await createOpeningBalanceEntry({
  organizationId,
  shopId,
  partyType:   party.partyType,
  partyId:     party.partyId,
  partyModel:  party.partyModel,
  partyName:   party.partyName,
  amount:      party.amount,
  direction:   party.direction,
  createdBy:   userId,
  notes:       party.notes || `Opening balance - ${party.partyName}`,
  referenceId: party.partyId,  // ← Party ID hi use karo as reference
  session,
});

      // LedgerEntry ID store karo
      party.ledgerEntryId = ledgerEntry._id;

      // Customer/Supplier ka openingBalance update karo
      if (party.partyType === 'customer') {
        await Customer.findByIdAndUpdate(
          party.partyId,
          {
            $set: {
              'openingBalance.cashBalance': party.direction === 'they_owe'
                ? party.amount
                : -party.amount,
              'openingBalance.setAt': new Date(),
            },
          },
          { session }
        );
      } else if (party.partyType === 'supplier') {
        await Supplier.findByIdAndUpdate(
          party.partyId,
          {
            $set: {
              'openingBalance.cashBalance': party.direction === 'they_owe'
                ? party.amount
                : -party.amount,
              'openingBalance.setAt': new Date(),
            },
          },
          { session }
        );
      }
    }

    // ── STEP 3: Party Metal Balance Entries ───────────────────
    for (const metal of ob.metalBalances || []) {
      if (metal.weight <= 0) continue;

      const metalEntry = await createOpeningMetalEntry({
        organizationId,
        shopId,
        partyType:     metal.partyType,
        partyId:       metal.partyId,
        partyModel:    metal.partyModel,
        partyName:     metal.partyName,
        metalType:     metal.metalType,
        weight:        metal.weight,
        direction:     metal.direction,
        referenceRate: metal.referenceRate,
        notes:         metal.notes || `Opening metal balance - ${metal.partyName}`,
        userId,
        session,
      });

      // MetalLedger entry ID store karo
      metal.metalLedgerEntryId = metalEntry._id;

      // Customer/Supplier metalBalance update karo
      const metalField   = `metalBalance.${metal.metalType}`;
      const metalValue   = metal.direction === 'they_owe'
        ? metal.weight
        : -metal.weight;

      if (metal.partyType === 'customer') {
        await Customer.findByIdAndUpdate(
          metal.partyId,
          { $set: { [metalField]: metalValue, 'openingBalance.setAt': new Date() } },
          { session }
        );
      } else if (metal.partyType === 'supplier') {
        await Supplier.findByIdAndUpdate(
          metal.partyId,
          { $set: { [metalField]: metalValue, 'openingBalance.setAt': new Date() } },
          { session }
        );
      }
    }

    // ── STEP 4: Confirm karo ──────────────────────────────────
    await ob.confirm(userId);

    // ── STEP 5: Shop update karo ──────────────────────────────
    await JewelryShop.findByIdAndUpdate(
      shopId,
      {
        $set: {
          openingStockDate:     ob.openingDate,
          isOpeningBalanceSet:  true,
          openingBalanceId:     ob._id,
        },
      },
      { session }
    );

    await session.commitTransaction();

    return ob;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────
// GET SETUP STATUS
// Frontend ko dikhao ki kya set hua hai kya nahi
// ─────────────────────────────────────────────
export const getSetupStatus = async (shopId) => {
  const shop = await JewelryShop.findById(shopId).lean();
  if (!shop) throw new NotFoundError('Shop not found');

  const ob = await OpeningBalance.findOne({ shopId }).lean();

  return {
    isOpeningBalanceSet: shop.isOpeningBalanceSet || false,
    openingDate:         shop.openingStockDate    || null,
    openingBalanceStatus: ob?.status || 'not_started',
    hasCashBalance:      ob?.cashBalance?.totalCashAndBank > 0 || false,
    hasPartyBalances:    (ob?.partyBalances?.length || 0) > 0,
    hasMetalBalances:    (ob?.metalBalances?.length || 0) > 0,
    hasStockBalance:     ob?.stockBalance?.totalStockValue > 0 || false,
  };
};