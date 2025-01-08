

const { contactUsService } = require("../services");
const catchAsync = require("../utils/catchAsync");

const createSupportRequest = catchAsync(async (req, res) => {
    const supportRequest = await contactUsService.createSupportRequest({...req.body, user: req.user._id});
    res.status(201).send({ data: supportRequest, message: "Support request created successfully", status: true });
});

const getAllSupportRequests = catchAsync(async (req, res) => {
    const {userId, name} = req.query;
    let filter = {};
    if (userId) {
        filter.userId = userId;
    }
    if (name) {
        filter.name = { $regex: name, $options: 'i' };
    }
    const supportRequests = await contactUsService.getAllSupportRequests(req.query);
    
    res.status(200).send({ data: supportRequests, message: "Support requests fetched successfully", status: true });
});

const getSupportRequestById = catchAsync(async (req, res) => {
    const supportRequest = await contactUsService.getSupportRequestById(req.params.id);
    res.status(200).send({ data: supportRequest, message: "Support request fetched successfully", status: true });
});

const deleteSupportRequestById = catchAsync(async (req, res) => {
    const supportRequest = await contactUsService.deleteSupportRequestById(req.params.id);
    res.status(200).send({ data: supportRequest, message: "Support request deleted successfully", status: true });
});

const getAllComplaintsByUserId = catchAsync(async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).send({ message: "userId is required", status: false });
    }
    let filter = { userId };
    const { filters, options } = getPaginateConfig(req.query);
    filters.userId = userId;
    options.populate = "user::email,name,profilePic";
    const supportRequests = await contactUsService.getAllSupportRequests(filters, options);
    if (!supportRequests || supportRequests.length === 0) {
        return res.status(404).send({ message: "No complaints found for this user", status: false });
    }
    res.status(200).send({ data: supportRequests, message: "User's complaints fetched successfully", status: true });
});

module.exports = {
    createSupportRequest,
    getAllSupportRequests,
    getSupportRequestById,
    deleteSupportRequestById,
    getAllComplaintsByUserId,
}