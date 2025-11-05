
// ============================================================================
// FILE: middleware/errorHandler.js
// ============================================================================

import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';

/**
 * Send error response in development mode
 * Includes full error details and stack trace
 */
const sendErrorDev = (err, req, res) => {
  // API Error Response
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: err,
      message: err.message,
      code: err.code,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  // Rendered Website Error
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    message: err.message,
  });
};

/**
 * Send error response in production mode
 * Only sends necessary error details to client
 */
const sendErrorProd = (err, req, res) => {
  // API Error Response
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        code: err.code,
        timestamp: new Date().toISOString(),
      });
    }

    // Programming or unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    logger.error('Non-operational error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
    });

    // 2) Send generic message
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong on the server',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
    });
  }

  // Rendered Website Error
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      message: err.message,
    });
  }

  // Programming or unknown error
  console.error('ERROR 💥', err);
  return res.status(500).render('error', {
    title: 'Error',
    message: 'Please try again later.',
  });
};

/**
 * Handle MongoDB Cast Error (Invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, true, 'INVALID_ID');
};

/**
 * Handle MongoDB Duplicate Field Error
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  
  let message = `Duplicate field value: ${value}. Please use another value!`;
  let code = 'DUPLICATE_FIELD';

  // Specific messages for common fields
  if (field === 'email') {
    message = 'This email is already registered';
    code = 'DUPLICATE_EMAIL';
  } else if (field === 'username') {
    message = 'This username is already taken';
    code = 'DUPLICATE_USERNAME';
  } else if (field === 'gstNumber') {
    message = 'This GST number is already registered';
    code = 'DUPLICATE_GST';
  } else if (field === 'panNumber') {
    message = 'This PAN number is already registered';
    code = 'DUPLICATE_PAN';
  } else if (field === 'phone') {
    message = 'This phone number is already registered';
    code = 'DUPLICATE_PHONE';
  } else if (field === 'code') {
    message = 'This code already exists';
    code = 'DUPLICATE_CODE';
  } else if (field === 'slug') {
    message = 'This slug already exists';
    code = 'DUPLICATE_SLUG';
  }

  return new AppError(message, 409, true, code);
};

/**
 * Handle MongoDB Validation Error
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400, true, 'VALIDATION_ERROR');
};

/**
 * Handle JWT Error (Invalid Token)
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please login again!', 401, true, 'INVALID_TOKEN');
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => {
  return new AppError('Your session has expired. Please login again!', 401, true, 'TOKEN_EXPIRED');
};

/**
 * Handle Multer File Upload Error
 */
const handleMulterError = (err) => {
  let message = 'File upload failed';
  let code = 'FILE_UPLOAD_ERROR';

  if (err.code === 'LIMIT_FILE_SIZE') {
    message = 'File size is too large. Maximum allowed size is 5MB';
    code = 'FILE_TOO_LARGE';
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    message = 'Too many files. Maximum allowed is 10 files';
    code = 'TOO_MANY_FILES';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    message = 'Unexpected file field';
    code = 'UNEXPECTED_FILE';
  }

  return new AppError(message, 400, true, code);
};

/**
 * Handle MongoDB Connection Error
 */
const handleMongoError = (err) => {
  let message = 'Database connection error';
  let code = 'DATABASE_ERROR';

  if (err.name === 'MongoNetworkError') {
    message = 'Unable to connect to database. Please try again later.';
    code = 'DATABASE_CONNECTION_ERROR';
  } else if (err.name === 'MongoTimeoutError') {
    message = 'Database operation timed out';
    code = 'DATABASE_TIMEOUT';
  }

  return new AppError(message, 500, false, code);
};

/**
 * Handle Mongoose Disconnection
 */
const handleDisconnectionError = () => {
  return new AppError(
    'Database connection lost. Please try again.',
    503,
    true,
    'DATABASE_DISCONNECTED'
  );
};

/**
 * Handle Rate Limit Error
 */
const handleRateLimitError = () => {
  return new AppError(
    'Too many requests from this IP. Please try again later.',
    429,
    true,
    'RATE_LIMIT_EXCEEDED'
  );
};

/**
 * Handle Syntax Error (Invalid JSON)
 */
const handleSyntaxError = (err) => {
  return new AppError(
    'Invalid JSON format in request body',
    400,
    true,
    'INVALID_JSON'
  );
};

/**
 * Handle Payment Processing Errors
 */
const handlePaymentError = (err) => {
  let message = 'Payment processing failed';
  let code = 'PAYMENT_ERROR';

  if (err.message.includes('insufficient')) {
    message = 'Insufficient funds';
    code = 'INSUFFICIENT_FUNDS';
  } else if (err.message.includes('expired')) {
    message = 'Payment method expired';
    code = 'PAYMENT_METHOD_EXPIRED';
  } else if (err.message.includes('declined')) {
    message = 'Payment declined';
    code = 'PAYMENT_DECLINED';
  }

  return new AppError(message, 402, true, code);
};

/**
 * Main Error Handler Middleware
 * This should be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  // Set default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  err.code = err.code || 'INTERNAL_SERVER_ERROR';

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.stack = err.stack;

  // Handle different error types

  // 1. MongoDB CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    error = handleCastErrorDB(error);
  }

  // 2. MongoDB Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    error = handleDuplicateFieldsDB(error);
  }

  // 3. MongoDB Validation Error
  if (err.name === 'ValidationError') {
    error = handleValidationErrorDB(error);
  }

  // 4. JWT Invalid Token Error
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  // 5. JWT Expired Token Error
  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // 6. Multer File Upload Error
  if (err.name === 'MulterError') {
    error = handleMulterError(err);
  }

  // 7. MongoDB Connection Errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    error = handleMongoError(err);
  }

  // 8. Mongoose Disconnection
  if (err.message && err.message.includes('buffering timed out')) {
    error = handleDisconnectionError();
  }

  // 9. Rate Limit Error
  if (err.message && err.message.includes('Too many requests')) {
    error = handleRateLimitError();
  }

  // 10. JSON Syntax Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = handleSyntaxError(err);
  }

  // 11. Payment Errors
  if (err.type === 'StripeCardError' || err.type === 'PaymentError') {
    error = handlePaymentError(err);
  }

  // Send appropriate error response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Catch-all for undefined routes (404)
 * Place this BEFORE errorHandler in app.js
 */
export const notFound = (req, res, next) => {
  const err = new AppError(
    `Cannot find ${req.originalUrl} on this server!`,
    404,
    true,
    'ROUTE_NOT_FOUND'
  );
  next(err);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 * Call this in server.js
 */
export const handleUnhandledRejection = (server) => {
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    logger.error('Unhandled Rejection', {
      error: err.message,
      stack: err.stack,
    });
    
    server.close(() => {
      process.exit(1);
    });
  });
};

/**
 * Handle uncaught exceptions
 * Call this in server.js BEFORE any other code
 */
export const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    logger.error('Uncaught Exception', {
      error: err.message,
      stack: err.stack,
    });
    
    process.exit(1);
  });
};

/**
 * Graceful shutdown on SIGTERM
 * Call this in server.js
 */
export const handleSIGTERM = (server) => {
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    logger.info('SIGTERM received, shutting down gracefully');
    
    server.close(() => {
      console.log('💥 Process terminated!');
      logger.info('Process terminated');
    });
  });
};

export default errorHandler;