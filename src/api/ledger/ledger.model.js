// src/api/ledger/ledger.model.js

import mongoose from 'mongoose';
import {
  LEDGER_ENTRY_TYPES,
  LEDGER_REFERENCE_TYPES,
  LEDGER_PARTY_TYPES,
  LEDGER_STATUS,
} from './ledger.constants.js';

const ledgerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      required: true,
      index: true,
    },

    // Party type — customer, supplier, ya internal account (cash/bank)
    partyType: {
      type: String,
      enum: Object.values(LEDGER_PARTY_TYPES),
      required: true,
      index: true,
    },

    // partyId — customer/supplier ka _id, ya internal account ke liye shopId
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'partyModel',
      index: true,
    },

    // partyModel — mongoose populate ke liye
    // Customer, Supplier → actual party
    // JewelryShop → cash/bank/cheque_clearing internal account
    partyModel: {
      type: String,
      required: true,
      enum: ['Customer', 'Supplier', 'JewelryShop'],
    },

    partyName: {
      type: String,
      required: true,
    },

    entryType: {
      type: String,
      enum: Object.values(LEDGER_ENTRY_TYPES),
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    referenceType: {
      type: String,
      enum: Object.values(LEDGER_REFERENCE_TYPES),
      required: true,
      index: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    referenceNumber: {
      type: String,
    },

    description: {
      type: String,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: Object.values(LEDGER_STATUS),
      default: LEDGER_STATUS.ACTIVE,
      index: true,
    },

    // Reversal tracking
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerEntry',
      default: null,
    },
    isReversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerEntry',
      default: null,
    },

    entryDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ledgerSchema.index({ shopId: 1, partyId: 1, entryDate: -1 });
ledgerSchema.index({ organizationId: 1, entryDate: -1 });
ledgerSchema.index({ partyId: 1, status: 1 });
ledgerSchema.index({ referenceType: 1, referenceId: 1 });

// Cash/Bank balance quickly dekhne ke liye
ledgerSchema.index({ shopId: 1, partyType: 1, status: 1 });

const LedgerEntry = mongoose.model('LedgerEntry', ledgerSchema);

export default LedgerEntry;