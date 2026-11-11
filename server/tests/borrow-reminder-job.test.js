let mockFirebase;

jest.mock('../config/firebase', () => {
    mockFirebase = require('./helpers/firestoreMock').buildFirebaseMock({
        borrow_requests: {},
        borrow_link_codes: {},
        borrow_sessions: {},
        audit_logs: {},
        users: {}
    });
    return mockFirebase;
});

jest.mock('../services/borrow-email-service', () => ({
    sendDueSoon: jest.fn(() => Promise.resolve()),
    sendOverdue: jest.fn(() => Promise.resolve())
}));

jest.mock('../services/notificationService', () => ({
    create: jest.fn(() => Promise.resolve()),
    getAdminUids: jest.fn(() => Promise.resolve(['admin1'])),
    getUidsByRoles: jest.fn(() => Promise.resolve(['admin1', 'manager1']))
}));

const borrowReminderJob = require('../jobs/borrow-reminder-job');
const borrowEmailService = require('../services/borrow-email-service');
const notificationService = require('../services/notificationService');
const { hash } = require('../services/borrow-token-service');

beforeEach(() => {
    mockFirebase.__stores.borrow_requests.clear();
    mockFirebase.__stores.borrow_link_codes.clear();
    mockFirebase.__stores.borrow_sessions.clear();
    mockFirebase.__stores.audit_logs.clear();
    mockFirebase.__stores.users.clear();
    jest.clearAllMocks();
});

