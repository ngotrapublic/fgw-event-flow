let mockFirebase;

jest.mock('../config/firebase', () => {
    mockFirebase = require('./helpers/firestoreMock').buildFirebaseMock({
        resources: {},
        borrow_requests: {},
        borrow_otps: {},
        borrow_sessions: {},
        borrow_link_codes: {},
        borrow_quotas: {},
        borrow_reminder_outbox: {},
        borrow_idempotency: {},
        audit_logs: {},
        users: {}
    });
    return mockFirebase;
});

jest.mock('../services/borrow-email-service', () => ({
    assertEmailEnabled: jest.fn(),
    getAppPublicUrl: jest.fn(() => 'https://event.greenwich-it.com'),
    sendVerify: jest.fn(() => Promise.resolve()),
    sendCreatedForAccount: jest.fn(() => Promise.resolve()),
    sendApproved: jest.fn(() => Promise.resolve()),
    sendRejected: jest.fn(() => Promise.resolve()),
    sendCancelled: jest.fn(() => Promise.resolve()),
    sendReturned: jest.fn(() => Promise.resolve()),
    sendOtp: jest.fn(() => Promise.resolve()),
    sendDueSoon: jest.fn(() => Promise.resolve()),
    sendOverdue: jest.fn(() => Promise.resolve()),
    escapeHtml: jest.fn((s) => s)
}));

jest.mock('../services/notificationService', () => ({
    create: jest.fn(() => Promise.resolve()),
    getAdminUids: jest.fn(() => Promise.resolve(['admin1'])),
    getUidsByRoles: jest.fn(() => Promise.resolve(['admin1', 'manager1']))
}));

jest.mock('../controllers/settingsController', () => ({
    getSettingsInternal: jest.fn(() => ({
        channels: { email: true }
    }))
}));

const borrowCtrl = require('../controllers/borrow-public-controller');
const borrowEmailService = require('../services/borrow-email-service');
const borrowLinkService = require('../services/borrow-link-service');
const borrowSessionService = require('../services/borrow-session-service');
const notificationService = require('../services/notificationService');
const { transition } = require('../services/borrow-transition-service');
const { hash } = require('../services/borrow-token-service');
const HttpError = require('../utils/http-error');

const mkRes = () => ({
    statusCode: 200,
    body: null,
    headers: {},
    cookies: {},
    clearedCookies: {},
    status(code) {
        this.statusCode = code;
        return this;
    },
    set(obj, val) {
        if (typeof obj === 'string') {
            this.headers[obj] = val;
        } else if (obj && typeof obj === 'object') {
            Object.assign(this.headers, obj);
        }
        return this;
    },
    cookie(name, value, opts) {
        this.cookies[name] = { value, opts };
        return this;
    },
    clearCookie(name, opts) {
        delete this.cookies[name];
        this.clearedCookies[name] = opts || {};
        return this;
    },
    sendStatus(code) {
        this.statusCode = code;
        return this;
    },
    json(payload) {
        this.body = payload;
        return this;
    }
});

const extractSessionCookieHeader = (res) => {
    const cookieObj = res.cookies['__Host-borrow'] || res.cookies.borrow_session;
    const cookieName = res.cookies['__Host-borrow'] ? '__Host-borrow' : 'borrow_session';
    return cookieObj ? `${cookieName}=${encodeURIComponent(cookieObj.value)}` : '';
};

const callHandler = async (fn, req) => {
    const res = mkRes();
    const next = jest.fn((err) => {
        if (err) {
            res.status(err.statusCode || 500).json({
                error: err.message,
                ...(err.details ? { details: err.details } : {})
            });
        }
    });
    await fn(req, res, next);
    return res;
};

const getTomorrowVnDate = () => {
    const now = new Date(Date.now() + 7 * 3600 * 1000);
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return tomorrow.toISOString().slice(0, 10);
};

const getTodayVnDate = () => {
    const now = new Date(Date.now() + 7 * 3600 * 1000);
    return now.toISOString().slice(0, 10);
};

beforeEach(() => {
    mockFirebase.__stores.resources.clear();
    mockFirebase.__stores.borrow_requests.clear();
    mockFirebase.__stores.borrow_otps.clear();
    mockFirebase.__stores.borrow_sessions.clear();
    mockFirebase.__stores.borrow_link_codes.clear();
    mockFirebase.__stores.borrow_quotas.clear();
    mockFirebase.__stores.borrow_reminder_outbox.clear();
    mockFirebase.__stores.borrow_idempotency.clear();
    mockFirebase.__stores.audit_logs.clear();
    mockFirebase.__stores.users.clear();
    mockFirebase.db.__txChain = Promise.resolve();

    jest.restoreAllMocks();
    jest.clearAllMocks();

    mockFirebase.__stores.resources.set('loa', {
        label: 'Loa / Âm thanh',
        category: 'Audio',
        quantity: 10,
        availableQty: 10
    });
    mockFirebase.__stores.resources.set('mic', {
        label: 'Micro',
        category: 'Audio',
        quantity: 5,
        availableQty: 3
    });
    mockFirebase.__stores.resources.set('led', {
        label: 'Màn hình LED',
        category: 'Visual',
        quantity: 1,
        availableQty: 1
    });
});

