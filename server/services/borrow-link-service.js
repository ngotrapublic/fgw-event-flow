const { db, borrowLinkCodesCollection, borrowRequestsCollection } = require('../config/firebase');
const { LIMITS, OPEN_STATUSES } = require('./borrow-constants');
const { newToken, hash } = require('./borrow-token-service');
const HttpError = require('../utils/http-error');

/**
 * Prepare a single-use opaque link code and its hashed persistence record without writing yet.
 * Safe to write atomically inside a caller's Firestore transaction via commitLinkCodeInTx().
 */
function prepareLinkCodeData(
    requestId,
    { ttlMs = LIMITS.LINK_CODE_TTL_MS, purpose = 'manage', nowMs = Date.now() } = {}
) {
    if (!requestId || typeof requestId !== 'string') {
        throw new Error('requestId is required for prepareLinkCodeData');
    }

    const code = newToken();
    const codeHash = hash(code);

    return {
        code,
        codeHash,
        ref: borrowLinkCodesCollection.doc(codeHash),
        data: {
            requestId,
            purpose,
            createdAt: nowMs,
            expiresAt: nowMs + ttlMs,
            consumedAt: null,
            revokedAt: null
        }
    };
}

/**
 * Persist a prepared link code record within an open Firestore transaction.
 */
function commitLinkCodeInTx(tx, linkPlan) {
    if (!tx || !linkPlan?.ref || !linkPlan?.data) {
        throw new Error('Valid transaction and linkPlan are required for commitLinkCodeInTx');
    }
    tx.set(linkPlan.ref, linkPlan.data);
}

/**
 * Create a single-use opaque link code for managing an open borrow request.
 * Raw code goes into URL fragment (#code=...) and ONLY its SHA-256 hash is persisted.
 */
async function createLinkCode(requestId, options = {}) {
    const plan = prepareLinkCodeData(requestId, options);
    await plan.ref.set(plan.data);
    return plan.code;
}

/**
 * Atomically validate and consume a single-use management link code.
 * Checks account ownership INSIDE the transaction BEFORE setting consumedAt so a different
 * logged-in user cannot burn the real owner's one-time link.
 */
async function exchangeLinkCode(rawCode, { viewerUid = null } = {}) {
    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
        throw new HttpError(400, 'Thiếu mã truy cập liên kết');
    }

    const codeHash = hash(rawCode.trim());

    return db.runTransaction(async (tx) => {
        const codeRef = borrowLinkCodesCollection.doc(codeHash);
        const snap = await tx.get(codeRef);
        const now = Date.now();

        if (!snap.exists) {
            throw new HttpError(410, 'Liên kết đã hết hạn hoặc đã được sử dụng');
        }

        const link = snap.data() || {};
        if (link.consumedAt || link.revokedAt || !link.expiresAt || link.expiresAt <= now) {
            throw new HttpError(410, 'Liên kết đã hết hạn hoặc đã được sử dụng');
        }

        const reqRef = borrowRequestsCollection.doc(link.requestId);
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists) {
            throw new HttpError(410, 'Phiếu mượn không tồn tại hoặc đã bị xoá');
        }

        const reqData = reqSnap.data() || {};
        if (!OPEN_STATUSES.includes(reqData.status) || reqData.isOpen === false) {
            throw new HttpError(410, 'Phiếu mượn đã hoàn tất hoặc không còn mở');
        }

        // Prevent cross-account consumption before mutating consumedAt
        if (viewerUid && reqData.borrower?.uid && reqData.borrower.uid !== viewerUid) {
            throw new HttpError(403, 'Phiếu mượn thuộc về một tài khoản khác');
        }

        tx.update(codeRef, { consumedAt: now });

        return {
            requestId: link.requestId,
            request: { id: reqSnap.id, ...reqData }
        };
    });
}

/**
 * Read phase for revoking all unconsumed, unrevoked link codes of a request inside a Firestore transaction.
 * Must be executed BEFORE any writes in the enclosing transaction.
 */
async function prepareRevokeLinkCodesInTx(tx, requestId) {
    if (!tx || !requestId || typeof requestId !== 'string') {
        return [];
    }
    const snap = await tx.get(
        borrowLinkCodesCollection.where('requestId', '==', requestId)
    );
    return snap.docs.filter((doc) => {
        const data = doc.data() || {};
        return !data.consumedAt && !data.revokedAt;
    });
}

/**
 * Write phase for revoking prepared link code documents inside the same Firestore transaction.
 */
function commitRevokeLinkCodesInTx(tx, docsToRevoke = [], nowMs = Date.now()) {
    for (const doc of docsToRevoke || []) {
        tx.update(doc.ref, { revokedAt: nowMs });
    }
}

/**
 * Revoke all unconsumed link codes bound to the specified request IDs
 * (e.g. after OTP recovery or request closure).
 */
async function revokeLinkCodesForRequestIds(requestIds = []) {
    const ids = Array.from(new Set((requestIds || []).filter((id) => typeof id === 'string' && id)));
    if (ids.length === 0) return 0;

    const now = Date.now();
    let count = 0;

    for (const reqId of ids) {
        const snap = await borrowLinkCodesCollection.where('requestId', '==', reqId).get();
        for (const doc of snap.docs) {
            const data = doc.data() || {};
            if (!data.consumedAt && !data.revokedAt) {
                await doc.ref.update({ revokedAt: now });
                count += 1;
            }
        }
    }

    return count;
}

module.exports = {
    prepareLinkCodeData,
    commitLinkCodeInTx,
    createLinkCode,
    exchangeLinkCode,
    prepareRevokeLinkCodesInTx,
    commitRevokeLinkCodesInTx,
    revokeLinkCodesForRequestIds
};
