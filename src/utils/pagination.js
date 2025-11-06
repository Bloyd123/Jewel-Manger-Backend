// ============================================================================
// FILE: utils/pagination.js
// ============================================================================

/**
 * Advanced Pagination Utility
 * Provides pagination metadata and helper functions
 */

/**
 * Calculate pagination metadata
 * @param {Number} totalDocs - Total number of documents
 * @param {Number} page - Current page
 * @param {Number} limit - Documents per page
 * @returns {Object} - Pagination metadata
 */
export const getPaginationData = (totalDocs, page = 1, limit = 10) => {
  const totalPages = Math.ceil(totalDocs / limit);
  const currentPage = parseInt(page, 10);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    totalDocs,
    totalPages,
    currentPage,
    limit: parseInt(limit, 10),
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? currentPage + 1 : null,
    prevPage: hasPrevPage ? currentPage - 1 : null,
    skip: (currentPage - 1) * limit,
  };
};

/**
 * Paginate MongoDB query
 * @param {Model} Model - Mongoose model
 * @param {Object} query - Query filter
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} - Paginated results with metadata
 */
export const paginate = async (Model, query = {}, options = {}) => {
  const { page = 1, limit = 10, sort = '-createdAt', select = '', populate = [] } = options;

  // Get total count
  const totalDocs = await Model.countDocuments(query);

  // Get pagination metadata
  const pagination = getPaginationData(totalDocs, page, limit);

  // Build query
  let dbQuery = Model.find(query).sort(sort).skip(pagination.skip).limit(pagination.limit);

  // Select specific fields
  if (select) {
    dbQuery = dbQuery.select(select);
  }

  // Populate related documents
  if (populate.length > 0) {
    populate.forEach(pop => {
      dbQuery = dbQuery.populate(pop);
    });
  }

  // Execute query
  const docs = await dbQuery;

  return {
    success: true,
    data: docs,
    pagination,
  };
};

/**
 * Paginate with aggregation pipeline
 * @param {Model} Model - Mongoose model
 * @param {Array} pipeline - Aggregation pipeline
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} - Paginated results with metadata
 */
export const paginateAggregate = async (Model, pipeline = [], options = {}) => {
  const { page = 1, limit = 10 } = options;

  const pagination = getPaginationData(0, page, limit);

  // Add pagination stages to pipeline
  const paginatedPipeline = [
    ...pipeline,
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: pagination.skip }, { $limit: pagination.limit }],
      },
    },
  ];

  const [result] = await Model.aggregate(paginatedPipeline);

  const totalDocs = result.metadata[0]?.total || 0;
  const paginationData = getPaginationData(totalDocs, page, limit);

  return {
    success: true,
    data: result.data,
    pagination: paginationData,
  };
};

/**
 * Get page numbers for pagination UI
 * @param {Number} currentPage - Current page
 * @param {Number} totalPages - Total pages
 * @param {Number} maxPages - Maximum page numbers to show
 * @returns {Array} - Array of page numbers
 */
export const getPageNumbers = (currentPage, totalPages, maxPages = 5) => {
  const pages = [];
  let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
  const endPage = Math.min(totalPages, startPage + maxPages - 1);

  if (endPage - startPage + 1 < maxPages) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return pages;
};

/**
 * Build pagination links
 * @param {String} baseUrl - Base URL
 * @param {Object} pagination - Pagination metadata
 * @param {Object} queryParams - Additional query parameters
 * @returns {Object} - Pagination links
 */
export const buildPaginationLinks = (baseUrl, pagination, queryParams = {}) => {
  const buildUrl = page => {
    const params = new URLSearchParams({
      ...queryParams,
      page,
      limit: pagination.limit,
    });
    return `${baseUrl}?${params.toString()}`;
  };

  return {
    first: buildUrl(1),
    last: buildUrl(pagination.totalPages),
    next: pagination.hasNextPage ? buildUrl(pagination.nextPage) : null,
    prev: pagination.hasPrevPage ? buildUrl(pagination.prevPage) : null,
    current: buildUrl(pagination.currentPage),
  };
};
