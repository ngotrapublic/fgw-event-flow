const admin = require('firebase-admin');
const { loadEnv } = require('./load-env');

// Ensure env files (.env.<NODE_ENV> / .env) are loaded idempotently even if firebase.js is required directly
const envResult = loadEnv();

console.log(`🌍 Environment: ${envResult.nodeEnv || process.env.NODE_ENV || 'development'}`);
if (envResult.loadedFiles.length > 0) {
    console.log(`📁 Env files loaded: ${envResult.loadedFiles.join(', ')}`);
}

// Initialize Firebase Admin SDK with service account (or emulator projectId when FIRESTORE_EMULATOR_HOST is set)
const isEmulatorMode = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

try {
    if (!admin.apps.length) {
        if (isEmulatorMode) {
            admin.initializeApp({
                projectId: process.env.FIREBASE_PROJECT_ID || 'demo-antigravity-borrow'
            });
            console.log(`✓ Firebase Admin SDK initialized for Firestore Emulator (${process.env.FIRESTORE_EMULATOR_HOST})`);
        } else {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✓ Firebase Admin SDK initialized successfully');
        }
    }
} catch (error) {
    console.error('✗ Firebase Admin SDK initialization failed:', error.message);
    process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

// Collections references
const eventsCollection = db.collection('events');
const departmentsCollection = db.collection('departments');
const resourcesCollection = db.collection('resources');
const auditLogsCollection = db.collection('audit_logs');
const borrowRequestsCollection = db.collection('borrow_requests');
const borrowOtpsCollection = db.collection('borrow_otps');
const borrowSessionsCollection = db.collection('borrow_sessions');
const borrowLinkCodesCollection = db.collection('borrow_link_codes');
const borrowQuotasCollection = db.collection('borrow_quotas');
const borrowReminderOutboxCollection = db.collection('borrow_reminder_outbox');
const borrowIdempotencyCollection = db.collection('borrow_idempotency');

module.exports = {
    admin,
    db,
    eventsCollection,
    departmentsCollection,
    resourcesCollection,
    auditLogsCollection,
    borrowRequestsCollection,
    borrowOtpsCollection,
    borrowSessionsCollection,
    borrowLinkCodesCollection,
    borrowQuotasCollection,
    borrowReminderOutboxCollection,
    borrowIdempotencyCollection
};
