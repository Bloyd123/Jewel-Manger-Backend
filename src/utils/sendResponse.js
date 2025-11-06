import logger from './logger.js';

/**
 * Standardized API Response Utility
 * Provides consistent response format across all API endpoints
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Success message
 * @param {*} data - Response data
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
export const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, meta = {}) => {
  const response = {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  // Add metadata if provided
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Error message
 * @param {Array} errors - Array of error details
 * @param {Object} meta - Additional metadata
 */
export const sendError = (res, statusCode = 500, message = 'Error', errors = [], meta = {}) => {
  const response = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  };

  // Add errors array if provided
  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  // Add metadata if provided
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  // Log error
  logger.error(`API Error [${statusCode}]: ${message}`, { errors, meta });

  return res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 */
export const sendCreated = (res, message = 'Resource created successfully', data = null) => {
  return sendSuccess(res, 201, message, data);
};

/**
 * Send no content response (204)
 */
export const sendNoContent = res => {
  return res.status(204).send();
};

/**
 * Send bad request error (400)
 */
export const sendBadRequest = (res, message = 'Bad request', errors = []) => {
  return sendError(res, 400, message, errors);
};

/**
 * Send unauthorized error (401)
 */
export const sendUnauthorized = (res, message = 'Unauthorized access') => {
  return sendError(res, 401, message);
};

/**
 * Send forbidden error (403)
 */
export const sendForbidden = (res, message = 'Access forbidden') => {
  return sendError(res, 403, message);
};

/**
 * Send not found error (404)
 */
export const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, 404, message);
};

/**
 * Send conflict error (409)
 */
export const sendConflict = (res, message = 'Resource conflict', errors = []) => {
  return sendError(res, 409, message, errors);
};

/**
 * Send validation error (422)
 */
export const sendValidationError = (res, errors = [], message = 'Validation failed') => {
  return sendError(res, 422, message, errors);
};

/**
 * Send internal server error (500)
 */
export const sendInternalError = (res, message = 'Internal server error', error = null) => {
  // Log the full error stack for debugging
  if (error) {
    logger.error('Internal Server Error:', error);
  }

  // Don't expose error details in production
  const errors =
    process.env.NODE_ENV === 'production' ? [] : [{ detail: error?.message, stack: error?.stack }];

  return sendError(res, 500, message, errors);
};

/**
 * Send service unavailable error (503)
 */
export const sendServiceUnavailable = (res, message = 'Service temporarily unavailable') => {
  return sendError(res, 503, message);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total count
 * @param {String} message - Success message
 */
export const sendPaginated = (res, data, page, limit, total, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);

  const meta = {
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      pageSize: parseInt(limit),
      totalItems: total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };

  return sendSuccess(res, 200, message, data, meta);
};

/**
 * Send response with custom status
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {Boolean} success - Success status
 * @param {String} message - Response message
 * @param {*} data - Response data
 * @param {Object} meta - Additional metadata
 */
export const sendCustom = (res, statusCode, success, message, data = null, meta = {}) => {
  const response = {
    success,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send file download response
 * @param {Object} res - Express response object
 * @param {String} filePath - Path to file
 * @param {String} fileName - Download filename
 */
export const sendFile = (res, filePath, fileName) => {
  try {
    return res.download(filePath, fileName);
  } catch (error) {
    logger.error('File download error:', error);
    return sendInternalError(res, 'Failed to download file');
  }
};

/**
 * Send CSV response
 * @param {Object} res - Express response object
 * @param {String} csvData - CSV content
 * @param {String} fileName - CSV filename
 */
export const sendCSV = (res, csvData, fileName = 'export.csv') => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.status(200).send(csvData);
};

/**
 * Send Excel response
 * @param {Object} res - Express response object
 * @param {Buffer} excelBuffer - Excel file buffer
 * @param {String} fileName - Excel filename
 */
export const sendExcel = (res, excelBuffer, fileName = 'export.xlsx') => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.status(200).send(excelBuffer);
};

/**
 * Send PDF response
 * @param {Object} res - Express response object
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {String} fileName - PDF filename
 * @param {Boolean} inline - Display inline or download
 */
export const sendPDF = (res, pdfBuffer, fileName = 'document.pdf', inline = false) => {
  res.setHeader('Content-Type', 'application/pdf');
  const disposition = inline ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
  return res.status(200).send(pdfBuffer);
};

/**
 * Handle async route errors
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async route handler function
 */
export const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Format validation errors from express-validator
 * @param {Array} validationErrors - Validation errors from express-validator
 */
export const formatValidationErrors = validationErrors => {
  return validationErrors.map(err => ({
    field: err.param || err.path,
    message: err.msg,
    value: err.value,
  }));
};

/**
 * Send response based on operation result
 * @param {Object} res - Express response object
 * @param {Object} result - Operation result with success flag
 * @param {String} successMessage - Message for successful operation
 * @param {String} errorMessage - Message for failed operation
 */
export const sendResult = (
  res,
  result,
  successMessage = 'Operation successful',
  errorMessage = 'Operation failed'
) => {
  if (result.success) {
    return sendSuccess(res, 200, successMessage, result.data);
  } else {
    return sendError(res, result.statusCode || 400, errorMessage, result.errors);
  }
};
/**
 * Send too many requests error (429)
 */
export const sendTooManyRequests = (
  res,
  message = 'Too many requests, please try again later',
  meta = {}
) => {
  return sendError(res, 429, message, [], meta);
};

// Default export with all functions
export default {
  sendSuccess,
  sendError,
  sendCreated,
  sendNoContent,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendValidationError,
  sendInternalError,
  sendServiceUnavailable,
  sendPaginated,
  sendCustom,
  sendFile,
  sendCSV,
  sendExcel,
  sendPDF,
  asyncHandler,
  formatValidationErrors,
  sendResult,
  sendTooManyRequests,
};
