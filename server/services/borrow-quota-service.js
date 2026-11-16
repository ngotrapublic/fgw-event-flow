const { db, borrowQuotasCollection, borrowRequestsCollection, borrowLinkCodesCollection } = require('../config/firebase');
const { OPEN_STATUSES, LIMITS } = require('./borrow-constants');
const { hmacKey } = require('./borrow-token-service');
const HttpError = require('../utils/http-error');

/**
 * Derive deterministic quota bucket descriptors for a borrow request.
 * Accounts track open requests by UID; guests track by BOTH normalized email and normalized phone HMAC.
 */
function getQuotaDescriptors({ borrowerType, uid, email, phone }) {
    if (borrowerType === 'account' || uid) {
        if (!uid) return [];
        const docId = `uid_${hmacKey(`uid:${uid}`)}`;
        return [
            {
                docId,
                ref: borrowQuotasCollection.doc(docId),
                field: 'borrower.uid',
                value: uid,
                max: LIMITS.MAX_OPEN_PER_USER
            }
        ];
    }

    const descriptors = [];
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';

    if (cleanEmail) {
        const emailDocId = `email_${hmacKey(`email:${cleanEmail}`)}`;
        descriptors.push({
            docId: emailDocId,
            ref: borrowQuotasCollection.doc(emailDocId),
            field: 'borrower.email',
            value: cleanEmail,
            max: LIMITS.MAX_OPEN_PER_GUEST
        });
    }

    if (cleanPhone) {
        const phoneDocId = `phone_${hmacKey(`phone:${cleanPhone}`)}`;
        descriptors.push({
            docId: phoneDocId,
            ref: borrowQuotasCollection.doc(phoneDocId),
            field: 'borrower.phone',
            value: cleanPhone,
            max: LIMITS.MAX_OPEN_PER_GUEST
        });
    }

    return descriptors;
}

/**
 * Read-only transaction phase: verifies open request counts against MAX_OPEN_PER_USER / MAX_OPEN_PER_GUEST.
 * Executes ALL Firestore reads before returning write plans so callers comply with Firestore read-before-write rules.
 */
async function prepareQuotaReservationInTx(tx, ownerInfo) {
    const descriptors = getQuotaDescriptors(ownerInfo);
    if (descriptors.length === 0) return [];

    // 1. Read quota documents
    const quotaSnaps = await Promise.all(descriptors.map((d) => tx.get(d.ref)));

    // 2. For any missing quota bucket (cold start or pre-seeded data), backfill from open borrow_requests
    const candidateLists = await Promise.all(
        descriptors.map(async (d, idx) => {
            const snap = quotaSnaps[idx];
            if (snap.exists && Array.isArray(snap.data()?.activeIds)) {
                return Array.from(new Set(snap.data().activeIds.filter(Boolean)));
            }
            const existingSnap = await tx.get(
                borrowRequestsCollection.where(d.field, '==', d.value).where('isOpen', '==', true)
            );
            return existingSnap.docs.map((doc) => doc.id);
        })
    );

    // 3. Re-verify live request docs when a bucket looks full (heals closed-out-of-band or legacy records)
    const idsToVerify = new Set();
    descriptors.forEach((d, idx) => {
        if (candidateLists[idx].length >= d.max) {
            candidateLists[idx].forEach((id) => idsToVerify.add(id));
        }
    });

    const liveStatusMap = new Map();
    if (idsToVerify.size > 0) {
        const verifyArr = Array.from(idsToVerify);
        const reqSnaps = await Promise.all(verifyArr.map((id) => tx.get(borrowRequestsCollection.doc(id))));
        verifyArr.forEach((id, idx) => {
            const snap = reqSnaps[idx];
            const data = snap.exists ? snap.data() || {} : null;
            const isOpen = Boolean(data && data.isOpen !== false && OPEN_STATUSES.includes(data.status));
            liveStatusMap.set(id, isOpen);
        });
    }

    const plans = [];
    for (let i = 0; i < descriptors.length; i++) {
        const d = descriptors[i];
        const rawIds = candidateLists[i];
        const liveIds = rawIds.filter((id) => (liveStatusMap.has(id) ? liveStatusMap.get(id) : true));
        if (liveIds.length >= d.max) {
            throw new HttpError(429, 'Bạn đang có quá nhiều phiếu chưa hoàn tất', {
                code: 'OPEN_QUOTA_EXCEEDED',
                limit: d.max
            });
        }
        plans.push({
            docId: d.docId,
            ref: d.ref,
            activeIds: liveIds
        });
    }

    return plans;
}

