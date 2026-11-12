/**
 * Firestore Emulator integration tests (MEDIUM-04 / MEDIUM-RECHECK-02):
 * Runs against real Firestore Emulator + real firestore.rules + real Admin SDK transactions.
 * Execute via single CI command from server/: `npm run test:emulator`
 * (Requires JDK 21+ for Firebase Local Emulator Suite / pinned firebase-tools.)
 */

const fs = require('fs');
const path = require('path');
const {
    initializeTestEnvironment,
    assertFails
} = require('@firebase/rules-unit-testing');

process.env.NODE_ENV = 'test';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-antigravity-borrow';
process.env.APP_PUBLIC_URL = 'https://event.greenwichvietnam.edu.vn';

// Mock outbound email & notification fanout only; database/transactions hit real Firestore Emulator
jest.mock('../../services/borrow-email-service', () => ({
    assertEmailEnabled: jest.fn(),
    getAppPublicUrl: jest.fn(() => 'https://event.greenwichvietnam.edu.vn'),
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

jest.mock('../../services/notificationService', () => ({
    create: jest.fn(() => Promise.resolve()),
    getAdminUids: jest.fn(() => Promise.resolve(['admin-emu'])),
    getUidsByRoles: jest.fn(() => Promise.resolve(['admin-emu']))
}));

jest.mock('../../controllers/settingsController', () => ({
    getSettingsInternal: jest.fn(() => ({ channels: { email: true } }))
}));

const {
    db,
    resourcesCollection,
    borrowRequestsCollection,
    borrowOtpsCollection,
    borrowLinkCodesCollection
} = require('../../config/firebase');
const borrowCtrl = require('../../controllers/borrow-public-controller');
const borrowAdminCtrl = require('../../controllers/borrow-admin-controller');
const { exchangeLinkCode } = require('../../services/borrow-link-service');
const borrowReminderJob = require('../../jobs/borrow-reminder-job');
const borrowEmailService = require('../../services/borrow-email-service');
const { hash, hmacKey } = require('../../services/borrow-token-service');

const RULES_PATH = path.resolve(__dirname, '../../../firestore.rules');
const BORROW_COLLECTIONS = [
    'borrow_requests',
    'borrow_otps',
    'borrow_sessions',
    'borrow_link_codes',
    'borrow_quotas',
    'borrow_reminder_outbox',
    'borrow_idempotency'
];

const mkRes = () => ({
    statusCode: 200,
    body: null,
    headers: {},
    cookies: {},
    status(c) {
        this.statusCode = c;
        return this;
    },
    set(obj) {
        Object.assign(this.headers, obj || {});
        return this;
    },
    cookie(name, value, opts) {
        this.cookies[name] = { value, opts };
        return this;
    },
    clearCookie(name) {
        delete this.cookies[name];
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
            res.status(err.statusCode || 500).json({ error: err.message, details: err.details });
        }
    });
    await fn(req, res, next);
    return res;
};

function parseHostPort(hostPort) {
    const [host, portStr] = String(hostPort || '127.0.0.1:8080').split(':');
    return { host, port: Number(portStr) || 8080 };
}

describe('Firestore Emulator Integration — Rules, Transactions & Queries', () => {
    let testEnv;

    beforeAll(async () => {
        const { host, port } = parseHostPort(process.env.FIRESTORE_EMULATOR_HOST);
        testEnv = await initializeTestEnvironment({
            projectId: process.env.FIREBASE_PROJECT_ID,
            firestore: {
                host,
                port,
                rules: fs.readFileSync(RULES_PATH, 'utf8')
            }
        });
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await testEnv.clearFirestore();
        await resourcesCollection.doc('loa-emu').set({
            label: 'Loa Emulator',
            category: 'Audio',
            quantity: 20,
            availableQty: 20
        });
    });

    afterAll(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    test('Security rules deny client SDK read & write across all borrow collections', async () => {
        await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
            const admDb = adminCtx.firestore();
            await admDb.collection('users').doc('admin-user').set({ role: 'admin' });
            for (const col of BORROW_COLLECTIONS) {
                await admDb.collection(col).doc('seed-doc').set({ secret: 'top-secret' });
            }
        });

        const unauthDb = testEnv.unauthenticatedContext().firestore();
        const studentDb = testEnv.authenticatedContext('student-user').firestore();
        const adminClientDb = testEnv.authenticatedContext('admin-user').firestore();

        for (const clientDb of [unauthDb, studentDb, adminClientDb]) {
            for (const col of BORROW_COLLECTIONS) {
                await assertFails(clientDb.collection(col).doc('seed-doc').get());
                await assertFails(clientDb.collection(col).doc('new-doc').set({ hacked: true }));
                await assertFails(clientDb.collection(col).doc('seed-doc').update({ hacked: true }));
                await assertFails(clientDb.collection(col).doc('seed-doc').delete());
            }
        }
    });

    test('Real Firestore transaction enforces concurrent guest quota (max 3 open), OTP cooldown & hourly cap (max 3/hr)', async () => {
        const tomorrow = new Date(Date.now() + 36 * 3600e3).toISOString().slice(0, 10);
        const makeReq = (i) => ({
            body: {
                name: `Emulator Guest ${i}`,
                email: 'emuguest@test.com',
                phone: '0907778889',
                dueDate: tomorrow,
                items: [{ resourceId: 'loa-emu', qty: 1 }]
            },
            user: null
        });

        const results = await Promise.all(
            [1, 2, 3, 4, 5].map((i) => callHandler(borrowCtrl.createBorrowRequest, makeReq(i)))
        );

        expect(results.filter((r) => r.statusCode === 201)).toHaveLength(3);
        expect(results.filter((r) => r.statusCode === 429)).toHaveLength(2);

        // Concurrent OTP burst: transaction serialization + OTP_RESEND_MS cooldown -> strictly 1 send
        const otpResults = await Promise.all(
            [1, 2, 3, 4].map(() =>
                callHandler(borrowCtrl.requestOtp, { body: { phone: '0907778889' } })
            )
        );
        otpResults.forEach((r) => expect(r.statusCode).toBe(200));
        await new Promise((r) => setTimeout(r, 100));
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(1);

        // Advance past resend cooldown twice -> sends #2 and #3 succeed; #4 blocked by 3/hr cap
        const otpKey = hmacKey('otp:0907778889');
        const pastSentAt = new Date(Date.now() - 120 * 1000).toISOString();

        await borrowOtpsCollection.doc(otpKey).update({ sentAt: pastSentAt });
        await callHandler(borrowCtrl.requestOtp, { body: { phone: '0907778889' } });
        await new Promise((r) => setTimeout(r, 80));
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(2);

        await borrowOtpsCollection.doc(otpKey).update({ sentAt: pastSentAt });
        await callHandler(borrowCtrl.requestOtp, { body: { phone: '0907778889' } });
        await new Promise((r) => setTimeout(r, 80));
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(3);

        await borrowOtpsCollection.doc(otpKey).update({ sentAt: pastSentAt });
        await callHandler(borrowCtrl.requestOtp, { body: { phone: '0907778889' } });
        await new Promise((r) => setTimeout(r, 80));
        expect(borrowEmailService.sendOtp).toHaveBeenCalledTimes(3);
    });

    test('Real Firestore transaction enforces strict single-use exchangeLinkCode under contention', async () => {
        const tomorrow = new Date(Date.now() + 36 * 3600e3).toISOString().slice(0, 10);
        const created = await callHandler(borrowCtrl.createBorrowRequest, {
            body: {
                name: 'Link Race Guest',
                email: 'linkrace@test.com',
                phone: '0901239876',
                dueDate: tomorrow,
                items: [{ resourceId: 'loa-emu', qty: 1 }]
            },
            user: null
        });
        expect(created.statusCode).toBe(201);

        const rawCode = borrowEmailService.sendVerify.mock.calls[0][2];
        const attempts = await Promise.allSettled([
            exchangeLinkCode(rawCode),
            exchangeLinkCode(rawCode),
            exchangeLinkCode(rawCode)
        ]);

        const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
        const rejected = attempts.filter((a) => a.status === 'rejected');
        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(2);
    });

    test('Query & index smoke checks for reminder job, admin list, and public queries', async () => {
        const tomorrow = new Date(Date.now() + 36 * 3600e3).toISOString().slice(0, 10);
        await borrowRequestsCollection.doc('req-smoke-1').set({
            id: 'req-smoke-1',
            status: 'handed_over',
            isOpen: true,
            borrower: {
                uid: 'uid-smoke-1',
                name: 'Smoke User',
                email: 'smoke@test.com',
                phone: '0908881112'
            },
            borrowerType: 'account',
            items: [{ resourceId: 'loa-emu', label: 'Loa Emulator', qty: 1 }],
            dueDate: tomorrow,
            dueAt: new Date(Date.now() - 2 * 3600e3).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        const publicMyRes = await callHandler(borrowCtrl.getMyRequests, {
            user: { uid: 'uid-smoke-1', email: 'smoke@test.com' }
        });
        expect(publicMyRes.statusCode).toBe(200);
        expect(publicMyRes.body.requests).toHaveLength(1);

        const adminListRes = await callHandler(borrowAdminCtrl.getRequests, {
            query: { status: 'handed_over', overdue: 'true', limit: '20' },
            user: { uid: 'admin-emu', role: 'admin' }
        });
        expect(adminListRes.statusCode).toBe(200);
        expect(adminListRes.body.requests).toHaveLength(1);

        await borrowReminderJob.run();
        expect(borrowEmailService.sendOverdue).toHaveBeenCalledTimes(1);
    });

    test('concurrent_same_idempotency_key_sends_one_delivery_and_leaves_one_valid_verify_token', async () => {
        const tomorrow = new Date(Date.now() + 36 * 3600e3).toISOString().slice(0, 10);
        const idemKey = 'emu-concurrent-idem-1';
        borrowEmailService.sendVerify.mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        );

        const reqPayload = {
            headers: { 'idempotency-key': idemKey },
            body: {
                name: 'Emulator Idem Guest',
                email: 'emuidem@test.com',
                phone: '0905556677',
                dueDate: tomorrow,
                items: [{ resourceId: 'loa-emu', qty: 1 }]
            },
            user: null
        };

        const responses = await Promise.all([
            callHandler(borrowCtrl.createBorrowRequest, reqPayload),
            callHandler(borrowCtrl.createBorrowRequest, reqPayload),
            callHandler(borrowCtrl.createBorrowRequest, reqPayload)
        ]);

        const created = responses.filter((r) => r.statusCode === 201);
        const deduped = responses.filter((r) => r.statusCode === 200);
        expect(created).toHaveLength(1);
        expect(deduped).toHaveLength(2);
        expect(borrowEmailService.sendVerify).toHaveBeenCalledTimes(1);

        const reqSnap = await borrowRequestsCollection.get();
        expect(reqSnap.size).toBe(1);

        const linkSnap = await borrowLinkCodesCollection
            .where('requestId', '==', created[0].body.request.id)
            .get();
        const activeLinks = linkSnap.docs.filter((d) => !d.data().revokedAt && !d.data().consumedAt);
        expect(activeLinks).toHaveLength(1);

        const [, verifyToken, linkCode] = borrowEmailService.sendVerify.mock.calls[0];
        const linkRes = await exchangeLinkCode(linkCode);
        expect(linkRes.requestId).toBe(created[0].body.request.id);

        const verifyRes = await callHandler(borrowCtrl.verifyEmail, { body: { token: verifyToken } });
        expect(verifyRes.statusCode).toBe(200);
        expect(verifyRes.body.request.status).toBe('pending');
    });
});
