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
    VERIFY_TTL_MS: 24 * 3600e3,
    OTP_TTL_MS: 10 * 60e3,
    OTP_MAX_ATTEMPTS: 5,
    OTP_RESEND_MS: 60e3,
    MAX_CLIENT_TOKENS: 10,
    MAX_REMINDER_TOKENS: 5,
    APPROVED_STALE_MS: 3 * 24 * 3600e3,
    DUE_SOON_MS: 24 * 3600e3,
};

module.exports = { OPEN_STATUSES, TRANSITIONS, LIMITS };

