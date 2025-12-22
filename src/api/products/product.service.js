import Product from '../../models/Product.js';
import MetalRate from '../../models/MetalRate.js';
import InventoryTransaction from '../../models/InventoryTransaction.js';
import JewelryShop from '../../models/Shop.js';
import eventLogger from '../../utils/eventLogger.js';
import cache from '../../utils/cache.js';
import {
  ProductNotFoundError,
  ValidationError,
  InsufficientStockError,
  DuplicateProductCodeError,
} from '../../utils/AppError.js';

class ProductService {
  // ============================================
  // CREATE PRODUCT
  // ============================================
  async createProduct(productData, shopId, organizationId, userId) {
    // 1. Generate product code
    const productCode = await Product.generateProductCode(shopId, 'PRD');

    // 2. Get current metal rates
    const metalRates = await MetalRate.getCurrentRate(shopId);
    if (!metalRates) {
      throw new ValidationError('Metal rates not found for this shop. Please set metal rates first.');
    }

    // 3. Calculate net weight
    const grossWeight = parseFloat(productData.weight?.grossWeight) || 0;
    const stoneWeight = parseFloat(productData.weight?.stoneWeight) || 0;
    const netWeight = grossWeight - stoneWeight;

    // 4. Calculate pricing
    const pricing = await this.calculateProductPrice(
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

    // 5. Process stones
    if (productData.stones && productData.stones.length > 0) {
      productData.stones.forEach((stone) => {
        stone.totalStonePrice = (stone.stonePrice || 0) * (stone.pieceCount || 1);
      });
    }

    // 6. Set initial stock status
    const quantity = productData.stock?.quantity || 1;
    const reorderLevel = productData.stock?.reorderLevel || 0;
    let stockStatus = 'in_stock';

    if (quantity === 0) {
      stockStatus = 'out_of_stock';
    } else if (quantity <= reorderLevel && quantity > 0) {
      stockStatus = 'low_stock';
    }

    // 7. Create product
    const product = await Product.create({
      organizationId,
      shopId,
      productCode,
      ...productData,
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

    // 8. Create inventory transaction
    await InventoryTransaction.create({
      organizationId,
      shopId,
      productId: product._id,
      productCode: product.productCode,
      transactionType: 'IN',
      quantity: product.stock.quantity,
      previousQuantity: 0,
      newQuantity: product.stock.quantity,
      transactionDate: new Date(),
      referenceType: 'product_creation',
      referenceId: product._id,
      performedBy: userId,
      reason: 'Initial stock entry',
      value: product.pricing.sellingPrice * product.stock.quantity,
    });

    // 9. Update shop statistics
    const shop = await JewelryShop.findById(shopId);
    if (shop) {
      shop.statistics.totalProducts += 1;
      shop.statistics.totalInventoryValue += product.pricing.sellingPrice * product.stock.quantity;
      await shop.save();
    }

    // 10. Log activity
    await eventLogger.logProduct(
      userId,
      organizationId,
      shopId,
      'create',
      product._id,
      `Created product: ${product.name}`,
      {
        productCode: product.productCode,
        category: product.category,
        metalType: product.metal.type,
        quantity: product.stock.quantity,
      }
    );

    // 11. Cache product
    cache.set(cache.productKey(product._id), product.toJSON(), 1800);

    return product;
  }

  // ============================================
  // CALCULATE PRODUCT PRICE
  // ============================================
  async calculateProductPrice(productData, metalRates) {
    const { metal, weight, makingCharges, stones, pricing } = productData;

    // 1. Get metal rate based on type and purity
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

    // 2. Calculate metal value
    const netWeight = weight.netWeight || 0;
    const metalValue = netWeight * metalRate;

    // 3. Calculate making charges
    let makingChargesAmount = 0;
    if (makingCharges?.type === 'per_gram') {
      makingChargesAmount = netWeight * (makingCharges.value || 0);
    } else if (makingCharges?.type === 'percentage') {
      makingChargesAmount = (metalValue * (makingCharges.value || 0)) / 100;
    } else if (makingCharges?.type === 'flat') {
      makingChargesAmount = makingCharges.value || 0;
    }

    // 4. Calculate stone value
    const stoneValue = stones?.reduce((sum, stone) => {
      return sum + ((stone.stonePrice || 0) * (stone.pieceCount || 1));
    }, 0) || 0;

    // 5. Calculate other charges
    const otherCharges = pricing?.otherCharges || 0;

    // 6. Calculate subtotal
    const subtotal = metalValue + stoneValue + makingChargesAmount + otherCharges;

    // 7. Apply discount
    let discountAmount = 0;
    if (pricing?.discount?.type === 'percentage') {
      discountAmount = (subtotal * (pricing.discount.value || 0)) / 100;
    } else if (pricing?.discount?.type === 'flat') {
      discountAmount = pricing.discount.value || 0;
    }

    const afterDiscount = subtotal - discountAmount;

    // 8. Calculate GST
    const gstPercentage = pricing?.gst?.percentage || 3;
    const gstAmount = (afterDiscount * gstPercentage) / 100;

    // 9. Calculate total price
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

  // ============================================
  // GET ALL PRODUCTS
  // ============================================
  async getProducts(shopId, organizationId, filters = {}, options = {}) {
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
    if (category) query.category = category;
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

  // ============================================
  // GET PRODUCT BY ID
  // ============================================
  async getProductById(productId, shopId, organizationId) {
    // Check cache first
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
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .lean();

    if (!product) {
      throw new ProductNotFoundError('Product not found');
    }

    // Cache product
    cache.set(cacheKey, product, 1800);

    return product;
  }

  // ============================================
  // UPDATE PRODUCT
  // ============================================
  async updateProduct(productId, shopId, organizationId, updateData, userId) {
    const product = await Product.findOne({
      _id: productId,
      shopId,
      organizationId,
      deletedAt: null,
    });

    if (!product) {
      throw new ProductNotFoundError('Product not found');
    }

    // Cannot update productCode
    if (updateData.productCode) {
      delete updateData.productCode;
    }

    // If weight or rates change, recalculate pricing
    if (
      updateData.weight?.grossWeight ||
      updateData.weight?.stoneWeight ||
      updateData.makingCharges
    ) {
      const metalRates = await MetalRate.getCurrentRate(shopId);
      if (metalRates) {
        const pricing = await this.calculateProductPrice(
          {
            ...product.toObject(),
            ...updateData,
          },
          metalRates
        );
        updateData.pricing = { ...product.pricing, ...pricing };
      }
    }

    // Update stock status automatically if quantity changes
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

    // Apply updates
    Object.assign(product, updateData);
    product.updatedBy = userId;
    await product.save();

    // Invalidate cache
    cache.del(cache.productKey(productId));
    cache.deletePattern(`products:${shopId}:*`);

    // Log activity
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

  // ============================================
  // DELETE PRODUCT (SOFT DELETE)
  // ============================================
  async deleteProduct(productId, shopId, organizationId, userId) {
    const product = await Product.findOne({
      _id: productId,
      shopId,
      organizationId,
      deletedAt: null,
    });

    if (!product) {
      throw new ProductNotFoundError('Product not found');
    }

    // Check if product is in any pending sale/order
    // You can add additional checks here

    // Soft delete
    await product.softDelete();

    // Update shop statistics
    const shop = await JewelryShop.findById(shopId);
    if (shop) {
      shop.statistics.totalProducts = Math.max(0, shop.statistics.totalProducts - 1);
      shop.statistics.totalInventoryValue = Math.max(
        0,
        shop.statistics.totalInventoryValue - product.pricing.sellingPrice * product.stock.quantity
      );
      await shop.save();
    }

    // Invalidate cache
    cache.del(cache.productKey(productId));
    cache.deletePattern(`products:${shopId}:*`);

    // Log activity
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

  // ============================================
  // UPDATE STOCK
  // ============================================
  async updateStock(productId, shopId, organizationId, stockData, userId) {
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

    // Perform operation
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

    // Update product stock
    await product.updateStock(newQuantity, 'set');

    // Create inventory transaction
    const transactionType = operation === 'add' ? 'IN' : operation === 'subtract' ? 'OUT' : 'ADJUSTMENT';

    await InventoryTransaction.create({
      organizationId,
      shopId,
      productId: product._id,
      productCode: product.productCode,
      transactionType,
      quantity: Math.abs(quantity),
      previousQuantity,
      newQuantity,
      transactionDate: new Date(),
      referenceType: referenceType || 'stock_update',
      referenceId: referenceId || null,
      performedBy: userId,
      reason: reason || `Stock ${operation}`,
      value: product.pricing.sellingPrice * Math.abs(quantity),
    });

    // Invalidate cache
    cache.del(cache.productKey(productId));
    cache.deletePattern(`products:${shopId}:*`);

    // Log activity
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

  // ============================================
  // RESERVE PRODUCT
  // ============================================
  async reserveProduct(productId, shopId, organizationId, reservationData, userId) {
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

    // Reserve product
    await product.reserveProduct(customerId, reservationDays);

    // Create inventory transaction
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

    // Invalidate cache
    cache.del(cache.productKey(productId));

    // Log activity
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

  // ============================================
  // CANCEL RESERVATION
  // ============================================
  async cancelReservation(productId, shopId, organizationId, userId) {
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

    // Cancel reservation
    await product.cancelReservation();

    // Create inventory transaction
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

    // Invalidate cache
    cache.del(cache.productKey(productId));

    // Log activity
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

  // ============================================
  // MARK AS SOLD
  // ============================================
  async markAsSold(productId, shopId, organizationId, saleData, userId) {
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

    // Mark as sold
    await product.markAsSold(customerId);

    // Create inventory transaction
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

    // Invalidate cache
    cache.del(cache.productKey(productId));
    cache.deletePattern(`products:${shopId}:*`);

    // Log activity
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

  // ============================================
  // CALCULATE/RECALCULATE PRICE
  // ============================================
  async recalculatePrice(productId, shopId, organizationId, priceData, userId) {
    const { useCurrentRate = true, customRate } = priceData;

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
    } else if (customRate) {
      // Use custom rate (create mock metalRates object)
      metalRates = {
        gold: {
          gold24K: { sellingRate: customRate },
          gold22K: { sellingRate: customRate },
          gold18K: { sellingRate: customRate },
        },
        silver: {
          pure: { sellingRate: customRate },
          sterling: { sellingRate: customRate },
        },
        platinum: { sellingRate: customRate },
      };
    } else {
      throw new ValidationError('Either useCurrentRate or customRate must be provided');
    }

    // Recalculate pricing
    await product.calculatePrice(metalRates);

    const newPrice = product.pricing.sellingPrice;
    const difference = newPrice - oldPrice;
    const differencePercentage = oldPrice > 0 ? (difference / oldPrice) * 100 : 0;

    // Invalidate cache
    cache.del(cache.productKey(productId));

    // Log activity
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

  // ============================================
  // GET LOW STOCK PRODUCTS
  // ============================================
  async getLowStockProducts(shopId, organizationId, threshold) {
    const query = {
      shopId,
      organizationId,
      deletedAt: null,
      isActive: true,
      $or: [
        { status: 'low_stock' },
        { status: 'out_of_stock' },
      ],
    };

    // If custom threshold provided
    if (threshold !== undefined) {
      query.$or = [
        { 'stock.quantity': { $lte: threshold } },
        { status: 'out_of_stock' },
      ];
    }

    const products = await Product.find(query)
      .sort({ 'stock.quantity': 1 })
      .select('name productCode category stock pricing primaryImage')
      .lean();

    const criticalItems = products.filter((p) => p.stock.quantity === 0).length;

    return {
      products,
      meta: {
        totalLowStockItems: products.length,
        criticalItems,
      },
    };
  }

  // ============================================
  // SEARCH PRODUCTS (QUICK SEARCH FOR POS)
  // ============================================
  async searchProducts(shopId, organizationId, searchQuery, limit = 10) {
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
      .select('name productCode category metal weight pricing stock primaryImage saleStatus')
      .lean();

    return products;
  }

  // ============================================
  // GET PRODUCT HISTORY
  // ============================================
  async getProductHistory(productId, shopId, organizationId, limit = 50) {
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

  // ============================================
  // BULK DELETE PRODUCTS
  // ============================================
  async bulkDeleteProducts(productIds, shopId, organizationId, userId) {
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

    // Soft delete all products
    for (const product of products) {
      await product.softDelete();
    }

    // Update shop statistics
    const shop = await JewelryShop.findById(shopId);
    if (shop) {
      shop.statistics.totalProducts = Math.max(0, shop.statistics.totalProducts - deletedCount);
      await shop.save();
    }

    // Invalidate cache
    cache.deletePattern(`products:${shopId}:*`);

    // Log activity
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

  // ============================================
  // BULK UPDATE STATUS
  // ============================================
  async bulkUpdateStatus(productIds, shopId, organizationId, status, userId) {
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

    // Invalidate cache
    cache.deletePattern(`products:${shopId}:*`);

    // Log activity
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
}

export default new ProductService();