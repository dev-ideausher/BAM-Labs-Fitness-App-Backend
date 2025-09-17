const {convertCommaSeparatedToArrays} = require('./advanceFilter');

class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = {...this.queryString};
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    const convertedQuery = convertCommaSeparatedToArrays(queryObj);

    const containsRegExpOrOperators = obj => {
      if (obj == null) return false;
      if (obj instanceof RegExp) return true;
      if (Array.isArray(obj)) return obj.some(containsRegExpOrOperators);
      if (typeof obj === 'object') {
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (key.startsWith('$')) return true;
            if (containsRegExpOrOperators(obj[key])) return true;
          }
        }
      }
      return false;
    };

    if (containsRegExpOrOperators(convertedQuery)) {
      this.query = this.query.find(convertedQuery);
      return this;
    }

    let queryStr = JSON.stringify(convertedQuery);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|nin|in)\b/g, match => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      if (this.queryString.sort === 'distance') {
        this.queryString.sort;
      }
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
