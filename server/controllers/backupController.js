/**
 * Backup Controller - Phase 4 Step 4D
 * Enhanced backup & recovery with confirmation, sensitive data filtering, and audit logging.
 */
const { db, admin } = require('../config/firebase');
const logger = require('../utils/logger');

// Collections to backup
const COLLECTIONS = ['events', 'departments', 'resources', 'audit_logs'];

// Fields to exclude from backup (sensitive data)
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'secret', 'privateKey'];

// Active restore tokens (for confirmation flow)
const restoreTokens = new Map();

/**
 * Sanitize document data by removing sensitive fields
 */
const sanitizeDocument = (data) => {
    const sanitized = { ...data };
    SENSITIVE_FIELDS.forEach(field => {
        if (sanitized[field]) sanitized[field] = '[REDACTED]';
    });
    return sanitized;
};

/**
 * GET /api/backup
 * Full System Backup - Exports all collections to JSON
 */
exports.fullSystemBackup = async (req, res, next) => {
    try {
        const backupData = {
            timestamp: new Date().toISOString(),
            version: '2.0',
            environment: process.env.NODE_ENV || 'development',
            collections: COLLECTIONS,
            data: {}
        };

        // Fetch all collections in parallel
        await Promise.all(COLLECTIONS.map(async (collectionName) => {
            const snapshot = await db.collection(collectionName).get();
            backupData.data[collectionName] = {};

            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    backupData.data[collectionName][doc.id] = sanitizeDocument(doc.data());
                });
            }
        }));

        logger.info('BACKUP_CREATED', {
            userId: req.user?.uid,
            collections: COLLECTIONS,
            totalDocs: Object.values(backupData.data).reduce((sum, col) => sum + Object.keys(col).length, 0)
        });

        // Send as downloadable file
        const filename = `backup_${process.env.NODE_ENV || 'dev'}_${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(backupData);

    } catch (error) {
        logger.error('BACKUP_FAILED', { error: error.message });
        next(error);
    }
};

/**
 * POST /api/backup/validate
 * Validates backup file and returns a confirmation token (Step 1 of restore)
 */
exports.validateBackup = async (req, res, next) => {
    try {
        const { data, timestamp, version } = req.body;

        if (!data || !timestamp) {
            return res.status(400).json({ error: 'Invalid backup file format' });
        }

        // Calculate stats
        const stats = {};
        let totalDocs = 0;
        for (const [collection, docs] of Object.entries(data)) {
            if (COLLECTIONS.includes(collection)) {
                stats[collection] = Object.keys(docs).length;
                totalDocs += Object.keys(docs).length;
            }
        }

        // Generate confirmation token (expires in 5 minutes)
        const token = `restore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        restoreTokens.set(token, {
            data,
            createdAt: Date.now(),
            expiresAt: Date.now() + 5 * 60 * 1000,
            userId: req.user?.uid
        });

        res.json({
            valid: true,
            backupDate: timestamp,
            version,
            stats,
            totalDocs,
            confirmationToken: token,
            message: 'Backup validated. Use the confirmationToken to proceed with restore.',
            expiresIn: '5 minutes'
        });

    } catch (error) {
        logger.error('BACKUP_VALIDATION_FAILED', { error: error.message });
        next(error);
    }
};

/**
 * POST /api/backup/restore
 * Restores data from backup (Step 2 - requires confirmation token)
 */
exports.restoreSystem = async (req, res, next) => {
    try {
        const { confirmationToken, mode = 'merge' } = req.body;

        // Validate confirmation token
        if (!confirmationToken) {
            return res.status(400).json({
                error: 'Missing confirmationToken',
                message: 'First call POST /api/backup/validate to get a confirmation token.'
            });
        }

        const pendingRestore = restoreTokens.get(confirmationToken);
        if (!pendingRestore) {
            return res.status(400).json({
                error: 'Invalid or expired token',
                message: 'Token not found or expired. Please validate backup again.'
            });
        }

        if (Date.now() > pendingRestore.expiresAt) {
            restoreTokens.delete(confirmationToken);
            return res.status(400).json({ error: 'Token expired. Please validate backup again.' });
        }

        const { data } = pendingRestore;
        let batch = db.batch();
        let operationCount = 0;
        let totalRestored = 0;
        const BATCH_LIMIT = 450;

        // Restore each collection
        for (const [collectionName, documents] of Object.entries(data)) {
            if (!COLLECTIONS.includes(collectionName)) continue;

            const collectionRef = db.collection(collectionName);

            for (const [docId, docData] of Object.entries(documents)) {
                const docRef = collectionRef.doc(docId);
                batch.set(docRef, docData, { merge: mode === 'merge' });
                operationCount++;
                totalRestored++;

                if (operationCount >= BATCH_LIMIT) {
                    await batch.commit();
                    operationCount = 0;
                    batch = db.batch();
                }
            }
        }

        // Commit remaining
        if (operationCount > 0) {
            await batch.commit();
        }

        // Cleanup token
        restoreTokens.delete(confirmationToken);

        logger.info('RESTORE_COMPLETED', {
            userId: req.user?.uid,
            mode,
            totalRestored
        });

        res.json({
            message: 'System restored successfully',
            mode,
            totalRestored
        });

    } catch (error) {
        logger.error('RESTORE_FAILED', { error: error.message });
        next(error);
    }
};
