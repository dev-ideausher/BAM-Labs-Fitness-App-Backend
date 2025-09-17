const convertCommaSeparatedToArrays = query => {
  const convertedQuery = {};

  for (const key in query) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const value = query[key];

      if (typeof value === 'object' && value.in && typeof value.in === 'string' && value.in.includes(',')) {
        convertedQuery[key] = {in: value.in.split(',')};
      } else if (typeof value === 'object' && value.nin && typeof value.nin === 'string' && value.nin.includes(',')) {
        convertedQuery[key] = {nin: value.nin.split(',')};
      } else {
        convertedQuery[key] = value;
      }
    }
  }

  return convertedQuery;
};

const filteredResults = async (model, query) => {
  const queryObj = {...query};
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(el => delete queryObj[el]);

  const convertedQuery = convertCommaSeparatedToArrays(queryObj);

  // Preserve RegExp and MongoDB operators without JSON stringification
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
    return await model.countDocuments(convertedQuery);
  }

  let queryStr = JSON.stringify(convertedQuery);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt|nin|in)\b/g, match => `$${match}`);
  const totalResults = await model.countDocuments(JSON.parse(queryStr));
  return totalResults;
};

module.exports = {
  convertCommaSeparatedToArrays,
  filteredResults,
};
