

const { contactUsService } = require("../services");
const catchAsync = require("../utils/catchAsync");

const createSupportRequest = catchAsync(async (req, res) => {
    const supportRequest = await contactUsService.createSupportRequest({...req.body, user: req.user._id});
    res.status(201).send({ data: supportRequest, message: "Support request created successfully", status: true });
});

const getAllSupportRequests = catchAsync(async (req, res) => {
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

module.exports = {
    createSupportRequest,
    getAllSupportRequests,
    getSupportRequestById,
    deleteSupportRequestById
}