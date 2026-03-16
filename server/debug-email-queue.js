const emailQueue = require('./services/emailQueue');

async function checkEmailQueue() {
    try {
        console.log('\n=== EMAIL QUEUE DEBUG ===\n');

        // Get stats
        const stats = await emailQueue.getStats();
        console.log('Queue Stats:', stats);

        // Get pending jobs
        const snapshot = await emailQueue.getPendingBatch(10);
        console.log('\nPending Jobs:', snapshot.size);

        if (!snapshot.empty) {
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log(`\n  Job ID: ${doc.id}`);
                console.log(`  Type: ${data.type}`);
                console.log(`  Event: ${data.eventData.eventName}`);
                console.log(`  Status: ${data.status}`);
                console.log(`  Scheduled: ${data.scheduledFor}`);
                console.log(`  Attempts: ${data.attempts}/${data.maxAttempts}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

checkEmailQueue();
