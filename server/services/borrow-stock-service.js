const { resourcesCollection } = require('../config/firebase');
const HttpError = require('../utils/http-error');

/**
 * Merge multiple items with same resourceId
 */
function mergeItems(items, pick = (i) => i.qty) {
    const merged = new Map();
    for (const item of items || []) {
        if (!item || !item.resourceId) continue;
        const q = Number(pick(item)) || 0;
        const existing = merged.get(item.resourceId);
        if (existing) {
            existing.qty += q;
        } else {
            merged.set(item.resourceId, {
                resourceId: item.resourceId,
                label: item.label || item.resourceId,
                qty: q
            });
        }
    }
    return Array.from(merged.values());
}

/**
 * Reserve items within a Firestore transaction.
 * Reads every resource first (Firestore requirement),
 * then throws 409 listing every shortage, or decrements availableQty.
 */
async function reserveInTx(tx, items) {
    const merged = mergeItems(items, (i) => i.qty);
    if (merged.length === 0) return;

    // 1. All reads first
    const reads = await Promise.all(
        merged.map(async (m) => {
            const ref = resourcesCollection.doc(m.resourceId);
            const doc = await tx.get(ref);
            let available = 0;
            let label = m.label;
            if (doc.exists) {
                const data = doc.data() || {};
                available = data.availableQty !== undefined ? data.availableQty : (data.quantity || 0);
                if (data.label) label = data.label;
            }
            return { m, ref, doc, available, label };
        })
    );

    // 2. Check stock
    const shortages = [];
    for (const { m, available, label } of reads) {
        if (available < m.qty) {
            shortages.push({
                resourceId: m.resourceId,
                label,
                requested: m.qty,
                available
            });
        }
    }

    if (shortages.length > 0) {
        throw new HttpError(409, 'Không đủ thiết bị trong kho', { shortages });
    }

    // 3. All writes (write absolute calculated availableQty to avoid negative values on legacy docs)
    for (const { m, ref, available } of reads) {
        if (m.qty > 0) {
            tx.update(ref, {
                availableQty: available - m.qty
            });
        }
    }
}

/**
 * Adds back `pick(item)` units per resource; ignores resources that were deleted.
 * Reads first, then writes.
 */
async function restockInTx(tx, items, pick = (i) => i.qty) {
    const merged = mergeItems(items, pick);
    if (merged.length === 0) return;

    // 1. All reads first
    const reads = await Promise.all(
        merged.map(async (m) => {
            const ref = resourcesCollection.doc(m.resourceId);
            const doc = await tx.get(ref);
            let currentAvail = 0;
            if (doc.exists) {
                const data = doc.data() || {};
                currentAvail = data.availableQty !== undefined ? data.availableQty : (data.quantity || 0);
            }
            return { m, ref, doc, currentAvail };
        })
    );

    // 2. All writes for existing resources
    for (const { m, ref, doc, currentAvail } of reads) {
        if (doc.exists && m.qty > 0) {
            tx.update(ref, {
                availableQty: currentAvail + m.qty
            });
        }
    }
}

module.exports = {
    reserveInTx,
    restockInTx,
    mergeItems
};
