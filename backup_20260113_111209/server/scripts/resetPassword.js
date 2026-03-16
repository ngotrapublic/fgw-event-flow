/**
 * Quick script to reset admin password
 * Run: node scripts/resetPassword.js
 */
require('dotenv').config();

const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');

const serviceAccountConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

initializeApp({
    credential: cert(serviceAccountConfig)
});

const resetPassword = async () => {
    const adminEmail = 'admin@fgw-event.com';
    const newPassword = 'Admin@it2026';

    try {
        const user = await admin.auth().getUserByEmail(adminEmail);
        await admin.auth().updateUser(user.uid, {
            password: newPassword
        });
        console.log('✅ Password reset successfully!');
        console.log(`👉 Email: ${adminEmail}`);
        console.log(`👉 New Password: ${newPassword}`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    process.exit(0);
};

resetPassword();
