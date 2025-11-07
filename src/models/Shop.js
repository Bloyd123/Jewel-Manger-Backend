import mongoose from 'mongoose';

const jewelryShopSchema = new mongoose.Schema(
  {
    // ============================================
    // BASIC SHOP INFORMATION
    // ============================================
    name: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true,
      maxlength: [100, 'Shop name cannot exceed 100 characters'],
    },
    displayName: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [10, 'Shop code cannot exceed 10 characters'],
      index: true,
    },

    // ============================================
    // MULTI-TENANT & ORGANIZATION
    // ============================================
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },

    // ============================================
    // CONTACT INFORMATION
    // ============================================
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    alternatePhone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },
    fax: {
      type: String,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit WhatsApp number'],
    },

    // ============================================
    // ADDRESS
    // ============================================
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true,
      },
      landmark: {
        type: String,
        trim: true,
      },
      area: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      country: {
        type: String,
        default: 'India',
        trim: true,
      },
      pincode: {
        type: String,
        required: [true, 'Pincode is required'],
        match: [/^[0-9]{6}$/, 'Invalid pincode'],
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },

    // ============================================
    // BUSINESS REGISTRATION
    // ============================================
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number'],
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number'],
    },
    tanNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    udyamNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    fssaiNumber: {
      type: String,
      trim: true,
    },
    tradeLicenseNumber: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },

    // ============================================
    // SHOP TYPE & CATEGORY
    // ============================================
    shopType: {
      type: String,
      enum: ['retail', 'wholesale', 'manufacturing', 'showroom', 'workshop', 'warehouse', 'online'],
      default: 'retail',
    },
    category: {
      type: String,
      enum: ['jewelry', 'gold', 'silver', 'diamond', 'gemstone', 'pearls', 'platinum', 'mixed'],
      default: 'jewelry',
    },
    establishedYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
    },

    // ============================================
    // BRANDING & MEDIA
    // ============================================
    logo: {
      type: String,
      default: null,
    },
    favicon: {
      type: String,
      default: null,
    },
    banner: {
      type: String,
      default: null,
    },
    images: [
      {
        url: String,
        caption: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // ============================================
    // SHOP MANAGER/OWNER
    // ============================================
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Manager ID is required'],
      index: true,
    },

    // ============================================
    // BUSINESS HOURS
    // ============================================
    businessHours: {
      monday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' },
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' },
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' },
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' },
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' },
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '20:00' },
      },
      sunday: {
        isOpen: { type: Boolean, default: false },
        openTime: { type: String, default: '10:00' },
        closeTime: { type: String, default: '18:00' },
      },
    },
    holidays: [
      {
        date: Date,
        occasion: String,
        isRecurring: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // ============================================
    // SHOP SETTINGS
    // ============================================
    settings: {
      // Regional Settings
      currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'],
      },
      language: {
        type: String,
        default: 'en',
        enum: ['en', 'hi', 'mr', 'gu', 'ta', 'te'],
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },

      // Weight & Measurement Settings
      defaultWeightUnit: {
        type: String,
        enum: ['gram', 'kg', 'tola', 'ounce', 'carat'],
        default: 'gram',
      },
      defaultPurityUnit: {
        type: String,
        enum: ['karat', 'percentage', 'purity_916', 'purity_999'],
        default: 'karat',
      },
      enableStoneWeight: {
        type: Boolean,
        default: true,
      },
      enableNetWeight: {
        type: Boolean,
        default: true,
      },

      // Pricing Settings
      enableMakingCharges: {
        type: Boolean,
        default: true,
      },
      makingChargesType: {
        type: String,
        enum: ['per_gram', 'percentage', 'fixed', 'flat', 'per_piece'],
        default: 'per_gram',
      },
      defaultMakingCharges: {
        type: Number,
        default: 0,
        min: 0,
      },

      // Metal Rates (Current rates)
      metalRates: {
        gold: {
          rate24K: { type: Number, default: 0 },
          rate22K: { type: Number, default: 0 },
          rate18K: { type: Number, default: 0 },
          lastUpdated: { type: Date, default: Date.now },
        },
        silver: {
          rate999: { type: Number, default: 0 },
          rate925: { type: Number, default: 0 },
          lastUpdated: { type: Date, default: Date.now },
        },
        platinum: {
          rate: { type: Number, default: 0 },
          lastUpdated: { type: Date, default: Date.now },
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
      },

      // Stone Settings
      enableStoneManagement: {
        type: Boolean,
        default: true,
      },
      stoneChargesType: {
        type: String,
        enum: ['per_piece', 'per_carat', 'fixed'],
        default: 'per_piece',
      },

      // Wastage Settings
      enableWastage: {
        type: Boolean,
        default: true,
      },
      wastageType: {
        type: String,
        enum: ['percentage', 'fixed_gram'],
        default: 'percentage',
      },
      defaultWastage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      // Invoice Settings
      invoicePrefix: {
        type: String,
        default: 'INV',
      },
      invoiceStartNumber: {
        type: Number,
        default: 1,
        min: 1,
      },
      currentInvoiceNumber: {
        type: Number,
        default: 1,
      },

      // Estimate/Quotation Settings
      estimatePrefix: {
        type: String,
        default: 'EST',
      },
      estimateStartNumber: {
        type: Number,
        default: 1,
      },
      quotationPrefix: {
        type: String,
        default: 'QUO',
      },

      // Purchase Settings
      purchasePrefix: {
        type: String,
        default: 'PUR',
      },
      purchaseStartNumber: {
        type: Number,
        default: 1,
      },

      // Order Settings
      orderPrefix: {
        type: String,
        default: 'ORD',
      },
      orderStartNumber: {
        type: Number,
        default: 1,
      },

      // Tax Settings
      enableGST: {
        type: Boolean,
        default: true,
      },
      gstRates: {
        gold: { type: Number, default: 3 },
        silver: { type: Number, default: 3 },
        diamond: { type: Number, default: 3 },
        platinum: { type: Number, default: 3 },
        gemstone: { type: Number, default: 3 },
        makingCharges: { type: Number, default: 18 },
        stoneCharges: { type: Number, default: 18 },
        other: { type: Number, default: 18 },
      },

      // Discount Settings
      allowDiscounts: {
        type: Boolean,
        default: true,
      },
      maxDiscountPercentage: {
        type: Number,
        default: 10,
        min: 0,
        max: 100,
      },

      // Hallmarking Settings
      enableHallmarking: {
        type: Boolean,
        default: false,
      },
      hallmarkingCenter: {
        type: String,
        trim: true,
      },
      huidPrefix: {
        type: String,
        trim: true,
      },

      // Old Gold Exchange Settings
      enableOldGoldExchange: {
        type: Boolean,
        default: true,
      },
      oldGoldDeductionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      // Repair Settings
      enableRepairManagement: {
        type: Boolean,
        default: false,
      },
      repairPrefix: {
        type: String,
        default: 'REP',
      },

      // Barcode Settings
      enableBarcode: {
        type: Boolean,
        default: false,
      },
      barcodeType: {
        type: String,
        enum: ['CODE128', 'CODE39', 'EAN13', 'QR'],
        default: 'CODE128',
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
          default: 'A4',
        },
      },

      // Inventory Settings
      enableLowStockAlerts: {
        type: Boolean,
        default: true,
      },
      lowStockThreshold: {
        type: Number,
        default: 5,
      },
      enableBatchTracking: {
        type: Boolean,
        default: false,
      },
      enableSerialNumberTracking: {
        type: Boolean,
        default: true,
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
        silverExchange: { type: Boolean, default: true },
      },

      // Notification Settings
      notifications: {
        lowStockAlert: { type: Boolean, default: true },
        expiryAlert: { type: Boolean, default: false },
        expiryAlertDays: { type: Number, default: 30 },
        smsNotifications: { type: Boolean, default: false },
        emailNotifications: { type: Boolean, default: true },
        whatsappNotifications: { type: Boolean, default: false },
      },

      // Feature Flags
      enableSchemes: {
        type: Boolean,
        default: false,
      },
      enableCustomOrderManagement: {
        type: Boolean,
        default: false,
      },
      enableHallmarkingTracking: {
        type: Boolean,
        default: false,
      },
      enableOldGoldPurchase: {
        type: Boolean,
        default: true,
      },

      // Multi-currency Support
      enableMultiCurrency: {
        type: Boolean,
        default: false,
      },
      acceptedCurrencies: [
        {
          type: String,
          enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'],
        },
      ],
    },

    // ============================================
    // BANKING DETAILS
    // ============================================
    bankDetails: [
      {
        bankName: {
          type: String,
          required: true,
          trim: true,
        },
        accountNumber: {
          type: String,
          required: true,
          trim: true,
        },
        ifscCode: {
          type: String,
          required: true,
          trim: true,
          uppercase: true,
        },
        accountHolderName: {
          type: String,
          required: true,
          trim: true,
        },
        branchName: {
          type: String,
          trim: true,
        },
        accountType: {
          type: String,
          enum: ['savings', 'current', 'overdraft'],
          default: 'current',
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // ============================================
    // UPI DETAILS
    // ============================================
    upiDetails: [
      {
        upiId: {
          type: String,
          required: true,
          trim: true,
        },
        upiName: {
          type: String,
          trim: true,
        },
        provider: {
          type: String,
          enum: ['googlepay', 'phonepe', 'paytm', 'bhim', 'other'],
          default: 'other',
        },
        qrCode: {
          type: String,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // ============================================
    // COMPLIANCE & CERTIFICATIONS
    // ============================================
    compliance: {
      bis: {
        certified: { type: Boolean, default: false },
        certificateNumber: String,
        expiryDate: Date,
      },
      hallmarking: {
        certified: { type: Boolean, default: false },
        certificateNumber: String,
        licenseNumber: String,
        hallmarkingCenter: String,
        hallmarkingCenterId: String,
        expiryDate: Date,
      },
      iso: {
        certified: { type: Boolean, default: false },
        certificateNumber: String,
        expiryDate: Date,
      },
      fssai: {
        certified: { type: Boolean, default: false },
        licenseNumber: String,
        expiryDate: Date,
      },
    },

    // ============================================
    // WAREHOUSE/STORAGE INFO
    // ============================================
    warehouseDetails: {
      hasWarehouse: {
        type: Boolean,
        default: false,
      },
      warehouseAddress: String,
      warehouseCapacity: {
        type: Number,
        default: 0,
      },
      warehouseUnit: {
        type: String,
        enum: ['sqft', 'sqm'],
        default: 'sqft',
      },
    },

    // ============================================
    // SHOP STATISTICS
    // ============================================
    statistics: {
      totalProducts: {
        type: Number,
        default: 0,
      },
      totalInventoryValue: {
        type: Number,
        default: 0,
      },
      totalSales: {
        type: Number,
        default: 0,
      },
      totalPurchases: {
        type: Number,
        default: 0,
      },
      totalCustomers: {
        type: Number,
        default: 0,
      },
      totalSuppliers: {
        type: Number,
        default: 0,
      },
      totalStaff: {
        type: Number,
        default: 0,
      },
      lastSaleDate: {
        type: Date,
        default: null,
      },
      lastPurchaseDate: {
        type: Date,
        default: null,
      },
      averageSaleValue: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },

    // ============================================
    // FEATURES ENABLED
    // ============================================
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
      analytics: { type: Boolean, default: false },
    },

    // ============================================
    // SOCIAL MEDIA & WEBSITE
    // ============================================
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String,
      linkedin: String,
    },
    website: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
        'Invalid website URL',
      ],
    },

    // ============================================
    // SHOP STATUS
    // ============================================
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ============================================
    // TEMPORARY CLOSURE
    // ============================================
    temporaryClosure: {
      isClosed: {
        type: Boolean,
        default: false,
      },
      reason: String,
      closedFrom: Date,
      closedUntil: Date,
    },

    // ============================================
    // OPENING/CLOSING DETAILS
    // ============================================
    openingDate: {
      type: Date,
      default: Date.now,
    },
    closingDate: {
      type: Date,
      default: null,
    },

    // ============================================
    // AUDIT TRAIL
    // ============================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ============================================
    // METADATA
    // ============================================
    tags: [String],
    notes: {
      type: String,
      maxlength: 1000,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================
// jewelryShopSchema.index({ code: 1 }, { unique: true });
// jewelryShopSchema.index({ organizationId: 1 });
// jewelryShopSchema.index({ managerId: 1 });
jewelryShopSchema.index({ isActive: 1 });
jewelryShopSchema.index({ organizationId: 1, isActive: 1 });
jewelryShopSchema.index({ organizationId: 1, code: 1 }, { unique: true });
jewelryShopSchema.index({ 'address.city': 1 });
jewelryShopSchema.index({ 'address.state': 1 });
jewelryShopSchema.index({ 'address.pincode': 1 });
jewelryShopSchema.index({ 'address.location': '2dsphere' });
// jewelryShopSchema.index({ gstNumber: 1 }, { sparse: true });
jewelryShopSchema.index({ shopType: 1 });
jewelryShopSchema.index({ category: 1 });
jewelryShopSchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================
jewelryShopSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});

jewelryShopSchema.virtual('manager', {
  ref: 'User',
  localField: 'managerId',
  foreignField: '_id',
  justOne: true,
});

jewelryShopSchema.virtual('staff', {
  ref: 'UserShopAccess',
  localField: '_id',
  foreignField: 'shopId',
});

jewelryShopSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'shopId',
});

