import ActivityLog from '../models/ActivityLog.js';
import logger from './logger.js';

/**
 * Event Logger Utility
 * Logs user activities and system events to database and console
 */

class EventLogger {
  /**
   * Log user activity
   * @param {Object} params - Activity parameters
   * @param {String} params.userId - User ID performing the action
   * @param {String} params.organizationId - Organization ID
   * @param {String} params.shopId - Shop ID (optional)
   * @param {String} params.action - Action performed (e.g., 'create', 'update', 'delete')
   * @param {String} params.module - Module/resource (e.g., 'product', 'sale', 'user')
   * @param {String} params.description - Human-readable description
   * @param {String} params.level - Log level ('info', 'warn', 'error', 'success')
   * @param {Object} params.metadata - Additional data
   * @param {String} params.ipAddress - User's IP address
   * @param {String} params.userAgent - User's browser/device info
   * @param {String} params.status - Status ('success', 'failed', 'pending')
   * @returns {Promise<Object>} Created activity log
   */
  async logActivity({
    userId,
    organizationId,
    shopId = null,
    action,
    module,
    description = '',
    level = 'info',
    metadata = {},
    ipAddress = null,
    userAgent = null,
    status = 'success'
  }) {
    try {
      // Create activity log in database
      const activityLog = await ActivityLog.create({
        userId,
        organizationId,
        shopId,
        action,
        module,
        description,
        level,
        metadata,
        ipAddress,
        userAgent,
        status
      });

      // Log to console as well
      const logMessage = `[${module.toUpperCase()}] ${action} - ${description} ${userId ? `by User:${userId}` : ''}`;
      
      switch (level) {
        case 'error':
          logger.error(logMessage, metadata);
          break;
        case 'warn':
          logger.warn(logMessage, metadata);
          break;
        case 'success':
          logger.info(`✓ ${logMessage}`, metadata);
          break;
        default:
          logger.info(logMessage, metadata);
      }

      return activityLog;
    } catch (error) {
      logger.error('Failed to log activity:', error);
      // Don't throw error to prevent breaking the main operation
      return null;
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(userId, organizationId, action, status, ipAddress, metadata = {}) {
    return this.logActivity({
      userId,
      organizationId,
      action,
      module: 'auth',
      description: `User ${action}`,
      level: status === 'success' ? 'success' : 'warn',
      status,
      ipAddress,
      metadata
    });
  }

  /**
   * Log product/inventory events
   */
  async logProduct(userId, organizationId, shopId, action, productId, description, metadata = {}) {
    return this.logActivity({
      userId,
      organizationId,
      shopId,
      action,
      module: 'product',
      description,
      level: 'info',
      metadata: { productId, ...metadata }
    });
  }

  /**
   * Log sales events
   */
  async logSale(userId, organizationId, shopId, action, saleId, description, metadata = {}) {
    return this.logActivity({
      userId,
      organizationId,
      shopId,
      action,
      module: 'sale',
      description,
      level: 'success',
      metadata: { saleId, ...metadata }
    });
  }

  /**
   * Log purchase events
   */
  async logPurchase(userId, organizationId, shopId, action, purchaseId, description, metadata = {}) {
    return this.logActivity({
      userId,
      organizationId,
      shopId,
      action,
      module: 'purchase',
      description,
      level: 'info',
      metadata: { purchaseId, ...metadata }
    });
  }

  /**
   * Log customer events
   */
  async logCustomer(userId, organizationId, shopId, action, customerId, description, metadata = {}) {
    return this.logActivity({
      userId,
      organizationId,
      shopId,
      action,
      module: 'customer',
      description,
      level: 'info',
      metadata: { customerId, ...metadata }
    });
  }

  /**
   * Log user management events
   */
  async logUserManagement(userId, organizationId, action, targetUserId, description, metadata = {}) {
    return this.logActivity({
      userId,
      organizationId,
      action,
      module: 'user_management',
      description,
      level: 'info',
      metadata: { targetUserId, ...metadata }
    });
  }

  /**
   * Log financial events
   */
  async logFinancial(userId, organizationId, shopId, action, description, metadata = {}) {
    return this.logActivity({
      userId,
      organizationId,
      shopId,
      action,
      module: 'financial',
      description,
      level: 'info',
      metadata
    });
  }

  /**
   * Log error events
   */
  async logError(userId, organizationId, action, error, metadata = {}) {
    return this.logActivity({
      userId,
      organizationId,
      action,
      module: 'system',
      description: error.message || 'System error occurred',
      level: 'error',
      status: 'failed',
      metadata: {
        error: error.message,
        stack: error.stack,
        ...metadata
      }
    });
  }

  /**
   * Log system events (no user required)
   */
  async logSystem(organizationId, action, description, level = 'info', metadata = {}) {
    return this.logActivity({
      userId: null,
      organizationId,
      action,
      module: 'system',
      description,
      level,
      metadata
    });
  }

  /**
   * Get user activity history
   */
  async getUserActivity(userId, limit = 50, options = {}) {
    try {
      return await ActivityLog.find({ userId, ...options })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      logger.error('Failed to fetch user activity:', error);
      return [];
    }
  }

  /**
   * Get shop activity history
   */
  async getShopActivity(shopId, limit = 100, options = {}) {
    try {
      return await ActivityLog.find({ shopId, ...options })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .lean();
    } catch (error) {
      logger.error('Failed to fetch shop activity:', error);
      return [];
    }
  }

  /**
   * Get organization activity history
   */
  async getOrganizationActivity(organizationId, limit = 100, options = {}) {
    try {
      return await ActivityLog.find({ organizationId, ...options })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .lean();
    } catch (error) {
      logger.error('Failed to fetch organization activity:', error);
      return [];
    }
  }

  /**
   * Clean old activity logs (keep last 90 days)
   */
  async cleanOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await ActivityLog.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      logger.info(`Cleaned ${result.deletedCount} old activity logs`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Failed to clean old logs:', error);
      return 0;
    }
  }
}

// Export singleton instance
export default new EventLogger();