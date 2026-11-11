const { rateLimit } = require('express-rate-limit');
const { normalizePhone } = require('../services/borrow-validation');
const { hmacKey } = require('../services/borrow-token-service');
const { LIMITS } = require('../services/borrow-constants');

/**
 * Rate limiters for borrow endpoints using express-rate-limit v7
 */
const make = (windowMs, limit, options = {}) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút' },
        ...options
    });

const getPhoneHmac = (req) => {
    const normalized = normalizePhone(req.body?.phone);
    if (!normalized) return null;
    return hmacKey(`phone:${normalized}`);
};

const createGuestLimiter = make(60 * 60e3, 5, {
    skip: (req) => Boolean(req.user?.uid),
    message: {
        error: 'Bạn đã gửi quá nhiều yêu cầu mượn thiết bị. Vui lòng kiểm tra email xác nhận hoặc thử lại sau 1 giờ.'
    }
});

const createAccountLimiter = make(60 * 60e3, LIMITS.MAX_CREATE_PER_USER_HOUR, {
    skip: (req) => !req.user?.uid,
    keyGenerator: (req) => `uid:${hmacKey(`uid:${req.user.uid}`)}`,
    message: {
        error: 'Tài khoản của bạn đã đạt giới hạn tạo phiếu trong giờ này. Vui lòng đợi ít phút hoặc quản lý/huỷ bớt các phiếu đang mở.'
    }
});

const otpPhoneLimiter = make(60 * 60e3, 5, {
    skip: (req) => !getPhoneHmac(req),
    keyGenerator: (req) => `otp_phone:${getPhoneHmac(req)}`,
    message: {
        error: 'Số điện thoại này đã nhận quá nhiều yêu cầu mã OTP trong giờ qua. Vui lòng thử lại sau ít phút.'
    }
});

const otpVerifyPhoneLimiter = make(15 * 60e3, 10, {
    skip: (req) => !getPhoneHmac(req),
    keyGenerator: (req) => `verify_phone:${getPhoneHmac(req)}`,
    message: {
        error: 'Quá nhiều lần xác thực OTP cho số điện thoại này. Vui lòng đợi 15 phút rồi thử lại.'
    }
});

module.exports = {
    borrowRead: make(15 * 60e3, 120),
    createGuestLimiter,
    createAccountLimiter,
    createLimiter: [createGuestLimiter, createAccountLimiter],
    verifyLimiter: make(15 * 60e3, 20),
    linkExchangeLimiter: make(15 * 60e3, 20),
    otpIpLimiter: make(60 * 60e3, 5),
    otpPhoneLimiter,
    otpVerifyLimiter: make(15 * 60e3, 20),
    otpVerifyPhoneLimiter,
    resendLimiter: make(60 * 60e3, 3),
    returnLimiter: make(15 * 60e3, 20)
};
