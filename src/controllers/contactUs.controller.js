const {contactUsService} = require('../services');
const catchAsync = require('../utils/catchAsync');
const {ContactUs} = require('../models');
const {sendToTopic} = require('../microservices/notification.service');

const createSupportRequest = catchAsync(async (req, res) => {
  const supportRequest = await contactUsService.createSupportRequest({...req.body, user: req.user._id});
  res.status(201).send({data: supportRequest, message: 'Support request created successfully', status: true});
});

const getAllSupportRequests = catchAsync(async (req, res) => {
  const supportRequests = await contactUsService.getAllSupportRequests(req.query);
  res.status(200).send({data: supportRequests, message: 'Support requests fetched successfully', status: true});
});

const getSupportRequestById = catchAsync(async (req, res) => {
  const supportRequest = await contactUsService.getSupportRequestById(req.params.id);
  res.status(200).send({data: supportRequest, message: 'Support request fetched successfully', status: true});
});

const deleteSupportRequestById = catchAsync(async (req, res) => {
  const supportRequest = await contactUsService.deleteSupportRequestById(req.params.id);
  res.status(200).send({data: supportRequest, message: 'Support request deleted successfully', status: true});
});
const getAllComplaintsByUserId = async (req, res) => {
  try {
    const {userId} = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return res.status(400).json({
        status: false,
        message: 'User ID is required.',
      });
    }

    const skip = (page - 1) * limit;
    const totalComplaints = await ContactUs.countDocuments({user: userId});
    const complaints = await ContactUs.find({user: userId})
      .skip(skip)
      .limit(limit)
      .sort({createdAt: -1});

    if (!complaints || complaints.length === 0) {
      return res.status(404).json({
        status: false,
        message: 'No complaints found for this user.',
      });
    }

    const totalPages = Math.ceil(totalComplaints / limit);

    return res.status(200).json({
      status: true,
      data: {
        page,
        limit,
        results: complaints,
        totalPages,
        totalResults: totalComplaints,
      },
      message: 'Complaints fetched successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: 'Internal Server Error',
    });
  }
};

const replyToSupportRequest = catchAsync(async (req, res) => {
  const {reply} = req.body;
  const {id} = req.params;

  const supportRequest = await ContactUs.findById(id);
  if (!supportRequest) {
    return res.status(404).send({status: false, message: 'Support request not found'});
  }

  supportRequest.reply = reply;
  supportRequest.repliedAt = new Date();
  supportRequest.status = 'Closed';
  await supportRequest.save();

  const notificationData = {
    title: 'Support Query Response',
    body: `Your query has been answered: "${reply}"`,
  };

  await sendToTopic(supportRequest.user, `user_${supportRequest.user}`, notificationData, {
    ticketNo: String(supportRequest.ticketNo),
  });

  res.status(200).send({status: true, message: 'Reply sent successfully', data: supportRequest});
});

module.exports = {
  createSupportRequest,
  getAllSupportRequests,
  getSupportRequestById,
  deleteSupportRequestById,
  getAllComplaintsByUserId,
  replyToSupportRequest,
};
