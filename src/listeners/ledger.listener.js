import eventBus from '../eventBus.js';
import {
  createDebitEntry,
  createCreditEntry,
  reverseEntry,
} from '../api/ledger/ledger.service.js';
import LedgerEntry from '../api/ledger/ledger.model.js';
import logger from '../utils/logger.js';
import { createMetalEntry } from '../api/metal-ledger/metal.service.js';

// SALE_CREATED — customer pe debit entry
eventBus.on('SALE_CREATED', async (data) => {
  try {
    const { sale, customer, userId } = data;

    // Cash ledger entry - existing
    if (sale.payment.dueAmount > 0) {
      await createDebitEntry({
        organizationId:  sale.organizationId,
        shopId:          sale.shopId,
        partyType:       'customer',
        partyId:         customer._id,
        partyModel:      'Customer',
        partyName:       customer.fullName,
        amount:          sale.payment.dueAmount,
        referenceType:   'sale',
        referenceId:     sale._id,
        referenceNumber: sale.invoiceNumber,
        description:     `Sale created - ${sale.invoiceNumber}`,
        createdBy:       userId,
      });
    }

    // Metal ledger entry - nayi
    // Agar customer ne gold/silver diya hai
    for (const item of sale.items) {
      if (item.metalPending?.isPending && item.metalPending?.pendingWeight > 0) {
        await createMetalEntry({
          organizationId:  sale.organizationId,
          shopId:          sale.shopId,
          partyType:       'customer',
          partyId:         customer._id,
          partyModel:      'Customer',
          partyName:       customer.fullName,
          metalType:       item.metalPending.metalType,
          entryType:       'received',
          weight:          item.metalPending.pendingWeight,
          direction:       'we_owe', // Customer ka metal hamare paas hai
          referenceType:   'sale',
          referenceId:     sale._id,
          referenceNumber: sale.invoiceNumber,
          userId,
        });
      }
    }
  } catch (error) {
    logger.error('ledger.listener SALE_CREATED failed:', error.message);
  }
});

// SALE_CANCELLED — ledger entry reverse karo
eventBus.on('SALE_CANCELLED', async (data) => {
  try {
    const { sale, userId } = data;

    const ledgerEntry = await LedgerEntry.findOne({
      referenceId:   sale._id,
      referenceType: 'sale',
      status:        'active',
    });

    if (ledgerEntry) {
      await reverseEntry({
        entryId:     ledgerEntry._id,
        createdBy:   userId,
        description: `Sale cancelled - ${sale.invoiceNumber}`,
      });
    }
  } catch (error) {
    logger.error('ledger.listener SALE_CANCELLED failed:', error.message);
  }
});

// PURCHASE_RECEIVED — supplier pe debit entry
eventBus.on('PURCHASE_RECEIVED', async (data) => {
  try {
    const { purchase, userId } = data;

    // Cash ledger entry - existing
    if (purchase.payment.dueAmount > 0) {
      await createDebitEntry({
        organizationId:  purchase.organizationId,
        shopId:          purchase.shopId,
        partyType:       'supplier',
        partyId:         purchase.supplierId,
        partyModel:      'Supplier',
        partyName:       purchase.supplierDetails.supplierName,
        amount:          purchase.payment.dueAmount,
        referenceType:   'purchase',
        referenceId:     purchase._id,
        referenceNumber: purchase.purchaseNumber,
        description:     `Purchase received - ${purchase.purchaseNumber}`,
        createdBy:       userId,
      });
    }

    // Metal ledger entry - nayi
    // Agar koi item metal pending hai
    for (const item of purchase.items) {
      if (item.metalPending?.isPending && item.metalPending?.pendingWeight > 0) {
        await createMetalEntry({
          organizationId:  purchase.organizationId,
          shopId:          purchase.shopId,
          partyType:       'supplier',
          partyId:         purchase.supplierId,
          partyModel:      'Supplier',
          partyName:       purchase.supplierDetails.supplierName,
          metalType:       item.metalPending.metalType,
          entryType:       'received',
          weight:          item.metalPending.pendingWeight,
          direction:       'we_owe', // Hum denge supplier ko
          referenceType:   'purchase',
          referenceId:     purchase._id,
          referenceNumber: purchase.purchaseNumber,
          userId,
        });
      }
    }
  } catch (error) {
    logger.error('ledger.listener PURCHASE_RECEIVED failed:', error.message);
  }
});