describe('BorrowReminderJob (/server/jobs/borrow-reminder-job.js)', () => {
    test('1. unverified quá hạn verifyExpiresAt -> expired, isOpen=false', async () => {
        const pastExpires = new Date(Date.now() - 3600e3).toISOString();
        mockFirebase.__stores.borrow_requests.set('req-unver-expired', {
            id: 'req-unver-expired',
            status: 'unverified',
            isOpen: true,
            verifyExpiresAt: pastExpires,
            items: [],
            history: []
        });

        // Another request not expired yet
        const futureExpires = new Date(Date.now() + 3600e3).toISOString();
        mockFirebase.__stores.borrow_requests.set('req-unver-active', {
            id: 'req-unver-active',
            status: 'unverified',
            isOpen: true,
            verifyExpiresAt: futureExpires,
            items: [],
            history: []
        });

        await borrowReminderJob.run();

        const expiredDoc = mockFirebase.__stores.borrow_requests.get('req-unver-expired');
        expect(expiredDoc.status).toBe('expired');
        expect(expiredDoc.isOpen).toBe(false);

        const activeDoc = mockFirebase.__stores.borrow_requests.get('req-unver-active');
        expect(activeDoc.status).toBe('unverified');
        expect(activeDoc.isOpen).toBe(true);
    });

    test('2. handed_over quá hạn -> isOverdue=true, sendOverdue 1 lần; chạy run() lần 2 ngay -> không gửi thêm', async () => {
        const pastDue = new Date(Date.now() - 2 * 3600e3).toISOString();
        mockFirebase.__stores.borrow_requests.set('req-ho-overdue', {
            id: 'req-ho-overdue',
            status: 'handed_over',
            isOpen: true,
            dueAt: pastDue,
            borrower: { name: 'Nguyen Van D', email: 'd@test.com' },
            items: []
        });

        // Run 1: sets isOverdue, sends email, notifies admin
        await borrowReminderJob.run();

        const docAfter1 = mockFirebase.__stores.borrow_requests.get('req-ho-overdue');
        expect(docAfter1.isOverdue).toBe(true);
        expect(docAfter1.overdueRemindedAt).toBeDefined();
        expect(borrowEmailService.sendOverdue).toHaveBeenCalledTimes(1);
        expect(notificationService.create).toHaveBeenCalled();

        // Run 2 immediately -> should NOT send overdue email again (within 24h)
        await borrowReminderJob.run();
        expect(borrowEmailService.sendOverdue).toHaveBeenCalledTimes(1);
    });

    test('3. handed_over hạn trong 10h -> sendDueSoon 1 lần; chạy lại -> không gửi', async () => {
        const in10h = new Date(Date.now() + 10 * 3600e3).toISOString();
        mockFirebase.__stores.borrow_requests.set('req-ho-duesoon', {
            id: 'req-ho-duesoon',
            status: 'handed_over',
            isOpen: true,
            dueAt: in10h,
            borrower: { name: 'Le Van E', email: 'e@test.com' },
            items: []
        });

        // Run 1: sets dueSoonRemindedAt, sends email
        await borrowReminderJob.run();

        const docAfter1 = mockFirebase.__stores.borrow_requests.get('req-ho-duesoon');
        expect(docAfter1.dueSoonRemindedAt).toBeDefined();
        expect(borrowEmailService.sendDueSoon).toHaveBeenCalledTimes(1);

        // Run 2 immediately -> does not resend
        await borrowReminderJob.run();
        expect(borrowEmailService.sendDueSoon).toHaveBeenCalledTimes(1);
    });

    test('4. return_pending quá hạn -> không gửi gì (đã báo trả)', async () => {
        const pastDue = new Date(Date.now() - 3600e3).toISOString();
        mockFirebase.__stores.borrow_requests.set('req-rp-overdue', {
            id: 'req-rp-overdue',
            status: 'return_pending',
            isOpen: true,
            dueAt: pastDue,
            borrower: { name: 'Tran Van F', email: 'f@test.com' },
            items: []
        });

        await borrowReminderJob.run();

        expect(borrowEmailService.sendOverdue).not.toHaveBeenCalled();
        expect(borrowEmailService.sendDueSoon).not.toHaveBeenCalled();
    });

    test('5. Bước 1 ném lỗi -> bước 4 vẫn chạy bình thường', async () => {
        const originalCollection = mockFirebase.db.collection;
        const pastDue = new Date(Date.now() - 3600e3).toISOString();

        mockFirebase.__stores.borrow_requests.set('req-step4-survives', {
            id: 'req-step4-survives',
            status: 'handed_over',
            isOpen: true,
            dueAt: pastDue,
            borrower: { name: 'Survivor', email: 'surv@test.com' },
            items: []
        });

        // Mock Step 1 to fail on get()
        let callCount = 0;
        const origWhere = mockFirebase.borrowRequestsCollection.where.bind(mockFirebase.borrowRequestsCollection);
        const spy = jest.spyOn(mockFirebase.borrowRequestsCollection, 'where').mockImplementation((field, op, val) => {
            if (val === 'unverified') {
                return {
                    get: jest.fn().mockRejectedValueOnce(new Error('Simulated Step 1 failure'))
                };
            }
            return origWhere(field, op, val);
        });

        await borrowReminderJob.run();
        spy.mockRestore();

        // Step 4 still ran and marked overdue
        const doc = mockFirebase.__stores.borrow_requests.get('req-step4-survives');
        expect(doc.isOverdue).toBe(true);
        expect(borrowEmailService.sendOverdue).toHaveBeenCalledTimes(1);
    });

    test('6. approved > 3 ngày -> thông báo admin/manager, approvedStaleNotifiedAt được set; chạy lại -> không gửi', async () => {
        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 3600e3).toISOString();
        mockFirebase.__stores.borrow_requests.set('req-app-stale', {
            id: 'req-app-stale',
            status: 'approved',
            isOpen: true,
            approvedAt: fourDaysAgo,
            borrower: { name: 'Stale Borrower' },
            items: []
        });

        await borrowReminderJob.run();

        const doc1 = mockFirebase.__stores.borrow_requests.get('req-app-stale');
        expect(doc1.approvedStaleNotifiedAt).toBeDefined();
        expect(doc1.status).toBe('approved'); // Does NOT auto-cancel
        expect(notificationService.create).toHaveBeenCalled();

        const prevCalls = notificationService.create.mock.calls.length;
        // Run again -> does not notify again
        await borrowReminderJob.run();
        expect(notificationService.create.mock.calls.length).toBe(prevCalls);
    });

    test('7. approved nhưng thiếu approvedAt hoặc approvedAt không hợp lệ -> không gửi thông báo', async () => {
        // Missing approvedAt
        mockFirebase.__stores.borrow_requests.set('req-app-no-date', {
            id: 'req-app-no-date',
            status: 'approved',
            isOpen: true,
            borrower: { name: 'No Date Borrower' },
            items: []
        });

        // Invalid date string
        mockFirebase.__stores.borrow_requests.set('req-app-bad-date', {
            id: 'req-app-bad-date',
            status: 'approved',
            isOpen: true,
            approvedAt: 'invalid-date-string',
            borrower: { name: 'Bad Date Borrower' },
            items: []
        });

        await borrowReminderJob.run();

        const doc1 = mockFirebase.__stores.borrow_requests.get('req-app-no-date');
        expect(doc1.approvedStaleNotifiedAt).toBeUndefined();

        const doc2 = mockFirebase.__stores.borrow_requests.get('req-app-bad-date');
        expect(doc2.approvedStaleNotifiedAt).toBeUndefined();

        expect(notificationService.create).not.toHaveBeenCalled();
    });

    test('9. nhắc sắp hạn và quá hạn cấp one-time link code hashed trong borrow_link_codes (không phát hành bearer token dài hạn)', async () => {
        const in10h = new Date(Date.now() + 10 * 3600e3).toISOString();
        const pastDue = new Date(Date.now() - 2 * 3600e3).toISOString();

        mockFirebase.__stores.borrow_requests.set('req-duesoon-token', {
            id: 'req-duesoon-token',
            status: 'handed_over',
            isOpen: true,
            dueAt: in10h,
            borrower: { name: 'Due Soon', email: 'duesoon@test.com' },
            items: []
        });
        mockFirebase.__stores.borrow_requests.set('req-overdue-token', {
            id: 'req-overdue-token',
            status: 'handed_over',
            isOpen: true,
            dueAt: pastDue,
            borrower: { name: 'Overdue', email: 'overdue@test.com' },
            items: []
        });

        await borrowReminderJob.run();

        const dueSoonDoc = mockFirebase.__stores.borrow_requests.get('req-duesoon-token');
        expect(dueSoonDoc.accessTokenHashes).toBeUndefined();
        const dueSoonCode = borrowEmailService.sendDueSoon.mock.calls[0][1];
        expect(typeof dueSoonCode).toBe('string');
        const dueSoonLinkRecord = mockFirebase.__stores.borrow_link_codes.get(hash(dueSoonCode));
        expect(dueSoonLinkRecord).toBeDefined();
        expect(dueSoonLinkRecord.requestId).toBe('req-duesoon-token');
        expect(dueSoonLinkRecord.consumedAt).toBeNull();

        const overdueDoc = mockFirebase.__stores.borrow_requests.get('req-overdue-token');
        expect(overdueDoc.accessTokenHashes).toBeUndefined();
        const overdueCode = borrowEmailService.sendOverdue.mock.calls[0][1];
        expect(typeof overdueCode).toBe('string');
        const overdueLinkRecord = mockFirebase.__stores.borrow_link_codes.get(hash(overdueCode));
        expect(overdueLinkRecord).toBeDefined();
        expect(overdueLinkRecord.requestId).toBe('req-overdue-token');
        expect(overdueLinkRecord.consumedAt).toBeNull();
    });

    test('8. start() an toàn khi gọi nhiều lần (idempotent), stop() xoá intervalId', () => {
        const runSpy = jest.spyOn(borrowReminderJob, 'run').mockImplementation(() => Promise.resolve());
        try {
            borrowReminderJob.start();
            const firstIntervalId = borrowReminderJob.intervalId;
            expect(firstIntervalId).toBeDefined();

            // Calling start() again should do nothing
            borrowReminderJob.start();
            expect(borrowReminderJob.intervalId).toBe(firstIntervalId);

            borrowReminderJob.stop();
            expect(borrowReminderJob.intervalId).toBeNull();
        } finally {
            runSpy.mockRestore();
            borrowReminderJob.stop();
        }
    });
});
