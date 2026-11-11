const {
    getHmacSecret,
    getValidatedAppPublicUrl,
    resolveTrustProxy,
    isHttpsRequest,
    validateProductionSecurityConfig,
    enforceHttpsMiddleware
} = require('../config/borrow-security');

describe('Production Security Invariants (HIGH-01 & MEDIUM-02)', () => {
    const origEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...origEnv };
        jest.restoreAllMocks();
    });

    test('MEDIUM-02: production fail-fast when BORROW_HMAC_SECRET is missing, < 32 bytes, or falls back only in non-prod', () => {
        process.env.NODE_ENV = 'production';
        process.env.FIREBASE_PROJECT_ID = 'public-project-id';
        process.env.JWT_SECRET = 'unrelated-jwt-secret-long-enough-for-32-bytes';
        delete process.env.BORROW_HMAC_SECRET;

        expect(() => getHmacSecret()).toThrow(/BORROW_HMAC_SECRET is required/);

        process.env.BORROW_HMAC_SECRET = 'too-short-secret';
        expect(() => getHmacSecret()).toThrow(/at least 32 bytes/);

        process.env.BORROW_HMAC_SECRET = 'a'.repeat(64);
        expect(getHmacSecret()).toBe('a'.repeat(64));
    });

    test('HIGH-01: production fail-fast when APP_PUBLIC_URL is missing or uses http:// instead of https://', () => {
        process.env.NODE_ENV = 'production';
        process.env.BORROW_HMAC_SECRET = 'b'.repeat(64);
        process.env.APP_PUBLIC_URL = 'http://event.greenwichvietnam.edu.vn';

        expect(() => getValidatedAppPublicUrl()).toThrow(/https:\/\//);
        expect(() => validateProductionSecurityConfig()).toThrow(/https:\/\//);

        process.env.APP_PUBLIC_URL = 'https://event.greenwichvietnam.edu.vn/';
        expect(getValidatedAppPublicUrl()).toBe('https://event.greenwichvietnam.edu.vn');

        jest.spyOn(console, 'warn').mockImplementation(() => {});
        delete process.env.TRUST_PROXY;
        expect(resolveTrustProxy()).toBe('loopback');

        process.env.TRUST_PROXY = '127.0.0.1, 10.0.0.0/8';
        expect(resolveTrustProxy()).toEqual(['127.0.0.1', '10.0.0.0/8']);
    });

    test('HIGH-01: isHttpsRequest rejects spoofed x-forwarded-proto when Express evaluated req.secure === false', () => {
        const spoofedExpressReq = {
            secure: false,
            protocol: 'http',
            headers: { 'x-forwarded-proto': 'https' },
            get: (k) => (k.toLowerCase() === 'x-forwarded-proto' ? 'https' : undefined)
        };
        expect(isHttpsRequest(spoofedExpressReq)).toBe(false);
    });

    test('HIGH-01: enforceHttpsMiddleware blocks HTTP verify/exchange endpoints, redirects HTTP page GETs, allows /health, and sets HSTS on HTTPS', () => {
        process.env.NODE_ENV = 'production';
        process.env.APP_PUBLIC_URL = 'https://event.greenwichvietnam.edu.vn';
        delete process.env.ENFORCE_HTTPS;

        const mkRes = () => ({
            statusCode: 200,
            headers: {},
            body: null,
            redirectedTo: null,
            setHeader(k, v) {
                this.headers[k] = v;
            },
            redirect(code, url) {
                this.statusCode = code;
                this.redirectedTo = url;
                return this;
            },
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                this.body = payload;
                return this;
            }
        });

        // 1. Plain HTTP POST /api/borrow/verify -> 403, never runs verify controller
        const nextBlocked = jest.fn();
        const resBlocked = mkRes();
        enforceHttpsMiddleware(
            { method: 'POST', path: '/api/borrow/verify', secure: false, protocol: 'http', headers: {} },
            resBlocked,
            nextBlocked
        );
        expect(resBlocked.statusCode).toBe(403);
        expect(nextBlocked).not.toHaveBeenCalled();

        // 2. Plain HTTP GET /borrow/verify?token=abc -> 301 redirect to configured HTTPS origin
        const nextRedirect = jest.fn();
        const resRedirect = mkRes();
        enforceHttpsMiddleware(
            {
                method: 'GET',
                path: '/borrow/verify',
                originalUrl: '/borrow/verify?token=abc',
                secure: false,
                protocol: 'http',
                headers: { host: 'evil-spoofed-host.com' }
            },
            resRedirect,
            nextRedirect
        );
        expect(resRedirect.statusCode).toBe(301);
        expect(resRedirect.redirectedTo).toBe('https://event.greenwichvietnam.edu.vn/borrow/verify?token=abc');
        expect(nextRedirect).not.toHaveBeenCalled();

        // 3. Loopback /health probe continues working for container HEALTHCHECK
        const nextHealth = jest.fn();
        enforceHttpsMiddleware(
            { method: 'GET', path: '/health', secure: false, protocol: 'http', headers: {} },
            mkRes(),
            nextHealth
        );
        expect(nextHealth).toHaveBeenCalled();

        // 4. Valid HTTPS request sets Strict-Transport-Security and proceeds
        const nextHttps = jest.fn();
        const resHttps = mkRes();
        enforceHttpsMiddleware(
            { method: 'GET', path: '/api/borrow/my', secure: true, protocol: 'https', headers: {} },
            resHttps,
            nextHttps
        );
        expect(resHttps.headers['Strict-Transport-Security']).toMatch(/max-age=31536000/);
        expect(nextHttps).toHaveBeenCalled();
    });
});
