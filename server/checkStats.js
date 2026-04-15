require('dotenv').config({ path: '.env.development' });
const admin = require('./config/firebase');
const db = admin.firestore();


async function checkStats() {
    const tzOffset = 7 * 60 * 60 * 1000;
    const now = new Date();
    const todayLocal = new Date(now.getTime() + tzOffset);
    const todayStr = todayLocal.toISOString().split('T')[0];
    
    const tomorrowLocal = new Date(todayLocal.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrowLocal.toISOString().split('T')[0];

    const nextWeekLocal = new Date(todayLocal.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekStr = nextWeekLocal.toISOString().split('T')[0];

    console.log(`Checking stats for todayStr=${todayStr}, tomorrowStr=${tomorrowStr}, nextWeekStr=${nextWeekStr}`);

    const [todaySnap, tomorrowSnap, weekSnap] = await Promise.all([
        db.collection('events')
            .where('isUniqueEvent', '==', true)
            .where('eventDate', '==', todayStr)
            .get(),
        db.collection('events')
            .where('isUniqueEvent', '==', true)
            .where('eventDate', '==', tomorrowStr)
            .get(),
        db.collection('events')
            .where('isUniqueEvent', '==', true)
            .where('eventDate', '>=', todayStr)
            .where('eventDate', '<=', nextWeekStr)
            .get()
    ]);

    console.log(`today: ${todaySnap.size}`);
    console.log(`tomorrow: ${tomorrowSnap.size}`);
    console.log(`week: ${weekSnap.size}`);
    
    console.log('\n--- ALL EVENTS WITH isUniqueEvent == true ---');
    const allUnique = await db.collection('events').where('isUniqueEvent', '==', true).get();
    allUnique.forEach(doc => {
        const d = doc.data();
        console.log(`${doc.id}: date=${d.eventDate}, group=${d.groupId}`);
    });
}

checkStats().catch(console.error);
