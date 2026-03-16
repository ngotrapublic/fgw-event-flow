require('dotenv').config();
const { db } = require('../config/firebase');

async function testNestedUpdate() {
    console.log('🧪 Testing Firestore Nested Update Behavior...');

    const docRef = db.collection('debug_events').doc('test-flag-update');

    // 1. Create doc WITHOUT 'remindersSent' field
    await docRef.set({
        eventName: 'Test Event',
        createdAt: new Date().toISOString()
    });
    console.log('✅ Created test doc without remindersSent');

    // 2. Try to update 'remindersSent.oneDay' using dot notation
    try {
        await docRef.update({
            'remindersSent.oneDay': true
        });
        console.log('✅ Update succeeded (Unexpected if strict)');
    } catch (error) {
        console.error('❌ Update FAILED (Expected):', error.message);
    }

    // 3. Try using Set Merge
    try {
        await docRef.set({
            remindersSent: { oneDay: true }
        }, { merge: true });
        console.log('✅ Set Merge succeeded');

        const updated = await docRef.get();
        console.log('   Result:', updated.data().remindersSent);
    } catch (error) {
        console.error('❌ Set Merge FAILED:', error.message);
    }
}

testNestedUpdate();
