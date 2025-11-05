// ============================================================================
// FILE: utils/catchAsync.js
// ============================================================================

/**
 * Catch Async Errors
 * Wraps async functions to automatically catch errors and pass to error handler
 * 
 * Usage:
 * export const getUsers = catchAsync(async (req, res, next) => {
 *   const users = await User.find();
 *   res.json({ data: users });
 * });
 */

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;

/**
 * Alternative implementation with error context
 */
export const catchAsyncWithContext = (fn, context = '') => {
  return (req, res, next) => {
    fn(req, res, next).catch((error) => {
      if (context) {
        error.context = context;
      }
      next(error);
    });
  };
};