import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
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

    // Sale/Invoice Identification
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    saleDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Customer Information
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
      index: true,
    },
    customerDetails: {
      customerName: String,
      customerCode: String,
      phone: String,
      email: String,
      address: String,
      gstNumber: String,
      panNumber: String,
    },

    // Sale Type
    saleType: {
      type: String,
      enum: ['retail', 'wholesale', 'exchange', 'order_fulfillment', 'repair_billing', 'estimate'],
      default: 'retail',
      index: true,
    },

    // Items
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          default: null,
        },
        productName: { type: String, required: true },
        productCode: String,
        category: String,
        hsnCode: String,
        metalType: {
          type: String,
          enum: ['gold', 'silver', 'platinum', 'diamond', 'mixed'],
          required: true,
        },
        purity: String,
        grossWeight: { type: Number, required: true, min: 0 },
        stoneWeight: { type: Number, default: 0, min: 0 },
        netWeight: { type: Number, required: true, min: 0 },
        weightUnit: {
          type: String,
          enum: ['gram', 'kg', 'tola'],
          default: 'gram',
        },
        ratePerGram: { type: Number, default: 0, min: 0 },
        metalValue: { type: Number, default: 0, min: 0 },
        stoneValue: { type: Number, default: 0, min: 0 },
        makingCharges: { type: Number, default: 0, min: 0 },
        makingChargesType: {
          type: String,
          enum: ['per_gram', 'flat', 'percentage'],
          default: 'flat',
        },
        otherCharges: { type: Number, default: 0, min: 0 },
        taxableAmount: { type: Number, default: 0, min: 0 },
        gstPercentage: { type: Number, default: 3, min: 0 },
        cgst: { type: Number, default: 0, min: 0 },
        sgst: { type: Number, default: 0, min: 0 },
        igst: { type: Number, default: 0, min: 0 },
        totalGst: { type: Number, default: 0, min: 0 },
        discount: {
          type: {
            type: String,
            enum: ['percentage', 'flat', 'none'],
            default: 'none',
          },
          value: { type: Number, default: 0, min: 0 },
          amount: { type: Number, default: 0, min: 0 },
        },
        itemTotal: { type: Number, required: true, min: 0 },
        quantity: { type: Number, default: 1, min: 1 },
        huid: String,
        isHallmarked: { type: Boolean, default: false },
        warrantyPeriod: Number,
        warrantyExpiryDate: Date,
        notes: String,
      },
    ],

    // Old Gold Exchange
    oldGoldExchange: {
      hasExchange: { type: Boolean, default: false },
      items: [
        {
          metalType: String,
          purity: String,
          grossWeight: Number,
          stoneWeight: Number,
          netWeight: Number,
          ratePerGram: Number,
          totalValue: Number,
          description: String,
        },
      ],
      totalValue: { type: Number, default: 0 },
    },

    // Financial Summary
    financials: {
      subtotal: { type: Number, required: true, default: 0, min: 0 },
      totalMetalValue: { type: Number, default: 0, min: 0 },
      totalStoneValue: { type: Number, default: 0, min: 0 },
      totalMakingCharges: { type: Number, default: 0, min: 0 },
      totalOtherCharges: { type: Number, default: 0, min: 0 },
      totalDiscount: { type: Number, default: 0, min: 0 },
      oldGoldValue: { type: Number, default: 0, min: 0 },
      totalTaxableAmount: { type: Number, default: 0, min: 0 },
      totalCGST: { type: Number, default: 0, min: 0 },
      totalSGST: { type: Number, default: 0, min: 0 },
      totalIGST: { type: Number, default: 0, min: 0 },
      totalGST: { type: Number, default: 0, min: 0 },
      roundOff: { type: Number, default: 0 },
      grandTotal: { type: Number, required: true, min: 0 },
      netPayable: { type: Number, required: true, min: 0 },
    },

    // Payment Details
    payment: {
      totalAmount: { type: Number, default: 0, min: 0 },
      paidAmount: { type: Number, default: 0, min: 0 },
      dueAmount: { type: Number, default: 0, min: 0 },
      paymentStatus: {
        type: String,
        enum: ['paid', 'partial', 'unpaid', 'overdue'],
        default: 'unpaid',
        index: true,
      },
      paymentMode: {
        type: String,
        enum: ['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'mixed', 'credit'],
        default: 'cash',
      },
      dueDate: Date,
    },

    // Delivery Details
    delivery: {
      deliveryType: {
        type: String,
        enum: ['immediate', 'scheduled', 'courier', 'pickup'],
        default: 'immediate',
      },
      deliveryDate: Date,
      deliveryAddress: String,
      deliveredAt: Date,
      deliveredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      courierDetails: {
        courierName: String,
        trackingNumber: String,
        awbNumber: String,
      },
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending', 'confirmed', 'delivered', 'completed', 'cancelled', 'returned'],
      default: 'draft',
      index: true,
    },

    // Return Details
    return: {
      isReturned: { type: Boolean, default: false },
      returnDate: Date,
      returnReason: String,
      refundAmount: Number,
      returnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // Documents
    documents: [
      {
        documentType: {
          type: String,
          enum: ['invoice', 'receipt', 'estimate', 'certificate', 'warranty', 'other'],
        },
        documentUrl: String,
        documentNumber: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // References
    schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', default: null },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },

    // Notes
    notes: { type: String, maxlength: 1000 },
    internalNotes: String,
    termsAndConditions: String,
    tags: [String],

    // Sales Person
    salesPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Approval
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    approval: {
      approvalStatus: String,
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      rejectionReason: String,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    // Cancellation
    cancellation: {
      isCancelled: { type: Boolean, default: false },
      cancelledAt: Date,
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      cancellationReason: String,
      refundAmount: { type: Number, default: 0 },
      refundStatus: {
        type: String,
        enum: ['pending', 'processed', 'not_applicable'],
        default: 'not_applicable',
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

// ─────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────
saleSchema.index({ organizationId: 1, shopId: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ shopId: 1, status: 1 });
saleSchema.index({ customerId: 1, status: 1 });
saleSchema.index({ saleDate: -1 });
saleSchema.index({ 'payment.paymentStatus': 1 });
saleSchema.index({ salesPerson: 1 });

// ─────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────
saleSchema.virtual('totalItems').get(function () {
  return this.items.length;
});

saleSchema.virtual('totalQuantity').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// ─────────────────────────────────────────────
// PRE-SAVE MIDDLEWARE
// ─────────────────────────────────────────────
saleSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.netWeight = item.grossWeight - item.stoneWeight;
      item.metalValue = item.netWeight * item.ratePerGram;

      if (item.makingChargesType === 'per_gram') {
        item.makingCharges = item.netWeight * item.makingCharges;
      } else if (item.makingChargesType === 'percentage') {
        item.makingCharges = (item.metalValue * item.makingCharges) / 100;
      }

      item.taxableAmount = item.metalValue + item.stoneValue + item.makingCharges + item.otherCharges;

      if (item.discount.type === 'percentage') {
        item.discount.amount = (item.taxableAmount * item.discount.value) / 100;
      } else if (item.discount.type === 'flat') {
        item.discount.amount = item.discount.value;
      }

      item.taxableAmount -= item.discount.amount;

      const gstAmount = (item.taxableAmount * item.gstPercentage) / 100;
      item.cgst = gstAmount / 2;
      item.sgst = gstAmount / 2;
      item.totalGst = gstAmount;

      item.itemTotal = (item.taxableAmount + item.totalGst) * item.quantity;
    });

    this.financials.subtotal = this.items.reduce((sum, item) => sum + item.taxableAmount * item.quantity, 0);
    this.financials.totalMetalValue = this.items.reduce((sum, item) => sum + item.metalValue * item.quantity, 0);
    this.financials.totalStoneValue = this.items.reduce((sum, item) => sum + item.stoneValue * item.quantity, 0);
    this.financials.totalMakingCharges = this.items.reduce((sum, item) => sum + item.makingCharges * item.quantity, 0);
    this.financials.totalOtherCharges = this.items.reduce((sum, item) => sum + item.otherCharges * item.quantity, 0);
    this.financials.totalDiscount = this.items.reduce((sum, item) => sum + item.discount.amount * item.quantity, 0);
    this.financials.totalCGST = this.items.reduce((sum, item) => sum + item.cgst * item.quantity, 0);
    this.financials.totalSGST = this.items.reduce((sum, item) => sum + item.sgst * item.quantity, 0);
    this.financials.totalGST = this.items.reduce((sum, item) => sum + item.totalGst * item.quantity, 0);
    this.financials.totalTaxableAmount = this.financials.subtotal;

    if (this.oldGoldExchange.hasExchange) {
      this.financials.oldGoldValue = this.oldGoldExchange.totalValue;
    }

    const rawTotal = this.financials.subtotal + this.financials.totalGST;
    this.financials.grandTotal = Math.round(rawTotal);
    this.financials.roundOff = this.financials.grandTotal - rawTotal;
    this.financials.netPayable = this.financials.grandTotal - this.financials.oldGoldValue;

    this.payment.totalAmount = this.financials.netPayable;
    this.payment.dueAmount = this.payment.totalAmount - this.payment.paidAmount;

    if (this.payment.paidAmount === 0) {
      this.payment.paymentStatus = 'unpaid';
    } else if (this.payment.paidAmount >= this.payment.totalAmount) {
      this.payment.paymentStatus = 'paid';
      this.payment.dueAmount = 0;
    } else {
      this.payment.paymentStatus = 'partial';
    }
  }

  next();
});

// Soft delete middleware
saleSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// ─────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────
saleSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

saleSchema.methods.restore = function () {
  this.deletedAt = null;
  return this.save();
};

saleSchema.methods.markAsDelivered = function (userId) {
  this.status = 'delivered';
  this.delivery.deliveredAt = new Date();
  this.delivery.deliveredBy = userId;
  return this.save();
};

saleSchema.methods.markAsCompleted = function () {
  this.status = 'completed';
  return this.save();
};

saleSchema.methods.cancel = function () {
  this.status = 'cancelled';
  return this.save();
};

saleSchema.methods.processReturn = function (returnData) {
  this.return.isReturned = true;
  this.return.returnDate = returnData.returnDate || new Date();
  this.return.returnReason = returnData.reason;
  this.return.refundAmount = returnData.refundAmount;
  this.return.returnedBy = returnData.returnedBy;
  this.status = 'returned';
  return this.save();
};

// ─────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────

// Invoice number generate karo — Counter model use karta hai (atomic!)
saleSchema.statics.generateInvoiceNumber = async function (shopId, prefix = 'INV') {
  const currentYear = new Date().getFullYear().toString().slice(-2);

  const counter = await mongoose.model('Counter').findOneAndUpdate(
    { name: `invoice_${shopId}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}-${currentYear}-${String(counter.seq).padStart(5, '0')}`;
};

// Fix: organizationId add kiya sab mein
saleSchema.statics.findByShop = function (shopId, organizationId, options = {}) {
  return this.find({ shopId, organizationId, deletedAt: null, ...options }); // ← fix
};

saleSchema.statics.findByCustomer = function (customerId, shopId, organizationId, options = {}) {
  return this.find({ customerId, shopId, organizationId, deletedAt: null, ...options }); // ← fix
};

saleSchema.statics.findByStatus = function (shopId, organizationId, status) {
  return this.find({ shopId, organizationId, status, deletedAt: null }); // ← fix
};

saleSchema.statics.findByDateRange = function (shopId, organizationId, startDate, endDate) {
  return this.find({
    shopId,
    organizationId, // ← fix
    saleDate: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  });
};

saleSchema.statics.findUnpaid = function (shopId, organizationId) {
  return this.find({
    shopId,
    organizationId, // ← fix
    'payment.paymentStatus': { $in: ['unpaid', 'partial'] },
    status: { $ne: 'cancelled' },
    deletedAt: null,
  });
};

saleSchema.statics.findBySalesPerson = function (shopId, organizationId, salesPersonId) {
  return this.find({
    shopId,
    organizationId, // ← fix
    salesPerson: salesPersonId,
    deletedAt: null,
  });
};

// Payment apply karo — Payment module call karta hai
saleSchema.statics.applyPayment = async function (saleId, amount) {
  const sale = await this.findById(saleId);
  if (!sale) return;

  const paidAmount = sale.payment.paidAmount + amount;
  const dueAmount = sale.payment.totalAmount - paidAmount;
  let paymentStatus = 'partial';

  if (paidAmount >= sale.payment.totalAmount) {
    paymentStatus = 'paid';
  } else if (paidAmount <= 0) {
    paymentStatus = 'unpaid';
  }

  await this.findByIdAndUpdate(saleId, {
    $set: {
      'payment.paidAmount': paidAmount,
      'payment.dueAmount': Math.max(0, dueAmount),
      'payment.paymentStatus': paymentStatus,
    },
  });
};

// Payment reverse karo — cheque bounce ya cancel ke liye
saleSchema.statics.reversePayment = async function (saleId, amount) {
  const sale = await this.findById(saleId);
  if (!sale) return;

  const paidAmount = Math.max(0, sale.payment.paidAmount - amount);
  const dueAmount = sale.payment.totalAmount - paidAmount;
  const paymentStatus = paidAmount <= 0 ? 'unpaid' : 'partial';

  await this.findByIdAndUpdate(saleId, {
    $set: {
      'payment.paidAmount': paidAmount,
      'payment.dueAmount': dueAmount,
      'payment.paymentStatus': paymentStatus,
    },
  });
};

export default mongoose.model('Sale', saleSchema);