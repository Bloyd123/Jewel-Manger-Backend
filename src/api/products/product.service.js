import Product from '../../models/Product.js';
import MetalRate from '../../models/MetalRate.js';
import InventoryTransaction from '../../models/InventoryTransaction.js';
import JewelryShop from '../../models/Shop.js';
import { adjustStock } from '../inventory/inventory.service.js';
import eventLogger from '../../utils/eventLogger.js';
import cache from '../../utils/cache.js';
import {
  ProductNotFoundError,
  ValidationError,
  InsufficientStockError,
  DuplicateProductCodeError,
} from '../../utils/AppError.js';
import Category from '../../models/Category.js';

export async function createProduct(productData, shopId, organizationId, userId) {
  const productCode = await Product.generateProductCode(shopId, 'PRD');

  const metalRates = await MetalRate.getCurrentRate(shopId);
  if (!metalRates) {
    throw new ValidationError(
      'Metal rates not found for this shop. Please set metal rates first.'
    );
  }

  const grossWeight = parseFloat(productData.weight?.grossWeight) || 0;
  const stoneWeight = parseFloat(productData.weight?.stoneWeight) || 0;
  const netWeight = grossWeight - stoneWeight;

  const pricing = await calculateProductPrice(
    {
      ...productData,
      weight: {
        ...productData.weight,
        grossWeight,
        stoneWeight,
        netWeight,
      },
    },
    metalRates
  );

  if (productData.stones && productData.stones.length > 0) {
    productData.stones.forEach(stone => {
      stone.totalStonePrice = (stone.stonePrice || 0) * (stone.pieceCount || 1);
    });
  }

  const quantity = productData.stock?.quantity || 1;
  const reorderLevel = productData.stock?.reorderLevel || 0;
  let stockStatus = 'in_stock';

  if (quantity === 0) {
    stockStatus = 'out_of_stock';
  } else if (quantity <= reorderLevel && quantity > 0) {
    stockStatus = 'low_stock';
  }


  let finalCategoryId = productData.categoryId;
  let finalSubCategoryId = productData.subCategoryId;

  if (finalCategoryId === 'OTHER') {
    finalCategoryId = process.env.OTHER_CATEGORY_ID;
  }

  if (finalSubCategoryId === 'OTHER_MISC') {
    finalSubCategoryId = process.env.OTHER_SUBCATEGORY_ID;
  }


  const categoryExists = await Category.findOne({
    _id: finalCategoryId,
    isActive: true,
    parentId: null,
  });

  if (!categoryExists) {
    throw new ValidationError('Invalid category selected');
  }

  if (finalSubCategoryId) {
    const subCategoryExists = await Category.findOne({
      _id: finalSubCategoryId,
      isActive: true,
      parentId: finalCategoryId,
    });

    if (!subCategoryExists) {
      throw new ValidationError('Invalid subcategory selected');
    }
  }
  const product = await Product.create({
    organizationId,
    shopId,
    productCode,
    ...productData,
    categoryId: finalCategoryId,
    subCategoryId: finalSubCategoryId,
    weight: {
      ...productData.weight,
      netWeight,
    },
    pricing: {
      ...productData.pricing,
      ...pricing,
    },
    stock: {
      ...productData.stock,
      quantity,
      status: stockStatus,
    },
    createdBy: userId,
    isActive: true,
    saleStatus: 'available',
  });

await adjustStock({
  organizationId,
  shopId,
  productId: product._id,
  newQuantity: product.stock.quantity,
  reason: 'Initial stock entry',
  performedBy: userId,
});

  const shop = await JewelryShop.findById(shopId);
  if (shop) {
    shop.statistics.totalProducts += 1;
    shop.statistics.totalInventoryValue += product.pricing.sellingPrice * product.stock.quantity;
    await shop.save();
  }

  await eventLogger.logProduct(
    userId,
    organizationId,
    shopId,
    'create',
    product._id,
    `Created product: ${product.name}`,
    {
      productCode: product.productCode,
      categoryId: product.categoryId,
      metalType: product.metal.type,
      quantity: product.stock.quantity,
    }
  );

  cache.set(cache.productKey(product._id), product.toJSON(), 1800);

  return product;
}


