const admin = require('firebase-admin');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env.development'), override: true });

// Initialize Firebase Admin
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testEmailQueue() {
    console.log('\n🧪 EMAIL QUEUE TEST\n');
    console.log('==================\n');

    try {
        // Test 1: Check pending jobs
        console.log('Test 1: Checking pending jobs...');
        const pendingSnapshot = await db.collection('emailQueue')
            .where('status', '==', 'pending')
            .orderBy('scheduledFor', 'asc')
            .limit(5)
            .get();

        console.log(`✅ Found ${pendingSnapshot.size} pending job(s)\n`);

        if (pendingSnapshot.size > 0) {
            pendingSnapshot.forEach((doc, index) => {
                const job = doc.data();
                console.log(`Job ${index + 1}: ${doc.id}`);
                console.log(`  Event: ${job.eventData?.eventName || 'Unknown'}`);
                console.log(`  Type: ${job.type}`);
                console.log(`  Status: ${job.status}`);
                console.log(`  Scheduled: ${job.scheduledFor?.toDate()}`);
                console.log(`  Retries: ${job.retries || 0}/3`);
                console.log('');
            });
        }

        // Test 2: Check sent jobs
        console.log('\nTest 2: Checking sent jobs...');
        const sentSnapshot = await db.collection('emailQueue')
            .where('status', '==', 'sent')
            .orderBy('sentAt', 'desc')
            .limit(3)
            .get();

        console.log(`✅ Found ${sentSnapshot.size} sent job(s)\n`);

        sentSnapshot.forEach((doc, index) => {
            const job = doc.data();
            console.log(`Sent Job ${index + 1}: ${doc.id}`);
            console.log(`  Event: ${job.eventData?.eventName || 'Unknown'}`);
            console.log(`  Sent At: ${job.sentAt?.toDate()}`);
            console.log('');
        });

        // Test 3: Check failed jobs
        console.log('\nTest 3: Checking failed jobs...');
        const failedSnapshot = await db.collection('emailQueue')
            .where('status', '==', 'failed')
            .limit(3)
            .get();

        console.log(`✅ Found ${failedSnapshot.size} failed job(s)\n`);

        if (failedSnapshot.size > 0) {
            failedSnapshot.forEach((doc, index) => {
                const job = doc.data();
                console.log(`Failed Job ${index + 1}: ${doc.id}`);
                console.log(`  Event: ${job.eventData?.eventName || 'Unknown'}`);
                console.log(`  Error: ${job.lastError || 'Unknown error'}`);
                console.log(`  Retries: ${job.retries || 0}/3`);
                console.log('');
            });
        }

        // Test 4: Queue stats
        console.log('\n📊 QUEUE STATISTICS\n');
        console.log('===================\n');

        const allSnapshot = await db.collection('emailQueue').get();
        const stats = {
            total: allSnapshot.size,
            pending: 0,
            sent: 0,
            failed: 0
        };

        allSnapshot.forEach(doc => {
            const status = doc.data().status;
            if (status === 'pending') stats.pending++;
            else if (status === 'sent') stats.sent++;
            else if (status === 'failed') stats.failed++;
        });

        console.log(`Total Jobs: ${stats.total}`);
        console.log(`Pending:    ${stats.pending}`);
        console.log(`Sent:       ${stats.sent}`);
        console.log(`Failed:     ${stats.failed}`);
        console.log('\n✅ All tests completed!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }

    process.exit(0);
}

testEmailQueue();
