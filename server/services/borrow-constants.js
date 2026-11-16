const OPEN_STATUSES = ['unverified', 'pending', 'approved', 'handed_over', 'return_pending'];

// from -> allowed targets
const TRANSITIONS = {
    unverified: ['pending', 'expired'],
    pending: ['approved', 'rejected'],
    approved: ['handed_over', 'cancelled'],
    handed_over: ['return_pending', 'returned', 'returned_with_issue'],
    return_pending: ['returned', 'returned_with_issue'],
};

const LIMITS = {
    MAX_ITEMS: 20,
    MAX_QTY: 999,
    MAX_DUE_DAYS: 365,
    MAX_OPEN_PER_GUEST: 3, // theo email va theo SDT
    MAX_OPEN_PER_USER: 10, // quota cho tai khoan noi bo
    MAX_CREATE_PER_USER_HOUR: 20,
    VERIFY_TTL_MS: 24 * 3600e3,
    LINK_CODE_TTL_MS: 24 * 3600e3,
    SESSION_TTL_MS: 60 * 60e3,
    MAX_SESSION_REQUESTS: 25,
    OTP_TTL_MS: 10 * 60e3,
    OTP_MAX_ATTEMPTS: 5,
    OTP_RESEND_MS: 60e3,
    OTP_LOCKOUT_MS: 15 * 60e3,
    MAX_CLIENT_TOKENS: 10,
    APPROVED_STALE_MS: 3 * 24 * 3600e3,
    DUE_SOON_MS: 24 * 3600e3,
    REMINDER_LEASE_MS: 5 * 60e3,
    REMINDER_RETRY_DELAY_MS: 5 * 60e3,
    DELIVERY_LEASE_MS: 60e3,
};

module.exports = { OPEN_STATUSES, TRANSITIONS, LIMITS };

