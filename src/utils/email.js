import nodemailer from 'nodemailer';
import logger from './logger.js';
const BRAND = {
  name:    'JewelPro',
  color:   '#1a1a2e',
  gold:    '#FFD700',
  tagline: 'Smart Jewelry Management',
};

let transporter = null;
let isReady     = false;

const initTransporter = () => {
  try {
    const cfg = {
      host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
      port:   parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    };

    if (!cfg.auth.user || !cfg.auth.pass) {
      logger.warn('Email credentials not configured. Email functionality disabled.');
      return;
    }

    transporter = nodemailer.createTransport(cfg);

    transporter.verify((err) => {
      if (err) {
        logger.error('Email transporter verification failed:', err);
        isReady = false;
      } else {
        logger.info('Email transporter ready');
        isReady = true;
      }
    });
  } catch (err) {
    logger.error('Failed to initialize email transporter:', err);
  }
};

initTransporter();

const baseTemplate = ({ headerText, body }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; background:#f5f5f5; padding:20px; color:#333; }
    .wrap { max-width:600px; margin:0 auto; background:#fff; border-radius:8px; overflow:hidden; border:1px solid #ddd; }
    .header { background:${BRAND.color}; padding:28px 32px; text-align:center; }
    .header-logo { font-size:11px; color:${BRAND.gold}; letter-spacing:2px; text-transform:uppercase; margin-bottom:6px; }
    .header-title { font-size:22px; font-weight:700; color:${BRAND.gold}; }
    .header-sub { font-size:13px; color:#aaa; margin-top:4px; }
    .body { padding:28px 32px; }
    .body h2 { font-size:16px; color:${BRAND.color}; margin-bottom:12px; }
    .body p { font-size:13px; color:#555; line-height:1.7; margin-bottom:10px; }
    .info-box { background:#f8f8f8; border-left:4px solid ${BRAND.gold}; border-radius:4px; padding:16px 20px; margin:18px 0; }
    .info-box table { width:100%; border-collapse:collapse; font-size:13px; }
    .info-box td { padding:4px 0; }
    .info-box td:first-child { color:#888; width:160px; }
    .info-box td:last-child { color:${BRAND.color}; font-weight:600; }
    .alert-box { border-radius:4px; padding:14px 18px; margin:18px 0; font-size:13px; }
    .alert-warn    { background:#fff8e1; border-left:4px solid #ffc107; color:#856404; }
    .alert-danger  { background:#fde8e8; border-left:4px solid #c0392b; color:#7b1010; }
    .alert-success { background:#e6f4ea; border-left:4px solid #1e7e34; color:#145a1e; }
    .btn { display:inline-block; padding:11px 28px; background:${BRAND.color}; color:${BRAND.gold} !important; text-decoration:none; border-radius:5px; font-weight:700; font-size:13px; margin:16px 0; }
    .divider { border:none; border-top:1px solid #eee; margin:20px 0; }
    .footer { background:${BRAND.color}; padding:16px 32px; text-align:center; }
    .footer p { font-size:11px; color:#888; }
    .footer strong { color:${BRAND.gold}; }
    .tag { display:inline-block; font-size:11px; padding:2px 10px; border-radius:4px; font-weight:600; }
    .tag-warn    { background:#fff3cd; color:#856404; }
    .tag-danger  { background:#fde8e8; color:#b91c1c; }
    .tag-success { background:#e6f4ea; color:#1e7e34; }
    .tag-info    { background:#e8f4fd; color:#1565c0; }
    .items-table { width:100%; border-collapse:collapse; font-size:12px; margin:12px 0; }
    .items-table th { padding:7px 10px; background:#f8f8f8; color:#666; font-weight:600; border-bottom:1px solid #eee; text-align:left; }
    .items-table td { padding:8px 10px; border-bottom:1px solid #f0f0f0; color:#333; }
    .items-table td.r { text-align:right; font-weight:600; color:${BRAND.color}; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-logo">💎 ${BRAND.name}</div>
      <div class="header-title">${headerText}</div>
      <div class="header-sub">${BRAND.tagline}</div>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} <strong>${BRAND.name}</strong>. All rights reserved.</p>
      <p style="margin-top:4px;">This is a system-generated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

const fmtAmt  = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = d => d
  ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
  : '-';
const statusTag = (status) => {
  const map = { paid:'success', partial:'warn', unpaid:'danger', overdue:'danger' };
  return `<span class="tag tag-${map[status] || 'info'}">${(status || '').toUpperCase()}</span>`;
};

// ─────────────────────────────────────────────
// CORE SEND FUNCTION
// ─────────────────────────────────────────────

/**
 * Send a raw email
 * @param {{ to, subject, html, text, from?, cc?, bcc?, attachments? }} options
 */
export const sendEmail = async (options) => {
  if (!isReady || !transporter) {
    logger.warn('Email service not initialized. Skipping.');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const { to, subject, html, text, from, cc, bcc, attachments } = options;

    if (!to)            return { success: false, message: 'Recipient (to) is required' };
    if (!subject)       return { success: false, message: 'Subject is required' };
    if (!html && !text) return { success: false, message: 'Email content is required' };

    const mail = {
      from: `"${process.env.EMAIL_FROM_NAME || BRAND.name}" <${from || process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to:   Array.isArray(to) ? to.join(', ') : to,
      subject,
      text:  text || '',
      html:  html || text,
    };

    if (cc)          mail.cc          = Array.isArray(cc)  ? cc.join(', ')  : cc;
    if (bcc)         mail.bcc         = Array.isArray(bcc) ? bcc.join(', ') : bcc;
    if (attachments) mail.attachments = attachments;

    const info = await transporter.sendMail(mail);
    logger.info(`Email sent → ${to}`, { messageId: info.messageId, subject });

    return { success: true, messageId: info.messageId, response: info.response };
  } catch (err) {
    logger.error('Email send failed:', err);
    return { success: false, message: `Email failed: ${err.message}`, error: err.message };
  }
};
export const sendWelcomeEmail = async (user, verificationToken) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const html = baseTemplate({
    headerText: 'Welcome to JewelPro!',
    body: `
      <h2>Hello ${user.firstName}!</h2>
      <p>Welcome to <strong>${BRAND.name}</strong> — your smart jewelry management platform.</p>
      <p>To get started, please verify your email address:</p>
      <a href="${url}" class="btn">Verify Email Address</a>
      <p style="font-size:12px;color:#999;">Or copy this link: <span style="color:${BRAND.color};">${url}</span></p>
      <div class="alert-box alert-warn">This link will expire in <strong>24 hours</strong>.</div>
      <hr class="divider">
      <p style="font-size:12px;color:#aaa;">If you didn't create this account, please ignore this email.</p>
    `,
  });

  return sendEmail({
    to:      user.email,
    subject: `Welcome to ${BRAND.name} — Verify Your Email`,
    html,
  });
};

/**
 * Email verification
 * @param {{ firstName, email }} user
 * @param {string} verificationToken
 */
export const sendVerificationEmail = async (user, verificationToken) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const html = baseTemplate({
    headerText: 'Verify Your Email',
    body: `
      <h2>Hi ${user.firstName},</h2>
      <p>Please verify your email address to activate your <strong>${BRAND.name}</strong> account.</p>
      <a href="${url}" class="btn">Verify Email Address</a>
      <p style="font-size:12px;color:#999;">Or copy this link: <span style="color:${BRAND.color};">${url}</span></p>
      <div class="alert-box alert-warn">This link expires in <strong>24 hours</strong>.</div>
      <p style="font-size:12px;color:#aaa;">If you didn't request this, please ignore this email.</p>
    `,
  });

  return sendEmail({
    to:      user.email,
    subject: `Verify Your Email — ${BRAND.name}`,
    html,
  });
};

/**
 * Password reset email
 * @param {{ firstName, email }} user
 * @param {string} resetToken
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = baseTemplate({
    headerText: ' Password Reset Request',
    body: `
      <h2>Hi ${user.firstName},</h2>
      <p>We received a request to reset your <strong>${BRAND.name}</strong> account password.</p>
      <a href="${url}" class="btn">Reset Password</a>
      <p style="font-size:12px;color:#999;">Or copy this link: <span style="color:${BRAND.color};">${url}</span></p>
      <div class="alert-box alert-danger">This link expires in <strong>1 hour</strong> for security reasons.</div>
      <p>If you did <strong>not</strong> request this, ignore this email — your password will remain unchanged.</p>
      <hr class="divider">
      <p style="font-size:12px;color:#aaa;">Tip: Use a strong unique password. Never share it with anyone.</p>
    `,
  });

  return sendEmail({
    to:      user.email,
    subject: `Password Reset — ${BRAND.name}`,
    html,
  });
};

/**
 * Password changed confirmation
 * @param {{ firstName, email }} user
 */
export const sendPasswordChangedEmail = async (user) => {
  const html = baseTemplate({
    headerText: 'Password Changed',
    body: `
      <h2>Hi ${user.firstName},</h2>
      <div class="alert-box alert-success">
         Your password was changed successfully on <strong>${new Date().toLocaleString('en-IN')}</strong>.
      </div>
      <p>If you made this change, you can safely ignore this email.</p>
      <p><strong>If you did NOT make this change, contact support immediately.</strong></p>
      <p style="font-size:12px;color:#aaa;">For security, you have been logged out of all devices.</p>
    `,
  });

  return sendEmail({
    to:      user.email,
    subject: ` Password Changed — ${BRAND.name}`,
    html,
  });
};

/**
 * Sale invoice email to customer
 * @param {Object} sale
 * @param {Object} customer
 * @param {Object} shop
 * @param {Buffer|null} pdfBuffer
 */
export const sendSaleInvoiceEmail = async (sale, customer, shop, pdfBuffer = null) => {
  const shopName    = shop.displayName || shop.name;
  const attachments = pdfBuffer ? [{
    filename:    `Invoice-${sale.invoiceNumber}.pdf`,
    content:     pdfBuffer,
    contentType: 'application/pdf',
  }] : [];

  const html = baseTemplate({
    headerText: 'Tax Invoice',
    body: `
      <h2>Dear ${customer.fullName},</h2>
      <p>Thank you for your purchase from <strong>${shopName}</strong>. Here are your invoice details:</p>
      <div class="info-box">
        <table>
          <tr><td>Invoice No.</td><td>${sale.invoiceNumber}</td></tr>
          <tr><td>Invoice Date</td><td>${fmtDate(sale.saleDate)}</td></tr>
          <tr><td>Grand Total</td><td>${fmtAmt(sale.financials.grandTotal)}</td></tr>
          <tr><td>Net Payable</td><td>${fmtAmt(sale.financials.netPayable)}</td></tr>
          <tr><td>Paid Amount</td><td>${fmtAmt(sale.payment.paidAmount)}</td></tr>
          <tr><td>Balance Due</td><td>${sale.payment.dueAmount > 0 ? fmtAmt(sale.payment.dueAmount) : '<span class="tag tag-success">Fully Paid</span>'}</td></tr>
          <tr><td>Payment Status</td><td>${statusTag(sale.payment.paymentStatus)}</td></tr>
        </table>
      </div>
      ${pdfBuffer ? '<p>📎 Your invoice PDF is attached to this email.</p>' : ''}
      <p>For queries, contact us at <strong>${shop.phone}</strong>.</p>
      <hr class="divider">
      <p style="font-size:12px;color:#aaa;">Thank you for choosing ${shopName}!</p>
    `,
  });

  return sendEmail({
    to:          customer.email,
    subject:     `Invoice ${sale.invoiceNumber} — ${shopName}`,
    html,
    attachments,
  });
};

/**
 * Sale payment receipt email to customer
 * @param {Object} payment
 * @param {Object} sale
 * @param {Object} customer
 * @param {Object} shop
 */
export const sendSalePaymentReceiptEmail = async (payment, sale, customer, shop) => {
  const shopName = shop.displayName || shop.name;

  const html = baseTemplate({
    headerText: 'Payment Receipt',
    body: `
      <h2>Dear ${customer.fullName},</h2>
      <p>We have received your payment. Here are the details:</p>
      <div class="info-box">
        <table>
          <tr><td>Receipt No.</td><td>${payment.paymentNumber}</td></tr>
          <tr><td>Payment Date</td><td>${fmtDate(payment.paymentDate)}</td></tr>
          <tr><td>Amount Received</td><td>${fmtAmt(payment.amount)}</td></tr>
          <tr><td>Payment Mode</td><td>${(payment.paymentMode || '').toUpperCase()}</td></tr>
          <tr><td>Against Invoice</td><td>${sale.invoiceNumber}</td></tr>
          <tr><td>Invoice Total</td><td>${fmtAmt(sale.financials.netPayable)}</td></tr>
          <tr><td>Total Paid</td><td>${fmtAmt(sale.payment.paidAmount)}</td></tr>
          <tr><td>Balance Due</td><td>${sale.payment.dueAmount > 0 ? fmtAmt(sale.payment.dueAmount) : '<span class="tag tag-success">Fully Paid ✅</span>'}</td></tr>
        </table>
      </div>
      <div class="alert-box alert-success">
        Payment of <strong>${fmtAmt(payment.amount)}</strong> received successfully.
      </div>
      <p>For queries, contact us at <strong>${shop.phone}</strong>.</p>
    `,
  });

  return sendEmail({
    to:      customer.email,
    subject: `Payment Receipt ${payment.paymentNumber} — ${shopName}`,
    html,
  });
};

/**
 * Payment reminder to customer (due amount pending)
 * @param {Object} sale
 * @param {Object} customer
 * @param {Object} shop
 */
export const sendPaymentReminderEmail = async (sale, customer, shop) => {
  const shopName  = shop.displayName || shop.name;
  const isOverdue = sale.payment.dueDate && new Date(sale.payment.dueDate) < new Date();

  const html = baseTemplate({
    headerText: ' Payment Reminder',
    body: `
      <h2>Dear ${customer.fullName},</h2>
      <p>This is a friendly reminder that you have an outstanding payment for invoice <strong>${sale.invoiceNumber}</strong>.</p>
      <div class="info-box">
        <table>
          <tr><td>Invoice No.</td><td>${sale.invoiceNumber}</td></tr>
          <tr><td>Invoice Date</td><td>${fmtDate(sale.saleDate)}</td></tr>
          <tr><td>Invoice Total</td><td>${fmtAmt(sale.financials.netPayable)}</td></tr>
          <tr><td>Paid Amount</td><td>${fmtAmt(sale.payment.paidAmount)}</td></tr>
          <tr><td>Balance Due</td><td><strong>${fmtAmt(sale.payment.dueAmount)}</strong></td></tr>
          ${sale.payment.dueDate ? `<tr><td>Due Date</td><td style="color:#c0392b;">${fmtDate(sale.payment.dueDate)}</td></tr>` : ''}
        </table>
      </div>
      <div class="alert-box ${isOverdue ? 'alert-danger' : 'alert-warn'}">
        ${isOverdue
          ? ` This payment is <strong>overdue</strong>. Please clear the dues at the earliest.`
          : ` Please make the payment before <strong>${fmtDate(sale.payment.dueDate)}</strong>.`
        }
      </div>
      <p>For queries or to make a payment, contact us at <strong>${shop.phone}</strong>.</p>
    `,
  });

  return sendEmail({
    to:      customer.email,
    subject: `Payment Reminder — Invoice ${sale.invoiceNumber} — ${shopName}`,
    html,
  });
};

/**
 * Purchase payment voucher email to supplier
 * @param {Object} payment
 * @param {Object} purchase
 * @param {Object} supplier
 * @param {Object} shop
 */
export const sendPurchasePaymentVoucherEmail = async (payment, purchase, supplier, shop) => {
  const shopName      = shop.displayName || shop.name;
  const supplierEmail = supplier.contactPerson?.email || supplier.businessEmail;

  if (!supplierEmail) {
    logger.warn(`No email found for supplier ${supplier.supplierCode}`);
    return { success: false, message: 'Supplier email not found' };
  }

  const html = baseTemplate({
    headerText: 'Payment Voucher',
    body: `
      <h2>Dear ${supplier.businessName},</h2>
      <p>We are pleased to inform you that a payment has been processed by <strong>${shopName}</strong>.</p>
      <div class="info-box">
        <table>
          <tr><td>Voucher No.</td><td>${payment.paymentNumber}</td></tr>
          <tr><td>Payment Date</td><td>${fmtDate(payment.paymentDate)}</td></tr>
          <tr><td>Amount Paid</td><td>${fmtAmt(payment.amount)}</td></tr>
          <tr><td>Payment Mode</td><td>${(payment.paymentMode || '').toUpperCase()}</td></tr>
          <tr><td>Against Purchase</td><td>${purchase.purchaseNumber}</td></tr>
          <tr><td>Purchase Total</td><td>${fmtAmt(purchase.financials.grandTotal)}</td></tr>
          <tr><td>Total Paid</td><td>${fmtAmt(purchase.payment.paidAmount)}</td></tr>
          <tr><td>Balance Due</td><td>${purchase.payment.dueAmount > 0 ? fmtAmt(purchase.payment.dueAmount) : '<span class="tag tag-success">Fully Paid ✅</span>'}</td></tr>
        </table>
      </div>
      <div class="alert-box alert-success">
        Payment of <strong>${fmtAmt(payment.amount)}</strong> has been processed successfully.
      </div>
      <p>For queries, contact us at <strong>${shop.phone}</strong>.</p>
    `,
  });

  return sendEmail({
    to:      supplierEmail,
    subject: `Payment Voucher ${payment.paymentNumber} — ${shopName}`,
    html,
  });
};

/**
 * Supplier payment done — internal notification to shop manager/accountant
 * @param {Object} payment
 * @param {Object} purchase
 * @param {Object} supplier
 * @param {Object} shop
 * @param {{ firstName, email }} notifyUser  — manager or accountant
 */
export const sendSupplierPaymentDoneEmail = async (payment, purchase, supplier, shop, notifyUser) => {
  const shopName = shop.displayName || shop.name;

  const html = baseTemplate({
    headerText: 'Supplier Payment Done',
    body: `
      <h2>Hi ${notifyUser.firstName},</h2>
      <p>A supplier payment has been successfully processed. Here is the summary:</p>
      <div class="info-box">
        <table>
          <tr><td>Voucher No.</td><td>${payment.paymentNumber}</td></tr>
          <tr><td>Payment Date</td><td>${fmtDate(payment.paymentDate)}</td></tr>
          <tr><td>Supplier</td><td>${supplier.businessName} (${supplier.supplierCode})</td></tr>
          <tr><td>Amount Paid</td><td>${fmtAmt(payment.amount)}</td></tr>
          <tr><td>Payment Mode</td><td>${(payment.paymentMode || '').toUpperCase()}</td></tr>
          <tr><td>Against Purchase</td><td>${purchase.purchaseNumber}</td></tr>
          <tr><td>Purchase Total</td><td>${fmtAmt(purchase.financials.grandTotal)}</td></tr>
          <tr><td>Total Paid</td><td>${fmtAmt(purchase.payment.paidAmount)}</td></tr>
          <tr><td>Balance Due</td><td>${purchase.payment.dueAmount > 0 ? `<span class="tag tag-warn">${fmtAmt(purchase.payment.dueAmount)}</span>` : '<span class="tag tag-success">Fully Paid</span>'}</td></tr>
          <tr><td>Shop</td><td>${shopName}</td></tr>
        </table>
      </div>
      <div class="alert-box alert-success">
        Payment of <strong>${fmtAmt(payment.amount)}</strong> to <strong>${supplier.businessName}</strong> processed successfully.
      </div>
    `,
  });

  return sendEmail({
    to:      notifyUser.email,
    subject: `Supplier Payment Done — ${supplier.businessName} — ${shopName}`,
    html,
  });
};

/**
 * Low stock alert — internal notification
 * @param {Array<{ name, productCode, stock: { quantity }, category }>} lowStockItems
 * @param {Object} shop
 * @param {{ firstName, email }} notifyUser
 */
export const sendLowStockAlertEmail = async (lowStockItems, shop, notifyUser) => {
  const shopName = shop.displayName || shop.name;

  const rows = lowStockItems.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.productCode}</td>
      <td>${p.category || '-'}</td>
      <td class="r" style="color:#c0392b;">${p.stock?.quantity ?? 0}</td>
    </tr>`).join('');

  const html = baseTemplate({
    headerText: 'Low Stock Alert',
    body: `
      <h2>Hi ${notifyUser.firstName},</h2>
      <p>The following products in <strong>${shopName}</strong> have fallen below the minimum stock threshold:</p>
      <table class="items-table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Code</th>
            <th>Category</th>
            <th>Stock Qty</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="alert-box alert-warn">
         <strong>${lowStockItems.length} product(s)</strong> require immediate restocking.
      </div>
      <p>Please create a purchase order at the earliest to avoid stockouts.</p>
    `,
  });

  return sendEmail({
    to:      notifyUser.email,
    subject: `Low Stock Alert — ${lowStockItems.length} Item(s) — ${shopName}`,
    html,
  });
};
/**
 * Order status update email to customer
 * @param {Object} order
 * @param {Object} customer
 * @param {Object} shop
 */
export const sendOrderStatusUpdateEmail = async (order, customer, shop) => {
  const shopName = shop.displayName || shop.name;

  const statusConfig = {
    pending:    { label: 'Order Received',   alertClass: 'alert-warn' },
    confirmed:  { label: 'Order Confirmed',  alertClass: 'alert-success' },
    processing: { label: 'In Process',       alertClass: 'alert-warn' },
    ready:      { label: 'Ready for Pickup', alertClass: 'alert-success' },
    delivered:  { label: 'Delivered',        alertClass: 'alert-success' },
    completed:  { label: 'Completed',        alertClass: 'alert-success' },
    cancelled:  { label: 'Cancelled',        alertClass: 'alert-danger' },
  };

  const cfg = statusConfig[order.status] || { label: order.status, alertClass: 'alert-warn' };

  const html = baseTemplate({
    headerText: `Order Status Update`,
    body: `
      <h2>Dear ${customer.fullName},</h2>
      <p>Your order status has been updated.</p>
      <div class="info-box">
        <table>
          <tr><td>Order No.</td><td>${order.orderNumber}</td></tr>
          <tr><td>Order Date</td><td>${fmtDate(order.orderDate)}</td></tr>
          <tr><td>Current Status</td><td><strong>${cfg.label}</strong></td></tr>
          ${order.estimatedDelivery ? `<tr><td>Est. Delivery</td><td>${fmtDate(order.estimatedDelivery)}</td></tr>` : ''}
          ${order.totalAmount  ? `<tr><td>Order Amount</td><td>${fmtAmt(order.totalAmount)}</td></tr>`  : ''}
          ${order.advancePaid  ? `<tr><td>Advance Paid</td><td>${fmtAmt(order.advancePaid)}</td></tr>`  : ''}
          ${order.balanceDue   ? `<tr><td>Balance Due</td><td>${fmtAmt(order.balanceDue)}</td></tr>`    : ''}
        </table>
      </div>
      <div class="alert-box ${cfg.alertClass}">
         Your order is now <strong>${cfg.label}</strong>.
        ${order.status === 'ready'     ? ' Please visit our store to collect your order.' : ''}
        ${order.status === 'cancelled' ? ' Please contact us for refund details.'         : ''}
      </div>
      ${order.notes ? `<p><strong>Note:</strong> ${order.notes}</p>` : ''}
      <p>For queries, contact us at <strong>${shop.phone}</strong>.</p>
    `,
  });

  return sendEmail({
    to:      customer.email,
    subject: ` Order ${order.orderNumber} — ${cfg.label} — ${shopName}`,
    html,
  });
};

/**
 * Send test email to verify configuration
 * @param {string} to
 */
export const sendTestEmail = async (to) => {
  const html = baseTemplate({
    headerText: ' Test Email',
    body: `
      <h2>Email Service is Working!</h2>
      <p>This is a test email from <strong>${BRAND.name}</strong>.</p>
      <div class="info-box">
        <table>
          <tr><td>Timestamp</td><td>${new Date().toLocaleString('en-IN')}</td></tr>
          <tr><td>Status</td><td><span class="tag tag-success">Connected</span></td></tr>
        </table>
      </div>
      <div class="alert-box alert-success">
        If you received this, your email configuration is working correctly.
      </div>
    `,
  });

  return sendEmail({
    to,
    subject: ` Test Email — ${BRAND.name}`,
    html,
  });
};