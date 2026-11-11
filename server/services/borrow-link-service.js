const { db, borrowLinkCodesCollection, borrowRequestsCollection } = require('../config/firebase');
const { LIMITS, OPEN_STATUSES } = require('./borrow-constants');
const { newToken, hash } = require('./borrow-token-service');
const HttpError = require('../utils/http-error');

/**
 * Create a single-use opaque link code for managing an open borrow request.
 * Raw code goes into URL fragment (#code=...) and ONLY its SHA-256 hash is persisted.
 */
async function createLinkCode(requestId, { ttlMs = LIMITS.LINK_CODE_TTL_MS, purpose = 'manage' } = {}) {
    if (!requestId || typeof requestId !== 'string') {
        throw new Error('requestId is required for createLinkCode');
    }

    const code = newToken();
    const now = Date.now();

    await borrowLinkCodesCollection.doc(hash(code)).set({
        requestId,
        purpose,
        createdAt: now,
        expiresAt: now + ttlMs,
        consumedAt: null,
        revokedAt: null
    });

    return code;
}

/**
 * Atomically validate and consume a single-use management link code.
 * Rejects with 410 if missing, already consumed, revoked, expired, or request closed.
 */
async function exchangeLinkCode(rawCode) {
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

        tx.update(codeRef, { consumedAt: now });

        return {
            requestId: link.requestId,
            request: { id: reqSnap.id, ...reqData }
        };
    });
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
    createLinkCode,
    exchangeLinkCode,
    revokeLinkCodesForRequestIds
};
