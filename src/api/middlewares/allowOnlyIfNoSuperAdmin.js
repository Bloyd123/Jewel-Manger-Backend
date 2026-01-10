// FILE: middleware/allowOnlyIfNoSuperAdmin.js
// Middleware to ensure only ONE super admin can self-register (first time setup)

import User from '../../models/User.js';

/**
 * Middleware to restrict super admin registration
 * Only allows super admin creation if no super admin exists yet
 * This is for the initial system setup only
 */
export const allowOnlyIfNoSuperAdmin = async (req, res, next) => {
  const { role } = req.body;

  // Check if this is a super admin registration attempt
  if (!role) {
    return res.status(400).json({
      success: false,
      message: 'Role is required',
    });
  }

  if (role !== 'super_admin') {
    return res.status(400).json({
      success: false,
      message: 'This route is only for super admin registration',
    });
  }

  try {
    // Check if super admin already exists in the system
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });

    if (existingSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Super admin already exists. Contact existing super admin for access.',
      });
    }

    // No super admin exists, allow registration
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking super admin existence',
      error: error.message,
    });
  }
};

export default allowOnlyIfNoSuperAdmin;
