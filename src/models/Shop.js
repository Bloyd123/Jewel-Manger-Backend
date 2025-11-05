import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema(
  {
    // Basic Shop Information
    name: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true,
      maxlength: [100, 'Shop name cannot exceed 100 characters']
    },
    displayName: {
      type: String,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    
    // Organization Reference
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    
    // Contact Information
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
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
    whatsapp: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit WhatsApp number']
    },
    
    // Address
    address: {
      street: {
        type: String,
        required: true,
        trim: true
      },
      landmark: {
        type: String,
        trim: true
      },
      area: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        required: true,
        trim: true
      },
      state: {
        type: String,
        required: true,
        trim: true
      },
      country: {
        type: String,
        default: 'India',
        trim: true
      },
      pincode: {
        type: String,
        required: true,
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
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number']
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number']
    },
    tanNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    registrationNumber: {
      type: String,
      trim: true
    },
    shopType: {
      type: String,
      enum: ['retail', 'wholesale', 'manufacturing', 'showroom', 'workshop'],
      default: 'retail'
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
    banner: {
      type: String,
      default: null
    },
    
    // Shop Manager/Owner
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Business Hours
    businessHours: {
      monday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' }
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' }
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' }
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' }
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' }
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' }
      },
      sunday: {
        isOpen: { type: Boolean, default: false },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '18:00' }
      }
    },
    
    // Shop Settings
    settings: {
      // Regional Settings
      currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR']
      },
      language: {
        type: String,
        default: 'en',
        enum: ['en', 'hi', 'mr', 'gu', 'ta', 'te']
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata'
      },
      
      // Weight & Measurement Settings
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
      
      // Pricing Settings
      enableMakingCharges: {
        type: Boolean,
        default: true
      },
      makingChargesType: {
        type: String,
        enum: ['per_gram', 'percentage', 'fixed', 'per_piece'],
        default: 'per_gram'
      },
      defaultMakingCharges: {
        type: Number,
        default: 0,
        min: 0
      },
      
      // Metal Rates (Current rates)
      metalRates: {
        gold24k: { type: Number, default: 0 },
        gold22k: { type: Number, default: 0 },
        gold18k: { type: Number, default: 0 },
        silver: { type: Number, default: 0 },
        platinum: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null
        }
      },
      
      // Stone Settings
      enableStoneManagement: {
        type: Boolean,
        default: true
      },
      stoneChargesType: {
        type: String,
        enum: ['per_piece', 'per_carat', 'fixed'],
        default: 'per_piece'
      },
      
      // Wastage Settings
      enableWastage: {
        type: Boolean,
        default: true
      },
      wastageType: {
        type: String,
        enum: ['percentage', 'fixed_gram'],
        default: 'percentage'
      },
      defaultWastage: {
        type: Number,
        default: 0,
        min: 0
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
      currentInvoiceNumber: {
        type: Number,
        default: 1
      },
      
      // Estimate/Quotation Settings
      estimatePrefix: {
        type: String,
        default: 'EST'
      },
      estimateStartNumber: {
        type: Number,
        default: 1
      },
      
      // Purchase Settings
      purchasePrefix: {
        type: String,
        default: 'PUR'
      },
      purchaseStartNumber: {
        type: Number,
        default: 1
      },
      
      // Order Settings
      orderPrefix: {
        type: String,
        default: 'ORD'
      },
      orderStartNumber: {
        type: Number,
        default: 1
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
        gemstone: { type: Number, default: 3 },
        makingCharges: { type: Number, default: 18 },
        stoneCharges: { type: Number, default: 18 }
      },
      
      // Discount Settings
      allowDiscounts: {
        type: Boolean,
        default: true
      },
      maxDiscountPercentage: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
      },
      
      // Hallmarking Settings
      enableHallmarking: {
        type: Boolean,
        default: false
      },
      hallmarkingCenter: {
        type: String,
        trim: true
      },
      huidPrefix: {
        type: String,
        trim: true
      },
      
      // Old Gold Exchange Settings
      enableOldGoldExchange: {
        type: Boolean,
        default: true
      },
      oldGoldDeductionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      
      // Repair Settings
      enableRepairManagement: {
        type: Boolean,
        default: false
      },
      repairPrefix: {
        type: String,
        default: 'REP'
      },
      
      // Barcode Settings
      enableBarcode: {
        type: Boolean,
        default: false
      },
      barcodeType: {
        type: String,
        enum: ['CODE128', 'CODE39', 'EAN13', 'QR'],
        default: 'CODE128'
      },
      
      // Printing Settings
      printSettings: {
        headerText: String,
        footerText: String,
        showLogo: { type: Boolean, default: true },
        showTermsConditions: { type: Boolean, default: true },
        termsConditions: String,
        showBankDetails: { type: Boolean, default: true },
        paperSize: {
          type: String,
          enum: ['A4', 'A5', 'thermal_80mm', 'thermal_58mm'],
          default: 'A4'
        }
      },
      
      // Notification Settings
      notifications: {
        lowStockAlert: { type: Boolean, default: true },
        lowStockThreshold: { type: Number, default: 10 },
        expiryAlert: { type: Boolean, default: false },
        expiryAlertDays: { type: Number, default: 30 },
        smsNotifications: { type: Boolean, default: false },
        emailNotifications: { type: Boolean, default: true },
        whatsappNotifications: { type: Boolean, default: false }
      },
      
      // Scheme Management
      enableSchemes: {
        type: Boolean,
        default: false
      },
      
      // Multi-currency Support
      enableMultiCurrency: {
        type: Boolean,
        default: false
      },
      acceptedCurrencies: [{
        type: String,
        enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR']
      }]
    },
    
    // Banking Details
    bankDetails: [{
      bankName: {
        type: String,
        required: true,
        trim: true
      },
      accountNumber: {
        type: String,
        required: true,
        trim: true
      },
      ifscCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
      },
      accountHolderName: {
        type: String,
        required: true,
        trim: true
      },
      branchName: {
        type: String,
        trim: true
      },
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
    
    // UPI Details
    upiDetails: [{
      upiId: {
        type: String,
        trim: true
      },
      upiName: {
        type: String,
        trim: true
      },
      qrCode: {
        type: String
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    
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
      },
      fssai: {
        certified: { type: Boolean, default: false },
        licenseNumber: String,
        expiryDate: Date
      }
    },
    
    // Shop Statistics
    statistics: {
      totalProducts: {
        type: Number,
        default: 0
      },
      totalInventoryValue: {
        type: Number,
        default: 0
      },
      totalSales: {
        type: Number,
        default: 0
      },
      totalPurchases: {
        type: Number,
        default: 0
      },
      totalCustomers: {
        type: Number,
        default: 0
      },
      totalSuppliers: {
        type: Number,
        default: 0
      },
      totalStaff: {
        type: Number,
        default: 0
      },
      lastSaleDate: {
        type: Date,
        default: null
      },
      lastPurchaseDate: {
        type: Date,
        default: null
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    },
    
    // Features Enabled
    features: {
      inventoryManagement: { type: Boolean, default: true },
      purchaseManagement: { type: Boolean, default: true },
      salesManagement: { type: Boolean, default: true },
      billingInvoicing: { type: Boolean, default: true },
      customerManagement: { type: Boolean, default: true },
      supplierManagement: { type: Boolean, default: true },
      partyManagement: { type: Boolean, default: true },
      orderManagement: { type: Boolean, default: false },
      repairManagement: { type: Boolean, default: false },
      schemeManagement: { type: Boolean, default: false },
      hallmarkingManagement: { type: Boolean, default: false },
      oldGoldExchange: { type: Boolean, default: true },
      barcodeScanning: { type: Boolean, default: false },
      reports: { type: Boolean, default: true },
      analytics: { type: Boolean, default: false }
    },
    
    // Social Media & Website
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String,
      linkedin: String
    },
    website: {
      type: String,
      trim: true,
      match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'Invalid website URL']
    },
    
    // Shop Status
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
    
    // Temporary Closure
    temporaryClosure: {
      isClosed: {
        type: Boolean,
        default: false
      },
      reason: String,
      closedFrom: Date,
      closedUntil: Date
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
    tags: [String],
    notes: {
      type: String,
      maxlength: 1000
    },
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
shopSchema.index({ code: 1 }, { unique: true });
shopSchema.index({ organizationId: 1 });
shopSchema.index({ managerId: 1 });
shopSchema.index({ isActive: 1 });
shopSchema.index({ organizationId: 1, isActive: 1 });
shopSchema.index({ 'address.city': 1 });
shopSchema.index({ 'address.state': 1 });
shopSchema.index({ 'address.pincode': 1 });
shopSchema.index({ 'address.location': '2dsphere' });
shopSchema.index({ gstNumber: 1 }, { sparse: true });
shopSchema.index({ createdAt: -1 });

// Virtuals
shopSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true
});

