const { db, borrowRequestsCollection } = require('../config/firebase');
const { OPEN_STATUSES, TRANSITIONS } = require('./borrow-constants');
const { reserveInTx, restockInTx } = require('./borrow-stock-service');
const { revokeSessionsForRequestIds } = require('./borrow-session-service');
const { revokeLinkCodesForRequestIds } = require('./borrow-link-service');
const { prepareReleaseQuotaInTx, applyReleaseQuotaInTx } = require('./borrow-quota-service');
const { logAction } = require('../controllers/auditLogController');
const HttpError = require('../utils/http-error');

/**
 * Single entry point for every status change.
 * Runs in a transaction: re-reads the request, checks TRANSITIONS, runs the
 * stock side-effect for that edge, writes status/isOpen/history/updatedAt.
 */
async function transition(requestId, toStatus, { actor = {}, note = '', patch = {}, expectFrom } = {}) {
    let fromStatus = null;

    const updated = await db.runTransaction(async (tx) => {
        const docRef = borrowRequestsCollection.doc(requestId);
        const snap = await tx.get(docRef);

        if (!snap.exists) {
            throw new HttpError(404, 'Phiếu mượn không tồn tại');
        }

        const current = snap.data();
        fromStatus = current.status;

        // If expectFrom is specified, verify current status matches
        if (expectFrom !== undefined) {
            const allowedExpect = Array.isArray(expectFrom) ? expectFrom : [expectFrom];
            if (!allowedExpect.includes(fromStatus)) {
                throw new HttpError(409, 'Phiếu đã được xử lý');
            }
        }

        // Check if transition edge is allowed
        const allowedTargets = TRANSITIONS[fromStatus] || [];
        if (!allowedTargets.includes(toStatus)) {
            throw new HttpError(409, `Không thể chuyển trạng thái từ "${fromStatus}" sang "${toStatus}"`);
        }

        const now = new Date().toISOString();
        const isOpen = OPEN_STATUSES.includes(toStatus);

        // Read quota docs BEFORE reserveInTx/restockInTx perform any writes
        const releaseQuotaPlans = !isOpen
            ? await prepareReleaseQuotaInTx(tx, current, requestId)
            : [];

        // Side effect per edge
        if (fromStatus === 'pending' && toStatus === 'approved') {
            await reserveInTx(tx, current.items || []);
        } else if (fromStatus === 'approved' && toStatus === 'cancelled') {
            await restockInTx(tx, current.items || [], (i) => i.qty);
        } else if (toStatus === 'returned' || toStatus === 'returned_with_issue') {
            const itemsToRestock = patch.items || current.items || [];
            await restockInTx(tx, itemsToRestock, (i) =>
                i.receivedQty !== undefined && i.receivedQty !== null ? i.receivedQty : i.qty
            );
        }
        const historyEntry = {
            status: toStatus,
            at: now,
            byUid: actor?.uid || null,
            byEmail: actor?.email || null,
            note: note || ''
        };
        const history = [...(current.history || []), historyEntry];

        const updateData = {
            ...patch,
            status: toStatus,
            isOpen,
            history,
            updatedAt: now
        };

        if (!isOpen) {
            updateData.verifyTokenHash = null;
            updateData.verifiedTokenHash = null;
            updateData.accessTokenHash = null;
            updateData.accessTokenHashes = [];
        }

        if (fromStatus === 'pending' && toStatus === 'approved' && !updateData.approvedAt) {
            updateData.approvedAt = now;
        }

        tx.update(docRef, updateData);
        if (!isOpen && releaseQuotaPlans.length > 0) {
            applyReleaseQuotaInTx(tx, releaseQuotaPlans, now);
        }
        return { id: requestId, ...current, ...updateData };
    });

    if (!OPEN_STATUSES.includes(toStatus)) {
        try {
            await Promise.all([
                revokeSessionsForRequestIds([requestId]),
                revokeLinkCodesForRequestIds([requestId])
            ]);
        } catch (revokeErr) {
            console.error('[BORROW] Session/link revocation error on close:', revokeErr.message);
        }
    }

    // Post-transaction audit logging (failure does not fail request)
    try {
        await logAction({
            actor: actor?.email || 'system',
            role: actor?.role || (actor?.uid ? 'user' : 'guest'),
            action: 'UPDATE',
            target: `BorrowRequest: ${requestId}`,
            details: { from: fromStatus, to: toStatus, ...(note && { note }) }
        });
    } catch (logErr) {
        console.error('Failed to write borrow transition audit log:', logErr);
    }

    return updated;
}

module.exports = {
    transition
};

