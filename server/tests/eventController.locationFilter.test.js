/**
 * Bug 1 regression test: location filter must match BOTH
 * legacy scalar `location` and multi-venue array `location`.
 */

jest.mock('../config/firebase', () => {
    const { buildFirebaseMock } = require('./helpers/firestoreMock');
    return buildFirebaseMock({
        events: {
            e1: { eventName: 'Scalar Hall A', eventDate: '2026-11-01', startTime: '08:00', location: 'Hall A', department: 'TS', isUniqueEvent: true },
            e2: { eventName: 'Array Hall A+B', eventDate: '2026-11-02', startTime: '09:00', location: ['Hall A', 'Hall B'], department: 'TS', isUniqueEvent: true },
            e3: { eventName: 'Array Hall B only', eventDate: '2026-11-03', startTime: '10:00', location: ['Hall B'], department: 'TS', isUniqueEvent: true },
            e4: { eventName: 'Scalar Hall C', eventDate: '2026-11-04', startTime: '11:00', location: 'Hall C', department: 'TS', isUniqueEvent: true },
            e5: { eventName: 'Non-unique sibling', eventDate: '2026-11-02', startTime: '09:00', location: ['Hall A'], department: 'TS', isUniqueEvent: false }
        }
    });
});
jest.mock('../services/emailService', () => ({ detectChanges: () => [] }));
jest.mock('../services/auditService', () => ({ logAudit: jest.fn() }));
jest.mock('../controllers/auditLogController', () => ({ logAction: jest.fn() }));

const eventController = require('../controllers/eventController');

const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => { res.body = payload; return res; };
    return res;
};

const req = (query) => ({ query, params: {}, user: { uid: 'u1' } });

describe('getAllEvents — location filter (mixed scalar/array storage)', () => {
    test('matches both scalar and array locations', async () => {
        const res = mockRes();
        await eventController.getAllEvents(req({ location: 'Hall A' }), res, jest.fn());

        const names = res.body.events.map(e => e.eventName).sort();
        expect(names).toEqual(['Array Hall A+B', 'Scalar Hall A']);
        expect(res.body.meta.total).toBe(2);
        expect(res.body.meta.hasMore).toBe(false);
    });

    test('array-only location still matches', async () => {
        const res = mockRes();
        await eventController.getAllEvents(req({ location: 'Hall B' }), res, jest.fn());

        const names = res.body.events.map(e => e.eventName).sort();
        expect(names).toEqual(['Array Hall A+B', 'Array Hall B only']);
    });

    test('no location param -> unchanged behaviour (all unique events)', async () => {
        const res = mockRes();
        await eventController.getAllEvents(req({}), res, jest.fn());

        expect(res.body.events.length).toBe(4);
        expect(res.body.events.map(e => e.eventName)).not.toContain('Non-unique sibling');
    });

    test('degrades gracefully when array-contains index is missing', async () => {
        const fb = require('../config/firebase');
        const origWhere = fb.eventsCollection.where;
        // Make any query chain containing array-contains reject like FAILED_PRECONDITION
        const wrap = (q, hasArr) => new Proxy(q, {
            get(t, p) {
                if (p === 'where') return (f, o, v) => wrap(t.where(f, o, v), hasArr || o === 'array-contains');
                if (p === 'get' && hasArr) return () => Promise.reject(new Error('9 FAILED_PRECONDITION: index required'));
                const val = t[p];
                return typeof val === 'function' ? (...a) => { const r = val.apply(t, a); return r && r.get ? wrap(r, hasArr) : r; } : val;
            }
        });
        fb.eventsCollection.where = (...a) => wrap(origWhere(...a), false);
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            const res = mockRes();
            const next = jest.fn();
            await eventController.getAllEvents(req({ location: 'Hall A' }), res, next);
            expect(next).not.toHaveBeenCalled();
            expect(res.body.events.map(e => e.eventName)).toEqual(['Scalar Hall A']);
        } finally {
            fb.eventsCollection.where = origWhere;
            spy.mockRestore();
        }
    });

    test('location filter paginates with cursor', async () => {
        const res1 = mockRes();
        await eventController.getAllEvents(req({ location: 'Hall A', limit: 1 }), res1, jest.fn());
        expect(res1.body.events.length).toBe(1);
        expect(res1.body.meta.hasMore).toBe(true);

        const res2 = mockRes();
        await eventController.getAllEvents(
            req({ location: 'Hall A', limit: 1, lastDocId: res1.body.meta.lastId }),
            res2, jest.fn()
        );
        expect(res2.body.events.length).toBe(1);
        expect(res2.body.meta.hasMore).toBe(false);
        expect(res2.body.events[0].id).not.toBe(res1.body.events[0].id);
    });
});
