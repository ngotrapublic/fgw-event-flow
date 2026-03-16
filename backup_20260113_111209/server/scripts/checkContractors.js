/**
 * Check contractor data in events
 */
require('dotenv').config();
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
});

const db = admin.firestore();

const checkContractors = async () => {
    console.log('\n📋 CHECKING CONTRACTOR DATA IN EVENTS...\n');

    const snapshot = await db.collection('events').get();
    const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const today = new Date().toISOString().split('T')[0];
    console.log(`Today: ${today}\n`);

    let contractorCount = 0;

    events.forEach(event => {
        const hasContractor = event.contractorName || (event.contractorPackages && event.contractorPackages.length > 0);

        if (hasContractor) {
            contractorCount++;
            console.log(`✅ Event: ${event.eventName}`);
            console.log(`   Date: ${event.eventDate}`);
            console.log(`   contractorName: ${event.contractorName || 'N/A'}`);
            console.log(`   contractorPackages: ${event.contractorPackages ? event.contractorPackages.length + ' packages' : 'N/A'}`);
            if (event.contractorPackages) {
                event.contractorPackages.forEach((pkg, i) => {
                    console.log(`     Package ${i + 1}: ${pkg.contractorName || 'No name'}`);
                });
            }
            console.log(`   Is upcoming: ${event.eventDate >= today ? 'YES' : 'NO (past)'}`);
            console.log('');
        }
    });

    console.log('─'.repeat(60));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total events: ${events.length}`);
    console.log(`   Events with contractors: ${contractorCount}`);
    console.log(`   Events with contractors & upcoming: ${events.filter(e =>
        (e.contractorName || (e.contractorPackages && e.contractorPackages.length > 0)) &&
        e.eventDate >= today
    ).length}`);

    process.exit(0);
};

checkContractors().catch(console.error);