describe('Phase 02 — Public Borrow API (/api/borrow)', () => {
    test('1. Khách tạo phiếu hợp lệ -> unverified, không trả accessToken, cấp HttpOnly session cookie + one-time linkCode', async () => {
        const dueDate = getTomorrowVnDate();
        const req = {
            body: {
                name: 'Nguyễn Văn A',
                email: 'nguyenvana@gmail.com',
                phone: '0912345678',
                dueDate,
                items: [{ resourceId: 'loa', qty: 2 }],
                note: 'Phục vụ hội thảo'
            },
            user: null
        };

        const res = await callHandler(borrowCtrl.createBorrowRequest, req);

        expect(res.statusCode).toBe(201);
        expect(res.body.accessToken).toBeUndefined();
        expect(res.body.request.status).toBe('unverified');
        expect(res.body.request.borrower.email).toBe('ng***@gmail.com');
        expect(res.body.request.borrower.phone).toBe('091****678');
        expect(res.headers['Cache-Control']).toBe('no-store');
        expect(res.headers['Referrer-Policy']).toBe('no-referrer');

        // Cookie session issued (borrow_session on HTTP, __Host-borrow on HTTPS)
        const sessionCookie = res.cookies.borrow_session;
        expect(sessionCookie).toBeDefined();
        expect(sessionCookie.opts.httpOnly).toBe(true);
        expect(sessionCookie.opts.sameSite).toBe('lax');

        // Verify email called once with verifyToken + one-time linkCode
        expect(borrowEmailService.sendVerify).toHaveBeenCalledTimes(1);
        const linkCodeArg = borrowEmailService.sendVerify.mock.calls[0][2];
        expect(typeof linkCodeArg).toBe('string');
        expect(mockFirebase.__stores.borrow_link_codes.get(hash(linkCodeArg))).toBeDefined();

        // Doc in store does not contain raw tokens or permanent accessTokenHash
        const createdId = res.body.request.id;
        const storedDoc = mockFirebase.__stores.borrow_requests.get(createdId);
        expect(storedDoc).toBeDefined();
        expect(storedDoc.accessToken).toBeUndefined();
        expect(storedDoc.verifyToken).toBeUndefined();
        expect(storedDoc.accessTokenHash).toBeUndefined();
        expect(storedDoc.verifyTokenHash).toBeDefined();
    });

    test('2. SĐT +84 912 345 678 -> lưu 0912345678', async () => {
        const req = {
            body: {
                name: 'Trần Văn B',
                email: 'tranb@gmail.com',
                phone: '+84 912 345 678',
                dueDate: getTomorrowVnDate(),
                items: [{ resourceId: 'mic', qty: 1 }]
            },
            user: null
        };

        const res = await callHandler(borrowCtrl.createBorrowRequest, req);
        expect(res.statusCode).toBe(201);

        const storedDoc = mockFirebase.__stores.borrow_requests.get(res.body.request.id);
        expect(storedDoc.borrower.phone).toBe('0912345678');
    });

    test('3. dueDate hôm nay -> 400 field dueDate', async () => {
        const req = {
            body: {
                name: 'Lê Văn C',
                email: 'levanc@gmail.com',
                phone: '0901234567',
                dueDate: getTodayVnDate(), // Today, must be >= tomorrow
                items: [{ resourceId: 'mic', qty: 1 }]
            },
            user: null
        };

        const res = await callHandler(borrowCtrl.createBorrowRequest, req);
        expect(res.statusCode).toBe(400);
        expect(res.body.details?.field).toBe('dueDate');
    });

    test('4. qty > availableQty -> 409 shortages', async () => {
        const req = {
            body: {
                name: 'Hoàng Văn D',
                email: 'hoangd@gmail.com',
                phone: '0901234567',
                dueDate: getTomorrowVnDate(),
                items: [
                    { resourceId: 'mic', qty: 5 }, // mic only has 3 available
                    { resourceId: 'led', qty: 2 }  // led only has 1 available
                ]
            },
            user: null
        };

        const res = await callHandler(borrowCtrl.createBorrowRequest, req);
        expect(res.statusCode).toBe(409);
        expect(res.body.details?.shortages).toHaveLength(2);
        expect(res.body.details.shortages[0].resourceId).toBe('mic');
        expect(res.body.details.shortages[0].available).toBe(3);
    });

    test('5. Email channel tắt -> 503, không có doc', async () => {
        borrowEmailService.assertEmailEnabled.mockImplementationOnce(() => {
            throw new HttpError(503, 'Hệ thống email đang tắt, vui lòng liên hệ quản trị viên');
        });

        const req = {
            body: {
                name: 'Phạm Văn E',
                email: 'phame@gmail.com',
                phone: '0901234567',
                dueDate: getTomorrowVnDate(),
                items: [{ resourceId: 'loa', qty: 1 }]
            },
            user: null
        };

        const res = await callHandler(borrowCtrl.createBorrowRequest, req);
        expect(res.statusCode).toBe(503);
        expect(mockFirebase.__stores.borrow_requests.size).toBe(0);
    });

    test('6. sendVerify ném lỗi -> 502, không có doc', async () => {
        borrowEmailService.sendVerify.mockRejectedValueOnce(new Error('SMTP connection timed out'));

        const req = {
            body: {
                name: 'Đặng Văn F',
                email: 'dangf@gmail.com',
                phone: '0901234567',
                dueDate: getTomorrowVnDate(),
                items: [{ resourceId: 'loa', qty: 1 }]
            },
            user: null
        };

        const res = await callHandler(borrowCtrl.createBorrowRequest, req);
        expect(res.statusCode).toBe(502);
        expect(res.body.error).toContain('Không gửi được email');
        // Doc created during processing should be deleted on email error
        expect(mockFirebase.__stores.borrow_requests.size).toBe(0);
    });

    test('7. Khách có 3 phiếu mở -> phiếu thứ 4 -> 429', async () => {
        // Seed 3 open requests with phone 0901234567
        for (let i = 1; i <= 3; i++) {
            mockFirebase.__stores.borrow_requests.set(`req-open-${i}`, {
                id: `req-open-${i}`,
                isOpen: true,
                status: 'pending',
                borrower: { email: `user${i}@test.com`, phone: '0901234567' }
            });
        }

        const req = {
            body: {
                name: 'Khách 4',
                email: 'guest4@test.com',
                phone: '0901234567',
                dueDate: getTomorrowVnDate(),
                items: [{ resourceId: 'loa', qty: 1 }]
            },
            user: null
        };

        const res = await callHandler(borrowCtrl.createBorrowRequest, req);
        expect(res.statusCode).toBe(429);
        expect(res.body.error).toBe('Bạn đang có quá nhiều phiếu chưa hoàn tất');
    });

    test('8. verify token one-time: lần 1 -> pending + session cookie; lần 2 -> 404 không mint token/cookie; token sai -> 404; quá hạn -> 410', async () => {
        const rawToken = 'secret-verify-token-123';
        const verifyTokenHash = hash(rawToken);

        mockFirebase.__stores.borrow_requests.set('req-verify-1', {
            id: 'req-verify-1',
            status: 'unverified',
            isOpen: true,
            verifyTokenHash,
            verifiedTokenHash: null,
            verifyExpiresAt: new Date(Date.now() + 24 * 3600e3).toISOString(),
            borrower: { name: 'Test Verify', email: 'verify@test.com', phone: '0901111222' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            dueDate: getTomorrowVnDate(),
            history: []
        });

        // Wrong token -> 404
        const resWrong = await callHandler(borrowCtrl.verifyEmail, { body: { token: 'invalid-token' } });
        expect(resWrong.statusCode).toBe(404);

        // Correct token first use -> 200, status pending, notification called, session cookie set, NO accessToken returned
        const resCorrect = await callHandler(borrowCtrl.verifyEmail, {
            body: { token: rawToken },
            secure: true
        });
        expect(resCorrect.statusCode).toBe(200);
        expect(resCorrect.body.request.status).toBe('pending');
        expect(resCorrect.body.accessToken).toBeUndefined();
        expect(resCorrect.cookies['__Host-borrow']).toBeDefined();
        expect(resCorrect.cookies['__Host-borrow'].opts.httpOnly).toBe(true);
        expect(resCorrect.cookies['__Host-borrow'].opts.secure).toBe(true);
        expect(notificationService.create).toHaveBeenCalled();

        // Session cookie opens GET /my
        const resMy = await callHandler(borrowCtrl.getMyRequests, {
            secure: true,
            headers: { cookie: extractSessionCookieHeader(resCorrect) }
        });
        expect(resMy.statusCode).toBe(200);
        expect(resMy.body.requests).toHaveLength(1);
        expect(resMy.body.requests[0].id).toBe('req-verify-1');

        // Replay of old verify token -> 404 and NO token or cookie minted!
        const resReplay = await callHandler(borrowCtrl.verifyEmail, {
            body: { token: rawToken },
            secure: true
        });
        expect(resReplay.statusCode).toBe(404);
        expect(resReplay.body.accessToken).toBeUndefined();
        expect(Object.keys(resReplay.cookies)).toHaveLength(0);

        // Expired unverified token -> 410
        const expiredToken = 'expired-token-456';
        mockFirebase.__stores.borrow_requests.set('req-verify-expired', {
            id: 'req-verify-expired',
            status: 'unverified',
            isOpen: true,
            verifyTokenHash: hash(expiredToken),
            verifyExpiresAt: new Date(Date.now() - 1000).toISOString(),
            borrower: { email: 'exp@test.com' },
            history: []
        });

        const resExpired = await callHandler(borrowCtrl.verifyEmail, { body: { token: expiredToken } });
        expect(resExpired.statusCode).toBe(410);

        // Already transitioned to expired by reminder job -> 410
        const jobExpiredToken = 'job-expired-token-789';
        mockFirebase.__stores.borrow_requests.set('req-job-expired', {
            id: 'req-job-expired',
            status: 'expired',
            isOpen: false,
            verifyTokenHash: hash(jobExpiredToken),
            verifyExpiresAt: new Date(Date.now() - 1000).toISOString(),
            borrower: { email: 'jobexp@test.com' },
            history: []
        });

        const resJobExpired = await callHandler(borrowCtrl.verifyEmail, { body: { token: jobExpiredToken } });
        expect(resJobExpired.statusCode).toBe(410);
    });

    test('8b. verify gọi đồng thời 2 lần (StrictMode race) -> đúng 1 lần cấp session cookie, lần kia không mint thêm credential', async () => {
        const rawToken = 'race-verify-token-123';
        mockFirebase.__stores.borrow_requests.set('req-verify-race', {
            id: 'req-verify-race',
            status: 'unverified',
            isOpen: true,
            verifyTokenHash: hash(rawToken),
            verifyExpiresAt: new Date(Date.now() + 24 * 3600e3).toISOString(),
            borrower: { name: 'Race Verify', email: 'race@test.com', phone: '0901119999' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            dueDate: getTomorrowVnDate(),
            history: []
        });

        const [res1, res2] = await Promise.all([
            callHandler(borrowCtrl.verifyEmail, { body: { token: rawToken } }),
            callHandler(borrowCtrl.verifyEmail, { body: { token: rawToken } })
        ]);

        expect([200, 404]).toContain(res1.statusCode);
        expect([200, 404]).toContain(res2.statusCode);

        // Exactly one winner received a session cookie; neither received accessToken in JSON
        const cookieWinners = [res1, res2].filter((r) => Boolean(r.cookies.borrow_session));
        expect(cookieWinners).toHaveLength(1);
        expect(res1.body.accessToken).toBeUndefined();
        expect(res2.body.accessToken).toBeUndefined();

        // Winner's cookie opens GET /my
        const resMy = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: extractSessionCookieHeader(cookieWinners[0]) }
        });
        expect(resMy.statusCode).toBe(200);
        expect(resMy.body.requests).toHaveLength(1);
    });

    test('9. getMyRequests qua HttpOnly cookie session -> trả phiếu mở, ẩn history/*Hash/uid/studentId, cookie hỏng bị xoá', async () => {
        const sid = 'valid-session-id-777';
        mockFirebase.__stores.borrow_sessions.set(hash(sid), {
            requestIds: ['req-my-1'],
            expiresAt: Date.now() + 60 * 60e3,
            revokedAt: null
        });
        mockFirebase.__stores.borrow_requests.set('req-my-1', {
            id: 'req-my-1',
            status: 'pending',
            isOpen: true,
            verifyTokenHash: 'some-hash',
            borrower: {
                uid: 'secret-uid',
                studentId: 'GCS210001',
                name: 'Nguyễn My',
                email: 'my@test.com',
                phone: '0988777666'
            },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            history: [{ status: 'created', note: 'secret' }]
        });

        const res = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: `borrow_session=${sid}` },
            user: null
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.requests).toHaveLength(1);
        expect(res.body.requests[0].id).toBe('req-my-1');

        // Security & data minimization check: no uid, studentId, history, or hash in public view
        const item = res.body.requests[0];
        expect(item.history).toBeUndefined();
        expect(item.accessTokenHash).toBeUndefined();
        expect(item.verifyTokenHash).toBeUndefined();
        expect(item.borrower.uid).toBeUndefined();
        expect(item.borrower.studentId).toBeUndefined();
        expect(item.borrower.email).toBe('my***@test.com');

        // Invalid/revoked cookie -> empty requests and cookie cleared
        const resInvalid = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: 'borrow_session=revoked-or-nonexistent' },
            user: null
        });
        expect(resInvalid.statusCode).toBe(200);
        expect(resInvalid.body.requests).toEqual([]);
        expect(resInvalid.clearedCookies.borrow_session).toBeDefined();
    });

    test('10. lookup/otp: SĐT không có phiếu và SĐT có phiếu -> cùng status + body; chỉ trường hợp sau gọi sendOtp', async () => {
        mockFirebase.__stores.borrow_requests.set('req-open-phone', {
            id: 'req-open-phone',
            status: 'pending',
            isOpen: true,
            borrower: { phone: '0901234567', email: 'owner@test.com' }
        });

        // 1. Phone with NO open request
        const resNone = await callHandler(borrowCtrl.requestOtp, { body: { phone: '0999999999' } });
        expect(resNone.statusCode).toBe(200);
        await new Promise((r) => setImmediate(r));
        expect(borrowEmailService.sendOtp).not.toHaveBeenCalled();

        // 2. Phone WITH open request
        const resExist = await callHandler(borrowCtrl.requestOtp, { body: { phone: '0901234567' } });
        expect(resExist.statusCode).toBe(200);
        // Body matches exactly
        expect(resNone.body).toEqual(resExist.body);
        await new Promise((r) => setImmediate(r));
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(1);
    });

    test('11. lookup/otp gọi 2 lần trong 60s -> sendOtp chỉ 1 lần', async () => {
        mockFirebase.__stores.borrow_requests.set('req-open-2', {
            id: 'req-open-2',
            status: 'pending',
            isOpen: true,
            borrower: { phone: '0901234567', email: 'owner2@test.com' }
        });

        // Call 1
        const res1 = await callHandler(borrowCtrl.requestOtp, { body: { phone: '0901234567' } });
        expect(res1.statusCode).toBe(200);
        await new Promise((r) => setImmediate(r));
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(1);

        // Call 2 immediately (within 60s)
        const res2 = await callHandler(borrowCtrl.requestOtp, { body: { phone: '0901234567' } });
        expect(res2.statusCode).toBe(200);
        await new Promise((r) => setImmediate(r));
        // sendOtp was NOT called a second time
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(1);
    });

    test('11b. lookup/otp: trả về response trước khi sendOtp resolve (không chờ gửi email)', async () => {
        mockFirebase.__stores.borrow_requests.set('req-timing-test', {
            id: 'req-timing-test',
            status: 'pending',
            isOpen: true,
            borrower: { phone: '0901234567', email: 'timing@test.com' }
        });

        let emailResolved = false;
        borrowEmailService.sendOtp.mockImplementationOnce(() => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    emailResolved = true;
                    resolve();
                }, 50);
            });
        });

        const res = await callHandler(borrowCtrl.requestOtp, { body: { phone: '0901234567' } });
        expect(res.statusCode).toBe(200);
        // Response finished BEFORE email promise resolved
        expect(emailResolved).toBe(false);

        // Wait for async email to finish
        await new Promise((resolve) => setTimeout(resolve, 60));
        expect(emailResolved).toBe(true);
    });

    test('11c. lookup/otp: gộp email trùng không phân biệt chữ hoa/thường và chuẩn hoá trước khi gửi OTP', async () => {
        mockFirebase.__stores.borrow_requests.set('req-case-1', {
            id: 'req-case-1',
            status: 'pending',
            isOpen: true,
            borrower: { phone: '0901234567', email: 'User@Fpt.edu.vn' }
        });
        mockFirebase.__stores.borrow_requests.set('req-case-2', {
            id: 'req-case-2',
            status: 'approved',
            isOpen: true,
            borrower: { phone: '0901234567', email: ' user@fpt.edu.vn ' }
        });

        const res = await callHandler(borrowCtrl.requestOtp, { body: { phone: '+84 901 234 567' } });
        expect(res.statusCode).toBe(200);
        await new Promise((r) => setImmediate(r));
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(1);
        expect(borrowEmailService.sendOtp).toHaveBeenCalledWith('user@fpt.edu.vn', expect.stringMatching(/^\d{6}$/));
    });

    test('12. lookup/verify: 6 lần nhập sai gửi bằng Promise.all -> attempts === 5, sau đó nhập đúng vẫn 400', async () => {
        const phone = '0901234567';
        const code = '123456';
        const phoneHash = hash(phone);

        mockFirebase.__stores.borrow_otps.set(phoneHash, {
            phoneHash,
            codeHash: hash(code),
            expiresAt: new Date(Date.now() + 10 * 60e3).toISOString(),
            attempts: 0
        });

        // 6 concurrent incorrect attempts sent with Promise.all
        const results = await Promise.all([
            callHandler(borrowCtrl.verifyOtp, { body: { phone, code: '000001' } }),
            callHandler(borrowCtrl.verifyOtp, { body: { phone, code: '000002' } }),
            callHandler(borrowCtrl.verifyOtp, { body: { phone, code: '000003' } }),
            callHandler(borrowCtrl.verifyOtp, { body: { phone, code: '000004' } }),
            callHandler(borrowCtrl.verifyOtp, { body: { phone, code: '000005' } }),
            callHandler(borrowCtrl.verifyOtp, { body: { phone, code: '000006' } })
        ]);

        results.forEach((r) => {
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toBe('Mã không đúng hoặc đã hết hạn');
        });

        const otpDoc = mockFirebase.__stores.borrow_otps.get(phoneHash);
        expect(otpDoc.attempts).toBe(5);

        // 7th attempt with CORRECT code -> still 400
        const resCorrect = await callHandler(borrowCtrl.verifyOtp, { body: { phone, code } });
        expect(resCorrect.statusCode).toBe(400);
        expect(resCorrect.body.error).toBe('Mã không đúng hoặc đã hết hạn');
    });

    test('12b. lookup/verify: nhập đúng sau 4 lần sai -> 200, doc OTP bị xoá', async () => {
        const phone = '0901234567';
        const code = '777888';
        const phoneHash = hash(phone);

        mockFirebase.__stores.borrow_otps.set(phoneHash, {
            phoneHash,
            codeHash: hash(code),
            expiresAt: new Date(Date.now() + 10 * 60e3).toISOString(),
            attempts: 0
        });

        mockFirebase.__stores.borrow_requests.set('req-after-4-fails', {
            id: 'req-after-4-fails',
            status: 'pending',
            isOpen: true,
            borrower: { phone: '0901234567' },
            items: []
        });

        // 4 incorrect attempts
        for (let i = 1; i <= 4; i++) {
            const r = await callHandler(borrowCtrl.verifyOtp, { body: { phone, code: 'wrong' } });
            expect(r.statusCode).toBe(400);
        }

        const otpDocBefore = mockFirebase.__stores.borrow_otps.get(phoneHash);
        expect(otpDocBefore.attempts).toBe(4);

        // 5th attempt with CORRECT code -> 200, sets HttpOnly session cookie
        const rCorrect = await callHandler(borrowCtrl.verifyOtp, { body: { phone, code } });
        expect(rCorrect.statusCode).toBe(200);
        expect(rCorrect.body.accessTokens).toBeUndefined();
        expect(rCorrect.body.requests).toHaveLength(1);
        expect(rCorrect.cookies.borrow_session).toBeDefined();

        // OTP doc must be deleted
        expect(mockFirebase.__stores.borrow_otps.has(phoneHash)).toBe(false);
    });

    test('12c. lookup/verify: chấp nhận mã OTP dán có khoảng trắng ở giữa', async () => {
        const phone = '0901234567';
        const code = '456789';
        const phoneHash = hash(phone);

        mockFirebase.__stores.borrow_otps.set(phoneHash, {
            phoneHash,
            codeHash: hash(code),
            expiresAt: new Date(Date.now() + 10 * 60e3).toISOString(),
            attempts: 0
        });

        mockFirebase.__stores.borrow_requests.set('req-space-otp', {
            id: 'req-space-otp',
            status: 'handed_over',
            isOpen: true,
            borrower: { phone },
            items: []
        });

        const res = await callHandler(borrowCtrl.verifyOtp, { body: { phone: '+84 901.234.567', code: '456 789' } });
        expect(res.statusCode).toBe(200);
        expect(res.body.requests).toHaveLength(1);
        expect(res.cookies.borrow_session).toBeDefined();
        expect(mockFirebase.__stores.borrow_otps.has(phoneHash)).toBe(false);
    });

    test('13. lookup/verify đúng -> session mới mở được phiếu; session cũ và link code cũ bị thu hồi', async () => {
        const phone = '0901234567';
        const code = '654321';
        const phoneHash = hash(phone);
        const oldSid = 'old-session-id-000';
        const oldLinkCode = 'old-link-code-000';

        mockFirebase.__stores.borrow_sessions.set(hash(oldSid), {
            requestIds: ['req-lookup-1'],
            expiresAt: Date.now() + 3600e3,
            revokedAt: null
        });
        mockFirebase.__stores.borrow_link_codes.set(hash(oldLinkCode), {
            requestId: 'req-lookup-1',
            expiresAt: Date.now() + 3600e3,
            consumedAt: null,
            revokedAt: null
        });

        mockFirebase.__stores.borrow_otps.set(phoneHash, {
            phoneHash,
            codeHash: hash(code),
            expiresAt: new Date(Date.now() + 10 * 60e3).toISOString(),
            attempts: 0
        });

        mockFirebase.__stores.borrow_requests.set('req-lookup-1', {
            id: 'req-lookup-1',
            status: 'pending',
            isOpen: true,
            borrower: { phone, email: 'user@test.com' }
        });

        const resVerify = await callHandler(borrowCtrl.verifyOtp, { body: { phone, code } });
        expect(resVerify.statusCode).toBe(200);
        expect(resVerify.body.requests).toHaveLength(1);
        const newCookieHeader = extractSessionCookieHeader(resVerify);
        expect(newCookieHeader).toContain('borrow_session=');
        expect(newCookieHeader).not.toContain(oldSid);

        // Old session is revoked in store and gets empty requests on /my
        const oldSessionDoc = mockFirebase.__stores.borrow_sessions.get(hash(oldSid));
        expect(oldSessionDoc.revokedAt).toBeDefined();
        expect(oldSessionDoc.revokedAt).not.toBeNull();

        const resMyOld = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: `borrow_session=${oldSid}` }
        });
        expect(resMyOld.body.requests).toHaveLength(0);

        // Old unconsumed link code cannot be exchanged after OTP recovery
        const resExchangeOld = await callHandler(borrowCtrl.exchangeLinkCode, {
            body: { code: oldLinkCode }
        });
        expect(resExchangeOld.statusCode).toBe(410);

        // New session successfully fetches request
        const resMyNew = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: newCookieHeader }
        });
        expect(resMyNew.body.requests).toHaveLength(1);
        expect(resMyNew.body.requests[0].id).toBe('req-lookup-1');
    });

    test('13b. quản lý bằng one-time link code (#code=) -> đổi sang session cookie và báo trả; OTP thu hồi link code', async () => {
        const phone = '0907654321';
        const code = '111222';
        const linkCode = 'one-time-link-code-xyz';

        mockFirebase.__stores.borrow_requests.set('req-reminder-1', {
            id: 'req-reminder-1',
            status: 'handed_over',
            isOpen: true,
            borrower: { phone, email: 'reminder@test.com' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            history: []
        });
        mockFirebase.__stores.borrow_link_codes.set(hash(linkCode), {
            requestId: 'req-reminder-1',
            expiresAt: Date.now() + 3600e3,
            consumedAt: null,
            revokedAt: null
        });

        const resEx = await callHandler(borrowCtrl.exchangeLinkCode, {
            body: { code: linkCode }
        });
        expect(resEx.statusCode).toBe(200);
        const cookieHdr = extractSessionCookieHeader(resEx);
        expect(cookieHdr).toContain('borrow_session=');

        const resReminder = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: cookieHdr }
        });
        expect(resReminder.body.requests).toHaveLength(1);

        // OTP lookup revokes session opened by linkCode
        mockFirebase.__stores.borrow_otps.set(hash(phone), {
            phoneHash: hash(phone),
            codeHash: hash(code),
            expiresAt: new Date(Date.now() + 10 * 60e3).toISOString(),
            attempts: 0
        });
        await callHandler(borrowCtrl.verifyOtp, { body: { phone, code } });

        const resAfterOtp = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: cookieHdr }
        });
        expect(resAfterOtp.body.requests).toHaveLength(0);
    });

    test('13c. báo trả qua session cookie vừa đổi từ link code -> return_pending', async () => {
        const linkCode = 'link-code-for-return';
        mockFirebase.__stores.borrow_requests.set('req-reminder-return', {
            id: 'req-reminder-return',
            status: 'handed_over',
            isOpen: true,
            borrower: { email: 'remret@test.com' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            history: []
        });
        mockFirebase.__stores.borrow_link_codes.set(hash(linkCode), {
            requestId: 'req-reminder-return',
            expiresAt: Date.now() + 3600e3,
            consumedAt: null,
            revokedAt: null
        });

        const resEx = await callHandler(borrowCtrl.exchangeLinkCode, {
            body: { code: linkCode }
        });
        const cookieHdr = extractSessionCookieHeader(resEx);

        const res = await callHandler(borrowCtrl.requestReturn, {
            params: { id: 'req-reminder-return' },
            headers: { cookie: cookieHdr }
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.request.status).toBe('return_pending');
    });

    test('14. return với session đúng khi handed_over -> return_pending; khi approved -> 409; session phiếu khác -> 404', async () => {
        const sid1 = 'session-for-req1';
        const sid2 = 'session-for-req2';

        mockFirebase.__stores.borrow_sessions.set(hash(sid1), {
            requestIds: ['req-return-1'],
            expiresAt: Date.now() + 3600e3,
            revokedAt: null
        });
        mockFirebase.__stores.borrow_sessions.set(hash(sid2), {
            requestIds: ['req-return-2'],
            expiresAt: Date.now() + 3600e3,
            revokedAt: null
        });

        mockFirebase.__stores.borrow_requests.set('req-return-1', {
            id: 'req-return-1',
            status: 'handed_over',
            isOpen: true,
            borrower: { email: 'borrower@test.com' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            history: []
        });

        mockFirebase.__stores.borrow_requests.set('req-return-2', {
            id: 'req-return-2',
            status: 'approved',
            isOpen: true,
            borrower: { email: 'borrower2@test.com' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            history: []
        });

        // 1. Wrong session (sid2 on req-return-1) -> 404
        const resWrong = await callHandler(borrowCtrl.requestReturn, {
            params: { id: 'req-return-1' },
            headers: { cookie: `borrow_session=${sid2}` }
        });
        expect(resWrong.statusCode).toBe(404);

        // 2. Correct session on approved request -> 409
        const resApproved = await callHandler(borrowCtrl.requestReturn, {
            params: { id: 'req-return-2' },
            headers: { cookie: `borrow_session=${sid2}` }
        });
        expect(resApproved.statusCode).toBe(409);
        expect(resApproved.body.error).toBe('Bạn chưa nhận thiết bị');

        // 3. Correct session on handed_over request -> 200, return_pending
        const resHandedOver = await callHandler(borrowCtrl.requestReturn, {
            params: { id: 'req-return-1' },
            headers: { cookie: `borrow_session=${sid1}` }
        });
        expect(resHandedOver.statusCode).toBe(200);
        expect(resHandedOver.body.request.status).toBe('return_pending');
        expect(notificationService.create).toHaveBeenCalled();
    });

    test('15. Người có TK (req.user có uid) tạo phiếu -> pending, borrower lấy từ profile, users/{uid}.phone được cập nhật', async () => {
        const req = {
            body: {
                phone: '0977665544',
                dueDate: getTomorrowVnDate(),
                items: [{ resourceId: 'mic', qty: 2 }]
            },
            user: {
                uid: 'user-uid-999',
                email: 'account_user@fpt.edu.vn',
                profile: {
                    name: 'Giảng viên A',
                    role: 'user',
                    department: 'IT'
                }
            }
        };

        const res = await callHandler(borrowCtrl.createBorrowRequest, req);
        expect(res.statusCode).toBe(201);
        expect(res.body.request.status).toBe('pending');
        expect(res.body.request.borrower.name).toBe('Giảng viên A');

        // Stored document checks
        const doc = mockFirebase.__stores.borrow_requests.get(res.body.request.id);
        expect(doc.status).toBe('pending');
        expect(doc.borrowerType).toBe('account');
        expect(doc.borrower.uid).toBe('user-uid-999');
        expect(doc.borrower.email).toBe('account_user@fpt.edu.vn');
        expect(doc.borrower.phone).toBe('0977665544');

        // Check users/{uid} was updated with phone
        const updatedUser = mockFirebase.__stores.users.get('user-uid-999');
        expect(updatedUser?.phone).toBe('0977665544');

        // Check account creation email was called with one-time link code
        expect(borrowEmailService.sendCreatedForAccount).toHaveBeenCalledTimes(1);
    });

    test('16. toPublicView trả về cancelReason khi phiếu bị huỷ và ẩn PII không cần thiết', async () => {
        mockFirebase.__stores.borrow_requests.set('req-canc-view', {
            id: 'req-canc-view',
            status: 'cancelled',
            isOpen: false,
            cancelReason: 'Không đủ thiết bị phục vụ đợt này',
            note: 'Ghi chú nội bộ cần ẩn sau khi đóng',
            borrower: { uid: 'uid-canc', name: 'Hidden Name', email: 'canc@test.com', phone: '0901234567' },
            items: []
        });

        const res = await callHandler(borrowCtrl.getMyRequests, {
            user: { uid: 'uid-canc', email: 'canc@test.com' }
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.requests).toHaveLength(1);
        expect(res.body.requests[0].cancelReason).toBe('Không đủ thiết bị phục vụ đợt này');
        expect(res.body.requests[0].borrower).toEqual({});
        expect(res.body.requests[0].note).toBeUndefined();
    });

    test('17. Cross-account isolation: User B có session cookie lẫn ID của User A -> không thấy phiếu User A, session bị lọc sạch', async () => {
        const sid = 'mixed-browser-session';
        mockFirebase.__stores.borrow_sessions.set(hash(sid), {
            requestIds: ['req-user-a', 'req-guest-1'],
            expiresAt: Date.now() + 3600e3,
            revokedAt: null
        });

        mockFirebase.__stores.borrow_requests.set('req-user-a', {
            id: 'req-user-a',
            status: 'pending',
            isOpen: true,
            borrower: { uid: 'uid-A', name: 'User A', email: 'a@test.com', phone: '0901111111' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            createdAt: '2026-11-10T01:00:00Z'
        });

        mockFirebase.__stores.borrow_requests.set('req-guest-1', {
            id: 'req-guest-1',
            status: 'pending',
            isOpen: true,
            borrower: { name: 'Guest', email: 'guest@test.com', phone: '0902222222' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            createdAt: '2026-11-10T02:00:00Z'
        });

        const res = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: `borrow_session=${sid}` },
            user: { uid: 'uid-B', email: 'b@test.com' }
        });

        expect(res.statusCode).toBe(200);
        const returnedIds = res.body.requests.map((r) => r.id);
        expect(returnedIds).not.toContain('req-user-a');
        expect(returnedIds).toContain('req-guest-1');

        // Session record no longer includes req-user-a
        const storedSession = mockFirebase.__stores.borrow_sessions.get(hash(sid));
        expect(storedSession.requestIds).toEqual(['req-guest-1']);
    });

    test('18. requestReturn hỗ trợ xác thực qua HttpOnly cookie hoặc tài khoản chủ phiếu', async () => {
        const rightSid = 'right-session-2';
        mockFirebase.__stores.borrow_sessions.set(hash(rightSid), {
            requestIds: ['req-multi-return'],
            expiresAt: Date.now() + 3600e3,
            revokedAt: null
        });

        mockFirebase.__stores.borrow_requests.set('req-multi-return', {
            id: 'req-multi-return',
            status: 'handed_over',
            isOpen: true,
            borrower: { name: 'Guest Multi', email: 'multi@test.com', phone: '0903333333' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            history: []
        });

        const res = await callHandler(borrowCtrl.requestReturn, {
            params: { id: 'req-multi-return' },
            headers: { cookie: `borrow_session=${rightSid}` },
            user: null
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.request.status).toBe('return_pending');
    });

    // =========================================================================
    // P0 Security Regression Tests (§5 #1–#3)
    // =========================================================================

    test('19. [P0] verify_replayed_token_must_not_mint_access_after_otp_revocation', async () => {
        const phone = '0908887776';
        const createRes = await callHandler(borrowCtrl.createBorrowRequest, {
            body: {
                name: 'Victim',
                email: 'victim@test.com',
                phone,
                dueDate: getTomorrowVnDate(),
                items: [{ resourceId: 'loa', qty: 1 }]
            },
            user: null
        });
        expect(createRes.statusCode).toBe(201);
        const verifyToken = borrowEmailService.sendVerify.mock.calls[0][1];
        const reqId = createRes.body.request.id;

        // 1. Verify email initially -> pending + session cookie
        const firstVerifyRes = await callHandler(borrowCtrl.verifyEmail, {
            body: { token: verifyToken }
        });
        expect(firstVerifyRes.statusCode).toBe(200);
        const leakedCookie = extractSessionCookieHeader(firstVerifyRes);

        // 2. Owner performs OTP recovery -> revokes old session
        const otpCode = '999888';
        mockFirebase.__stores.borrow_otps.set(hash(phone), {
            phoneHash: hash(phone),
            codeHash: hash(otpCode),
            expiresAt: new Date(Date.now() + 10 * 60e3).toISOString(),
            attempts: 0
        });
        const otpRes = await callHandler(borrowCtrl.verifyOtp, { body: { phone, code: otpCode } });
        expect(otpRes.statusCode).toBe(200);

        // 3. Attacker replays old verifyToken -> must NOT mint accessToken or cookie!
        const replayRes = await callHandler(borrowCtrl.verifyEmail, {
            body: { token: verifyToken }
        });
        expect(replayRes.statusCode).toBe(404);
        expect(replayRes.body.accessToken).toBeUndefined();
        expect(Object.keys(replayRes.cookies)).toHaveLength(0);

        // 4. Old leaked session cookie cannot open /my
        const myWithOldCookie = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: leakedCookie }
        });
        expect(myWithOldCookie.body.requests).toEqual([]);
        expect(mockFirebase.__stores.borrow_requests.get(reqId).verifyTokenHash).toBeNull();
    });

    test('20. [P0] management_link_code_is_single_use_and_expires', async () => {
        const code = 'single-use-mgmt-code-123';
        mockFirebase.__stores.borrow_requests.set('req-link-test', {
            id: 'req-link-test',
            status: 'approved',
            isOpen: true,
            borrower: { name: 'Link User', email: 'link@test.com', phone: '0904445556' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }]
        });
        mockFirebase.__stores.borrow_link_codes.set(hash(code), {
            requestId: 'req-link-test',
            createdAt: Date.now(),
            expiresAt: Date.now() + 60_000,
            consumedAt: null,
            revokedAt: null
        });

        // Two parallel exchange calls -> exactly one succeeds (200), the other returns 410
        const [r1, r2] = await Promise.all([
            callHandler(borrowCtrl.exchangeLinkCode, { body: { code } }),
            callHandler(borrowCtrl.exchangeLinkCode, { body: { code } })
        ]);

        const statuses = [r1.statusCode, r2.statusCode].sort((a, b) => a - b);
        expect(statuses).toEqual([200, 410]);

        // Expired code cannot be exchanged for a session
        const expiredCode = 'expired-mgmt-code-456';
        mockFirebase.__stores.borrow_link_codes.set(hash(expiredCode), {
            requestId: 'req-link-test',
            createdAt: Date.now() - 120_000,
            expiresAt: Date.now() - 1000,
            consumedAt: null,
            revokedAt: null
        });
        const rExpired = await callHandler(borrowCtrl.exchangeLinkCode, {
            body: { code: expiredCode }
        });
        expect(rExpired.statusCode).toBe(410);
        expect(Object.keys(rExpired.cookies)).toHaveLength(0);
    });

    test('21. [P0] closed_request_session_is_revoked_or_minimized', async () => {
        const sid = 'guest-session-to-close';
        mockFirebase.__stores.borrow_requests.set('req-to-close', {
            id: 'req-to-close',
            status: 'handed_over',
            isOpen: true,
            borrower: { name: 'Close Me', email: 'close@test.com', phone: '0906667778' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            note: 'Note bí mật không được lộ khi đóng',
            history: []
        });
        mockFirebase.__stores.borrow_sessions.set(hash(sid), {
            requestIds: ['req-to-close'],
            expiresAt: Date.now() + 3600e3,
            revokedAt: null
        });

        // Close request via transition service (returned)
        await transition('req-to-close', 'returned', {
            actor: { uid: 'admin1', email: 'admin@test.com', role: 'admin' }
        });

        // Session is revoked in DB and /my returns empty for guest cookie
        const sessionDoc = mockFirebase.__stores.borrow_sessions.get(hash(sid));
        expect(sessionDoc.revokedAt).not.toBeNull();
        expect(sessionDoc.requestIds).toEqual([]);

        const resMy = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: `borrow_session=${sid}` }
        });
        expect(resMy.statusCode).toBe(200);
        expect(resMy.body.requests).toEqual([]);
        expect(resMy.clearedCookies.borrow_session).toBeDefined();

        // Data minimization on closed request view even if serialized
        const closedPublic = borrowCtrl.toPublicView(mockFirebase.__stores.borrow_requests.get('req-to-close'));
        expect(closedPublic.borrower).toEqual({});
        expect(closedPublic.note).toBeUndefined();
    });

    test('22. [P0] HTTP dev dung borrow_session, HTTPS prod dung __Host-borrow; logout thu hoi session', async () => {
        const createHttp = await callHandler(borrowCtrl.createBorrowRequest, {
            body: {
                name: 'HTTP Guest',
                email: 'httpguest@test.com',
                phone: '0901122334',
                dueDate: getTomorrowVnDate(),
                items: [{ resourceId: 'loa', qty: 1 }]
            },
            user: null
        });
        expect(createHttp.cookies.borrow_session).toBeDefined();
        expect(createHttp.cookies.borrow_session.opts.secure).toBe(false);
        expect(createHttp.cookies['__Host-borrow']).toBeUndefined();

        const cookieHdr = extractSessionCookieHeader(createHttp);
        const logoutRes = await callHandler(borrowCtrl.logoutSession, {
            headers: { cookie: cookieHdr }
        });
        expect(logoutRes.statusCode).toBe(204);
        expect(logoutRes.clearedCookies.borrow_session).toBeDefined();

        const afterLogout = await callHandler(borrowCtrl.getMyRequests, {
            headers: { cookie: cookieHdr }
        });
        expect(afterLogout.body.requests).toEqual([]);
    });

    // =========================================================================
    // P1 Concurrency, OTP Atomic Counter & Quota Tests (§5 #7–#9)
    // =========================================================================

    test('23. [P1] concurrent_otp_requests_respect_phone_hourly_limit', async () => {
        const phone = '0901999888';
        mockFirebase.__stores.borrow_requests.set('req-otp-conc', {
            id: 'req-otp-conc',
            status: 'pending',
            isOpen: true,
            borrower: { name: 'OTP Conc', email: 'otpconc@test.com', phone },
            items: []
        });

        // 5 parallel OTP requests -> strictly 1 email emitted, sendCount=1
        const results = await Promise.all(
            Array.from({ length: 5 }, () => callHandler(borrowCtrl.requestOtp, { body: { phone } }))
        );
        results.forEach((r) => expect(r.statusCode).toBe(200));

        await new Promise((r) => setImmediate(r));
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(1);

        const otpDoc = mockFirebase.__stores.borrow_otps.get(hash(phone));
        expect(otpDoc.sendCount).toBe(1);

        // Only the deterministic code actually sent in the single email works
        const deliveredCode = borrowEmailService.sendOtp.mock.calls[0][1];

        // Also simulate hourly quota already at 3 in current window & cooldown elapsed -> 5 concurrent calls send ZERO emails
        mockFirebase.__stores.borrow_otps.set(hash(phone), {
            ...otpDoc,
            sentAt: new Date(Date.now() - 120e3).toISOString(),
            windowStart: new Date(Date.now() - 120e3).toISOString(),
            sendCount: 3
        });

        await Promise.all(
            Array.from({ length: 5 }, () => callHandler(borrowCtrl.requestOtp, { body: { phone } }))
        );
        await new Promise((r) => setImmediate(r));
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(1);

        // 5 failed verify attempts set short lockout, preventing immediate resend reset
        for (let i = 0; i < 5; i++) {
            const bad = await callHandler(borrowCtrl.verifyOtp, { body: { phone, code: '000000' } });
            expect(bad.statusCode).toBe(400);
        }
        const lockedDoc = mockFirebase.__stores.borrow_otps.get(hash(phone));
        expect(lockedDoc.lockoutUntil).toBeGreaterThan(Date.now());

        const blockedResend = await callHandler(borrowCtrl.requestOtp, { body: { phone } });
        expect(blockedResend.statusCode).toBe(200);
        await new Promise((r) => setImmediate(r));
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(1);

        // Cleanup check for deliveredCode shape
        expect(deliveredCode).toMatch(/^\d{6}$/);
    });

    test('24. [P1] concurrent_guest_creates_cannot_exceed_open_quota', async () => {
        const dueDate = getTomorrowVnDate();
        const makeGuestReq = (idx) => ({
            body: {
                name: `Guest ${idx}`,
                email: 'sameguest@test.com',
                phone: '0905556667',
                dueDate,
                items: [{ resourceId: 'loa', qty: 1 }]
            },
            user: null
        });

        // 5 concurrent guest creates -> max 3 created (201), 2 rejected (429)
        const responses = await Promise.all(
            [1, 2, 3, 4, 5].map((i) => callHandler(borrowCtrl.createBorrowRequest, makeGuestReq(i)))
        );

        const created = responses.filter((r) => r.statusCode === 201);
        const quotaRejected = responses.filter((r) => r.statusCode === 429);

        expect(created).toHaveLength(3);
        expect(quotaRejected).toHaveLength(2);
        expect(mockFirebase.__stores.borrow_requests.size).toBe(3);

        // Closing one via transition releases guest quota slot so another can be created
        await transition(created[0].body.request.id, 'expired', {
            actor: { uid: null, email: 'system', role: 'system' }
        });

        const afterClose = await callHandler(borrowCtrl.createBorrowRequest, makeGuestReq(6));
        expect(afterClose.statusCode).toBe(201);

        // Verify rollback: if sendVerify throws after closing one, creating fails 502 and quota returns to 3 (slot freed)
        await transition(created[1].body.request.id, 'expired', {
            actor: { uid: null, email: 'system', role: 'system' }
        });
        borrowEmailService.sendVerify.mockRejectedValueOnce(new Error('SMTP timeout'));
        const failMail = await callHandler(borrowCtrl.createBorrowRequest, makeGuestReq(7));
        expect(failMail.statusCode).toBe(502);

        const retrySuccess = await callHandler(borrowCtrl.createBorrowRequest, makeGuestReq(8));
        expect(retrySuccess.statusCode).toBe(201);
    });

    test('25. [P1] authenticated_user_open_request_quota_and_rate_limit', async () => {
        const limiters = require('../middleware/rate-limiters');
        const dueDate = getTomorrowVnDate();
        const makeAccountReq = (idx) => ({
            body: {
                phone: '0903334445',
                dueDate,
                items: [{ resourceId: 'loa', qty: 1 }],
                note: `Order ${idx}`
            },
            user: {
                uid: 'uid-quota-test',
                email: 'internal@fpt.edu.vn',
                profile: { name: 'Internal User', role: 'user' }
            }
        });

        // Create 12 concurrent requests for same authenticated UID -> capped at MAX_OPEN_PER_USER (10)
        const results = await Promise.all(
            Array.from({ length: 12 }, (_, idx) =>
                callHandler(borrowCtrl.createBorrowRequest, makeAccountReq(idx))
            )
        );
        const okCount = results.filter((r) => r.statusCode === 201).length;
        const capCount = results.filter((r) => r.statusCode === 429).length;
        expect(okCount).toBe(10);
        expect(capCount).toBe(2);

        // Reject one open request -> quota slot reopens for UID
        const openId = results.find((r) => r.statusCode === 201).body.request.id;
        await transition(openId, 'rejected', {
            actor: { uid: 'admin1', email: 'admin@test.com', role: 'admin' },
            note: 'Quota test reject'
        });

        const afterReject = await callHandler(borrowCtrl.createBorrowRequest, makeAccountReq(99));
        expect(afterReject.statusCode).toBe(201);

        // Authenticated rate-limiter middleware is NOT skipped; enforces 20 req/hr per UID with 429 guidance
        const mockLimiterReq = {
            user: { uid: 'uid-rate-limit-check' },
            ip: '10.0.0.5',
            headers: {},
            app: { get: () => false }
        };
        let statusCodes = [];
        for (let i = 0; i < 21; i++) {
            await new Promise((resolve) => {
                const res = {
                    statusCode: 200,
                    headers: {},
                    setHeader(k, v) {
                        this.headers[k] = v;
                    },
                    getHeader(k) {
                        return this.headers[k];
                    },
                    status(c) {
                        this.statusCode = c;
                        return this;
                    },
                    send(body) {
                        statusCodes.push({ code: this.statusCode, body });
                        resolve();
                        return this;
                    },
                    json(body) {
                        statusCodes.push({ code: this.statusCode, body });
                        resolve();
                        return this;
                    }
                };
                limiters.createAccountLimiter(mockLimiterReq, res, () => {
                    statusCodes.push({ code: 200 });
                    resolve();
                });
            });
        }
        expect(statusCodes.slice(0, 20).every((s) => s.code === 200)).toBe(true);
        expect(statusCodes[20].code).toBe(429);
        expect(statusCodes[20].body?.error || '').toContain('giới hạn');
    });
});

