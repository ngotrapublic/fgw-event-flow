const { db, resourcesCollection, borrowRequestsCollection, borrowOtpsCollection } = require('../config/firebase');
const HttpError = require('../utils/http-error');
const { OPEN_STATUSES, LIMITS } = require('../services/borrow-constants');
const { transition } = require('../services/borrow-transition-service');
const borrowValidation = require('../services/borrow-validation');
const { newToken, hash, newOtp, safeEqualHex, maskEmail, maskPhone } = require('../services/borrow-token-service');
const { createLinkCode, exchangeLinkCode: exchangeOneTimeLinkCode, revokeLinkCodesForRequestIds } = require('../services/borrow-link-service');
const {
    extractSessionId,
    applySensitiveHeaders,
    clearSessionCookie,
    resolveSession,
    grantRequestAccessToSession,
    pruneSessionRequestIds,
    replaceSessionAfterOtp,
    revokeSessionById
} = require('../services/borrow-session-service');
const borrowEmailService = require('../services/borrow-email-service');
const notificationService = require('../services/notificationService');

function deriveVnDateOnly(doc) {
    if (doc?.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(doc.dueDate)) {
        return doc.dueDate;
    }
    if (doc?.dueAt) {
        const d = new Date(doc.dueAt);
        if (!isNaN(d.getTime())) {
            return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
        }
    }
    return '';
}

/**
 * Serialize borrow request for public/guest view.
 * Strictly NEVER expose uid, history, studentId, or raw/hashed tokens.
 * Minimizes borrower PII and notes once a request is closed.
 */
function toPublicView(doc) {
    if (!doc) return null;
    const isOpen = OPEN_STATUSES.includes(doc.status) && doc.isOpen !== false;
    const dueDate = deriveVnDateOnly(doc);
    const items = (doc.items || []).map((item) => ({
        resourceId: item.resourceId,
        label: item.label || item.resourceId,
        qty: item.qty,
        receivedQty: item.receivedQty !== undefined ? item.receivedQty : null
    }));

    if (!isOpen) {
        return {
            id: doc.id,
            status: doc.status,
            isOverdue: false,
            borrower: {},
            items,
            dueDate,
            dueAt: doc.dueAt,
            rejectReason: doc.rejectReason || '',
            cancelReason: doc.cancelReason || '',
            returnNote: doc.returnNote || '',
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
        };
    }

    return {
        id: doc.id,
        status: doc.status,
        isOverdue: Boolean(doc.isOverdue),
        borrower: {
            name: doc.borrower?.name || '',
            email: maskEmail(doc.borrower?.email),
            phone: maskPhone(doc.borrower?.phone)
        },
        items,
        dueDate,
        dueAt: doc.dueAt,
        note: doc.note || '',
        rejectReason: doc.rejectReason || '',
        cancelReason: doc.cancelReason || '',
        returnNote: doc.returnNote || '',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
    };
}

/**
 * GET /api/borrow/resources
 * Returns resources with available stock > 0, sorted by category then label.
 */
