const { auditLogsCollection } = require('../config/firebase');

// Get all logs with optional filtering
exports.getLogs = async (req, res) => {
    try {
        const { actor, action, target, limit } = req.query;
        let query = auditLogsCollection.orderBy('timestamp', 'desc');

        // Apply filters if provided (Note: strictly checking legacy fields for now)
        if (actor) query = query.where('actor', '==', actor);
        if (action) query = query.where('action', '==', action);

        // Fetch logs
        const snapshot = await query.limit(parseInt(limit) || 100).get();

        // Normalize Data (Handle both Legacy and New Schema)
        const logs = snapshot.docs.map(doc => {
            const data = doc.data();

            // Standardizing to the Legacy Format (which Frontend likely expects)
            return {
                id: doc.id,
                // Actor: prefer explicit actor (email), fallback to userId
                actor: data.actor || data.userId || 'System',

                // Role: data.role (legacy), or infer/default
                role: data.role || (data.userId ? 'user' : 'system'),

                // Action: consistent in both
                action: data.action,

                // Target: prefer legacy target string, or construct from entity info
                target: data.target || (data.entityType && data.entityId ? `${data.entityType}: ${data.entityId}` : 'N/A'),

                // Details: prefer legacy details, or build from before/after (delta)
                details: data.details || {
                    before: data.before,
                    after: data.after,
                    deltaMode: true // flag to help UI parse if needed
                },

                // IP: Legacy only
                ip: data.ip || 'N/A',

                // Timestamp: consistent
                timestamp: data.timestamp,

                // Level: legacy has it, new schema can infer it
                level: data.level || (['DELETE', 'CRITICAL'].includes(data.action) ? 'danger' : ['UPDATE'].includes(data.action) ? 'warning' : 'info')
            };
        });

        res.status(200).json(logs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};

// Internal helper to log an action
exports.logAction = async (payload) => {
    try {
        const { actor, role, action, target, details, ip } = payload;
        await auditLogsCollection.add({
            actor: actor || 'System',
            role: role || 'Unknown',
            action: action || 'UNKNOWN',
            target: target || 'N/A',
            details: details || {},
            ip: ip || 'N/A',
            timestamp: new Date().toISOString(),
            level: ['DELETE', 'CRITICAL'].includes(action) ? 'danger' : ['UPDATE'].includes(action) ? 'warning' : 'info'
        });
        console.log(`[AUDIT] ${action} on ${target} by ${actor}`);
    } catch (error) {
        console.error('Failed to write audit log:', error);
    }
};
