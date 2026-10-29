/**
 * Round 3 regression tests:
 * - R1: moving a series to new dates must honour the submitted start date
 * - B1/N5 must still hold (editing from day 2 / legacy payloads)
 * - Date-range validation runs even with skipConflictCheck
 * - Regular users cannot move events into the past
 */

const SEED = {
    s1: { eventName: 'S', eventDate: '2026-12-01', startTime: '09:00', endTime: '10:00', location: 'H', groupId: 'g', isSeriesStart: true, isUniqueEvent: true, seriesStartDate: '2026-12-01', seriesEndDate: '2026-12-03', eventEndDate: '2026-12-03', createdBy: 'owner' },
    s2: { eventName: 'S', eventDate: '2026-12-02', startTime: '09:00', endTime: '10:00', location: 'H', groupId: 'g', isSeriesStart: false, isUniqueEvent: false, seriesStartDate: '2026-12-01', seriesEndDate: '2026-12-03', eventEndDate: '2026-12-03', createdBy: 'owner' },
    s3: { eventName: 'S', eventDate: '2026-12-03', startTime: '09:00', endTime: '10:00', location: 'H', groupId: 'g', isSeriesStart: false, isUniqueEvent: false, seriesStartDate: '2026-12-01', seriesEndDate: '2026-12-03', eventEndDate: '2026-12-03', createdBy: 'owner' },
    single: { eventName: 'One', eventDate: '2026-12-20', startTime: '09:00', endTime: '10:00', location: 'Z', isUniqueEvent: true, createdBy: 'owner' }
};

let mockFirebase;
jest.mock('../config/firebase', () => {
    mockFirebase = require('./helpers/firestoreMock').buildFirebaseMock({
        events: {},
        users: { admin: { email: 'ad@x.com', role: 'admin' }, owner: { email: 'o@x.com', role: 'user' } }
    });
    return mockFirebase;
});
jest.mock('../services/emailService', () => ({ detectChanges: jest.fn(() => []) }));
jest.mock('../services/auditService', () => ({ logAudit: jest.fn() }));
jest.mock('../controllers/auditLogController', () => ({ logAction: jest.fn(() => Promise.resolve()) }));

const emailService = require('../services/emailService');
const c = require('../controllers/eventController');

const mk = () => ({ statusCode: 200, status(s) { this.statusCode = s; return this; }, json(p) { this.body = p; return this; } });
const store = () => mockFirebase.__stores.events;
const seriesDates = () => [...store().values()].filter(e => e.groupId === 'g').map(e => e.eventDate).sort();
const update = async (id, body, uid = 'admin') => {
    const res = mk();
    await c.updateEvent({ params: { id }, body, user: { uid }, ip: '' }, res, jest.fn());
    return res;
};

beforeEach(() => {
    const s = store();
    s.clear();
    for (const [k, v] of Object.entries(SEED)) s.set(k, { ...v });
    emailService.detectChanges.mockClear();
    jest.useRealTimers();
});

describe('R1 — moving a series', () => {
    test('move later: exactly the new 3 days remain', async () => {
        const res = await update('s1', { eventName: 'S', eventDate: '2026-12-10', eventEndDate: '2026-12-12' });
        expect(res.statusCode).toBe(200);
        expect(seriesDates()).toEqual(['2026-12-10', '2026-12-11', '2026-12-12']);
    });

    test('move earlier: allowed and produces the new range', async () => {
        const res = await update('s1', { eventName: 'S', eventDate: '2026-11-25', eventEndDate: '2026-11-27' });
        expect(res.statusCode).toBe(200);
        expect(seriesDates()).toEqual(['2026-11-25', '2026-11-26', '2026-11-27']);
    });

    test('moving reports a date change for notifications', async () => {
        await update('s1', { eventName: 'S', eventDate: '2026-12-10', eventEndDate: '2026-12-12' });
        const [oldDiff, newDiff] = emailService.detectChanges.mock.calls[0];
        expect(oldDiff.eventDate).toBe('2026-12-01');
        expect(newDiff.eventDate).toBe('2026-12-10');
    });
});

describe('B1 / N5 still hold', () => {
    test('edit from day 2 with form payload (eventDate = series start) keeps day 1', async () => {
        const res = await update('s2', { eventName: 'Renamed', eventDate: '2026-12-01', eventEndDate: '2026-12-03' });
        expect(res.statusCode).toBe(200);
        expect(seriesDates()).toEqual(['2026-12-01', '2026-12-02', '2026-12-03']);
        const [oldDiff, newDiff] = emailService.detectChanges.mock.calls[0];
        expect(newDiff.eventDate).toBe(oldDiff.eventDate); // no false "Date changed"
    });

    test('legacy payload from day 2 (eventDate = day 2) keeps day 1', async () => {
        await update('s2', { eventName: 'S', eventDate: '2026-12-02', eventEndDate: '2026-12-03' });
        expect(seriesDates()).toEqual(['2026-12-01', '2026-12-02', '2026-12-03']);
    });

    test('extending only the end date keeps the start', async () => {
        await update('s1', { eventName: 'S', eventDate: '2026-12-01', eventEndDate: '2026-12-05' });
        expect(seriesDates()).toEqual(['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05']);
    });
});

describe('date-range validation', () => {
    test('end before start is rejected even with skipConflictCheck', async () => {
        const res = await update('s1', { eventDate: '2026-12-10', eventEndDate: '2026-12-05', skipConflictCheck: true });
        expect(res.statusCode).toBe(400);
        expect(seriesDates()).toEqual(['2026-12-01', '2026-12-02', '2026-12-03']);
    });

    test('> 30 days is rejected even with skipConflictCheck', async () => {
        const res = await update('s1', { eventDate: '2026-12-01', eventEndDate: '2027-01-15', skipConflictCheck: true });
        expect(res.statusCode).toBe(400);
    });
});

describe('regular users cannot move events into the past', () => {
    const freeze = () => jest.useFakeTimers({ doNotFake: ['setImmediate'] }).setSystemTime(new Date('2026-11-15T03:00:00Z'));

    test('single event moved to a past date is rejected', async () => {
        freeze();
        const res = await update('single', { eventDate: '2026-11-01' }, 'owner');
        expect(res.statusCode).toBe(400);
        expect(store().get('single').eventDate).toBe('2026-12-20');
    });

    test('series moved into the past is rejected', async () => {
        freeze();
        const res = await update('s1', { eventDate: '2026-11-01', eventEndDate: '2026-11-03' }, 'owner');
        expect(res.statusCode).toBe(400);
    });

    test('editing content without changing date is still allowed', async () => {
        freeze();
        const res = await update('single', { eventName: 'Renamed', eventDate: '2026-12-20' }, 'owner');
        expect(res.statusCode).toBe(200);
        expect(store().get('single').eventName).toBe('Renamed');
    });

    test('admin can move an event into the past', async () => {
        freeze();
        const res = await update('single', { eventDate: '2026-11-01' }, 'admin');
        expect(res.statusCode).toBe(200);
    });
});
