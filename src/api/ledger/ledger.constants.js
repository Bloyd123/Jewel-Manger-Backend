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
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
};

export const LEDGER_STATUS = {
  ACTIVE: 'active',
  REVERSED: 'reversed',
};