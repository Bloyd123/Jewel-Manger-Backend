import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
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

    // Product Identification
    productCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      index: true,
    },
    huid: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      index: true,
    },

    // Basic Information
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // Category & Type (Now using ObjectId references)
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    productType: {
      type: String,
      enum: ['ready_made', 'custom_made', 'on_order', 'repair', 'exchange'],
      default: 'ready_made',
      index: true,
    },

    // Metal Details
    metal: {
      type: {
        type: String,
        enum: ['gold', 'silver', 'platinum', 'diamond', 'gemstone', 'mixed'],
        required: true,
        index: true,
      },
      purity: {
        type: String,
        enum: ['24K', '22K', '18K', '14K', '10K', '916', '999', '925', '850', '950', 'other'],
        required: true,
      },
      purityPercentage: {
        type: Number,
        min: 0,
        max: 100,
      },
      color: {
        type: String,
        enum: ['yellow', 'white', 'rose', 'mixed'],
        default: 'yellow',
      },
    },

    // Weight Details
    weight: {
      grossWeight: {
        type: Number,
        required: [true, 'Gross weight is required'],
        min: 0,
      },
      stoneWeight: {
        type: Number,
        default: 0,
        min: 0,
      },
      netWeight: {
        type: Number,
        min: 0,
      },
      wastage: {
        percentage: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        weight: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      unit: {
        type: String,
        enum: ['gram', 'kg', 'tola', 'ounce', 'carat'],
        default: 'gram',
      },
    },

    // Stones/Diamonds Details
    stones: [
      {
        stoneType: {
          type: String,
          enum: [
            'diamond',
            'ruby',
            'emerald',
            'sapphire',
            'pearl',
            'topaz',
            'amethyst',
            'garnet',
            'other',
          ],
          required: true,
        },
        stoneName: String,
        stoneQuality: {
          type: String,
          enum: ['VS', 'VVS', 'SI', 'IF', 'FL', 'A', 'AA', 'AAA', 'B', 'C'],
          default: null,
        },
        stoneColor: String,
        stoneShape: {
          type: String,
          enum: [
            'round',
            'oval',
            'square',
            'rectangular',
            'pear',
            'marquise',
            'heart',
            'emerald_cut',
            'other',
          ],
        },
        stoneCut: {
          type: String,
          enum: ['excellent', 'very_good', 'good', 'fair', 'poor'],
        },
        stoneClarity: String,
        caratWeight: {
          type: Number,
          min: 0,
        },
        stoneWeight: {
          type: Number,
          min: 0,
        },
        pieceCount: {
          type: Number,
          default: 1,
          min: 0,
        },
        stonePrice: {
          type: Number,
          default: 0,
          min: 0,
        },
        totalStonePrice: {
          type: Number,
          default: 0,
          min: 0,
        },
        stoneCertificate: {
          certificateNumber: String,
          certificateUrl: String,
          issuedBy: String,
        },
      },
    ],

    // Making/Labor Charges
    makingCharges: {
      type: {
        type: String,
        enum: ['per_gram', 'percentage', 'flat', 'none'],
        default: 'per_gram',
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Pricing
    pricing: {
      metalRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      metalValue: {
        type: Number,
        default: 0,
        min: 0,
      },
      stoneValue: {
        type: Number,
        default: 0,
        min: 0,
      },
      makingCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      otherCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      subtotal: {
        type: Number,
        default: 0,
        min: 0,
      },
      gst: {
        percentage: {
          type: Number,
          default: 3,
          min: 0,
        },
        amount: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      totalPrice: {
        type: Number,
        default: 0,
        min: 0,
      },
      costPrice: {
        type: Number,
        default: 0,
        min: 0,
      },
      sellingPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      mrp: {
        type: Number,
        default: 0,
        min: 0,
      },
      discount: {
        type: {
          type: String,
          enum: ['percentage', 'flat', 'none'],
          default: 'none',
        },
        value: {
          type: Number,
          default: 0,
          min: 0,
        },
        amount: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },

    // Size & Dimensions
    size: {
      value: String,
      unit: {
        type: String,
        enum: ['mm', 'cm', 'inch'],
        default: 'mm',
      },
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ['mm', 'cm', 'inch'],
        default: 'mm',
      },
    },

    // Hallmarking Details
    hallmarking: {
      isHallmarked: {
        type: Boolean,
        default: false,
      },
      hallmarkNumber: String,
      hallmarkingCenter: String,
      bisLicenseNumber: String,
      huid: String,
      hallmarkDate: Date,
    },

    // Stock/Inventory
    stock: {
      quantity: {
        type: Number,
        default: 1,
        min: 0,
      },
      unit: {
        type: String,
        enum: ['piece', 'pair', 'set', 'gram', 'kg'],
        default: 'piece',
      },
      minStockLevel: {
        type: Number,
        default: 0,
        min: 0,
      },
      maxStockLevel: {
        type: Number,
        default: 0,
        min: 0,
      },
      reorderLevel: {
        type: Number,
        default: 0,
        min: 0,
      },
      location: {
        warehouse: String,
        rack: String,
        shelf: String,
        bin: String,
      },
    },

    // Supplier Information
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      index: true,
    },
    supplierDetails: {
      supplierName: String,
      supplierCode: String,
      purchaseDate: Date,
      purchasePrice: Number,
      invoiceNumber: String,
    },

    // Images
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
        caption: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    primaryImage: String,

    // Gender & Occasion
    gender: {
      type: String,
      enum: ['male', 'female', 'unisex', 'kids'],
      default: 'unisex',
    },
    occasion: [
      {
        type: String,
        enum: [
          'wedding',
          'engagement',
          'party',
          'daily_wear',
          'festival',
          'gift',
          'bridal',
          'traditional',
          'modern',
          'casual',
        ],
      },
    ],

    // Design Details
    design: {
      designNumber: String,
      designer: String,
      collection: String,
      style: {
        type: String,
        enum: ['traditional', 'modern', 'antique', 'contemporary', 'ethnic', 'western'],
      },
      pattern: String,
    },

    // Warranty & Certificate
    warranty: {
      hasWarranty: {
        type: Boolean,
        default: false,
      },
      warrantyPeriod: {
        type: Number,
        default: 0, // in months
      },
      warrantyType: {
        type: String,
        enum: ['lifetime', 'limited', 'none'],
        default: 'none',
      },
      warrantyTerms: String,
    },
    certificates: [
      {
        certificateType: {
          type: String,
          enum: ['hallmark', 'diamond', 'gemstone', 'purity', 'authenticity', 'other'],
        },
        certificateNumber: String,
        issuedBy: String,
        issueDate: Date,
        expiryDate: Date,
        certificateUrl: String,
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['in_stock', 'out_of_stock', 'low_stock', 'on_order', 'discontinued', 'sold'],
      default: 'in_stock',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },

    // Sale Status
    saleStatus: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'on_hold', 'returned'],
      default: 'available',
      index: true,
    },
    soldDate: Date,
    soldTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    reservedFor: {
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
      },
      reservedDate: Date,
      expiryDate: Date,
    },

    // Tags & Search
    tags: [String],
    keywords: [String],
    searchTerms: String,

    // Custom Fields
    customFields: [
      {
        fieldName: String,
        fieldValue: mongoose.Schema.Types.Mixed,
      },
    ],
    // Additioanly
    lifecycleHistory: [
      {
        action: String, // created, reserved, sold, returned, repaired, transferred
        fromShop: mongoose.ObjectId,
        toShop: mongoose.ObjectId,
        user: mongoose.ObjectId,
        date: { type: Date, default: Date.now },
        notes: String,
      },
    ],
    repair: {
      status: { type: String, enum: ['none', 'sent', 'in_progress', 'completed'], default: 'none' },
      sentAt: Date,
      completedAt: Date,
      repairNotes: String,
    },
    returnDetails: {
      returnedAt: Date,
      reason: String,
      refundAmount: Number,
    },
    // Notes
    notes: {
      type: String,
      maxlength: 1000,
    },
    internalNotes: String,

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
productSchema.index({ organizationId: 1, shopId: 1, productCode: 1 }, { unique: true });
productSchema.index({ shopId: 1, status: 1 });
productSchema.index({ shopId: 1, categoryId: 1 });
productSchema.index({ shopId: 1, 'metal.type': 1 });
productSchema.index({ barcode: 1 }, { sparse: true });
productSchema.index({ huid: 1 }, { sparse: true });
productSchema.index({ sku: 1 }, { sparse: true });
productSchema.index({ name: 'text', tags: 'text', keywords: 'text' });
productSchema.index({ saleStatus: 1 });
productSchema.index({ isActive: 1 });

// Ensure only one primary image
productSchema.pre('save', function (next) {
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

    // Set primary image URL
    const primary = this.images.find(img => img.isPrimary);
    if (primary) {
      this.primaryImage = primary.url;
    }
  }

  // Calculate net weight
  const gross = Number(this.weight?.grossWeight) || 0;
  const stone = Number(this.weight?.stoneWeight) || 0;
  this.weight.netWeight = Math.max(0, gross - stone);

  // Calculate total stone value
  if (this.stones && this.stones.length > 0) {
    this.pricing = this.pricing || {};

    this.pricing.stoneValue = Array.isArray(this.stones)
      ? this.stones.reduce((sum, s) => sum + (s.totalStonePrice || 0), 0)
      : 0;
  }

  next();
});

