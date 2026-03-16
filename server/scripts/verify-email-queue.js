require('dotenv').config(); // Load .env from CWD first, like index.js
const { db } = require('../config/firebase');
const emailQueue = require('../services/emailQueue');
const emailQueueWorker = require('../jobs/emailQueueWorker');

/**
 * Verification Script for Email Queue
 * 1. Cleans up old test jobs
 * 2. Enqueues a test job
 * 3. Enqueues a duplicate test job (verifies deduplication)
 * 4. Monitors job status (verifies worker processing)
 */
async function runVerification() {
    console.log('🔍 Starting Email Queue Verification...');

    const testEventId = 'test-event-verification-123';
    const testType = 'created';

    try {
        // 1. Cleanup old test jobs
        console.log('🧹 Cleaning up old test jobs...');
        const oldJobs = await db.collection('emailQueue')
            .where('eventId', '==', testEventId)
            .get();

        const batch = db.batch();
        oldJobs.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`✅ Cleaned up ${oldJobs.size} old jobs.`);

        // 2. Enqueue first job
        console.log('➕ Enqueueing first job...');
        const job1Id = await emailQueue.enqueue({
            id: testEventId,
            eventName: 'Test Event for Verification',
            date: '2025-01-01',
            location: 'Test Location'
        }, testType);
        console.log(`✅ Job 1 Enqueued: ${job1Id}`);

        // 3. Enqueue duplicate job
        console.log('➕ Enqueueing DUPLICATE job (should return same ID)...');
        const job2Id = await emailQueue.enqueue({
            id: testEventId,
            eventName: 'Test Event for Verification',
            date: '2025-01-01',
            location: 'Test Location'
        }, testType);

        if (job1Id === job2Id) {
            console.log(`✅ Deduplication SUCCESS: Job ID matches (${job2Id})`);
        } else {
            console.error(`❌ Deduplication FAILED: Got different IDs (${job1Id} vs ${job2Id})`);
        }

        // 3.5 Manually Trigger Worker (Simulate background job)
        console.log('👷 Manually forcing worker to process queue...');
        await emailQueueWorker.process();

        // 4. Monitor Status
        console.log('👀 Monitoring job status for 20 seconds...');
        let verified = false;

        for (let i = 0; i < 10; i++) {
            const doc = await db.collection('emailQueue').doc(job1Id).get();
            const data = doc.data();
            console.log(`   [${i * 2}s] Status: ${data.status}`);

            if (data.status === 'sent') {
                console.log('✅ Job marked as SENT. Worker is running and processing correctly.');
                verified = true;
                break;
            }
            if (data.status === 'failed') {
                console.error(`❌ Job FAILED: ${data.lastError}`);
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (!verified) {
            console.warn('⚠️ Job remained PENDING. Is the main server/worker running?');
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        process.exit(0);
    }
}

runVerification();
