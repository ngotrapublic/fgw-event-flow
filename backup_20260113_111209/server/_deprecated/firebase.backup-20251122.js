const admin = require('firebase-admin');
require('dotenv').config();

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
const eventsCollection = db.collection('events');
const departmentsCollection = db.collection('departments');

module.exports = {
    admin,
    db,
    eventsCollection,
    departmentsCollection
};