// Soft delete middleware
productSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Virtuals
productSchema.virtual('profitMargin').get(function () {
  if (this.pricing.costPrice > 0) {
    return ((this.pricing.sellingPrice - this.pricing.costPrice) / this.pricing.costPrice) * 100;
  }
  return 0;
});

productSchema.virtual('isLowStock').get(function () {
  return this.stock.quantity <= this.stock.reorderLevel;
});

productSchema.virtual('isOutOfStock').get(function () {
  return this.stock.quantity === 0;
});

productSchema.virtual('totalStoneCount').get(function () {
  if (!this.stones || this.stones.length === 0) return 0;
  return this.stones.reduce((sum, stone) => sum + (stone.pieceCount || 0), 0);
});

// Instance Methods
productSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

productSchema.methods.restore = function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

productSchema.methods.updateStock = function (quantity, operation = 'add') {
  if (operation === 'add') {
    this.stock.quantity += quantity;
  } else if (operation === 'subtract') {
    this.stock.quantity -= quantity;
    if (this.stock.quantity < 0) this.stock.quantity = 0;
  } else {
    this.stock.quantity = quantity;
  }

  // Update status based on stock
  if (this.stock.quantity === 0) {
    this.status = 'out_of_stock';
  } else if (this.stock.quantity <= this.stock.reorderLevel) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }

  return this.save();
};

