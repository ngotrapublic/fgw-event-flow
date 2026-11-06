const express = require('express');
const router = express.Router();

const borrowCtrl = require('../controllers/borrow-public-controller');
const optionalAuth = require('../middleware/optional-auth');
const limiters = require('../middleware/rate-limiters');

// GET /api/borrow/resources · borrowRead
router.get('/resources', limiters.borrowRead, borrowCtrl.getAvailableResources);

// POST /api/borrow/requests · optionalAuth, createLimiter (skip for authenticated users)
router.post('/requests', optionalAuth, limiters.createLimiter, borrowCtrl.createBorrowRequest);

// POST /api/borrow/verify · verifyLimiter
router.post('/verify', limiters.verifyLimiter, borrowCtrl.verifyEmail);

// POST /api/borrow/requests/:id/resend-verification · resendLimiter
router.post('/requests/:id/resend-verification', limiters.resendLimiter, borrowCtrl.resendVerification);

// GET /api/borrow/my · optionalAuth, borrowRead
router.get('/my', optionalAuth, limiters.borrowRead, borrowCtrl.getMyRequests);

// POST /api/borrow/lookup/otp · otpIpLimiter
router.post('/lookup/otp', limiters.otpIpLimiter, borrowCtrl.requestOtp);

// POST /api/borrow/lookup/verify · otpVerifyLimiter
router.post('/lookup/verify', limiters.otpVerifyLimiter, borrowCtrl.verifyOtp);

// POST /api/borrow/requests/:id/return · optionalAuth, returnLimiter
router.post('/requests/:id/return', optionalAuth, limiters.returnLimiter, borrowCtrl.requestReturn);

module.exports = router;