// PURCHASE_CANCELLED — ledger entry reverse karo
eventBus.on('PURCHASE_CANCELLED', async (data) => {
  try {
    const { purchase, userId } = data;

    const ledgerEntry = await LedgerEntry.findOne({
      referenceId:   purchase._id,
      referenceType: 'purchase',
      status:        'active',
    });

    if (ledgerEntry) {
      await reverseEntry({
        entryId:     ledgerEntry._id,
        createdBy:   userId,
        description: `Purchase cancelled - ${purchase.purchaseNumber}`,
      });
    }
  } catch (error) {
    logger.error('ledger.listener PURCHASE_CANCELLED failed:', error.message);
  }
});

// PURCHASE_RETURNED — supplier pe credit entry
eventBus.on('PURCHASE_RETURNED', async (data) => {
  try {
    const { purchase, userId } = data;

    await createCreditEntry({
      organizationId:  purchase.organizationId,
      shopId:          purchase.shopId,
      partyType:       'supplier',
      partyId:         purchase.supplierId,
      partyModel:      'Supplier',
      partyName:       purchase.supplierDetails.supplierName,
      amount:          purchase.financials.grandTotal,
      referenceType:   'purchase',
      referenceId:     purchase._id,
      referenceNumber: purchase.purchaseNumber,
      description:     `Purchase returned - ${purchase.purchaseNumber}`,
      createdBy:       userId,
    });
  } catch (error) {
    logger.error('ledger.listener PURCHASE_RETURNED failed:', error.message);
  }
});

// PURCHASE_PAYMENT_ADDED — supplier ko payment di
eventBus.on('PURCHASE_PAYMENT_ADDED', async (data) => {
  try {
    const { purchase, payment, userId } = data;

    await createCreditEntry({
      organizationId:  purchase.organizationId,
      shopId:          purchase.shopId,
      partyType:       'supplier',
      partyId:         purchase.supplierId,
      partyModel:      'Supplier',
      partyName:       purchase.supplierDetails.supplierName,
      amount:          payment.amount,
      referenceType:   'payment',
      referenceId:     payment._id,
      referenceNumber: payment.paymentNumber,
      description:     `Payment made for purchase - ${purchase.purchaseNumber}`,
      createdBy:       userId,
    });
  } catch (error) {
    logger.error('ledger.listener PURCHASE_PAYMENT_ADDED failed:', error.message);
  }
});