shopSchema.virtual('manager', {
  ref: 'User',
  localField: 'managerId',
  foreignField: '_id',
  justOne: true
});

shopSchema.virtual('staff', {
  ref: 'UserShopAccess',
  localField: '_id',
  foreignField: 'shopId'
});

shopSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'shopId'
});

shopSchema.virtual('customers', {
  ref: 'Party',
  localField: '_id',
  foreignField: 'shopId',
  match: { partyType: 'customer' }
});

shopSchema.virtual('suppliers', {
  ref: 'Party',
  localField: '_id',
  foreignField: 'shopId',
  match: { partyType: 'supplier' }
});

shopSchema.virtual('sales', {
  ref: 'Sale',
  localField: '_id',
  foreignField: 'shopId'
});

shopSchema.virtual('purchases', {
  ref: 'Purchase',
  localField: '_id',
  foreignField: 'shopId'
});

// Virtual to check if shop is currently open
shopSchema.virtual('isCurrentlyOpen').get(function() {
  if (this.temporaryClosure?.isClosed) return false;
  
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().slice(0, 5);
  
  const todayHours = this.businessHours[day];
  if (!todayHours?.isOpen) return false;
  
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
});

// Soft delete middleware
shopSchema.pre(/^find/, function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Ensure only one primary bank account
shopSchema.pre('save', function(next) {
  if (this.bankDetails && this.bankDetails.length > 0) {
    const primaryAccounts = this.bankDetails.filter(bank => bank.isPrimary);
    if (primaryAccounts.length > 1) {
      this.bankDetails.forEach((bank, index) => {
        if (index > 0 && bank.isPrimary) {
          bank.isPrimary = false;
        }
      });
    } else if (primaryAccounts.length === 0) {
      this.bankDetails[0].isPrimary = true;
    }
  }
  next();
});

// Instance Methods

// Get primary bank account
shopSchema.methods.getPrimaryBank = function() {
  return this.bankDetails.find(bank => bank.isPrimary);
};

// Get active UPI
shopSchema.methods.getActiveUPI = function() {
  return this.upiDetails.filter(upi => upi.isActive);
};

// Update metal rates
shopSchema.methods.updateMetalRates = function(rates, userId) {
  Object.assign(this.settings.metalRates, rates);
  this.settings.metalRates.lastUpdated = new Date();
  this.settings.metalRates.updatedBy = userId;
  return this.save();
};

// Generate next invoice number
shopSchema.methods.getNextInvoiceNumber = function() {
  const invoiceNumber = `${this.settings.invoicePrefix}${String(this.settings.currentInvoiceNumber).padStart(5, '0')}`;
  this.settings.currentInvoiceNumber += 1;
  return invoiceNumber;
};

// Check if shop is open on a specific day
shopSchema.methods.isOpenOn = function(day) {
  const dayLower = day.toLowerCase();
  return this.businessHours[dayLower]?.isOpen || false;
};

// Get business hours for a specific day
shopSchema.methods.getBusinessHours = function(day) {
  const dayLower = day.toLowerCase();
  return this.businessHours[dayLower];
};

// Update statistics
shopSchema.methods.updateStatistics = async function() {
  const Product = mongoose.model('Product');
  const Party = mongoose.model('Party');
  const UserShopAccess = mongoose.model('UserShopAccess');
  
  this.statistics.totalProducts = await Product.countDocuments({
    shopId: this._id,
    deletedAt: null
  });
  
  this.statistics.totalCustomers = await Party.countDocuments({
    shopId: this._id,
    partyType: 'customer',
    deletedAt: null
  });
  
  this.statistics.totalSuppliers = await Party.countDocuments({
    shopId: this._id,
    partyType: 'supplier',
    deletedAt: null
  });
  
  this.statistics.totalStaff = await UserShopAccess.countDocuments({
    shopId: this._id,
    isActive: true,
    deletedAt: null
  });
  
  this.statistics.lastUpdated = new Date();
  return this.save();
};

// Soft delete
shopSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Restore
shopSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Close shop temporarily
shopSchema.methods.closeTemporarily = function(reason, from, until) {
  this.temporaryClosure = {
    isClosed: true,
    reason,
    closedFrom: from || new Date(),
    closedUntil: until
  };
  return this.save();
};

// Reopen shop
shopSchema.methods.reopenShop = function() {
  this.temporaryClosure = {
    isClosed: false,
    reason: null,
    closedFrom: null,
    closedUntil: null
  };
  return this.save();
};

// Check if feature is enabled
shopSchema.methods.hasFeature = function(featureName) {
  return this.features[featureName] || false;
};

// Static Methods

// Generate unique shop code
shopSchema.statics.generateCode = async function(name, organizationId) {
  const orgShops = await this.countDocuments({ organizationId });
  let code = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .substring(0, 4);
  
  if (code.length < 2) code = 'SHOP';
  
  let uniqueCode = `${code}${String(orgShops + 1).padStart(3, '0')}`;
  let counter = 1;
  
  while (await this.findOne({ code: uniqueCode })) {
    uniqueCode = `${code}${String(orgShops + counter).padStart(3, '0')}`;
    counter++;
  }
  
  return uniqueCode;
};

// Find active shops
shopSchema.statics.findActive = function(organizationId = null) {
  const query = { isActive: true, deletedAt: null };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

// Find by organization
shopSchema.statics.findByOrganization = function(organizationId, options = {}) {
  return this.find({
    organizationId,
    deletedAt: null,
    ...options
  });
};

// Find by manager
shopSchema.statics.findByManager = function(managerId) {
  return this.find({
    managerId,
    isActive: true,
    deletedAt: null
  });
};

// Find by city
shopSchema.statics.findByCity = function(city) {
  return this.find({
    'address.city': new RegExp(city, 'i'),
    isActive: true,
    deletedAt: null
  });
};

// Find by state
shopSchema.statics.findByState = function(state) {
  return this.find({
    'address.state': new RegExp(state, 'i'),
    isActive: true,
    deletedAt: null
  });
};

// Find nearby shops
shopSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    'address.location': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true,
    deletedAt: null
  });
};

// Find deleted shops
shopSchema.statics.findDeleted = function(organizationId = null) {
  const query = { deletedAt: { $ne: null } };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query).setOptions({ includeDeleted: true });
};

// Find temporarily closed shops
shopSchema.statics.findTemporarilyClosed = function(organizationId = null) {
  const query = {
    'temporaryClosure.isClosed': true,
    deletedAt: null
  };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

export default mongoose.model('JewelryShop', shopSchema);