productSchema.methods.markAsSold = function (customerId) {
  this.saleStatus = 'sold';
  this.soldDate = new Date();
  this.soldTo = customerId;
  this.stock.quantity = Math.max(0, this.stock.quantity - 1);
  return this.save();
};

productSchema.methods.reserveProduct = function (customerId, days = 7) {
  this.saleStatus = 'reserved';
  this.reservedFor = {
    customerId,
    reservedDate: new Date(),
    expiryDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  };
  return this.save();
};

productSchema.methods.cancelReservation = function () {
  this.saleStatus = 'available';
  this.reservedFor = undefined;
  return this.save();
};

productSchema.methods.calculatePrice = function (metalRate) {
  // Calculate metal value
  this.pricing.metalRate = metalRate;
  this.pricing.metalValue = this.weight.netWeight * metalRate;

  // Calculate making charges
  if (this.makingCharges.type === 'per_gram') {
    this.makingCharges.amount = this.weight.netWeight * this.makingCharges.value;
  } else if (this.makingCharges.type === 'percentage') {
    this.makingCharges.amount = (this.pricing.metalValue * this.makingCharges.value) / 100;
  } else if (this.makingCharges.type === 'flat') {
    this.makingCharges.amount = this.makingCharges.value;
  }

  this.pricing.makingCharges = this.makingCharges.amount;

  // Calculate subtotal
  this.pricing.subtotal =
    this.pricing.metalValue +
    this.pricing.stoneValue +
    this.pricing.makingCharges +
    this.pricing.otherCharges;

  // Calculate GST
  this.pricing.gst.amount = (this.pricing.subtotal * this.pricing.gst.percentage) / 100;

  // Calculate total
  this.pricing.totalPrice = this.pricing.subtotal + this.pricing.gst.amount;
  this.pricing.sellingPrice = this.pricing.totalPrice;

  // Apply discount
  if (this.pricing.discount.type === 'percentage') {
    this.pricing.discount.amount = (this.pricing.totalPrice * this.pricing.discount.value) / 100;
    this.pricing.sellingPrice = this.pricing.totalPrice - this.pricing.discount.amount;
  } else if (this.pricing.discount.type === 'flat') {
    this.pricing.discount.amount = this.pricing.discount.value;
    this.pricing.sellingPrice = this.pricing.totalPrice - this.pricing.discount.amount;
  }

  return this.save();
};

