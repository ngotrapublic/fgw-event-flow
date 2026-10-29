/**
 * Bug 3 regression test: overnight events (endTime <= startTime).
 * - getEventEndTime rolls the end to the next day
 * - conflictService detects overlaps across midnight correctly
 * - getStats 'happeningNow' handles overnight events both before
 *   and after midnight
 */

let mockFirebase;
jest.mock('../config/firebase', () => {
    mockFirebase = require('./helpers/firestoreMock').buildFirebaseMock({
        events: {
            overnight: { eventName: 'Night Gala', eventDate: '2026-11-05', startTime: '22:00', endTime: '02:00', location: 'Hall A', isUniqueEvent: true },
            nextMorning: { eventName: 'Morning Meet', eventDate: '2026-11-06', startTime: '08:00', endTime: '09:00', location: 'Hall A', isUniqueEvent: true }
        }
    });
    return mockFirebase;
});
jest.mock('../services/emailService', () => ({ detectChanges: () => [] }));
jest.mock('../services/auditService', () => ({ logAudit: jest.fn() }));
jest.mock('../controllers/auditLogController', () => ({ logAction: jest.fn() }));

const { getEventStartTime, getEventEndTime } = require('../utils/timeHelpers');
const conflictService = require('../services/conflictService');
const eventController = require('../controllers/eventController');
const cacheService = require('../services/cacheService');

describe('getEventEndTime — overnight roll', () => {
    test('end <= start rolls to next day', () => {
        const ev = { eventDate: '2026-11-05', startTime: '22:00', endTime: '02:00' };
        const start = getEventStartTime(ev);
        const end = getEventEndTime(ev);
        expect(end > start).toBe(true);
        // 22:00 -> 02:00 next day = 4 hours
        expect((end - start) / 3600000).toBe(4);
    });

    test('normal same-day event unchanged', () => {
        const ev = { eventDate: '2026-11-05', startTime: '09:00', endTime: '11:00' };
        const end = getEventEndTime(ev);
        expect((end - getEventStartTime(ev)) / 3600000).toBe(2);
    });
});

describe('checkConflict — overnight overlaps', () => {
    const base = { eventDate: '2026-11-05', location: 'Hall A' };

    test('event 23:00-23:30 same day conflicts with 22:00-02:00', async () => {
        const c = await conflictService.checkConflict({ ...base, startTime: '23:00', endTime: '23:30' });
        expect(c).not.toBeNull();
        expect(c.eventName).toBe('Night Gala');
    });

    test('event 21:00-22:00 back-to-back does NOT conflict (exclusive boundary)', async () => {
        const c = await conflictService.checkConflict({ ...base, startTime: '21:00', endTime: '22:00' });
        expect(c).toBeNull();
    });

    test('next-day 01:00-03:00 conflicts with overnight tail', async () => {
        const c = await conflictService.checkConflict({ ...base, eventDate: '2026-11-06', startTime: '01:00', endTime: '03:00' });
        expect(c).not.toBeNull();
        expect(c.eventName).toBe('Night Gala');
    });

    test('next-day 08:00-09:00 new event conflicts with existing Morning Meet', async () => {
        const c = await conflictService.checkConflict({ ...base, eventDate: '2026-11-06', startTime: '08:30', endTime: '09:30' });
        expect(c).not.toBeNull();
        expect(c.eventName).toBe('Morning Meet');
    });

    test('event on different location never conflicts', async () => {
        const c = await conflictService.checkConflict({ ...base, startTime: '23:00', endTime: '23:30', location: 'Hall Z' });
        expect(c).toBeNull();
    });
});

describe('getStats — happeningNow with overnight events', () => {
    const seedToday = (todayStr, yesterdayStr) => {
        const events = {};
        events['today_overnight'] = { eventName: 'Tonight', eventDate: todayStr, startTime: '22:00', endTime: '02:00', isUniqueEvent: true };
        events['today_morning'] = { eventName: 'Morning', eventDate: todayStr, startTime: '08:00', endTime: '10:00', isUniqueEvent: true };
        events['yday_overnight'] = { eventName: 'LastNight', eventDate: yesterdayStr, startTime: '22:00', endTime: '02:00', isUniqueEvent: true };
        events['yday_normal'] = { eventName: 'YesterdayNormal', eventDate: yesterdayStr, startTime: '08:00', endTime: '23:00', isUniqueEvent: true };
        // Mutate the existing store Map — collections hold a reference to it
        const store = mockFirebase.__stores.events;
        store.clear();
        for (const [id, data] of Object.entries(events)) store.set(id, data);
    };

    const vnDateStr = (d) => new Date(d.getTime() + 7 * 3600000).toISOString().split('T')[0];

    const callStats = async () => {
        const res = {};
        res.status = (c) => { res.statusCode = c; return res; };
        res.json = (p) => { res.body = p; return res; };
        await eventController.getStats({ query: {}, user: { uid: 'u' } }, res, jest.fn());
        return res.body;
    };

    beforeEach(() => cacheService.clearAll());
    afterEach(() => jest.useRealTimers());

    test('at 23:00 VN, tonight\'s overnight event is happening', async () => {
        // 2026-11-05 23:00 +07 = 16:00 UTC
        jest.useFakeTimers().setSystemTime(new Date('2026-11-05T16:00:00Z'));
        const today = vnDateStr(new Date());
        const yday = vnDateStr(new Date(Date.now() - 86400000));
        seedToday(today, yday);

        const stats = await callStats();
        expect(stats.today).toBe(2);
        // Tonight (22:00-02:00) is active at 23:00; yesterday's tail expired (02:00 < 23:00)
        expect(stats.happeningNow).toBe(1);
        // weekCount must not count yesterday's docs
        expect(stats.week).toBe(2);
    });

    test('at 01:00 VN, yesterday\'s overnight tail counts, today\'s does not', async () => {
        // 2026-11-06 01:00 +07 = 2026-11-05 18:00 UTC
        jest.useFakeTimers().setSystemTime(new Date('2026-11-05T18:00:00Z'));
        const today = vnDateStr(new Date());          // 2026-11-06
        const yday = vnDateStr(new Date(Date.now() - 86400000)); // 2026-11-05
        seedToday(today, yday);

        const stats = await callStats();
        // 'LastNight' (yday 22:00-02:00) tail still active at 01:00
        // 'Tonight' starts 22:00 -> not yet; 'Morning' 08:00 -> not yet
        // 'YesterdayNormal' ended 23:00 -> not active
        expect(stats.happeningNow).toBe(1);
    });

    test('at 11:00 VN no event is happening', async () => {
        jest.useFakeTimers().setSystemTime(new Date('2026-11-05T04:00:00Z')); // 11:00 +07
        const today = vnDateStr(new Date());
        const yday = vnDateStr(new Date(Date.now() - 86400000));
        seedToday(today, yday);
        const stats = await callStats();
        expect(stats.happeningNow).toBe(0);
    });
});
