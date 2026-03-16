const { restoreSystem } = require('../controllers/backupController');
const { db } = require('../config/firebase');

async function runTest() {
    console.log('🧪 Starting Restore Logic Verification...');

    const testEventId = 'TEST_RESTORE_ID_' + Date.now();
    const testData = {
        data: {
            events: {
                [testEventId]: {
                    eventName: 'VERIFICATION_TEST_EVENT',
                    eventDate: '2025-12-25',
                    description: 'This is a test event created by the verification script to test Restore functionality.'
                }
            }
        }
    };

    // Mock Req, Res, Next
    const req = { body: testData };
    const res = {
        json: (data) => {
            console.log('✅ Controller Response:', data);
        },
        status: (code) => {
            console.log('ℹ️ Status Code:', code);
            return res; // chainable
        }
    };
    const next = (err) => {
        console.error('❌ Error in Controller:', err);
    };

    try {
        // 1. Run Restore
        console.log('1️⃣  Executing restoreSystem()...');
        await restoreSystem(req, res, next);

        // 2. Verify Data in Firestore
        console.log('2️⃣  Verifying data in Firestore...');
        const docRef = db.collection('events').doc(testEventId);
        const doc = await docRef.get();

        if (doc.exists && doc.data().eventName === 'VERIFICATION_TEST_EVENT') {
            console.log('✅ SUCCESS: Test event was successfully restored directly to Firestore.');

            // 3. Cleanup
            console.log('3️⃣  Cleaning up test data...');
            await docRef.delete();
            console.log('✅ Cleanup complete.');
            process.exit(0);
        } else {
            console.error('❌ FAILURE: Test event was NOT found in Firestore after restore.');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Test Script Error:', error);
        process.exit(1);
    }
}

runTest();
