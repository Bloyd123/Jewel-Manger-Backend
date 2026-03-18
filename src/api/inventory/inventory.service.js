// src/api/inventory/inventory.service.js

import Product from '../../models/Product.js';
import InventoryTransaction from '../../models/InventoryTransaction.js';
import { NotFoundError, InsufficientStockError } from '../../utils/AppError.js';
import { TRANSACTION_TYPES, REFERENCE_TYPES } from './inventory.constants.js';

export const decreaseStock = async ({
  organizationId,
  shopId,
  productId,
  quantity,
  referenceId,
  referenceNumber,
  value,
  performedBy,
  customerId,
  session = null,
}) => {
  // Atomic check + update ek hi operation me
  const product = await Product.findOneAndUpdate(
    {
      _id: productId,
      'stock.quantity': { $gte: quantity }, // check bhi, update bhi
    },
    { $inc: { 'stock.quantity': -quantity } },
    { new: true, session: session || undefined }
  );

  // Agar null aaya — ya product nahi hai, ya stock nahi tha
  if (!product) {
    const exists = await Product.findById(productId).session(session);
    if (!exists) throw new NotFoundError('Product not found');
    throw new InsufficientStockError(
      `Insufficient stock for ${exists.name}. Available: ${exists.stock.quantity}`
    );
  }

  const previousQty = product.stock.quantity + quantity; // new me se wapis nikala

  // ── BUG FIX: status update ───────────────
  // findOneAndUpdate sirf quantity update karta hai — status nahi
  const newQty    = product.stock.quantity;
  const reorder   = product.stock.reorderLevel || 0;
  const newStatus = newQty === 0
    ? 'out_of_stock'
    : newQty <= reorder
      ? 'low_stock'
      : 'in_stock';

  if (product.status !== newStatus) {
    await Product.findByIdAndUpdate(
      productId,
      { $set: { status: newStatus } },
      { session: session || undefined }
    );
    product.status = newStatus; // local object bhi sync karo
  }
  // ─────────────────────────────────────────

  // Agar stock 0 ho gaya toh markAsSold
  if (product.stock.quantity === 0 && customerId) {
    await product.markAsSold(customerId);
  }

  await InventoryTransaction.create(
    [
      {
        organizationId,
        shopId,
        productId,
        productCode:     product.productCode,
        transactionType: TRANSACTION_TYPES.SALE,
        quantity,
        previousQuantity: previousQty,
        newQuantity:      product.stock.quantity,
        transactionDate:  new Date(),
        referenceType:    REFERENCE_TYPES.SALE,
        referenceId,
        referenceNumber,
        value,
        performedBy,
        reason: `Product sold via ${referenceNumber}`,
      },
    ],
    session ? { session } : {}
  );

  return product;
};

export const increaseStock = async ({
  organizationId,
  shopId,
  productId,
  quantity,
  referenceId,
  referenceNumber,
  value,
  performedBy,
  session = null,
}) => {
  const product = await Product.findById(productId).session(session);
  if (!product) throw new NotFoundError('Product not found');

  const previousQty = product.stock.quantity;
  await product.updateStock(quantity, 'add');

  await InventoryTransaction.create(
    [
      {
        organizationId,
        shopId,
        productId,
        productCode:      product.productCode,
        transactionType:  TRANSACTION_TYPES.PURCHASE,
        quantity,
        previousQuantity: previousQty,
        newQuantity:      product.stock.quantity,
        transactionDate:  new Date(),
        referenceType:    REFERENCE_TYPES.PURCHASE,
        referenceId,
        referenceNumber,
        value,
        performedBy,
        reason: `Stock received via ${referenceNumber}`,
      },
    ],
    session ? { session } : {}
  );

  return product;
};

