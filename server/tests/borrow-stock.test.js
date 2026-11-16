let mockFirebase;

jest.mock('../config/firebase', () => {
    mockFirebase = require('./helpers/firestoreMock').buildFirebaseMock({
        resources: {},
        borrow_requests: {},
        borrow_otps: {},
        audit_logs: {},
        users: { admin: { email: 'admin@test.com', role: 'admin' } }
    });
    return mockFirebase;
});

jest.mock('../controllers/auditLogController', () => ({
    logAction: jest.fn(() => Promise.resolve())
}));

const { db } = require('../config/firebase');
const { reserveInTx, restockInTx } = require('../services/borrow-stock-service');
const { transition } = require('../services/borrow-transition-service');
const resourceController = require('../controllers/resourceController');
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

beforeEach(() => {
    mockFirebase.__stores.resources.clear();
    mockFirebase.__stores.borrow_requests.clear();
    mockFirebase.__stores.borrow_otps.clear();
    mockFirebase.__stores.audit_logs.clear();
    mockFirebase.db.__txChain = Promise.resolve();

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
        availableQty: 3 // 2 are currently borrowed
    });
    mockFirebase.__stores.resources.set('led', {
        label: 'Màn hình LED',
        category: 'Visual',
        quantity: 1,
        availableQty: 1
    });
});

