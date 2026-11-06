const { db, resourcesCollection, borrowRequestsCollection, borrowOtpsCollection } = require('../config/firebase');
const HttpError = require('../utils/http-error');
const { LIMITS } = require('../services/borrow-constants');
const { transition } = require('../services/borrow-transition-service');
const borrowValidation = require('../services/borrow-validation');
const { newToken, hash, newOtp, safeEqualHex, maskEmail, maskPhone } = require('../services/borrow-token-service');
const borrowEmailService = require('../services/borrow-email-service');
const notificationService = require('../services/notificationService');

/**
 * Serialize borrow request for public/guest view.
 * Strictly NEVER expose uid, history, or raw/hashed tokens.
 */
function toPublicView(doc) {
    if (!doc) return null;
    return {
        id: doc.id,
        status: doc.status,
        isOverdue: Boolean(doc.isOverdue),
        borrower: {
            name: doc.borrower?.name || '',
            email: maskEmail(doc.borrower?.email),
            phone: maskPhone(doc.borrower?.phone),
            ...(doc.borrower?.studentId ? { studentId: doc.borrower.studentId } : {})
        },
        items: (doc.items || []).map((item) => ({
            resourceId: item.resourceId,
            label: item.label || item.resourceId,
            qty: item.qty,
            receivedQty: item.receivedQty !== undefined ? item.receivedQty : null
        })),
        dueAt: doc.dueAt,
        note: doc.note || '',
        rejectReason: doc.rejectReason || '',
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

        // 3. Generate access token and save document
        const accessToken = newToken();
        const accessTokenHash = hash(accessToken);
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
            accessTokenHash,
            verifyTokenHash: verifyTokenHash || null,
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

        // 4. Send emails
        let emailSent = true;
        if (borrowerType === 'guest') {
            try {
                await borrowEmailService.sendVerify(docData, verifyToken, accessToken);
            } catch (mailErr) {
                // Delete doc on failure for guests to avoid stranded requests
                await docRef.delete();
                console.error('[BORROW] Failed to send verify email to guest:', mailErr.message);
                throw new HttpError(502, 'Không gửi được email, vui lòng kiểm tra địa chỉ hoặc thử lại');
            }
        } else {
            try {
                await borrowEmailService.sendCreatedForAccount(docData, accessToken);
            } catch (mailErr) {
                console.error('[BORROW] Failed to send creation email for account:', mailErr.message);
                emailSent = false;
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

        res.status(201).json({
            request: toPublicView(docData),
            accessToken,
            ...(emailSent === false ? { emailSent: false } : {})
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/verify
 * Guest email verification via verify token.
 */
async function verifyEmail(req, res, next) {
    try {
        const { token } = req.body || {};
        if (!token || typeof token !== 'string') {
            throw new HttpError(400, 'Thiếu token xác nhận');
        }

        const tokenHash = hash(token.trim());
        let snap = await borrowRequestsCollection
            .where('verifyTokenHash', '==', tokenHash)
            .limit(1)
            .get();

        if (snap.empty) {
            // Check verifiedTokenHash for idempotent retry
            snap = await borrowRequestsCollection
                .where('verifiedTokenHash', '==', tokenHash)
                .limit(1)
                .get();
        }

        if (snap.empty) {
            throw new HttpError(404, 'Link không hợp lệ');
        }

        const docSnap = snap.docs[0];
        const docData = docSnap.data();

        // Idempotent: already transitioned past unverified
        if (docData.status !== 'unverified') {
            return res.status(200).json({ request: toPublicView(docData) });
        }

        // Expired check
        if (docData.verifyExpiresAt && new Date(docData.verifyExpiresAt).getTime() < Date.now()) {
            throw new HttpError(410, 'Link đã hết hạn, vui lòng tạo phiếu mới');
        }

        // Transition unverified -> pending, null verifyTokenHash, keep verifiedTokenHash for idempotent retries
        const updated = await transition(docSnap.id, 'pending', {
            actor: { uid: 'guest', email: docData.borrower?.email },
            patch: { verifyTokenHash: null, verifiedTokenHash: tokenHash }
        });

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
 * POST /api/borrow/requests/:id/resend-verification
 * Resend verification email for unverified request.
 */
async function resendVerification(req, res, next) {
    try {
        const docRef = borrowRequestsCollection.doc(req.params.id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            throw new HttpError(404, 'Phiếu không tồn tại');
        }

        const token = req.headers['x-borrow-token'];
        const data = docSnap.data();

        if (!token || !safeEqualHex(hash(token), data.accessTokenHash)) {
            throw new HttpError(404, 'Phiếu không tồn tại hoặc token không hợp lệ');
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

        await borrowEmailService.sendVerify(
            { ...data, verifyTokenHash: newVerifyTokenHash, verifyExpiresAt: newVerifyExpiresAt },
            newVerifyToken,
            token
        );

        res.status(200).json({ message: 'Đã gửi lại email xác nhận' });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/borrow/my
 * Retrieve active borrow requests for guest tokens or authenticated user.
 */
async function getMyRequests(req, res, next) {
    try {
        const tokenHeader = req.headers['x-borrow-tokens'] || '';
        const rawTokens = tokenHeader
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, LIMITS.MAX_CLIENT_TOKENS);

        const matchedDocs = new Map();
        const matchedTokens = new Set();

        if (rawTokens.length > 0) {
            const hashedList = rawTokens.map((t) => hash(t));
            const snap = await borrowRequestsCollection.where('accessTokenHash', 'in', hashedList).get();

            snap.docs.forEach((doc) => {
                const data = doc.data();
                matchedDocs.set(doc.id, data);
                const matched = rawTokens.find((t) => hash(t) === data.accessTokenHash);
                if (matched) matchedTokens.add(matched);
            });
        }

        const invalidTokens = rawTokens.filter((t) => !matchedTokens.has(t));

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
        res.status(200).json({ requests, invalidTokens });
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

        // Send OTP to distinct emails associated with this phone
        const distinctEmails = [...new Set(snap.docs.map((d) => d.data().borrower?.email).filter(Boolean))];
        for (const email of distinctEmails) {
            try {
                await borrowEmailService.sendOtp(email, code);
            } catch (err) {
                console.error('[BORROW] Error sending OTP email:', err.message);
            }
        }

        res.status(200).json(standardResponse);
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/borrow/lookup/verify
 * Verify OTP and regenerate access tokens for open requests.
 */
async function verifyOtp(req, res, next) {
    try {
        const { phone, code } = req.body || {};
        if (!phone || !code) {
            throw new HttpError(400, 'Mã không đúng hoặc đã hết hạn');
        }

        const normalizedPhone = borrowValidation.normalizePhone(phone);
        const phoneHash = hash(normalizedPhone);
        const otpRef = borrowOtpsCollection.doc(phoneHash);
        const otpSnap = await otpRef.get();

        if (!otpSnap.exists) {
            throw new HttpError(400, 'Mã không đúng hoặc đã hết hạn');
        }

        const otpData = otpSnap.data() || {};
        const isExpired = !otpData.expiresAt || new Date(otpData.expiresAt).getTime() < Date.now();
        const tooManyAttempts = (otpData.attempts || 0) >= LIMITS.OTP_MAX_ATTEMPTS;

        if (isExpired || tooManyAttempts) {
            throw new HttpError(400, 'Mã không đúng hoặc đã hết hạn');
        }

        const inputHash = hash(String(code).trim());
        const isMatch = safeEqualHex(inputHash, otpData.codeHash);

        if (!isMatch) {
            await otpRef.update({ attempts: (otpData.attempts || 0) + 1 });
            throw new HttpError(400, 'Mã không đúng hoặc đã hết hạn');
        }

        // OTP verified successfully: delete OTP doc
        await otpRef.delete();

        // Retrieve all open requests for this phone and issue new access tokens
        const snap = await borrowRequestsCollection
            .where('borrower.phone', '==', normalizedPhone)
            .where('isOpen', '==', true)
            .get();

        const accessTokens = [];
        const requests = [];

        for (const doc of snap.docs) {
            const newAccessToken = newToken();
            const newAccessTokenHash = hash(newAccessToken);

            await doc.ref.update({
                accessTokenHash: newAccessTokenHash,
                updatedAt: new Date().toISOString()
            });

            accessTokens.push(newAccessToken);
            requests.push(toPublicView({ ...doc.data(), accessTokenHash: newAccessTokenHash }));
        }

        res.status(200).json({ requests, accessTokens });
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
        const docRef = borrowRequestsCollection.doc(req.params.id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new HttpError(404, 'Phiếu không tồn tại hoặc token không hợp lệ');
        }

        const data = docSnap.data();
        const token = req.headers['x-borrow-token'];
        const isTokenValid = token && safeEqualHex(hash(token), data.accessTokenHash);
        const isUserValid = req.user?.uid && req.user.uid === data.borrower?.uid;

        if (!isTokenValid && !isUserValid) {
            throw new HttpError(404, 'Phiếu không tồn tại hoặc token không hợp lệ');
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
    resendVerification,
    getMyRequests,
    requestOtp,
    verifyOtp,
    requestReturn
};
