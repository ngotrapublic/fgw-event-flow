const admin = require('firebase-admin');
const path = require('path');

// Phase 4: Load environment-specific config
const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'staging'
        ? '.env.staging'
        : '.env.development';

require('dotenv').config({ path: path.resolve(__dirname, '..', envFile) });

// Fallback to .env if specific file doesn't exist
if (!process.env.FIREBASE_PROJECT_ID) {
    require('dotenv').config();
}

console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📁 Config loaded from: ${envFile}`);

// Initialize Firebase Admin SDK with service account
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✓ Firebase Admin SDK initialized successfully');
} catch (error) {
    console.error('✗ Firebase Admin SDK initialization failed:', error.message);
    process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

// Collections references
// Collections references
const eventsCollection = db.collection('events');
const departmentsCollection = db.collection('departments');
const resourcesCollection = db.collection('resources');
const auditLogsCollection = db.collection('audit_logs'); // ✅ NEW

module.exports = {
    admin,
    db,
    eventsCollection,
    departmentsCollection,
    resourcesCollection,
    auditLogsCollection
};
