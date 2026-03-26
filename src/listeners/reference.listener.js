import eventBus from '../eventBus.js';
import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import Order from '../models/Order.js';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────
// PAYMENT_COMPLETED — reference ka payment status update karo
// ─────────────────────────────────────────────
eventBus.on('PAYMENT_COMPLETED', async (data) => {
  try {
    const { payment } = data;

    const { referenceType, referenceId } = payment.reference;

    if (!referenceId || referenceType === 'none') return;

    if (referenceType === 'sale') {
      await Sale.applyPayment(referenceId, payment.amount);
    } else if (referenceType === 'purchase') {
      await Purchase.applyPayment(referenceId, payment.amount);
    } else if (referenceType === 'order') {
      await Order.applyPayment(referenceId, payment.amount);
    }
  } catch (error) {
    logger.error('reference.listener PAYMENT_COMPLETED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PAYMENT_CANCELLED — reference ka payment status reverse karo
// ─────────────────────────────────────────────
eventBus.on('PAYMENT_CANCELLED', async (data) => {
  try {
    const { payment } = data;

    const { referenceType, referenceId } = payment.reference;

    if (!referenceId || referenceType === 'none') return;

    if (referenceType === 'sale') {
      await Sale.reversePayment(referenceId, payment.amount);
    } else if (referenceType === 'purchase') {
      await Purchase.reversePayment(referenceId, payment.amount);
    } else if (referenceType === 'order') {
      await Order.reversePayment(referenceId, payment.amount);
    }
  } catch (error) {
    logger.error('reference.listener PAYMENT_CANCELLED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// CHEQUE_BOUNCED — reference ka payment reverse karo
// ─────────────────────────────────────────────
eventBus.on('CHEQUE_BOUNCED', async (data) => {
  try {
    const { payment } = data;

    const { referenceType, referenceId } = payment.reference;

    if (!referenceId || referenceType === 'none') return;

    if (referenceType === 'sale') {
      await Sale.reversePayment(referenceId, payment.amount);
    } else if (referenceType === 'purchase') {
      await Purchase.reversePayment(referenceId, payment.amount);
    } else if (referenceType === 'order') {
      await Order.reversePayment(referenceId, payment.amount);
    }
  } catch (error) {
    logger.error('reference.listener CHEQUE_BOUNCED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PAYMENT_REFUNDED — original reference reverse karo
// ─────────────────────────────────────────────
eventBus.on('PAYMENT_REFUNDED', async (data) => {
  try {
    const { refundPayment } = data;

    const { referenceType, referenceId } = refundPayment.reference;

    if (!referenceId || referenceType === 'none') return;

    if (referenceType === 'sale') {
      await Sale.reversePayment(referenceId, refundPayment.amount);
    } else if (referenceType === 'purchase') {
      await Purchase.reversePayment(referenceId, refundPayment.amount);
    } else if (referenceType === 'order') {
      await Order.reversePayment(referenceId, refundPayment.amount);
    }
  } catch (error) {
    logger.error('reference.listener PAYMENT_REFUNDED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PURCHASE_PAYMENT_ADDED — purchase ka paidAmount update karo
// ─────────────────────────────────────────────
eventBus.on('PURCHASE_PAYMENT_ADDED', async (data) => {
  try {
    const { purchase, payment } = data;

    await Purchase.applyPayment(purchase._id, payment.amount);
  } catch (error) {
    logger.error('reference.listener PURCHASE_PAYMENT_ADDED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// SALE_PAYMENT_ADDED — sale ka paidAmount update karo
// ─────────────────────────────────────────────
eventBus.on('SALE_PAYMENT_ADDED', async (data) => {
  try {
    const { sale, payment } = data;

    await Sale.applyPayment(sale._id, payment.amount);
  } catch (error) {
    logger.error('reference.listener SALE_PAYMENT_ADDED failed:', error.message);
  }
});