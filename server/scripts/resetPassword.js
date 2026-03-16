/**
 * Quick script to reset admin password
 * Run: node scripts/resetPassword.js
 * 
 * Usage:
 *   - Interactive: node scripts/resetPassword.js
 *   - With env var: NEW_ADMIN_PASSWORD=xxx node scripts/resetPassword.js
 */
require('dotenv').config();

const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');
const readline = require('readline');

const serviceAccountConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

initializeApp({
    credential: cert(serviceAccountConfig)
});

// Password validation
function validatePassword(password) {
    if (password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number';
    }
    return null; // Valid
}

// Prompt for password input
function promptPassword() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Enter new password (min 8 chars, uppercase, lowercase, number): ', (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

const resetPassword = async () => {
    const adminEmail = 'admin@fgw-event.com';

    // Check for env var first, otherwise prompt
    let newPassword = process.env.NEW_ADMIN_PASSWORD;

    if (!newPassword) {
        console.log('🔐 Password Reset Script');
        console.log('========================\n');
        newPassword = await promptPassword();
    }

    // Validate password
    const validationError = validatePassword(newPassword);
    if (validationError) {
        console.error(`❌ ${validationError}`);
        process.exit(1);
    }

    try {
        const user = await admin.auth().getUserByEmail(adminEmail);
        await admin.auth().updateUser(user.uid, {
            password: newPassword
        });
        console.log('\n✅ Password reset successfully!');
        console.log(`👉 Email: ${adminEmail}`);
        console.log('👉 Password: [hidden for security]');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    process.exit(0);
};

resetPassword();
