import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema(
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

    // Product Reference
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true,
    },
    productCode: {
      type: String,
      required: true,
      index: true,
    },

    // Transaction Details
    transactionType: {
      type: String,
      enum: [
        'IN',           // Stock added
        'OUT',          // Stock reduced
        'ADJUSTMENT',   // Manual adjustment
        'SALE',         // Product sold
        'PURCHASE',     // Product purchased
        'RETURN',       // Product returned
        'TRANSFER_IN',  // Transferred from another shop
        'TRANSFER_OUT', // Transferred to another shop
        'DAMAGE',       // Damaged/lost
        'RESERVED',     // Reserved for customer
        'UNRESERVED',   // Reservation cancelled
      ],
      required: true,
      index: true,
    },

    // Quantity
    quantity: {
      type: Number,
      required: true,
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    newQuantity: {
      type: Number,
      required: true,
    },

    // Transaction Date
    transactionDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },

    // Reference Documents
    referenceType: {
      type: String,
      enum: [
        'product_creation',
        'sale',
        'purchase',
        'return',
        'manual_adjustment',
        'transfer',
        'damage',
        'reservation',
        'stock_update',
      ],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },

    // Transfer Details (if applicable)
    transferDetails: {
      fromShopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JewelryShop',
      },
      toShopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JewelryShop',
      },
      transferDate: Date,
      receivedDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_transit', 'received', 'cancelled'],
      },
    },

    // Financial Impact
    value: {
      type: Number,
      default: 0,
      min: 0,
    },

    // User & Tracking
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Soft Delete
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
inventoryTransactionSchema.index({ productId: 1, transactionDate: -1 });
inventoryTransactionSchema.index({ shopId: 1, transactionType: 1 });
inventoryTransactionSchema.index({ organizationId: 1, transactionDate: -1 });
inventoryTransactionSchema.index({ performedBy: 1 });
inventoryTransactionSchema.index({ referenceType: 1, referenceId: 1 });

// ============================================
// VIRTUALS
// ============================================
inventoryTransactionSchema.virtual('quantityChange').get(function () {
  return this.newQuantity - this.previousQuantity;
});

inventoryTransactionSchema.virtual('isInbound').get(function () {
  return ['IN', 'PURCHASE', 'RETURN', 'TRANSFER_IN', 'UNRESERVED'].includes(
    this.transactionType
  );
});

inventoryTransactionSchema.virtual('isOutbound').get(function () {
  return ['OUT', 'SALE', 'TRANSFER_OUT', 'DAMAGE', 'RESERVED'].includes(this.transactionType);
});

// ============================================
// MIDDLEWARE
// ============================================
inventoryTransactionSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// ============================================
// INSTANCE METHODS
// ============================================
inventoryTransactionSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

inventoryTransactionSchema.methods.restore = function () {
  this.deletedAt = null;
  return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

// Get transaction history for a product
inventoryTransactionSchema.statics.getProductHistory = function (productId, limit = 50) {
  return this.find({ productId, deletedAt: null })
    .sort({ transactionDate: -1 })
    .limit(limit)
    .populate('performedBy', 'firstName lastName email')
    .lean();
};

// Get transactions by shop and date range
inventoryTransactionSchema.statics.getByDateRange = function (shopId, startDate, endDate) {
  return this.find({
    shopId,
    transactionDate: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  })
    .sort({ transactionDate: -1 })
    .populate('productId', 'name productCode category')
    .populate('performedBy', 'firstName lastName')
    .lean();
};

// Get transactions by type
inventoryTransactionSchema.statics.getByType = function (shopId, transactionType, limit = 100) {
  return this.find({
    shopId,
    transactionType,
    deletedAt: null,
  })
    .sort({ transactionDate: -1 })
    .limit(limit)
    .populate('productId', 'name productCode')
    .populate('performedBy', 'firstName lastName')
    .lean();
};

// Get inbound transactions (stock additions)
inventoryTransactionSchema.statics.getInboundTransactions = function (shopId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    shopId,
    transactionType: { $in: ['IN', 'PURCHASE', 'RETURN', 'TRANSFER_IN', 'UNRESERVED'] },
    transactionDate: { $gte: startDate },
    deletedAt: null,
  })
    .sort({ transactionDate: -1 })
    .populate('productId', 'name productCode')
    .lean();
};

// Get outbound transactions (stock reductions)
inventoryTransactionSchema.statics.getOutboundTransactions = function (shopId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    shopId,
    transactionType: { $in: ['OUT', 'SALE', 'TRANSFER_OUT', 'DAMAGE', 'RESERVED'] },
    transactionDate: { $gte: startDate },
    deletedAt: null,
  })
    .sort({ transactionDate: -1 })
    .populate('productId', 'name productCode')
    .lean();
};

// Get stock adjustments
inventoryTransactionSchema.statics.getAdjustments = function (shopId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    shopId,
    transactionType: 'ADJUSTMENT',
    transactionDate: { $gte: startDate },
    deletedAt: null,
  })
    .sort({ transactionDate: -1 })
    .populate('productId', 'name productCode')
    .populate('performedBy', 'firstName lastName')
    .lean();
};

// Get user's transaction history
inventoryTransactionSchema.statics.getUserTransactions = function (
  userId,
  shopId = null,
  limit = 100
) {
  const query = {
    performedBy: userId,
    deletedAt: null,
  };

  if (shopId) query.shopId = shopId;

  return this.find(query)
    .sort({ transactionDate: -1 })
    .limit(limit)
    .populate('productId', 'name productCode')
    .lean();
};

// Get stock movement summary
inventoryTransactionSchema.statics.getMovementSummary = async function (shopId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await this.aggregate([
    {
      $match: {
        shopId: mongoose.Types.ObjectId(shopId),
        transactionDate: { $gte: startDate },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: '$transactionType',
        count: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: '$value' },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  return summary;
};

export default mongoose.model('InventoryTransaction', inventoryTransactionSchema);