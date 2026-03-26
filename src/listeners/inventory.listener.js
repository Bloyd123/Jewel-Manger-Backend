import eventBus from '../eventBus.js';
import {
  increaseStock,
  decreaseStock,
  returnStock,
  createProductFromPurchase,
} from '../api/inventory/inventory.service.js';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────
// PURCHASE_RECEIVED — stock badhao ya product banao
// ─────────────────────────────────────────────
eventBus.on('PURCHASE_RECEIVED', async (data) => {
  try {
    const { purchase, userId } = data;

    for (const item of purchase.items) {
      if (item.productId) {
        await increaseStock({
          organizationId:  purchase.organizationId,
          shopId:          purchase.shopId,
          productId:       item.productId,
          quantity:        item.quantity,
          referenceId:     purchase._id,
          referenceNumber: purchase.purchaseNumber,
          value:           item.itemTotal,
          performedBy:     userId,
        });
      } else {
        await createProductFromPurchase({
          organizationId:  purchase.organizationId,
          shopId:          purchase.shopId,
          item,
          purchaseId:      purchase._id,
          purchaseNumber:  purchase.purchaseNumber,
          supplierId:      purchase.supplierId,
          supplierDetails: purchase.supplierDetails,
          userId,
        });
      }
    }
  } catch (error) {
    logger.error('inventory.listener PURCHASE_RECEIVED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PURCHASE_CANCELLED — stock reverse karo
// ─────────────────────────────────────────────
eventBus.on('PURCHASE_CANCELLED', async (data) => {
  try {
    const { purchase, userId } = data;

    for (const item of purchase.items) {
      if (item.productId) {
        await decreaseStock({
          organizationId:  purchase.organizationId,
          shopId:          purchase.shopId,
          productId:       item.productId,
          quantity:        item.quantity,
          referenceId:     purchase._id,
          referenceNumber: purchase.purchaseNumber,
          performedBy:     userId,
        });
      }
    }
  } catch (error) {
    logger.error('inventory.listener PURCHASE_CANCELLED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PURCHASE_RETURNED — stock wapas ghataao
// ─────────────────────────────────────────────
eventBus.on('PURCHASE_RETURNED', async (data) => {
  try {
    const { purchase, userId } = data;

    for (const item of purchase.items) {
      if (item.productId) {
        await decreaseStock({
          organizationId:  purchase.organizationId,
          shopId:          purchase.shopId,
          productId:       item.productId,
          quantity:        item.quantity,
          referenceId:     purchase._id,
          referenceNumber: purchase.purchaseNumber,
          performedBy:     userId,
        });
      }
    }
  } catch (error) {
    logger.error('inventory.listener PURCHASE_RETURNED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// SALE_CREATED — stock ghataao
// ─────────────────────────────────────────────
eventBus.on('SALE_CREATED', async (data) => {
  try {
    const { sale, customerId, userId } = data;

    for (const item of sale.items) {
      if (item.productId) {
        await decreaseStock({
          organizationId:  sale.organizationId,
          shopId:          sale.shopId,
          productId:       item.productId,
          quantity:        item.quantity,
          referenceId:     sale._id,
          referenceNumber: sale.invoiceNumber,
          value:           item.itemTotal,
          performedBy:     userId,
          customerId,
        });
      }
    }
  } catch (error) {
    logger.error('inventory.listener SALE_CREATED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// SALE_CANCELLED — stock wapas karo
// ─────────────────────────────────────────────
eventBus.on('SALE_CANCELLED', async (data) => {
  try {
    const { sale, userId } = data;

    for (const item of sale.items) {
      if (item.productId) {
        await returnStock({
          organizationId:  sale.organizationId,
          shopId:          sale.shopId,
          productId:       item.productId,
          quantity:        item.quantity,
          referenceId:     sale._id,
          referenceNumber: sale.invoiceNumber,
          performedBy:     userId,
        });
      }
    }
  } catch (error) {
    logger.error('inventory.listener SALE_CANCELLED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// SALE_RETURNED — stock wapas karo
// ─────────────────────────────────────────────
eventBus.on('SALE_RETURNED', async (data) => {
  try {
    const { sale, itemsToReturn, userId } = data;

    const itemsList = itemsToReturn || sale.items;

    for (const returnItem of itemsList) {
      const saleItem = sale.items.find(
        item => item.productId?.toString() === returnItem.productId?.toString()
      );

      if (saleItem && saleItem.productId) {
        await returnStock({
          organizationId:  sale.organizationId,
          shopId:          sale.shopId,
          productId:       saleItem.productId,
          quantity:        returnItem.quantity || saleItem.quantity,
          referenceId:     sale._id,
          referenceNumber: sale.invoiceNumber,
          performedBy:     userId,
        });
      }
    }
  } catch (error) {
    logger.error('inventory.listener SALE_RETURNED failed:', error.message);
  }
});