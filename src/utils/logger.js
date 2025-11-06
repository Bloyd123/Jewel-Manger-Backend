import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import DailyRotateFile from 'winston-daily-rotate-file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for better readability in development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => {
    const { timestamp, level, message, ...meta } = info;
    let metaString = '';

    // Handle stack traces for errors
    if (info.stack) {
      metaString = `\n${info.stack}`;
    } else if (Object.keys(meta).length > 0) {
      metaString = `\n${JSON.stringify(meta, null, 2)}`;
    }

    return `[${timestamp}] ${level}: ${message}${metaString}`;
  })
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // Daily rotate file for all logs
  new DailyRotateFile({
    filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format,
  }),

  // Daily rotate file for error logs only
  new DailyRotateFile({
    level: 'error',
    filename: path.join(__dirname, '../logs/errors-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format,
  }),

  // Daily rotate file for HTTP requests
  new DailyRotateFile({
    level: 'http',
    filename: path.join(__dirname, '../logs/http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d',
    format,
  }),

  // Daily rotate file for business operations (Sales, Purchases, etc.)
  new DailyRotateFile({
    filename: path.join(__dirname, '../logs/business-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create specialized loggers for different modules
const createModuleLogger = module => {
  return {
    error: (message, meta = {}) => logger.error(message, { module, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { module, ...meta }),
    info: (message, meta = {}) => logger.info(message, { module, ...meta }),
    http: (message, meta = {}) => logger.http(message, { module, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { module, ...meta }),
  };
};

// Business activity logger (for audit trail)
const businessLogger = {
  logSale: data => {
    logger.info('Sale Transaction', {
      type: 'SALE',
      userId: data.userId,
      shopId: data.shopId,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      customerId: data.customerId,
      timestamp: new Date().toISOString(),
    });
  },

  logPurchase: data => {
    logger.info('Purchase Transaction', {
      type: 'PURCHASE',
      userId: data.userId,
      shopId: data.shopId,
      purchaseNumber: data.purchaseNumber,
      amount: data.amount,
      supplierId: data.supplierId,
      timestamp: new Date().toISOString(),
    });
  },

  logPayment: data => {
    logger.info('Payment Transaction', {
      type: 'PAYMENT',
      userId: data.userId,
      shopId: data.shopId,
      paymentType: data.paymentType,
      amount: data.amount,
      partyId: data.partyId,
      timestamp: new Date().toISOString(),
    });
  },

  logInventoryChange: data => {
    logger.info('Inventory Change', {
      type: 'INVENTORY',
      userId: data.userId,
      shopId: data.shopId,
      productId: data.productId,
      action: data.action,
      quantityChange: data.quantityChange,
      timestamp: new Date().toISOString(),
    });
  },

  logUserAccess: data => {
    logger.info('User Access', {
      type: 'ACCESS',
      userId: data.userId,
      shopId: data.shopId,
      action: data.action,
      ipAddress: data.ipAddress,
      timestamp: new Date().toISOString(),
    });
  },

  logMetalRateUpdate: data => {
    logger.info('Metal Rate Update', {
      type: 'METAL_RATE',
      userId: data.userId,
      shopId: data.shopId,
      metalType: data.metalType,
      oldRate: data.oldRate,
      newRate: data.newRate,
      timestamp: new Date().toISOString(),
    });
  },

  logSchemeActivity: data => {
    logger.info('Scheme Activity', {
      type: 'SCHEME',
      userId: data.userId,
      shopId: data.shopId,
      schemeId: data.schemeId,
      action: data.action,
      customerId: data.customerId,
      timestamp: new Date().toISOString(),
    });
  },

  logBackup: data => {
    logger.info('Backup Activity', {
      type: 'BACKUP',
      userId: data.userId,
      organizationId: data.organizationId,
      backupType: data.backupType,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  },
};

// Security logger
const securityLogger = {
  logFailedLogin: data => {
    logger.warn('Failed Login Attempt', {
      type: 'FAILED_LOGIN',
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: new Date().toISOString(),
    });
  },

  logSuccessfulLogin: data => {
    logger.info('Successful Login', {
      type: 'SUCCESSFUL_LOGIN',
      userId: data.userId,
      email: data.email,
      ipAddress: data.ipAddress,
      timestamp: new Date().toISOString(),
    });
  },

  logPasswordChange: data => {
    logger.info('Password Changed', {
      type: 'PASSWORD_CHANGE',
      userId: data.userId,
      ipAddress: data.ipAddress,
      timestamp: new Date().toISOString(),
    });
  },

  logSuspiciousActivity: data => {
    logger.warn('Suspicious Activity Detected', {
      type: 'SUSPICIOUS_ACTIVITY',
      userId: data.userId,
      activity: data.activity,
      ipAddress: data.ipAddress,
      timestamp: new Date().toISOString(),
    });
  },

  logPermissionDenied: data => {
    logger.warn('Permission Denied', {
      type: 'PERMISSION_DENIED',
      userId: data.userId,
      shopId: data.shopId,
      attemptedAction: data.attemptedAction,
      timestamp: new Date().toISOString(),
    });
  },
};

// Export logger and utilities
export default logger;
export { createModuleLogger, businessLogger, securityLogger };
