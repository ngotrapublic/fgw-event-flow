const emailQueue = require('../services/emailQueue');
const emailService = require('../services/emailService');

/**
 * Email Queue Worker - Background job that processes email queue
 * Runs every 10 seconds to send pending emails
 */
class EmailQueueWorker {
    constructor() {
        this.intervalId = null;
        this.isProcessing = false;
        this.processInterval = 60000; // 60 seconds
    }

    /**
     * Start the worker
     */
    start() {
        if (this.intervalId) {
            console.log('[EMAIL QUEUE WORKER] Already running');
            return;
        }

        console.log('[EMAIL QUEUE WORKER] Starting... (interval: 60s)');
        console.log('[EMAIL QUEUE WORKER] Will process pending emails every 60 seconds');

        // Process immediately on start
        console.log('[EMAIL QUEUE WORKER] Running initial process...');
        this.process().catch(err => {
            console.error('[EMAIL QUEUE WORKER] Initial process error:', err);
            console.error('[EMAIL QUEUE WORKER] Stack:', err.stack);
        });

        // Then process every 60 seconds
        this.intervalId = setInterval(() => {
            this.process().catch(err => {
                console.error('[EMAIL QUEUE WORKER] Process error:', err);
                console.error('[EMAIL QUEUE WORKER] Stack:', err.stack);
            });
        }, this.processInterval);

        console.log('[EMAIL QUEUE WORKER] Started successfully!');
    }

    /**
     * Stop the worker
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[EMAIL QUEUE WORKER] Stopped');
        }
    }

    /**
     * Process pending email jobs
     */
    async process() {
        // Prevent concurrent processing
        if (this.isProcessing) {
            console.log('[EMAIL QUEUE WORKER] Already processing, skipping...');
            return;
        }

        this.isProcessing = true;
        console.log('[EMAIL QUEUE WORKER] Starting to process email queue...');

        try {
            // Get pending jobs
            console.log('[EMAIL QUEUE WORKER] Fetching pending jobs...');
            const snapshot = await emailQueue.getPendingBatch(10);
            console.log(`[EMAIL QUEUE WORKER] Found ${snapshot.size} pending jobs`);

            if (snapshot.empty) {
                // No jobs to process
                console.log('[EMAIL QUEUE WORKER] No jobs to process');
                return;
            }

            console.log(`[EMAIL QUEUE WORKER] Processing ${snapshot.size} jobs...`);

            // Process each job
            for (const doc of snapshot.docs) {
                await this.processJob(doc);
            }

            console.log(`[EMAIL QUEUE WORKER] Completed ${snapshot.size} jobs`);

        } catch (error) {
            console.error('[EMAIL QUEUE WORKER] Error in process:', error);
            console.error('[EMAIL QUEUE WORKER] Error stack:', error.stack);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a single email job
     * @param {DocumentSnapshot} doc - Firestore document
     */
    async processJob(doc) {
        const job = doc.data();
        const jobId = doc.id;

        try {
            console.log(`[EMAIL QUEUE WORKER] Sending ${job.type} email for event "${job.eventData.eventName}" (Job: ${jobId})`);

            // Send email
            await emailService.sendEventNotification(job.eventData, job.type);

            // Mark as sent
            await emailQueue.markSent(jobId);

        } catch (error) {
            console.error(`[EMAIL QUEUE WORKER] Failed to send email (Job: ${jobId}):`, error.message);

            // Retry logic
            await emailQueue.retry(jobId, error.message);
        }
    }

    /**
     * Get worker status
     */
    getStatus() {
        return {
            running: !!this.intervalId,
            processing: this.isProcessing,
            interval: this.processInterval
        };
    }

    /**
     * Run cleanup of old jobs (call this periodically, e.g., once a day)
     */
    async cleanup() {
        try {
            console.log('[EMAIL QUEUE WORKER] Running cleanup...');
            const count = await emailQueue.cleanup(7); // Delete jobs older than 7 days
            console.log(`[EMAIL QUEUE WORKER] Cleanup complete: ${count} jobs removed`);
        } catch (error) {
            console.error('[EMAIL QUEUE WORKER] Cleanup error:', error);
        }
    }
}

module.exports = new EmailQueueWorker();
