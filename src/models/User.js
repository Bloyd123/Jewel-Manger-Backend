import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // Basic User Information
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    profileImage: {
      type: String,
      default: null
    },

    // SaaS Multi-tenant Fields
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },

    // Role-based Access Control (RBAC)
    role: {
      type: String,
      enum: ['super_admin', 'org_admin', 'shop_admin', 'manager', 'staff', 'accountant', 'user'],
      default: 'user',
      required: true
    },

    // Shop Access (Multi-shop support)
    shopAccess: [{
      shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JewelryShop',
        required: true
      },
      role: {
        type: String,
        enum: ['admin', 'manager', 'staff', 'viewer'],
        default: 'staff'
      },
      permissions: {
        // Inventory & Product Management
        canViewInventory: { type: Boolean, default: true },
        canEditInventory: { type: Boolean, default: false },
        canManageProducts: { type: Boolean, default: false },
        
        // Purchase Management
        canViewPurchases: { type: Boolean, default: true },
        canCreatePurchases: { type: Boolean, default: false },
        canApprovePurchases: { type: Boolean, default: false },
        
        // Sales Management
        canViewSales: { type: Boolean, default: true },
        canCreateSales: { type: Boolean, default: false },
        canApproveSales: { type: Boolean, default: false },
        canGenerateInvoices: { type: Boolean, default: false },
        
        // Order Management
        canManageOrders: { type: Boolean, default: false },
        canViewOrders: { type: Boolean, default: true },
        
        // Customer & Supplier Management
        canManageCustomers: { type: Boolean, default: false },
        canViewCustomers: { type: Boolean, default: true },
        canManageSuppliers: { type: Boolean, default: false },
        canViewSuppliers: { type: Boolean, default: true },
        
        // Party Management
        canManageParties: { type: Boolean, default: false },
        
        // Financial & Billing
        canViewBilling: { type: Boolean, default: false },
        canViewFinancials: { type: Boolean, default: false },
        canApproveTransactions: { type: Boolean, default: false },
        
        // Schemes & Offers
        canManageSchemes: { type: Boolean, default: false },
        canViewSchemes: { type: Boolean, default: true },
        
        // Reports & Analytics
        canViewReports: { type: Boolean, default: false },
        canGenerateReports: { type: Boolean, default: false },
        
        // User Management
        canManageUsers: { type: Boolean, default: false },
        canViewUsers: { type: Boolean, default: true }
      },
      assignedAt: {
        type: Date,
        default: Date.now
      }
    }],

    // Primary Shop (Default working location)
    primaryShop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      default: null
    },

    // User Status
    isActive: {
      type: Boolean,
      default: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },

    // Security & Session Management
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: {
      type: Date,
      default: null
    },
    lastLoginIP: {
      type: String,
      default: null
    },
    refreshToken: {
      type: String,
      select: false
    },

    // Two-Factor Authentication
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      select: false
    },
    backupCodes: {
      type: [String],
      select: false
    },

    // Additional Fields for Jewelry Business
    designation: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      enum: [
        'sales', 
        'purchase', 
        'inventory', 
        'accounts', 
        'management', 
        'workshop',
        'quality_check',
        'customer_service',
        'other'
      ],
      default: 'other'
    },
    employeeId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    joiningDate: {
      type: Date,
      default: null
    },

    // Sales Performance & Incentives
    salesTarget: {
      type: Number,
      default: 0,
      min: 0
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    // User Preferences
    preferences: {
      language: { 
        type: String, 
        default: 'en',
        enum: ['en', 'hi', 'mr', 'gu', 'ta', 'te']
      },
      timezone: { 
        type: String, 
        default: 'Asia/Kolkata' 
      },
      currency: { 
        type: String, 
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP', 'AED']
      },
      dateFormat: { 
        type: String, 
        default: 'DD/MM/YYYY',
        enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
      },
      theme: {
        type: String,
        default: 'light',
        enum: ['light', 'dark', 'auto']
      },
      notificationsEnabled: {
        type: Boolean,
        default: true
      }
    },

    // Activity Tracking (Last 50 activities)
    activityLog: [{
      action: {
        type: String,
        required: true
      },
      module: {
        type: String,
        required: true
      },
      description: String,
      timestamp: { 
        type: Date, 
        default: Date.now 
      },
      ipAddress: String,
      metadata: mongoose.Schema.Types.Mixed
    }],

    // Tracking fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    
    // Metadata
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound Indexes for Multi-tenant queries
userSchema.index({ organizationId: 1, email: 1 });
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ organizationId: 1, isActive: 1 });
userSchema.index({ 'shopAccess.shopId': 1 });
userSchema.index({ employeeId: 1 }, { unique: true, sparse: true });
userSchema.index({ primaryShop: 1 });