async function getAvailableResources(req, res, next) {
    try {
        const snap = await resourcesCollection.get();
        const list = [];

        snap.forEach((doc) => {
            const data = doc.data() || {};
            const availableQty = data.availableQty !== undefined ? data.availableQty : (data.quantity || 0);
            if (availableQty > 0) {
                list.push({
                    id: doc.id,
                    label: data.label || doc.id,
                    category: data.category || 'General',
                    icon: data.icon || 'Box',
                    availableQty
                });
            }
        });

        list.sort((a, b) => {
            const catCmp = a.category.localeCompare(b.category);
            if (catCmp !== 0) return catCmp;
            return a.label.localeCompare(b.label);
        });

        res.status(200).json(list);
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/requests
 * Create a new borrow request (guest or authenticated account).
 */
async function createBorrowRequest(req, res, next) {
    try {
        const validated = borrowValidation.validateBorrowRequest(req.body, req.user);
        const { name, email, phone, items, dueDate, dueAt, note } = validated;

        // 1. Preliminary stock availability check
        const shortages = [];
        const itemDetails = [];

        for (const item of items) {
            const resRef = resourcesCollection.doc(item.resourceId);
            const resSnap = await resRef.get();
            if (!resSnap.exists) {
                shortages.push({
                    resourceId: item.resourceId,
                    label: item.resourceId,
                    available: 0,
                    requested: item.qty
                });
                continue;
            }

            const data = resSnap.data() || {};
            const available = data.availableQty !== undefined ? data.availableQty : (data.quantity || 0);
            const label = data.label || item.resourceId;

            if (available < item.qty) {
                shortages.push({
                    resourceId: item.resourceId,
                    label,
                    available,
                    requested: item.qty
                });
            } else {
                itemDetails.push({
                    resourceId: item.resourceId,
                    label,
                    qty: item.qty,
                    receivedQty: null
                });
            }
        }

        if (shortages.length > 0) {
            throw new HttpError(409, 'Không đủ thiết bị trong kho', { shortages });
        }

        let status;
        let borrowerType;
        let borrower;
        let verifyToken = null;
        let verifyTokenHash = null;
        let verifyExpiresAt = null;

        // 2. Guest vs Authenticated Account
        if (req.user) {
            borrowerType = 'account';
            status = 'pending';
            borrower = {
                uid: req.user.uid,
                name: req.user.profile?.name || req.user.name || req.user.email,
                email: req.user.email,
                phone
            };

            // Update user's phone in users collection
            try {
                await db.collection('users').doc(req.user.uid).set({ phone }, { merge: true });
            } catch (userErr) {
                console.error('[BORROW] Error updating user phone:', userErr.message);
            }
        } else {
            // Guest check
            borrowEmailService.assertEmailEnabled();

            // Count open requests for this email and phone
            const [emailSnap, phoneSnap] = await Promise.all([
                borrowRequestsCollection
                    .where('borrower.email', '==', email)
                    .where('isOpen', '==', true)
                    .get(),
                borrowRequestsCollection
                    .where('borrower.phone', '==', phone)
                    .where('isOpen', '==', true)
                    .get()
            ]);

            if (emailSnap.size >= LIMITS.MAX_OPEN_PER_GUEST || phoneSnap.size >= LIMITS.MAX_OPEN_PER_GUEST) {
                throw new HttpError(429, 'Bạn đang có quá nhiều phiếu chưa hoàn tất');
            }

            borrowerType = 'guest';
            status = 'unverified';
            borrower = { name, email, phone };
            verifyToken = newToken();
            verifyTokenHash = hash(verifyToken);
            verifyExpiresAt = new Date(Date.now() + LIMITS.VERIFY_TTL_MS).toISOString();
        }

        // 3. Save document and create one-time management code for email
        const docRef = borrowRequestsCollection.doc();
        const nowIso = new Date().toISOString();

        const docData = {
            id: docRef.id,
            status,
            isOpen: true,
            borrower,
            borrowerType,
            items: itemDetails,
            dueDate,
            dueAt,
            note: note || '',
            verifyTokenHash: verifyTokenHash || null,
            verifiedTokenHash: null,
            verifyExpiresAt: verifyExpiresAt || null,
            history: [{
                status,
                at: nowIso,
                byUid: req.user?.uid || 'guest',
                byEmail: borrower.email,
                note: 'created'
            }],
            createdAt: nowIso,
            updatedAt: nowIso
        };

        await docRef.set(docData);

        const linkCode = await createLinkCode(docRef.id);

        // 4. Send emails
        let emailSent = true;
        if (borrowerType === 'guest') {
            try {
                await borrowEmailService.sendVerify(docData, verifyToken, linkCode);
            } catch (mailErr) {
                // Delete doc and revoke code on failure for guests to avoid stranded requests
                await Promise.all([
                    docRef.delete(),
                    revokeLinkCodesForRequestIds([docRef.id]).catch(() => {})
                ]);
                console.error('[BORROW] Failed to send verify email to guest:', mailErr.message);
                throw new HttpError(502, 'Không gửi được email, vui lòng kiểm tra địa chỉ hoặc thử lại');
            }

            // Issue short-lived HttpOnly cookie session for this browser
            await grantRequestAccessToSession(req, res, docRef.id);
        } else {
            try {
                await borrowEmailService.sendCreatedForAccount(docData, linkCode);
            } catch (mailErr) {
                console.error('[BORROW] Failed to send creation email for account:', mailErr.message);
                emailSent = false;
                await revokeLinkCodesForRequestIds([docRef.id]).catch(() => {});
            }

            // Notify admins & managers for pending requests
            try {
                const adminUids = await notificationService.getUidsByRoles(['admin', 'manager']);
                if (adminUids.length > 0) {
                    await notificationService.create({
                        recipients: adminUids,
                        type: 'info',
                        title: 'Yêu cầu mượn thiết bị mới',
                        message: `${borrower.name}: ${itemDetails.length} món, trả ${dueDate}`,
                        data: { borrowRequestId: docData.id },
                        sender: 'Mượn trả thiết bị'
                    });
                }
            } catch (notifErr) {
                console.error('[BORROW] Notification error:', notifErr.message);
            }
        }

        applySensitiveHeaders(res);
        res.status(201).json({
            request: toPublicView(docData),
            ...(emailSent === false ? { emailSent: false } : {})
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/verify
 * Guest email verification via strictly one-time verify token.
 */
async function verifyEmail(req, res, next) {
    try {
        applySensitiveHeaders(res);
        const { token } = req.body || {};
        if (!token || typeof token !== 'string' || !token.trim()) {
            throw new HttpError(400, 'Thiếu token xác nhận');
        }

        const tokenHash = hash(token.trim());
        let snap = await borrowRequestsCollection
            .where('verifyTokenHash', '==', tokenHash)
            .limit(1)
            .get();

        if (snap.empty) {
            snap = await borrowRequestsCollection
                .where('verifiedTokenHash', '==', tokenHash)
                .limit(1)
                .get();
        }

        if (snap.empty) {
            throw new HttpError(404, 'Liên kết xác nhận không hợp lệ hoặc đã được sử dụng');
        }

        const docSnap = snap.docs[0];
        const docData = docSnap.data();

        if (docData.status === 'expired') {
            throw new HttpError(410, 'Link đã hết hạn, vui lòng tạo phiếu mới');
        }

        // Security guard (High #1): NEVER mint an access token or session cookie on replay.
        if (docData.status !== 'unverified') {
            return res.status(200).json({ request: toPublicView(docData) });
        }

        // Expired check
        if (docData.verifyExpiresAt && new Date(docData.verifyExpiresAt).getTime() < Date.now()) {
            throw new HttpError(410, 'Link đã hết hạn, vui lòng tạo phiếu mới');
        }

        // Strictly single-use transition unverified -> pending: clear both verify hashes
        let updated;
        try {
            updated = await transition(docSnap.id, 'pending', {
                actor: { uid: 'guest', email: docData.borrower?.email },
                expectFrom: 'unverified',
                patch: {
                    verifyTokenHash: null,
                    verifiedTokenHash: null
                }
            });
        } catch (transErr) {
            if (transErr?.statusCode === 409) {
                const latestSnap = await docSnap.ref.get();
                const latestData = latestSnap.data();
                if (latestData && latestData.status === 'expired') {
                    throw new HttpError(410, 'Link đã hết hạn, vui lòng tạo phiếu mới');
                }
                if (latestData && latestData.status !== 'unverified') {
                    return res.status(200).json({ request: toPublicView(latestData) });
                }
            }
            throw transErr;
        }

        // Grant short-lived HttpOnly cookie session on the initial verification response
        await grantRequestAccessToSession(req, res, updated.id);

        // Notify admins/managers
        try {
            const adminUids = await notificationService.getUidsByRoles(['admin', 'manager']);
            if (adminUids.length > 0) {
                await notificationService.create({
                    recipients: adminUids,
                    type: 'info',
                    title: 'Yêu cầu mượn thiết bị mới',
                    message: `${updated.borrower?.name}: ${updated.items?.length || 0} món, trả ${updated.dueDate}`,
                    data: { borrowRequestId: updated.id },
                    sender: 'Mượn trả thiết bị'
                });
            }
        } catch (notifErr) {
            console.error('[BORROW] Notification error:', notifErr.message);
        }

        res.status(200).json({ request: toPublicView(updated) });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/link/exchange
 * Atomically exchange a one-time management code (#code=...) for a short-lived HttpOnly session cookie.
 */
async function exchangeLinkCodeHandler(req, res, next) {
    try {
        applySensitiveHeaders(res);
        const { code } = req.body || {};
        if (!code || typeof code !== 'string' || !code.trim()) {
            throw new HttpError(400, 'Thiếu mã truy cập liên kết');
        }

        const result = await exchangeOneTimeLinkCode(code);

        // Prevent logged-in User B from binding User A's account request into session
        if (req.user?.uid && result.request?.borrower?.uid && result.request.borrower.uid !== req.user.uid) {
            throw new HttpError(403, 'Phiếu mượn thuộc về một tài khoản khác');
        }

        await grantRequestAccessToSession(req, res, result.requestId);
        res.status(200).json({ request: toPublicView(result.request) });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/session/logout
 * Clear current guest session cookie and revoke its server-side session record.
 */
async function logoutSession(req, res, next) {
    try {
        applySensitiveHeaders(res);
        const sid = extractSessionId(req);
        if (sid) {
            await revokeSessionById(sid);
        }
        clearSessionCookie(req, res);
        if (typeof res.sendStatus === 'function') {
            return res.sendStatus(204);
        }
        res.status(204).json({ ok: true });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/requests/:id/resend-verification
 * Resend verification email for unverified request using active session or account auth.
 */
async function resendVerification(req, res, next) {
    try {
        applySensitiveHeaders(res);
        const docRef = borrowRequestsCollection.doc(req.params.id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            throw new HttpError(404, 'Phiếu không tồn tại');
        }

        const data = docSnap.data();
        const session = await resolveSession(req);

        if (req.user?.uid && data.borrower?.uid && data.borrower.uid !== req.user.uid) {
            throw new HttpError(404, 'Phiếu không tồn tại hoặc phiên truy cập đã hết hạn');
        }

        const hasSessionAccess = Boolean(session && session.requestIds.includes(docSnap.id));
        const hasUserAccess = Boolean(req.user?.uid && req.user.uid === data.borrower?.uid);

        if (!hasSessionAccess && !hasUserAccess) {
            throw new HttpError(404, 'Phiếu không tồn tại hoặc phiên truy cập đã hết hạn');
        }

        if (data.status !== 'unverified') {
            throw new HttpError(404, 'Phiếu không ở trạng thái chờ xác nhận');
        }

        const newVerifyToken = newToken();
        const newVerifyTokenHash = hash(newVerifyToken);
        const newVerifyExpiresAt = new Date(Date.now() + LIMITS.VERIFY_TTL_MS).toISOString();

        await docRef.update({
            verifyTokenHash: newVerifyTokenHash,
            verifyExpiresAt: newVerifyExpiresAt,
            updatedAt: new Date().toISOString()
        });

        await revokeLinkCodesForRequestIds([docSnap.id]);
        const linkCode = await createLinkCode(docSnap.id);

        await borrowEmailService.sendVerify(
            { ...data, verifyTokenHash: newVerifyTokenHash, verifyExpiresAt: newVerifyExpiresAt },
            newVerifyToken,
            linkCode
        );

        res.status(200).json({ message: 'Đã gửi lại email xác nhận' });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/borrow/my
 * Retrieve open borrow requests for the active HttpOnly session cookie, plus authenticated user's history.
 */
async function getMyRequests(req, res, next) {
    try {
        applySensitiveHeaders(res);
        const rawCookieSid = extractSessionId(req);
        const session = await resolveSession(req);

        if (rawCookieSid && !session) {
            clearSessionCookie(req, res);
        }

        const matchedDocs = new Map();

        if (session && session.requestIds.length > 0) {
            const snaps = await Promise.all(
                session.requestIds.map((id) => borrowRequestsCollection.doc(id).get())
            );
            const staleIds = [];

            snaps.forEach((doc, idx) => {
                const reqId = session.requestIds[idx];
                if (!doc.exists) {
                    staleIds.push(reqId);
                    return;
                }
                const data = doc.data();
                const isOpen = OPEN_STATUSES.includes(data.status) && data.isOpen !== false;
                // Revoke/hide closed requests from guest session view
                if (!isOpen) {
                    staleIds.push(reqId);
                    return;
                }
                // Cross-account guard
                if (req.user?.uid && data.borrower?.uid && data.borrower.uid !== req.user.uid) {
                    staleIds.push(reqId);
                    return;
                }
                matchedDocs.set(doc.id, data);
            });

            if (staleIds.length > 0) {
                await pruneSessionRequestIds(session.sessionHash, staleIds);
                if (staleIds.length === session.requestIds.length) {
                    clearSessionCookie(req, res);
                }
            }
        }

        // If authenticated, also fetch by borrower.uid
        if (req.user?.uid) {
            const userSnap = await borrowRequestsCollection
                .where('borrower.uid', '==', req.user.uid)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            userSnap.docs.forEach((doc) => {
                matchedDocs.set(doc.id, doc.data());
            });
        }

        const requests = Array.from(matchedDocs.values()).map(toPublicView);
        res.status(200).json({ requests });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/lookup/otp
 * Request an OTP for phone-based lookup. Always returns identical 200 message.
 */
async function requestOtp(req, res, next) {
    try {
        const phone = borrowValidation.validatePhone(req.body.phone);
        borrowEmailService.assertEmailEnabled();

        const standardResponse = {
            message: 'Nếu số điện thoại có phiếu đang mở, mã xác thực đã được gửi tới email đã đăng ký'
        };

        const snap = await borrowRequestsCollection
            .where('borrower.phone', '==', phone)
            .where('isOpen', '==', true)
            .get();

        if (snap.empty) {
            return res.status(200).json(standardResponse);
        }

        const phoneHash = hash(phone);
        const otpRef = borrowOtpsCollection.doc(phoneHash);
        const otpSnap = await otpRef.get();
        const now = Date.now();

        if (otpSnap.exists) {
            const otpData = otpSnap.data() || {};
            const sentAt = otpData.sentAt ? new Date(otpData.sentAt).getTime() : 0;
            if (now - sentAt < LIMITS.OTP_RESEND_MS) {
                return res.status(200).json(standardResponse);
            }

            const windowStart = otpData.windowStart ? new Date(otpData.windowStart).getTime() : 0;
            const sendCount = otpData.sendCount || 0;
            if (now - windowStart < 3600e3 && sendCount >= 3) {
                return res.status(200).json(standardResponse);
            }
        }

        const code = newOtp();
        const codeHash = hash(code);
        const expiresAt = new Date(now + LIMITS.OTP_TTL_MS).toISOString();

        const prevData = otpSnap.exists ? otpSnap.data() : {};
        const inWindow = prevData.windowStart && (now - new Date(prevData.windowStart).getTime() < 3600e3);
        const newSendCount = inWindow ? (prevData.sendCount || 0) + 1 : 1;
        const newWindowStart = inWindow ? prevData.windowStart : new Date(now).toISOString();

        await otpRef.set({
            phoneHash,
            codeHash,
            expiresAt,
            sentAt: new Date(now).toISOString(),
            attempts: 0,
            sendCount: newSendCount,
            windowStart: newWindowStart
        });

        // Send OTP to distinct emails associated with this phone (non-blocking to prevent timing attacks)
        const distinctEmails = [
            ...new Set(
                snap.docs
                    .map((d) => d.data().borrower?.email)
                    .filter((e) => typeof e === 'string' && e.trim())
                    .map((e) => e.trim().toLowerCase())
            )
        ];
        res.status(200).json(standardResponse);

        Promise.allSettled(distinctEmails.map((e) => borrowEmailService.sendOtp(e, code)))
            .then((rs) => {
                rs.forEach((r, idx) => {
                    if (r.status === 'rejected') {
                        console.error(
                            `[BORROW] Error sending OTP email to ${maskEmail(distinctEmails[idx])}:`,
                            r.reason?.message
                        );
                    }
                });
            });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/lookup/verify
 * Verify OTP, revoke prior sessions/link-codes for those requests, and issue a fresh HttpOnly session cookie.
 */
async function verifyOtp(req, res, next) {
    try {
        applySensitiveHeaders(res);
        const { phone, code } = req.body || {};
        const cleanCode = code !== undefined && code !== null ? String(code).replace(/\s+/g, '') : '';
        if (!phone || !cleanCode) {
            throw new HttpError(400, 'Mã không đúng hoặc đã hết hạn');
        }

        const normalizedPhone = borrowValidation.normalizePhone(phone);
        const phoneHash = hash(normalizedPhone);
        const otpRef = borrowOtpsCollection.doc(phoneHash);

        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(otpRef);
            const otp = snap.exists ? snap.data() : null;
            if (!otp) return 'invalid';
            if (!otp.expiresAt || new Date(otp.expiresAt).getTime() < Date.now()) return 'invalid';
            if ((otp.attempts || 0) >= LIMITS.OTP_MAX_ATTEMPTS) return 'invalid';
            if (!safeEqualHex(hash(cleanCode), otp.codeHash)) {
                tx.update(otpRef, { attempts: (otp.attempts || 0) + 1 });
                return 'invalid';
            }
            tx.delete(otpRef);
            return 'ok';
        });

        if (result !== 'ok') {
            throw new HttpError(400, 'Mã không đúng hoặc đã hết hạn');
        }

        // Retrieve all open requests for this phone, revoke prior sessions & link codes, issue a fresh session
        const snap = await borrowRequestsCollection
            .where('borrower.phone', '==', normalizedPhone)
            .where('isOpen', '==', true)
            .get();

        const openIds = snap.docs.map((doc) => doc.id);
        const nowIso = new Date().toISOString();
        const requests = [];

        for (const doc of snap.docs) {
            const d = doc.data();
            await doc.ref.update({
                accessTokenHash: null,
                accessTokenHashes: [],
                verifiedTokenHash: null,
                updatedAt: nowIso
            });
            requests.push(toPublicView({ ...d }));
        }

        await replaceSessionAfterOtp(req, res, openIds);

        res.status(200).json({ requests });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/requests/:id/return
 * Request device return: transitions from handed_over to return_pending.
 */
async function requestReturn(req, res, next) {
    try {
        applySensitiveHeaders(res);
        const docRef = borrowRequestsCollection.doc(req.params.id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new HttpError(404, 'Phiếu không tồn tại hoặc phiên truy cập đã hết hạn');
        }

        const data = docSnap.data();
        const session = await resolveSession(req);

        if (req.user?.uid && data.borrower?.uid && data.borrower.uid !== req.user.uid) {
            throw new HttpError(404, 'Phiếu không tồn tại hoặc phiên truy cập đã hết hạn');
        }

        const isSessionValid = Boolean(session && session.requestIds.includes(docSnap.id));
        const isUserValid = Boolean(req.user?.uid && req.user.uid === data.borrower?.uid);

        if (!isSessionValid && !isUserValid) {
            throw new HttpError(404, 'Phiếu không tồn tại hoặc phiên truy cập đã hết hạn');
        }

        if (data.status !== 'handed_over') {
            if (data.status === 'return_pending') {
                throw new HttpError(409, 'Bạn đã báo trả, đang chờ kho kiểm');
            }
            if (data.status === 'approved') {
                throw new HttpError(409, 'Bạn chưa nhận thiết bị');
            }
            if (data.status === 'pending') {
                throw new HttpError(409, 'Phiếu đang chờ duyệt');
            }
            if (data.status === 'unverified') {
                throw new HttpError(409, 'Phiếu chưa được xác nhận email');
            }
            if (data.status === 'returned' || data.status === 'returned_with_issue') {
                throw new HttpError(409, 'Thiết bị đã được trả');
            }
            throw new HttpError(409, 'Trạng thái phiếu không hợp lệ để báo trả');
        }

        const updated = await transition(docSnap.id, 'return_pending', {
            actor: { uid: req.user?.uid || 'guest', email: data.borrower?.email },
            expectFrom: ['handed_over']
        });

        // Notify admins/managers
        try {
            const adminUids = await notificationService.getUidsByRoles(['admin', 'manager']);
            if (adminUids.length > 0) {
                await notificationService.create({
                    recipients: adminUids,
                    type: 'info',
                    title: 'Có người báo trả thiết bị',
                    message: `${updated.borrower?.name} vừa báo trả thiết bị cho phiếu #${updated.id}`,
                    data: { borrowRequestId: updated.id },
                    sender: 'Mượn trả thiết bị'
                });
            }
        } catch (notifErr) {
            console.error('[BORROW] Notification error:', notifErr.message);
        }

        res.status(200).json({ request: toPublicView(updated) });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    toPublicView,
    getAvailableResources,
    createBorrowRequest,
    verifyEmail,
    exchangeLinkCode: exchangeLinkCodeHandler,
    logoutSession,
    resendVerification,
    getMyRequests,
    requestOtp,
    verifyOtp,
    requestReturn
};