// PAYMENT_COMPLETED — cash/bank entry
eventBus.on('PAYMENT_COMPLETED', async (data) => {
  try {
    const { payment } = data;

    const getAccountType = (paymentMode) => {
      switch (paymentMode) {
        case 'cash':    return 'cash';
        case 'cheque':  return 'cheque_clearing';
        default:        return 'bank';
      }
    };

    const accountType = getAccountType(payment.paymentMode);

    // Party side entry
    const partyEntryFn = payment.transactionType === 'receipt'
      ? createCreditEntry
      : createDebitEntry;

    await partyEntryFn({
      organizationId:  payment.organizationId,
      shopId:          payment.shopId,
      partyType:       payment.party.partyType,
      partyId:         payment.party.partyId,
      partyModel:      payment.party.partyType === 'customer' ? 'Customer' : 'Supplier',
      partyName:       payment.party.partyName,
      amount:          payment.amount,
      referenceType:   'payment',
      referenceId:     payment._id,
      referenceNumber: payment.paymentNumber,
      description:     `Payment - ${payment.paymentNumber}`,
      createdBy:       payment.processedBy,
    });

    // Cash/Bank side entry
    const cashBankEntryFn = payment.transactionType === 'receipt'
      ? createDebitEntry
      : createCreditEntry;

    await cashBankEntryFn({
      organizationId:  payment.organizationId,
      shopId:          payment.shopId,
      partyType:       accountType,
      partyId:         payment.shopId,
      partyModel:      'JewelryShop',
      partyName:       accountType.toUpperCase(),
      amount:          payment.amount,
      referenceType:   'payment',
      referenceId:     payment._id,
      referenceNumber: payment.paymentNumber,
      description:     `${accountType.toUpperCase()} - ${payment.paymentNumber}`,
      createdBy:       payment.processedBy,
    });
  } catch (error) {
    logger.error('ledger.listener PAYMENT_COMPLETED failed:', error.message);
  }
});

// PAYMENT_CANCELLED — ledger entries reverse karo
eventBus.on('PAYMENT_CANCELLED', async (data) => {
  try {
    const { payment } = data;

    const entries = await LedgerEntry.find({
      referenceId:   payment._id,
      referenceType: 'payment',
      status:        'active',
    });

    for (const entry of entries) {
      await reverseEntry({
        entryId:     entry._id,
        createdBy:   payment.processedBy,
        description: `Payment reversed - ${payment.paymentNumber}`,
      });
    }
  } catch (error) {
    logger.error('ledger.listener PAYMENT_CANCELLED failed:', error.message);
  }
});

// CHEQUE_CLEARED — cheque clear hua toh bank entry
eventBus.on('CHEQUE_CLEARED', async (data) => {
  try {
    const { payment } = data;

    const partyEntryFn = payment.transactionType === 'receipt'
      ? createCreditEntry
      : createDebitEntry;

    await partyEntryFn({
      organizationId:  payment.organizationId,
      shopId:          payment.shopId,
      partyType:       payment.party.partyType,
      partyId:         payment.party.partyId,
      partyModel:      payment.party.partyType === 'customer' ? 'Customer' : 'Supplier',
      partyName:       payment.party.partyName,
      amount:          payment.amount,
      referenceType:   'payment',
      referenceId:     payment._id,
      referenceNumber: payment.paymentNumber,
      description:     `Cheque cleared - ${payment.paymentNumber}`,
      createdBy:       payment.processedBy,
    });

    const cashBankEntryFn = payment.transactionType === 'receipt'
      ? createDebitEntry
      : createCreditEntry;

    await cashBankEntryFn({
      organizationId:  payment.organizationId,
      shopId:          payment.shopId,
      partyType:       'bank',
      partyId:         payment.shopId,
      partyModel:      'JewelryShop',
      partyName:       'BANK',
      amount:          payment.amount,
      referenceType:   'payment',
      referenceId:     payment._id,
      referenceNumber: payment.paymentNumber,
      description:     `Cheque cleared - BANK - ${payment.paymentNumber}`,
      createdBy:       payment.processedBy,
    });
  } catch (error) {
    logger.error('ledger.listener CHEQUE_CLEARED failed:', error.message);
  }
});

// CHEQUE_BOUNCED — reverse karo
eventBus.on('CHEQUE_BOUNCED', async (data) => {
  try {
    const { payment } = data;

    const entries = await LedgerEntry.find({
      referenceId:   payment._id,
      referenceType: 'payment',
      status:        'active',
    });

    for (const entry of entries) {
      await reverseEntry({
        entryId:     entry._id,
        createdBy:   payment.processedBy,
        description: `Cheque bounced - ${payment.paymentNumber}`,
      });
    }
  } catch (error) {
    logger.error('ledger.listener CHEQUE_BOUNCED failed:', error.message);
  }
});