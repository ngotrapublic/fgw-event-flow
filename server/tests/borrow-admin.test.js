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

const QRCode = require('qrcode');
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

    test('11. confirm-return kiểm tra tập resourceId (H1): trùng lặp, thiếu món -> 400; đảo thứ tự -> 200', async () => {
        mockFirebase.__stores.borrow_requests.set('req-h1-test', {
            id: 'req-h1-test',
            status: 'handed_over',
            isOpen: true,
            borrower: { email: 'h1@test.com' },
            items: [
                { resourceId: 'loa', qty: 2 },
                { resourceId: 'mic', qty: 1 }
            ]
        });

        const adminUser = { uid: 'admin-1', email: 'admin@test.com', role: 'admin' };

        // Duplicate resourceId (loa x 2) -> 400
        const resDup = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-h1-test' },
            body: {
                items: [
                    { resourceId: 'loa', receivedQty: 2 },
                    { resourceId: 'loa', receivedQty: 0 }
                ]
            },
            user: adminUser
        });
        expect(resDup.statusCode).toBe(400);
        expect(resDup.body.error).toContain('không khớp');

        // Missing resourceId (only loa, missing mic) -> 400
        const resMissing = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-h1-test' },
            body: {
                items: [{ resourceId: 'loa', receivedQty: 2 }]
            },
            user: adminUser
        });
        expect(resMissing.statusCode).toBe(400);
        expect(resMissing.body.error).toContain('không khớp');

        // Extra unexpected resourceId -> 400
        const resExtra = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-h1-test' },
            body: {
                items: [
                    { resourceId: 'loa', receivedQty: 2 },
                    { resourceId: 'mic', receivedQty: 1 },
                    { resourceId: 'other', receivedQty: 1 }
                ]
            },
            user: adminUser
        });
        expect(resExtra.statusCode).toBe(400);
        expect(resExtra.body.error).toContain('không khớp');

        // Out of order: [mic, loa] -> exact set matches -> 200
        const resOutOfOrder = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-h1-test' },
            body: {
                items: [
                    { resourceId: 'mic', receivedQty: 1 },
                    { resourceId: 'loa', receivedQty: 2 }
                ]
            },
            user: adminUser
        });
        expect(resOutOfOrder.statusCode).toBe(200);
        expect(resOutOfOrder.body.request.status).toBe('returned');
    });

    test('12. confirm-return kiểm tra returnNote và reset isOverdue', async () => {
        mockFirebase.__stores.borrow_requests.set('req-ret-note-check', {
            id: 'req-ret-note-check',
            status: 'handed_over',
            isOpen: true,
            isOverdue: true,
            borrower: { email: 'overdue@test.com' },
            items: [{ resourceId: 'loa', qty: 1 }]
        });

        const adminUser = { uid: 'admin-1', email: 'admin@test.com', role: 'admin' };

        // returnNote not string -> 400
        const resNonStr = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-ret-note-check' },
            body: {
                items: [{ resourceId: 'loa', receivedQty: 1 }],
                returnNote: 12345
            },
            user: adminUser
        });
        expect(resNonStr.statusCode).toBe(400);

        // returnNote > 500 chars -> 400
        const resTooLong = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-ret-note-check' },
            body: {
                items: [{ resourceId: 'loa', receivedQty: 1 }],
                returnNote: 'a'.repeat(501)
            },
            user: adminUser
        });
        expect(resTooLong.statusCode).toBe(400);

        // Valid return -> sets isOverdue: false
        const resSuccess = await callHandler(adminCtrl.confirmReturn, {
            params: { id: 'req-ret-note-check' },
            body: {
                items: [{ resourceId: 'loa', receivedQty: 1 }]
            },
            user: adminUser
        });
        expect(resSuccess.statusCode).toBe(200);
        expect(resSuccess.body.request.status).toBe('returned');

        const saved = mockFirebase.__stores.borrow_requests.get('req-ret-note-check');
        expect(saved.isOverdue).toBe(false);
    });

    test('13. getRequests lọc overdue=true qua Firestore query và phân trang cursor', async () => {
        const now = Date.now();
        const past1 = new Date(now - 3600e3).toISOString();
        const past2 = new Date(now - 7200e3).toISOString(); // older dueAt
        const future = new Date(now + 3600e3).toISOString();

        mockFirebase.__stores.borrow_requests.set('req-od-1', {
            id: 'req-od-1',
            status: 'handed_over',
            dueAt: past1,
            createdAt: '2026-11-09T01:00:00Z'
        });
        mockFirebase.__stores.borrow_requests.set('req-od-2', {
            id: 'req-od-2',
            status: 'return_pending',
            dueAt: past2,
            createdAt: '2026-11-09T02:00:00Z'
        });
        mockFirebase.__stores.borrow_requests.set('req-not-od', {
            id: 'req-not-od',
            status: 'handed_over',
            dueAt: future,
            createdAt: '2026-11-09T03:00:00Z'
        });
        mockFirebase.__stores.borrow_requests.set('req-pend-past', {
            id: 'req-pend-past',
            status: 'pending', // not in handed_over or return_pending
            dueAt: past1,
            createdAt: '2026-11-09T04:00:00Z'
        });

        // 1. Filter overdue=true, limit=1
        const resPage1 = await callHandler(adminCtrl.getRequests, {
            query: { overdue: 'true', limit: '1' }
        });
        expect(resPage1.statusCode).toBe(200);
        expect(resPage1.body.requests.length).toBe(1);
        expect(resPage1.body.requests[0].id).toBe('req-od-2'); // past2 is earlier than past1
        expect(resPage1.body.nextCursor).toBe('req-od-2');

        // 2. Fetch page 2 using cursor
        const resPage2 = await callHandler(adminCtrl.getRequests, {
            query: { overdue: 'true', limit: '1', cursor: resPage1.body.nextCursor }
        });
        expect(resPage2.statusCode).toBe(200);
        expect(resPage2.body.requests.length).toBe(1);
        expect(resPage2.body.requests[0].id).toBe('req-od-1');
        expect(resPage2.body.nextCursor).toBeNull();

        // 3. Invalid cursor -> 400
        const resBadCursor = await callHandler(adminCtrl.getRequests, {
            query: { cursor: 'non-existent-cursor-id' }
        });
        expect(resBadCursor.statusCode).toBe(400);
        expect(resBadCursor.body.error).toContain('Cursor không hợp lệ');
    });

    test('14. getRequestById: 404 khi không tồn tại, 200 khi tồn tại và ẩn *Hash', async () => {
        // 404
        const res404 = await callHandler(adminCtrl.getRequestById, {
            params: { id: 'non-existent-id' }
        });
        expect(res404.statusCode).toBe(404);

        // 200
        mockFirebase.__stores.borrow_requests.set('req-detail-1', {
            id: 'req-detail-1',
            status: 'pending',
            accessTokenHash: 'hidden-token',
            verifyTokenHash: 'hidden-verify',
            borrower: { name: 'Full Info', email: 'full@test.com' }
        });
        const res200 = await callHandler(adminCtrl.getRequestById, {
            params: { id: 'req-detail-1' }
        });
        expect(res200.statusCode).toBe(200);
        expect(res200.body.id).toBe('req-detail-1');
        expect(res200.body.accessTokenHash).toBeUndefined();
        expect(res200.body.verifyTokenHash).toBeUndefined();
        expect(res200.body.borrower.email).toBe('full@test.com');
    });

    test('15. handoverRequest: 409 khi chuyển trạng thái sai; 200 khi hợp lệ', async () => {
        const adminUser = { uid: 'admin-1', email: 'admin@test.com', role: 'admin' };

        // 409: pending -> handed_over (not allowed directly)
        mockFirebase.__stores.borrow_requests.set('req-invalid-ho', {
            id: 'req-invalid-ho',
            status: 'pending',
            items: []
        });
        const res409 = await callHandler(adminCtrl.handoverRequest, {
            params: { id: 'req-invalid-ho' },
            user: adminUser
        });
        expect(res409.statusCode).toBe(409);

        // 200: approved -> handed_over
        mockFirebase.__stores.borrow_requests.set('req-valid-ho', {
            id: 'req-valid-ho',
            status: 'approved',
            items: []
        });
        const res200 = await callHandler(adminCtrl.handoverRequest, {
            params: { id: 'req-valid-ho' },
            user: adminUser
        });
        expect(res200.statusCode).toBe(200);
        expect(res200.body.request.status).toBe('handed_over');
    });

    test('16. reject và cancel khi email gửi lỗi vẫn trả 200 với emailSent: false', async () => {
        const adminUser = { uid: 'admin-1', email: 'admin@test.com', role: 'admin' };

        // Reject with email error
        mockFirebase.__stores.borrow_requests.set('req-rej-fail-email', {
            id: 'req-rej-fail-email',
            status: 'pending',
            items: []
        });
        borrowEmailService.sendRejected.mockRejectedValueOnce(new Error('SMTP timeout'));

        const resRej = await callHandler(adminCtrl.rejectRequest, {
            params: { id: 'req-rej-fail-email' },
            body: { reason: 'Từ chối do lỗi SMTP kiểm tra' },
            user: adminUser
        });
        expect(resRej.statusCode).toBe(200);
        expect(resRej.body.request.status).toBe('rejected');
        expect(resRej.body.emailSent).toBe(false);

        // Cancel with email error
        mockFirebase.__stores.borrow_requests.set('req-canc-fail-email', {
            id: 'req-canc-fail-email',
            status: 'approved',
            items: []
        });
        borrowEmailService.sendCancelled.mockRejectedValueOnce(new Error('SMTP connection reset'));

        const resCanc = await callHandler(adminCtrl.cancelRequest, {
            params: { id: 'req-canc-fail-email' },
            body: { reason: 'Huỷ do lý do kiểm tra SMTP' },
            user: adminUser
        });
        expect(resCanc.statusCode).toBe(200);
        expect(resCanc.body.request.status).toBe('cancelled');
        expect(resCanc.body.emailSent).toBe(false);
    });

    test('17. getQrStation: thiếu APP_PUBLIC_URL -> 503; có APP_PUBLIC_URL -> 200 với url và QR PNG data URL', async () => {
        const origUrl = process.env.APP_PUBLIC_URL;
        const origToDataURL = QRCode.toDataURL.bind(QRCode);
        const qrSpy = jest.spyOn(QRCode, 'toDataURL').mockImplementation((u, opts) => {
            expect(opts).toEqual({ width: 512, margin: 2 });
            // Render real PNG at compact size so Jest VM doesn't spend 30s on 512x512 pixel filter loops
            return origToDataURL(u, { width: 64, margin: 1 });
        });
        try {
            delete process.env.APP_PUBLIC_URL;
            const res503 = await callHandler(adminCtrl.getQrStation, {});
            expect(res503.statusCode).toBe(503);

            process.env.APP_PUBLIC_URL = 'https://event.greenwich-it.com/';
            const res200 = await callHandler(adminCtrl.getQrStation, {});
            expect(res200.statusCode).toBe(200);
            expect(qrSpy).toHaveBeenCalledWith('https://event.greenwich-it.com/borrow', {
                width: 512,
                margin: 2
            });
            expect(res200.body.url).toBe('https://event.greenwich-it.com/borrow');
            expect(res200.body.qr).toMatch(/^data:image\/png;base64,/);
        } finally {
            qrSpy.mockRestore();
            if (origUrl !== undefined) {
                process.env.APP_PUBLIC_URL = origUrl;
            } else {
                delete process.env.APP_PUBLIC_URL;
            }
        }
    });
});
