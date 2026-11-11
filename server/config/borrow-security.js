const MIN_HMAC_SECRET_BYTES = 32;
const DEV_FALLBACK_HMAC_SECRET = 'borrow-dev-only-ephemeral-hmac-key-not-for-production-use';

function isPlaceholderSecret(val) {
    const lower = val.toLowerCase();
    return (
        lower.includes('your-') ||
        lower.includes('changeme') ||
        lower.includes('replace-with') ||
        lower.includes('example') ||
        lower === 'borrow-hmac-default-key'
    );
}

/**
 * Resolve HMAC key for deterministic lookup/quota hashes.
 * In production, fail-fast if BORROW_HMAC_SECRET is missing, weak (< 32 bytes), or a placeholder.
 */
function getHmacSecret() {
    const raw = typeof process.env.BORROW_HMAC_SECRET === 'string' ? process.env.BORROW_HMAC_SECRET.trim() : '';

    if (raw) {
        if (process.env.NODE_ENV === 'production') {
            if (Buffer.byteLength(raw, 'utf8') < MIN_HMAC_SECRET_BYTES) {
                throw new Error(
                    `[SECURITY] BORROW_HMAC_SECRET must be at least ${MIN_HMAC_SECRET_BYTES} bytes in production.`
                );
            }
            if (isPlaceholderSecret(raw)) {
                throw new Error('[SECURITY] BORROW_HMAC_SECRET appears to be a placeholder value.');
            }
        }
        return raw;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            '[SECURITY] BORROW_HMAC_SECRET is required in production (no fallback allowed). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }

    const devJwt = typeof process.env.JWT_SECRET === 'string' ? process.env.JWT_SECRET.trim() : '';
    return devJwt || DEV_FALLBACK_HMAC_SECRET;
}

/**
 * Validate and normalize APP_PUBLIC_URL.
 * In production, fail-fast if missing, invalid, or not using https://.
 */
function getValidatedAppPublicUrl() {
    const raw = typeof process.env.APP_PUBLIC_URL === 'string' ? process.env.APP_PUBLIC_URL.trim() : '';
    if (!raw) {
        throw new Error('Chưa cấu hình APP_PUBLIC_URL');
    }

    const clean = raw.replace(/\/+$/, '');
    let parsed;
    try {
        parsed = new URL(clean);
    } catch {
        throw new Error('[SECURITY] APP_PUBLIC_URL không phải URL hợp lệ');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('[SECURITY] APP_PUBLIC_URL phải dùng HTTP hoặc HTTPS');
    }

    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        throw new Error('[SECURITY] APP_PUBLIC_URL must use https:// when NODE_ENV=production');
    }

    return clean;
}

/**
 * Resolve Express `trust proxy` setting from TRUST_PROXY env.
 * When unset in production, restricts trust to 'loopback' rather than blind 1-hop trust.
 */
function resolveTrustProxy() {
    const raw = process.env.TRUST_PROXY;
    if (!raw || !raw.trim()) {
        if (process.env.NODE_ENV === 'production') {
            console.warn(
                '[SECURITY] TRUST_PROXY is not set; defaulting to "loopback" in production. Set TRUST_PROXY to your exact reverse-proxy IP/CIDR (e.g. "loopback" or "127.0.0.1,172.18.0.0/16") and block direct internet access to backend port.'
            );
            return 'loopback';
        }
        return false;
    }

    const trimmed = raw.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (trimmed.includes(',')) {
        return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return trimmed;
}

function resolveAllowedOrigins() {
    if (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.trim()) {
        return process.env.ALLOWED_ORIGINS
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    const origins = [];
    if (process.env.APP_PUBLIC_URL && process.env.APP_PUBLIC_URL.trim()) {
        try {
            origins.push(new URL(process.env.APP_PUBLIC_URL.trim()).origin);
        } catch {
            // Ignored; production validation catches invalid APP_PUBLIC_URL separately
        }
    } else {
        origins.push('https://event.greenwichvietnam.edu.vn');
    }

    if (process.env.NODE_ENV !== 'production') {
        origins.push('http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000');
    }

    return Array.from(new Set(origins));
}

/**
 * Determine whether the request arrived via HTTPS.
 * When Express evaluates `req.secure` (boolean), we trust its `trust proxy` evaluation
 * rather than trusting an unverified `x-forwarded-proto` header directly.
 */
function isHttpsRequest(req) {
    if (!req) return false;
    if (req.secure === true) return true;
    if (req.protocol === 'https') return true;
    if (req.secure === false) return false;

    const forwarded =
        typeof req.get === 'function' ? req.get('x-forwarded-proto') : req.headers?.['x-forwarded-proto'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim().toLowerCase() === 'https';
    }
    return false;
}

/**
 * Validate critical production security invariants at server startup.
 */
function validateProductionSecurityConfig() {
    if (process.env.NODE_ENV === 'production') {
        getHmacSecret();
        getValidatedAppPublicUrl();
    }
    return {
        trustProxy: resolveTrustProxy(),
        allowedOrigins: resolveAllowedOrigins()
    };
}

/**
 * Defense-in-depth HTTPS + HSTS enforcement in production.
 * Reverse proxy (Nginx/TLS) should terminate TLS and redirect HTTP -> HTTPS before requests reach Express.
 */
function enforceHttpsMiddleware(req, res, next) {
    if (process.env.NODE_ENV !== 'production' || process.env.ENFORCE_HTTPS === 'false') {
        return next();
    }

    // Allow container health probe on loopback HTTP /health
    if (req.path === '/health') {
        return next();
    }

    if (isHttpsRequest(req)) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        return next();
    }

    if (!req.path.startsWith('/api/') && (req.method === 'GET' || req.method === 'HEAD')) {
        try {
            const origin = new URL(getValidatedAppPublicUrl()).origin;
            return res.redirect(301, `${origin}${req.originalUrl || '/'}`);
        } catch {
            // Fall through to 403 if APP_PUBLIC_URL somehow invalid
        }
    }

    return res.status(403).json({
        error: 'HTTPS is required in production'
    });
}

module.exports = {
    MIN_HMAC_SECRET_BYTES,
    getHmacSecret,
    getValidatedAppPublicUrl,
    resolveTrustProxy,
    resolveAllowedOrigins,
    isHttpsRequest,
    validateProductionSecurityConfig,
    enforceHttpsMiddleware
};
