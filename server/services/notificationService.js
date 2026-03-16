const { db, admin } = require('../config/firebase');

class NotificationService {
    constructor() {
        this.collection = db.collection('notifications');
    }

    /**
     * Create a notification for a user (or multiple users)
     * @param {Object} params
     * @param {string|string[]} params.recipients - User ID(s) or Email(s) to receive notification
     * @param {string} params.type - 'info' | 'success' | 'warning' | 'error'
     * @param {string} params.title - Notification title
     * @param {string} params.message - Notification body
     * @param {Object} params.data - Metadata (e.g., { eventId: '123' })
     * @param {string} params.sender - Sender name or 'System'
     */
    async create({ recipients, type = 'info', title, message, data = {}, sender = 'System' }) {
        if (!recipients) return;

        const recipientList = Array.isArray(recipients) ? recipients : [recipients];
        const batch = db.batch(); // Use batch for atomic writes

        // If recipients are emails, we might need to map them to UIDs if we only want UIDs. 
        // For simplicity, let's assume we store notifications keyed by whatever identifier the client uses to subscribe.
        // The implementation plan said "filtering by userId". So we need UIDs.
        // However, in many parts of this app (legacy), we deal with emails.
        // Let's resolve Emails to UIDs if possible, OR store 'email' as a queryable field.
        // Better: Store `userId` field. If we only have email, we look up the user.

        // Strategy: We will try to resolve Email -> UID. If not found, we skip or store with email (if supported).
        // To keep it robust, let's query the Users collection for these emails first.

        // Optimization: For now, let's assume the caller passes what they have. 
        // Ideally the Frontend listens to `notifications` where `userId == auth.uid`.

        // Let's do a quick lookup helper
        const resolvedUids = await this._resolveToUids(recipientList);
        console.log('[NOTIF SERVICE] Resolved UIDs:', resolvedUids);

        resolvedUids.forEach(uid => {
            const docRef = this.collection.doc();
            batch.set(docRef, {
                userId: uid,
                type,
                title,
                message,
                data,
                sender,
                isRead: false,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                serverTimestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        if (resolvedUids.length > 0) {
            await batch.commit();
            console.log(`[NOTIFICATION] Sent "${title}" to ${resolvedUids.length} users.`);
        }
    }

    /**
     * Get all admin user IDs
     * @returns {Promise<string[]>} Array of admin UIDs
     */
    async getAdminUids() {
        try {
            const snapshot = await db.collection('users')
                .where('role', '==', 'admin').get();
            const adminUids = snapshot.docs.map(doc => doc.id);
            console.log('[NOTIF SERVICE] Found', adminUids.length, 'admins');
            return adminUids;
        } catch (error) {
            console.error('[NOTIF SERVICE] Error getting admins:', error);
            return [];
        }
    }

    /**
     * Helper to resolve emails/mix to UIDs
     * @param {string[]} list 
     */
    async _resolveToUids(list) {
        const uids = new Set();
        const emailsToLookup = [];

        list.forEach(item => {
            if (this._isEmail(item)) {
                emailsToLookup.push(item);
            } else {
                // Assume it's a UID
                uids.add(item);
            }
        });

        if (emailsToLookup.length > 0) {
            // Use 'in' query for batch lookup (max 10 per query per Firestore limit)
            if (emailsToLookup.length <= 10) {
                const snapshot = await db.collection('users')
                    .where('email', 'in', emailsToLookup).get();
                snapshot.docs.forEach(doc => uids.add(doc.id));
            } else {
                // Split into chunks of 10 for larger lists
                for (let i = 0; i < emailsToLookup.length; i += 10) {
                    const chunk = emailsToLookup.slice(i, i + 10);
                    const snapshot = await db.collection('users')
                        .where('email', 'in', chunk).get();
                    snapshot.docs.forEach(doc => uids.add(doc.id));
                }
            }
        }

        return Array.from(uids);
    }

    _isEmail(str) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    }
}

module.exports = new NotificationService();
