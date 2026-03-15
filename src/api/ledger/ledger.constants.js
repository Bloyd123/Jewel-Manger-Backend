// src/api/ledger/ledger.constants.js

export const LEDGER_ENTRY_TYPES = {
  DEBIT: 'debit',
  CREDIT: 'credit',
};

export const LEDGER_REFERENCE_TYPES = {
  SALE: 'sale',
  PURCHASE: 'purchase',
  PAYMENT: 'payment',
  RETURN: 'return',
  ADJUSTMENT: 'adjustment',
  ADVANCE: 'advance',
  REFUND: 'refund',
  OPENING_BALANCE: 'opening_balance',
};

export const LEDGER_PARTY_TYPES = {
  // Actual parties
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',

  // Internal accounts (double entry ke liye)
  CASH: 'cash',                         // Cash payments ke liye
  BANK: 'bank',                         // UPI, card, bank transfer ke liye
  CHEQUE_CLEARING: 'cheque_clearing',   // Cheque pending phase ke liye
};

export const LEDGER_STATUS = {
  ACTIVE: 'active',
  REVERSED: 'reversed',
};