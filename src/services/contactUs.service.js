const { ContactUs } = require("../models");
const { getPaginateConfig } = require("../utils/queryPHandler");



const createSupportRequest = async (body) => {
    const supportRequest = await ContactUs.create(body);
    return supportRequest;
}

const getAllSupportRequests = async (query) => {
    const {filters, options} = getPaginateConfig(query);
    const { search } = query;
    if (search) {
        if (filters.$or) {
          
          filters.$and = [
            { $or: filters.$or },
            { $or: [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } }
            ]}
          ];
          delete filters.$or;
        } else {
          filters.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ];
        }
      }
    options.populate = "user::email,name,profilePic";
    const supportRequests = await ContactUs.paginate(filters, options);
    return supportRequests;
}

const getSupportRequestById = async (id) => {
    const supportRequest = await ContactUs.findOne({_id:id}).populate("user", "email name profilePic");
    return supportRequest;
}

const deleteSupportRequestById = async (id) => {
    const supportRequest = await ContactUs.findByIdAndDelete(id);
    return supportRequest;
}
module.exports = {
    createSupportRequest,
    getAllSupportRequests,
    getSupportRequestById,
    deleteSupportRequestById
}