jewelryShopSchema.virtual('customers', {
  ref: 'Party',
  localField: '_id',
  foreignField: 'shopId',
  match: { partyType: 'customer' },
});

jewelryShopSchema.virtual('suppliers', {
  ref: 'Party',
  localField: '_id',
  foreignField: 'shopId',
  match: { partyType: 'supplier' },
});

jewelryShopSchema.virtual('sales', {
  ref: 'Sale',
  localField: '_id',
  foreignField: 'shopId',
});

jewelryShopSchema.virtual('purchases', {
  ref: 'Purchase',
  localField: '_id',
  foreignField: 'shopId',
});

jewelryShopSchema.virtual('fullAddress').get(function () {
  const addr = this.address;
  return `${addr.street}, ${addr.area ? addr.area + ', ' : ''}${addr.landmark ? addr.landmark + ', ' : ''}${addr.city}, ${addr.state} - ${addr.pincode}`;
});

jewelryShopSchema.virtual('isCurrentlyOpen').get(function () {
  if (this.temporaryClosure?.isClosed) return false;

  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5);

  // Check if it's a holiday
  const today = now.toISOString().split('T')[0];
  const isHoliday = this.holidays?.some(holiday => {
    const holidayDate = holiday.date.toISOString().split('T')[0];
    return holidayDate === today;
  });

  if (isHoliday) return false;

  const todayHours = this.businessHours[dayName];
  if (!todayHours?.isOpen) return false;

  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
});

