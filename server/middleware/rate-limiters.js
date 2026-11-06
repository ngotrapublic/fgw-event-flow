const { rateLimit } = require('express-rate-limit');

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

module.exports = {
    borrowRead: make(15 * 60e3, 120),
    createLimiter: make(60 * 60e3, 5, { skip: (req) => Boolean(req.user) }), // POST /requests (guests only; authenticated users skip)
    verifyLimiter: make(15 * 60e3, 20),
    otpIpLimiter: make(60 * 60e3, 5),
    otpVerifyLimiter: make(15 * 60e3, 20),
    resendLimiter: make(60 * 60e3, 3),
    returnLimiter: make(15 * 60e3, 20)
};

