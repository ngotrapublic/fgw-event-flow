let mockFirebase;
jest.mock('../config/firebase', () => {
    mockFirebase = require('./helpers/firestoreMock').buildFirebaseMock({
        events: {
            e1: { eventName: 'Single', eventDate: '2026-11-10', startTime: '09:00', endTime: '10:00', location: 'Hall A', isUniqueEvent: true, createdBy: 'owner1', createdAt: '2026-01-01' }
        },
        users: { owner1: { email: 'o@x.com', role: 'user' } }
    });
    return mockFirebase;
});
jest.mock('../services/emailService', () => ({ detectChanges: () => [] }));
jest.mock('../services/auditService', () => ({ logAudit: jest.fn() }));
jest.mock('../controllers/auditLogController', () => ({ logAction: jest.fn(() => Promise.resolve()) }));
const c = require('../controllers/eventController');

test('probe: form payload (with id/createdBy) single->series', async () => {
    const res = { status() { return this; }, json(p) { this.body = p; return this; } };
    // Mimic RHF: whole doc from GET /events/:id + edits
    const body = { id: 'e1', eventName: 'Single', eventDate: '2026-11-10', eventEndDate: '2026-11-11', startTime: '09:00', endTime: '10:00', location: ['Hall A'], isUniqueEvent: true, createdBy: 'attacker', createdAt: '2026-01-01' };
    await c.updateEvent({ params: { id: 'e1' }, body, user: { uid: 'owner1' }, ip: '' }, res, jest.fn());
    const rows = [...mockFirebase.__stores.events.entries()].map(([docId, d]) => ({ docId, storedId: d.id, createdBy: d.createdBy }));
    rows.forEach(r => {
        expect(r.storedId === undefined || r.storedId === r.docId).toBe(true);
        expect(r.createdBy).toBe('owner1');
    });
    expect(rows.length).toBe(2);
});
