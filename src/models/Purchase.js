import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
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

    // Purchase Identification
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Supplier Information
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
      index: true,
    },
    supplierDetails: {
      supplierName: String,
      supplierCode: String,
      contactPerson: String,
      phone: String,
      email: String,
      address: String,
      gstNumber: String,
    },

    // Purchase Type
    purchaseType: {
      type: String,
      enum: ['new_stock', 'old_gold', 'exchange', 'consignment', 'repair_return', 'sample'],
      default: 'new_stock',
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

        // Product Details
        productName: {
          type: String,
          required: true,
        },
        productCode: String,
        category: String,

        // Metal Details
        metalType: {
          type: String,
          enum: ['gold', 'silver', 'platinum', 'diamond', 'mixed'],
          required: true,
        },
        purity: String,

        // Weight
        grossWeight: {
          type: Number,
          required: true,
          min: 0,
        },
        stoneWeight: {
          type: Number,
          default: 0,
          min: 0,
        },
        netWeight: {
          type: Number,
          required: true,
          min: 0,
        },
        weightUnit: {
          type: String,
          enum: ['gram', 'kg', 'tola'],
          default: 'gram',
        },

        // Pricing
        ratePerGram: {
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

        // Tax
        taxableAmount: {
          type: Number,
          default: 0,
          min: 0,
        },
        gstPercentage: {
          type: Number,
          default: 3,
          min: 0,
        },
        gstAmount: {
          type: Number,
          default: 0,
          min: 0,
        },

        // Discount
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

        // Total
        itemTotal: {
          type: Number,
          required: true,
          min: 0,
        },

        // Quantity
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },

        // Hallmarking
        huid: String,
        isHallmarked: {
          type: Boolean,
          default: false,
        },

        // Notes
        notes: String,
      },
    ],

    // Financial Summary
    financials: {
      subtotal: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      totalMetalValue: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalStoneValue: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalMakingCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalOtherCharges: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalDiscount: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalTaxableAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalGST: {
        type: Number,
        default: 0,
        min: 0,
      },
      roundOff: {
        type: Number,
        default: 0,
      },
      grandTotal: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    // Payment Details
    payment: {
      totalAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      paidAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      dueAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
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
      paymentTerms: String,

      // Payment History
      payments: [
        {
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          paymentMode: {
            type: String,
            enum: ['cash', 'card', 'upi', 'cheque', 'bank_transfer'],
            required: true,
          },
          paymentDate: {
            type: Date,
            default: Date.now,
          },
          transactionId: String,
          referenceNumber: String,
          bankName: String,
          chequeNumber: String,
          chequeDate: Date,
          notes: String,
          receivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
    },

    // Supplier Invoice Details
    supplierInvoice: {
      invoiceNumber: String,
      invoiceDate: Date,
      invoiceAmount: Number,
      invoiceUrl: String,
    },

    // Delivery/Receipt Details
    delivery: {
      deliveryDate: Date,
      receivedDate: Date,
      receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      deliveryAddress: String,
      transportDetails: {
        transporterName: String,
        vehicleNumber: String,
        lrNumber: String,
        ewayBillNumber: String,
      },
    },

    // Status
    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'ordered',
        'received',
        'partial_received',
        'completed',
        'cancelled',
        'returned',
      ],
      default: 'draft',
      index: true,
    },

    // Approval
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,

    // Documents
    documents: [
      {
        documentType: {
          type: String,
          enum: ['invoice', 'receipt', 'delivery_note', 'certificate', 'other'],
        },
        documentUrl: String,
        documentNumber: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Notes & Terms
    notes: {
      type: String,
      maxlength: 1000,
    },
    internalNotes: String,
    termsAndConditions: String,
    tags: [String],

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
purchaseSchema.index({ organizationId: 1, shopId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ shopId: 1, status: 1 });
purchaseSchema.index({ supplierId: 1, status: 1 });
purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ 'payment.paymentStatus': 1 });
purchaseSchema.index({ approvalStatus: 1 });

// Virtuals
purchaseSchema.virtual('totalItems').get(function () {
  return this.items.length;
});

purchaseSchema.virtual('totalQuantity').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Pre-save middleware - Calculate financials
purchaseSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    // Calculate item totals
    this.items.forEach(item => {
      // Calculate net weight
      item.netWeight = item.grossWeight - item.stoneWeight;

      // Calculate metal value
      item.metalValue = item.netWeight * item.ratePerGram;

      // Calculate taxable amount
      item.taxableAmount =
        item.metalValue + item.stoneValue + item.makingCharges + item.otherCharges;

      // Apply discount
      if (item.discount.type === 'percentage') {
        item.discount.amount = (item.taxableAmount * item.discount.value) / 100;
      } else if (item.discount.type === 'flat') {
        item.discount.amount = item.discount.value;
      }

      item.taxableAmount -= item.discount.amount;

      // Calculate GST
      item.gstAmount = (item.taxableAmount * item.gstPercentage) / 100;

      // Calculate item total
      item.itemTotal = (item.taxableAmount + item.gstAmount) * item.quantity;
    });

    // Calculate financial summary
    this.financials.subtotal = this.items.reduce(
      (sum, item) => sum + item.taxableAmount * item.quantity,
      0
    );
    this.financials.totalMetalValue = this.items.reduce(
      (sum, item) => sum + item.metalValue * item.quantity,
      0
    );
    this.financials.totalStoneValue = this.items.reduce(
      (sum, item) => sum + item.stoneValue * item.quantity,
      0
    );
    this.financials.totalMakingCharges = this.items.reduce(
      (sum, item) => sum + item.makingCharges * item.quantity,
      0
    );
    this.financials.totalOtherCharges = this.items.reduce(
      (sum, item) => sum + item.otherCharges * item.quantity,
      0
    );
    this.financials.totalDiscount = this.items.reduce(
      (sum, item) => sum + item.discount.amount * item.quantity,
      0
    );
    this.financials.totalGST = this.items.reduce(
      (sum, item) => sum + item.gstAmount * item.quantity,
      0
    );
    this.financials.totalTaxableAmount = this.financials.subtotal;

    // Calculate grand total with round off
    const rawTotal = this.financials.subtotal + this.financials.totalGST;
    this.financials.grandTotal = Math.round(rawTotal);
    this.financials.roundOff = this.financials.grandTotal - rawTotal;

    // Update payment amounts
    this.payment.totalAmount = this.financials.grandTotal;
    this.payment.dueAmount = this.payment.totalAmount - this.payment.paidAmount;

    // Update payment status
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
purchaseSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Instance Methods
purchaseSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

purchaseSchema.methods.restore = function () {
  this.deletedAt = null;
  return this.save();
};

purchaseSchema.methods.addPayment = function (paymentData) {
  this.payment.payments.push(paymentData);
  this.payment.paidAmount += paymentData.amount;
  return this.save();
};

purchaseSchema.methods.approve = function (userId) {
  this.approvalStatus = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  if (this.status === 'draft') {
    this.status = 'pending';
  }
  return this.save();
};

purchaseSchema.methods.reject = function (userId, reason) {
  this.approvalStatus = 'rejected';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

purchaseSchema.methods.markAsReceived = function (userId) {
  this.status = 'completed';
  this.delivery.receivedDate = new Date();
  this.delivery.receivedBy = userId;
  return this.save();
};

purchaseSchema.methods.cancel = function () {
  this.status = 'cancelled';
  return this.save();
};

// Static Methods
purchaseSchema.statics.generatePurchaseNumber = async function (shopId, prefix = 'PUR') {
  const shop = await mongoose.model('JewelryShop').findById(shopId);
  const currentYear = new Date().getFullYear().toString().slice(-2);

  let number = 1;
  const lastPurchase = await this.findOne({ shopId })
    .sort({ purchaseNumber: -1 })
    .select('purchaseNumber');

  if (lastPurchase && lastPurchase.purchaseNumber) {
    const lastNumber = parseInt(lastPurchase.purchaseNumber.split('-').pop());
    if (!isNaN(lastNumber)) {
      number = lastNumber + 1;
    }
  }

  return `${prefix}-${currentYear}-${String(number).padStart(5, '0')}`;
};

purchaseSchema.statics.findByShop = function (shopId, options = {}) {
  return this.find({ shopId, deletedAt: null, ...options });
};

purchaseSchema.statics.findBySupplier = function (supplierId, options = {}) {
  return this.find({ supplierId, deletedAt: null, ...options });
};

purchaseSchema.statics.findByStatus = function (shopId, status) {
  return this.find({ shopId, status, deletedAt: null });
};

purchaseSchema.statics.findPending = function (shopId) {
  return this.find({
    shopId,
    status: { $in: ['draft', 'pending', 'ordered'] },
    deletedAt: null,
  });
};

purchaseSchema.statics.findByDateRange = function (shopId, startDate, endDate) {
  return this.find({
    shopId,
    purchaseDate: { $gte: startDate, $lte: endDate },
    deletedAt: null,
  });
};

purchaseSchema.statics.findUnpaid = function (shopId) {
  return this.find({
    shopId,
    'payment.paymentStatus': { $in: ['unpaid', 'partial'] },
    status: { $ne: 'cancelled' },
    deletedAt: null,
  });
};

export default mongoose.model('Purchase', purchaseSchema);
