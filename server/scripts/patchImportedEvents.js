/**
 * One-time patch script: Add `isUniqueEvent` field to events that are missing it.
 * 
 * These events were created via the Excel Import flow which previously
 * did not set this field. The List view queries `isUniqueEvent == true`,
 * so missing this field makes imported events invisible in the List.
 *
 * Logic:
 *  - Events WITHOUT groupId (single-day) → isUniqueEvent = true
 *  - Events WITH groupId (series) → isUniqueEvent = true ONLY for isSeriesStart == true
 *  - Events WITH groupId but no isSeriesStart → pick the earliest eventDate in the group
 *
 * Usage: node scripts/patchImportedEvents.js
 */

require('dotenv').config();
const { db, eventsCollection } = require('../config/firebase');

async function patch() {
    console.log('🔍 Scanning for events missing isUniqueEvent field...\n');

    // Firestore doesn't support "where field does not exist" directly,
    // so we fetch all events and filter in-memory.
    // For a collection of reasonable size (<10k), this is fine.
    const snapshot = await eventsCollection.get();
    
    const needsPatch = [];
    const allDocs = [];
    
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        allDocs.push({ id: doc.id, ...data });
        
        if (data.isUniqueEvent === undefined || data.isUniqueEvent === null) {
            needsPatch.push({ id: doc.id, ...data });
        }
    });

    console.log(`📊 Total events in collection: ${allDocs.length}`);
    console.log(`🔧 Events missing isUniqueEvent: ${needsPatch.length}\n`);

    if (needsPatch.length === 0) {
        console.log('✅ All events already have isUniqueEvent. Nothing to patch!');
        process.exit(0);
    }

    // Group series events by groupId to determine which is the "first"
    const seriesGroups = {};
    needsPatch.forEach(event => {
        if (event.groupId) {
            if (!seriesGroups[event.groupId]) {
                seriesGroups[event.groupId] = [];
            }
            seriesGroups[event.groupId].push(event);
        }
    });

    // Sort each group by eventDate to find the earliest
    Object.values(seriesGroups).forEach(group => {
        group.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    });

    // Build batch updates
    let batch = db.batch();
    let batchCount = 0;
    let patchedSingle = 0;
    let patchedSeriesFirst = 0;
    let patchedSeriesOther = 0;

    for (const event of needsPatch) {
        let isUnique;

        if (!event.groupId) {
            // Single-day event → always unique
            isUnique = true;
            patchedSingle++;
        } else {
            // Series event → check if it's the first in its group
            if (event.isSeriesStart === true) {
                isUnique = true;
                patchedSeriesFirst++;
            } else {
                // Check if it's the earliest date in its group (fallback for missing isSeriesStart)
                const group = seriesGroups[event.groupId];
                const isEarliest = group[0].id === event.id;
                isUnique = isEarliest;
                if (isEarliest) patchedSeriesFirst++;
                else patchedSeriesOther++;
            }
        }

        batch.update(eventsCollection.doc(event.id), { isUniqueEvent: isUnique });
        batchCount++;

        // Firestore batch limit is 500
        if (batchCount >= 499) {
            await batch.commit();
            console.log(`  ⏳ Committed batch of ${batchCount} updates...`);
            batch = db.batch();
            batchCount = 0;
        }
    }

    // Commit remaining
    if (batchCount > 0) {
        await batch.commit();
    }

    console.log('\n✅ Patch complete!');
    console.log(`   Single events patched (isUniqueEvent=true): ${patchedSingle}`);
    console.log(`   Series first-day patched (isUniqueEvent=true): ${patchedSeriesFirst}`);
    console.log(`   Series other-days patched (isUniqueEvent=false): ${patchedSeriesOther}`);
    console.log(`   Total patched: ${needsPatch.length}`);

    // Also re-sync the global metadata counter
    try {
        const uniqueCount = allDocs.filter(e => {
            if (e.isUniqueEvent !== undefined) return e.isUniqueEvent === true;
            // For the ones we just patched, recalculate
            if (!e.groupId) return true;
            if (e.isSeriesStart) return true;
            const group = seriesGroups[e.groupId];
            return group && group[0].id === e.id;
        }).length;

        await db.collection('metadata').doc('stats').set(
            { totalUniqueEvents: uniqueCount },
            { merge: true }
        );
        console.log(`\n📊 Global counter re-synced: totalUniqueEvents = ${uniqueCount}`);
    } catch (err) {
        console.error('⚠️  Failed to re-sync counter:', err.message);
    }

    process.exit(0);
}

patch().catch(err => {
    console.error('❌ Patch failed:', err);
    process.exit(1);
});