export async function calculateProductPrice(productData, metalRates) {
  const { metal, weight, makingCharges, stones, pricing } = productData;

  let metalRate = 0;

  if (metal.type === 'gold') {
    switch (metal.purity) {
      case '24K':
        metalRate = metalRates.gold?.gold24K?.sellingRate || 0;
        break;
      case '22K':
        metalRate = metalRates.gold?.gold22K?.sellingRate || 0;
        break;
      case '18K':
        metalRate = metalRates.gold?.gold18K?.sellingRate || 0;
        break;
      case '916':
        metalRate = metalRates.gold?.gold22K?.sellingRate || 0; // 916 = 22K
        break;
      default:
        metalRate = metalRates.gold?.gold22K?.sellingRate || 0;
    }
  } else if (metal.type === 'silver') {
    switch (metal.purity) {
      case '999':
        metalRate = metalRates.silver?.pure?.sellingRate || 0;
        break;
      case '925':
        metalRate = metalRates.silver?.sterling?.sellingRate || 0;
        break;
      default:
        metalRate = metalRates.silver?.pure?.sellingRate || 0;
    }
  } else if (metal.type === 'platinum') {
    metalRate = metalRates.platinum?.sellingRate || 0;
  }

  const netWeight = weight.netWeight || 0;
  const metalValue = netWeight * metalRate;

  let makingChargesAmount = 0;
  if (makingCharges?.type === 'per_gram') {
    makingChargesAmount = netWeight * (makingCharges.value || 0);
  } else if (makingCharges?.type === 'percentage') {
    makingChargesAmount = (metalValue * (makingCharges.value || 0)) / 100;
  } else if (makingCharges?.type === 'flat') {
    makingChargesAmount = makingCharges.value || 0;
  }

  const stoneValue =
    stones?.reduce((sum, stone) => {
      return sum + (stone.stonePrice || 0) * (stone.pieceCount || 1);
    }, 0) || 0;

  const otherCharges = pricing?.otherCharges || 0;

  const subtotal = metalValue + stoneValue + makingChargesAmount + otherCharges;

  let discountAmount = 0;
  if (pricing?.discount?.type === 'percentage') {
    discountAmount = (subtotal * (pricing.discount.value || 0)) / 100;
  } else if (pricing?.discount?.type === 'flat') {
    discountAmount = pricing.discount.value || 0;
  }

  const afterDiscount = subtotal - discountAmount;

  const gstPercentage = pricing?.gst?.percentage || 3;
  const gstAmount = (afterDiscount * gstPercentage) / 100;

  const totalPrice = afterDiscount + gstAmount;

  return {
    metalRate,
    metalValue,
    stoneValue,
    makingCharges: makingChargesAmount,
    otherCharges,
    subtotal,
    discount: {
      type: pricing?.discount?.type || 'none',
      value: pricing?.discount?.value || 0,
      amount: discountAmount,
    },
    gst: {
      percentage: gstPercentage,
      amount: gstAmount,
    },
    totalPrice,
    sellingPrice: totalPrice,
  };
}


export async function getProducts(shopId, organizationId, filters = {}, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    category,
    metalType,
    purity,
    status,
    saleStatus,
    minPrice,
    maxPrice,
    search,
    gender,
    isActive,
    isFeatured,
  } = filters;

  // Build query
  const query = {
    shopId,
    organizationId,
    deletedAt: null,
  };

  // Apply filters
  if (category) query.categoryId = category; // Now expecting ObjectId in filters
  if (metalType) query['metal.type'] = metalType;
  if (purity) query['metal.purity'] = purity;
  if (status) query.status = status;
  if (saleStatus) query.saleStatus = saleStatus;
  if (gender) query.gender = gender;
  if (isActive !== undefined) query.isActive = isActive;
  if (isFeatured !== undefined) query.isFeatured = isFeatured;

  // Price range filter
  if (minPrice || maxPrice) {
    query['pricing.sellingPrice'] = {};
    if (minPrice) query['pricing.sellingPrice'].$gte = parseFloat(minPrice);
    if (maxPrice) query['pricing.sellingPrice'].$lte = parseFloat(maxPrice);
  }

  // Search filter
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { productCode: new RegExp(search, 'i') },
      { barcode: new RegExp(search, 'i') },
      { huid: new RegExp(search, 'i') },
      { tags: new RegExp(search, 'i') },
    ];
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('supplierId', 'name code contactPerson phone')
      .populate('categoryId', 'name code') // ADD THIS
      .populate('subCategoryId', 'name code') // ADD THIS
      .lean(),
    Product.countDocuments(query),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    products,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      pageSize: parseInt(limit),
      totalItems: total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}


