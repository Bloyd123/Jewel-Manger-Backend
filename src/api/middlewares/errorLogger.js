import logger from '../../utils/logger.js';

/**
 * Error logging middleware
 * Logs all errors with full context
 */
const errorLogger = (err, req, res, next) => {
  const errorLog = {
    message: err.message,
    statusCode: err.statusCode || 500,
    status: err.status || 'error',
    code: err.code || 'UNKNOWN_ERROR',
    isOperational: err.isOperational || false,
    path: req.path,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?._id || req.user?.id || 'anonymous',
    organizationId: req.user?.organizationId || 'N/A',
    shopId: req.shopId || req.params.shopId || 'N/A',
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  };

  // Log stack trace for non-operational errors
  if (!err.isOperational && err.stack) {
    errorLog.stack = err.stack;
  }

  // Log based on severity
  if (err.statusCode >= 500) {
    logger.error('Server Error', errorLog);
  } else if (err.statusCode >= 400) {
    logger.warn('Client Error', errorLog);
  } else {
    logger.info('Error', errorLog);
  }

  next(err);
};

export default errorLogger;
