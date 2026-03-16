const { db, admin } = require('../config/firebase');

/**
 * Email Queue Service - Firestore-based queue for async email processing
 * Provides non-blocking email delivery with retry mechanism
 */
class EmailQueue {
    constructor() {
        this.collection = db.collection('emailQueue');
    }

    /**
     * Add an email job to the queue
     * @param {Object} event - Event data
     * @param {string} type - Email type ('created', 'updated', 'reminder_1day', 'reminder_1hour')
     * @param {Object} options - Additional options
     * @returns {Promise<string>} Document ID
     */
    async enqueue(event, type, options = {}) {
        console.log(`[EMAIL QUEUE] Enqueue called for type: ${type}, event: ${event.eventName || event.id}`);

        // 🔒 DEDUPLICATION CHECK: Prevent duplicate jobs
        try {
            const existingJobs = await this.collection
                .where('eventId', '==', event.id)
                .where('type', '==', type)
                .where('status', 'in', ['pending', 'processing'])
                .get();

            if (!existingJobs.empty) {
                const existingJob = existingJobs.docs[0];
                console.log(`[EMAIL QUEUE] ⚠️ Job already exists for event ${event.id} (${type}), skipping duplicate (Job ID: ${existingJob.id})`);
                return existingJob.id;
            }
        } catch (dedupError) {
            console.error(`[EMAIL QUEUE] Deduplication check failed:`, dedupError.message);
            // Continue with enqueue if dedupe check fails (fail open, not silently)
        }

        const now = new Date();
        const job = {
            eventId: event.id,
            eventData: event,
            type,
            status: 'pending',
            attempts: 0,
            maxAttempts: options.maxAttempts || 3,
            createdAt: now.toISOString(),
            scheduledFor: options.scheduledFor || now.toISOString(),
            lastError: null,
            serverTimestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        console.log(`[EMAIL QUEUE] Job data:`, {
            eventId: job.eventId,
            type: job.type,
            status: job.status,
            scheduledFor: job.scheduledFor
        });

        try {
            const docRef = await this.collection.add(job);
            console.log(`[EMAIL QUEUE] ✅ Successfully enqueued ${type} email for event "${event.eventName}" (Job ID: ${docRef.id})`);
            return docRef.id;
        } catch (error) {
            console.error(`[EMAIL QUEUE] ❌ Failed to enqueue:`, error);
            console.error(`[EMAIL QUEUE] Error stack:`, error.stack);
            throw error;
        }
    }

    /**
     * Get pending jobs ready to be processed
     * @param {number} limit - Max number of jobs to retrieve
     * @returns {Promise<QuerySnapshot>}
     */
    async getPendingBatch(limit = 10) {
        const now = new Date().toISOString();

        return this.collection
            .where('status', '==', 'pending')
            .where('scheduledFor', '<=', now)
            .orderBy('scheduledFor', 'asc')
            .limit(limit)
            .get();
    }

    /**
     * Mark a job as successfully sent
     * @param {string} docId - Document ID
     */
    async markSent(docId) {
        await this.collection.doc(docId).update({
            status: 'sent',
            sentAt: new Date().toISOString(),
            serverTimestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[EMAIL QUEUE] Marked ${docId} as sent`);
    }

    /**
     * Mark a job as failed
     * @param {string} docId - Document ID
     * @param {string} error - Error message
     */
    async markFailed(docId, error) {
        await this.collection.doc(docId).update({
            status: 'failed',
            lastError: error,
            failedAt: new Date().toISOString(),
            serverTimestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[EMAIL QUEUE] Marked ${docId} as failed: ${error}`);
    }

    /**
     * Retry a failed job
     * @param {string} docId - Document ID
     * @param {string} error - Error message
     */
    async retry(docId, error) {
        const doc = await this.collection.doc(docId).get();
        const data = doc.data();
        const newAttempts = (data.attempts || 0) + 1;

        if (newAttempts >= data.maxAttempts) {
            // Max retries reached, mark as failed
            await this.markFailed(docId, `Max retries (${data.maxAttempts}) exceeded. Last error: ${error}`);
        } else {
            // Schedule retry with exponential backoff
            const delayMinutes = Math.pow(2, newAttempts); // 2, 4, 8 minutes
            const nextAttempt = new Date(Date.now() + delayMinutes * 60 * 1000);

            await this.collection.doc(docId).update({
                attempts: newAttempts,
                lastError: error,
                scheduledFor: nextAttempt.toISOString(),
                serverTimestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[EMAIL QUEUE] Retry ${newAttempts}/${data.maxAttempts} scheduled for ${docId} at ${nextAttempt.toISOString()}`);
        }
    }

    /**
     * Clean up old completed jobs (maintenance)
     * @param {number} daysOld - Delete jobs older than this many days
     */
    async cleanup(daysOld = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const cutoffStr = cutoffDate.toISOString();

        const snapshot = await this.collection
            .where('status', 'in', ['sent', 'failed'])
            .where('createdAt', '<=', cutoffStr)
            .limit(100)
            .get();

        if (snapshot.empty) {
            console.log('[EMAIL QUEUE] No old jobs to cleanup');
            return 0;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`[EMAIL QUEUE] Cleaned up ${snapshot.size} old jobs`);
        return snapshot.size;
    }

    /**
     * Get queue statistics
     */
    async getStats() {
        const [pending, sent, failed] = await Promise.all([
            this.collection.where('status', '==', 'pending').count().get(),
            this.collection.where('status', '==', 'sent').count().get(),
            this.collection.where('status', '==', 'failed').count().get()
        ]);

        return {
            pending: pending.data().count,
            sent: sent.data().count,
            failed: failed.data().count,
            total: pending.data().count + sent.data().count + failed.data().count
        };
    }
}

module.exports = new EmailQueue();
