const admin = require('firebase-admin');
// const serviceAccount = require('./config/serviceAccountKey.json'); // REMOVED

// Since we are running this one-off, let's just use the existing firebase.js config if possible, 
// OR just directly initialize since we have the env vars in server/.env (but this script runs standalone)
// Easier to use the existing server/config/firebase.js if we can require it.

// Actually, easiest way is to use the server's firebase instance.
// But we can't easily "run" a script that imports from the app structure without complex setup if it's not a module.
// Let's create a standalone script in `server/scripts/seedAdmin.js` that loads dotenv.

require('dotenv').config(); // Load from .env in current directory (server/)

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccountConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!serviceAccountConfig.privateKey) {
    console.error('❌ Missing FIREBASE_PRIVATE_KEY in .env');
    process.exit(1);
}

console.log('--- DEBUG CONFIG ---');
console.log('Project ID:', serviceAccountConfig.projectId);
console.log('Client Email:', serviceAccountConfig.clientEmail);
console.log('Private Key Length:', serviceAccountConfig.privateKey?.length);
console.log('--------------------');

initializeApp({
    credential: cert(serviceAccountConfig)
});

const db = getFirestore();

const seedAdmin = async () => {
    const adminEmail = 'admin@fgw-event.com'; // Default Admin
    const adminUid = 'ADMIN_UID_PLACEHOLDER'; // Ideally we should create the Auth user too, but Admin SDK can do that.

    try {
        console.log(`Creating Admin user: ${adminEmail}...`);

        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(adminEmail);
            console.log('User already exists in Auth:', userRecord.uid);
        } catch (e) {
            console.log('Creating new Auth user...');
            userRecord = await admin.auth().createUser({
                email: adminEmail,
                password: 'password123', // Default Password
                displayName: 'System Admin',
                emailVerified: true,
            });
            console.log('Created Auth user:', userRecord.uid);
        }

        // Now create/update Firestore User document
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: adminEmail,
            name: 'System Admin',
            role: 'admin',
            createdAt: new Date().toISOString()
        }, { merge: true });

        console.log('✅ Admin user seeded in Firestore successfully!');
        console.log(`👉 Email: ${adminEmail}`);
        console.log(`👉 Password: password123`);

    } catch (error) {
        console.error('❌ Error seeding admin:', error);
    }
};

seedAdmin();
