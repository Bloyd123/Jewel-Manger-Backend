import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
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

    // Payment Identification
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Payment Type
    paymentType: {
      type: String,
      enum: [
        'sale_payment',
        'purchase_payment',
        'scheme_payment',
        'advance_payment',
        'refund',
        'other',
      ],
      required: true,
      index: true,
    },

    // Transaction Type
    transactionType: {
      type: String,
      enum: ['receipt', 'payment'], // receipt = money in, payment = money out
      required: true,
      index: true,
    },

    // Reference Details
    reference: {
      referenceType: {
        type: String,
        enum: ['sale', 'purchase', 'scheme_enrollment', 'order', 'none'],
        default: 'none',
      },
      referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'reference.referenceModel',
        default: null,
      },
      referenceModel: {
        type: String,
        enum: ['Sale', 'Purchase', 'SchemeEnrollment', 'Order', ''],
        default: '',
      },
      referenceNumber: String,
    },

    // Party Details (Customer or Supplier)
    party: {
      partyType: {
        type: String,
        enum: ['customer', 'supplier', 'other'],
        required: true,
      },
      partyId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'party.partyModel',
        required: true,
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
      },
      partyCode: String,
      phone: String,
      email: String,
    },

    // Payment Amount
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment Mode
    paymentMode: {
      type: String,
      enum: ['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'wallet', 'other'],
      required: true,
      index: true,
    },

    // Payment Details by Mode
    paymentDetails: {
      // Cash
      cashDetails: {
        receivedAmount: Number,
        returnAmount: Number,
      },

      // Card
      cardDetails: {
        cardType: {
          type: String,
          enum: ['credit', 'debit'],
        },
        cardNetwork: {
          type: String,
          enum: ['visa', 'mastercard', 'rupay', 'amex', 'other'],
        },
        last4Digits: String,
        authorizationCode: String,
        terminalId: String,
        merchantId: String,
        bankName: String,
      },

      // UPI
      upiDetails: {
        upiId: String,
        transactionId: String,
        appName: {
          type: String,
          enum: ['gpay', 'phonepe', 'paytm', 'bhim', 'other'],
        },
      },

      // Cheque
      chequeDetails: {
        chequeNumber: {
          type: String,
          required() {
            return this.paymentMode === 'cheque';
          },
        },
        chequeDate: Date,
        bankName: String,
        branchName: String,
        ifscCode: String,
        accountNumber: String,
        chequeStatus: {
          type: String,
          enum: ['pending', 'cleared', 'bounced', 'cancelled'],
          default: 'pending',
        },
        clearanceDate: Date,
        bounceReason: String,
      },

      // Bank Transfer
      bankTransferDetails: {
        fromBank: String,
        fromAccountNumber: String,
        toBank: String,
        toAccountNumber: String,
        ifscCode: String,
        transactionId: String,
        referenceNumber: String,
        transferType: {
          type: String,
          enum: ['neft', 'rtgs', 'imps', 'other'],
        },
      },

      // Wallet
      walletDetails: {
        walletProvider: {
          type: String,
          enum: ['paytm', 'phonepe', 'mobikwik', 'other'],
        },
        walletNumber: String,
        transactionId: String,
      },
    },

    // Transaction Details
    transactionId: String,
    referenceNumber: String,

    // Status
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },

    // Reconciliation
    reconciliation: {
      isReconciled: {
        type: Boolean,
        default: false,
      },
      reconciledAt: Date,
      reconciledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reconciledWith: String, // Bank statement reference
      discrepancy: {
        type: Number,
        default: 0,
      },
      notes: String,
    },

    // Receipt Details
    receipt: {
      receiptNumber: String,
      receiptGenerated: {
        type: Boolean,
        default: false,
      },
      receiptUrl: String,
      receiptSentAt: Date,
      receiptSentTo: String, // email or phone
    },

    // Notes
    notes: {
      type: String,
      maxlength: 1000,
    },
    internalNotes: String,
    tags: [String],

    // Processed By
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Approval (for high-value transactions)
    approval: {
      requiresApproval: {
        type: Boolean,
        default: false,
      },
      approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: Date,
      rejectionReason: String,
    },

    // Refund Details (if this is a refund)
    refund: {
      isRefund: {
        type: Boolean,
        default: false,
      },
      originalPaymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
      },
      refundReason: String,
      refundedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

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
paymentSchema.index({ organizationId: 1, shopId: 1, paymentNumber: 1 }, { unique: true });
paymentSchema.index({ shopId: 1, paymentDate: -1 });
paymentSchema.index({ shopId: 1, status: 1 });
paymentSchema.index({ shopId: 1, paymentMode: 1 });
paymentSchema.index({ 'party.partyId': 1 });
paymentSchema.index({ 'reference.referenceId': 1 });
paymentSchema.index({ transactionType: 1, paymentDate: -1 });

// Virtuals
paymentSchema.virtual('partyDetails', {
  ref() {
    return this.party.partyModel;
  },
  localField: 'party.partyId',
  foreignField: '_id',
  justOne: true,
});

paymentSchema.virtual('referenceDetails', {
  ref() {
    return this.reference.referenceModel;
  },
  localField: 'reference.referenceId',
  foreignField: '_id',
  justOne: true,
});

// Pre-save middleware
paymentSchema.pre('save', function (next) {
  // Auto-complete for cash payments
  if (this.paymentMode === 'cash' && this.status === 'pending') {
    this.status = 'completed';
  }

  // Mark as completed for UPI/Card payments with transaction ID
  if (
    (this.paymentMode === 'upi' || this.paymentMode === 'card') &&
    this.transactionId &&
    this.status === 'pending'
  ) {
    this.status = 'completed';
  }

  next();
});

