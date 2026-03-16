const { eventsCollection } = require('../config/firebase');
const { logAction } = require('../controllers/auditLogController');
const { getSettingsInternal } = require('../controllers/settingsController');

// Run cleanup task
const runCleanup = async () => {
    console.log('[RETENTION] Starting cleanup task...');

    try {
        const settings = getSettingsInternal();
        const retentionPeriod = settings.retention?.period; // In months

        if (!retentionPeriod || retentionPeriod <= 0) {
            console.log('[RETENTION] No valid retention period configured. Skipping.');
            return;
        }

        console.log(`[RETENTION] Policy set to ${retentionPeriod} months.`);

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(retentionPeriod));
        const cutoffISO = cutoffDate.toISOString().split('T')[0]; // Format YYYY-MM-DD

        console.log(`[RETENTION] Deleting events before: ${cutoffISO}`);

        // Query events older than cutoff
        // NOTE: eventDate is stored as string 'YYYY-MM-DD' so string comparison works
        const snapshot = await eventsCollection.where('eventDate', '<', cutoffISO).get();

        if (snapshot.empty) {
            console.log('[RETENTION] No events found to clean up.');
            return;
        }

        console.log(`[RETENTION] Found ${snapshot.size} events to delete.`);

        // Batch delete
        const batchSize = 100; // Firestore batch limit is 500, keep it safe
        let batch = eventsCollection.firestore.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
            count++;

            // Commit batch if size reached
            if (count % batchSize === 0) {
                await batch.commit();
                batch = eventsCollection.firestore.batch();
            }
        }

        // Commit remaining
        if (count % batchSize !== 0) {
            await batch.commit();
        }

        console.log(`[RETENTION] Successfully deleted ${count} events.`);

        // Log system action
        await logAction({
            actor: 'System',
            role: 'system',
            action: 'DELETE',
            target: 'Data Retention Cleanup',
            details: {
                deletedCount: count,
                retentionPeriod: retentionPeriod,
                cutoffDate: cutoffISO
            },
            ip: '127.0.0.1'
        });

    } catch (error) {
        console.error('[RETENTION] Error running cleanup:', error);
    }
};

// Start 24h scheduler
const startScheduler = () => {
    console.log('[RETENTION] Scheduler started (Runs every 24h).');

    // Run immediately on start (optional, maybe check last run time to avoid restart spam)
    // For now, let's just schedule it.

    // Interval: 24 hours
    const INTERVAL = 24 * 60 * 60 * 1000;

    setInterval(() => {
        runCleanup();
    }, INTERVAL);

    // Run once after 1 minute of server start to clear potential backlog
    setTimeout(() => {
        runCleanup();
    }, 60000);
};

module.exports = {
    startScheduler,
    runCleanup
};