export const returnStock = async ({
  organizationId,
  shopId,
  productId,
  quantity,
  referenceId,
  referenceNumber,
  performedBy,
  session = null,
}) => {
  const product = await Product.findById(productId).session(session);
  if (!product) throw new NotFoundError('Product not found');

  const previousQty = product.stock.quantity;
  await product.updateStock(quantity, 'add');

  if (product.saleStatus === 'sold') {
    product.saleStatus = 'available';
    product.soldTo     = null;
    product.soldDate   = null;
    await product.save();
  }

  await InventoryTransaction.create(
    [
      {
        organizationId,
        shopId,
        productId,
        productCode:      product.productCode,
        transactionType:  TRANSACTION_TYPES.RETURN,
        quantity,
        previousQuantity: previousQty,
        newQuantity:      product.stock.quantity,
        transactionDate:  new Date(),
        referenceType:    REFERENCE_TYPES.RETURN,
        referenceId,
        referenceNumber,
        performedBy,
        reason: `Product returned from ${referenceNumber}`,
      },
    ],
    session ? { session } : {}
  );

  return product;
};

export const adjustStock = async ({
  organizationId,
  shopId,
  productId,
  newQuantity,
  reason,
  performedBy,
  session = null,
}) => {
  const product = await Product.findById(productId).session(session);
  if (!product) throw new NotFoundError('Product not found');

  const previousQty = product.stock.quantity;
  const difference  = newQuantity - previousQty;

  await product.updateStock(Math.abs(difference), difference > 0 ? 'add' : 'subtract');

  await InventoryTransaction.create(
    [
      {
        organizationId,
        shopId,
        productId,
        productCode:      product.productCode,
        transactionType:  TRANSACTION_TYPES.ADJUSTMENT,
        quantity:         Math.abs(difference),
        previousQuantity: previousQty,
        newQuantity,
        transactionDate:  new Date(),
        referenceType:    REFERENCE_TYPES.MANUAL_ADJUSTMENT,
        performedBy,
        reason:           reason || 'Manual stock adjustment',
      },
    ],
    session ? { session } : {}
  );

  return product;
};

export const createProductFromPurchase = async ({
  organizationId,
  shopId,
  item,
  purchaseId,
  purchaseNumber,
  supplierId,
  supplierDetails,
  userId,
  session = null,
}) => {
  const productCode = await Product.generateProductCode(shopId);

  const newProduct = await Product.create(
    [
      {
        organizationId,
        shopId,
        name:        item.productName,
        productCode,
        category:    item.category || 'other',
        metal: {
          type:   item.metalType,
          purity: item.purity,
        },
        weight: {
          grossWeight: item.grossWeight,
          stoneWeight: item.stoneWeight,
          netWeight:   item.netWeight,
          unit:        item.weightUnit,
        },
        stock: {
          quantity: item.quantity,
        },
        pricing: {
          costPrice:    item.itemTotal / item.quantity,
          sellingPrice: (item.itemTotal / item.quantity) * 1.2,
        },
        supplierId,
        supplierDetails: {
          supplierName:  supplierDetails.supplierName,
          supplierCode:  supplierDetails.supplierCode,
          purchaseDate:  new Date(),
          purchasePrice: item.itemTotal / item.quantity,
          invoiceNumber: purchaseNumber,
        },
        huid:        item.huid,
        hallmarking: { isHallmarked: item.isHallmarked },
        createdBy:   userId,
      },
    ],
    session ? { session } : {}
  );

  await InventoryTransaction.create(
    [
      {
        organizationId,
        shopId,
        productId:        newProduct[0]._id,
        productCode,
        transactionType:  TRANSACTION_TYPES.IN,
        quantity:         item.quantity,
        previousQuantity: 0,
        newQuantity:      item.quantity,
        transactionDate:  new Date(),
        referenceType:    REFERENCE_TYPES.PRODUCT_CREATION,
        referenceId:      purchaseId,
        referenceNumber:  purchaseNumber,
        value:            item.itemTotal,
        performedBy:      userId,
        reason:           'Initial stock from purchase',
      },
    ],
    session ? { session } : {}
  );

  return newProduct[0];
};

export const getStockMovement = async ({ shopId, productId, limit = 50 }) => {
  return InventoryTransaction.getProductHistory(productId, limit);
};