describe('Phase 01 — Equipment Borrow Stock & Transitions', () => {
    test('1. reserve đủ hàng -> availableQty giảm đúng', async () => {
        const items = [{ resourceId: 'loa', label: 'Loa / Âm thanh', qty: 4 }];
        await db.runTransaction(async (tx) => {
            await reserveInTx(tx, items);
        });

        const updatedLoa = mockFirebase.__stores.resources.get('loa');
        expect(updatedLoa.availableQty).toBe(6);
    });

    test('2. reserve thiếu 1 món trong 2 -> 409, details.shortages có đúng món đó, không món nào bị trừ', async () => {
        const items = [
            { resourceId: 'loa', label: 'Loa / Âm thanh', qty: 2 },
            { resourceId: 'mic', label: 'Micro', qty: 5 } // only 3 available
        ];

        let err;
        try {
            await db.runTransaction(async (tx) => {
                await reserveInTx(tx, items);
            });
        } catch (e) {
            err = e;
        }

        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(409);
        expect(err.details).toBeDefined();
        expect(err.details.shortages).toEqual([
            { resourceId: 'mic', label: 'Micro', requested: 5, available: 3 }
        ]);

        // Neither item was deducted
        expect(mockFirebase.__stores.resources.get('loa').availableQty).toBe(10);
        expect(mockFirebase.__stores.resources.get('mic').availableQty).toBe(3);
    });

    test('3. items trùng resourceId được gộp (2+2 > 3 -> 409)', async () => {
        const items = [
            { resourceId: 'mic', label: 'Micro', qty: 2 },
            { resourceId: 'mic', label: 'Micro', qty: 2 }
        ];

        let err;
        try {
            await db.runTransaction(async (tx) => {
                await reserveInTx(tx, items);
            });
        } catch (e) {
            err = e;
        }

        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(409);
        expect(err.details.shortages).toEqual([
            { resourceId: 'mic', label: 'Micro', requested: 4, available: 3 }
        ]);
        expect(mockFirebase.__stores.resources.get('mic').availableQty).toBe(3);
    });

    test('4. Hai transition(pending->approved) song song trên 2 phiếu cùng tranh món cuối -> đúng 1 thành công, 1 lỗi 409, availableQty === 0', async () => {
        mockFirebase.__stores.borrow_requests.set('req-1', {
            status: 'pending',
            items: [{ resourceId: 'led', label: 'Màn hình LED', qty: 1 }],
            history: []
        });
        mockFirebase.__stores.borrow_requests.set('req-2', {
            status: 'pending',
            items: [{ resourceId: 'led', label: 'Màn hình LED', qty: 1 }],
            history: []
        });

        const results = await Promise.allSettled([
            transition('req-1', 'approved', { actor: { uid: 'admin', email: 'admin@test.com' } }),
            transition('req-2', 'approved', { actor: { uid: 'admin', email: 'admin@test.com' } })
        ]);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].reason.statusCode).toBe(409);
        expect(mockFirebase.__stores.resources.get('led').availableQty).toBe(0);
    });

    test('5. transition cạnh không hợp lệ (pending->returned) -> 409', async () => {
        mockFirebase.__stores.borrow_requests.set('req-edge', {
            status: 'pending',
            items: [{ resourceId: 'loa', qty: 1 }],
            history: []
        });

        let err;
        try {
            await transition('req-edge', 'returned', { actor: { uid: 'admin', email: 'admin@test.com' } });
        } catch (e) {
            err = e;
        }

        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(409);
        expect(mockFirebase.__stores.borrow_requests.get('req-edge').status).toBe('pending');
    });

    test('6. transition hai lần pending->approved cùng phiếu -> lần 2 409, kho chỉ trừ 1 lần', async () => {
        mockFirebase.__stores.borrow_requests.set('req-dup', {
            status: 'pending',
            items: [{ resourceId: 'loa', label: 'Loa / Âm thanh', qty: 2 }],
            history: []
        });

        // First approval
        const res1 = await transition('req-dup', 'approved', { actor: { uid: 'admin', email: 'admin@test.com' } });
        expect(res1.status).toBe('approved');
        expect(mockFirebase.__stores.resources.get('loa').availableQty).toBe(8);

        // Second approval attempt on same request
        let err;
        try {
            await transition('req-dup', 'approved', { actor: { uid: 'admin', email: 'admin@test.com' } });
        } catch (e) {
            err = e;
        }

        expect(err).toBeInstanceOf(HttpError);
        expect(err.statusCode).toBe(409);
        // Stock only deducted once
        expect(mockFirebase.__stores.resources.get('loa').availableQty).toBe(8);
    });

    test('7. chốt trả receivedQty 1/2 -> kho cộng 1', async () => {
        mockFirebase.__stores.resources.get('loa').availableQty = 8;
        mockFirebase.__stores.borrow_requests.set('req-ret', {
            status: 'handed_over',
            items: [{ resourceId: 'loa', label: 'Loa / Âm thanh', qty: 2, receivedQty: null }],
            history: []
        });

        const patch = {
            items: [{ resourceId: 'loa', label: 'Loa / Âm thanh', qty: 2, receivedQty: 1 }],
            returnNote: 'Mất 1 cái loa'
        };

        const updated = await transition('req-ret', 'returned_with_issue', {
            actor: { uid: 'admin', email: 'admin@test.com' },
            patch
        });

        expect(updated.status).toBe('returned_with_issue');
        expect(updated.returnNote).toBe('Mất 1 cái loa');
        // Restocked 1
        expect(mockFirebase.__stores.resources.get('loa').availableQty).toBe(9);
    });

    test('8. approved->cancelled -> kho cộng đủ', async () => {
        mockFirebase.__stores.resources.get('loa').availableQty = 7;
        mockFirebase.__stores.borrow_requests.set('req-cancel', {
            status: 'approved',
            items: [{ resourceId: 'loa', label: 'Loa / Âm thanh', qty: 3 }],
            history: []
        });

        const updated = await transition('req-cancel', 'cancelled', {
            actor: { uid: 'admin', email: 'admin@test.com' },
            note: 'Người mượn không tới nhận'
        });

        expect(updated.status).toBe('cancelled');
        // Restocked 3: 7 + 3 = 10
        expect(mockFirebase.__stores.resources.get('loa').availableQty).toBe(10);
    });

    test('9. updateResource giảm quantity dưới số đang mượn -> 409', async () => {
        // mic: quantity = 5, availableQty = 3 (borrowed = 2)
        // Trying to set quantity to 1 -> newAvail = 3 + (1 - 5) = -1 -> 409
        const req = {
            params: { id: 'mic' },
            query: {},
            body: { quantity: 1 },
            user: { email: 'admin@test.com', role: 'admin' },
            ip: '127.0.0.1'
        };
        const res = mkRes();
        const next = jest.fn((err) => {
            if (err) {
                res.status(err.statusCode || 500).json({ error: err.message, details: err.details });
            }
        });

        await resourceController.updateResource(req, res, next);

        expect(res.statusCode).toBe(409);
        expect(res.body.error).toBe('Số lượng mới nhỏ hơn số đang cho mượn');
        // Unchanged in store
        expect(mockFirebase.__stores.resources.get('mic').quantity).toBe(5);
        expect(mockFirebase.__stores.resources.get('mic').availableQty).toBe(3);
    });

    test('10. resource chỉ có quantity (thiếu availableQty) -> reserve trừ từ quantity và set availableQty tuyệt đối', async () => {
        // Resource restored from legacy backup missing availableQty
        mockFirebase.__stores.resources.set('legacy-item', {
            label: 'Thiết bị cũ',
            quantity: 3
            // availableQty is undefined
        });

        const items = [{ resourceId: 'legacy-item', label: 'Thiết bị cũ', qty: 1 }];
        await db.runTransaction(async (tx) => {
            await reserveInTx(tx, items);
        });

        const updated = mockFirebase.__stores.resources.get('legacy-item');
        expect(updated.availableQty).toBe(2);
    });

    test('11. createResource trùng ID thiết bị đã tồn tại -> 409', async () => {
        mockFirebase.__stores.resources.set('micro', {
            label: 'Micro',
            category: 'Audio',
            quantity: 5,
            availableQty: 3
        });

        const req = {
            body: { label: 'Micro', category: 'Audio', quantity: 10, icon: 'Mic' },
            user: { email: 'admin@test.com', role: 'admin' },
            ip: '127.0.0.1'
        };
        const res = mkRes();
        const next = jest.fn((err) => {
            if (err) res.status(err.statusCode || 500).json({ error: err.message });
        });

        await resourceController.createResource(req, res, next);

        expect(res.statusCode).toBe(409);
        expect(res.body.error).toBe('Thiết bị đã tồn tại');
        // Existing micro resource was NOT overwritten: quantity remains 5, availableQty remains 3
        expect(mockFirebase.__stores.resources.get('micro').quantity).toBe(5);
        expect(mockFirebase.__stores.resources.get('micro').availableQty).toBe(3);
    });

    test('12. resource chỉ có quantity (thiếu availableQty) -> restockInTx cộng từ quantity và set availableQty tuyệt đối', async () => {
        mockFirebase.__stores.resources.set('legacy-restock', {
            label: 'Thiết bị cũ restock',
            quantity: 3
            // availableQty is undefined
        });

        const items = [{ resourceId: 'legacy-restock', label: 'Thiết bị cũ restock', qty: 2 }];
        await db.runTransaction(async (tx) => {
            await restockInTx(tx, items);
        });

        const updated = mockFirebase.__stores.resources.get('legacy-restock');
        expect(updated.availableQty).toBe(5);
    });
});

describe('Role protection for Resources, Settings, Backup routes', () => {
    const { requireRole } = require('../middleware/authMiddleware');

    test('requireRole(["admin", "manager"]) blocks user with 403', async () => {
        const middleware = requireRole(['admin', 'manager']);
        const req = { user: { uid: 'u1', role: 'user' } };
        const res = mkRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res.body.error).toMatch(/Forbidden/i);
        expect(next).not.toHaveBeenCalled();
    });

    test('requireRole(["admin"]) blocks user with 403 (settings & backup routes)', async () => {
        const middleware = requireRole(['admin']);
        const req = { user: { uid: 'u1', role: 'user' } };
        const res = mkRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res.body.error).toMatch(/Forbidden/i);
        expect(next).not.toHaveBeenCalled();
    });

    test('requireRole(["admin"]) allows admin', async () => {
        const middleware = requireRole(['admin']);
        const req = { user: { uid: 'ad', role: 'admin' } };
        const res = mkRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
    });

    test('requireRole(["admin", "manager"]) allows manager', async () => {
        const middleware = requireRole(['admin', 'manager']);
        const req = { user: { uid: 'mgr', role: 'manager' } };
        const res = mkRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
    });
});
