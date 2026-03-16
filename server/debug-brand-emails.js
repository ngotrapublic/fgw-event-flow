const admin = require('firebase-admin');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env.development'), override: true });

// Initialize Firebase
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkDuplicateEmails() {
    console.log('\n🔍 Checking Duplicate Emails for Event "BRAND"\n');
    console.log('='.repeat(60));

    try {
        // Check emailQueue jobs
        console.log('\n📧 EMAIL QUEUE JOBS:\n');
        const queueSnapshot = await db.collection('emailQueue')
            .where('eventData.eventName', '==', 'BRAND')
            .orderBy('createdAt', 'asc')
            .get();

        console.log(`Found ${queueSnapshot.size} job(s) in email queue\n`);

        queueSnapshot.forEach((doc, index) => {
            const job = doc.data();
            console.log(`Job ${index + 1}: ${doc.id}`);
            console.log(`  Type: ${job.type}`);
            console.log(`  Status: ${job.status}`);
            console.log(`  Created: ${job.createdAt?.toDate()}`);
            console.log(`  StartTime: ${job.eventData.startTime}`);
            console.log(`  EndTime: ${job.eventData.endTime}`);
            console.log(`  EventSession: ${job.eventData.eventSession}`);
            if (job.sentAt) console.log(` Sent: ${job.sentAt.toDate()}`);
            if (job.retries) console.log(`  Retries: ${job.retries}`);
            console.log('');
        });

        // Check actual event
        console.log('\n📅 EVENT DATA:\n');
        const eventSnapshot = await db.collection('events')
            .where('eventName', '==', 'BRAND')
            .get();

        if (!eventSnapshot.empty) {
            eventSnapshot.forEach(doc => {
                const event = doc.data();
                console.log(`Event ID: ${doc.id}`);
                console.log(`  Name: ${event.eventName}`);
                console.log(`  Date: ${event.eventDate}`);
                console.log(`  StartTime: ${event.startTime}`);
                console.log(`  EndTime: ${event.endTime}`);
                console.log(`  EventSession: ${event.eventSession}`);
                console.log(`  Created: ${event.createdAt?.toDate()}`);
                console.log('');
            });
        } else {
            console.log('No event found with name "BRAND"');
        }

    } catch (error) {
        console.error('Error:', error);
    }

    process.exit(0);
}

checkDuplicateEmails();