productSchema.statics.generateProductCode = async function (shopId, prefix = 'PRD') {
  let attempts = 0;

  while (attempts < 5) {
    // Step 1: get last created product for this shop
    const lastProduct = await this.findOne({ shopId })
      .sort({ createdAt: -1 })
      .select('productCode')
      .lean();

    // Step 2: Extract number
    const lastNumber = lastProduct ? parseInt(lastProduct.productCode.replace(prefix, '')) || 0 : 0;

    // Step 3: next number
    const newNumber = lastNumber + 1 + attempts;

    // Step 4: format
    const code = `${prefix}${String(newNumber).padStart(6, '0')}`;

    // Step 5: ensure not duplicate
    const exists = await this.findOne({ shopId, productCode: code });
    if (!exists) return code;

    attempts++;
  }

  // Step 6: FINAL fallback (never fails)
  return `${prefix}${Date.now().toString().slice(-6)}`;
};

productSchema.statics.findByShop = function (shopId, options = {}) {
  return this.find({ shopId, deletedAt: null, ...options });
};

productSchema.statics.findByCategory = function (shopId, categoryId) {
  return this.find({ shopId, categoryId, deletedAt: null, isActive: true });
};

productSchema.statics.findByMetal = function (shopId, metalType) {
  return this.find({ shopId, 'metal.type': metalType, deletedAt: null, isActive: true });
};

productSchema.statics.findLowStock = function (shopId) {
  return this.find({
    shopId,
    deletedAt: null,
    isActive: true,
    status: 'low_stock',
  });
};

productSchema.statics.findOutOfStock = function (shopId) {
  return this.find({
    shopId,
    deletedAt: null,
    isActive: true,
    status: 'out_of_stock',
  });
};

productSchema.statics.findAvailableForSale = function (shopId) {
  return this.find({
    shopId,
    deletedAt: null,
    isActive: true,
    saleStatus: 'available',
    status: { $in: ['in_stock', 'low_stock'] },
  });
};

productSchema.statics.searchProducts = function (shopId, searchTerm) {
  return this.find({
    shopId,
    deletedAt: null,
    isActive: true,
    $or: [
      { name: new RegExp(searchTerm, 'i') },
      { productCode: new RegExp(searchTerm, 'i') },
      { barcode: new RegExp(searchTerm, 'i') },
      { tags: new RegExp(searchTerm, 'i') },
    ],
  });
};

export default mongoose.model('Product', productSchema);
