import mongoose from 'mongoose';

const metalLedgerSchema = new mongoose.Schema(
  {
    // ─── Multi-tenant ───────────────────────────────────────────
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

    // ─── Party Info ─────────────────────────────────────────────
    partyType: {
      type: String,
      enum: ['customer', 'supplier'],
      required: [true, 'Party type is required'],
      index: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Party ID is required'],
      refPath: 'partyModel',
      index: true,
    },
    partyModel: {
      type: String,
      enum: ['Customer', 'Supplier'],
      required: true,
    },
    partyName: {
      type: String,
      required: true,
      trim: true,
    },

    // ─── Metal Info ─────────────────────────────────────────────
    metalType: {
      type: String,
      enum: ['gold', 'silver', 'platinum'],
      required: [true, 'Metal type is required'],
      index: true,
    },

    // ─── Entry Type ─────────────────────────────────────────────
    // given    = humne party ko metal diya (hamare paas se gaya)
    // received = party ne humhe metal diya (hamare paas aaya)
    // settled  = metal ka hisaab cash me ho gaya
    entryType: {
      type: String,
      enum: ['given', 'received', 'settled', 'opening_balance', 'adjustment'],
      required: [true, 'Entry type is required'],
      index: true,
    },

    // ─── Weight Details ─────────────────────────────────────────
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [0.001, 'Weight must be greater than 0'],
    },
    weightUnit: {
      type: String,
      enum: ['gram', 'tola', 'kg'],
      default: 'gram',
    },

    // ─── Rate Details ────────────────────────────────────────────
    // rateAtEntry = jab entry hui tab ka rate (optional - sirf reference ke liye)
    rateAtEntry: {
      type: Number,
      default: null,
      min: 0,
    },

    // ─── Settlement Details ──────────────────────────────────────
    // Jab metal ka hisaab cash me hota hai
    settlement: {
      settledWeight:   { type: Number, default: 0, min: 0 },
      rateAtSettlement: { type: Number, default: 0, min: 0 },
      settledAmount:   { type: Number, default: 0, min: 0 },
      settlementDate:  { type: Date, default: null },
      settlementMode:  {
        type: String,
        enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'metal_exchange', null],
        default: null,
      },
    },

    // ─── Pending Tracking ───────────────────────────────────────
    pendingWeight: {
      type: Number,
      default: 0,
      min: 0,
      // Auto calculated: weight - settlement.settledWeight
    },

    // ─── Status ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'partial', 'settled', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // ─── Reference ──────────────────────────────────────────────
    referenceType: {
      type: String,
      enum: [
        'purchase',
        'sale',
        'payment',
        'opening_balance',
        'manual',
        'adjustment',
      ],
      required: true,
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: null,
    },

    // ─── Direction ──────────────────────────────────────────────
    // we_owe  = hamare upar party ka metal pending hai (hum denge)
    // they_owe = party ke upar hamar metal pending hai (woh denge)
    direction: {
      type: String,
      enum: ['we_owe', 'they_owe'],
      required: true,
    },

    // ─── Notes ──────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // ─── Audit ──────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ────────────────────────────────────────────────────
metalLedgerSchema.index({ shopId: 1, partyId: 1, metalType: 1 });
metalLedgerSchema.index({ shopId: 1, status: 1 });
metalLedgerSchema.index({ shopId: 1, partyType: 1, metalType: 1 });
metalLedgerSchema.index({ organizationId: 1, shopId: 1, createdAt: -1 });

// ─── PRE-SAVE ────────────────────────────────────────────────────
metalLedgerSchema.pre('save', function (next) {
  // pendingWeight auto calculate karo
  const settled      = this.settlement?.settledWeight || 0;
  this.pendingWeight = Math.max(0, this.weight - settled);

  // Status auto update karo
  if (this.pendingWeight === 0) {
    this.status = 'settled';
  } else if (settled > 0 && this.pendingWeight > 0) {
    this.status = 'partial';
  } else {
    this.status = 'pending';
  }

  next();
});

// ─── SOFT DELETE ─────────────────────────────────────────────────
metalLedgerSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// ─── VIRTUALS ────────────────────────────────────────────────────
metalLedgerSchema.virtual('pendingValue').get(function () {
  // Approximate value at entry rate
  if (this.rateAtEntry && this.pendingWeight) {
    return this.pendingWeight * this.rateAtEntry;
  }
  return 0;
});

// ─── INSTANCE METHODS ────────────────────────────────────────────

// Metal settle karo - cash me convert
metalLedgerSchema.methods.settle = async function (
  settleWeight,
  rateAtSettlement,
  settlementMode = 'cash',
  userId
) {
  const alreadySettled = this.settlement?.settledWeight || 0;
  const newSettled     = alreadySettled + settleWeight;

  if (newSettled > this.weight) {
    throw new Error(
      `Cannot settle ${settleWeight}g. Only ${this.pendingWeight}g is pending.`
    );
  }

  this.settlement.settledWeight    = newSettled;
  this.settlement.rateAtSettlement = rateAtSettlement;
  this.settlement.settledAmount    =
    (this.settlement.settledAmount || 0) + settleWeight * rateAtSettlement;
  this.settlement.settlementDate   = new Date();
  this.settlement.settlementMode   = settlementMode;
  this.updatedBy                   = userId;

  return this.save();
};

// Partial settlement
metalLedgerSchema.methods.partialSettle = async function (
  weight,
  rate,
  mode,
  userId
) {
  return this.settle(weight, rate, mode, userId);
};

// Soft delete
metalLedgerSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

// ─── STATIC METHODS ──────────────────────────────────────────────

// Party ka total pending weight nikalo
metalLedgerSchema.statics.getPartyMetalBalance = async function (
  shopId,
  partyId,
  metalType = null
) {
  const match = {
    shopId,
    partyId,
    status:    { $in: ['pending', 'partial'] },
    deletedAt: null,
  };
  if (metalType) match.metalType = metalType;

  const entries = await this.find(match);

  const balance = { gold: 0, silver: 0, platinum: 0 };

  entries.forEach(entry => {
    const pending = entry.pendingWeight;
    // we_owe  = positive (hamare upar hai)
    // they_owe = negative (unke upar hai)
    const amount = entry.direction === 'we_owe' ? pending : -pending;
    balance[entry.metalType] += amount;
  });

  return metalType ? balance[metalType] : balance;
};

// Shop ka total pending nikalo
metalLedgerSchema.statics.getShopMetalSummary = async function (shopId) {
  const result = await this.aggregate([
    {
      $match: {
        shopId:    new mongoose.Types.ObjectId(shopId),
        status:    { $in: ['pending', 'partial'] },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: {
          metalType: '$metalType',
          direction: '$direction',
          partyType: '$partyType',
        },
        totalPendingWeight: { $sum: '$pendingWeight' },
        count:              { $sum: 1 },
      },
    },
  ]);

  return result;
};

// Party ki saari metal entries
metalLedgerSchema.statics.getPartyHistory = function (
  shopId,
  partyId,
  metalType = null,
  limit = 50
) {
  const query = { shopId, partyId, deletedAt: null };
  if (metalType) query.metalType = metalType;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

export default mongoose.model('MetalLedger', metalLedgerSchema);