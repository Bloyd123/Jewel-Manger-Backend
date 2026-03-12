// src/api/inventory/inventory.constants.js

export const TRANSACTION_TYPES = {
  IN: 'IN',
  OUT: 'OUT',
  ADJUSTMENT: 'ADJUSTMENT',
  SALE: 'SALE',
  PURCHASE: 'PURCHASE',
  RETURN: 'RETURN',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  DAMAGE: 'DAMAGE',
  RESERVED: 'RESERVED',
  UNRESERVED: 'UNRESERVED',
};

export const REFERENCE_TYPES = {
  PRODUCT_CREATION: 'product_creation',
  SALE: 'sale',
  PURCHASE: 'purchase',
  RETURN: 'return',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
  TRANSFER: 'transfer',
  DAMAGE: 'damage',
  RESERVATION: 'reservation',
  STOCK_UPDATE: 'stock_update',
};