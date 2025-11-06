/**
 * Custom Application Error Class
 * Extends the built-in Error class to provide consistent error handling
 * across the entire application with proper status codes and operational flags
 */

class AppError extends Error {
  /**
   * Create an AppError instance
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {boolean} isOperational - Whether error is operational (default: true)
   * @param {string} code - Custom error code for client-side handling
   */
  constructor(message, statusCode = 500, isOperational = true, code = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.code = code;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common Error Types for Jewelry Business Application
 */

// 400 - Bad Request Errors
class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST') {
    super(message, 400, true, code);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation Error', code = 'VALIDATION_ERROR') {
    super(message, 400, true, code);
  }
}

// 401 - Authentication Errors
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized. Please login.', code = 'UNAUTHORIZED') {
    super(message, 401, true, code);
  }
}

class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password', code = 'INVALID_CREDENTIALS') {
    super(message, 401, true, code);
  }
}

class TokenExpiredError extends AppError {
  constructor(message = 'Your session has expired. Please login again.', code = 'TOKEN_EXPIRED') {
    super(message, 401, true, code);
  }
}

class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token. Please login again.', code = 'INVALID_TOKEN') {
    super(message, 401, true, code);
  }
}

// 403 - Forbidden Errors
class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    super(message, 403, true, code);
  }
}

class InsufficientPermissionsError extends AppError {
  constructor(message = 'Insufficient permissions', code = 'INSUFFICIENT_PERMISSIONS') {
    super(message, 403, true, code);
  }
}

class ShopAccessDeniedError extends AppError {
  constructor(message = 'You do not have access to this shop', code = 'SHOP_ACCESS_DENIED') {
    super(message, 403, true, code);
  }
}

// 404 - Not Found Errors
class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, true, code);
  }
}

class UserNotFoundError extends AppError {
  constructor(message = 'User not found', code = 'USER_NOT_FOUND') {
    super(message, 404, true, code);
  }
}

class ShopNotFoundError extends AppError {
  constructor(message = 'Shop not found', code = 'SHOP_NOT_FOUND') {
    super(message, 404, true, code);
  }
}

class OrganizationNotFoundError extends AppError {
  constructor(message = 'Organization not found', code = 'ORGANIZATION_NOT_FOUND') {
    super(message, 404, true, code);
  }
}

class ProductNotFoundError extends AppError {
  constructor(message = 'Product not found', code = 'PRODUCT_NOT_FOUND') {
    super(message, 404, true, code);
  }
}

class PartyNotFoundError extends AppError {
  constructor(message = 'Party not found', code = 'PARTY_NOT_FOUND') {
    super(message, 404, true, code);
  }
}

class InvoiceNotFoundError extends AppError {
  constructor(message = 'Invoice not found', code = 'INVOICE_NOT_FOUND') {
    super(message, 404, true, code);
  }
}

// 409 - Conflict Errors
class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = 'CONFLICT') {
    super(message, 409, true, code);
  }
}

class DuplicateEmailError extends AppError {
  constructor(message = 'Email already exists', code = 'DUPLICATE_EMAIL') {
    super(message, 409, true, code);
  }
}

class DuplicateUsernameError extends AppError {
  constructor(message = 'Username already exists', code = 'DUPLICATE_USERNAME') {
    super(message, 409, true, code);
  }
}

class DuplicateGSTError extends AppError {
  constructor(message = 'GST number already registered', code = 'DUPLICATE_GST') {
    super(message, 409, true, code);
  }
}

class DuplicateProductCodeError extends AppError {
  constructor(message = 'Product code already exists', code = 'DUPLICATE_PRODUCT_CODE') {
    super(message, 409, true, code);
  }
}

// 422 - Unprocessable Entity
class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable Entity', code = 'UNPROCESSABLE_ENTITY') {
    super(message, 422, true, code);
  }
}

class InsufficientStockError extends AppError {
  constructor(message = 'Insufficient stock available', code = 'INSUFFICIENT_STOCK') {
    super(message, 422, true, code);
  }
}

class InvalidQuantityError extends AppError {
  constructor(message = 'Invalid quantity', code = 'INVALID_QUANTITY') {
    super(message, 422, true, code);
  }
}

class InvalidWeightError extends AppError {
  constructor(message = 'Invalid weight', code = 'INVALID_WEIGHT') {
    super(message, 422, true, code);
  }
}

class InvalidPriceError extends AppError {
  constructor(message = 'Invalid price', code = 'INVALID_PRICE') {
    super(message, 422, true, code);
  }
}

// 429 - Rate Limit
class TooManyRequestsError extends AppError {
  constructor(
    message = 'Too many requests. Please try again later.',
    code = 'RATE_LIMIT_EXCEEDED'
  ) {
    super(message, 429, true, code);
  }
}

// 500 - Server Errors
class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error', code = 'INTERNAL_SERVER_ERROR') {
    super(message, 500, false, code);
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', code = 'DATABASE_ERROR') {
    super(message, 500, false, code);
  }
}

class FileUploadError extends AppError {
  constructor(message = 'File upload failed', code = 'FILE_UPLOAD_ERROR') {
    super(message, 500, true, code);
  }
}

