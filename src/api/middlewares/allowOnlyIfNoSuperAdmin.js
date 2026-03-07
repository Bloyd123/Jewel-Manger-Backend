// FILE: middleware/allowOnlyIfNoSuperAdmin.js

import User from '../../models/User.js';

export const allowOnlyIfNoSuperAdmin = async (req, res, next) => {
  const { role } = req.body;

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
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });

    if (existingSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Super admin already exists. Contact existing super admin for access.',
      });
    }

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
