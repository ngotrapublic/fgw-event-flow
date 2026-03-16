const { admin, db } = require('../config/firebase');

// Verify Firebase ID Token
const verifyToken = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = header.split(' ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // basic info: uid, email, etc.
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
};

// Check if user has specific role(s)
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const { uid } = req.user;

            // Check Firestore for authoritative role
            const userDoc = await db.collection('users').doc(uid).get();

            if (!userDoc.exists) {
                return res.status(403).json({ error: 'Forbidden: User profile not found' });
            }

            const userData = userDoc.data();
            const userRole = userData.role || 'user';

            // Ensure allowedRoles is an array
            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

            if (roles.includes(userRole)) {
                req.user.role = userRole; // Attach role to request for convenience
                next();
            } else {
                return res.status(403).json({ error: `Forbidden: Requires one of roles: ${roles.join(', ')}` });
            }
        } catch (error) {
            console.error('Error checking role:', error);
            return res.status(500).json({ error: 'Internal Server Error during authorization' });
        }
    };
};

module.exports = {
    verifyToken,
    requireRole
};