export async function getProductById(productId, shopId, organizationId) {
  const cacheKey = cache.productKey(productId);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const product = await Product.findOne({
    _id: productId,
    shopId,
    organizationId,
    deletedAt: null,
  })
    .populate('supplierId', 'name code contactPerson phone email')
    .populate('categoryId', 'name code') 
    .populate('subCategoryId', 'name code') 
    .populate('createdBy', 'firstName lastName email')
    .populate('updatedBy', 'firstName lastName email')
    .lean();

  if (!product) {
    throw new ProductNotFoundError('Product not found');
  }
  cache.set(cacheKey, product, 1800);

  return product;
}


export async function updateProduct(productId, shopId, organizationId, updateData, userId) {
  const product = await Product.findOne({
    _id: productId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!product) {
    throw new ProductNotFoundError('Product not found');
  }

  if (updateData.productCode) {
    delete updateData.productCode;
  }

  if (
    updateData.weight?.grossWeight ||
    updateData.weight?.stoneWeight ||
    updateData.makingCharges
  ) {
    const metalRates = await MetalRate.getCurrentRate(shopId);
    if (metalRates) {
      const pricing = await calculateProductPrice(
        {
          ...product.toObject(),
          ...updateData,
        },
        metalRates
      );
      updateData.pricing = { ...product.pricing, ...pricing };
    }
  }

  if (updateData.stock?.quantity !== undefined) {
    const newQuantity = updateData.stock.quantity;
    const reorderLevel = updateData.stock.reorderLevel || product.stock.reorderLevel || 0;

    if (newQuantity === 0) {
      updateData.stock.status = 'out_of_stock';
    } else if (newQuantity <= reorderLevel) {
      updateData.stock.status = 'low_stock';
    } else {
      updateData.stock.status = 'in_stock';
    }
  }


  let finalCategoryId = updateData.categoryId;
  let finalSubCategoryId = updateData.subCategoryId;

  if (finalCategoryId === 'OTHER') {
    finalCategoryId = process.env.OTHER_CATEGORY_ID;
  }
  if (finalSubCategoryId === 'OTHER_MISC') {
    finalSubCategoryId = process.env.OTHER_SUBCATEGORY_ID;
  }

  if (finalCategoryId) {
    const categoryExists = await Category.findOne({
      _id: finalCategoryId,
      isActive: true,
      parentId: null,
    });

    if (!categoryExists) {
      throw new ValidationError('Invalid category selected');
    }
  }

  if (finalSubCategoryId) {
    const subCategoryExists = await Category.findOne({
      _id: finalSubCategoryId,
      isActive: true,
      parentId: finalCategoryId || product.categoryId,
    });

    if (!subCategoryExists) {
      throw new ValidationError('Invalid subcategory selected');
    }
  }

  updateData.categoryId = finalCategoryId;
  updateData.subCategoryId = finalSubCategoryId;

  Object.assign(product, updateData);
  product.updatedBy = userId;
  await product.save();

  cache.del(cache.productKey(productId));
  cache.deletePattern(`products:${shopId}:*`);
  await eventLogger.logProduct(
    userId,
    organizationId,
    shopId,
    'update',
    product._id,
    `Updated product: ${product.name}`,
    { updatedFields: Object.keys(updateData) }
  );

  return product;
}


export async function deleteProduct(productId, shopId, organizationId, userId) {
  const product = await Product.findOne({
    _id: productId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!product) {
    throw new ProductNotFoundError('Product not found');
  }

  await product.softDelete();

  const shop = await JewelryShop.findById(shopId);
  if (shop) {
    shop.statistics.totalProducts = Math.max(0, shop.statistics.totalProducts - 1);
    shop.statistics.totalInventoryValue = Math.max(
      0,
      shop.statistics.totalInventoryValue - product.pricing.sellingPrice * product.stock.quantity
    );
    await shop.save();
  }
  cache.del(cache.productKey(productId));
  cache.deletePattern(`products:${shopId}:*`);

  await eventLogger.logProduct(
    userId,
    organizationId,
    shopId,
    'delete',
    product._id,
    `Deleted product: ${product.name}`,
    { productCode: product.productCode }
  );

  return { success: true };
}


export async function updateStock(productId, shopId, organizationId, stockData, userId) {
  const { operation, quantity, reason, referenceType, referenceId } = stockData;

  const product = await Product.findOne({
    _id: productId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!product) {
    throw new ProductNotFoundError('Product not found');
  }

  const previousQuantity = product.stock.quantity;
  let newQuantity;

  switch (operation) {
    case 'add':
      newQuantity = previousQuantity + quantity;
      break;
    case 'subtract':
      newQuantity = previousQuantity - quantity;
      if (newQuantity < 0) {
        throw new InsufficientStockError('Insufficient stock available');
      }
      break;
    case 'set':
      newQuantity = quantity;
      break;
    default:
      throw new ValidationError('Invalid operation');
  }


  const transactionType =
    operation === 'add' ? 'IN' : operation === 'subtract' ? 'OUT' : 'ADJUSTMENT';

await adjustStock({
  organizationId,
  shopId,
  productId: product._id,
  newQuantity,
  reason: reason || `Stock ${operation}`,
  performedBy: userId,
});

  cache.del(cache.productKey(productId));
  cache.deletePattern(`products:${shopId}:*`);
  await eventLogger.logProduct(
    userId,
    organizationId,
    shopId,
    'stock_update',
    product._id,
    `Updated stock for ${product.name}: ${operation} ${quantity}`,
    { previousQuantity, newQuantity, operation }
  );

  return {
    productId: product._id,
    previousQuantity,
    newQuantity,
    status: product.status,
    transaction: {
      transactionType,
      quantity: Math.abs(quantity),
      referenceType,
      referenceId,
    },
  };
}


export async function reserveProduct(productId, shopId, organizationId, reservationData, userId) {
  const { customerId, reservationDays = 7, notes } = reservationData;

  const product = await Product.findOne({
    _id: productId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!product) {
    throw new ProductNotFoundError('Product not found');
  }

  if (product.saleStatus === 'sold') {
    throw new ValidationError('Product is already sold');
  }

  if (product.saleStatus === 'reserved') {
    throw new ValidationError('Product is already reserved');
  }

  if (product.stock.quantity < 1) {
    throw new InsufficientStockError('Product is out of stock');
  }

  await product.reserveProduct(customerId, reservationDays);

  await InventoryTransaction.create({
    organizationId,
    shopId,
    productId: product._id,
    productCode: product.productCode,
    transactionType: 'RESERVED',
    quantity: 1,
    previousQuantity: product.stock.quantity,
    newQuantity: product.stock.quantity,
    transactionDate: new Date(),
    referenceType: 'reservation',
    performedBy: userId,
    reason: notes || 'Product reserved for customer',
    metadata: { customerId, reservationDays },
  });
  cache.del(cache.productKey(productId));

  await eventLogger.logProduct(
    userId,
    organizationId,
    shopId,
    'reserve',
    product._id,
    `Reserved product: ${product.name}`,
    { customerId, expiryDate: product.reservedFor.expiryDate }
  );

  return {
    saleStatus: product.saleStatus,
    reservedFor: product.reservedFor,
  };
}


export async function cancelReservation(productId, shopId, organizationId, userId) {
  const product = await Product.findOne({
    _id: productId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!product) {
    throw new ProductNotFoundError('Product not found');
  }

  if (product.saleStatus !== 'reserved') {
    throw new ValidationError('Product is not reserved');
  }

  const customerId = product.reservedFor?.customerId;

  await product.cancelReservation();

  await InventoryTransaction.create({
    organizationId,
    shopId,
    productId: product._id,
    productCode: product.productCode,
    transactionType: 'UNRESERVED',
    quantity: 1,
    previousQuantity: product.stock.quantity,
    newQuantity: product.stock.quantity,
    transactionDate: new Date(),
    referenceType: 'reservation',
    performedBy: userId,
    reason: 'Reservation cancelled',
    metadata: { customerId },
  });

  cache.del(cache.productKey(productId));
  await eventLogger.logProduct(
    userId,
    organizationId,
    shopId,
    'unreserve',
    product._id,
    `Cancelled reservation: ${product.name}`,
    { customerId }
  );

  return { saleStatus: product.saleStatus };
}

export async function markAsSold(productId, shopId, organizationId, saleData, userId) {
  const { customerId, saleId } = saleData;

  const product = await Product.findOne({
    _id: productId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!product) {
    throw new ProductNotFoundError('Product not found');
  }

  if (product.saleStatus === 'sold') {
    throw new ValidationError('Product is already sold');
  }

  if (product.stock.quantity < 1) {
    throw new InsufficientStockError('Product is out of stock');
  }
  await product.markAsSold(customerId);

  await InventoryTransaction.create({
    organizationId,
    shopId,
    productId: product._id,
    productCode: product.productCode,
    transactionType: 'SALE',
    quantity: 1,
    previousQuantity: product.stock.quantity + 1,
    newQuantity: product.stock.quantity,
    transactionDate: new Date(),
    referenceType: 'sale',
    referenceId: saleId || null,
    performedBy: userId,
    reason: 'Product sold',
    value: product.pricing.sellingPrice,
    metadata: { customerId },
  });

  cache.del(cache.productKey(productId));
  cache.deletePattern(`products:${shopId}:*`);
  await eventLogger.logProduct(
    userId,
    organizationId,
    shopId,
    'sold',
    product._id,
    `Sold product: ${product.name}`,
    { customerId, saleId }
  );

  return {
    saleStatus: product.saleStatus,
    soldDate: product.soldDate,
    stock: product.stock,
  };
}

export async function recalculatePrice(productId, shopId, organizationId, priceData, userId) {
  const { useCurrentRate = true, customRate, customRates } = priceData;

  const product = await Product.findOne({
    _id: productId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!product) {
    throw new ProductNotFoundError('Product not found');
  }

  const oldPrice = product.pricing.sellingPrice;

  let metalRates;
  if (useCurrentRate) {
    metalRates = await MetalRate.getCurrentRate(shopId);
    if (!metalRates) {
      throw new ValidationError('Current metal rates not found');
    }
} else if (customRate || customRates) {
  metalRates = {
    gold: {
      gold24K: { sellingRate: customRates?.gold || customRate },
      gold22K: { sellingRate: customRates?.gold || customRate },
      gold18K: { sellingRate: customRates?.gold || customRate },
    },
    silver: {
      pure:     { sellingRate: customRates?.silver || customRate },
      sterling: { sellingRate: customRates?.silver || customRate },
    },
    platinum: { sellingRate: customRates?.platinum || customRate },
  };
  } else {
    throw new ValidationError('Either useCurrentRate or customRate must be provided');
  }

  await product.calculatePrice(metalRates);

  const newPrice = product.pricing.sellingPrice;
  const difference = newPrice - oldPrice;
  const differencePercentage = oldPrice > 0 ? (difference / oldPrice) * 100 : 0;

  cache.del(cache.productKey(productId));

  await eventLogger.logProduct(
    userId,
    organizationId,
    shopId,
    'price_recalculate',
    product._id,
    `Recalculated price for ${product.name}`,
    { oldPrice, newPrice, difference, differencePercentage }
  );

  return {
    oldPrice,
    newPrice,
    difference,
    differencePercentage: parseFloat(differencePercentage.toFixed(2)),
    pricing: product.pricing,
  };
}


export async function getLowStockProducts(shopId, organizationId, threshold) {
  const query = {
    shopId,
    organizationId,
    deletedAt: null,
    isActive: true,
    $or: [{ status: 'low_stock' }, { status: 'out_of_stock' }],
  };

  if (threshold !== undefined) {
    query.$or = [{ 'stock.quantity': { $lte: threshold } }, { status: 'out_of_stock' }];
  }
  const products = await Product.find(query)
    .sort({ 'stock.quantity': 1 })
    .select('name productCode categoryId subCategoryId stock pricing primaryImage')
    .populate('categoryId', 'name code')
    .populate('subCategoryId', 'name code')
    .lean();
  const criticalItems = products.filter(p => p.stock.quantity === 0).length;

  return {
    products,
    meta: {
      totalLowStockItems: products.length,
      criticalItems,
    },
  };
}

export async function searchProducts(shopId, organizationId, searchQuery, limit = 10) {
  const query = {
    shopId,
    organizationId,
    deletedAt: null,
    isActive: true,
    saleStatus: 'available',
    $or: [
      { name: new RegExp(searchQuery, 'i') },
      { productCode: new RegExp(searchQuery, 'i') },
      { barcode: new RegExp(searchQuery, 'i') },
      { huid: new RegExp(searchQuery, 'i') },
      { tags: new RegExp(searchQuery, 'i') },
    ],
  };

  const products = await Product.find(query)
    .limit(parseInt(limit))
    .select(
      'name productCode categoryId subCategoryId metal weight pricing stock primaryImage saleStatus'
    )
    .populate('categoryId', 'name code')
    .populate('subCategoryId', 'name code')
    .lean();

  return products;
}

export async function getProductHistory(productId, shopId, organizationId, limit = 50) {
  const product = await Product.findOne({
    _id: productId,
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (!product) {
    throw new ProductNotFoundError('Product not found');
  }

  const history = await InventoryTransaction.getProductHistory(productId, limit);

  return {
    product: {
      _id: product._id,
      name: product.name,
      productCode: product.productCode,
    },
    history,
  };
}


export async function bulkDeleteProducts(productIds, shopId, organizationId, userId) {
  const products = await Product.find({
    _id: { $in: productIds },
    shopId,
    organizationId,
    deletedAt: null,
  });

  if (products.length === 0) {
    throw new ProductNotFoundError('No products found to delete');
  }

  const deletedCount = products.length;

  for (const product of products) {
    await product.softDelete();
  }

  const shop = await JewelryShop.findById(shopId);
  if (shop) {
    shop.statistics.totalProducts = Math.max(0, shop.statistics.totalProducts - deletedCount);
    await shop.save();
  }

  cache.deletePattern(`products:${shopId}:*`);

  await eventLogger.logActivity({
    userId,
    organizationId,
    shopId,
    action: 'bulk_delete',
    module: 'product',
    description: `Bulk deleted ${deletedCount} products`,
    level: 'info',
    metadata: { productIds, deletedCount },
  });

  return { deletedCount };
}


export async function bulkUpdateStatus(productIds, shopId, organizationId, status, userId) {
  const result = await Product.updateMany(
    {
      _id: { $in: productIds },
      shopId,
      organizationId,
      deletedAt: null,
    },
    {
      $set: {
        status,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount === 0) {
    throw new ProductNotFoundError('No products found to update');
  }
  cache.deletePattern(`products:${shopId}:*`);

  await eventLogger.logActivity({
    userId,
    organizationId,
    shopId,
    action: 'bulk_update_status',
    module: 'product',
    description: `Bulk updated status to ${status} for ${result.modifiedCount} products`,
    level: 'info',
    metadata: { productIds, status, modifiedCount: result.modifiedCount },
  });

  return { modifiedCount: result.modifiedCount };
}