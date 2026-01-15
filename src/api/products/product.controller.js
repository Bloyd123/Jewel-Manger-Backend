import * as productService from './product.service.js';
import { validationResult } from 'express-validator';
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendValidationError,
  sendPaginated,
} from '../../utils/sendResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import { ValidationError } from '../../utils/AppError.js';
import Product from '../../models/Product.js';

// CREATE PRODUCT
export const createProduct = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const shopId = req.params.shopId || req.body.shopId;
  const organizationId = req.user.organizationId;
  const userId = req.user._id;

  const product = await productService.createProduct(req.body, shopId, organizationId, userId);

  return sendCreated(res, 'Product created successfully', product);
});

// GET ALL PRODUCTS
export const getProducts = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const shopId = req.params.shopId || req.query.shopId;
  const organizationId = req.user.organizationId;

  const { products, pagination } = await productService.getProducts(
    shopId,
    organizationId,
    req.query,
    { user: req.user }
  );

  return sendPaginated(
    res,
    products,
    pagination.currentPage,
    pagination.pageSize,
    pagination.totalItems,
    'Products retrieved successfully'
  );
});

// GET SINGLE PRODUCT
export const getProductById = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { id } = req.params;
  const shopId = req.params.shopId || req.query.shopId;
  const organizationId = req.user.organizationId;

  const product = await productService.getProductById(id, shopId, organizationId);

  return sendSuccess(res, 200, 'Product retrieved successfully', product);
});

// UPDATE PRODUCT
export const updateProduct = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { id } = req.params;
  const shopId = req.params.shopId || req.body.shopId;
  const organizationId = req.user.organizationId;
  const userId = req.user._id;

  const product = await productService.updateProduct(id, shopId, organizationId, req.body, userId);

  return sendSuccess(res, 200, 'Product updated successfully', product);
});

// DELETE PRODUCT
export const deleteProduct = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { id } = req.params;
  const shopId = req.params.shopId || req.query.shopId;
  const organizationId = req.user.organizationId;
  const userId = req.user._id;

  await productService.deleteProduct(id, shopId, organizationId, userId);

  return sendNoContent(res);
});

// UPDATE STOCK
export const updateStock = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { id } = req.params;
  const shopId = req.params.shopId || req.body.shopId;
  const organizationId = req.user.organizationId;
  const userId = req.user._id;

  const result = await productService.updateStock(id, shopId, organizationId, req.body, userId);

  return sendSuccess(res, 200, 'Stock updated successfully', result);
});

// RESERVE PRODUCT
export const reserveProduct = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { id } = req.params;
  const shopId = req.params.shopId || req.body.shopId;
  const organizationId = req.user.organizationId;
  const userId = req.user._id;

  const result = await productService.reserveProduct(id, shopId, organizationId, req.body, userId);

  return sendSuccess(res, 200, 'Product reserved successfully', result);
});

// CANCEL RESERVATION
export const cancelReservation = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { id } = req.params;
  const shopId = req.params.shopId || req.body.shopId;
  const organizationId = req.user.organizationId;
  const userId = req.user._id;

  const result = await productService.cancelReservation(id, shopId, organizationId, userId);

  return sendSuccess(res, 200, 'Reservation cancelled successfully', result);
});

// MARK AS SOLD
export const markAsSold = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { id } = req.params;
  const shopId = req.params.shopId || req.body.shopId;
  const organizationId = req.user.organizationId;
  const userId = req.user._id;

  const result = await productService.markAsSold(id, shopId, organizationId, req.body, userId);

  return sendSuccess(res, 200, 'Product marked as sold successfully', result);
});

// CALCULATE/RECALCULATE PRICE
export const calculatePrice = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { id } = req.params;
  const shopId = req.params.shopId || req.body.shopId;
  const organizationId = req.user.organizationId;
  const userId = req.user._id;

  const result = await productService.recalculatePrice(
    id,
    shopId,
    organizationId,
    req.body,
    userId
  );

  return sendSuccess(res, 200, 'Price recalculated successfully', result);
});

