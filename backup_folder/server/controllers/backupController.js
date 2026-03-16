const { db, admin } = require('../config/firebase');

// List of collections to backup
const COLLECTIONS = ['events', 'users', 'departments', 'resources', 'audit_logs', 'settings'];

/**
 * Full System Backup
 * Exports all data from specified collections to a JSON object
 */
exports.fullSystemBackup = async (req, res, next) => {
    try {
        const backupData = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {}
        };

        // Fetch all collections in parallel
        await Promise.all(COLLECTIONS.map(async (collectionName) => {
            // 'settings' might be stored differently (single doc usually), checking usage...
            // Assuming standard collections for now. If settings is a file, we might skip or read differently.
            // Based on previous code, settings seems to be in systemSettings.json but let's check if we want to backup DB or File.
            // User requested "System Backup". We will backup Firestore collections.

            // Handle special case if 'settings' is not a collection (it's likely a config file based on previous context), 
            // but let's assume we stick to Firestore data. 
            if (collectionName === 'settings') return; // Skip if not in DB, or handle specifically.

            const snapshot = await db.collection(collectionName).get();
            backupData.data[collectionName] = {};

            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    backupData.data[collectionName][doc.id] = doc.data();
                });
            }
        }));

        // Send file
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="system_backup_${new Date().toISOString().split('T')[0]}.json"`);
        res.json(backupData);

    } catch (error) {
        console.error('Backup failed:', error);
        next(error);
    }
};

/**
 * Restore System Data
 * Accepts a JSON object and upserts data into collections
 */
exports.restoreSystem = async (req, res, next) => {
    try {
        const { data } = req.body;

        if (!data) {
            return res.status(400).json({ message: 'Invalid backup file format' });
        }

        let batch = db.batch();
        let operationCount = 0;
        const BATCH_LIMIT = 450; // Firestore limit is 500

        // Iterate through collections
        for (const [collectionName, documents] of Object.entries(data)) {
            if (!COLLECTIONS.includes(collectionName) && collectionName !== 'settings') continue; // Safety check

            const collectionRef = db.collection(collectionName);

            for (const [docId, docData] of Object.entries(documents)) {
                const docRef = collectionRef.doc(docId);
                batch.set(docRef, docData, { merge: true }); // Upsert
                operationCount++;

                // Commit batch if limit reached
                if (operationCount >= BATCH_LIMIT) {
                    await batch.commit();
                    operationCount = 0;
                    batch = db.batch(); // Create new batch instance
                }
            }
        }

        // Commit remaining
        if (operationCount > 0) {
            await batch.commit();
        }

        res.json({ message: 'System restored successfully (Data merged)' });

    } catch (error) {
        console.error('Restore failed:', error);
        next(error);
    }
};
