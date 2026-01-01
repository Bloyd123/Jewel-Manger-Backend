import { InsufficientPermissionsError } from '../../utils/AppError.js';

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new InsufficientPermissionsError('You do not have permission to perform this action');
    }
    next();
  };
};
