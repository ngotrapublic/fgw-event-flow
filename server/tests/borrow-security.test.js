const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');
const {
    getHmacSecret,
    getValidatedAppPublicUrl,
    resolveTrustProxy,
    isHttpsRequest,
    validateProductionSecurityConfig,
    enforceHttpsMiddleware
} = require('../config/borrow-security');
const { loadEnv, isTemplatePlaceholder } = require('../config/load-env');

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

function httpRequestRaw(port, reqPath, { method = 'GET', headers = {} } = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port,
                path: reqPath,
                method,
                headers: { Connection: 'close', ...headers }
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            }
        );
        req.on('error', reject);
        req.end();
    });
}

describe('MEDIUM-RECHECK-01: Unified Env Loader & Process-Level .env.production Startup', () => {
    const tmpDirs = [];
    const serverEntry = path.resolve(__dirname, '..', 'index.js');

    const makeTempDir = () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-env-test-'));
        tmpDirs.push(dir);
        return dir;
    };

    const minimalHostEnv = () => ({
        PATH: process.env.PATH || '',
        SystemRoot: process.env.SystemRoot || '',
        TEMP: process.env.TEMP || '',
        TMP: process.env.TMP || ''
    });

    afterEach(() => {
        while (tmpDirs.length > 0) {
            const dir = tmpDirs.pop();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    test('loadEnv discovers NODE_ENV inside .env.production, prefers .env.production over .env, and skips dev placeholders', () => {
        const dir = makeTempDir();
        fs.writeFileSync(
            path.join(dir, '.env.production'),
            [
                'NODE_ENV=production',
                'APP_PUBLIC_URL=https://event.greenwichvietnam.edu.vn',
                'ALLOWED_ORIGINS=https://event.greenwichvietnam.edu.vn',
                'BORROW_HMAC_SECRET=' + 'f'.repeat(64)
            ].join('\n')
        );
        fs.writeFileSync(
            path.join(dir, '.env'),
            [
                'APP_PUBLIC_URL=https://fallback-should-not-win.example.com',
                'EXTRA_FROM_DOTENV=ok'
            ].join('\n')
        );

        const targetEnv = {};
        const result = loadEnv({ cwd: dir, serverDir: dir, rootDir: dir, env: targetEnv });

        expect(result.nodeEnv).toBe('production');
        expect(targetEnv.NODE_ENV).toBe('production');
        expect(targetEnv.APP_PUBLIC_URL).toBe('https://event.greenwichvietnam.edu.vn');
        expect(targetEnv.ALLOWED_ORIGINS).toBe('https://event.greenwichvietnam.edu.vn');
        expect(targetEnv.EXTRA_FROM_DOTENV).toBe('ok');

        // Template placeholders are skipped in development mode
        const devDir = makeTempDir();
        fs.writeFileSync(
            path.join(devDir, '.env.development'),
            'FIREBASE_PROJECT_ID=your-dev-project-id\nAPP_PUBLIC_URL=http://localhost:5173\n'
        );
        const devEnv = { NODE_ENV: 'development' };
        loadEnv({ cwd: devDir, serverDir: devDir, rootDir: devDir, env: devEnv });
        expect(isTemplatePlaceholder('your-dev-project-id')).toBe(true);
        expect(devEnv.FIREBASE_PROJECT_ID).toBeUndefined();
        expect(devEnv.APP_PUBLIC_URL).toBe('http://localhost:5173');
    });

    test('Spawned server fails fast when isolated temp .env.production specifies http:// APP_PUBLIC_URL or missing secret', () => {
        const dir = makeTempDir();
        fs.writeFileSync(
            path.join(dir, '.env.production'),
            [
                'NODE_ENV=production',
                'APP_PUBLIC_URL=http://event.greenwichvietnam.edu.vn',
                'BORROW_HMAC_SECRET=' + 'a'.repeat(64),
                'TRUST_PROXY=loopback',
                'ALLOWED_ORIGINS=https://event.greenwichvietnam.edu.vn'
            ].join('\n')
        );

        const res = spawnSync(process.execPath, [serverEntry], {
            cwd: dir,
            env: minimalHostEnv(),
            encoding: 'utf8',
            timeout: 15000
        });

        expect(res.status).toBe(1);
        expect(res.stderr).toMatch(/\[SECURITY FATAL\].*https:\/\//i);

        // Also fail-fast when BORROW_HMAC_SECRET is missing inside .env.production
        fs.writeFileSync(
            path.join(dir, '.env.production'),
            [
                'NODE_ENV=production',
                'APP_PUBLIC_URL=https://event.greenwichvietnam.edu.vn',
                'TRUST_PROXY=loopback'
            ].join('\n')
        );
        const resMissingSecret = spawnSync(process.execPath, [serverEntry], {
            cwd: dir,
            env: minimalHostEnv(),
            encoding: 'utf8',
            timeout: 15000
        });
        expect(resMissingSecret.status).toBe(1);
        expect(resMissingSecret.stderr).toMatch(/\[SECURITY FATAL\].*BORROW_HMAC_SECRET/i);
    });

    test('Spawned server boots cleanly from isolated temp .env.production (without shell NODE_ENV) and enforces HTTPS/proxy rules', async () => {
        const dir = makeTempDir();
        fs.writeFileSync(
            path.join(dir, '.env.production'),
            [
                'NODE_ENV=production',
                'PORT=0',
                'FIRESTORE_EMULATOR_HOST=127.0.0.1:19999',
                'FIREBASE_PROJECT_ID=demo-env-boot-test',
                'APP_PUBLIC_URL=https://event.greenwichvietnam.edu.vn',
                'ALLOWED_ORIGINS=https://event.greenwichvietnam.edu.vn',
                'TRUST_PROXY=loopback',
                'BORROW_HMAC_SECRET=' + 'c'.repeat(64)
            ].join('\n')
        );

        const child = spawn(process.execPath, [serverEntry], {
            cwd: dir,
            env: minimalHostEnv(),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d) => {
            stdout += d.toString();
        });
        child.stderr.on('data', (d) => {
            stderr += d.toString();
        });

        try {
            const port = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error(`Server startup timed out.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
                }, 45000);
                timer.unref?.();

                const checkOutput = () => {
                    const m = stdout.match(/Server running on http:\/\/localhost:(\d+)/);
                    if (m) {
                        clearTimeout(timer);
                        resolve(Number(m[1]));
                    }
                };
                child.stdout.on('data', checkOutput);
                child.once('exit', (code) => {
                    clearTimeout(timer);
                    reject(new Error(`Server exited prematurely (${code}).\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
                });
            });

            expect(stdout).toContain('Environment: production');

            // 1. /health works over plain HTTP for local HEALTHCHECK
            const healthRes = await httpRequestRaw(port, '/health');
            expect(healthRes.statusCode).toBe(200);
            expect(JSON.parse(healthRes.body).status).toBe('OK');

            // 2. Plain HTTP page GET /borrow redirects 301 to configured https:// APP_PUBLIC_URL
            const redirectRes = await httpRequestRaw(port, '/borrow');
            expect(redirectRes.statusCode).toBe(301);
            expect(redirectRes.headers.location).toBe('https://event.greenwichvietnam.edu.vn/borrow');

            // 3. Plain HTTP POST /api/borrow/verify is blocked 403
            const httpVerifyRes = await httpRequestRaw(port, '/api/borrow/verify', { method: 'POST' });
            expect(httpVerifyRes.statusCode).toBe(403);

            // 4. Trusted loopback proxy forwarding X-Forwarded-Proto: https gets HSTS header
            const httpsProxiedRes = await httpRequestRaw(port, '/api/borrow/my', {
                headers: { 'X-Forwarded-Proto': 'https' }
            });
            expect(httpsProxiedRes.headers['strict-transport-security']).toMatch(/max-age=31536000/);
            expect(httpsProxiedRes.statusCode).not.toBe(403);
        } finally {
            child.stdout?.destroy();
            child.stderr?.destroy();
            await new Promise((resolve) => {
                if (child.exitCode !== null || child.killed) {
                    return resolve();
                }
                const killTimer = setTimeout(() => {
                    try {
                        child.kill('SIGKILL');
                    } catch (_) {}
                    resolve();
                }, 2000);
                killTimer.unref?.();
                child.once('close', () => {
                    clearTimeout(killTimer);
                    resolve();
                });
                child.kill('SIGTERM');
            });
        }
    }, 55000);
});