// Soft delete middleware
paymentSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Instance Methods
paymentSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

paymentSchema.methods.restore = function () {
  this.deletedAt = null;
  return this.save();
};

paymentSchema.methods.markAsCompleted = function () {
  this.status = 'completed';
  return this.save();
};

paymentSchema.methods.markAsFailed = function (reason) {
  this.status = 'failed';
  this.notes = reason || this.notes;
  return this.save();
};

paymentSchema.methods.cancel = function (reason) {
  this.status = 'cancelled';
  this.notes = reason || this.notes;
  return this.save();
};

paymentSchema.methods.reconcile = function (userId, reconciledWith, discrepancy = 0) {
  this.reconciliation.isReconciled = true;
  this.reconciliation.reconciledAt = new Date();
  this.reconciliation.reconciledBy = userId;
  this.reconciliation.reconciledWith = reconciledWith;
  this.reconciliation.discrepancy = discrepancy;
  return this.save();
};

paymentSchema.methods.updateChequeStatus = function (
  status,
  clearanceDate = null,
  bounceReason = null
) {
  if (this.paymentMode !== 'cheque') {
    throw new Error('Not a cheque payment');
  }

  this.paymentDetails.chequeDetails.chequeStatus = status;

  if (status === 'cleared') {
    this.paymentDetails.chequeDetails.clearanceDate = clearanceDate || new Date();
    this.status = 'completed';
  } else if (status === 'bounced') {
    this.paymentDetails.chequeDetails.bounceReason = bounceReason;
    this.status = 'failed';
  }

  return this.save();
};

paymentSchema.methods.generateReceipt = function (receiptUrl) {
  this.receipt.receiptGenerated = true;
  this.receipt.receiptUrl = receiptUrl;
  if (!this.receipt.receiptNumber) {
    this.receipt.receiptNumber = this.paymentNumber;
  }
  return this.save();
};

paymentSchema.methods.sendReceipt = function (sentTo) {
  this.receipt.receiptSentAt = new Date();
  this.receipt.receiptSentTo = sentTo;
  return this.save();
};

paymentSchema.methods.approve = function (userId) {
  this.approval.approvalStatus = 'approved';
  this.approval.approvedBy = userId;
  this.approval.approvedAt = new Date();
  return this.save();
};

paymentSchema.methods.reject = function (userId, reason) {
  this.approval.approvalStatus = 'rejected';
  this.approval.approvedBy = userId;
  this.approval.approvedAt = new Date();
  this.approval.rejectionReason = reason;
  this.status = 'cancelled';
  return this.save();
};

// Static Methods
paymentSchema.statics.generatePaymentNumber = async function (shopId, prefix = 'PAY') {
  const currentYear = new Date().getFullYear().toString().slice(-2);

  let number = 1;
  const lastPayment = await this.findOne({ shopId })
    .sort({ paymentNumber: -1 })
    .select('paymentNumber');

  if (lastPayment && lastPayment.paymentNumber) {
    const lastNumber = parseInt(lastPayment.paymentNumber.split('-').pop());
    if (!isNaN(lastNumber)) {
      number = lastNumber + 1;
    }
  }

  return `${prefix}-${currentYear}-${String(number).padStart(6, '0')}`;
};

paymentSchema.statics.findByShop = function (shopId, options = {}) {
  return this.find({ shopId, deletedAt: null, ...options }).sort({ paymentDate: -1 });
};

paymentSchema.statics.findByParty = function (partyId, options = {}) {
  return this.find({
    'party.partyId': partyId,
    deletedAt: null,
    ...options,
  }).sort({ paymentDate: -1 });
};

paymentSchema.statics.findByReference = function (referenceId, options = {}) {
  return this.find({
    'reference.referenceId': referenceId,
    deletedAt: null,
    ...options,
  }).sort({ paymentDate: -1 });
};

paymentSchema.statics.findByDateRange = function (shopId, startDate, endDate) {
  return this.find({
    shopId,
    paymentDate: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  }).sort({ paymentDate: -1 });
};

paymentSchema.statics.findByPaymentMode = function (shopId, paymentMode) {
  return this.find({
    shopId,
    paymentMode,
    deletedAt: null,
  }).sort({ paymentDate: -1 });
};

paymentSchema.statics.findPendingCheques = function (shopId) {
  return this.find({
    shopId,
    paymentMode: 'cheque',
    'paymentDetails.chequeDetails.chequeStatus': 'pending',
    deletedAt: null,
  }).sort({ paymentDate: -1 });
};

paymentSchema.statics.findUnreconciled = function (shopId) {
  return this.find({
    shopId,
    'reconciliation.isReconciled': false,
    status: 'completed',
    deletedAt: null,
  }).sort({ paymentDate: -1 });
};

paymentSchema.statics.getTodayCollection = async function (shopId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await this.aggregate([
    {
      $match: {
        shopId: new mongoose.Types.ObjectId(shopId),
        paymentDate: { $gte: today, $lt: tomorrow },
        transactionType: 'receipt',
        status: 'completed',
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: '$paymentMode',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  return result;
};

paymentSchema.statics.getCollectionByDateRange = async function (shopId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        shopId: new mongoose.Types.ObjectId(shopId),
        paymentDate: { $gte: startDate, $lte: endDate },
        transactionType: 'receipt',
        status: 'completed',
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: {
          mode: '$paymentMode',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.date': 1 },
    },
  ]);

  return result;
};

export default mongoose.model('Payment', paymentSchema);
