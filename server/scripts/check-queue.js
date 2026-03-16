require('dotenv').config();
const { db } = require('../config/firebase');

async function checkQueue() {
    console.log('🔍 Checking Email Queue Status (Last 10 jobs)...');
    try {
        const snapshot = await db.collection('emailQueue')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            console.log('   No jobs found in queue.');
            return;
        }

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`\n📄 Job ID: ${doc.id}`);
            console.log(`   Event: ${data.eventData?.eventName || 'N/A'}`);
            console.log(`   Type: ${data.type}`);
            console.log(`   Status: ${data.status.toUpperCase()}`);
            console.log(`   Created: ${data.createdAt}`);
            if (data.status === 'failed') {
                console.log(`   ❌ Error: ${data.lastError}`);
            }
            if (data.status === 'sent') {
                console.log(`   ✅ Sent At: ${data.sentAt}`);
            }
        });

    } catch (error) {
        console.error('❌ Error checking queue:', error);
    } finally {
        process.exit(0);
    }
}

checkQueue();