// Limit activity log to last 50 entries
userSchema.pre('save', function(next) {
  if (this.activityLog && this.activityLog.length > 50) {
    this.activityLog = this.activityLog.slice(-50);
  }
  next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Virtual to check if user is super admin
userSchema.virtual('isSuperAdmin').get(function() {
  return this.role === 'super_admin';
});

// Virtual to check if user is organization admin
userSchema.virtual('isOrgAdmin').get(function() {
  return this.role === 'org_admin' || this.role === 'super_admin';
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Soft delete middleware
userSchema.pre(/^find/, function(next) {
  // Only apply to normal queries, not to findDeleted
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Instance Methods

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Check if user has access to a specific shop
userSchema.methods.hasShopAccess = function(shopId) {
  return this.shopAccess.some(
    access => access.shopId.toString() === shopId.toString()
  );
};

// Get user's shop permissions
userSchema.methods.getShopPermissions = function(shopId) {
  const access = this.shopAccess.find(
    access => access.shopId.toString() === shopId.toString()
  );
  return access ? access.permissions : null;
};

// Check specific permission for a shop
userSchema.methods.hasPermission = function(shopId, permission) {
  const permissions = this.getShopPermissions(shopId);
  return permissions ? permissions[permission] : false;
};

// Check if user has any shop access
userSchema.methods.hasAnyShopAccess = function() {
  return this.shopAccess && this.shopAccess.length > 0;
};

// Get all shop IDs user has access to
userSchema.methods.getAccessibleShops = function() {
  return this.shopAccess.map(access => access.shopId);
};

// Check if user is admin for any shop or specific shop
userSchema.methods.isShopAdmin = function(shopId = null) {
  if (shopId) {
    const access = this.shopAccess.find(
      a => a.shopId.toString() === shopId.toString()
    );
    return access?.role === 'admin';
  }
  return this.shopAccess.some(a => a.role === 'admin');
};

// Get shop role
userSchema.methods.getShopRole = function(shopId) {
  const access = this.shopAccess.find(
    access => access.shopId.toString() === shopId.toString()
  );
  return access ? access.role : null;
};

// Log user activity
userSchema.methods.logActivity = function(action, module, description = '', metadata = {}) {
  this.activityLog.push({
    action,
    module,
    description,
    metadata,
    timestamp: new Date()
  });
  return this.save();
};

// Soft delete user
userSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Restore soft deleted user
userSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Update last login
userSchema.methods.updateLastLogin = function(ipAddress) {
  this.lastLogin = new Date();
  this.lastLoginIP = ipAddress;
  return this.save();
};

// Hide sensitive data in JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.twoFactorSecret;
  delete userObject.backupCodes;
  delete userObject.__v;
  delete userObject.deletedAt;
  return userObject;
};

// Static Methods

// Find user by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email, isActive: true }).select('+password');
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }
  
  return user;
};

// Find users by organization
userSchema.statics.findByOrganization = function(organizationId, options = {}) {
  return this.find({ 
    organizationId, 
    ...options 
  });
};

// Find users by shop
userSchema.statics.findByShop = function(shopId) {
  return this.find({ 
    'shopAccess.shopId': shopId,
    isActive: true
  });
};

// Find users by department
userSchema.statics.findByDepartment = function(organizationId, department) {
  return this.find({ 
    organizationId,
    department,
    isActive: true
  });
};

// Find users by role
userSchema.statics.findByRole = function(organizationId, role) {
  return this.find({ 
    organizationId,
    role,
    isActive: true
  });
};

// Find deleted users (for super admin)
userSchema.statics.findDeleted = function(organizationId = null) {
  const query = { deletedAt: { $ne: null } };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query).setOptions({ includeDeleted: true });
};

// Find users with specific permission
userSchema.statics.findByPermission = function(shopId, permission) {
  const permissionPath = `shopAccess.permissions.${permission}`;
  return this.find({
    'shopAccess.shopId': shopId,
    [permissionPath]: true,
    isActive: true
  });
};

export default mongoose.model('User', userSchema);