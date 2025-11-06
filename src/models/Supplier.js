import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    // Multi-tenant
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelryShop',
      required: [true, 'Shop ID is required'],
      index: true,
    },

    // Supplier Code
    supplierCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    // Business Information
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },

    // Contact Person
    contactPerson: {
      firstName: {
        type: String,
        required: [true, 'Contact person name is required'],
        trim: true,
      },
      lastName: {
        type: String,
        trim: true,
      },
      designation: String,
      email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
      },
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[0-9]{10}$/, 'Invalid phone number'],
      },
      alternatePhone: {
        type: String,
        trim: true,
        match: [/^[0-9]{10}$/, 'Invalid phone number'],
      },
      whatsappNumber: {
        type: String,
        trim: true,
        match: [/^[0-9]{10}$/, 'Invalid WhatsApp number'],
      },
    },

    // Business Contact
    businessEmail: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
    },
    businessPhone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Invalid phone number'],
    },
    website: String,

    // Address
    address: {
      street: String,
      landmark: String,
      area: String,
      city: String,
      state: String,
      country: { type: String, default: 'India' },
      pincode: {
        type: String,
        match: [/^[0-9]{6}$/, 'Invalid pincode'],
      },
    },

    // Business Registration
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST'],
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN'],
    },
    tanNumber: String,
    registrationNumber: String,

    // Supplier Type & Category
    supplierType: {
      type: String,
      enum: ['manufacturer', 'wholesaler', 'distributor', 'artisan', 'importer', 'other'],
      default: 'wholesaler',
    },
    supplierCategory: {
      type: String,
      enum: [
        'gold',
        'silver',
        'diamond',
        'platinum',
        'gemstone',
        'pearls',
        'making',
        'packaging',
        'mixed',
      ],
      default: 'mixed',
    },

    // Products Supplied
    productsSupplied: [
      {
        type: String,
        trim: true,
      },
    ],
    specialization: [String],

    // Payment Terms
    paymentTerms: {
      type: String,
      enum: ['immediate', 'cod', 'net15', 'net30', 'net45', 'net60', 'custom'],
      default: 'net30',
    },
    creditPeriod: {
      type: Number,
      default: 30, // days
      min: 0,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Financial Details
    currentBalance: {
      type: Number,
      default: 0,
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDue: {
      type: Number,
      default: 0,
    },
    advancePayment: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Rating & Performance
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    qualityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    deliveryRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    priceRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    // Statistics
    statistics: {
      totalOrders: { type: Number, default: 0 },
      completedOrders: { type: Number, default: 0 },
      pendingOrders: { type: Number, default: 0 },
      cancelledOrders: { type: Number, default: 0 },
      totalPurchased: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      lastOrderDate: Date,
      firstOrderDate: Date,
      averageDeliveryTime: { type: Number, default: 0 }, // days
      onTimeDeliveryPercentage: { type: Number, default: 100 },
    },

    // Bank Details
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: {
        type: String,
        uppercase: true,
      },
      accountHolderName: String,
      branchName: String,
      accountType: {
        type: String,
        enum: ['savings', 'current', 'overdraft'],
        default: 'current',
      },
    },

    // UPI Details
    upiId: String,

    // Certifications
    certifications: [
      {
        certificationType: {
          type: String,
          enum: ['bis', 'hallmarking', 'iso', 'gemological', 'other'],
        },
        certificateNumber: String,
        issuedBy: String,
        issueDate: Date,
        expiryDate: Date,
        documentUrl: String,
      },
    ],

    // Documents
    documents: [
      {
        documentType: {
          type: String,
          enum: ['gst_certificate', 'pan_card', 'trade_license', 'contract', 'other'],
          required: true,
        },
        documentNumber: String,
        documentUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    isPreferred: {
      type: Boolean,
      default: false,
    },
    isBlacklisted: {
      type: Boolean,
      default: false,
    },
    blacklistReason: String,
    blacklistedAt: Date,

    // Notes & Tags
    notes: {
      type: String,
      maxlength: 1000,
    },
    internalNotes: String,
    tags: [String],

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
supplierSchema.index({ organizationId: 1, shopId: 1, supplierCode: 1 }, { unique: true });
supplierSchema.index({ shopId: 1, isActive: 1 });
supplierSchema.index({ supplierType: 1 });
supplierSchema.index({ supplierCategory: 1 });
supplierSchema.index({ isPreferred: 1 });

// Virtuals
supplierSchema.virtual('contactPersonName').get(function () {
  return `${this.contactPerson.firstName} ${this.contactPerson.lastName || ''}`.trim();
});

supplierSchema.virtual('purchases', {
  ref: 'Purchase',
  localField: '_id',
  foreignField: 'supplierId',
});

supplierSchema.virtual('overallRating').get(function () {
  if (!this.qualityRating || !this.deliveryRating || !this.priceRating) return null;
  return (this.qualityRating + this.deliveryRating + this.priceRating) / 3;
});

// Soft delete middleware
supplierSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Instance Methods
supplierSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

supplierSchema.methods.restore = function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

supplierSchema.methods.updateBalance = function (amount) {
  this.currentBalance += amount;
  this.totalDue = this.currentBalance < 0 ? Math.abs(this.currentBalance) : 0;
  return this.save();
};

supplierSchema.methods.blacklist = function (reason) {
  this.isBlacklisted = true;
  this.blacklistReason = reason;
  this.blacklistedAt = new Date();
  this.isActive = false;
  return this.save();
};

supplierSchema.methods.removeBlacklist = function () {
  this.isBlacklisted = false;
  this.blacklistReason = null;
  this.blacklistedAt = null;
  this.isActive = true;
  return this.save();
};

supplierSchema.methods.markAsPreferred = function () {
  this.isPreferred = true;
  return this.save();
};

supplierSchema.methods.removePreferred = function () {
  this.isPreferred = false;
  return this.save();
};

supplierSchema.methods.updateRating = function (quality, delivery, price) {
  this.qualityRating = quality;
  this.deliveryRating = delivery;
  this.priceRating = price;
  this.rating = (quality + delivery + price) / 3;
  return this.save();
};

// Static Methods
supplierSchema.statics.generateSupplierCode = async function (shopId, prefix = 'SUP') {
  let code = `${prefix}${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
  let counter = 1;

  while (await this.findOne({ shopId, supplierCode: code })) {
    code = `${prefix}${String(Math.floor(Math.random() * 100000) + counter).padStart(5, '0')}`;
    counter++;
  }

  return code;
};

supplierSchema.statics.findByShop = function (shopId, options = {}) {
  return this.find({ shopId, deletedAt: null, ...options });
};

supplierSchema.statics.findPreferred = function (shopId) {
  return this.find({ shopId, isPreferred: true, deletedAt: null, isActive: true });
};

supplierSchema.statics.findByCategory = function (shopId, category) {
  return this.find({ shopId, supplierCategory: category, deletedAt: null, isActive: true });
};

supplierSchema.statics.findByType = function (shopId, type) {
  return this.find({ shopId, supplierType: type, deletedAt: null, isActive: true });
};

supplierSchema.statics.findTopSuppliers = function (shopId, limit = 10) {
  return this.find({ shopId, deletedAt: null, isActive: true })
    .sort({ 'statistics.totalPurchased': -1 })
    .limit(limit);
};

export default mongoose.model('Supplier', supplierSchema);
