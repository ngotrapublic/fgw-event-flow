let mockFirebase;

jest.mock('../config/firebase', () => {
    mockFirebase = require('./helpers/firestoreMock').buildFirebaseMock({
        resources: {},
        borrow_requests: {},
        borrow_otps: {},
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
const notificationService = require('../services/notificationService');
const { hash } = require('../services/borrow-token-service');
const HttpError = require('../utils/http-error');

const mkRes = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(payload) {
        this.body = payload;
        return this;
    }
});

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
    mockFirebase.__stores.audit_logs.clear();
    mockFirebase.__stores.users.clear();

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
    test('1. Khách tạo phiếu hợp lệ -> unverified, có accessToken, sendVerify được gọi 1 lần, doc không chứa token gốc', async () => {
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
        expect(res.body.accessToken).toBeDefined();
        expect(typeof res.body.accessToken).toBe('string');
        expect(res.body.request.status).toBe('unverified');
        expect(res.body.request.borrower.email).toBe('ng***@gmail.com');
        expect(res.body.request.borrower.phone).toBe('091****678');

        // Verify email called once
        expect(borrowEmailService.sendVerify).toHaveBeenCalledTimes(1);

        // Doc in store does not contain raw tokens
        const createdId = res.body.request.id;
        const storedDoc = mockFirebase.__stores.borrow_requests.get(createdId);
        expect(storedDoc).toBeDefined();
        expect(storedDoc.accessToken).toBeUndefined();
        expect(storedDoc.verifyToken).toBeUndefined();
        expect(storedDoc.accessTokenHash).toBe(hash(res.body.accessToken));
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

    test('8. verify token đúng -> pending, thông báo được gọi; gọi lại -> 200 idempotent; token sai -> 404; quá hạn -> 410', async () => {
        const rawToken = 'secret-verify-token-123';
        const verifyTokenHash = hash(rawToken);

        mockFirebase.__stores.borrow_requests.set('req-verify-1', {
            id: 'req-verify-1',
            status: 'unverified',
            isOpen: true,
            verifyTokenHash,
            verifyExpiresAt: new Date(Date.now() + 24 * 3600e3).toISOString(),
            borrower: { name: 'Test Verify', email: 'verify@test.com', phone: '0901111222' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            dueDate: getTomorrowVnDate(),
            history: []
        });

        // Wrong token -> 404
        const resWrong = await callHandler(borrowCtrl.verifyEmail, { body: { token: 'invalid-token' } });
        expect(resWrong.statusCode).toBe(404);

        // Correct token -> 200, status pending, notification called
        const resCorrect = await callHandler(borrowCtrl.verifyEmail, { body: { token: rawToken } });
        expect(resCorrect.statusCode).toBe(200);
        expect(resCorrect.body.request.status).toBe('pending');
        expect(notificationService.create).toHaveBeenCalled();

        // Idempotent call again -> 200
        const resAgain = await callHandler(borrowCtrl.verifyEmail, { body: { token: rawToken } });
        expect(resAgain.statusCode).toBe(200);
        expect(resAgain.body.request.status).toBe('pending');

        // Expired token -> 410
        const expiredToken = 'expired-token-456';
        mockFirebase.__stores.borrow_requests.set('req-verify-expired', {
            id: 'req-verify-expired',
            status: 'unverified',
            isOpen: true,
            verifyTokenHash: hash(expiredToken),
            verifyExpiresAt: new Date(Date.now() - 1000).toISOString(), // expired
            borrower: { email: 'exp@test.com' },
            history: []
        });

        const resExpired = await callHandler(borrowCtrl.verifyEmail, { body: { token: expiredToken } });
        expect(resExpired.statusCode).toBe(410);
    });

    test('9. my với 1 token đúng + 1 token rác -> 1 phiếu, invalidTokens chứa token rác. Response không có history/*Hash/uid', async () => {
        const validToken = 'my-valid-token-777';
        mockFirebase.__stores.borrow_requests.set('req-my-1', {
            id: 'req-my-1',
            status: 'pending',
            isOpen: true,
            accessTokenHash: hash(validToken),
            verifyTokenHash: 'some-hash',
            borrower: { uid: 'secret-uid', name: 'Nguyễn My', email: 'my@test.com', phone: '0988777666' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            history: [{ status: 'created', note: 'secret' }]
        });

        const junkToken = 'junk-token-999';
        const req = {
            headers: {
                'x-borrow-tokens': `${validToken},${junkToken}`
            },
            user: null
        };

        const res = await callHandler(borrowCtrl.getMyRequests, req);
        expect(res.statusCode).toBe(200);
        expect(res.body.requests).toHaveLength(1);
        expect(res.body.requests[0].id).toBe('req-my-1');
        expect(res.body.invalidTokens).toEqual([junkToken]);

        // Security check: no uid, history, or hash in public view
        const item = res.body.requests[0];
        expect(item.history).toBeUndefined();
        expect(item.accessTokenHash).toBeUndefined();
        expect(item.verifyTokenHash).toBeUndefined();
        expect(item.borrower.uid).toBeUndefined();
        expect(item.borrower.email).toBe('my***@test.com');
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

        // 5th attempt with CORRECT code -> 200
        const rCorrect = await callHandler(borrowCtrl.verifyOtp, { body: { phone, code } });
        expect(rCorrect.statusCode).toBe(200);
        expect(rCorrect.body.accessTokens).toHaveLength(1);

        // OTP doc must be deleted
        expect(mockFirebase.__stores.borrow_otps.has(phoneHash)).toBe(false);
    });

    test('13. lookup/verify đúng -> token mới mở được phiếu; token cũ -> my trả trong invalidTokens', async () => {
        const phone = '0901234567';
        const code = '654321';
        const phoneHash = hash(phone);
        const oldToken = 'old-access-token-000';

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
            accessTokenHash: hash(oldToken),
            borrower: { phone, email: 'user@test.com' }
        });

        const resVerify = await callHandler(borrowCtrl.verifyOtp, { body: { phone, code } });
        expect(resVerify.statusCode).toBe(200);
        expect(resVerify.body.accessTokens).toHaveLength(1);

        const newToken = resVerify.body.accessTokens[0];
        expect(newToken).not.toBe(oldToken);

        // Old token is now invalid in getMyRequests
        const resMyOld = await callHandler(borrowCtrl.getMyRequests, {
            headers: { 'x-borrow-tokens': oldToken }
        });
        expect(resMyOld.body.invalidTokens).toContain(oldToken);

        // New token successfully fetches request
        const resMyNew = await callHandler(borrowCtrl.getMyRequests, {
            headers: { 'x-borrow-tokens': newToken }
        });
        expect(resMyNew.body.requests).toHaveLength(1);
        expect(resMyNew.body.requests[0].id).toBe('req-lookup-1');
    });

    test('14. return với token đúng khi handed_over -> return_pending; khi approved -> 409; token phiếu khác -> 404', async () => {
        const token1 = 'token-for-req1';
        const token2 = 'token-for-req2';

        mockFirebase.__stores.borrow_requests.set('req-return-1', {
            id: 'req-return-1',
            status: 'handed_over',
            isOpen: true,
            accessTokenHash: hash(token1),
            borrower: { email: 'borrower@test.com' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            history: []
        });

        mockFirebase.__stores.borrow_requests.set('req-return-2', {
            id: 'req-return-2',
            status: 'approved',
            isOpen: true,
            accessTokenHash: hash(token2),
            borrower: { email: 'borrower2@test.com' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            history: []
        });

        // 1. Wrong token (token2 on req-return-1) -> 404
        const resWrong = await callHandler(borrowCtrl.requestReturn, {
            params: { id: 'req-return-1' },
            headers: { 'x-borrow-token': token2 }
        });
        expect(resWrong.statusCode).toBe(404);

        // 2. Correct token on approved request -> 409
        const resApproved = await callHandler(borrowCtrl.requestReturn, {
            params: { id: 'req-return-2' },
            headers: { 'x-borrow-token': token2 }
        });
        expect(resApproved.statusCode).toBe(409);
        expect(resApproved.body.error).toBe('Bạn chưa nhận thiết bị');

        // 3. Correct token on handed_over request -> 200, return_pending
        const resHandedOver = await callHandler(borrowCtrl.requestReturn, {
            params: { id: 'req-return-1' },
            headers: { 'x-borrow-token': token1 }
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

        // Check account creation email was called
        expect(borrowEmailService.sendCreatedForAccount).toHaveBeenCalledTimes(1);
    });

    test('16. toPublicView trả về cancelReason khi phiếu bị huỷ', async () => {
        const token = 'token-cancelled-view';
        mockFirebase.__stores.borrow_requests.set('req-canc-view', {
            id: 'req-canc-view',
            status: 'cancelled',
            isOpen: false,
            accessTokenHash: hash(token),
            cancelReason: 'Không đủ thiết bị phục vụ đợt này',
            borrower: { email: 'canc@test.com' },
            items: []
        });

        const res = await callHandler(borrowCtrl.getMyRequests, {
            headers: { 'x-borrow-tokens': token }
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.requests).toHaveLength(1);
        expect(res.body.requests[0].cancelReason).toBe('Không đủ thiết bị phục vụ đợt này');
    });

    test('17. Cross-account isolation: User B với token cũ của User A trong x-borrow-tokens -> không thấy phiếu User A, token bị đẩy vào invalidTokens', async () => {
        const tokenA = 'token-owned-by-user-A';
        const guestToken = 'token-owned-by-guest';

        mockFirebase.__stores.borrow_requests.set('req-user-a', {
            id: 'req-user-a',
            status: 'pending',
            isOpen: true,
            accessTokenHash: hash(tokenA),
            borrower: { uid: 'uid-A', name: 'User A', email: 'a@test.com', phone: '0901111111' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            createdAt: '2026-11-10T01:00:00Z'
        });

        mockFirebase.__stores.borrow_requests.set('req-guest-1', {
            id: 'req-guest-1',
            status: 'pending',
            isOpen: true,
            accessTokenHash: hash(guestToken),
            borrower: { name: 'Guest', email: 'guest@test.com', phone: '0902222222' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            createdAt: '2026-11-10T02:00:00Z'
        });

        // Authenticated as User B (has no own requests yet), passes User A's leaked token and a guest token
        const res = await callHandler(borrowCtrl.getMyRequests, {
            headers: { 'x-borrow-tokens': `${tokenA},${guestToken}` },
            user: { uid: 'uid-B', email: 'b@test.com' }
        });

        expect(res.statusCode).toBe(200);
        // Must ONLY see guest request (or own requests), NEVER User A's request!
        const returnedIds = res.body.requests.map((r) => r.id);
        expect(returnedIds).not.toContain('req-user-a');
        expect(returnedIds).toContain('req-guest-1');
        // User A's leaked token MUST be evicted via invalidTokens
        expect(res.body.invalidTokens).toContain(tokenA);
    });

    test('18. requestReturn hỗ trợ xác thực qua x-borrow-tokens (nhiều token)', async () => {
        const wrongToken = 'wrong-tok-1';
        const rightToken = 'right-tok-2';

        mockFirebase.__stores.borrow_requests.set('req-multi-return', {
            id: 'req-multi-return',
            status: 'handed_over',
            isOpen: true,
            accessTokenHash: hash(rightToken),
            borrower: { name: 'Guest Multi', email: 'multi@test.com', phone: '0903333333' },
            items: [{ resourceId: 'loa', label: 'Loa', qty: 1 }],
            history: []
        });

        const res = await callHandler(borrowCtrl.requestReturn, {
            params: { id: 'req-multi-return' },
            headers: {
                'x-borrow-token': wrongToken,
                'x-borrow-tokens': `${wrongToken},${rightToken}`
            },
            user: null
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.request.status).toBe('return_pending');
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
    test('only returns resources with availableQty > 0 and hides total quantity', async () => {
        mockFirebase.__stores.resources.set('out-of-stock', {
            label: 'Hết hàng',
            category: 'Audio',
            quantity: 5,
            availableQty: 0
        });

        const req = {};
        const res = await callHandler(borrowCtrl.getAvailableResources, req);
        expect(res.statusCode).toBe(200);

        const ids = res.body.map((r) => r.id);
        expect(ids).not.toContain('out-of-stock');
        expect(ids).toContain('loa');

        // Check that total quantity is NOT returned
        res.body.forEach((item) => {
            expect(item.quantity).toBeUndefined();
            expect(item.availableQty).toBeGreaterThan(0);
        });
    });
});

