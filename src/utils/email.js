import nodemailer from 'nodemailer';
import logger from './logger.js';

/**
 * Email Utility
 * Handles all email sending functionality
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      const emailConfig = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      };

      // Check if email credentials are configured
      if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        logger.warn('⚠️  Email credentials not configured. Email functionality will be disabled.');
        this.initialized = false;
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);

      // Verify transporter configuration
      this.transporter.verify((error, _success) => {
        if (error) {
          logger.error('❌ Email transporter verification failed:', error);
          this.initialized = false;
        } else {
          logger.info('✅ Email transporter is ready');
          this.initialized = true;
        }
      });
    } catch (error) {
      logger.error('❌ Failed to initialize email transporter:', error);
      this.initialized = false;
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @param {String|Array} options.to - Recipient email(s)
   * @param {String} options.subject - Email subject
   * @param {String} options.text - Plain text content
   * @param {String} options.html - HTML content
   * @param {String} options.from - Sender email (optional)
   * @param {Array} options.cc - CC recipients (optional)
   * @param {Array} options.bcc - BCC recipients (optional)
   * @param {Array} options.attachments - Attachments (optional)
   * @returns {Promise<Object>}
   */
  async sendEmail(options) {
    if (!this.initialized || !this.transporter) {
      logger.warn('Email service not initialized. Skipping email send.');
      return {
        success: false,
        message: 'Email service not configured',
      };
    }

    try {
      const {
        to,
        subject,
        text,
        html,
        from = process.env.EMAIL_FROM || process.env.EMAIL_USER,
        cc,
        bcc,
        attachments,
      } = options;

      // Validate required fields
      if (!to) {
        throw new Error('Recipient email (to) is required');
      }
      if (!subject) {
        throw new Error('Email subject is required');
      }
      if (!text && !html) {
        throw new Error('Email content (text or html) is required');
      }

      // Prepare email message
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Jewelry ERP'}" <${from}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html: html || text,
      };

      // Add optional fields
      if (cc) mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
      if (bcc) mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
      if (attachments) mailOptions.attachments = attachments;

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`📧 Email sent successfully to ${to}`, {
        messageId: info.messageId,
        subject,
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      logger.error('❌ Failed to send email:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Send welcome email to new user
   * @param {Object} user - User object
   * @param {String} verificationToken - Email verification token
   */
  async sendWelcomeEmail(user, verificationToken) {
    const verifyURL = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Jewelry ERP! 💎</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>Thank you for registering with Jewelry ERP. We're excited to have you on board!</p>
            <p>To get started, please verify your email address by clicking the button below:</p>
            <a href="${verifyURL}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="color: #667eea; word-break: break-all;">${verifyURL}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <hr style="border: 1px solid #ddd; margin: 30px 0;">
            <p>If you didn't create this account, please ignore this email.</p>
            <p>Best regards,<br><strong>Jewelry ERP Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Jewelry ERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: '🎉 Welcome to Jewelry ERP - Verify Your Email',
      html,
    });
  }

  /**
   * Send email verification email
   * @param {Object} user - User object
   * @param {String} verificationToken - Email verification token
   */
  async sendVerificationEmail(user, verificationToken) {
    const verifyURL = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #4CAF50; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.firstName},</h2>
            <p>Please verify your email address to activate your account.</p>
            <a href="${verifyURL}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link:</p>
            <p style="color: #4CAF50; word-break: break-all;">${verifyURL}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Jewelry ERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: '📧 Verify Your Email - Jewelry ERP',
      html,
    });
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {String} resetToken - Password reset token
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #2196F3; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.firstName},</h2>
            <p>You requested to reset your password for your Jewelry ERP account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetURL}" class="button">Reset Password</a>
            <p>Or copy and paste this link:</p>
            <p style="color: #2196F3; word-break: break-all;">${resetURL}</p>
            <div class="warning">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            <p><strong>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</strong></p>
            <p>For security, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Not sharing your password with anyone</li>
              <li>Enabling two-factor authentication</li>
            </ul>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Jewelry ERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: '🔒 Password Reset Request - Jewelry ERP',
      html,
    });
  }

  /**
   * Send password changed confirmation email
   * @param {Object} user - User object
   */
  async sendPasswordChangedEmail(user) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Changed Successfully</h1>
          </div>
          <div class="content">
            <h2>Hi ${user.firstName},</h2>
            <div class="alert">
              Your password has been changed successfully on ${new Date().toLocaleString()}.
            </div>
            <p>If you made this change, you can safely ignore this email.</p>
            <p><strong>If you did NOT make this change, please contact our support team immediately.</strong></p>
            <p>For security reasons, you have been logged out of all devices.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Jewelry ERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: '✅ Password Changed - Jewelry ERP',
      html,
    });
  }

  /**
   * Send invoice email
   * @param {Object} invoice - Invoice object
   * @param {String} pdfBuffer - PDF buffer (optional)
   */
  async sendInvoiceEmail(invoice, pdfBuffer = null) {
    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #673ab7; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .invoice-details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Invoice</h1>
          </div>
          <div class="content">
            <h2>Invoice ${invoice.invoiceNumber}</h2>
            <div class="invoice-details">
              <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
              <p><strong>Amount:</strong> ₹${invoice.totalAmount.toLocaleString()}</p>
              <p><strong>Customer:</strong> ${invoice.customer.name}</p>
            </div>
            <p>Thank you for your business!</p>
            <p>Please find the invoice attached to this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Jewelry ERP. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoiceNumber} - Jewelry ERP`,
      html,
      attachments,
    });
  }

  /**
   * Send test email
   * @param {String} to - Recipient email
   */
  async sendTestEmail(to) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #00bcd4; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Test Email</h1>
          </div>
          <div class="content">
            <h2>Email Service is Working!</h2>
            <p>This is a test email from Jewelry ERP.</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p>If you received this, your email configuration is correct.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to,
      subject: '✅ Test Email - Jewelry ERP',
      html,
    });
  }
}

// Create singleton instance
const emailService = new EmailService();

// Export convenience function
export const sendEmail = options => emailService.sendEmail(options);

// Export email service class
export default emailService;
