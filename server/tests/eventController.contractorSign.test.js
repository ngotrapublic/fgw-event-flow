/**
 * Bug 2 regression test: toggleContractorSign must call logAction
 * with the correct schema (actor, role, action, target, details, ip)
 * so audit logs don't lose actor/target information.
 */

let mockFirebase;
jest.mock('../config/firebase', () => {
    mockFirebase = require('./helpers/firestoreMock').buildFirebaseMock({
        events: {
            ev1: {
                eventName: 'Signing Event',
                eventDate: '2026-11-10',
                contractorPackages: [
                    { contractorName: 'Alpha Co', signed: false },
                    { contractorName: 'Beta Co', signed: true, signedAt: '2026-01-01', signedBy: 'a@x.com' }
                ]
            }
        },
        users: {
            admin1: { email: 'admin@fpt.edu.vn', role: 'admin' },
            user1: { email: 'user@fpt.edu.vn', role: 'user' }
        }
    });
    return mockFirebase;
});
jest.mock('../services/emailService', () => ({ detectChanges: () => [] }));
jest.mock('../services/auditService', () => ({ logAudit: jest.fn() }));

const { logAction } = require('../controllers/auditLogController');
jest.mock('../controllers/auditLogController', () => ({ logAction: jest.fn(() => Promise.resolve()) }));

const eventController = require('../controllers/eventController');

const mockRes = () => {
    const res = {};
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (p) => { res.body = p; return res; };
    return res;
};

const req = (uid, id, index) => ({
    params: { id, index: String(index) },
    user: { uid },
    ip: '127.0.0.1'
});

describe('toggleContractorSign — audit logging schema', () => {
    beforeEach(() => logAction.mockClear());

    test('logs actor, role, action, target correctly when signing', async () => {
        const res = mockRes();
        await eventController.toggleContractorSign(req('admin1', 'ev1', 0), res, jest.fn());

        expect(res.body.success).toBe(true);
        expect(logAction).toHaveBeenCalledTimes(1);
        const payload = logAction.mock.calls[0][0];
        expect(payload.actor).toBe('admin@fpt.edu.vn');
        expect(payload.role).toBe('admin');
        expect(payload.action).toBe('CONTRACTOR_SIGNED');
        expect(payload.target).toBe('Event: Signing Event');
        expect(payload.details.contractorName).toBe('Alpha Co');
        expect(payload.details.signed).toBe(true);
        expect(payload.ip).toBe('127.0.0.1');
    });

    test('logs CONTRACTOR_UNSIGNED when toggling off', async () => {
        const res = mockRes();
        await eventController.toggleContractorSign(req('admin1', 'ev1', 1), res, jest.fn());
        expect(logAction.mock.calls[0][0].action).toBe('CONTRACTOR_UNSIGNED');
    });

    test('rejects non-admin/manager users', async () => {
        const res = mockRes();
        await eventController.toggleContractorSign(req('user1', 'ev1', 0), res, jest.fn());
        expect(res.statusCode).toBe(403);
        expect(logAction).not.toHaveBeenCalled();
    });
});