// Business Logic Errors (Jewelry Specific)
class SubscriptionExpiredError extends AppError {
  constructor(
    message = 'Your subscription has expired. Please renew to continue.',
    code = 'SUBSCRIPTION_EXPIRED'
  ) {
    super(message, 403, true, code);
  }
}

class SubscriptionLimitExceededError extends AppError {
  constructor(message = 'Subscription limit exceeded', code = 'SUBSCRIPTION_LIMIT_EXCEEDED') {
    super(message, 403, true, code);
  }
}

class InvalidMetalRateError extends AppError {
  constructor(message = 'Invalid metal rate', code = 'INVALID_METAL_RATE') {
    super(message, 422, true, code);
  }
}

class InvalidPurityError extends AppError {
  constructor(message = 'Invalid purity value', code = 'INVALID_PURITY') {
    super(message, 422, true, code);
  }
}

class HallmarkingRequiredError extends AppError {
  constructor(message = 'Hallmarking is required for this product', code = 'HALLMARKING_REQUIRED') {
    super(message, 422, true, code);
  }
}

class PaymentProcessingError extends AppError {
  constructor(message = 'Payment processing failed', code = 'PAYMENT_PROCESSING_ERROR') {
    super(message, 422, true, code);
  }
}

class InvoiceAlreadyCancelledError extends AppError {
  constructor(message = 'Invoice is already cancelled', code = 'INVOICE_ALREADY_CANCELLED') {
    super(message, 422, true, code);
  }
}

class InvalidDiscountError extends AppError {
  constructor(message = 'Invalid discount amount', code = 'INVALID_DISCOUNT') {
    super(message, 422, true, code);
  }
}

class ShopClosedError extends AppError {
  constructor(message = 'Shop is temporarily closed', code = 'SHOP_CLOSED') {
    super(message, 503, true, code);
  }
}

/**
 * Error Factory - Create errors dynamically
 */
class ErrorFactory {
  static create(type, message, code) {
    const errorTypes = {
      BadRequest: BadRequestError,
      Validation: ValidationError,
      Unauthorized: UnauthorizedError,
      InvalidCredentials: InvalidCredentialsError,
      TokenExpired: TokenExpiredError,
      InvalidToken: InvalidTokenError,
      Forbidden: ForbiddenError,
      InsufficientPermissions: InsufficientPermissionsError,
      ShopAccessDenied: ShopAccessDeniedError,
      NotFound: NotFoundError,
      UserNotFound: UserNotFoundError,
      ShopNotFound: ShopNotFoundError,
      OrganizationNotFound: OrganizationNotFoundError,
      ProductNotFound: ProductNotFoundError,
      PartyNotFound: PartyNotFoundError,
      InvoiceNotFound: InvoiceNotFoundError,
      Conflict: ConflictError,
      DuplicateEmail: DuplicateEmailError,
      DuplicateUsername: DuplicateUsernameError,
      DuplicateGST: DuplicateGSTError,
      DuplicateProductCode: DuplicateProductCodeError,
      UnprocessableEntity: UnprocessableEntityError,
      InsufficientStock: InsufficientStockError,
      InvalidQuantity: InvalidQuantityError,
      InvalidWeight: InvalidWeightError,
      InvalidPrice: InvalidPriceError,
      TooManyRequests: TooManyRequestsError,
      InternalServer: InternalServerError,
      Database: DatabaseError,
      FileUpload: FileUploadError,
      SubscriptionExpired: SubscriptionExpiredError,
      SubscriptionLimitExceeded: SubscriptionLimitExceededError,
      InvalidMetalRate: InvalidMetalRateError,
      InvalidPurity: InvalidPurityError,
      HallmarkingRequired: HallmarkingRequiredError,
      PaymentProcessing: PaymentProcessingError,
      InvoiceAlreadyCancelled: InvoiceAlreadyCancelledError,
      InvalidDiscount: InvalidDiscountError,
      ShopClosed: ShopClosedError,
    };

    const ErrorClass = errorTypes[type] || AppError;
    return new ErrorClass(message, code);
  }
}

// Export all error classes
export {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  ForbiddenError,
  InsufficientPermissionsError,
  ShopAccessDeniedError,
  NotFoundError,
  UserNotFoundError,
  ShopNotFoundError,
  OrganizationNotFoundError,
  ProductNotFoundError,
  PartyNotFoundError,
  InvoiceNotFoundError,
  ConflictError,
  DuplicateEmailError,
  DuplicateUsernameError,
  DuplicateGSTError,
  DuplicateProductCodeError,
  UnprocessableEntityError,
  InsufficientStockError,
  InvalidQuantityError,
  InvalidWeightError,
  InvalidPriceError,
  TooManyRequestsError,
  InternalServerError,
  DatabaseError,
  FileUploadError,
  SubscriptionExpiredError,
  SubscriptionLimitExceededError,
  InvalidMetalRateError,
  InvalidPurityError,
  HallmarkingRequiredError,
  PaymentProcessingError,
  InvoiceAlreadyCancelledError,
  InvalidDiscountError,
  ShopClosedError,
  ErrorFactory,
};

export default AppError;
