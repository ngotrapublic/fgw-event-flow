require('dotenv').config({ path: '.env.development' });
// FIX PEM NEWLINES
if (process.env.FIREBASE_PRIVATE_KEY) {
    process.env.FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');
}
const { eventsCollection } = require('../config/firebase');

async function checkTodayEvents() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`\n🔍 Checking events for TODAY (${todayStr})...\n`);

    const snapshot = await eventsCollection.where('eventDate', '==', todayStr).get();

    if (snapshot.empty) {
        console.log(`❌ No documents found with eventDate == '${todayStr}'.`);
    } else {
        console.log(`✅ Found ${snapshot.size} document(s) for today!\n`);
        snapshot.docs.forEach((doc, idx) => {
            const data = doc.data();
            console.log(`[Event ${idx + 1}] ID: ${doc.id}`);
            console.log(`   Name: ${data.eventName}`);
            console.log(`   Group ID: ${data.groupId || 'N/A'}`);
            console.log(`   Date Range: ${data.eventDate}`);
            console.log('-------------------------');
        });
    }
    process.exit(0);
}

checkTodayEvents().catch(console.error);
