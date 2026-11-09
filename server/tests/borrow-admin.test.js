let mockFirebase;

jest.mock('../config/firebase', () => {
    mockFirebase = require('./helpers/firestoreMock').buildFirebaseMock({
        resources: {},
        borrow_requests: {},
        audit_logs: {},
        users: {}
    });
    return mockFirebase;
});

jest.mock('../services/borrow-email-service', () => ({
    sendApproved: jest.fn(() => Promise.resolve()),
    sendRejected: jest.fn(() => Promise.resolve()),
    sendCancelled: jest.fn(() => Promise.resolve()),
    sendReturned: jest.fn(() => Promise.resolve()),
    sendDueSoon: jest.fn(() => Promise.resolve()),
    sendOverdue: jest.fn(() => Promise.resolve())
}));

jest.mock('../services/notificationService', () => ({
    create: jest.fn(() => Promise.resolve()),
    getAdminUids: jest.fn(() => Promise.resolve(['admin1'])),
    getUidsByRoles: jest.fn(() => Promise.resolve(['admin1', 'manager1']))
}));

const adminCtrl = require('../controllers/borrow-admin-controller');
const borrowEmailService = require('../services/borrow-email-service');
const { requireRole } = require('../middleware/authMiddleware');

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

beforeEach(() => {
    mockFirebase.__stores.resources.clear();
    mockFirebase.__stores.borrow_requests.clear();
    mockFirebase.__stores.audit_logs.clear();
    mockFirebase.__stores.users.clear();

    jest.clearAllMocks();

    mockFirebase.__stores.resources.set('loa', {
        label: 'Loa kéo',
        category: 'Audio',
        quantity: 10,
        availableQty: 10
    });
    mockFirebase.__stores.resources.set('mic', {
        label: 'Microphone',
        category: 'Audio',
        quantity: 5,
        availableQty: 5
    });
});

