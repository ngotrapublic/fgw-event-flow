const { db, resourcesCollection } = require('../config/firebase');

async function backfillAvailableQty() {
    console.log('[BACKFILL] Checking resources collection for missing availableQty...');
    const snapshot = await resourcesCollection.get();
    console.log(`[BACKFILL] Found ${snapshot.size} resources in collection.`);

    let updatedCount = 0;
    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
        const data = doc.data() || {};
        if (data.availableQty === undefined) {
            const qty = Number(data.quantity) || 0;
            console.log(`- Updating resource "${doc.id}" (${data.label || 'No label'}): setting availableQty = ${qty}`);
            batch.update(doc.ref, { availableQty: qty });
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        await batch.commit();
        console.log(`[BACKFILL] Successfully updated ${updatedCount} resource document(s).`);
    } else {
        console.log('[BACKFILL] All resources already have availableQty. 0 updated.');
    }

    return updatedCount;
}

if (require.main === module) {
    backfillAvailableQty()
        .then((count) => {
            console.log(`[BACKFILL] Done. Updated: ${count}`);
            process.exit(0);
        })
        .catch((err) => {
            console.error('[BACKFILL] Error during backfill:', err);
            process.exit(1);
        });
}

module.exports = backfillAvailableQty;
