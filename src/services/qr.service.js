const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { QRSession } = require('../models');
const { getAuth, signInWithCustomToken } = require('firebase/auth');
require('../../firebase-web-config');

const QR_SESSION_EXPIRY_MS = 90000;

async function createQRSession() {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + QR_SESSION_EXPIRY_MS);

  const qrSession = await QRSession.create({
    sessionId,
    status: 'pending',
    expiresAt,
    deviceType: 'tablet',
  });

  return {
    sessionId: qrSession.sessionId,
    qrValue: qrSession.sessionId,
    expiresAt: qrSession.expiresAt,
  };
}

async function approveQRSession(sessionId, firebaseUid) {
  const qrSession = await QRSession.findOne({ sessionId });

  if (!qrSession) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invalid QR session');
  }

  if (qrSession.isExpired()) {
    await QRSession.updateOne({ sessionId }, { status: 'expired' });
    throw new ApiError(httpStatus.BAD_REQUEST, 'QR code has expired. Please scan a new one.');
  }

  if (qrSession.status !== 'pending') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      qrSession.status === 'approved'
        ? 'QR code has already been approved'
        : 'QR code is no longer valid'
    );
  }


  let idToken;
  try {

    const customToken = await admin.auth().createCustomToken(firebaseUid);

    const userCredential = await signInWithCustomToken(getAuth(), customToken);
    idToken = userCredential._tokenResponse.idToken;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate authentication token');
  }


  await QRSession.updateOne(
    { sessionId },
    {
      status: 'approved',
      userId: firebaseUid,
      customToken: idToken,
      approvedAt: new Date(),
    }
  );

  return {
    success: true,
    message: 'QR session approved successfully',
  };
}

async function getQRSessionStatus(sessionId) {
  const qrSession = await QRSession.findOne({ sessionId });

  if (!qrSession) {
    return {
      status: 'invalid',
      message: 'QR session not found',
    };
  }


  if (qrSession.isExpired() && qrSession.status === 'pending') {
    await QRSession.updateOne({ sessionId }, { status: 'expired' });
    return {
      status: 'expired',
      message: 'QR code has expired',
    };
  }


  if (qrSession.status === 'approved') {
    return {
      status: 'approved',
      token: qrSession.customToken,
      userId: qrSession.userId,
    };
  }

  return {
    status: 'pending',
    message: 'Waiting for approval',
  };
}

async function cleanupExpiredSessions() {
  const now = new Date();
  const result = await QRSession.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: now },
    },
    {
      status: 'expired',
    }
  );

  return {
    success: true,
    expiredCount: result.modifiedCount,
  };
}

module.exports = {
  createQRSession,
  approveQRSession,
  getQRSessionStatus,
  cleanupExpiredSessions,
};

