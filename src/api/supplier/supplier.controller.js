import supplierService from './supplier.service.js';
import { catchAsync } from '../middlewares/errorHandler.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/sendResponse.js';

/**
 * @desc    Create new supplier
 * @route   POST /api/v1/suppliers
 * @access  Private (Shop Admin, Manager)
 */
export const createSupplier = catchAsync(async (req, res) => {
  const supplier = await supplierService.createSupplier(
    req.body,
    req.user._id,
    req.user.organizationId,
    req.body.shopId || req.user.primaryShop
  );

  sendCreated(res, 'Supplier created successfully', supplier);
});

/**
 * @desc    Get all suppliers for a shop
 * @route   GET /api/v1/suppliers
 * @access  Private
 */
export const getSuppliers = catchAsync(async (req, res) => {
  const shopId = req.query.shopId || req.user.primaryShop;

  const result = await supplierService.getSuppliers(shopId, req.user.organizationId, req.query, {
    page: req.query.page,
    limit: req.query.limit,
  });

  sendPaginated(
    res,
    result.suppliers,
    result.pagination.page,
    result.pagination.limit,
    result.pagination.total,
    'Suppliers fetched successfully'
  );
});

/**
 * @desc    Get supplier by ID
 * @route   GET /api/v1/suppliers/:id
 * @access  Private
 */
export const getSupplierById = catchAsync(async (req, res) => {
  const shopId = req.query.shopId || req.user.primaryShop;

  const supplier = await supplierService.getSupplierById(
    req.params.id,
    shopId,
    req.user.organizationId
  );

  sendSuccess(res, 200, 'Supplier fetched successfully', supplier);
});

/**
 * @desc    Update supplier
 * @route   PATCH /api/v1/suppliers/:id
 * @access  Private (Shop Admin, Manager)
 */
export const updateSupplier = catchAsync(async (req, res) => {
  const shopId = req.body.shopId || req.user.primaryShop;

  const supplier = await supplierService.updateSupplier(
    req.params.id,
    req.body,
    req.user._id,
    shopId,
    req.user.organizationId
  );

  sendSuccess(res, 200, 'Supplier updated successfully', supplier);
});

/**
 * @desc    Delete supplier (soft delete)
 * @route   DELETE /api/v1/suppliers/:id
 * @access  Private (Shop Admin, Manager)
 */
export const deleteSupplier = catchAsync(async (req, res) => {
  const shopId = req.query.shopId || req.user.primaryShop;

  await supplierService.deleteSupplier(
    req.params.id,
    req.user._id,
    shopId,
    req.user.organizationId
  );

  sendSuccess(res, 200, 'Supplier deleted successfully');
});

/**
 * @desc    Restore deleted supplier
 * @route   POST /api/v1/suppliers/:id/restore
 * @access  Private (Shop Admin, Manager)
 */
export const restoreSupplier = catchAsync(async (req, res) => {
  const shopId = req.body.shopId || req.user.primaryShop;

  const supplier = await supplierService.restoreSupplier(
    req.params.id,
    req.user._id,
    shopId,
    req.user.organizationId
  );

  sendSuccess(res, 200, 'Supplier restored successfully', supplier);
});

/**
 * @desc    Update supplier rating
 * @route   PATCH /api/v1/suppliers/:id/rating
 * @access  Private (Shop Admin, Manager)
 */
export const updateRating = catchAsync(async (req, res) => {
  const shopId = req.body.shopId || req.user.primaryShop;

  const supplier = await supplierService.updateRating(
    req.params.id,
    {
      qualityRating: req.body.qualityRating,
      deliveryRating: req.body.deliveryRating,
      priceRating: req.body.priceRating,
    },
    req.user._id,
    shopId,
    req.user.organizationId
  );

  sendSuccess(res, 200, 'Supplier rating updated successfully', supplier);
});

/**
 * @desc    Blacklist supplier
 * @route   POST /api/v1/suppliers/:id/blacklist
 * @access  Private (Shop Admin)
 */
export const blacklistSupplier = catchAsync(async (req, res) => {
  const shopId = req.body.shopId || req.user.primaryShop;

  const supplier = await supplierService.blacklistSupplier(
    req.params.id,
    req.body.reason,
    req.user._id,
    shopId,
    req.user.organizationId
  );

  sendSuccess(res, 200, 'Supplier blacklisted successfully', supplier);
});

/**
 * @desc    Remove supplier from blacklist
 * @route   POST /api/v1/suppliers/:id/remove-blacklist
 * @access  Private (Shop Admin)
 */
export const removeBlacklist = catchAsync(async (req, res) => {
  const shopId = req.body.shopId || req.user.primaryShop;

  const supplier = await supplierService.removeBlacklist(
    req.params.id,
    req.user._id,
    shopId,
    req.user.organizationId
  );

  sendSuccess(res, 200, 'Supplier removed from blacklist successfully', supplier);
});

/**
 * @desc    Mark supplier as preferred
 * @route   POST /api/v1/suppliers/:id/preferred
 * @access  Private (Shop Admin, Manager)
 */
export const markAsPreferred = catchAsync(async (req, res) => {
  const shopId = req.body.shopId || req.user.primaryShop;

  const supplier = await supplierService.markAsPreferred(
    req.params.id,
    req.user._id,
    shopId,
    req.user.organizationId
  );

  sendSuccess(res, 200, 'Supplier marked as preferred successfully', supplier);
});

/**
 * @desc    Remove supplier from preferred list
 * @route   DELETE /api/v1/suppliers/:id/preferred
 * @access  Private (Shop Admin, Manager)
 */
export const removePreferred = catchAsync(async (req, res) => {
  const shopId = req.body.shopId || req.user.primaryShop;

  const supplier = await supplierService.removePreferred(
    req.params.id,
    req.user._id,
    shopId,
    req.user.organizationId
  );

  sendSuccess(res, 200, 'Supplier removed from preferred list successfully', supplier);
});

/**
 * @desc    Update supplier balance
 * @route   POST /api/v1/suppliers/:id/balance
 * @access  Private (Shop Admin, Manager, Accountant)
 */
export const updateBalance = catchAsync(async (req, res) => {
  const shopId = req.body.shopId || req.user.primaryShop;

  const supplier = await supplierService.updateBalance(
    req.params.id,
    req.body.amount,
    req.body.type,
    req.body.note,
    req.user._id,
    shopId,
    req.user.organizationId
  );

  sendSuccess(res, 200, 'Supplier balance updated successfully', supplier);
});

/**
 * @desc    Get supplier statistics
 * @route   GET /api/v1/suppliers/stats
 * @access  Private (Shop Admin, Manager)
 */
export const getSupplierStats = catchAsync(async (req, res) => {
  const shopId = req.query.shopId || req.user.primaryShop;

  const stats = await supplierService.getSupplierStats(shopId, req.user.organizationId);

  sendSuccess(res, 200, 'Supplier statistics fetched successfully', stats);
});

/**
 * @desc    Get top suppliers by purchase amount
 * @route   GET /api/v1/suppliers/top
 * @access  Private (Shop Admin, Manager)
 */
export const getTopSuppliers = catchAsync(async (req, res) => {
  const shopId = req.query.shopId || req.user.primaryShop;
  const limit = parseInt(req.query.limit) || 10;

  const topSuppliers = await supplierService.getTopSuppliers(
    shopId,
    req.user.organizationId,
    limit
  );

  sendSuccess(res, 200, 'Top suppliers fetched successfully', topSuppliers);
});