/**
 * Write phase for quota reservation inside the same transaction.
 */
function commitQuotaReservationInTx(tx, plans, requestId, nowIso = new Date().toISOString()) {
    for (const plan of plans || []) {
        const nextIds = Array.from(new Set([...plan.activeIds, requestId]));
        tx.set(plan.ref, {
            key: plan.docId,
            activeIds: nextIds,
            updatedAt: nowIso
        });
    }
}

/**
 * Read phase for releasing a closed/rolled-back request from quota docs.
 * Must be called BEFORE any writes in the enclosing transaction.
 */
async function prepareReleaseQuotaInTx(tx, reqData, requestId) {
    if (!reqData || !requestId) return [];
    const descriptors = getQuotaDescriptors({
        borrowerType: reqData.borrowerType || (reqData.borrower?.uid ? 'account' : 'guest'),
        uid: reqData.borrower?.uid,
        email: reqData.borrower?.email,
        phone: reqData.borrower?.phone
    });
    if (descriptors.length === 0) return [];

    const snaps = await Promise.all(descriptors.map((d) => tx.get(d.ref)));
    const releasePlans = [];

    snaps.forEach((snap, idx) => {
        if (!snap.exists) return;
        const curIds = Array.isArray(snap.data()?.activeIds) ? snap.data().activeIds : [];
        if (curIds.includes(requestId)) {
            releasePlans.push({
                ref: descriptors[idx].ref,
                nextIds: curIds.filter((id) => id !== requestId)
            });
        }
    });

    return releasePlans;
}

/**
 * Write phase for releasing request IDs from quota docs inside the same transaction.
 */
function applyReleaseQuotaInTx(tx, releasePlans, nowIso = new Date().toISOString()) {
    for (const plan of releasePlans || []) {
        tx.update(plan.ref, {
            activeIds: plan.nextIds,
            updatedAt: nowIso
        });
    }
}

/**
 * Compensating atomic rollback if guest email dispatch fails on creation.
 * Deletes request, cleans up unconsumed link code & idempotency record, and releases quota atomically.
 */
async function rollbackCreatedRequest(docRef, reqData, { linkCodeHash = null, idemRef = null } = {}) {
    await db.runTransaction(async (tx) => {
        const linkRef = linkCodeHash ? borrowLinkCodesCollection.doc(linkCodeHash) : null;
        const [snap, linkSnap, idemSnap, releasePlans] = await Promise.all([
            tx.get(docRef),
            linkRef ? tx.get(linkRef) : Promise.resolve(null),
            idemRef ? tx.get(idemRef) : Promise.resolve(null),
            prepareReleaseQuotaInTx(tx, reqData, docRef.id)
        ]);

        if (snap.exists) {
            tx.delete(docRef);
        }
        if (linkSnap?.exists && !linkSnap.data()?.consumedAt) {
            tx.delete(linkRef);
        }
        if (idemSnap?.exists && idemSnap.data()?.requestId === docRef.id) {
            tx.delete(idemRef);
        }
        applyReleaseQuotaInTx(tx, releasePlans);
    });
}

module.exports = {
    getQuotaDescriptors,
    prepareQuotaReservationInTx,
    commitQuotaReservationInTx,
    prepareReleaseQuotaInTx,
    applyReleaseQuotaInTx,
    rollbackCreatedRequest
};
