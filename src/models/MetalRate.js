import mongoose from 'mongoose';

const metalRateSchema = new mongoose.Schema(
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

    // Rate Date
    rateDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Gold Rates
    gold: {
      // 24K Gold
      gold24K: {
        buyingRate: {
          type: Number,
          required: true,
          min: 0,
        },
        sellingRate: {
          type: Number,
          required: true,
          min: 0,
        },
      },
      // 22K Gold
      gold22K: {
        buyingRate: {
          type: Number,
          required: true,
          min: 0,
        },
        sellingRate: {
          type: Number,
          required: true,
          min: 0,
        },
      },
      // 18K Gold
      gold18K: {
        buyingRate: {
          type: Number,
          default: 0,
          min: 0,
        },
        sellingRate: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
      // 14K Gold
      gold14K: {
        buyingRate: {
          type: Number,
          default: 0,
          min: 0,
        },
        sellingRate: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },

    // Silver Rates
    silver: {
      // Pure Silver
      pure: {
        buyingRate: {
          type: Number,
          required: true,
          min: 0,
        },
        sellingRate: {
          type: Number,
          required: true,
          min: 0,
        },
      },
      // 925 Silver
      sterling925: {
        buyingRate: {
          type: Number,
          default: 0,
          min: 0,
        },
        sellingRate: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },

    // Platinum Rates (optional)
    platinum: {
      buyingRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      sellingRate: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    //   NEW: Purity Percentages for Conversion Calculations
    purity: {
      gold: {
        '24K': { percentage: { type: Number, default: 100 } },
        '22K': { percentage: { type: Number, default: 91.6 } },
        '20K': { percentage: { type: Number, default: 83.3 } },
        '18K': { percentage: { type: Number, default: 75 } },
        '14K': { percentage: { type: Number, default: 58.5 } },
      },
      silver: {
        999: { percentage: { type: Number, default: 99.9 } },
        925: { percentage: { type: Number, default: 92.5 } },
        900: { percentage: { type: Number, default: 90 } },
      },
      platinum: {
        950: { percentage: { type: Number, default: 95 } },
      },
    },
    customPurities: [
      {
        metalType: String, // 'gold', 'silver', 'platinum', 'palladium'
        purityName: String, // '23K', '916', '958', 'White Gold'
        purityPercentage: Number, // 95.83, 91.6, 95.8
        buyingRate: Number,
        sellingRate: Number,
        description: String, // Optional notes
        isActive: Boolean,
      },
    ],

    //   NEW: Auto-calculated rates (system-generated for analytics)
    autoConvertedRates: {
      gold20K: {
        buyingRate: { type: Number, default: 0 },
        sellingRate: { type: Number, default: 0 },
      },
      silver900: {
        buyingRate: { type: Number, default: 0 },
        sellingRate: { type: Number, default: 0 },
      },
    },

    //   NEW: Base rates for trend analytics (highest purity)
    baseRates: {
      gold24K: { type: Number, default: 0 },
      silver999: { type: Number, default: 0 },
      platinum950: { type: Number, default: 0 },
    },

    //   NEW: Trend analytics cache (pre-computed for dashboard performance)
    trendData: {
      gold: {
        ma7: { type: Number, default: 0 }, // 7-day moving average
        ma30: { type: Number, default: 0 }, // 30-day moving average
        ma90: { type: Number, default: 0 }, // 90-day moving average
      },
      silver: {
        ma7: { type: Number, default: 0 },
        ma30: { type: Number, default: 0 },
        ma90: { type: Number, default: 0 },
      },
      platinum: {
        ma7: { type: Number, default: 0 },
        ma30: { type: Number, default: 0 },
        ma90: { type: Number, default: 0 },
      },
    },

    // Weight Unit
    weightUnit: {
      type: String,
      enum: ['gram', 'kg', 'tola'],
      default: 'gram',
    },

    // Currency
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },

    //   NEW: Supported metal types (for future extensibility)
    metalTypes: {
      type: [String],
      enum: ['gold', 'silver', 'platinum', 'palladium'],
      default: ['gold', 'silver'],
    },

    // Rate Source
    rateSource: {
      type: String,
      enum: ['manual', 'market', 'api', 'association'],
      default: 'manual',
    },

    //   NEW: Multi-shop rate synchronization
    syncSource: {
      type: String,
      enum: ['shop', 'organization'],
      default: 'shop',
      index: true,
    },
    syncedFromRateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MetalRate',
      default: null,
    },

    // Market Reference
    marketReference: {
      internationalGoldPrice: Number, // USD per ounce
      internationalSilverPrice: Number, // USD per ounce
      exchangeRate: Number, // INR per USD
      referenceSource: String,
    },

    // Rate Changes
    changes: {
      goldChange: {
        type: Number,
        default: 0,
      },
      goldChangePercentage: {
        type: Number,
        default: 0,
      },
      silverChange: {
        type: Number,
        default: 0,
      },
      silverChangePercentage: {
        type: Number,
        default: 0,
      },
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isCurrent: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Validity Period
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: null,
    },

    // Notes
    notes: {
      type: String,
      maxlength: 500,
    },
    internalNotes: String,

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

// ============================================================================
// INDEXES
// ============================================================================
metalRateSchema.index({ shopId: 1, rateDate: -1 });
metalRateSchema.index({ shopId: 1, isCurrent: 1 });
metalRateSchema.index({ shopId: 1, isActive: 1 });
metalRateSchema.index({ organizationId: 1, rateDate: -1 });

//   NEW: Organization-level indexes for multi-shop sync
metalRateSchema.index({ organizationId: 1, isCurrent: 1 });
metalRateSchema.index({ syncSource: 1, organizationId: 1 });

// Ensure only one current rate per shop
metalRateSchema.index(
  { shopId: 1, isCurrent: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrent: true },
  }
);

// ============================================================================
// VIRTUALS
// ============================================================================
metalRateSchema.virtual('gold24KSpread').get(function () {
  return this.gold.gold24K.sellingRate - this.gold.gold24K.buyingRate;
});

metalRateSchema.virtual('gold22KSpread').get(function () {
  return this.gold.gold22K.sellingRate - this.gold.gold22K.buyingRate;
});

metalRateSchema.virtual('silverSpread').get(function () {
  return this.silver.pure.sellingRate - this.silver.pure.buyingRate;
});

// ============================================================================
// PRE-SAVE MIDDLEWARE (ENHANCED)
// ============================================================================
metalRateSchema.pre('save', async function (next) {
  //   STEP 1: Auto-calculate base rates (for trend analytics)
  this.baseRates.gold24K = this.gold.gold24K.sellingRate;
  this.baseRates.silver999 = this.silver.pure.sellingRate;
  if (this.platinum?.sellingRate) {
    this.baseRates.platinum950 = this.platinum.sellingRate;
  }

  //   STEP 2: Auto-convert rates based on purity percentages
  if (this.isModified('gold.gold24K')) {
    const gold24KBuying = this.gold.gold24K.buyingRate;
    const gold24KSelling = this.gold.gold24K.sellingRate;

    // Calculate 20K rates (83.3% purity)
    this.autoConvertedRates.gold20K.buyingRate = (gold24KBuying * 83.3) / 100;
    this.autoConvertedRates.gold20K.sellingRate = (gold24KSelling * 83.3) / 100;
  }

  if (this.isModified('silver.pure')) {
    const silver999Buying = this.silver.pure.buyingRate;
    const silver999Selling = this.silver.pure.sellingRate;

    // Calculate 900 silver rates (90% purity)
    this.autoConvertedRates.silver900.buyingRate = (silver999Buying * 90) / 100;
    this.autoConvertedRates.silver900.sellingRate = (silver999Selling * 90) / 100;
  }

  //   STEP 3: Calculate moving averages if this is a new rate
  if (this.isNew) {
    try {
      // 7-day moving average
      this.trendData.gold.ma7 = await this.constructor.calculateMovingAverage(
        this.shopId,
        'gold',
        7
      );
      this.trendData.silver.ma7 = await this.constructor.calculateMovingAverage(
        this.shopId,
        'silver',
        7
      );

      // 30-day moving average
      this.trendData.gold.ma30 = await this.constructor.calculateMovingAverage(
        this.shopId,
        'gold',
        30
      );
      this.trendData.silver.ma30 = await this.constructor.calculateMovingAverage(
        this.shopId,
        'silver',
        30
      );

      // 90-day moving average
      this.trendData.gold.ma90 = await this.constructor.calculateMovingAverage(
        this.shopId,
        'gold',
        90
      );
      this.trendData.silver.ma90 = await this.constructor.calculateMovingAverage(
        this.shopId,
        'silver',
        90
      );
    } catch (error) {
      console.error('Error calculating moving averages:', error);
    }
  }

  //   STEP 4: If this is marked as current, unmark all other rates for this shop
  if (this.isCurrent) {
    await this.constructor.updateMany(
      {
        shopId: this.shopId,
        _id: { $ne: this._id },
        isCurrent: true,
      },
      {
        $set: {
          isCurrent: false,
          validUntil: new Date(),
        },
      }
    );
  }

  //   STEP 5: Calculate rate changes if there's a previous rate
  if (this.isNew) {
    const previousRate = await this.constructor
      .findOne({
        shopId: this.shopId,
        rateDate: { $lt: this.rateDate },
      })
      .sort({ rateDate: -1 });

    if (previousRate) {
      // Gold change
      const goldDiff = this.gold.gold24K.sellingRate - previousRate.gold.gold24K.sellingRate;
      this.changes.goldChange = goldDiff;
      this.changes.goldChangePercentage =
        previousRate.gold.gold24K.sellingRate !== 0
          ? (goldDiff / previousRate.gold.gold24K.sellingRate) * 100
          : 0;

      // Silver change
      const silverDiff = this.silver.pure.sellingRate - previousRate.silver.pure.sellingRate;
      this.changes.silverChange = silverDiff;
      this.changes.silverChangePercentage =
        previousRate.silver.pure.sellingRate !== 0
          ? (silverDiff / previousRate.silver.pure.sellingRate) * 100
          : 0;
    }
  }

  next();
});

// ============================================================================
// SOFT DELETE MIDDLEWARE
// ============================================================================
metalRateSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================
metalRateSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

metalRateSchema.methods.restore = function () {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

metalRateSchema.methods.makeCurrentRate = async function () {
  // Unmark all other current rates
  await this.constructor.updateMany(
    {
      shopId: this.shopId,
      _id: { $ne: this._id },
      isCurrent: true,
    },
    {
      $set: {
        isCurrent: false,
        validUntil: new Date(),
      },
    }
  );

  this.isCurrent = true;
  this.isActive = true;
  this.validFrom = new Date();
  this.validUntil = null;
  return this.save();
};

metalRateSchema.methods.deactivate = function () {
  this.isActive = false;
  this.isCurrent = false;
  this.validUntil = new Date();
  return this.save();
};

metalRateSchema.methods.getRateForPurity = function (metalType, purity) {
  if (metalType === 'gold') {
    const purityMap = {
      '24K': this.gold.gold24K,
      '22K': this.gold.gold22K,
      '20K': this.autoConvertedRates.gold20K,
      '18K': this.gold.gold18K,
      '14K': this.gold.gold14K,
    };
    return purityMap[purity] || this.gold.gold24K;
  } else if (metalType === 'silver') {
    const purityMap = {
      999: this.silver.pure,
      925: this.silver.sterling925,
      900: this.autoConvertedRates.silver900,
      pure: this.silver.pure,
      sterling: this.silver.sterling925,
    };
    return purityMap[purity] || this.silver.pure;
  } else if (metalType === 'platinum') {
    return this.platinum;
  }
  return null;
};

//   NEW: Get trend data for specific metal
metalRateSchema.methods.getTrendData = function (metalType) {
  if (metalType === 'gold') return this.trendData.gold;
  if (metalType === 'silver') return this.trendData.silver;
  if (metalType === 'platinum') return this.trendData.platinum;
  return null;
};

// ============================================================================
// STATIC METHODS (EXISTING)
// ============================================================================
metalRateSchema.statics.getCurrentRate = function (shopId) {
  return this.findOne({
    shopId,
    isCurrent: true,
    isActive: true,
    deletedAt: null,
  });
};

metalRateSchema.statics.getRateByDate = function (shopId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.findOne({
    shopId,
    rateDate: { $gte: startOfDay, $lte: endOfDay },
    deletedAt: null,
  });
};

metalRateSchema.statics.findByShop = function (shopId, options = {}) {
  return this.find({ shopId, deletedAt: null, ...options }).sort({ rateDate: -1 });
};

metalRateSchema.statics.findByDateRange = function (shopId, startDate, endDate) {
  return this.find({
    shopId,
    rateDate: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  }).sort({ rateDate: -1 });
};

metalRateSchema.statics.getLatestRates = function (shopId, limit = 10) {
  return this.find({
    shopId,
    deletedAt: null,
  })
    .sort({ rateDate: -1 })
    .limit(limit);
};

metalRateSchema.statics.getRateHistory = function (shopId, metalType, purity, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    shopId,
    rateDate: { $gte: startDate },
    deletedAt: null,
  }).sort({ rateDate: 1 });
};

metalRateSchema.statics.calculateAverageRate = async function (
  shopId,
  metalType,
  purity,
  days = 30
) {
  const history = await this.getRateHistory(shopId, metalType, purity, days);

  if (!history.length) return null;

  let totalBuying = 0;
  let totalSelling = 0;

  history.forEach(rate => {
    const rates = rate.getRateForPurity(metalType, purity);
    if (rates) {
      totalBuying += rates.buyingRate;
      totalSelling += rates.sellingRate;
    }
  });

  return {
    averageBuyingRate: totalBuying / history.length,
    averageSellingRate: totalSelling / history.length,
    samples: history.length,
  };
};

metalRateSchema.statics.getTodayRate = function (shopId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.findOne({
    shopId,
    rateDate: { $gte: today },
    deletedAt: null,
  }).sort({ rateDate: -1 });
};

metalRateSchema.statics.createOrUpdateTodayRate = async function (shopId, rateData, userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingRate = await this.findOne({
    shopId,
    rateDate: { $gte: today },
    deletedAt: null,
  });

  if (existingRate) {
    Object.assign(existingRate, rateData);
    existingRate.updatedBy = userId;
    return existingRate.save();
  }

  return this.create({
    shopId,
    organizationId: rateData.organizationId,
    ...rateData,
    rateDate: today,
    isCurrent: true,
    createdBy: userId,
  });
};

// ============================================================================
//   NEW STATIC METHODS (TREND ANALYTICS & MULTI-SHOP SYNC)
// ============================================================================

/**
 * Calculate moving average for trend analytics
 * @param {ObjectId} shopId - Shop ID
 * @param {String} metalType - 'gold' | 'silver' | 'platinum'
 * @param {Number} days - Number of days (7, 30, 90)
 * @returns {Number} Moving average value
 */
metalRateSchema.statics.calculateMovingAverage = async function (shopId, metalType, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rates = await this.find({
    shopId,
    rateDate: { $gte: startDate },
    deletedAt: null,
  }).sort({ rateDate: 1 });

  if (!rates.length) return 0;

  const field =
    metalType === 'gold' ? 'gold24K' : metalType === 'silver' ? 'silver999' : 'platinum950';

  const sum = rates.reduce((acc, rate) => {
    const value = rate.baseRates?.[field] || 0;
    return acc + value;
  }, 0);

  return sum / rates.length;
};

/**
 * Get trend data for dashboard charts
 * @param {ObjectId} shopId - Shop ID
 * @param {String} metalType - 'gold' | 'silver' | 'platinum'
 * @param {Number} days - Historical days to fetch
 * @returns {Array} Array of {date, rate, ma7, ma30, ma90}
 */
metalRateSchema.statics.getTrendChartData = async function (shopId, metalType = 'gold', days = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rates = await this.find({
    shopId,
    rateDate: { $gte: startDate },
    deletedAt: null,
  })
    .sort({ rateDate: 1 })
    .select('rateDate baseRates trendData');

  const field =
    metalType === 'gold' ? 'gold24K' : metalType === 'silver' ? 'silver999' : 'platinum950';

  return rates.map(rate => ({
    date: rate.rateDate,
    rate: rate.baseRates?.[field] || 0,
    ma7: rate.trendData?.[metalType]?.ma7 || 0,
    ma30: rate.trendData?.[metalType]?.ma30 || 0,
    ma90: rate.trendData?.[metalType]?.ma90 || 0,
  }));
};

/**
 * Sync rate from organization to all shops
 * @param {ObjectId} organizationId - Organization ID
 * @param {Object} masterRateData - Master rate data to sync
 * @param {ObjectId} userId - User performing the sync
 * @returns {Promise<Array>} Array of created shop rates
 */
metalRateSchema.statics.syncToAllShops = async function (organizationId, masterRateData, userId) {
  const JewelryShop = mongoose.model('JewelryShop');

  const shops = await JewelryShop.find({
    organizationId,
    deletedAt: null,
    isActive: true,
  });

  if (!shops.length) {
    throw new Error('No active shops found for this organization');
  }

  const syncPromises = shops.map(async shop => {
    return this.createOrUpdateTodayRate(
      shop._id,
      {
        ...masterRateData,
        organizationId,
        syncSource: 'organization',
        syncedFromRateId: masterRateData._id || null,
      },
      userId
    );
  });

  return Promise.all(syncPromises);
};

/**
 * Get organization-wide current rate (master rate)
 * @param {ObjectId} organizationId - Organization ID
 * @returns {Promise<Object>} Current organization rate
 */
metalRateSchema.statics.getOrganizationRate = function (organizationId) {
  return this.findOne({
    organizationId,
    syncSource: 'organization',
    isCurrent: true,
    deletedAt: null,
  });
};

/**
 * Recalculate all moving averages for a shop (maintenance task)
 * @param {ObjectId} shopId - Shop ID
 * @returns {Promise<Number>} Number of rates updated
 */
metalRateSchema.statics.recalculateTrendData = async function (shopId) {
  const rates = await this.find({
    shopId,
    deletedAt: null,
  }).sort({ rateDate: 1 });

  let updatedCount = 0;

  for (const rate of rates) {
    // Calculate moving averages
    rate.trendData.gold.ma7 = await this.calculateMovingAverage(shopId, 'gold', 7);
    rate.trendData.gold.ma30 = await this.calculateMovingAverage(shopId, 'gold', 30);
    rate.trendData.gold.ma90 = await this.calculateMovingAverage(shopId, 'gold', 90);

    rate.trendData.silver.ma7 = await this.calculateMovingAverage(shopId, 'silver', 7);
    rate.trendData.silver.ma30 = await this.calculateMovingAverage(shopId, 'silver', 30);
    rate.trendData.silver.ma90 = await this.calculateMovingAverage(shopId, 'silver', 90);

    await rate.save({ validateBeforeSave: false });
    updatedCount++;
  }

  return updatedCount;
};

/**
 * Get rate comparison between two dates
 * @param {ObjectId} shopId - Shop ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Rate comparison data
 */
metalRateSchema.statics.getRateComparison = async function (shopId, startDate, endDate) {
  const startRate = await this.getRateByDate(shopId, startDate);
  const endRate = await this.getRateByDate(shopId, endDate);

  if (!startRate || !endRate) {
    return null;
  }

  return {
    gold24K: {
      start: startRate.gold.gold24K.sellingRate,
      end: endRate.gold.gold24K.sellingRate,
      change: endRate.gold.gold24K.sellingRate - startRate.gold.gold24K.sellingRate,
      changePercentage:
        ((endRate.gold.gold24K.sellingRate - startRate.gold.gold24K.sellingRate) /
          startRate.gold.gold24K.sellingRate) *
        100,
    },
    silver999: {
      start: startRate.silver.pure.sellingRate,
      end: endRate.silver.pure.sellingRate,
      change: endRate.silver.pure.sellingRate - startRate.silver.pure.sellingRate,
      changePercentage:
        ((endRate.silver.pure.sellingRate - startRate.silver.pure.sellingRate) /
          startRate.silver.pure.sellingRate) *
        100,
    },
  };
};

export default mongoose.model('MetalRate', metalRateSchema);
