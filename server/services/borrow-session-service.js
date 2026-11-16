const { db, borrowSessionsCollection } = require('../config/firebase');
const { isHttpsRequest } = require('../config/borrow-security');
const { LIMITS } = require('./borrow-constants');
const { newToken, hash } = require('./borrow-token-service');
const { revokeLinkCodesForRequestIds } = require('./borrow-link-service');

const SESSION_COOKIE_HTTPS = '__Host-borrow';
const SESSION_COOKIE_HTTP = 'borrow_session';

function parseCookies(cookieHeader) {
    const out = {};
    if (!cookieHeader || typeof cookieHeader !== 'string') return out;
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
        const idx = pair.indexOf('=');
        if (idx <= 0) continue;
        const name = pair.slice(0, idx).trim();
        const rawVal = pair.slice(idx + 1).trim();
        if (!name) continue;
        try {
            out[name] = decodeURIComponent(rawVal);
        } catch {
            out[name] = rawVal;
        }
    }
    return out;
}

function getCookieName(req) {
    return isHttpsRequest(req) ? SESSION_COOKIE_HTTPS : SESSION_COOKIE_HTTP;
}

function extractSessionId(req) {
    if (!req) return null;
    const cookies = req.cookies || parseCookies(req.headers?.cookie);
    const cookieName = getCookieName(req);
    const val = cookies[cookieName];
    return typeof val === 'string' && val.trim() ? val.trim() : null;
}

function applySensitiveHeaders(res) {
    if (res && typeof res.set === 'function') {
        res.set({
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer'
        });
    }
}

function setSessionCookie(req, res, sessionId, ttlMs = LIMITS.SESSION_TTL_MS) {
    if (!res || typeof res.cookie !== 'function') return;
    const secure = isHttpsRequest(req);
    const name = secure ? SESSION_COOKIE_HTTPS : SESSION_COOKIE_HTTP;
    res.cookie(name, sessionId, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: ttlMs
    });
}

function clearSessionCookie(req, res) {
    if (!res || typeof res.clearCookie !== 'function') return;
    res.clearCookie(SESSION_COOKIE_HTTP, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
    });
    if (isHttpsRequest(req)) {
        res.clearCookie(SESSION_COOKIE_HTTPS, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/'
        });
    }
}

async function resolveSession(req) {
    const sessionId = extractSessionId(req);
    if (!sessionId) return null;

    const sessionHash = hash(sessionId);
    const snap = await borrowSessionsCollection.doc(sessionHash).get();
    if (!snap.exists) return null;

    const data = snap.data() || {};
    if (data.revokedAt || !data.expiresAt || data.expiresAt <= Date.now()) {
        return null;
    }

    return {
        sessionId,
        sessionHash,
        requestIds: Array.isArray(data.requestIds) ? data.requestIds : [],
        expiresAt: data.expiresAt,
        createdAt: data.createdAt
    };
}

/**
 * Grant session access to one or more borrow request IDs, updating an existing active session
 * or minting a fresh HttpOnly cookie session.
 */
async function grantRequestAccessToSession(req, res, requestIdsToAdd) {
    const toAdd = Array.from(
        new Set((Array.isArray(requestIdsToAdd) ? requestIdsToAdd : [requestIdsToAdd]).filter(Boolean))
    );
    if (toAdd.length === 0) return null;

    const existingSid = extractSessionId(req);
    const now = Date.now();
    const expiresAt = now + LIMITS.SESSION_TTL_MS;

    const result = await db.runTransaction(async (tx) => {
        if (existingSid) {
            const existingRef = borrowSessionsCollection.doc(hash(existingSid));
            const snap = await tx.get(existingRef);
            if (snap.exists) {
                const cur = snap.data() || {};
                if (!cur.revokedAt && cur.expiresAt && cur.expiresAt > now) {
                    const merged = Array.from(
                        new Set([...(Array.isArray(cur.requestIds) ? cur.requestIds : []), ...toAdd])
                    ).slice(-LIMITS.MAX_SESSION_REQUESTS);
                    tx.update(existingRef, {
                        requestIds: merged,
                        updatedAt: now,
                        expiresAt
                    });
                    return { sessionId: existingSid, sessionHash: snap.id, requestIds: merged };
                }
            }
        }

        const newSid = newToken();
        const newHash = hash(newSid);
        const newRef = borrowSessionsCollection.doc(newHash);
        const initialIds = toAdd.slice(-LIMITS.MAX_SESSION_REQUESTS);

        tx.set(newRef, {
            requestIds: initialIds,
            createdAt: now,
            updatedAt: now,
            expiresAt,
            revokedAt: null
        });

        return { sessionId: newSid, sessionHash: newHash, requestIds: initialIds };
    });

    setSessionCookie(req, res, result.sessionId, LIMITS.SESSION_TTL_MS);
    return result;
}