// ============================================
// MIDDLEWARE
// ============================================

// Soft delete middleware
jewelryShopSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Ensure only one primary (bank, UPI, image)
jewelryShopSchema.pre('save', function (next) {
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

// ============================================
// INSTANCE METHODS
// ============================================

// Get primary bank account
jewelryShopSchema.methods.getPrimaryBank = function () {
  return this.bankDetails.find(bank => bank.isPrimary);
};

// Get active UPI
jewelryShopSchema.methods.getActiveUPI = function () {
  return this.upiDetails.filter(upi => upi.isActive);
};

// Get primary UPI
jewelryShopSchema.methods.getPrimaryUPI = function () {
  return this.upiDetails.find(upi => upi.isPrimary);
};

// Get primary image
jewelryShopSchema.methods.getPrimaryImage = function () {
  const primary = this.images.find(img => img.isPrimary);
  return primary || (this.images.length > 0 ? this.images[0] : null);
};

// Update metal rates
jewelryShopSchema.methods.updateMetalRates = function (rates, userId) {
  if (rates.gold) {
    Object.assign(this.settings.metalRates.gold, rates.gold);
    this.settings.metalRates.gold.lastUpdated = new Date();
  }
  if (rates.silver) {
    Object.assign(this.settings.metalRates.silver, rates.silver);
    this.settings.metalRates.silver.lastUpdated = new Date();
  }
  if (rates.platinum) {
    Object.assign(this.settings.metalRates.platinum, rates.platinum);
    this.settings.metalRates.platinum.lastUpdated = new Date();
  }
  this.settings.metalRates.updatedBy = userId;
  return this.save();
};

// Update gold rate
jewelryShopSchema.methods.updateGoldRate = function (rate24K, rate22K, rate18K) {
  this.settings.metalRates.gold = {
    rate24K,
    rate22K,
    rate18K,
    lastUpdated: new Date(),
  };
  return this.save();
};

// Update silver rate
jewelryShopSchema.methods.updateSilverRate = function (rate999, rate925) {
  this.settings.metalRates.silver = {
    rate999,
    rate925,
    lastUpdated: new Date(),
  };
  return this.save();
};

// Update platinum rate
jewelryShopSchema.methods.updatePlatinumRate = function (rate) {
  this.settings.metalRates.platinum = {
    rate,
    lastUpdated: new Date(),
  };
  return this.save();
};

// Generate next invoice number
jewelryShopSchema.methods.getNextInvoiceNumber = function () {
  const invoiceNumber = `${this.settings.invoicePrefix}-${String(this.settings.currentInvoiceNumber).padStart(6, '0')}`;
  this.settings.currentInvoiceNumber += 1;
  return invoiceNumber;
};

// Check if shop is open on a specific day
jewelryShopSchema.methods.isOpenOn = function (day) {
  const dayLower = day.toLowerCase();
  return this.businessHours[dayLower]?.isOpen || false;
};

// Get business hours for a specific day
jewelryShopSchema.methods.getBusinessHours = function (day) {
  const dayLower = day.toLowerCase();
  return this.businessHours[dayLower];
};

// Get today's business hours
jewelryShopSchema.methods.getTodayHours = function () {
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return this.businessHours[dayName];
};

// Update statistics
jewelryShopSchema.methods.updateStatistics = async function () {
  const Product = mongoose.model('Product');
  const Party = mongoose.model('Party');
  const UserShopAccess = mongoose.model('UserShopAccess');
  const Sale = mongoose.model('Sale');
  const Purchase = mongoose.model('Purchase');

  // Count products
  this.statistics.totalProducts = await Product.countDocuments({
    shopId: this._id,
    deletedAt: null,
  });

  // Calculate total inventory value
  const products = await Product.find({ shopId: this._id, deletedAt: null });
  this.statistics.totalInventoryValue = products.reduce(
    (sum, product) => sum + (product.sellingPrice || 0) * (product.quantity || 1),
    0
  );

  // Customer count
  this.statistics.totalCustomers = await Party.countDocuments({
    shopId: this._id,
    partyType: 'customer',
    deletedAt: null,
  });

  // Supplier count
  this.statistics.totalSuppliers = await Party.countDocuments({
    shopId: this._id,
    partyType: 'supplier',
    deletedAt: null,
  });

  // Staff count
  this.statistics.totalStaff = await UserShopAccess.countDocuments({
    shopId: this._id,
    isActive: true,
    deletedAt: null,
  });

  // Sales statistics
  const sales = await Sale.find({ shopId: this._id, status: 'completed' }).sort({ createdAt: -1 });
  this.statistics.totalSales = sales.length;
  if (sales.length > 0) {
    this.statistics.lastSaleDate = sales[0].createdAt;
    const totalSalesValue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    this.statistics.averageSaleValue = totalSalesValue / sales.length;
  }

  // Purchase statistics
  const purchases = await Purchase.find({ shopId: this._id, status: 'completed' }).sort({
    createdAt: -1,
  });
  this.statistics.totalPurchases = purchases.length;
  if (purchases.length > 0) {
    this.statistics.lastPurchaseDate = purchases[0].createdAt;
  }

  this.statistics.lastUpdated = new Date();
  return this.save();
};

// Soft delete
jewelryShopSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  this.closingDate = new Date();
  return this.save();
};

// Restore
jewelryShopSchema.methods.restore = function () {
  this.deletedAt = null;
  this.isActive = true;
  this.closingDate = null;
  return this.save();
};

// Close shop temporarily
jewelryShopSchema.methods.closeTemporarily = function (reason, from, until) {
  this.temporaryClosure = {
    isClosed: true,
    reason,
    closedFrom: from || new Date(),
    closedUntil: until,
  };
  return this.save();
};

// Reopen shop
jewelryShopSchema.methods.reopenShop = function () {
  this.temporaryClosure = {
    isClosed: false,
    reason: null,
    closedFrom: null,
    closedUntil: null,
  };
  return this.save();
};

// Check if feature is enabled
jewelryShopSchema.methods.hasFeature = function (featureName) {
  return this.features[featureName] || false;
};

// ============================================
// STATIC METHODS
// ============================================

// Generate unique shop code
jewelryShopSchema.statics.generateCode = async function (name, organizationId) {
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
jewelryShopSchema.statics.findActive = function (organizationId = null) {
  const query = { isActive: true, deletedAt: null };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

// Find by organization
jewelryShopSchema.statics.findByOrganization = function (organizationId, options = {}) {
  return this.find({
    organizationId,
    deletedAt: null,
    ...options,
  });
};

// Find by manager
jewelryShopSchema.statics.findByManager = function (managerId) {
  return this.find({
    managerId,
    isActive: true,
    deletedAt: null,
  });
};

// Find by city
jewelryShopSchema.statics.findByCity = function (city, organizationId = null) {
  const query = {
    'address.city': new RegExp(city, 'i'),
    isActive: true,
    deletedAt: null,
  };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

// Find by state
jewelryShopSchema.statics.findByState = function (state, organizationId = null) {
  const query = {
    'address.state': new RegExp(state, 'i'),
    isActive: true,
    deletedAt: null,
  };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

// Find by shop type
jewelryShopSchema.statics.findByType = function (shopType, organizationId = null) {
  const query = {
    shopType,
    isActive: true,
    deletedAt: null,
  };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

// Find by category
jewelryShopSchema.statics.findByCategory = function (category, organizationId = null) {
  const query = {
    category,
    isActive: true,
    deletedAt: null,
  };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

// Find nearby shops (geospatial query)
jewelryShopSchema.statics.findNearby = function (longitude, latitude, maxDistance = 10000) {
  return this.find({
    'address.location': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
    isActive: true,
    deletedAt: null,
  });
};

// Find deleted shops
jewelryShopSchema.statics.findDeleted = function (organizationId = null) {
  const query = { deletedAt: { $ne: null } };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query).setOptions({ includeDeleted: true });
};

// Find temporarily closed shops
jewelryShopSchema.statics.findTemporarilyClosed = function (organizationId = null) {
  const query = {
    'temporaryClosure.isClosed': true,
    deletedAt: null,
  };
  if (organizationId) query.organizationId = organizationId;
  return this.find(query);
};

export default mongoose.model('JewelryShop', jewelryShopSchema);