describe('Phase 03 — Borrow Admin API (/api/borrow/admin)', () => {
    test('1. User role "user" gọi requireRole(["admin", "manager"]) -> 403 Forbidden', async () => {
        const req = {
            user: { uid: 'user-normal', email: 'user@test.com', role: 'user' }
        };
        const res = mkRes();
        const next = jest.fn();

        const mw = requireRole(['admin', 'manager']);
        await mw(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res.body.error).toContain('Forbidden');
        expect(next).not.toHaveBeenCalled();
    });

    test('2. Manager approve -> status=approved, kho trừ, sendApproved được gọi', async () => {
        mockFirebase.__stores.borrow_requests.set('req-app-1', {
            id: 'req-app-1',
            status: 'pending',
            isOpen: true,
            borrower: { name: 'Nguyen Van A', email: 'a@test.com', phone: '0901234567' },
            items: [{ resourceId: 'loa', label: 'Loa kéo', qty: 2 }],
            accessTokenHash: 'secret-hash',
            history: []
        });

        const req = {
            params: { id: 'req-app-1' },
            user: { uid: 'mgr-1', email: 'manager@test.com', role: 'manager' }
        };

        const res = await callHandler(adminCtrl.approveRequest, req);
        expect(res.statusCode).toBe(200);
        expect(res.body.request.status).toBe('approved');
        expect(res.body.request.approvedAt).toBeDefined();
        expect(res.body.emailSent).toBe(true);

        // Check stock deducted in resources store
        const loa = mockFirebase.__stores.resources.get('loa');
        expect(loa.availableQty).toBe(8);

        // Check sendApproved called
        expect(borrowEmailService.sendApproved).toHaveBeenCalledTimes(1);

        // Check response hides *Hash
        expect(res.body.request.accessTokenHash).toBeUndefined();
    });

    test('3. Approve khi thiếu hàng -> 409 có shortages, status vẫn pending', async () => {
        mockFirebase.__stores.borrow_requests.set('req-short-1', {
            id: 'req-short-1',
            status: 'pending',
            isOpen: true,
            borrower: { name: 'Nguyen Van B', email: 'b@test.com' },
            items: [{ resourceId: 'mic', label: 'Microphone', qty: 10 }], // only 5 available
            history: []
        });

        const req = {
            params: { id: 'req-short-1' },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        };

        const res = await callHandler(adminCtrl.approveRequest, req);
        expect(res.statusCode).toBe(409);
        expect(res.body.details?.shortages).toBeDefined();
        expect(res.body.details.shortages[0].resourceId).toBe('mic');
        expect(res.body.details.shortages[0].available).toBe(5);
        expect(res.body.details.shortages[0].requested).toBe(10);

        // Status remains pending, stock untouched
        const reqDoc = mockFirebase.__stores.borrow_requests.get('req-short-1');
        expect(reqDoc.status).toBe('pending');
        expect(mockFirebase.__stores.resources.get('mic').availableQty).toBe(5);
    });

    test('4. Reject không có reason hoặc reason < 3 ký tự -> 400', async () => {
        mockFirebase.__stores.borrow_requests.set('req-rej-1', {
            id: 'req-rej-1',
            status: 'pending',
            items: []
        });

        const reqNoReason = {
            params: { id: 'req-rej-1' },
            body: { reason: '' },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        };
        const resNo = await callHandler(adminCtrl.rejectRequest, reqNoReason);
        expect(resNo.statusCode).toBe(400);

        const reqShortReason = {
            params: { id: 'req-rej-1' },
            body: { reason: 'ab' },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        };
        const resShort = await callHandler(adminCtrl.rejectRequest, reqShortReason);
        expect(resShort.statusCode).toBe(400);

        // Valid reason -> 200, rejected, sendRejected called
        const reqValid = {
            params: { id: 'req-rej-1' },
            body: { reason: 'Trùng lịch sử dụng nội bộ phòng ban' },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        };
        const resValid = await callHandler(adminCtrl.rejectRequest, reqValid);
        expect(resValid.statusCode).toBe(200);
        expect(resValid.body.request.status).toBe('rejected');
        expect(resValid.body.request.rejectReason).toBe('Trùng lịch sử dụng nội bộ phòng ban');
        expect(borrowEmailService.sendRejected).toHaveBeenCalledTimes(1);
    });

    test('5. confirm-return đủ -> returned; thiếu 1 -> returned_with_issue + kho cộng đúng; có returnNote -> returned_with_issue', async () => {
        // Setup: loa available = 7 (3 borrowed), mic available = 3 (2 borrowed)
        mockFirebase.__stores.resources.set('loa', { quantity: 10, availableQty: 7 });
        mockFirebase.__stores.resources.set('mic', { quantity: 5, availableQty: 3 });

        // Case A: Tra du -> returned
        mockFirebase.__stores.borrow_requests.set('req-ret-full', {
            id: 'req-ret-full',
            status: 'return_pending',
            isOpen: true,
            borrower: { email: 'ret@test.com' },
            items: [
                { resourceId: 'loa', qty: 2 },
                { resourceId: 'mic', qty: 1 }
            ]
        });

        const resFull = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-ret-full' },
            body: {
                items: [
                    { resourceId: 'loa', receivedQty: 2 },
                    { resourceId: 'mic', receivedQty: 1 }
                ],
                returnNote: ''
            },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        });
        expect(resFull.statusCode).toBe(200);
        expect(resFull.body.request.status).toBe('returned');
        expect(mockFirebase.__stores.resources.get('loa').availableQty).toBe(9);
        expect(mockFirebase.__stores.resources.get('mic').availableQty).toBe(4);
        expect(borrowEmailService.sendReturned).toHaveBeenCalled();

        // Case B: Thieu 1 loa -> returned_with_issue, restock only receivedQty (1 loa)
        mockFirebase.__stores.borrow_requests.set('req-ret-partial', {
            id: 'req-ret-partial',
            status: 'handed_over',
            isOpen: true,
            borrower: { email: 'ret2@test.com' },
            items: [{ resourceId: 'loa', qty: 2 }]
        });

        const resPartial = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-ret-partial' },
            body: {
                items: [{ resourceId: 'loa', receivedQty: 1 }],
                returnNote: 'Mất 1 cái loa'
            },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        });
        expect(resPartial.statusCode).toBe(200);
        expect(resPartial.body.request.status).toBe('returned_with_issue');
        expect(resPartial.body.request.returnNote).toBe('Mất 1 cái loa');
        // Available loa was 9, received 1 -> 10
        expect(mockFirebase.__stores.resources.get('loa').availableQty).toBe(10);

        // Case C: Du so luong nhung co returnNote -> returned_with_issue
        mockFirebase.__stores.borrow_requests.set('req-ret-note', {
            id: 'req-ret-note',
            status: 'handed_over',
            isOpen: true,
            borrower: { email: 'ret3@test.com' },
            items: [{ resourceId: 'mic', qty: 1 }]
        });
        const resNote = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-ret-note' },
            body: {
                items: [{ resourceId: 'mic', receivedQty: 1 }],
                returnNote: 'Micro bị xước vỏ'
            },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        });
        expect(resNote.statusCode).toBe(200);
        expect(resNote.body.request.status).toBe('returned_with_issue');
    });

    test('6. confirm-return thiếu resourceId hoặc receivedQty > qty -> 400', async () => {
        mockFirebase.__stores.borrow_requests.set('req-bad-ret', {
            id: 'req-bad-ret',
            status: 'return_pending',
            items: [
                { resourceId: 'loa', qty: 2 },
                { resourceId: 'mic', qty: 1 }
            ]
        });

        // Missing resource mic
        const resMissing = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-bad-ret' },
            body: { items: [{ resourceId: 'loa', receivedQty: 2 }] },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        });
        expect(resMissing.statusCode).toBe(400);

        // receivedQty > qty (3 > 2)
        const resOver = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-bad-ret' },
            body: {
                items: [
                    { resourceId: 'loa', receivedQty: 3 },
                    { resourceId: 'mic', receivedQty: 1 }
                ]
            },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        });
        expect(resOver.statusCode).toBe(400);
    });

    test('7. confirm-return trực tiếp từ handed_over -> thành công', async () => {
        mockFirebase.__stores.borrow_requests.set('req-from-ho', {
            id: 'req-from-ho',
            status: 'handed_over',
            isOpen: true,
            borrower: { email: 'ho@test.com' },
            items: [{ resourceId: 'mic', qty: 1 }]
        });

        const res = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-from-ho' },
            body: { items: [{ resourceId: 'mic', receivedQty: 1 }] },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.request.status).toBe('returned');
    });

    test('8. cancel từ approved -> kho cộng đủ, sendCancelled được gọi', async () => {
        mockFirebase.__stores.resources.set('loa', { quantity: 10, availableQty: 7 }); // 3 borrowed
        mockFirebase.__stores.borrow_requests.set('req-cancel-1', {
            id: 'req-cancel-1',
            status: 'approved',
            isOpen: true,
            borrower: { email: 'cancel@test.com' },
            items: [{ resourceId: 'loa', qty: 3 }]
        });

        const res = await callHandler(adminCtrl.cancelRequest, {
            params: { id: 'req-cancel-1' },
            body: { reason: 'Sự kiện bị hoãn đột xuất' },
            user: { uid: 'admin-1', email: 'admin@test.com', role: 'admin' }
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.request.status).toBe('cancelled');
        expect(res.body.request.cancelReason).toBe('Sự kiện bị hoãn đột xuất');

        // Stock restored from 7 back to 10
        expect(mockFirebase.__stores.resources.get('loa').availableQty).toBe(10);
        expect(borrowEmailService.sendCancelled).toHaveBeenCalledTimes(1);
    });

    test('9. List mặc định không có unverified/expired; response không có *Hash', async () => {
        mockFirebase.__stores.borrow_requests.set('req-unver', {
            id: 'req-unver',
            status: 'unverified',
            createdAt: '2026-11-09T01:00:00Z',
            verifyTokenHash: 'hash1'
        });
        mockFirebase.__stores.borrow_requests.set('req-exp', {
            id: 'req-exp',
            status: 'expired',
            createdAt: '2026-11-09T02:00:00Z',
            accessTokenHash: 'hash2'
        });
        mockFirebase.__stores.borrow_requests.set('req-pend', {
            id: 'req-pend',
            status: 'pending',
            createdAt: '2026-11-09T03:00:00Z',
            accessTokenHash: 'hash3',
            borrower: { name: 'Nguyen C', email: 'c@test.com', phone: '0912345678' }
        });
        mockFirebase.__stores.borrow_requests.set('req-app', {
            id: 'req-app',
            status: 'approved',
            createdAt: '2026-11-09T04:00:00Z',
            accessTokenHash: 'hash4'
        });

        const res = await callHandler(adminCtrl.getRequests, { query: {} });
        expect(res.statusCode).toBe(200);

        const ids = res.body.requests.map((r) => r.id);
        expect(ids).toContain('req-pend');
        expect(ids).toContain('req-app');
        expect(ids).not.toContain('req-unver');
        expect(ids).not.toContain('req-exp');

        // Ensure *Hash is deleted
        res.body.requests.forEach((r) => {
            expect(r.accessTokenHash).toBeUndefined();
            expect(r.verifyTokenHash).toBeUndefined();
        });

        // Borrower information is full (not masked)
        const pend = res.body.requests.find((r) => r.id === 'req-pend');
        expect(pend.borrower.email).toBe('c@test.com');
        expect(pend.borrower.phone).toBe('0912345678');
    });

    test('10. getCounts trả về số lượng chính xác cho các trạng thái và overdue', async () => {
        const pastDate = new Date(Date.now() - 3600e3).toISOString();
        const futureDate = new Date(Date.now() + 3600e3).toISOString();

        mockFirebase.__stores.borrow_requests.set('c-pend', { id: 'c-pend', status: 'pending' });
        mockFirebase.__stores.borrow_requests.set('c-app', { id: 'c-app', status: 'approved' });
        mockFirebase.__stores.borrow_requests.set('c-ho-overdue', {
            id: 'c-ho-overdue',
            status: 'handed_over',
            dueAt: pastDate
        });
        mockFirebase.__stores.borrow_requests.set('c-ho-normal', {
            id: 'c-ho-normal',
            status: 'handed_over',
            dueAt: futureDate
        });
        mockFirebase.__stores.borrow_requests.set('c-rp-overdue', {
            id: 'c-rp-overdue',
            status: 'return_pending',
            dueAt: pastDate
        });

        const res = await callHandler(adminCtrl.getCounts, {});
        expect(res.statusCode).toBe(200);
        expect(res.body.pending).toBe(1);
        expect(res.body.approved).toBe(1);
        expect(res.body.handed_over).toBe(2);
        expect(res.body.return_pending).toBe(1);
        expect(res.body.overdue).toBe(2); // c-ho-overdue + c-rp-overdue
    });
});
