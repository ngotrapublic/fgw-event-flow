const { auditLogsCollection } = require('../config/firebase');

// Get all logs with optional filtering
exports.getLogs = async (req, res) => {
    try {
        const { actor, action, target, limit } = req.query;
        let query = auditLogsCollection.orderBy('timestamp', 'desc');

        if (actor) query = query.where('actor', '==', actor);
        if (action) query = query.where('action', '==', action);
        // Note: Firestore doesn't support partial string match (LIKE) natively easily without external service on basic fields, 
        // usually we do client side filtering for small datasets or use specific keywords.
        // For now, we fetch latest 100 and filter client side or basic exact match.

        const snapshot = await query.limit(parseInt(limit) || 100).get();
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
