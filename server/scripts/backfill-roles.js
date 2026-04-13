const { admin, db } = require('../config/firebase');

async function backfillRoles() {
    console.log('Starting role backfill...');
    
    try {
        const snapshot = await db.collection('users').get();
        let success = 0;
        let failed = 0;

        console.log(`Found ${snapshot.size} users to process.`);

        for (const doc of snapshot.docs) {
            const userData = doc.data();
            const { uid, role } = userData;

            if (!uid) {
                console.warn(`User document ${doc.id} mapped without a 'uid', skipping.`);
                failed++;
                continue;
            }

            try {
                // Set custom claims
                await admin.auth().setCustomUserClaims(uid, { role: role || 'user' });
                console.log(`[Success] Set claim { role: '${role || 'user'}' } for user ${uid}`);
                success++;
            } catch (err) {
                console.error(`[Error] Failed to set claim for user ${uid}:`, err.message);
                failed++;
            }
        }

        console.log('\n--- Backfill Report ---');
        console.log(`Total Users Processed: ${snapshot.size}`);
        console.log(`Successful: ${success}`);
        console.log(`Failed/Skipped: ${failed}`);
        console.log('-----------------------\n');

    } catch (error) {
        console.error('Fatal error during backfill:', error);
    } finally {
        process.exit();
    }
}

backfillRoles();
