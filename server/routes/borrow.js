const express = require('express');
const router = express.Router();

const borrowCtrl = require('../controllers/borrow-public-controller');
const borrowAdminCtrl = require('../controllers/borrow-admin-controller');
const optionalAuth = require('../middleware/optional-auth');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const limiters = require('../middleware/rate-limiters');

const adminAuth = [verifyToken, requireRole(['admin', 'manager'])];

// ==========================================
// PUBLIC & GUEST / AUTHENTICATED BORROW APIS
// ==========================================

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

// ==========================================
// ADMIN / MANAGER BORROW MANAGEMENT APIS
// ==========================================

// GET /api/borrow/admin/requests · adminAuth
router.get('/admin/requests', adminAuth, borrowAdminCtrl.getRequests);

// GET /api/borrow/admin/counts · adminAuth
router.get('/admin/counts', adminAuth, borrowAdminCtrl.getCounts);

// GET /api/borrow/admin/requests/:id · adminAuth
router.get('/admin/requests/:id', adminAuth, borrowAdminCtrl.getRequestById);

// POST /api/borrow/admin/requests/:id/approve · adminAuth
router.post('/admin/requests/:id/approve', adminAuth, borrowAdminCtrl.approveRequest);

// POST /api/borrow/admin/requests/:id/reject · adminAuth
router.post('/admin/requests/:id/reject', adminAuth, borrowAdminCtrl.rejectRequest);

// POST /api/borrow/admin/requests/:id/handover · adminAuth
router.post('/admin/requests/:id/handover', adminAuth, borrowAdminCtrl.handoverRequest);

// POST /api/borrow/admin/requests/:id/cancel · adminAuth
router.post('/admin/requests/:id/cancel', adminAuth, borrowAdminCtrl.cancelRequest);

// POST /api/borrow/admin/requests/:id/confirm-return · adminAuth
router.post('/admin/requests/:id/confirm-return', adminAuth, borrowAdminCtrl.confirmReturn);

// GET /api/borrow/admin/qr-station · adminAuth
router.get('/admin/qr-station', adminAuth, borrowAdminCtrl.getQrStation);

module.exports = router;


