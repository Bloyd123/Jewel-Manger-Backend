// ============================================================================
// FILE: utils/apiFeatures.js
// ============================================================================

/**
 * API Features Class
 * Handles filtering, sorting, field limiting, and pagination for MongoDB queries
 */
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * Filter the query
   * Supports: ?category=gold&price[gte]=5000
   */
filter() {
  // 1️⃣ Clone the query string object
  const queryObj = { ...this.queryString };

  // 2️⃣ Exclude non-filtering fields
  const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
  excludedFields.forEach(field => delete queryObj[field]);

  // 3️⃣ Map easy query aliases to real schema fields (helps with nested structures)
  if (queryObj.city) {
    queryObj['address.city'] = queryObj.city;
    delete queryObj.city;
  }

  if (queryObj.state) {
    queryObj['address.state'] = queryObj.state;
    delete queryObj.state;
  }

  if (queryObj.country) {
    queryObj['address.country'] = queryObj.country;
    delete queryObj.country;
  }

  // 4️⃣ Convert string booleans and numbers
  for (const key in queryObj) {
    if (queryObj[key] === 'true') queryObj[key] = true;
    if (queryObj[key] === 'false') queryObj[key] = false;

    // Convert numeric strings safely
    if (!isNaN(queryObj[key]) && queryObj[key] !== '' && key !== '_id') {
      queryObj[key] = Number(queryObj[key]);
    }
  }

  // 5️⃣ Support for operators (gte, gt, lte, lt, ne, in, nin)
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt|ne|in|nin)\b/g, match => `$${match}`);

  // 6️⃣ Apply filters to the Mongoose query
  this.query = this.query.find(JSON.parse(queryStr));

  // 7️⃣ Optional keyword search
  if (this.queryString.search) {
    const regex = new RegExp(this.queryString.search, 'i');
    this.query = this.query.find({
      $or: [
        { name: regex },
        { code: regex },
        { 'address.city': regex },
        { 'address.area': regex }
      ]
    });
  }

  return this;
}

  /**
   * Sort the results
   * Supports: ?sort=price,-createdAt (ascending by price, descending by createdAt)
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // Default sort by newest first
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  /**
   * Limit fields (select specific fields)
   * Supports: ?fields=name,email,phone (only return these fields)
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      // Exclude __v by default
      this.query = this.query.select('-__v');
    }

    return this;
  }

  /**
   * Paginate results
   * Supports: ?page=2&limit=10
   */
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }

  /**
   * Search functionality
   * Searches across multiple fields using regex
   */
  search(fields = []) {
    if (this.queryString.search && fields.length > 0) {
      const searchRegex = new RegExp(this.queryString.search, 'i');
      const searchConditions = fields.map(field => ({
        [field]: searchRegex,
      }));

      this.query = this.query.or(searchConditions);
    }

    return this;
  }

  /**
   * Date range filter
   * Supports: ?startDate=2024-01-01&endDate=2024-12-31
   */
  dateRange(field = 'createdAt') {
    if (this.queryString.startDate || this.queryString.endDate) {
      const dateFilter = {};

      if (this.queryString.startDate) {
        dateFilter.$gte = new Date(this.queryString.startDate);
      }

      if (this.queryString.endDate) {
        const endDate = new Date(this.queryString.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = endDate;
      }

      this.query = this.query.find({ [field]: dateFilter });
    }

    return this;
  }

  /**
   * Populate related documents
   */
  populate(fields) {
    if (fields) {
      fields.forEach(field => {
        this.query = this.query.populate(field);
      });
    }

    return this;
  }
}

export default APIFeatures;
