/**
 * Audit Service - Phase 4 Step 4B
 * Enhanced audit trail with delta tracking for event operations.
 * Non-blocking writes, no sensitive data logging.
 */
const { auditLogsCollection } = require('../config/firebase');
const logger = require('../utils/logger');

// Fields to exclude from audit (sensitive data)
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'secret'];

/**
 * Calculate delta between two objects (only changed fields)
 * @param {Object} before - Original object
 * @param {Object} after - Updated object
 * @returns {{ before: Object, after: Object }} - Only the changed fields
 */
const calculateDelta = (before, after) => {
    const deltaBefore = {};
    const deltaAfter = {};

    const allKeys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {})
    ]);

    allKeys.forEach(key => {
        // Skip sensitive fields
        if (SENSITIVE_FIELDS.includes(key)) return;
        // Skip internal fields
        if (key.startsWith('_')) return;

        const beforeVal = before?.[key];
        const afterVal = after?.[key];

        // Compare stringified to handle nested objects/arrays
        if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
            if (beforeVal !== undefined) deltaBefore[key] = beforeVal;
            if (afterVal !== undefined) deltaAfter[key] = afterVal;
        }
    });

    return { before: deltaBefore, after: deltaAfter };
};

/**
 * Log an audit event (non-blocking)
 * @param {Object} params
 * @param {'CREATE' | 'UPDATE' | 'DELETE'} params.action - The action performed
 * @param {'Event'} params.entityType - Type of entity
 * @param {string} params.entityId - ID of the entity
 * @param {string} params.userId - ID of the user performing the action
 * @param {Object} [params.before] - State before change (for UPDATE/DELETE)
 * @param {Object} [params.after] - State after change (for CREATE/UPDATE)
 */
const logAudit = async ({ action, entityType, entityId, userId, before, after }) => {
    // Fire and forget - don't await in the main request flow
    setImmediate(async () => {
        try {
            // For UPDATE: only log if there are actual changes
            if (action === 'UPDATE') {
                const delta = calculateDelta(before, after);

                // No changes detected - skip audit
                if (Object.keys(delta.before).length === 0 && Object.keys(delta.after).length === 0) {
                    logger.info('AUDIT_SKIPPED', { reason: 'No changes detected', entityId, userId });
                    return;
                }

                await auditLogsCollection.add({
                    action,
                    entityType,
                    entityId,
                    userId: userId || 'System',
                    timestamp: new Date().toISOString(),
                    before: delta.before,
                    after: delta.after
                });

                logger.info('AUDIT_LOGGED', { action, entityType, entityId, userId, changedFields: Object.keys(delta.after) });
                return;
            }

            // For CREATE: log only essential fields from 'after'
            if (action === 'CREATE') {
                const { eventName, eventDate, department, location } = after || {};
                await auditLogsCollection.add({
                    action,
                    entityType,
                    entityId,
                    userId: userId || 'System',
                    timestamp: new Date().toISOString(),
                    before: null,
                    after: { eventName, eventDate, department, location }
                });

                logger.info('AUDIT_LOGGED', { action, entityType, entityId, userId });
                return;
            }

            // For DELETE: log only essential fields from 'before'
            if (action === 'DELETE') {
                const { eventName, eventDate, department } = before || {};
                await auditLogsCollection.add({
                    action,
                    entityType,
                    entityId,
                    userId: userId || 'System',
                    timestamp: new Date().toISOString(),
                    before: { eventName, eventDate, department },
                    after: null
                });

                logger.info('AUDIT_LOGGED', { action, entityType, entityId, userId });
            }

        } catch (error) {
            // Log error but don't fail the main operation
            logger.error('AUDIT_WRITE_FAILED', { action, entityId, error: error.message });
        }
    });
};

module.exports = {
    logAudit,
    calculateDelta
};
