/**
 * Script to delete test/demo events
 * Run: node scripts/deleteTestEvents.js
 */
require('dotenv').config();

const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccountConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

initializeApp({
    credential: cert(serviceAccountConfig)
});

const db = getFirestore();

// Test/Demo events to DELETE (based on analysis)
const TEST_EVENT_IDS = [
    '0ZsQZDOWifc5Dxk0k0SB',  // Event03
    'BAdPA2K9hjDkSqOXtxvY',  // Event07
    'TFddJdmUUs114nnyvN1x',  // Event04
    'YlkujDurtl4FCCOo7ciR',  // Event02
    'dui5nOZppC2BAdQOWwVt',  // Event01
    'yTy3I355YBZJFFEMMPN7',  // Event05
    'Hw3c2doupkVFH2G0mItX',  // Event06
    'osvGeYE2cVjT6nZ6ZHyb',  // TEST02
    'V89WOLUCPAcCVCzOMBpE',  // OPENDAY (old)
    'oIX6KNBsqiCKgKQ2qrPp',  // Vẽ trang trí vách thạch cao
    'rWuIKC40UkXCvg1nMtvP',  // Debate
];

const deleteTestEvents = async () => {
    console.log('\n🗑️  DELETING TEST EVENTS...\n');
    console.log(`Events to delete: ${TEST_EVENT_IDS.length}\n`);

    for (const id of TEST_EVENT_IDS) {
        try {
            const doc = await db.collection('events').doc(id).get();
            if (doc.exists) {
                const event = doc.data();
                console.log(`   Deleting: ${event.eventName} (${event.eventDate})`);
                await db.collection('events').doc(id).delete();
            } else {
                console.log(`   Skip (not found): ${id}`);
            }
        } catch (error) {
            console.log(`   Error deleting ${id}: ${error.message}`);
        }
    }

    // Count remaining
    const remaining = await db.collection('events').get();
    console.log(`\n✅ Done! Remaining events: ${remaining.size}`);

    process.exit(0);
};

deleteTestEvents().catch(console.error);
