import eventBus from '../eventBus.js';
import {
  sendSaleInvoiceEmail,
  sendSalePaymentReceiptEmail,
  sendPaymentReminderEmail,
  sendPurchasePaymentVoucherEmail,
  sendSupplierPaymentDoneEmail,
  sendLowStockAlertEmail,
} from '../utils/email.js';
import JewelryShop from '../models/Shop.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────
// SALE_CREATED — customer ko invoice email bhejo
// ─────────────────────────────────────────────
eventBus.on('SALE_CREATED', async (data) => {
  try {
    const { sale, customer, shop } = data;

    if (!customer?.email) return;

    await sendSaleInvoiceEmail(sale, customer, shop);
  } catch (error) {
    logger.error('email.listener SALE_CREATED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// SALE_PAYMENT_ADDED — customer ko receipt email bhejo
// ─────────────────────────────────────────────
eventBus.on('SALE_PAYMENT_ADDED', async (data) => {
  try {
    const { sale, payment } = data;

    if (!sale.customerDetails?.email) return;

    const customer = {
      fullName: sale.customerDetails.customerName,
      email:    sale.customerDetails.email,
    };

    const shop = await JewelryShop.findById(sale.shopId).lean();

    await sendSalePaymentReceiptEmail(payment, sale, customer, shop);
  } catch (error) {
    logger.error('email.listener SALE_PAYMENT_ADDED failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PAYMENT_REMINDER — customer ko reminder email bhejo
// ─────────────────────────────────────────────
eventBus.on('PAYMENT_REMINDER', async (data) => {
  try {
    const { sale, customer, shop } = data;

    if (!customer?.email) return;

    await sendPaymentReminderEmail(sale, customer, shop);
  } catch (error) {
    logger.error('email.listener PAYMENT_REMINDER failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PURCHASE_PAYMENT_ADDED — supplier ko voucher email bhejo
// ─────────────────────────────────────────────
eventBus.on('PURCHASE_PAYMENT_ADDED', async (data) => {
  try {
    const { purchase, payment, supplier, shop } = data;

    if (!supplier?.contactPerson?.email && !supplier?.businessEmail) return;

    await sendPurchasePaymentVoucherEmail(payment, purchase, supplier, shop);
  } catch (error) {
    logger.error('email.listener PURCHASE_PAYMENT_ADDED voucher failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PURCHASE_PAYMENT_ADDED — shop admins ko notification email bhejo
// ─────────────────────────────────────────────
eventBus.on('PURCHASE_PAYMENT_ADDED', async (data) => {
  try {
    const { purchase, payment, supplier, shop, organizationId } = data;

    const shopAdmins = await User.find({
      organizationId,
      role:     { $in: ['org_admin', 'shop_admin'] },
      isActive: true,
    })
      .select('firstName email')
      .lean();

    if (shopAdmins.length === 0) return;

    await Promise.all(
      shopAdmins.map(admin =>
        sendSupplierPaymentDoneEmail(payment, purchase, supplier, shop, admin).catch(err =>
          logger.error(`email.listener PURCHASE_PAYMENT_ADDED admin email failed — ${admin.email}:`, err.message)
        )
      )
    );
  } catch (error) {
    logger.error('email.listener PURCHASE_PAYMENT_ADDED admin notify failed:', error.message);
  }
});

// ─────────────────────────────────────────────
// PRODUCT_LOW_STOCK — shop admins ko alert email bhejo
// ─────────────────────────────────────────────
eventBus.on('PRODUCT_LOW_STOCK', async (data) => {
  try {
    const { product, newStatus, organizationId, shopId } = data;

    // Shop fetch karo email template ke liye
    const shop = await JewelryShop.findById(shopId).lean();

    const shopAdmins = await User.find({
      organizationId,
      role:     { $in: ['org_admin', 'shop_admin'] },
      isActive: true,
    })
      .select('firstName email')
      .lean();

    if (shopAdmins.length === 0) return;

    // sendLowStockAlertEmail(lowStockItems, shop, notifyUser) - Array expect karta hai
    await Promise.all(
      shopAdmins.map(admin =>
        sendLowStockAlertEmail([product], shop, admin).catch(err =>
          logger.error(`email.listener PRODUCT_LOW_STOCK failed — ${product.productCode} → ${admin.email}:`, err.message)
        )
      )
    );
  } catch (error) {
    logger.error('email.listener PRODUCT_LOW_STOCK failed:', error.message);
  }
});