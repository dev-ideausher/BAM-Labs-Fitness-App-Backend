const catchAsync = require('../utils/catchAsync');
const { qrService } = require('../services');
const httpStatus = require('http-status');

const createQRSession = catchAsync(async (req, res) => {
  const result = await qrService.createQRSession();
  res.status(httpStatus.CREATED).json({
    status: true,
    data: result,
    message: 'QR session created successfully',
  });
});

const approveQRSession = catchAsync(async (req, res) => {
  const { sessionId } = req.body;
  const firebaseUid = req.user.firebaseUid;

  const result = await qrService.approveQRSession(sessionId, firebaseUid);
  res.status(httpStatus.OK).json({
    status: true,
    ...result,
  });
});

const getQRSessionStatus = catchAsync(async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(httpStatus.BAD_REQUEST).json({
      status: false,
      message: 'sessionId is required',
    });
  }

  const result = await qrService.getQRSessionStatus(sessionId);
  res.status(httpStatus.OK).json({
    status: true,
    data: result,
  });
});

module.exports = {
  createQRSession,
  approveQRSession,
  getQRSessionStatus,
};