describe('OptionalAuth Middleware', () => {
    const optionalAuth = require('../middleware/optional-auth');

    test('No Authorization header -> req.user = null, next()', async () => {
        const req = { headers: {} };
        const res = mkRes();
        const next = jest.fn();

        await optionalAuth(req, res, next);
        expect(req.user).toBeNull();
        expect(next).toHaveBeenCalled();
    });

    test('Invalid format (not Bearer) -> 401', async () => {
        const req = { headers: { authorization: 'Basic 123456' } };
        const res = mkRes();
        const next = jest.fn();

        await optionalAuth(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('Valid Bearer token -> sets req.user and profile', async () => {
        mockFirebase.__stores.users.set('u-profile-1', {
            name: 'Nguyen Van C',
            role: 'manager',
            department: 'Logistics'
        });

        mockFirebase.admin.auth = () => ({
            verifyIdToken: jest.fn(async (token) => {
                if (token === 'good-token') {
                    return { uid: 'u-profile-1', email: 'c@test.com' };
                }
                throw new Error('Invalid token');
            })
        });

        const req = { headers: { authorization: 'Bearer good-token' } };
        const res = mkRes();
        const next = jest.fn();

        await optionalAuth(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user.uid).toBe('u-profile-1');
        expect(req.user.profile.name).toBe('Nguyen Van C');
        expect(req.user.profile.role).toBe('manager');

        // Invalid token -> 401
        const reqBad = { headers: { authorization: 'Bearer bad-token' } };
        const resBad = mkRes();
        const nextBad = jest.fn();

        await optionalAuth(reqBad, resBad, nextBad);
        expect(resBad.statusCode).toBe(401);
        expect(nextBad).not.toHaveBeenCalled();
    });
});

describe('getAvailableResources', () => {
    test('returns active resources including availableQty = 0 and hides total quantity', async () => {
        mockFirebase.__stores.resources.set('out-of-stock', {
            label: 'Hết hàng',
            category: 'Audio',
            quantity: 5,
            availableQty: 0
        });
        mockFirebase.__stores.resources.set('archived-res', {
            label: 'Đã ẩn',
            category: 'Audio',
            isActive: false,
            quantity: 3,
            availableQty: 3
        });

        const req = {};
        const res = await callHandler(borrowCtrl.getAvailableResources, req);
        expect(res.statusCode).toBe(200);

        const ids = res.body.map((r) => r.id);
        expect(ids).toContain('out-of-stock');
        expect(ids).toContain('loa');
        expect(ids).not.toContain('archived-res');

        const oos = res.body.find((r) => r.id === 'out-of-stock');
        expect(oos.availableQty).toBe(0);

        // Check that total quantity is NOT returned
        res.body.forEach((item) => {
            expect(item.quantity).toBeUndefined();
            expect(item.availableQty).toBeGreaterThanOrEqual(0);
        });
    });
});

describe('Follow-up Audit Security & Reliability Regressions', () => {
    // Test #1 from Follow-up Audit §4
    test('cross_account_exchange_must_not_consume_code', async () => {
        const dueDate = getTomorrowVnDate();
        const ownerUser = {
            uid: 'uid-owner-a',
            email: 'ownera@fpt.edu.vn',
            profile: { name: 'Owner A', role: 'user' }
        };
        const otherUser = {
            uid: 'uid-intruder-b',
            email: 'intruderb@fpt.edu.vn',
            profile: { name: 'Intruder B', role: 'user' }
        };

        const createRes = await callHandler(borrowCtrl.createBorrowRequest, {
            body: {
                phone: '0901112223',
                dueDate,
                items: [{ resourceId: 'loa', qty: 1 }]
            },
            user: ownerUser
        });
        expect(createRes.statusCode).toBe(201);
        const rawCode = borrowEmailService.sendCreatedForAccount.mock.calls[0][1];
        expect(typeof rawCode).toBe('string');

        // 1. Account B attempts to exchange A's link code -> 403, no cookie, code NOT consumed!
        const resB = await callHandler(borrowCtrl.exchangeLinkCode, {
            body: { code: rawCode },
            user: otherUser
        });
        expect(resB.statusCode).toBe(403);
        expect(Object.keys(resB.cookies)).toHaveLength(0);
        expect(mockFirebase.__stores.borrow_link_codes.get(hash(rawCode)).consumedAt).toBeNull();

        // 2. Account A still exchanges the exact same code successfully ONCE
        const resA = await callHandler(borrowCtrl.exchangeLinkCode, {
            body: { code: rawCode },
            user: ownerUser
        });
        expect(resA.statusCode).toBe(200);
        expect(resA.body.request.id).toBe(createRes.body.request.id);
        expect(resA.cookies.borrow_session).toBeDefined();
        expect(mockFirebase.__stores.borrow_link_codes.get(hash(rawCode)).consumedAt).not.toBeNull();

        // 3. Subsequent replay fails cleanly with 410
        const replay = await callHandler(borrowCtrl.exchangeLinkCode, {
            body: { code: rawCode },
            user: ownerUser
        });
        expect(replay.statusCode).toBe(410);
    });

    // Test #2 from Follow-up Audit §4
    test('create_link_failure_rolls_back_request_and_quota', async () => {
        const dueDate = getTomorrowVnDate();
        jest.spyOn(borrowLinkService, 'commitLinkCodeInTx').mockImplementationOnce(() => {
            throw new Error('Simulated Firestore write failure on borrow_link_codes');
        });

        const failRes = await callHandler(borrowCtrl.createBorrowRequest, {
            headers: { 'idempotency-key': 'idem-link-fail-1' },
            body: {
                name: 'Atomic Failure Guest',
                email: 'atomic@test.com',
                phone: '0904445556',
                dueDate,
                items: [{ resourceId: 'loa', qty: 1 }]
            },
            user: null
        });

        expect(failRes.statusCode).toBe(500);
        expect(mockFirebase.__stores.borrow_requests.size).toBe(0);
        expect(mockFirebase.__stores.borrow_quotas.size).toBe(0);
        expect(mockFirebase.__stores.borrow_link_codes.size).toBe(0);
        expect(mockFirebase.__stores.borrow_idempotency.size).toBe(0);
        expect(borrowEmailService.sendVerify).not.toHaveBeenCalled();

        // Subsequent normal retry creates exactly 1 clean request + quota + link code
        const retryRes = await callHandler(borrowCtrl.createBorrowRequest, {
            headers: { 'idempotency-key': 'idem-link-fail-1' },
            body: {
                name: 'Atomic Failure Guest',
                email: 'atomic@test.com',
                phone: '0904445556',
                dueDate,
                items: [{ resourceId: 'loa', qty: 1 }]
            },
            user: null
        });
        expect(retryRes.statusCode).toBe(201);
        expect(mockFirebase.__stores.borrow_requests.size).toBe(1);
        expect(mockFirebase.__stores.borrow_link_codes.size).toBe(1);
    });

    // Test #3 from Follow-up Audit §4
    test('session_issue_failure_after_email_does_not_create_duplicate_on_retry', async () => {
        const dueDate = getTomorrowVnDate();
        const idemKey = 'client-attempt-uuid-9876';

        // Simulate transient DB failure when issuing cookie session AFTER guest email succeeded
        jest.spyOn(borrowSessionService, 'grantRequestAccessToSession').mockRejectedValueOnce(
            new Error('Simulated session transaction unavailable')
        );

        const firstReq = {
            headers: { 'idempotency-key': idemKey },
            body: {
                name: 'Guest Session Fail',
                email: 'sessfail@test.com',
                phone: '0909998887',
                dueDate,
                items: [{ resourceId: 'mic', qty: 1 }]
            },
            user: null
        };

        const res1 = await callHandler(borrowCtrl.createBorrowRequest, firstReq);

        // Request IS created, email WAS sent, and caller receives 201 + sessionIssued:false (NOT 500 error)
        expect(res1.statusCode).toBe(201);
        expect(res1.body.sessionIssued).toBe(false);
        expect(borrowEmailService.sendVerify).toHaveBeenCalledTimes(1);
        expect(mockFirebase.__stores.borrow_requests.size).toBe(1);
        const createdId = res1.body.request.id;

        // If client still retries with same Idempotency-Key -> deduplicated: true, NO duplicate request/email/quota, and recovers session cookie!
        const resRetry = await callHandler(borrowCtrl.createBorrowRequest, firstReq);
        expect(resRetry.statusCode).toBe(200);
        expect(resRetry.body.deduplicated).toBe(true);
        expect(resRetry.body.request.id).toBe(createdId);
        expect(borrowEmailService.sendVerify).toHaveBeenCalledTimes(1);
        expect(mockFirebase.__stores.borrow_requests.size).toBe(1);
        expect(resRetry.cookies.borrow_session).toBeDefined();
    });

    // Test #5 from Follow-up Audit §4
    test('https_request_rejects_legacy_http_cookie', async () => {
        const sid = 'legacy-http-sid-value';
        mockFirebase.__stores.borrow_requests.set('req-cookie-policy', {
            id: 'req-cookie-policy',
            status: 'handed_over',
            isOpen: true,
            borrower: { name: 'Cookie Tester', email: 'cookie@test.com', phone: '0907771122' },
            items: [{ resourceId: 'loa', label: 'Loa / Âm thanh', qty: 1 }],
            dueDate: getTomorrowVnDate(),
            dueAt: new Date(Date.now() + 36 * 3600e3).toISOString(),
            history: []
        });
        mockFirebase.__stores.borrow_sessions.set(hash(sid), {
            requestIds: ['req-cookie-policy'],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expiresAt: Date.now() + 3600e3,
            revokedAt: null
        });

        // HTTPS via req.secure=true carrying ONLY legacy borrow_session cookie -> MUST reject
        const httpsLegacyMy = await callHandler(borrowCtrl.getMyRequests, {
            secure: true,
            headers: { cookie: `borrow_session=${sid}` }
        });
        expect(httpsLegacyMy.statusCode).toBe(200);
        expect(httpsLegacyMy.body.requests).toEqual([]);

        const httpsLegacyReturn = await callHandler(borrowCtrl.requestReturn, {
            secure: true,
            params: { id: 'req-cookie-policy' },
            headers: { cookie: `borrow_session=${sid}` }
        });
        expect(httpsLegacyReturn.statusCode).toBe(404);

        // HTTPS via x-forwarded-proto carrying ONLY borrow_session -> MUST reject
        const fwdLegacyMy = await callHandler(borrowCtrl.getMyRequests, {
            headers: { 'x-forwarded-proto': 'https', cookie: `borrow_session=${sid}` }
        });
        expect(fwdLegacyMy.body.requests).toEqual([]);

        // HTTPS with proper __Host-borrow cookie -> succeeds & allows actions
        const httpsStrictMy = await callHandler(borrowCtrl.getMyRequests, {
            secure: true,
            headers: { cookie: `__Host-borrow=${sid}` }
        });
        expect(httpsStrictMy.statusCode).toBe(200);
        expect(httpsStrictMy.body.requests).toHaveLength(1);
        expect(httpsStrictMy.body.requests[0].id).toBe('req-cookie-policy');

        // Creating a guest request over HTTPS mints __Host-borrow with Secure flag (no borrow_session)
        const createHttps = await callHandler(borrowCtrl.createBorrowRequest, {
            secure: true,
            body: {
                name: 'HTTPS Guest',
                email: 'httpsguest@test.com',
                phone: '0902223344',
                dueDate: getTomorrowVnDate(),
                items: [{ resourceId: 'loa', qty: 1 }]
            },
            user: null
        });
        expect(createHttps.statusCode).toBe(201);
        expect(createHttps.cookies['__Host-borrow']).toBeDefined();
        expect(createHttps.cookies['__Host-borrow'].opts).toMatchObject({
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/'
        });
        expect(createHttps.cookies.borrow_session).toBeUndefined();
    });
});

