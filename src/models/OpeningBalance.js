import mongoose from 'mongoose';

const openingBalanceSchema = new mongoose.Schema(
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
      unique: true, // Ek shop ka sirf ek opening balance hoga
      index: true,
    },

    // ─── Opening Date ────────────────────────────────────────────
    // Jis date se system start ho raha hai
    openingDate: {
      type: Date,
      required: [true, 'Opening date is required'],
    },

    // ─── Status ─────────────────────────────────────────────────
    // draft     = abhi fill kar rahe hain
    // confirmed = lock ho gaya, sirf adjustment se change hoga
    status: {
      type: String,
      enum: ['draft', 'confirmed'],
      default: 'draft',
      index: true,
    },

    // ─── Cash / Bank Opening Balance ─────────────────────────────
    cashBalance: {
      // Cash drawer
      cash: {
        type: Number,
        default: 0,
        min: 0,
      },
      // Bank accounts
      bank: [
        {
          bankName:      { type: String, trim: true },
          accountNumber: { type: String, trim: true },
          balance:       { type: Number, default: 0, min: 0 },
        },
      ],
      totalCash:  { type: Number, default: 0, min: 0 },
      totalBank:  { type: Number, default: 0, min: 0 },
      totalCashAndBank: { type: Number, default: 0, min: 0 },
    },

    // ─── Party Cash Balances ─────────────────────────────────────
    // Customers aur Suppliers ke against jo cash pending hai
    partyBalances: [
      {
        partyType: {
          type: String,
          enum: ['customer', 'supplier'],
          required: true,
        },
        partyId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: 'partyBalances.partyModel',
        },
        partyModel: {
          type: String,
          enum: ['Customer', 'Supplier'],
          required: true,
        },
        partyName: { type: String, trim: true },

        // direction:
        // we_owe   = hamare upar unka paisa pending (hum denge)
        // they_owe = unke upar hamar paisa pending (woh denge)
        direction: {
          type: String,
          enum: ['we_owe', 'they_owe'],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        notes: { type: String, trim: true },
        // Ledger entry ID - confirm hone pe create hogi
        ledgerEntryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'LedgerEntry',
          default: null,
        },
      },
    ],

    // ─── Party Metal Balances ────────────────────────────────────
    // Customers aur Suppliers ke against jo metal/weight pending hai
    metalBalances: [
      {
        partyType: {
          type: String,
          enum: ['customer', 'supplier'],
          required: true,
        },
        partyId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: 'metalBalances.partyModel',
        },
        partyModel: {
          type: String,
          enum: ['Customer', 'Supplier'],
          required: true,
        },
        partyName: { type: String, trim: true },

        metalType: {
          type: String,
          enum: ['gold', 'silver', 'platinum'],
          required: true,
        },
        // direction:
        // we_owe   = hamare upar unka metal pending (hum denge)
        // they_owe = unke upar hamar metal pending (woh denge)
        direction: {
          type: String,
          enum: ['we_owe', 'they_owe'],
          required: true,
        },
        weight: {
          type: Number,
          required: true,
          min: 0.001,
        },
        weightUnit: {
          type: String,
          enum: ['gram', 'tola', 'kg'],
          default: 'gram',
        },
        // Reference rate at opening (for approximate value)
        referenceRate: {
          type: Number,
          default: null,
        },
        notes: { type: String, trim: true },
        // MetalLedger entry ID - confirm hone pe create hogi
        metalLedgerEntryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MetalLedger',
          default: null,
        },
      },
    ],

    // ─── Stock Opening Balance ───────────────────────────────────
    stockBalance: {
      // Option A: Sirf total value
      totalStockValue: {
        type: Number,
        default: 0,
        min: 0,
      },
      // Metal wise stock (approximate)
      metalStock: {
        gold: {
          weight:      { type: Number, default: 0, min: 0 },
          value:       { type: Number, default: 0, min: 0 },
          purity:      { type: String, default: '22K' },
        },
        silver: {
          weight:      { type: Number, default: 0, min: 0 },
          value:       { type: Number, default: 0, min: 0 },
          purity:      { type: String, default: '925' },
        },
        platinum: {
          weight:      { type: Number, default: 0, min: 0 },
          value:       { type: Number, default: 0, min: 0 },
          purity:      { type: String, default: '950' },
        },
      },
      // Option B: Individual products add kiye hain kya
      hasIndividualProducts: {
        type: Boolean,
        default: false,
      },
      totalProducts: {
        type: Number,
        default: 0,
      },
    },

    // ─── Summary ─────────────────────────────────────────────────
    summary: {
      totalPartyBalances:       { type: Number, default: 0 },
      totalMetalBalances:       { type: Number, default: 0 },
      totalCashAndBankBalance:  { type: Number, default: 0 },
      totalStockValue:          { type: Number, default: 0 },
      netWorth:                 { type: Number, default: 0 },
    },

    // ─── Confirmation ────────────────────────────────────────────
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },

    // ─── Notes ──────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
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
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ────────────────────────────────────────────────────
openingBalanceSchema.index({ organizationId: 1, shopId: 1 });

// ─── PRE-SAVE ────────────────────────────────────────────────────
openingBalanceSchema.pre('save', function (next) {
  // Cash totals auto calculate
  const bankTotal = (this.cashBalance?.bank || [])
    .reduce((sum, b) => sum + (b.balance || 0), 0);

  this.cashBalance.totalBank         = bankTotal;
  this.cashBalance.totalCashAndBank  =
    (this.cashBalance?.cash || 0) + bankTotal;

  // Summary auto calculate
  const totalParty = (this.partyBalances || [])
    .reduce((sum, p) => {
      return p.direction === 'they_owe'
        ? sum + p.amount
        : sum - p.amount;
    }, 0);

  this.summary.totalPartyBalances      = totalParty;
  this.summary.totalCashAndBankBalance = this.cashBalance.totalCashAndBank;
  this.summary.totalStockValue         = this.stockBalance?.totalStockValue || 0;
  this.summary.netWorth                =
    this.summary.totalCashAndBankBalance +
    this.summary.totalStockValue;

  next();
});

// ─── INSTANCE METHODS ────────────────────────────────────────────

// Opening balance confirm karo
openingBalanceSchema.methods.confirm = function (userId) {
  if (this.status === 'confirmed') {
    throw new Error('Opening balance is already confirmed');
  }
  this.status      = 'confirmed';
  this.confirmedBy = userId;
  this.confirmedAt = new Date();
  this.updatedBy   = userId;
  return this.save();
};

// ─── STATIC METHODS ──────────────────────────────────────────────

// Shop ka opening balance fetch karo
openingBalanceSchema.statics.getByShop = function (shopId) {
  return this.findOne({ shopId });
};

// Opening balance set hai ya nahi check karo
openingBalanceSchema.statics.isSet = async function (shopId) {
  const ob = await this.findOne({ shopId, status: 'confirmed' });
  return !!ob;
};

export default mongoose.model('OpeningBalance', openingBalanceSchema);