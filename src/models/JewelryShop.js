import mongoose from 'mongoose';

const jewelryShopSchema = new mongoose.Schema(
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
      maxlength: [10, 'Shop code cannot exceed 10 characters']
    },
    
    // Multi-tenant
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
    whatsappNumber: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit WhatsApp number']
    },
    
    // Address
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required']
      },
      landmark: String,
      area: String,
      city: {
        type: String,
        required: [true, 'City is required']
      },
      state: {
        type: String,
        required: [true, 'State is required']
      },
      country: { 
        type: String, 
        default: 'India' 
      },
      pincode: {
        type: String,
        required: [true, 'Pincode is required'],
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
    
    // Business Registration
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number']
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number']
    },
    udyamNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    fssaiNumber: {
      type: String,
      trim: true
    },
    tradeLicenseNumber: {
      type: String,
      trim: true
    },
    
    // Shop Type & Category
    shopType: {
      type: String,
      enum: ['retail', 'wholesale', 'showroom', 'workshop', 'warehouse', 'online'],
      default: 'retail'
    },
    category: {
      type: String,
      enum: ['jewelry', 'gold', 'silver', 'diamond', 'gemstone', 'pearls', 'platinum', 'mixed'],
      default: 'jewelry'
    },
    
    // Branding
    logo: {
      type: String,
      default: null
    },
    images: [{
      url: String,
      caption: String,
      isPrimary: {
        type: Boolean,
        default: false
      }
    }],
    
    // Shop Manager/Owner
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Manager ID is required']
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
        closeTime: { type: String, default: '20:00' }
      }
    },
    holidays: [{
      date: Date,
      occasion: String,
      isRecurring: {
        type: Boolean,
        default: false
      }
    }],
    
    // Shop Settings
    settings: {
      // Currency & Regional
      currency: { 
        type: String, 
        default: 'INR' 
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
      
      // Weight & Purity Settings
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
      enableStoneWeight: {
        type: Boolean,
        default: true
      },
      enableNetWeight: {
        type: Boolean,
        default: true
      },
      
      // Pricing Settings
      enableMakingCharges: {
        type: Boolean,
        default: true
      },
      makingChargeType: {
        type: String,
        enum: ['per_gram', 'percentage', 'flat'],
        default: 'per_gram'
      },
      defaultMakingCharge: {
        type: Number,
        default: 0
      },
      enableWastage: {
        type: Boolean,
        default: true
      },
      defaultWastagePercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      
      // Metal Rates
      goldRate: {
        rate24K: { type: Number, default: 0 },
        rate22K: { type: Number, default: 0 },
        rate18K: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now }
      },
      silverRate: {
        rate999: { type: Number, default: 0 },
        rate925: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now }
      },
      platinumRate: {
        rate: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now }
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
        makingCharges: { type: Number, default: 18 },
        other: { type: Number, default: 18 }
      },
      
      // Invoice Settings
      invoicePrefix: {
        type: String,
        default: 'INV'
      },
      invoiceStartNumber: {
        type: Number,
        default: 1,
        min: 1
      },
      currentInvoiceNumber: {
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
      estimatePrefix: {
        type: String,
        default: 'EST'
      },
      
      // Print Settings
      enableBarcodePrinting: {
        type: Boolean,
        default: false
      },
      barcodeFormat: {
        type: String,
        enum: ['CODE128', 'EAN13', 'QR'],
        default: 'CODE128'
      },
      printLogoOnInvoice: {
        type: Boolean,
        default: true
      },
      invoiceTermsConditions: {
        type: String,
        maxlength: 1000
      },
      
      // Inventory Settings
      enableLowStockAlerts: {
        type: Boolean,
        default: true
      },
      lowStockThreshold: {
        type: Number,
        default: 5
      },
      enableBatchTracking: {
        type: Boolean,
        default: false
      },
      enableSerialNumberTracking: {
        type: Boolean,
        default: true
      },
      
      // Payment Settings
      acceptedPaymentModes: {
        cash: { type: Boolean, default: true },
        card: { type: Boolean, default: true },
        upi: { type: Boolean, default: true },
        netBanking: { type: Boolean, default: true },
        cheque: { type: Boolean, default: true },
        emi: { type: Boolean, default: false },
        goldExchange: { type: Boolean, default: true },
        silverExchange: { type: Boolean, default: true }
      },
      
      // Notification Settings
      enableSMSNotifications: {
        type: Boolean,
        default: false
      },
      enableEmailNotifications: {
        type: Boolean,
        default: true
      },
      enableWhatsAppNotifications: {
        type: Boolean,
        default: false
      },
      
      // Feature Flags
      enableSchemeManagement: {
        type: Boolean,
        default: false
      },
      enableRepairManagement: {
        type: Boolean,
        default: false
      },
      enableCustomOrderManagement: {
        type: Boolean,
        default: false
      },
      enableHallmarkingTracking: {
        type: Boolean,
        default: false
      },
      enableOldGoldPurchase: {
        type: Boolean,
        default: true
      }
    },
    
    // Banking Details
    bankDetails: [{
      bankName: {
        type: String,
        required: true
      },
      accountNumber: {
        type: String,
        required: true
      },
      ifscCode: {
        type: String,
        required: true,
        uppercase: true
      },
      accountHolderName: {
        type: String,
        required: true
      },
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
    
    // UPI Details
    upiDetails: [{
      upiId: {
        type: String,
        required: true
      },
      provider: {
        type: String,
        enum: ['googlepay', 'phonepe', 'paytm', 'bhim', 'other'],
        default: 'other'
      },
      holderName: String,
      qrCode: String,
      isPrimary: {
        type: Boolean,
        default: false
      }
    }],
    
    // Compliance & Certifications
    certifications: {
      bis: {
        certified: { type: Boolean, default: false },
        certificateNumber: String,
        expiryDate: Date
      },
      hallmarking: {
        certified: { type: Boolean, default: false },
        licenseNumber: String,
        hallmarkingCenterId: String,
        expiryDate: Date
      },
      iso: {
        certified: { type: Boolean, default: false },
        certificateNumber: String,
        expiryDate: Date
      }
    },
    
    // Warehouse/Storage Info
    warehouseDetails: {
      hasWarehouse: {
        type: Boolean,
        default: false
      },
      warehouseAddress: String,
      warehouseCapacity: {
        type: Number,
        default: 0
      },
      warehouseUnit: {
        type: String,
        enum: ['sqft', 'sqm'],
        default: 'sqft'
      }
    },
    
    // Shop Statistics
    statistics: {
      totalProducts: {
        type: Number,
        default: 0
      },
      totalValue: {
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
      lastSaleDate: Date,
      lastPurchaseDate: Date,
      averageSaleValue: {
        type: Number,
        default: 0
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
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Opening Details
    openingDate: {
      type: Date,
      default: Date.now
    },
    closingDate: Date,
    
    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
jewelryShopSchema.index({ organizationId: 1, code: 1 }, { unique: true });
jewelryShopSchema.index({ organizationId: 1, isActive: 1 });
jewelryShopSchema.index({ code: 1 }, { unique: true });
jewelryShopSchema.index({ managerId: 1 });
jewelryShopSchema.index({ 'address.city': 1 });
jewelryShopSchema.index({ 'address.state': 1 });
jewelryShopSchema.index({ 'address.location': '2dsphere' });
jewelryShopSchema.index({ shopType: 1 });
jewelryShopSchema.index({ category: 1 });

// Virtuals
jewelryShopSchema.virtual('users', {
  ref: 'User',
  localField: '_id',
  foreignField: 'shopAccess.shopId'
});

jewelryShopSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'shopId'
});

jewelryShopSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.area ? addr.area + ', ' : ''}${addr.city}, ${addr.state} - ${addr.pincode}`;
});

// Ensure only one primary bank account
jewelryShopSchema.pre('save', function(next) {
  // Primary bank account
  if (this.bankDetails && this.bankDetails.length > 0) {
    const primaryBanks = this.bankDetails.filter(bank => bank.isPrimary);
    if (primaryBanks.length > 1) {
      this.bankDetails.forEach((bank, index) => {
        if (index > 0 && bank.isPrimary) {
          bank.isPrimary = false;
        }
      });
    } else if (primaryBanks.length === 0) {
      this.bankDetails[0].isPrimary = true;
    }
  }
  
  // Primary UPI
  if (this.upiDetails && this.upiDetails.length > 0) {
    const primaryUpis = this.upiDetails.filter(upi => upi.isPrimary);
    if (primaryUpis.length > 1) {
      this.upiDetails.forEach((upi, index) => {
        if (index > 0 && upi.isPrimary) {
          upi.isPrimary = false;
        }
      });
    } else if (primaryUpis.length === 0) {
      this.upiDetails[0].isPrimary = true;
    }
  }
  
  // Primary image
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    if (primaryImages.length > 1) {
      this.images.forEach((img, index) => {
        if (index > 0 && img.isPrimary) {
          img.isPrimary = false;
        }
      });
    } else if (primaryImages.length === 0) {
      this.images[0].isPrimary = true;
    }
  }
  
  next();
});

// Soft delete middleware
jewelryShopSchema.pre(/^find/, function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Instance Methods

// Check if shop is currently open
jewelryShopSchema.methods.isCurrentlyOpen = function() {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const todayHours = this.businessHours[dayName];
  
  if (!todayHours || !todayHours.isOpen) {
    return false;
  }
  
  // Check if it's a holiday
  const today = now.toISOString().split('T')[0];
  const isHoliday = this.holidays.some(holiday => {
    const holidayDate = holiday.date.toISOString().split('T')[0];
    return holidayDate === today;
  });
  
  if (isHoliday) {
    return false;
  }
  
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
};

// Get today's business hours
jewelryShopSchema.methods.getTodayHours = function() {
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return this.businessHours[dayName];
};

// Update metal rates
jewelryShopSchema.methods.updateGoldRate = function(rate24K, rate22K, rate18K) {
  this.settings.goldRate = {
    rate24K,
    rate22K,
    rate18K,
    lastUpdated: new Date()
  };
  return this.save();
};

jewelryShopSchema.methods.updateSilverRate = function(rate999, rate925) {
  this.settings.silverRate = {
    rate999,
    rate925,
    lastUpdated: new Date()
  };
  return this.save();
};

jewelryShopSchema.methods.updatePlatinumRate = function(rate) {
  this.settings.platinumRate = {
    rate,
    lastUpdated: new Date()
  };
  return this.save();
};

// Get next invoice number
jewelryShopSchema.methods.getNextInvoiceNumber = function() {
  const nextNumber = this.settings.currentInvoiceNumber;
  this.settings.currentInvoiceNumber += 1;
  return `${this.settings.invoicePrefix}-${String(nextNumber).padStart(6, '0')}`;
};

// Get primary bank account
jewelryShopSchema.methods.getPrimaryBank = function() {
  return this.bankDetails.find(bank => bank.isPrimary);
};

// Get primary UPI
jewelryShopSchema.methods.getPrimaryUPI = function() {
  return this.upiDetails.find(upi => upi.isPrimary);
};

// Get primary image
jewelryShopSchema.methods.getPrimaryImage = function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary || (this.images.length > 0 ? this.images[0] : null);
};

// Update statistics
jewelryShopSchema.methods.updateStatistics = async function() {
  const Product = mongoose.model('Product');
  const Sale = mongoose.model('Sale');
  const Purchase = mongoose.model('Purchase');
  const Customer = mongoose.model('Customer');
  const Supplier = mongoose.model('Supplier');
  
  // Count products
  this.statistics.totalProducts = await Product.countDocuments({ 
    shopId: this._id,
    deletedAt: null 
  });
  
  // Calculate total inventory value
  const products = await Product.find({ shopId: this._id, deletedAt: null });
  this.statistics.totalValue = products.reduce((sum, product) => sum + (product.sellingPrice || 0), 0);
  
  // Sales statistics
  const sales = await Sale.find({ shopId: this._id, status: 'completed' });
  this.statistics.totalSales = sales.length;
  if (sales.length > 0) {
    this.statistics.lastSaleDate = sales[sales.length - 1].createdAt;
    const totalSalesValue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    this.statistics.averageSaleValue = totalSalesValue / sales.length;
  }
  
  // Purchase statistics
  const purchases = await Purchase.find({ shopId: this._id, status: 'completed' });
  this.statistics.totalPurchases = purchases.length;
  if (purchases.length > 0) {
    this.statistics.lastPurchaseDate = purchases[purchases.length - 1].createdAt;
  }
  
  // Customer and Supplier counts
  this.statistics.totalCustomers = await Customer.countDocuments({ 
    shopId: this._id,
    deletedAt: null 
  });
  this.statistics.totalSuppliers = await Supplier.countDocuments({ 
    shopId: this._id,
    deletedAt: null 
  });
  
  this.statistics.lastUpdated = new Date();
  return this.save();
};

// Check if feature is enabled
jewelryShopSchema.methods.hasFeature = function(featureName) {
  return this.settings[featureName] || false;
};

// Soft delete
jewelryShopSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  this.closingDate = new Date();
  return this.save();
};

// Restore
jewelryShopSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  this.closingDate = null;
  return this.save();
};

// Static Methods

// Generate unique shop code
jewelryShopSchema.statics.generateCode = async function(organizationId, prefix = 'SHP') {
  let code = `${prefix}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  let counter = 1;
  
  while (await this.findOne({ organizationId, code })) {
    code = `${prefix}${String(Math.floor(Math.random() * 10000) + counter).padStart(4, '0')}`;
    counter++;
  }
  
  return code;
};

// Find shops by organization
jewelryShopSchema.statics.findByOrganization = function(organizationId, options = {}) {
  return this.find({ 
    organizationId,
    deletedAt: null,
    ...options 
  });
};

// Find active shops
jewelryShopSchema.statics.findActive = function(organizationId = null) {
  const query = { isActive: true, deletedAt: null };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

// Find shops by city
jewelryShopSchema.statics.findByCity = function(city, organizationId = null) {
  const query = { 
    'address.city': city,
    isActive: true,
    deletedAt: null 
  };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

// Find shops by type
jewelryShopSchema.statics.findByType = function(shopType, organizationId = null) {
  const query = { 
    shopType,
    isActive: true,
    deletedAt: null 
  };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

// Find nearby shops (geospatial query)
jewelryShopSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
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
jewelryShopSchema.statics.findDeleted = function(organizationId = null) {
  const query = { deletedAt: { $ne: null } };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query).setOptions({ includeDeleted: true });
};

export default mongoose.model('JewelryShop', jewelryShopSchema);