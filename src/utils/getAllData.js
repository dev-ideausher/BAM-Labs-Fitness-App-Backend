const APIFeatures = require('./apiFeatures');
const {filteredResults} = require('./advanceFilter');

async function getAllData(model, query, populateConfig) {
  const page = query.page && parseInt(query.page, 10) > 0 ? parseInt(query.page, 10) : 1;
  const limit = query.limit && parseInt(query.limit, 10) > 0 ? parseInt(query.limit, 10) : 10;

  // let dataQuery = model.find({});
  // let dataQuery = model.find({ isDeleted: false });
  const hasIsDeletedField = model.schema && model.schema.paths.hasOwnProperty('isDeleted');
  let dataQuery = hasIsDeletedField 
    ? model.find({ isDeleted: false }) 
    : model.find({});

  // Apply population dynamically based on the provided configuration
  if (populateConfig) {
    populateConfig.forEach(({path, select, subPopulate}) => {
      const populateOptions = {path, select};
      if (subPopulate) {
        populateOptions.populate = subPopulate;
      }
      dataQuery = dataQuery.populate(populateOptions);
    });
  }

  let data = new APIFeatures(dataQuery, query)
    .filter()
    .sort()
    .paginate();
  data = await data.query.lean(); // Fix: use the result of the chained methods

  // const totalResults = await filteredResults(model, query);
  // const totalResults = await filteredResults(model, { ...query, isDeleted: false });
  const totalResultsQuery = hasIsDeletedField 
  ? { ...query, isDeleted: false } 
  : query;
const totalResults = await filteredResults(model, totalResultsQuery);
  const totalPages = Math.ceil(totalResults / limit);
  
  return {
    page,
    limit,
    results: data,
    totalPages,
    totalResults,
  };
}

module.exports = {
  getAllData,
};