/**
 * Revoke sessions that reference any of the given request IDs.
 * If a session holds other unrelated requests, removes only these requestIds;
 * if no requestIds remain, sets revokedAt.
 */
async function revokeSessionsForRequestIds(requestIds = []) {
    const removeSet = new Set((requestIds || []).filter((id) => typeof id === 'string' && id));
    if (removeSet.size === 0) return 0;

    const candidateDocRefs = new Map();
    for (const reqId of removeSet) {
        const snap = await borrowSessionsCollection.where('requestIds', 'array-contains', reqId).get();
        snap.docs.forEach((d) => candidateDocRefs.set(d.id, d.ref));
    }

    const now = Date.now();
    let modified = 0;

    for (const [, ref] of candidateDocRefs) {
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) return;
            const cur = snap.data() || {};
            if (cur.revokedAt) return;
            const nextIds = (Array.isArray(cur.requestIds) ? cur.requestIds : []).filter(
                (id) => !removeSet.has(id)
            );
            if (nextIds.length === 0) {
                tx.update(ref, { requestIds: [], revokedAt: now, updatedAt: now });
            } else {
                tx.update(ref, { requestIds: nextIds, updatedAt: now });
            }
            modified += 1;
        });
    }

    return modified;
}

/**
 * Strip specific request IDs from a single session (e.g. closed or mismatched account docs).
 */
async function pruneSessionRequestIds(sessionHash, removeIds = []) {
    if (!sessionHash || !Array.isArray(removeIds) || removeIds.length === 0) return;
    const removeSet = new Set(removeIds);
    const ref = borrowSessionsCollection.doc(sessionHash);
    const now = Date.now();

    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const cur = snap.data() || {};
        if (cur.revokedAt) return;
        const nextIds = (Array.isArray(cur.requestIds) ? cur.requestIds : []).filter(
            (id) => !removeSet.has(id)
        );
        if (nextIds.length === 0) {
            tx.update(ref, { requestIds: [], revokedAt: now, updatedAt: now });
        } else {
            tx.update(ref, { requestIds: nextIds, updatedAt: now });
        }
    });
}

/**
 * Used during OTP verification recovery:
 * revokes all previous sessions and unconsumed link codes for the recovered request IDs,
 * and rotates to a brand-new HttpOnly session cookie.
 */
async function replaceSessionAfterOtp(req, res, requestIds = []) {
    const cleanIds = Array.from(new Set((requestIds || []).filter(Boolean))).slice(
        0,
        LIMITS.MAX_SESSION_REQUESTS
    );

    if (cleanIds.length > 0) {
        await Promise.all([
            revokeSessionsForRequestIds(cleanIds),
            revokeLinkCodesForRequestIds(cleanIds)
        ]);
    }

    const oldSid = extractSessionId(req);
    if (oldSid) {
        await revokeSessionById(oldSid);
    }

    if (cleanIds.length === 0) {
        clearSessionCookie(req, res);
        return null;
    }

    const newSid = newToken();
    const newHash = hash(newSid);
    const now = Date.now();
    const expiresAt = now + LIMITS.SESSION_TTL_MS;

    await borrowSessionsCollection.doc(newHash).set({
        requestIds: cleanIds,
        createdAt: now,
        updatedAt: now,
        expiresAt,
        revokedAt: null
    });

    setSessionCookie(req, res, newSid, LIMITS.SESSION_TTL_MS);
    return { sessionId: newSid, sessionHash: newHash, requestIds: cleanIds };
}

async function revokeSessionById(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') return;
    const ref = borrowSessionsCollection.doc(hash(sessionId));
    const snap = await ref.get();
    if (!snap.exists) return;
    const now = Date.now();
    await ref.update({
        requestIds: [],
        revokedAt: now,
        updatedAt: now
    });
}

module.exports = {
    SESSION_COOKIE_HTTPS,
    SESSION_COOKIE_HTTP,
    parseCookies,
    isHttpsRequest,
    getCookieName,
    extractSessionId,
    applySensitiveHeaders,
    setSessionCookie,
    clearSessionCookie,
    resolveSession,
    grantRequestAccessToSession,
    revokeSessionsForRequestIds,
    pruneSessionRequestIds,
    replaceSessionAfterOtp,
    revokeSessionById
};
