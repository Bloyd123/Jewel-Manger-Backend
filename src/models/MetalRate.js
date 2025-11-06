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

    // Rate Source
    rateSource: {
      type: String,
      enum: ['manual', 'market', 'api', 'association'],
      default: 'manual',
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

// Indexes
metalRateSchema.index({ shopId: 1, rateDate: -1 });
metalRateSchema.index({ shopId: 1, isCurrent: 1 });
metalRateSchema.index({ shopId: 1, isActive: 1 });
metalRateSchema.index({ organizationId: 1, rateDate: -1 });

// Ensure only one current rate per shop
metalRateSchema.index(
  { shopId: 1, isCurrent: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrent: true },
  }
);

// Virtuals
metalRateSchema.virtual('gold24KSpread').get(function () {
  return this.gold.gold24K.sellingRate - this.gold.gold24K.buyingRate;
});

metalRateSchema.virtual('gold22KSpread').get(function () {
  return this.gold.gold22K.sellingRate - this.gold.gold22K.buyingRate;
});

metalRateSchema.virtual('silverSpread').get(function () {
  return this.silver.pure.sellingRate - this.silver.pure.buyingRate;
});

// Pre-save middleware
metalRateSchema.pre('save', async function (next) {
  // If this is marked as current, unmark all other rates for this shop
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

  // Calculate rate changes if there's a previous rate
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
      this.changes.goldChangePercentage = (goldDiff / previousRate.gold.gold24K.sellingRate) * 100;

      // Silver change
      const silverDiff = this.silver.pure.sellingRate - previousRate.silver.pure.sellingRate;
      this.changes.silverChange = silverDiff;
      this.changes.silverChangePercentage =
        (silverDiff / previousRate.silver.pure.sellingRate) * 100;
    }
  }

  next();
});

// Soft delete middleware
metalRateSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Instance Methods
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
      '18K': this.gold.gold18K,
      '14K': this.gold.gold14K,
    };
    return purityMap[purity] || this.gold.gold24K;
  } else if (metalType === 'silver') {
    const purityMap = {
      999: this.silver.pure,
      925: this.silver.sterling925,
      pure: this.silver.pure,
      sterling: this.silver.sterling925,
    };
    return purityMap[purity] || this.silver.pure;
  } else if (metalType === 'platinum') {
    return this.platinum;
  }
  return null;
};

// Static Methods
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

export default mongoose.model('MetalRate', metalRateSchema);
