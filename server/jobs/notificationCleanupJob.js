const { db } = require('../config/firebase');

/**
 * Notification Cleanup Job - Deletes expired notifications
 * Runs daily to clean up notifications older than 30 days
 */
class NotificationCleanupJob {
    constructor() {
        this.collection = db.collection('notifications');
        this.intervalId = null;
    }

    /**
     * Start cleanup job (runs daily)
     */
    start() {
        if (this.intervalId) {
            console.log('[NOTIF CLEANUP] Already running');
            return;
        }

        console.log('[NOTIF CLEANUP] Starting... (interval: 24h)');

        // Run immediately on start
        this.cleanup().catch(err => {
            console.error('[NOTIF CLEANUP] Initial cleanup error:', err);
        });

        // Then run every 24 hours
        this.intervalId = setInterval(() => {
            this.cleanup().catch(err => {
                console.error('[NOTIF CLEANUP] Cleanup error:', err);
            });
        }, 24 * 60 * 60 * 1000); // 24 hours
    }

    /**
     * Stop cleanup job
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[NOTIF CLEANUP] Stopped');
        }
    }

    /**
     * Delete expired notifications
     * @returns {Promise<number>} Number of deleted documents
     */
    async cleanup() {
        try {
            const now = new Date().toISOString();
            const snapshot = await this.collection
                .where('expiresAt', '<', now)
                .limit(100)
                .get();

            if (snapshot.empty) {
                console.log('[NOTIF CLEANUP] No expired notifications');
                return 0;
            }

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`[NOTIF CLEANUP] Deleted ${snapshot.size} expired notifications`);

            return snapshot.size;
        } catch (error) {
            console.error('[NOTIF CLEANUP] Error during cleanup:', error);
            return 0;
        }
    }
}

module.exports = new NotificationCleanupJob();
