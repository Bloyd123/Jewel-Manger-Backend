import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    // Organization Details
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters']
    },
    displayName: {
      type: String,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    
    // Contact Information
    email: {
      type: String,
      required: [true, 'Organization email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    alternatePhone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    fax: {
      type: String,
      trim: true
    },
    
    // Address
    address: {
      street: String,
      landmark: String,
      city: String,
      state: String,
      country: { type: String, default: 'India' },
      pincode: {
        type: String,
        match: [/^[0-9]{6}$/, 'Invalid pincode']
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      }
    },
    
    // Business Information
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number']
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number']
    },
    tanNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    cinNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    registrationNumber: {
      type: String,
      trim: true
    },
    businessType: {
      type: String,
      enum: ['retail', 'wholesale', 'manufacturing', 'mixed', 'online'],
      default: 'retail'
    },
    industryType: {
      type: String,
      enum: ['jewelry', 'gold', 'silver', 'diamond', 'gemstone', 'mixed'],
      default: 'jewelry'
    },
    establishedYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear()
    },
    
    // Branding
    logo: {
      type: String,
      default: null
    },
    favicon: {
      type: String,
      default: null
    },
    website: {
      type: String,
      trim: true,
      match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'Invalid website URL']
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      youtube: String
    },
    
    // Subscription & Billing (SaaS Model)
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'basic', 'standard', 'premium', 'enterprise'],
        default: 'free'
      },
      status: {
        type: String,
        enum: ['trial', 'active', 'suspended', 'cancelled', 'expired', 'payment_pending'],
        default: 'trial'
      },
      startDate: {
        type: Date,
        default: Date.now
      },
      endDate: {
        type: Date
      },
      trialEndsAt: {
        type: Date,
        default: function() {
          // 14 days trial by default
          return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        }
      },
      billingCycle: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        default: 'monthly'
      },
      amount: {
        type: Number,
        default: 0,
        min: 0
      },
      currency: {
        type: String,
        default: 'INR'
      },
      lastPaymentDate: Date,
      nextPaymentDate: Date,
      paymentMethod: {
        type: String,
        enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'other'],
        default: null
      },
      maxShops: {
        type: Number,
        default: 1,
        min: 1
      },
      maxUsers: {
        type: Number,
        default: 5,
        min: 1
      },
      maxProducts: {
        type: Number,
        default: 1000,
        min: 0
      },
      maxStorage: {
        type: Number,
        default: 1024, // in MB
        min: 0
      },
      features: {
        inventoryManagement: { type: Boolean, default: true },
        purchaseManagement: { type: Boolean, default: true },
        salesManagement: { type: Boolean, default: true },
        billingInvoicing: { type: Boolean, default: true },
        partyManagement: { type: Boolean, default: true },
        employeeManagement: { type: Boolean, default: false },
        multiShop: { type: Boolean, default: false },
        multiCurrency: { type: Boolean, default: false },
        advancedReports: { type: Boolean, default: false },
        analyticsReports: { type: Boolean, default: false },
        barcodePrinting: { type: Boolean, default: false },
        smsNotifications: { type: Boolean, default: false },
        emailNotifications: { type: Boolean, default: true },
        whatsappIntegration: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        customBranding: { type: Boolean, default: false },
        dataBackup: { type: Boolean, default: true },
        cloudStorage: { type: Boolean, default: false },
        mobileApp: { type: Boolean, default: false },
        schemeManagement: { type: Boolean, default: false },
        repairManagement: { type: Boolean, default: false },
        hallmarkingManagement: { type: Boolean, default: false }
      }
    },
    
    // Business Settings
    settings: {
      // Regional Settings
      currency: { 
        type: String, 
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR']
      },
      dateFormat: { 
        type: String, 
        default: 'DD/MM/YYYY',
        enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
      },
      timeFormat: {
        type: String,
        default: '12',
        enum: ['12', '24']
      },
      timezone: { 
        type: String, 
        default: 'Asia/Kolkata' 
      },
      language: {
        type: String,
        default: 'en',
        enum: ['en', 'hi', 'mr', 'gu', 'ta', 'te']
      },
      
      // Financial Settings
      fiscalYearStart: { 
        type: String, 
        default: '04-01' 
      },
      
      // Jewelry Specific Settings
      defaultWeightUnit: {
        type: String,
        enum: ['gram', 'kg', 'tola', 'ounce', 'carat'],
        default: 'gram'
      },
      defaultPurityUnit: {
        type: String,
        enum: ['karat', 'percentage', 'purity_916', 'purity_999'],
        default: 'karat'
      },
      enableHallmarking: {
        type: Boolean,
        default: false
      },
      enableStoneManagement: {
        type: Boolean,
        default: true
      },
      enableMakingCharges: {
        type: Boolean,
        default: true
      },
      
      // Invoice Settings
      invoicePrefix: {
        type: String,
        default: 'INV'
      },
      invoiceStartNumber: {
        type: Number,
        default: 1
      },
      purchasePrefix: {
        type: String,
        default: 'PUR'
      },
      quotationPrefix: {
        type: String,
        default: 'QUO'
      },
      
      // Tax Settings
      enableGST: {
        type: Boolean,
        default: true
      },
      gstRates: {
        gold: { type: Number, default: 3 },
        silver: { type: Number, default: 3 },
        diamond: { type: Number, default: 3 },
        platinum: { type: Number, default: 3 },
        makingCharges: { type: Number, default: 18 }
      },
      
      // Notification Settings
      enableEmailNotifications: {
        type: Boolean,
        default: true
      },
      enableSMSNotifications: {
        type: Boolean,
        default: false
      },
      enableWhatsAppNotifications: {
        type: Boolean,
        default: false
      },
      
      // Security Settings
      enableTwoFactorAuth: {
        type: Boolean,
        default: false
      },
      sessionTimeout: {
        type: Number,
        default: 30 // minutes
      },
      passwordExpiryDays: {
        type: Number,
        default: 90
      },
      
      // Backup Settings
      autoBackupEnabled: {
        type: Boolean,
        default: false
      },
      backupFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly'
      }
    },
    
    // Owner Information
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Compliance & Certifications
    compliance: {
      bis: {
        certified: { type: Boolean, default: false },
        certificateNumber: String,
        expiryDate: Date
      },
      hallmarking: {
        certified: { type: Boolean, default: false },
        certificateNumber: String,
        hallmarkingCenter: String,
        expiryDate: Date
      },
      iso: {
        certified: { type: Boolean, default: false },
        certificateNumber: String,
        expiryDate: Date
      }
    },
    
    // Banking Details
    bankDetails: [{
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      branchName: String,
      accountType: {
        type: String,
        enum: ['savings', 'current', 'overdraft'],
        default: 'current'
      },
      isPrimary: {
        type: Boolean,
        default: false
      }
    }],
    
    // Usage Statistics
    usage: {
      totalShops: {
        type: Number,
        default: 0
      },
      totalUsers: {
        type: Number,
        default: 0
      },
      totalProducts: {
        type: Number,
        default: 0
      },
      totalInvoices: {
        type: Number,
        default: 0
      },
      storageUsed: {
        type: Number,
        default: 0 // in MB
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    
    // Audit Trail
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
    notes: {
      type: String,
      maxlength: 1000
    },
    tags: [String],
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

// Indexes
organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ email: 1 });
organizationSchema.index({ isActive: 1 });
organizationSchema.index({ 'subscription.status': 1 });
organizationSchema.index({ 'subscription.plan': 1 });
organizationSchema.index({ ownerId: 1 });
organizationSchema.index({ gstNumber: 1 }, { sparse: true });
organizationSchema.index({ panNumber: 1 }, { sparse: true });
organizationSchema.index({ 'address.location': '2dsphere' });

