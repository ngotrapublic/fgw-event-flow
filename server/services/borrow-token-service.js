const crypto = require('crypto');

const newToken = () => crypto.randomBytes(32).toString('base64url');
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const newOtp = () => String(crypto.randomInt(0, 1e6)).padStart(6, '0');

const safeEqualHex = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
    } catch {
        return false;
    }
};

const maskEmail = (email) => {
    if (!email || typeof email !== 'string') return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    if (local.length <= 2) {
        return `${local}***@${domain}`;
    }
    return `${local.slice(0, 2)}***@${domain}`;
};

const maskPhone = (phone) => {
    if (!phone || typeof phone !== 'string') return '';
    if (phone.length < 6) return phone;
    return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
};

module.exports = {
    newToken,
    hash,
    newOtp,
    safeEqualHex,
    maskEmail,
    maskPhone
};

