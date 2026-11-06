const { admin, db } = require('../config/firebase');

/**
 * Optional authentication middleware:
 * - If no Authorization header is present: sets req.user = null, proceeds to next()
 * - If Bearer token is present: verifies with Firebase Auth
 *   - Success: sets req.user = decoded, fetches users/{uid} and sets req.user.profile
 *   - Failure/expired: returns 401 (never silently falls back to guest)
 */
const optionalAuth = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
        req.user = null;
        return next();
    }

    if (!header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token không hợp lệ' });
    }

    const token = header.slice(7).trim();
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;

        let profile = {
            role: decoded.role || 'user',
            email: decoded.email || '',
            name: decoded.name || ''
        };

        try {
            const userDoc = await db.collection('users').doc(decoded.uid).get();
            if (userDoc && userDoc.exists) {
                const userData = userDoc.data() || {};
                profile = {
                    role: userData.role || profile.role,
                    email: userData.email || profile.email,
                    name: userData.name || userData.displayName || profile.name,
                    department: userData.department || '',
                    phone: userData.phone || ''
                };
            }
        } catch (dbErr) {
            console.error('[OPTIONAL-AUTH] Error fetching user profile:', dbErr.message);
        }

        req.user.profile = profile;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }
};

module.exports = optionalAuth;