// Virtual for total shops
organizationSchema.virtual('shops', {
  ref: 'JewelryShop',
  localField: '_id',
  foreignField: 'organizationId'
});

// Virtual for total users
organizationSchema.virtual('users', {
  ref: 'User',
  localField: '_id',
  foreignField: 'organizationId'
});
organizationSchema.virtual('purchases', {
  ref: 'Purchase',
  localField: '_id',
  foreignField: 'organizationId'
});

organizationSchema.virtual('sales', {
  ref: 'Sale',
  localField: '_id',
  foreignField: 'organizationId'
});

organizationSchema.virtual('parties', {
  ref: 'Party',
  localField: '_id',
  foreignField: 'organizationId'
});


// Virtual for subscription days remaining
organizationSchema.virtual('subscriptionDaysRemaining').get(function() {
  if (!this.subscription.endDate) return null;
  const now = new Date();
  const diff = this.subscription.endDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for trial days remaining
organizationSchema.virtual('trialDaysRemaining').get(function() {
  if (!this.subscription.trialEndsAt) return null;
  const now = new Date();
  const diff = this.subscription.trialEndsAt - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Soft delete middleware
organizationSchema.pre(/^find/, function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Ensure only one primary bank account
organizationSchema.pre('save', function(next) {
  if (this.bankDetails && this.bankDetails.length > 0) {
    const primaryAccounts = this.bankDetails.filter(bank => bank.isPrimary);
    if (primaryAccounts.length > 1) {
      // Keep only the first primary, set others to false
      this.bankDetails.forEach((bank, index) => {
        if (index > 0 && bank.isPrimary) {
          bank.isPrimary = false;
        }
      });
    }
  }
  next();
});

// Instance Methods

// Check if subscription is active
organizationSchema.methods.isSubscriptionActive = function() {
  const now = new Date();
  return (
    this.subscription.status === 'active' &&
    this.subscription.endDate &&
    this.subscription.endDate > now
  );
};

// Check if trial is active
organizationSchema.methods.isTrialActive = function() {
  const now = new Date();
  return (
    this.subscription.status === 'trial' &&
    this.subscription.trialEndsAt &&
    this.subscription.trialEndsAt > now
  );
};

// Check if organization can access system
organizationSchema.methods.canAccess = function() {
  return this.isActive && (this.isSubscriptionActive() || this.isTrialActive());
};

// Check if feature is available
organizationSchema.methods.hasFeature = function(featureName) {
  return this.subscription.features[featureName] || false;
};

// Check if can add more shops
organizationSchema.methods.canAddShop = function() {
  return this.usage.totalShops < this.subscription.maxShops;
};

// Check if can add more users
organizationSchema.methods.canAddUser = function() {
  return this.usage.totalUsers < this.subscription.maxUsers;
};

// Check if can add more products
organizationSchema.methods.canAddProduct = function() {
  return this.usage.totalProducts < this.subscription.maxProducts;
};

// Check storage limit
organizationSchema.methods.hasStorageSpace = function(sizeInMB) {
  return (this.usage.storageUsed + sizeInMB) <= this.subscription.maxStorage;
};

// Update usage statistics
organizationSchema.methods.updateUsage = async function() {
  const User = mongoose.model('User');
  const JewelryShop = mongoose.model('JewelryShop');
  
  this.usage.totalUsers = await User.countDocuments({ 
    organizationId: this._id,
    deletedAt: null 
  });
  
  this.usage.totalShops = await JewelryShop.countDocuments({ 
    organizationId: this._id,
    deletedAt: null 
  });
  
  this.usage.lastUpdated = new Date();
  return this.save();
};

// Get primary bank account
organizationSchema.methods.getPrimaryBank = function() {
  return this.bankDetails.find(bank => bank.isPrimary);
};

// Soft delete
organizationSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Restore soft deleted organization
organizationSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Extend subscription
organizationSchema.methods.extendSubscription = function(days) {
  if (this.subscription.endDate) {
    this.subscription.endDate = new Date(this.subscription.endDate.getTime() + days * 24 * 60 * 60 * 1000);
  } else {
    this.subscription.endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  return this.save();
};

// Upgrade subscription plan
organizationSchema.methods.upgradePlan = function(plan, features = {}) {
  this.subscription.plan = plan;
  Object.assign(this.subscription.features, features);
  return this.save();
};

// Static Methods

// Generate unique slug
organizationSchema.statics.generateSlug = async function(name) {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  let uniqueSlug = slug;
  let counter = 1;
  
  while (await this.findOne({ slug: uniqueSlug })) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return uniqueSlug;
};

// Find active organizations
organizationSchema.statics.findActive = function() {
  return this.find({ isActive: true, deletedAt: null });
};

// Find by subscription status
organizationSchema.statics.findBySubscriptionStatus = function(status) {
  return this.find({ 
    'subscription.status': status,
    deletedAt: null 
  });
};

// Find expiring subscriptions
organizationSchema.statics.findExpiringSubscriptions = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    'subscription.status': 'active',
    'subscription.endDate': { 
      $lte: futureDate,
      $gte: new Date()
    },
    deletedAt: null
  });
};

// Find deleted organizations
organizationSchema.statics.findDeleted = function() {
  return this.find({ deletedAt: { $ne: null } }).setOptions({ includeDeleted: true });
};

export default mongoose.model('Organization', organizationSchema);