// GET LOW STOCK PRODUCTS
export const getLowStock = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const shopId = req.params.shopId || req.query.shopId;
  const organizationId = req.user.organizationId;
  const threshold = req.query.threshold ? parseInt(req.query.threshold) : undefined;

  const result = await productService.getLowStockProducts(shopId, organizationId, threshold);

  return sendSuccess(res, 200, 'Low stock products retrieved successfully', result.products, {
    ...result.meta,
  });
});

// SEARCH PRODUCTS
export const searchProducts = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const shopId = req.params.shopId || req.query.shopId;
  const organizationId = req.user.organizationId;
  const { q: searchQuery, limit } = req.query;

  const products = await productService.searchProducts(shopId, organizationId, searchQuery, limit);

  return sendSuccess(res, 200, 'Search results', products);
});

// GET PRODUCT HISTORY
export const getProductHistory = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const { id } = req.params;
  const shopId = req.params.shopId || req.query.shopId;
  const organizationId = req.user.organizationId;
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;

  const result = await productService.getProductHistory(id, shopId, organizationId, limit);

  return sendSuccess(res, 200, 'Product history retrieved successfully', result);
});

// BULK DELETE PRODUCTS
export const bulkDeleteProducts = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const shopId = req.params.shopId || req.body.shopId;
  const organizationId = req.user.organizationId;
  const userId = req.user._id;
  const { productIds } = req.body;

  const result = await productService.bulkDeleteProducts(
    productIds,
    shopId,
    organizationId,
    userId
  );

  return sendSuccess(res, 200, `${result.deletedCount} products deleted successfully`, result);
});

// BULK UPDATE STATUS
export const bulkUpdateStatus = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const shopId = req.params.shopId || req.body.shopId;
  const organizationId = req.user.organizationId;
  const userId = req.user._id;
  const { productIds, status } = req.body;

  const result = await productService.bulkUpdateStatus(
    productIds,
    shopId,
    organizationId,
    status,
    userId
  );

  return sendSuccess(res, 200, `${result.modifiedCount} products updated successfully`, result);
});

// GET PRODUCT ANALYTICS
export const getProductAnalytics = catchAsync(async (req, res, next) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  const shopId = req.params.shopId || req.query.shopId;
  const organizationId = req.user.organizationId;

  const [
    totalProducts,
    activeProducts,
    lowStockCount,
    outOfStockCount,
    totalInventoryValue,
    categoryBreakdown,
  ] = await Promise.all([
    Product.countDocuments({ shopId, organizationId, deletedAt: null }),
    Product.countDocuments({ shopId, organizationId, isActive: true, deletedAt: null }),
    Product.countDocuments({
      shopId,
      organizationId,
      status: 'low_stock',
      deletedAt: null,
    }),
    Product.countDocuments({
      shopId,
      organizationId,
      status: 'out_of_stock',
      deletedAt: null,
    }),
    Product.aggregate([
      { $match: { shopId, organizationId, deletedAt: null } },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: {
              $multiply: ['$pricing.sellingPrice', '$stock.quantity'],
            },
          },
        },
      },
    ]),
    Product.aggregate([
      { $match: { shopId, organizationId, deletedAt: null } },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
          totalValue: {
            $sum: {
              $multiply: ['$pricing.sellingPrice', '$stock.quantity'],
            },
          },
        },
      },
      { $sort: { count: -1 } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      {
        $addFields: {
          categoryName: { $arrayElemAt: ['$categoryDetails.name.default', 0] },
        },
      },
    ]),
  ]);

  const analytics = {
    overview: {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      lowStockCount,
      outOfStockCount,
      totalInventoryValue: totalInventoryValue[0]?.totalValue || 0,
    },
    categoryBreakdown,
  };

  return sendSuccess(res, 200, 'Product analytics retrieved successfully', analytics);
});
