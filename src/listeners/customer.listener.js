import eventBus from '../eventBus.js';
import Customer from '../models/Customer.js';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────
// SALE_CREATED — customer statistics update karo
// ─────────────────────────────────────────────
eventBus.on('SALE_CREATED', async (data) => {
  try {
    const { sale, customer, session } = data;

    await Customer.recordPurchase(
      customer._id,
      sale.financials.grandTotal,
      session || null
    );
  } catch (error) {
    logger.error('customer.listener SALE_CREATED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// SALE_COMPLETED — completedOrders update karo
// ─────────────────────────────────────────────
eventBus.on('SALE_COMPLETED', async (data) => {
  try {
    const { sale } = data;

    const customer = await Customer.findById(sale.customerId);
    if (!customer) return;

    await Customer.findByIdAndUpdate(sale.customerId, {
      $inc: {
        'statistics.completedOrders': 1,
      },
      $set: {
        'statistics.averageOrderValue':
          customer.statistics.totalSpent / (customer.statistics.completedOrders + 1),
      },
    });
  } catch (error) {
    logger.error('customer.listener SALE_COMPLETED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// SALE_CANCELLED — cancelledOrders update karo
// ─────────────────────────────────────────────
eventBus.on('SALE_CANCELLED', async (data) => {
  try {
    const { sale } = data;

    await Customer.findByIdAndUpdate(sale.customerId, {
      $inc: {
        'statistics.cancelledOrders': 1,
        'statistics.completedOrders': -1,
        'statistics.totalSpent':      -sale.financials.grandTotal,
      },
    });
  } catch (error) {
    logger.error('customer.listener SALE_CANCELLED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// SALE_RETURNED — totalSpent reverse karo
// ─────────────────────────────────────────────
eventBus.on('SALE_RETURNED', async (data) => {
  try {
    const { sale, refundAmount } = data;

    await Customer.findByIdAndUpdate(sale.customerId, {
      $inc: {
        'statistics.totalSpent': -(refundAmount || sale.financials.grandTotal),
      },
    });
  } catch (error) {
    logger.error('customer.listener SALE_RETURNED failed:', error.message);
  }
});